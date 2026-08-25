'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { SSAOPass } from 'three/addons/postprocessing/SSAOPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { FXAAShader } from 'three/addons/shaders/FXAAShader.js';
import { VignetteShader } from 'three/addons/shaders/VignetteShader.js';
import { ArcaneAudioSystem } from './arcane-audio';
import { CameraManager, type CameraMode, type FixedView, type LandmarkId } from './camera-manager';
import { EnvironmentSystem, type TimeOfDay } from './environment-system';
import { createGreatHallArchitecture } from './great-hall';
import { runIncrementally, runSynchronously } from './incremental-builder';
import { NpcBehaviorSystem } from './npc-behavior';
import { createCastleDetailProfile, createForestTreeDetailProfile, createVillageDetailProfile } from './procedural-details';
import { createGlassMaterial, createMetalMaterial, createRoofMaterial, createStoneMaterial, createTerrainMaterial, createWoodMaterial } from './procedural-materials';
import { RebuildCoordinator } from './rebuild-coordinator';
import { ResourceRegistry } from './resource-registry';
import { createAmbientEmbellishments, createCastleEmbellishments, createForestEmbellishments, createVillageEmbellishments } from './world-embellishments';
import { createWorldManifest, hashSeed, mulberry32, terrainHeight, validateWorldManifest, type QualityTier, type WorldManifest, type WorldZoneType } from './world-core';
import { createWorldRegions } from './world-regions';
import { WorldStreamingSystem } from './world-streaming';
import { advanceStationQuest, getStationQuest, getStationQuestCopy, type StationQuestStep } from './station-quest';

const DEFAULT_SEED = 'MAGIC-001';
const SCENE_LABELS: Record<LandmarkId, string> = {
  castle: 'Castle',
  village: 'Village',
  lake: 'Lake',
  forest: 'Forest',
  tower: 'Tower',
  mountains: 'Range',
  ruins: 'Ruins',
  station: 'Station',
};
const FIXED_SCENE_LABELS: Partial<Record<FixedView['id'], string>> = {
  'courtyard-stair': 'Stairs',
  'aerial-orbit': 'Aerial',
  'great-hall': 'Hall',
  'station-hall': 'Waiting Hall',
};
const FIXED_SCENE_SHORTCUTS: Partial<Record<FixedView['id'], string>> = {
  'courtyard-stair': '9',
  'aerial-orbit': '0',
  'great-hall': 'H',
  'station-hall': 'I',
};
interface PerformanceStats {
  fps: number;
  frameMs: number;
  calls: number;
  triangles: number;
  points: number;
  lines: number;
  geometries: number;
  textures: number;
  heapMb: number | null;
  generationMs: number;
  disposedGeometries: number;
  disposedMaterials: number;
  activeChunks: number;
  totalChunks: number;
}

interface SoakAudit {
  running: boolean;
  completed: number;
  total: number;
  baselineGeometries: number;
  finalGeometries: number | null;
  baselineHeapMb: number | null;
  finalHeapMb: number | null;
}

function disposeObject(root: THREE.Object3D) {
  const resources = new ResourceRegistry();
  root.traverse((object) => {
    const mesh = object as THREE.Mesh;
    if (mesh.geometry) resources.own(mesh.geometry, 'geometries');
    const meshMaterials = Array.isArray(mesh.material) ? mesh.material : mesh.material ? [mesh.material] : [];
    meshMaterials.forEach((material) => resources.own(material, 'materials'));
  });
  const report = resources.dispose();
  return { geometries: report.byCategory.geometries ?? 0, materials: report.byCategory.materials ?? 0 };
}

interface GeneratedWorld {
  root: THREE.Group;
  waterMaterial: THREE.ShaderMaterial;
  magicMaterial: THREE.ShaderMaterial;
  stairRoot: THREE.Group;
  stairTargets: [THREE.Quaternion, THREE.Quaternion];
  candleRoot: THREE.Group;
  zoneDebug: THREE.Group;
  starMaterial: THREE.PointsMaterial;
  celestialOrb: THREE.Mesh;
  celestialMaterial: THREE.MeshBasicMaterial;
  cloudRoot: THREE.Group;
  runeRoot: THREE.Group;
  floatingBookRoot: THREE.Group;
  movingLanternRoot: THREE.Group;
  stationClockHands: THREE.Group;
  railcarRoot: THREE.Group;
  manifest: WorldManifest;
  validation: ReturnType<typeof validateWorldManifest>;
}

function* createWorldChunks(seedText: string, quality: QualityTier): Generator<void, GeneratedWorld, void> {
  const manifest = createWorldManifest(seedText, quality);
  const validation = validateWorldManifest(manifest);
  if (!validation.ok) throw new Error(`World manifest rejected: ${validation.errors.join(' ')}`);
  const seed = manifest.seedHash;
  const random = mulberry32(hashSeed(`${manifest.seed}::world`));
  const root = new THREE.Group();
  root.name = `world-${seedText}`;
  let completed = false;

  try {

  const starRandom = mulberry32(hashSeed(`${manifest.seed}::atmosphere/stars`));
  const starCount = quality === 'low' ? 280 : quality === 'medium' ? 620 : 1100;
  const starPositions = new Float32Array(starCount * 3);
  for (let index = 0; index < starCount; index += 1) {
    const azimuth = starRandom() * Math.PI * 2;
    const elevation = 0.12 + starRandom() * 1.22;
    const distance = 118 + starRandom() * 30;
    starPositions[index * 3] = Math.cos(azimuth) * Math.cos(elevation) * distance;
    starPositions[index * 3 + 1] = Math.sin(elevation) * distance;
    starPositions[index * 3 + 2] = Math.sin(azimuth) * Math.cos(elevation) * distance;
    if ((index + 1) % 256 === 0) yield;
  }
  const starGeometry = new THREE.BufferGeometry();
  starGeometry.setAttribute('position', new THREE.BufferAttribute(starPositions, 3));
  const starMaterial = new THREE.PointsMaterial({ color: 0xbfcbe2, size: quality === 'high' ? 0.28 : 0.34, transparent: true, opacity: 0.72, depthWrite: false, fog: false });
  const stars = new THREE.Points(starGeometry, starMaterial);
  root.add(stars);

  const terrainGeometry = new THREE.PlaneGeometry(150, 150, 96, 96);
  terrainGeometry.rotateX(-Math.PI / 2);
  const terrain = new THREE.Mesh(
    terrainGeometry,
    createTerrainMaterial(seed),
  );
  terrain.receiveShadow = true;
  root.add(terrain);
  const positions = terrainGeometry.attributes.position;
  for (let i = 0; i < positions.count; i += 1) {
    const x = positions.getX(i);
    const z = positions.getZ(i);
    positions.setY(i, terrainHeight(x, z, seed));
    if ((i + 1) % 1024 === 0) yield;
  }
  terrainGeometry.computeVertexNormals();
  yield;

  const stone = createStoneMaterial(seed);
  const roof = createRoofMaterial(seed);
  const castleWood = createWoodMaterial(hashSeed(`${manifest.seed}::castle/interior/wood`));
  const metal = createMetalMaterial(hashSeed(`${manifest.seed}::materials/metal`));
  const glass = createGlassMaterial(hashSeed(`${manifest.seed}::materials/glass`));
  const embellishmentMaterials = { stone, roof, wood: castleWood, metal, glass };
  const castleDetails = createCastleDetailProfile(manifest.seed);
  const windowMaterial = new THREE.MeshBasicMaterial({ color: new THREE.Color().setRGB(3.2, 1.2, 0.28), toneMapped: false });
  const castle = new THREE.Group();
  castle.position.set(-7, terrainHeight(-7, -4, seed) + 0.2, -4);
  root.add(castle);

  const towerNodes = manifest.castleGraph.nodes.filter((node) => node.type === 'tower');
  const towerWindowCount = towerNodes.reduce((count, node) => count + Math.max(2, Math.floor(node.height / 5)), 0);
  const towerWindows = new THREE.InstancedMesh(new THREE.PlaneGeometry(0.7, 1.25), windowMaterial, towerWindowCount);
  const towerWindowTransform = new THREE.Object3D();
  const towerWindowTarget = new THREE.Vector3();
  let towerWindowIndex = 0;

  const addTower = (x: number, z: number, radius: number, height: number, variant: number) => {
    const tower = new THREE.Group();
    tower.position.set(x, 0, z);
    const shaft = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius * 1.12, height, 10), stone);
    shaft.position.y = height / 2;
    shaft.castShadow = true;
    shaft.receiveShadow = true;
    tower.add(shaft);
    const crown = new THREE.Mesh(new THREE.CylinderGeometry(radius * 1.2, radius * 1.2, 1.1, 10), stone);
    crown.position.y = height;
    crown.castShadow = true;
    tower.add(crown);
    const roofMesh = new THREE.Mesh(new THREE.ConeGeometry(radius * 1.3, 5.5 + variant, 10), roof);
    roofMesh.position.y = height + 3.2 + variant / 2;
    roofMesh.castShadow = true;
    tower.add(roofMesh);
    for (let floor = 0; floor < Math.max(2, Math.floor(height / 5)); floor += 1) {
      const angle = floor * 2.1 + variant;
      const windowY = 3.2 + floor * 4.2;
      towerWindowTransform.position.set(x + Math.sin(angle) * (radius + 0.01), windowY, z + Math.cos(angle) * (radius + 0.01));
      towerWindowTarget.set(x, windowY, z);
      towerWindowTransform.lookAt(towerWindowTarget);
      towerWindowTransform.updateMatrix();
      towerWindows.setMatrixAt(towerWindowIndex, towerWindowTransform.matrix);
      towerWindowIndex += 1;
    }
    castle.add(tower);
  };

  towerNodes.forEach((node, index) => addTower(node.position[0], node.position[2], node.radius, node.height, [0.4, 1.4, 0.8, 1.9][index]));
  towerWindows.name = 'castle-instanced-tower-windows';
  towerWindows.instanceMatrix.needsUpdate = true;
  towerWindows.computeBoundingSphere();
  castle.add(towerWindows);
  yield;

  const greatHall = createGreatHallArchitecture(manifest.seed, {
    stone,
    roof,
    wood: castleWood,
    glow: windowMaterial,
  });
  castle.add(greatHall);

  const bridge = new THREE.Mesh(new THREE.BoxGeometry(12, 0.8, 2), stone);
  bridge.position.set(-8, 10, 3.6);
  bridge.rotation.z = -0.18;
  bridge.castShadow = true;
  castle.add(bridge);

  const detailMatrix = new THREE.Matrix4();
  const detailQuaternion = new THREE.Quaternion();
  const detailScale = new THREE.Vector3();
  const buttressPlacements: Array<[number, number, number]> = [];
  for (const x of [-8.2, -3.4, 1.4, 6.2]) {
    buttressPlacements.push([x, 4, -5.45], [x, 4, 5.45]);
  }
  buttressPlacements.push([-2.85, 3, 13], [2.85, 3, 13]);
  const buttresses = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), stone, buttressPlacements.length);
  buttressPlacements.forEach(([x, y, z], index) => {
    detailScale.set(0.72, y * 2, castleDetails.buttressDepth);
    detailMatrix.compose(new THREE.Vector3(x, y, z), detailQuaternion, detailScale);
    buttresses.setMatrixAt(index, detailMatrix);
  });
  buttresses.name = 'castle-seed-buttresses';
  buttresses.castShadow = true;
  buttresses.receiveShadow = true;
  castle.add(buttresses);

  const gateNode = manifest.castleGraph.nodes.find((node) => node.type === 'gate');
  if (gateNode) {
    const [gateX, , gateZ] = gateNode.position;
    const gatehouse = new THREE.Mesh(new THREE.BoxGeometry(7, gateNode.height, 3), stone);
    gatehouse.position.set(gateX, gateNode.height / 2, gateZ);
    gatehouse.castShadow = true;
    gatehouse.receiveShadow = true;
    castle.add(gatehouse);

    const gateRoof = new THREE.Mesh(new THREE.BoxGeometry(7.7, 0.65, 3.7), stone);
    gateRoof.position.set(gateX, gateNode.height + 0.2, gateZ);
    gateRoof.castShadow = true;
    castle.add(gateRoof);

    const portalShape = new THREE.Shape();
    const archWidth = 1.25 * castleDetails.gateArchScale;
    portalShape.moveTo(-archWidth, 0);
    portalShape.lineTo(-archWidth, 1.65);
    portalShape.quadraticCurveTo(-archWidth, 3.25, 0, 3.5);
    portalShape.quadraticCurveTo(archWidth, 3.25, archWidth, 1.65);
    portalShape.lineTo(archWidth, 0);
    portalShape.closePath();
    const portal = new THREE.Mesh(
      new THREE.ShapeGeometry(portalShape),
      new THREE.MeshBasicMaterial({ color: 0x07080a, toneMapped: false }),
    );
    portal.position.set(gateX, 0.04, gateZ + 1.51);
    castle.add(portal);

    const arch = new THREE.Mesh(new THREE.TorusGeometry(archWidth, 0.24, 6, 18, Math.PI), stone);
    arch.position.set(gateX, 1.72, gateZ + 1.57);
    arch.castShadow = true;
    castle.add(arch);
  }

  const battlementPlacements: Array<[number, number, number]> = [];
  for (let x = -8.3; x <= 6.3; x += 2.4) {
    battlementPlacements.push([x, 9.6, -5.25], [x, 9.6, 5.25]);
  }
  for (let x = -2.7; x <= 2.7; x += 1.35) battlementPlacements.push([x, 7, 13]);
  const battlementGeometry = new THREE.BoxGeometry(0.9, 1.15, 0.9);
  const battlements = new THREE.InstancedMesh(battlementGeometry, stone, battlementPlacements.length);
  battlementPlacements.forEach(([x, y, z], index) => {
    detailScale.set(castleDetails.battlementScale, 1, castleDetails.battlementScale);
    detailMatrix.compose(new THREE.Vector3(x, y, z), detailQuaternion, detailScale);
    battlements.setMatrixAt(index, detailMatrix);
  });
  battlements.name = 'castle-seed-battlements';
  battlements.castShadow = true;
  castle.add(battlements);
  yield;

  root.add(createCastleEmbellishments(manifest, embellishmentMaterials));
  yield;

  const waterMaterial = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    uniforms: { uTime: { value: 0 }, uWaveStrength: { value: 1 }, uMoon: { value: new THREE.Color(0xb9cbff) } },
    vertexShader: `
      uniform float uTime;
      uniform float uWaveStrength;
      varying vec3 vWorld;
      varying float vWave;
      varying float vRadius;
      void main() {
        vec3 p = position;
        float wave = (sin(p.x * .22 + uTime * .55) * .18 + cos(p.y * .28 - uTime * .42) * .12) * uWaveStrength;
        p.z += wave;
        vWave = wave;
        vRadius = length(p.xy) / 26.0;
        vec4 world = modelMatrix * vec4(p, 1.0);
        vWorld = world.xyz;
        gl_Position = projectionMatrix * viewMatrix * world;
      }
    `,
    fragmentShader: `
      uniform vec3 uMoon;
      varying vec3 vWorld;
      varying float vWave;
      varying float vRadius;
      void main() {
        vec3 viewDir = normalize(cameraPosition - vWorld);
        float fresnel = pow(1.0 - max(dot(viewDir, vec3(0.0, 1.0, 0.0)), 0.0), 2.4);
        float shore = smoothstep(0.64, 1.0, vRadius);
        float moonSparkle = pow(max(vWave + 0.16, 0.0), 4.0) * pow(max(dot(viewDir, normalize(vec3(-0.45, 0.8, -0.35))), 0.0), 3.0);
        float foamBand = smoothstep(0.88, 0.97, vRadius) * (0.5 + 0.5 * sin(vWorld.x * 1.4 + vWorld.z * 1.1 + vWave * 8.0));
        vec3 deep = vec3(.012, .055, .085);
        vec3 shelf = vec3(.07, .19, .20);
        vec3 color = mix(deep, shelf, shore * 0.76 + fresnel * 0.35);
        color += uMoon * moonSparkle * 1.8 + vec3(0.22, 0.32, 0.31) * foamBand * 0.14;
        gl_FragColor = vec4(color, .76 + fresnel * .16 + shore * .05);
      }
    `,
  });
  const lake = new THREE.Mesh(new THREE.CircleGeometry(26, 96), waterMaterial);
  lake.rotation.x = -Math.PI / 2;
  lake.position.set(28, -2.1, 18);
  root.add(lake);

  const shorelineRandom = mulberry32(hashSeed(`${manifest.seed}::lake/shoreline`));
  const shoreMatrix = new THREE.Matrix4();
  const shoreQuaternion = new THREE.Quaternion();
  const shoreScale = new THREE.Vector3();
  const shorePosition = new THREE.Vector3();
  const shoreRocks = new THREE.InstancedMesh(new THREE.DodecahedronGeometry(0.85, 0), stone, manifest.counts.shoreRocks);
  root.add(shoreRocks);
  for (let i = 0; i < manifest.counts.shoreRocks; i += 1) {
    const angle = (i / manifest.counts.shoreRocks) * Math.PI * 2 + (shorelineRandom() - 0.5) * 0.18;
    const radius = 24.4 + shorelineRandom() * 3.8;
    const x = 28 + Math.cos(angle) * radius;
    const z = 18 + Math.sin(angle) * radius;
    const scale = 0.45 + shorelineRandom() * 1.2;
    shorePosition.set(x, Math.max(-2.0, terrainHeight(x, z, seed)) + scale * 0.35, z);
    shoreQuaternion.setFromEuler(new THREE.Euler(shorelineRandom() * 0.4, shorelineRandom() * Math.PI, shorelineRandom() * 0.35));
    shoreScale.set(scale * 1.4, scale * 0.75, scale);
    shoreMatrix.compose(shorePosition, shoreQuaternion, shoreScale);
    shoreRocks.setMatrixAt(i, shoreMatrix);
    if ((i + 1) % 64 === 0) yield;
  }
  shoreRocks.castShadow = true;
  shoreRocks.receiveShadow = true;

  const reedGeometry = new THREE.ConeGeometry(0.055, 1, 5);
  const reedMaterial = new THREE.MeshStandardMaterial({ color: 0x344b35, roughness: 0.92 });
  const reeds = new THREE.InstancedMesh(reedGeometry, reedMaterial, manifest.counts.reeds);
  root.add(reeds);
  for (let i = 0; i < manifest.counts.reeds; i += 1) {
    const angle = shorelineRandom() * Math.PI * 2;
    const radius = 22.8 + shorelineRandom() * 2.6;
    const x = 28 + Math.cos(angle) * radius;
    const z = 18 + Math.sin(angle) * radius;
    const height = 0.55 + shorelineRandom() * 1.15;
    shorePosition.set(x, -2.06 + height * 0.5, z);
    shoreQuaternion.setFromEuler(new THREE.Euler((shorelineRandom() - 0.5) * 0.18, angle, (shorelineRandom() - 0.5) * 0.14));
    shoreScale.set(0.8 + shorelineRandom() * 0.5, height, 0.8 + shorelineRandom() * 0.5);
    shoreMatrix.compose(shorePosition, shoreQuaternion, shoreScale);
    reeds.setMatrixAt(i, shoreMatrix);
    if ((i + 1) % 128 === 0) yield;
  }

  const island = new THREE.Mesh(new THREE.CylinderGeometry(4.3, 5.8, 1.5, 32), createTerrainMaterial(hashSeed(`${manifest.seed}::lake/island`)));
  island.position.set(34, -1.72, 13.5);
  island.rotation.y = shorelineRandom() * Math.PI;
  island.receiveShadow = true;
  root.add(island);
  yield;

  const nearTrunkGeometry = new THREE.CylinderGeometry(0.22, 0.42, 3.5, 6);
  const farTrunkGeometry = new THREE.CylinderGeometry(0.22, 0.42, 3.5, 4);
  const trunkMaterial = createWoodMaterial(hashSeed(`${manifest.seed}::forest/wood`));
  const nearTrunks = new THREE.InstancedMesh(nearTrunkGeometry, trunkMaterial, manifest.forestLod.nearTrees);
  const farTrunks = new THREE.InstancedMesh(farTrunkGeometry, trunkMaterial, manifest.forestLod.farTrees);
  const nearCanopyGeometry = new THREE.ConeGeometry(1.5, 5.2, 7);
  const farCanopyGeometry = new THREE.ConeGeometry(1.5, 5.2, 4);
  const canopyMaterial = new THREE.MeshStandardMaterial({ color: 0x111c18, roughness: 0.94 });
  const nearCanopies = new THREE.InstancedMesh(nearCanopyGeometry, canopyMaterial, manifest.forestLod.nearTrees);
  const nearUpperCanopies = new THREE.InstancedMesh(nearCanopyGeometry, canopyMaterial, manifest.forestLod.nearTrees);
  const farCanopies = new THREE.InstancedMesh(farCanopyGeometry, canopyMaterial, manifest.forestLod.farTrees);
  const matrix = new THREE.Matrix4();
  const quaternion = new THREE.Quaternion();
  const treeUp = new THREE.Vector3(0, 1, 0);
  const scale = new THREE.Vector3();
  const position = new THREE.Vector3();
  let nearTreeIndex = 0;
  let farTreeIndex = 0;
  const treeBatches = [nearTrunks, nearCanopies, nearUpperCanopies, farTrunks, farCanopies];
  root.add(...treeBatches);
  for (let i = 0; i < manifest.counts.trees; i += 1) {
    const isNearTree = i < manifest.forestLod.nearTrees;
    let x = 0;
    let z = 0;
    let placementFound = false;
    for (let attempt = 0; attempt < 12; attempt += 1) {
      const angle = random() * Math.PI * 2;
      const minimumDistance = isNearTree ? 32 : manifest.forestLod.splitRadius;
      const maximumDistance = isNearTree ? manifest.forestLod.splitRadius : 71;
      const distance = minimumDistance + random() * (maximumDistance - minimumDistance);
      x = Math.cos(angle) * distance;
      z = Math.sin(angle) * distance;
      if ((x - 28) ** 2 + (z - 18) ** 2 >= 1050 && (x + 7) ** 2 + (z + 4) ** 2 >= 800 && (x + 31) ** 2 + (z - 13) ** 2 >= 676) {
        placementFound = true;
        break;
      }
    }
    if (!placementFound) {
      const fallbackAngle = i * 2.399963229728653;
      x = Math.cos(fallbackAngle) * 70;
      z = Math.sin(fallbackAngle) * 70;
    }
    const y = terrainHeight(x, z, seed);
    const treeScale = 0.7 + random() * 1.25;
    const treeDetails = createForestTreeDetailProfile(manifest.seed, i);
    const treeYaw = random() * Math.PI * 2;
    const trunkHeight = 3.5 * treeScale * treeDetails.heightScale;
    quaternion.setFromEuler(new THREE.Euler(treeDetails.leanX, treeYaw, treeDetails.leanZ, 'YXZ'));
    position.set(x, y + trunkHeight / 2, z);
    scale.set(treeScale * treeDetails.trunkWidth, treeScale * treeDetails.heightScale, treeScale * treeDetails.trunkWidth);
    matrix.compose(position, quaternion, scale);
    const trunkBatch = isNearTree ? nearTrunks : farTrunks;
    const canopyBatch = isNearTree ? nearCanopies : farCanopies;
    const batchIndex = isNearTree ? nearTreeIndex : farTreeIndex;
    trunkBatch.setMatrixAt(batchIndex, matrix);
    position.y = y + trunkHeight + 2.15 * treeScale * treeDetails.heightScale;
    scale.set(treeScale * treeDetails.canopyWidth, treeScale * treeDetails.heightScale, treeScale * treeDetails.canopyWidth);
    matrix.compose(position, quaternion, scale);
    canopyBatch.setMatrixAt(batchIndex, matrix);
    if (isNearTree) {
      quaternion.setFromAxisAngle(treeUp, treeDetails.canopyTwist);
      position.y = y + trunkHeight + 4.5 * treeScale * treeDetails.heightScale;
      scale.set(
        treeScale * treeDetails.canopyWidth * treeDetails.upperCanopyScale,
        treeScale * treeDetails.upperCanopyScale,
        treeScale * treeDetails.canopyWidth * treeDetails.upperCanopyScale,
      );
      matrix.compose(position, quaternion, scale);
      nearUpperCanopies.setMatrixAt(batchIndex, matrix);
    }
    if (isNearTree) nearTreeIndex += 1;
    else farTreeIndex += 1;
    if ((i + 1) % 96 === 0) yield;
  }
  treeBatches.forEach((batch) => {
    batch.instanceMatrix.needsUpdate = true;
    batch.computeBoundingSphere();
  });
  nearTrunks.castShadow = quality !== 'low';
  nearCanopies.castShadow = quality !== 'low';
  nearUpperCanopies.castShadow = quality !== 'low';
  farTrunks.castShadow = false;
  farCanopies.castShadow = false;
  nearTrunks.name = 'forest-near-trunks';
  nearCanopies.name = 'forest-near-canopies';
  nearUpperCanopies.name = 'forest-near-upper-canopies';
  farTrunks.name = 'forest-far-trunks';
  farCanopies.name = 'forest-far-canopies';
  yield;

  root.add(createForestEmbellishments(manifest, embellishmentMaterials));
  yield;

  const fireflyGeometry = new THREE.SphereGeometry(0.08, 5, 5);
  const fireflyMaterial = new THREE.MeshBasicMaterial({ color: new THREE.Color().setRGB(0.7, 2.4, 0.8), toneMapped: false });
  const fireflies = new THREE.InstancedMesh(fireflyGeometry, fireflyMaterial, manifest.counts.fireflies);
  root.add(fireflies);
  for (let i = 0; i < manifest.counts.fireflies; i += 1) {
    const x = -50 + random() * 100;
    const z = -50 + random() * 100;
    const y = terrainHeight(x, z, seed) + 1.5 + random() * 5;
    matrix.makeTranslation(x, y, z);
    fireflies.setMatrixAt(i, matrix);
    if ((i + 1) % 128 === 0) yield;
  }

  const wispPositions = new Float32Array(manifest.counts.wisps * 3);
  const wispPhases = new Float32Array(manifest.counts.wisps);
  const wispRandom = mulberry32(hashSeed(`${manifest.seed}::magic/wisps`));
  for (let i = 0; i < manifest.counts.wisps; i += 1) {
    const angle = wispRandom() * Math.PI * 2;
    const radius = 8 + wispRandom() * 42;
    const x = -7 + Math.cos(angle) * radius;
    const z = -4 + Math.sin(angle) * radius;
    wispPositions[i * 3] = x;
    wispPositions[i * 3 + 1] = terrainHeight(x, z, seed) + 2 + wispRandom() * 9;
    wispPositions[i * 3 + 2] = z;
    wispPhases[i] = wispRandom() * Math.PI * 2;
    if ((i + 1) % 128 === 0) yield;
  }
  const wispGeometry = new THREE.BufferGeometry();
  wispGeometry.setAttribute('position', new THREE.BufferAttribute(wispPositions, 3));
  wispGeometry.setAttribute('aPhase', new THREE.BufferAttribute(wispPhases, 1));
  const magicMaterial = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    toneMapped: false,
    uniforms: { uTime: { value: 0 } },
    vertexShader: `
      uniform float uTime;
      attribute float aPhase;
      varying float vPulse;
      void main() {
        vec3 p = position;
        p.x += sin(uTime * 0.42 + aPhase) * 0.8;
        p.y += sin(uTime * 0.7 + aPhase * 1.7) * 0.55;
        p.z += cos(uTime * 0.36 + aPhase) * 0.8;
        vec4 mvPosition = modelViewMatrix * vec4(p, 1.0);
        vPulse = 0.62 + sin(uTime * 1.4 + aPhase) * 0.28;
        gl_PointSize = (16.0 + vPulse * 12.0) / max(1.0, -mvPosition.z * 0.12);
        gl_Position = projectionMatrix * mvPosition;
      }
    `,
    fragmentShader: `
      varying float vPulse;
      void main() {
        float distanceToCenter = length(gl_PointCoord - 0.5);
        float core = smoothstep(0.5, 0.0, distanceToCenter);
        float halo = smoothstep(0.5, 0.12, distanceToCenter);
        vec3 color = mix(vec3(0.32, 0.75, 1.6), vec3(1.15, 0.48, 1.8), vPulse);
        gl_FragColor = vec4(color, core * halo * (0.35 + vPulse * 0.45));
      }
    `,
  });
  root.add(new THREE.Points(wispGeometry, magicMaterial));
  yield;

  const village = new THREE.Group();
  village.name = 'village-of-lumen-row';
  root.add(village);
  const houseGeometry = new THREE.BoxGeometry(1, 1, 1);
  const plaster = new THREE.MeshStandardMaterial({ color: 0x544b43, roughness: 0.9 });
  const timber = createWoodMaterial(hashSeed(`${manifest.seed}::village/wood`));
  const villageRoof = new THREE.ConeGeometry(1, 1, 4);
  const villageDetails = manifest.villageBuildings.map((_, index) => createVillageDetailProfile(manifest.seed, index));
  const villageWindowGeometry = new THREE.PlaneGeometry(0.55, 0.8);
  const villageWindows = new THREE.InstancedMesh(villageWindowGeometry, windowMaterial, manifest.villageBuildings.length);
  const windowFrames = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 0.08), timber, manifest.villageBuildings.length * 4);
  const chimneys = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), stone, manifest.villageBuildings.length);
  const signCount = villageDetails.filter((details) => details.hasSign).length;
  const signMaterial = new THREE.MeshStandardMaterial({ color: 0x713f2c, roughness: 0.82 });
  const signPosts = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), timber, signCount);
  const signBoards = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 0.14), signMaterial, signCount);
  village.add(villageWindows, windowFrames, chimneys, signPosts, signBoards);
  const villageLocalPosition = new THREE.Vector3();
  const villageWorldPosition = new THREE.Vector3();
  const villageQuaternion = new THREE.Quaternion();
  let windowFrameIndex = 0;
  let signIndex = 0;
  const roadMaterial = new THREE.MeshStandardMaterial({ color: 0x242321, roughness: 1 });
  const road = new THREE.Mesh(new THREE.PlaneGeometry(41, 4.2, 10, 1), roadMaterial);
  road.rotation.x = -Math.PI / 2;
  road.rotation.z = -0.14;
  road.position.set(-31, terrainHeight(-31, 13, seed) + 0.12, 13);
  road.receiveShadow = true;
  village.add(road);
  for (const [index, building] of manifest.villageBuildings.entries()) {
    const [x, z] = building.position;
    const y = terrainHeight(x, z, seed);
    const { width, depth, height, side } = building;
    const house = new THREE.Group();
    house.name = building.id;
    house.position.set(x, y, z);
    house.rotation.y = building.rotation;
    const body = new THREE.Mesh(houseGeometry, index % 3 === 0 ? timber : plaster);
    body.scale.set(width, height, depth);
    body.position.y = height / 2;
    body.castShadow = true;
    body.receiveShadow = true;
    house.add(body);
    const cap = new THREE.Mesh(villageRoof, roof);
    cap.scale.set(width * 0.84, building.roofHeight, depth * 0.84);
    cap.rotation.y = Math.PI / 4;
    cap.position.y = height + 1.2;
    cap.castShadow = true;
    house.add(cap);
    village.add(house);

    const details = villageDetails[index];
    const facadeZ = side < 0 ? depth / 2 + 0.02 : -depth / 2 - 0.02;
    villageQuaternion.setFromAxisAngle(treeUp, building.rotation);
    villageLocalPosition.set(0, height * 0.55, facadeZ).applyQuaternion(villageQuaternion);
    villageWorldPosition.set(x, y, z).add(villageLocalPosition);
    quaternion.setFromAxisAngle(treeUp, building.rotation + (side < 0 ? 0 : Math.PI));
    detailMatrix.compose(villageWorldPosition, quaternion, new THREE.Vector3(1, 1, 1));
    villageWindows.setMatrixAt(index, detailMatrix);

    const frameDepth = facadeZ + (side < 0 ? 0.04 : -0.04);
    for (const offsetX of [-0.34, 0.34]) {
      villageLocalPosition.set(offsetX, height * 0.55, frameDepth).applyQuaternion(villageQuaternion);
      villageWorldPosition.set(x, y, z).add(villageLocalPosition);
      detailMatrix.compose(villageWorldPosition, villageQuaternion, new THREE.Vector3(0.07, 0.92, 1));
      windowFrames.setMatrixAt(windowFrameIndex, detailMatrix);
      windowFrameIndex += 1;
    }
    for (const offsetY of [-0.43, 0.43]) {
      villageLocalPosition.set(0, height * 0.55 + offsetY, frameDepth).applyQuaternion(villageQuaternion);
      villageWorldPosition.set(x, y, z).add(villageLocalPosition);
      detailMatrix.compose(villageWorldPosition, villageQuaternion, new THREE.Vector3(0.76, 0.07, 1));
      windowFrames.setMatrixAt(windowFrameIndex, detailMatrix);
      windowFrameIndex += 1;
    }

    villageLocalPosition.set(details.chimneySide * width * details.chimneyOffset, height + building.roofHeight * 0.68, side * depth * 0.16).applyQuaternion(villageQuaternion);
    villageWorldPosition.set(x, y, z).add(villageLocalPosition);
    detailMatrix.compose(villageWorldPosition, villageQuaternion, new THREE.Vector3(0.32, building.roofHeight, 0.32));
    chimneys.setMatrixAt(index, detailMatrix);

    if (details.hasSign) {
      const signZ = facadeZ + (side < 0 ? 0.5 : -0.5);
      villageLocalPosition.set(details.signSide * (width / 2 + 0.48), 1.2, signZ).applyQuaternion(villageQuaternion);
      villageWorldPosition.set(x, y, z).add(villageLocalPosition);
      detailMatrix.compose(villageWorldPosition, villageQuaternion, new THREE.Vector3(0.12, 2.4, 0.12));
      signPosts.setMatrixAt(signIndex, detailMatrix);
      villageLocalPosition.set(details.signSide * (width / 2 + 0.48), 2.35, signZ).applyQuaternion(villageQuaternion);
      villageWorldPosition.set(x, y, z).add(villageLocalPosition);
      detailMatrix.compose(villageWorldPosition, villageQuaternion, new THREE.Vector3(0.92, 0.58, 1));
      signBoards.setMatrixAt(signIndex, detailMatrix);
      signIndex += 1;
    }
    if ((index + 1) % 8 === 0) yield;
  }
  [villageWindows, windowFrames, chimneys, signPosts, signBoards].forEach((batch) => {
    batch.instanceMatrix.needsUpdate = true;
    batch.computeBoundingSphere();
    batch.castShadow = batch !== villageWindows;
  });
  villageWindows.name = 'village-instanced-windows';
  windowFrames.name = 'village-seed-window-frames';
  chimneys.name = 'village-seed-chimneys';
  signPosts.name = 'village-seed-sign-posts';
  signBoards.name = 'village-seed-sign-boards';
  yield;

  root.add(createVillageEmbellishments(manifest, embellishmentMaterials));
  yield;

  const stairRoot = new THREE.Group();
  stairRoot.name = 'moving-staircase';
  stairRoot.position.set(-5, terrainHeight(-5, 1, seed) + 8.5, 2.5);
  const stepGeometry = new THREE.BoxGeometry(1.35, 0.3, 3.2);
  const stairs = new THREE.InstancedMesh(stepGeometry, stone, 16);
  for (let i = 0; i < 16; i += 1) {
    matrix.compose(
      new THREE.Vector3(i * 1.08, i * 0.6, 0),
      new THREE.Quaternion(),
      new THREE.Vector3(1, 1, 1),
    );
    stairs.setMatrixAt(i, matrix);
  }
  stairs.castShadow = true;
  stairs.receiveShadow = true;
  stairRoot.add(stairs);
  root.add(stairRoot);
  const stairTargets = [-0.42, 0.7].map((angle) => new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), angle)) as [THREE.Quaternion, THREE.Quaternion];
  const landingGeometry = new THREE.BoxGeometry(4.6, 0.55, 4.2);
  const stairEnd = new THREE.Vector3(15 * 1.08 + 2.1, 15 * 0.6, 0);
  stairTargets.forEach((target) => {
    const landing = new THREE.Mesh(landingGeometry, stone);
    landing.position.copy(stairEnd).applyQuaternion(target).add(stairRoot.position);
    landing.quaternion.copy(target);
    landing.castShadow = true;
    landing.receiveShadow = true;
    root.add(landing);
  });

  const candleRoot = new THREE.Group();
  candleRoot.name = 'floating-candles';
  const waxGeometry = new THREE.CylinderGeometry(0.07, 0.08, 0.55, 6);
  const waxMaterial = new THREE.MeshStandardMaterial({ color: 0xe5ddc4, roughness: 0.7 });
  const flameGeometry = new THREE.SphereGeometry(0.095, 5, 5);
  const flameMaterial = new THREE.MeshBasicMaterial({ color: new THREE.Color().setRGB(3.4, 0.82, 0.12), toneMapped: false });
  const wax = new THREE.InstancedMesh(waxGeometry, waxMaterial, manifest.counts.candles);
  const flames = new THREE.InstancedMesh(flameGeometry, flameMaterial, manifest.counts.candles);
  candleRoot.add(wax, flames);
  root.add(candleRoot);
  for (let i = 0; i < manifest.counts.candles; i += 1) {
    const angle = random() * Math.PI * 2;
    const radius = 7 + random() * 15;
    const x = -7 + Math.cos(angle) * radius;
    const z = -4 + Math.sin(angle) * radius;
    const y = terrainHeight(x, z, seed) + 9 + random() * 15;
    matrix.makeTranslation(x, y, z);
    wax.setMatrixAt(i, matrix);
    matrix.makeTranslation(x, y + 0.39, z);
    flames.setMatrixAt(i, matrix);
    if ((i + 1) % 64 === 0) yield;
  }

  const celestialMaterial = new THREE.MeshBasicMaterial({ color: new THREE.Color().setRGB(1.25, 1.4, 2.1), toneMapped: false });
  const moon = new THREE.Mesh(new THREE.SphereGeometry(4.3, 32, 32), celestialMaterial);
  moon.position.set(-52, 44, -62);
  root.add(moon);

  const zoneDebug = new THREE.Group();
  zoneDebug.name = 'zone-debug';
  const zoneColors: Record<WorldZoneType, number> = { castle: 0xe6b45f, village: 0xd78865, forest: 0x67ae88, lake: 0x65a7d7, mountains: 0xa7b0b8, ruins: 0x9b80c7, station: 0xd6a05f };
  for (const zone of manifest.zones) {
    const ring = new THREE.Mesh(
      new THREE.RingGeometry(Math.max(0.1, zone.radius - 0.28), zone.radius + 0.28, 96),
      new THREE.MeshBasicMaterial({ color: zoneColors[zone.type], transparent: true, opacity: 0.7, side: THREE.DoubleSide, depthWrite: false, toneMapped: false }),
    );
    ring.rotation.x = -Math.PI / 2;
    ring.position.set(zone.center[0], zone.type === 'lake' ? -1.82 : terrainHeight(zone.center[0], zone.center[1], seed) + 0.45, zone.center[1]);
    zoneDebug.add(ring);
  }
  zoneDebug.visible = false;
  root.add(zoneDebug);

  const ambientEmbellishments = createAmbientEmbellishments(manifest, quality, embellishmentMaterials);
  root.add(ambientEmbellishments.root);
  yield;

  const worldRegions = createWorldRegions(manifest, quality, embellishmentMaterials);
  root.add(worldRegions.root);
  yield;

    completed = true;
    return {
      root,
      waterMaterial,
      magicMaterial,
      stairRoot,
      stairTargets,
      candleRoot,
      zoneDebug,
      starMaterial,
      celestialOrb: moon,
      celestialMaterial,
      cloudRoot: ambientEmbellishments.cloudRoot,
      runeRoot: ambientEmbellishments.runeRoot,
      floatingBookRoot: ambientEmbellishments.floatingBookRoot,
      movingLanternRoot: ambientEmbellishments.movingLanternRoot,
      stationClockHands: worldRegions.stationClockHands,
      railcarRoot: worldRegions.railcarRoot,
      manifest,
      validation,
    };
  } finally {
    if (!completed) disposeObject(root);
  }
}

function createWorld(seedText: string, quality: QualityTier, signal?: AbortSignal) {
  return runSynchronously(createWorldChunks(seedText, quality), signal);
}

function createWorldIncrementally(seedText: string, quality: QualityTier, signal: AbortSignal) {
  return runIncrementally(createWorldChunks(seedText, quality), signal);
}

export default function Home() {
  const mountRef = useRef<HTMLDivElement>(null);
  const seedRef = useRef(DEFAULT_SEED);
  const modeRef = useRef<CameraMode>('tour');
  const qualityRef = useRef<QualityTier>('medium');
  const fogRef = useRef(true);
  const postRef = useRef(true);
  const bloomRef = useRef(true);
  const vignetteRef = useRef(true);
  const aoRef = useRef(false);
  const shadowsRef = useRef(true);
  const fogDensityRef = useRef(1);
  const bloomStrengthRef = useRef(1);
  const zoneDebugRef = useRef(false);
  const tourPausedRef = useRef(true);
  const reducedMotionRef = useRef(false);
  const autoRotateRef = useRef(false);
  const waterMotionRef = useRef(1);
  const ambientPausedRef = useRef(false);
  const timeOfDayRef = useRef<TimeOfDay>('night');
  const audioEnabledRef = useRef(false);
  const audioSystemRef = useRef<ArcaneAudioSystem | null>(null);
  const streamingEnabledRef = useRef(true);
  const streamingSystemRef = useRef<WorldStreamingSystem | null>(null);
  const sceneRequestRef = useRef<LandmarkId | null>(null);
  const fixedPoseRef = useRef<FixedView | null>(null);
  const rebuildLockedRef = useRef(false);
  const [seed, setSeed] = useState(DEFAULT_SEED);
  const [activeSeed, setActiveSeed] = useState(DEFAULT_SEED);
  const [entered, setEntered] = useState(false);
  const [seedPanelOpen, setSeedPanelOpen] = useState(true);
  const [copied, setCopied] = useState(false);
  const [manifestCopied, setManifestCopied] = useState(false);
  const [mode, setMode] = useState<CameraMode>('tour');
  const [quality, setQuality] = useState<QualityTier>('medium');
  const [fogEnabled, setFogEnabled] = useState(true);
  const [postEnabled, setPostEnabled] = useState(true);
  const [bloomEnabled, setBloomEnabled] = useState(true);
  const [vignetteEnabled, setVignetteEnabled] = useState(true);
  const [gradeEnabled, setGradeEnabled] = useState(true);
  const [aoEnabled, setAoEnabled] = useState(false);
  const [shadowsEnabled, setShadowsEnabled] = useState(true);
  const [fogDensity, setFogDensity] = useState(1);
  const [bloomStrength, setBloomStrength] = useState(1);
  const [zoneDebugEnabled, setZoneDebugEnabled] = useState(false);
  const [manifest, setManifest] = useState<WorldManifest>(() => createWorldManifest(DEFAULT_SEED, 'medium'));
  const [tourLocation, setTourLocation] = useState<WorldManifest['cameraLandmarks'][number]>(() => createWorldManifest(DEFAULT_SEED, 'medium').cameraLandmarks[0]);
  const [tourPaused, setTourPaused] = useState(true);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [autoRotate, setAutoRotate] = useState(false);
  const [waterMotion, setWaterMotion] = useState(1);
  const [ambientPaused, setAmbientPaused] = useState(false);
  const [timeOfDay, setTimeOfDay] = useState<TimeOfDay>('night');
  const [audioEnabled, setAudioEnabled] = useState(false);
  const [streamingEnabled, setStreamingEnabled] = useState(true);
  const [fixedView, setFixedView] = useState<FixedView | null>(null);
  const [stationQuestState, setStationQuestState] = useState<{ manifestHash: string; step: StationQuestStep }>({ manifestHash: '', step: 'sealed' });
  const [generationStatus, setGenerationStatus] = useState<'ready' | 'building' | 'error'>('ready');
  const [generationError, setGenerationError] = useState<string | null>(null);
  const [stats, setStats] = useState<PerformanceStats>({ fps: 60, frameMs: 16.7, calls: 0, triangles: 0, points: 0, lines: 0, geometries: 0, textures: 0, heapMb: null, generationMs: 0, disposedGeometries: 0, disposedMaterials: 0, activeChunks: 5, totalChunks: 5 });
  const [soakAudit, setSoakAudit] = useState<SoakAudit>({ running: false, completed: 0, total: 20, baselineGeometries: 0, finalGeometries: null, baselineHeapMb: null, finalHeapMb: null });
  const [hudOpen, setHudOpen] = useState(false);

  useEffect(() => { seedRef.current = activeSeed; }, [activeSeed]);
  useEffect(() => { modeRef.current = mode; }, [mode]);
  useEffect(() => { qualityRef.current = quality; }, [quality]);
  useEffect(() => { fogRef.current = fogEnabled; }, [fogEnabled]);
  useEffect(() => { postRef.current = postEnabled; }, [postEnabled]);
  useEffect(() => { bloomRef.current = bloomEnabled; }, [bloomEnabled]);
  useEffect(() => { vignetteRef.current = vignetteEnabled; }, [vignetteEnabled]);
  useEffect(() => { aoRef.current = aoEnabled; }, [aoEnabled]);
  useEffect(() => { shadowsRef.current = shadowsEnabled; }, [shadowsEnabled]);
  useEffect(() => { fogDensityRef.current = fogDensity; }, [fogDensity]);
  useEffect(() => { bloomStrengthRef.current = bloomStrength; }, [bloomStrength]);
  useEffect(() => { zoneDebugRef.current = zoneDebugEnabled; }, [zoneDebugEnabled]);
  useEffect(() => { tourPausedRef.current = tourPaused; }, [tourPaused]);
  useEffect(() => { reducedMotionRef.current = reducedMotion; }, [reducedMotion]);
  useEffect(() => { autoRotateRef.current = autoRotate; }, [autoRotate]);
  useEffect(() => { waterMotionRef.current = waterMotion; }, [waterMotion]);
  useEffect(() => { ambientPausedRef.current = ambientPaused; }, [ambientPaused]);
  useEffect(() => { timeOfDayRef.current = timeOfDay; }, [timeOfDay]);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;
    const readHeapMb = () => {
      const memory = (performance as Performance & { memory?: { usedJSHeapSize: number } }).memory;
      return memory ? Math.round((memory.usedJSHeapSize / 1048576) * 10) / 10 : null;
    };
    const scene = new THREE.Scene();
    const environment = new EnvironmentSystem(scene, timeOfDayRef.current);
    const camera = new THREE.PerspectiveCamera(48, mount.clientWidth / mount.clientHeight, 0.1, 350);
    const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    const renderScale = () => qualityRef.current === 'low' ? 1 : qualityRef.current === 'medium' ? 1.55 : 2;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, renderScale()));
    renderer.setSize(mount.clientWidth, mount.clientHeight);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFShadowMap;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.05;
    renderer.info.autoReset = false;
    mount.appendChild(renderer.domElement);

    const composer = new EffectComposer(renderer);
    const renderPass = new RenderPass(scene, camera);
    const ssaoPass = new SSAOPass(scene, camera, mount.clientWidth, mount.clientHeight);
    ssaoPass.kernelRadius = 9;
    ssaoPass.minDistance = 0.0025;
    ssaoPass.maxDistance = 0.12;
    ssaoPass.enabled = false;
    const bloomPass = new UnrealBloomPass(new THREE.Vector2(mount.clientWidth, mount.clientHeight), 0.48, 0.42, 0.86);
    const fxaaPass = new ShaderPass(FXAAShader);
    const vignettePass = new ShaderPass(VignetteShader);
    vignettePass.uniforms.offset.value = 1.05;
    vignettePass.uniforms.darkness.value = 1.18;
    const outputPass = new OutputPass();
    composer.addPass(renderPass);
    composer.addPass(ssaoPass);
    composer.addPass(bloomPass);
    composer.addPass(fxaaPass);
    composer.addPass(vignettePass);
    composer.addPass(outputPass);
    const updateFxaaResolution = () => {
      const pixelRatio = renderer.getPixelRatio();
      fxaaPass.material.uniforms.resolution.value.set(1 / (mount.clientWidth * pixelRatio), 1 / (mount.clientHeight * pixelRatio));
    };
    updateFxaaResolution();

    const initialGenerationStarted = performance.now();
    let world = createWorld(seedRef.current, qualityRef.current);
    const audioSystem = new ArcaneAudioSystem(world.manifest.seedHash, timeOfDayRef.current);
    audioSystemRef.current = audioSystem;
    const streamingSystem = new WorldStreamingSystem(world.root, world.manifest, qualityRef.current);
    streamingSystem.setEnabled(streamingEnabledRef.current);
    streamingSystemRef.current = streamingSystem;
    let streamingStatus = streamingSystem.status;
    const npcBehavior = new NpcBehaviorSystem(world.root, world.manifest.seed);
    let lastGenerationMs = performance.now() - initialGenerationStarted;
    let lastDisposal = { geometries: 0, materials: 0 };
    scene.add(world.root);
    const cameraManager = new CameraManager(camera, renderer.domElement, world.manifest);
    const startedAt = performance.now();
    let frame = 0;
    const rebuildCoordinator = new RebuildCoordinator<{ seed: string; quality: QualityTier; reason: 'user' | 'audit' | 'context' }>();
    let animationTime = 0;
    let soakRemaining = 0;
    let soakCompleted = 0;
    let soakBaselineGeometries = 0;
    let soakBaselineHeapMb: number | null = null;
    let soakFinalSampleUntil = 0;
    let soakFinalHeapMb: number | null = null;
    let contextAvailable = true;
    let rebuildInProgress = false;
    let disposed = false;
    let previousElapsed = 0;
    let framesSinceSample = 0;
    let sampleStarted = 0;
    const queueRebuild = (reason: 'user' | 'audit' | 'context') => rebuildCoordinator.request({ seed: seedRef.current, quality: qualityRef.current, reason });
    const rebuild = () => { queueRebuild('user'); };
    const runSoak = () => {
      if (soakRemaining > 0) return;
      soakRemaining = 20;
      soakCompleted = 0;
      soakFinalSampleUntil = 0;
      soakFinalHeapMb = null;
      soakBaselineGeometries = renderer.info.memory.geometries;
      soakBaselineHeapMb = readHeapMb();
      setSoakAudit({ running: true, completed: 0, total: 20, baselineGeometries: soakBaselineGeometries, finalGeometries: null, baselineHeapMb: soakBaselineHeapMb, finalHeapMb: null });
      setGenerationStatus('building');
      queueRebuild('audit');
    };
    window.addEventListener('wizard-rebuild', rebuild);
    window.addEventListener('wizard-soak', runSoak);

    const onContextLost = (event: Event) => {
      event.preventDefault();
      contextAvailable = false;
      setGenerationError('Graphics context lost. Waiting for the renderer to recover.');
      setGenerationStatus('error');
    };
    const onContextRestored = () => {
      contextAvailable = true;
      setGenerationError(null);
      setGenerationStatus('building');
      queueRebuild('context');
    };
    renderer.domElement.addEventListener('webglcontextlost', onContextLost);
    renderer.domElement.addEventListener('webglcontextrestored', onContextRestored);

    const processNextRebuild = () => {
      if (rebuildInProgress) return;
      const rebuildTicket = rebuildCoordinator.takeLatest();
      if (!rebuildTicket) return;

      rebuildInProgress = true;
      void (async () => {
        let nextWorld: GeneratedWorld | null = null;
        try {
          const generationStarted = performance.now();
          nextWorld = await createWorldIncrementally(rebuildTicket.payload.seed, rebuildTicket.payload.quality, rebuildTicket.signal);
          lastGenerationMs = performance.now() - generationStarted;
          rebuildTicket.signal.throwIfAborted();
          if (!rebuildCoordinator.complete(rebuildTicket.id) || disposed) {
            disposeObject(nextWorld.root);
            nextWorld = null;
            return;
          }

          const previousWorld = world;
          scene.add(nextWorld.root);
          world = nextWorld;
          seedRef.current = rebuildTicket.payload.seed;
          qualityRef.current = rebuildTicket.payload.quality;
          setActiveSeed(rebuildTicket.payload.seed);
          setQuality(rebuildTicket.payload.quality);
          if (fixedPoseRef.current) {
            const updatedFixedView = world.manifest.validationViews.find((view) => view.id === fixedPoseRef.current?.id) ?? null;
            fixedPoseRef.current = updatedFixedView;
            setFixedView(updatedFixedView);
          }
          cameraManager.setManifest(world.manifest);
          audioSystem.setSeed(world.manifest.seedHash);
          streamingSystem.setWorld(world.root, world.manifest, rebuildTicket.payload.quality);
          npcBehavior.setWorld(world.root, world.manifest.seed);
          scene.remove(previousWorld.root);
          lastDisposal = disposeObject(previousWorld.root);
          renderer.setPixelRatio(Math.min(window.devicePixelRatio, renderScale()));
          renderer.setSize(mount.clientWidth, mount.clientHeight);
          composer.setPixelRatio(renderer.getPixelRatio());
          composer.setSize(mount.clientWidth, mount.clientHeight);
          updateFxaaResolution();
          setManifest(world.manifest);
          setGenerationError(null);
          if (soakRemaining > 0) {
            soakRemaining -= 1;
            soakCompleted += 1;
            const running = soakRemaining > 0;
            if (!running) {
              soakFinalSampleUntil = (performance.now() - startedAt) / 1000 + 3;
              soakFinalHeapMb = null;
            }
            setSoakAudit({
              running: true,
              completed: soakCompleted,
              total: 20,
              baselineGeometries: soakBaselineGeometries,
              finalGeometries: null,
              baselineHeapMb: soakBaselineHeapMb,
              finalHeapMb: null,
            });
            setGenerationStatus('building');
            if (running) queueRebuild('audit');
          } else {
            rebuildLockedRef.current = false;
            setGenerationStatus('ready');
          }
        } catch (error) {
          if (nextWorld) disposeObject(nextWorld.root);
          rebuildCoordinator.complete(rebuildTicket.id);
          if (disposed) return;
          const canceled = error instanceof DOMException && error.name === 'AbortError';
          if (canceled && rebuildCoordinator.hasPending) {
            setGenerationStatus('building');
            return;
          }
          soakRemaining = 0;
          soakFinalSampleUntil = 0;
          setSoakAudit((audit) => ({ ...audit, running: false, finalGeometries: renderer.info.memory.geometries, finalHeapMb: readHeapMb() }));
          rebuildLockedRef.current = false;
          if (canceled) {
            setGenerationStatus('ready');
          } else {
            seedRef.current = world.manifest.seed;
            qualityRef.current = world.manifest.quality;
            setActiveSeed(world.manifest.seed);
            setQuality(world.manifest.quality);
            setGenerationError(error instanceof Error ? error.message : 'World generation failed.');
            setGenerationStatus('error');
          }
        } finally {
          rebuildInProgress = false;
        }
      })();
    };

    const render = () => {
      frame = requestAnimationFrame(render);
      const elapsed = (performance.now() - startedAt) / 1000;
      const delta = Math.min(0.05, elapsed - previousElapsed);
      previousElapsed = elapsed;
      if (!contextAvailable) return;
      if (!ambientPausedRef.current) animationTime += delta;
      processNextRebuild();
      const environmentFrame = environment.update(delta, {
        timeOfDay: timeOfDayRef.current,
        fogEnabled: fogRef.current,
        fogDensity: fogDensityRef.current,
        postEnabled: postRef.current,
        bloomStrength: bloomStrengthRef.current,
        shadowsEnabled: shadowsRef.current,
        quality: qualityRef.current,
      }, world);
      renderer.toneMappingExposure = environmentFrame.toneMappingExposure;
      bloomPass.strength = environmentFrame.bloomStrength;
      bloomPass.enabled = postRef.current && bloomRef.current;
      fxaaPass.enabled = postRef.current;
      vignettePass.enabled = postRef.current && vignetteRef.current;
      ssaoPass.enabled = postRef.current && aoRef.current && qualityRef.current !== 'low';
      renderer.shadowMap.enabled = shadowsRef.current;
      world.waterMaterial.uniforms.uTime.value = animationTime;
      world.waterMaterial.uniforms.uWaveStrength.value = waterMotionRef.current;
      world.magicMaterial.uniforms.uTime.value = animationTime;
      world.zoneDebug.visible = zoneDebugRef.current;
      const stairPhase = (animationTime % 16) / 16;
      const stairBlend = stairPhase < 0.5 ? THREE.MathUtils.smoothstep(stairPhase, 0.08, 0.42) : 1 - THREE.MathUtils.smoothstep(stairPhase, 0.58, 0.92);
      world.stairRoot.quaternion.slerpQuaternions(world.stairTargets[0], world.stairTargets[1], stairBlend);
      world.candleRoot.position.y = Math.sin(animationTime * 0.8) * 0.24;
      world.cloudRoot.rotation.y = animationTime * 0.0025;
      world.runeRoot.position.y = Math.sin(animationTime * 1.25) * 0.055;
      world.floatingBookRoot.rotation.y = Math.sin(animationTime * 0.22) * 0.18;
      world.floatingBookRoot.position.y = Number(world.floatingBookRoot.userData.baseY) + Math.sin(animationTime * 0.72) * 0.4;
      world.movingLanternRoot.rotation.y = Math.sin(animationTime * 0.075) * 0.12;
      world.movingLanternRoot.position.y = Math.sin(animationTime * 0.48) * 0.34;
      world.stationClockHands.rotation.z = -animationTime * 0.08;
      world.railcarRoot.position.x = Number(world.railcarRoot.userData.baseX) + Math.sin(animationTime * 0.12) * 5.5;
      npcBehavior.update(animationTime, reducedMotionRef.current);

      const requestedScene = sceneRequestRef.current;
      if (requestedScene) sceneRequestRef.current = null;
      const cameraLocation = cameraManager.update({
        elapsed,
        delta,
        mode: modeRef.current,
        tourPaused: tourPausedRef.current,
        reducedMotion: reducedMotionRef.current,
        autoRotate: autoRotateRef.current,
        seed: seedRef.current,
        requestedScene,
        fixedView: fixedPoseRef.current,
      });
      if (cameraLocation) setTourLocation(cameraLocation);
      streamingStatus = streamingSystem.update(camera.position, fixedPoseRef.current?.id === 'aerial-orbit' || camera.position.y > 48);
      renderer.info.reset();
      if (postRef.current) composer.render(delta);
      else renderer.render(scene, camera);

      if (soakFinalSampleUntil > 0) {
        const heapSample = readHeapMb();
        if (heapSample !== null) soakFinalHeapMb = soakFinalHeapMb === null ? heapSample : Math.min(soakFinalHeapMb, heapSample);
        if (elapsed >= soakFinalSampleUntil) {
          soakFinalSampleUntil = 0;
          setSoakAudit({
            running: false,
            completed: soakCompleted,
            total: 20,
            baselineGeometries: soakBaselineGeometries,
            finalGeometries: renderer.info.memory.geometries,
            baselineHeapMb: soakBaselineHeapMb,
            finalHeapMb: soakFinalHeapMb,
          });
          rebuildLockedRef.current = false;
          setGenerationStatus('ready');
        }
      }

      framesSinceSample += 1;
      if (elapsed - sampleStarted > 0.65) {
        const sampledFps = framesSinceSample / Math.max(0.001, elapsed - sampleStarted);
        setStats({
          fps: Math.round(sampledFps),
          frameMs: Math.round((1000 / Math.max(1, sampledFps)) * 10) / 10,
          calls: renderer.info.render.calls,
          triangles: renderer.info.render.triangles,
          points: renderer.info.render.points,
          lines: renderer.info.render.lines,
          geometries: renderer.info.memory.geometries,
          textures: renderer.info.memory.textures,
          heapMb: readHeapMb(),
          generationMs: Math.round(lastGenerationMs),
          disposedGeometries: lastDisposal.geometries,
          disposedMaterials: lastDisposal.materials,
          activeChunks: streamingStatus.active,
          totalChunks: streamingStatus.total,
        });
        framesSinceSample = 0;
        sampleStarted = elapsed;
      }
    };
    render();

    const resize = () => {
      const width = mount.clientWidth;
      const height = mount.clientHeight;
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, renderScale()));
      renderer.setSize(width, height);
      composer.setPixelRatio(renderer.getPixelRatio());
      composer.setSize(width, height);
      updateFxaaResolution();
    };
    window.addEventListener('resize', resize);
    return () => {
      disposed = true;
      cancelAnimationFrame(frame);
      window.removeEventListener('resize', resize);
      window.removeEventListener('wizard-rebuild', rebuild);
      window.removeEventListener('wizard-soak', runSoak);
      rebuildCoordinator.dispose();
      renderer.domElement.removeEventListener('webglcontextlost', onContextLost);
      renderer.domElement.removeEventListener('webglcontextrestored', onContextRestored);
      disposeObject(world.root);
      cameraManager.dispose();
      audioSystem.dispose();
      audioSystemRef.current = null;
      streamingSystem.dispose();
      streamingSystemRef.current = null;
      npcBehavior.dispose();
      environment.dispose();
      scene.clear();
      composer.dispose();
      renderer.dispose();
      renderer.domElement.remove();
    };
  }, []);

  const regenerate = useCallback(() => {
    if (rebuildLockedRef.current) return;
    rebuildLockedRef.current = true;
    const normalized = seed.trim() || DEFAULT_SEED;
    setSeed(normalized);
    setActiveSeed(normalized);
    seedRef.current = normalized;
    setGenerationError(null);
    setGenerationStatus('building');
    window.dispatchEvent(new Event('wizard-rebuild'));
  }, [seed]);

  const copySeed = useCallback(async () => {
    await navigator.clipboard.writeText(activeSeed);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1400);
  }, [activeSeed]);

  const copyManifest = useCallback(async () => {
    await navigator.clipboard.writeText(JSON.stringify(manifest, null, 2));
    setManifestCopied(true);
    window.setTimeout(() => setManifestCopied(false), 1400);
  }, [manifest]);

  const randomSeed = useCallback(() => {
    if (rebuildLockedRef.current) return;
    rebuildLockedRef.current = true;
    const values = new Uint32Array(1);
    crypto.getRandomValues(values);
    const next = `MAGIC-${String(values[0] % 100000).padStart(5, '0')}`;
    setSeed(next);
    setActiveSeed(next);
    seedRef.current = next;
    setGenerationError(null);
    setGenerationStatus('building');
    window.dispatchEvent(new Event('wizard-rebuild'));
  }, []);

  const selectQuality = useCallback((nextQuality: QualityTier) => {
    if (rebuildLockedRef.current || nextQuality === qualityRef.current) return;
    rebuildLockedRef.current = true;
    qualityRef.current = nextQuality;
    setQuality(nextQuality);
    setGenerationError(null);
    setGenerationStatus('building');
    window.dispatchEvent(new Event('wizard-rebuild'));
  }, []);

  const runSoakAudit = useCallback(() => {
    if (rebuildLockedRef.current || soakAudit.running) return;
    rebuildLockedRef.current = true;
    setHudOpen(true);
    window.dispatchEvent(new Event('wizard-soak'));
  }, [soakAudit.running]);

  const selectMode = useCallback((nextMode: CameraMode) => {
    fixedPoseRef.current = null;
    setFixedView(null);
    modeRef.current = nextMode;
    setMode(nextMode);
    if (nextMode !== 'orbit') {
      autoRotateRef.current = false;
      setAutoRotate(false);
    }
    if (nextMode !== 'fly' && nextMode !== 'walk' && document.pointerLockElement) document.exitPointerLock();
  }, []);

  const selectScene = useCallback((sceneId: LandmarkId) => {
    const landmark = manifest.cameraLandmarks.find((item) => item.id === sceneId);
    if (!landmark) return;
    sceneRequestRef.current = sceneId;
    tourPausedRef.current = true;
    setTourPaused(true);
    setTourLocation(landmark);
    selectMode('tour');
  }, [manifest, selectMode]);

  const selectFixedView = useCallback((viewId: FixedView['id']) => {
    const view = manifest.validationViews.find((item) => item.id === viewId);
    if (!view) return;
    selectMode('tour');
    fixedPoseRef.current = view;
    setFixedView(view);
    tourPausedRef.current = true;
    setTourPaused(true);
  }, [manifest, selectMode]);

  const toggleTimeOfDay = useCallback(() => {
    setTimeOfDay((current) => {
      const next = current === 'night' ? 'day' : 'night';
      timeOfDayRef.current = next;
      audioSystemRef.current?.setTimeOfDay(next);
      return next;
    });
  }, []);

  const toggleAudio = useCallback(() => {
    const next = !audioEnabledRef.current;
    audioEnabledRef.current = next;
    setAudioEnabled(next);
    void audioSystemRef.current?.setEnabled(next).then((available) => {
      if (next && !available) {
        audioEnabledRef.current = false;
        setAudioEnabled(false);
      }
    });
  }, []);

  const toggleWorldStreaming = useCallback((enabled: boolean) => {
    streamingEnabledRef.current = enabled;
    setStreamingEnabled(enabled);
    streamingSystemRef.current?.setEnabled(enabled);
  }, []);

  const enterRealm = useCallback(() => {
    regenerate();
    selectMode('tour');
    tourPausedRef.current = true;
    setTourPaused(true);
    setEntered(true);
    setSeedPanelOpen(false);
    window.setTimeout(() => mountRef.current?.focus(), 180);
  }, [regenerate, selectMode]);

  const toggleTourPause = useCallback(() => {
    fixedPoseRef.current = null;
    setFixedView(null);
    setTourPaused((paused) => {
      tourPausedRef.current = !paused;
      return !paused;
    });
  }, []);

  const toggleAutoRotate = useCallback(() => {
    fixedPoseRef.current = null;
    setFixedView(null);
    modeRef.current = 'orbit';
    setMode('orbit');
    setAutoRotate((current) => {
      const next = !current;
      autoRotateRef.current = next;
      return next;
    });
  }, []);

  useEffect(() => {
    const shortcuts = (event: KeyboardEvent) => {
      if (event.target instanceof HTMLInputElement) return;
      const key = event.key.toLowerCase();
      if (key === 't') selectMode('tour');
      if (key === 'g') selectMode('walk');
      if (key === 'f') selectMode('fly');
      if (key === 'o') selectMode('orbit');
      if (key === 'a' && modeRef.current !== 'walk' && modeRef.current !== 'fly') toggleAutoRotate();
      if (key === 'r') randomSeed();
      if (key >= '1' && key <= '8') selectScene(manifest.cameraLandmarks[Number(key) - 1].id);
      if (key === '9') selectFixedView('courtyard-stair');
      if (key === '0') selectFixedView('aerial-orbit');
      if (key === 'h') selectFixedView('great-hall');
      if (key === 'i') selectFixedView('station-hall');
      if (key === 'n') toggleTimeOfDay();
      if (key === 'm') toggleAudio();
      if (key === ' ' && modeRef.current === 'tour') {
        event.preventDefault();
        toggleTourPause();
      }
    };
    window.addEventListener('keydown', shortcuts);
    return () => window.removeEventListener('keydown', shortcuts);
  }, [manifest.cameraLandmarks, randomSeed, selectFixedView, selectMode, selectScene, toggleAudio, toggleAutoRotate, toggleTimeOfDay, toggleTourPause]);

  const auditGeometryStable = soakAudit.finalGeometries !== null && Math.abs(soakAudit.baselineGeometries - soakAudit.finalGeometries) <= 1;
  const auditHeapStable = soakAudit.finalHeapMb === null || soakAudit.baselineHeapMb === null || soakAudit.finalHeapMb <= soakAudit.baselineHeapMb + Math.max(8, soakAudit.baselineHeapMb * 0.15);
  const rebuildLocked = generationStatus === 'building' || soakAudit.running;
  const stationQuest = getStationQuest(manifest.seedHash);
  const stationQuestStep = stationQuestState.manifestHash === manifest.manifestHash ? stationQuestState.step : 'sealed';
  const stationQuestCopy = getStationQuestCopy(stationQuestStep, stationQuest);
  const stationJourneyActive = stationQuestStep === 'stamped' || stationQuestStep === 'arrived' || stationQuestStep === 'complete';
  const progressStationQuest = () => {
    const nextStep = advanceStationQuest(stationQuestStep);
    setStationQuestState({ manifestHash: manifest.manifestHash, step: nextStep });
    audioSystemRef.current?.playStationCue(nextStep);
    if (stationQuestStep === 'stamped') selectScene(stationQuest.landmarkId);
  };

  return (
    <main className={`experience-shell ${entered ? 'is-entered' : ''} ${timeOfDay === 'day' ? 'is-day' : 'is-night'}`}>
      <div ref={mountRef} className={`world-canvas ${postEnabled && gradeEnabled ? '' : 'no-grade'}`} aria-label="Procedurally generated moonlit wizarding world" tabIndex={entered ? 0 : -1} />
      <div className="atmosphere" aria-hidden="true" />
      <div className="edge-runes" aria-hidden="true">✦　·　✧　·　✦</div>
      <header className="topbar">
        <a className="brand" href="#world" aria-label="The Nocturne Atlas home">
          <span className="brand-mark">N</span>
          <span><strong>The Nocturne Atlas</strong><small>Procedural arcane realms</small></span>
        </a>
        <div className="top-actions">
          {entered && <button className="perf-button" onClick={() => setSeedPanelOpen((open) => !open)} aria-expanded={seedPanelOpen}>{seedPanelOpen ? 'Close seed' : 'Seed'}</button>}
          <button className={`time-toggle sound-toggle ${audioEnabled ? 'is-on' : ''}`} onClick={toggleAudio} aria-label={`${audioEnabled ? 'Mute' : 'Enable'} procedural soundscape`} aria-pressed={audioEnabled}><span aria-hidden="true">{audioEnabled ? '◉' : '○'}</span>{audioEnabled ? 'Mute' : 'Sound'}</button>
          <button className={`time-toggle is-${timeOfDay}`} onClick={toggleTimeOfDay} aria-label={`Switch to ${timeOfDay === 'night' ? 'day' : 'night'}`} aria-pressed={timeOfDay === 'day'}><span aria-hidden="true">{timeOfDay === 'night' ? '☼' : '☾'}</span>{timeOfDay === 'night' ? 'Day' : 'Night'}</button>
          <button className="perf-button" onClick={() => setHudOpen((open) => !open)} aria-expanded={hudOpen}>HUD</button>
          <div className={`status-pill is-${generationStatus}`}><span /> {generationStatus === 'building' ? 'Weaving world' : generationStatus === 'error' ? 'World retained' : 'World online'}</div>
        </div>
      </header>
      <section className="hero-copy" id="world" aria-hidden={entered}>
        <p className="eyebrow">Atlas entry · 001</p>
        <h1>A realm remembered<br />by a single word.</h1>
        <p className="intro">Every seed reveals a new gothic landscape—castles rise, forests gather, and moonlight finds the water.</p>
      </section>
      <section className={`seed-card ${entered && !seedPanelOpen ? 'is-collapsed' : ''}`} aria-label="World seed controls" aria-hidden={entered && !seedPanelOpen}>
        <label htmlFor="seed">World seed</label>
        <div className="seed-row">
          <input id="seed" value={seed} onChange={(event) => setSeed(event.target.value.toUpperCase())} onKeyDown={(event) => event.key === 'Enter' && (entered ? regenerate() : enterRealm())} spellCheck={false} disabled={rebuildLocked} />
          <button type="button" onClick={entered ? regenerate : enterRealm} aria-label={entered ? 'Rebuild world from seed' : 'Enter the generated world'} disabled={rebuildLocked}>{entered ? 'Rebuild realm' : 'Enter realm'} <span>↗</span></button>
        </div>
        <div className="seed-meta"><span>Active · {activeSeed}</span><span><button onClick={randomSeed} disabled={rebuildLocked}>Randomize</button><i>·</i><button onClick={copySeed}>{copied ? 'Copied' : 'Copy seed'}</button></span></div>
        {generationError && <p className="generation-error" role="alert">The previous world remains active. {generationError}</p>}
      </section>
      {entered && (fixedView?.id === 'station-hall' || stationJourneyActive) && <aside className={`station-interaction is-${stationQuestStep}`} aria-live="polite">
        <p>{stationJourneyActive ? 'Courier route' : 'Veilcross quest'} · {stationQuestCopy.progress}</p>
        <h2>{stationJourneyActive ? 'Beyond the midnight line' : 'The unlisted departure'}</h2>
        <strong>{stationQuest.destination}</strong>
        <p>{stationQuestCopy.body}</p>
        {stationQuestCopy.action ? <button type="button" onClick={progressStationQuest}>{stationQuestCopy.action}</button> : <span className="quest-complete">Route complete</span>}
      </aside>}
      <aside className={`performance-hud ${hudOpen ? 'is-open' : ''}`} aria-hidden={!hudOpen}>
        <header><span>Field diagnostics</span><button onClick={() => setHudOpen(false)}>×</button></header>
        <dl><div><dt>Frame rate</dt><dd>{stats.fps} <small>FPS · {stats.frameMs}MS</small></dd></div><div><dt>Draw calls</dt><dd>{stats.calls}</dd></div><div><dt>Triangles</dt><dd>{Math.round(stats.triangles / 1000)}k</dd></div><div><dt>Points / lines</dt><dd>{stats.points}P · {stats.lines}L</dd></div><div><dt>GPU resources</dt><dd>{stats.geometries}G · {stats.textures}T</dd></div><div><dt>Streamed zones</dt><dd>{stats.activeChunks}/{stats.totalChunks}</dd></div><div><dt>JS heap</dt><dd>{stats.heapMb === null ? 'N/A' : `${stats.heapMb} MB`}</dd></div><div><dt>Generation</dt><dd>{stats.generationMs} <small>MS</small></dd></div><div><dt>Last disposal</dt><dd>{stats.disposedGeometries}G · {stats.disposedMaterials}M</dd></div><div><dt>Castle graph</dt><dd>{manifest.castleGraph.nodes.length}N · {manifest.castleGraph.edges.length}E</dd></div><div><dt>Manifest</dt><dd>{manifest.manifestHash}</dd></div></dl>
        <section className="quality-controls">
          <label>Quality tier</label>
          <div>{(['low', 'medium', 'high'] as QualityTier[]).map((tier) => <button key={tier} className={quality === tier ? 'active' : ''} onClick={() => selectQuality(tier)} disabled={rebuildLocked}>{tier}</button>)}</div>
        </section>
        <section className="effect-toggles">
          <label><span>Atmospheric fog</span><input type="checkbox" checked={fogEnabled} onChange={(event) => setFogEnabled(event.target.checked)} /></label>
          <label><span>Post-processing</span><input type="checkbox" checked={postEnabled} onChange={(event) => setPostEnabled(event.target.checked)} /></label>
          <label><span>Color grade</span><input type="checkbox" checked={gradeEnabled && postEnabled} disabled={!postEnabled} onChange={(event) => setGradeEnabled(event.target.checked)} /></label>
          <label><span>HDR Bloom</span><input type="checkbox" checked={bloomEnabled && postEnabled} disabled={!postEnabled} onChange={(event) => setBloomEnabled(event.target.checked)} /></label>
          <label><span>Vignette</span><input type="checkbox" checked={vignetteEnabled && postEnabled} disabled={!postEnabled} onChange={(event) => setVignetteEnabled(event.target.checked)} /></label>
          <label><span>SSAO {quality === 'low' ? '· Medium+' : ''}</span><input type="checkbox" checked={aoEnabled && postEnabled && quality !== 'low'} disabled={!postEnabled || quality === 'low'} onChange={(event) => setAoEnabled(event.target.checked)} /></label>
          <label><span>Dynamic shadows</span><input type="checkbox" checked={shadowsEnabled} onChange={(event) => setShadowsEnabled(event.target.checked)} /></label>
          <label><span>Zone boundaries</span><input type="checkbox" checked={zoneDebugEnabled} onChange={(event) => setZoneDebugEnabled(event.target.checked)} /></label>
          <label><span>Reduced camera motion</span><input type="checkbox" checked={reducedMotion} onChange={(event) => setReducedMotion(event.target.checked)} /></label>
          <label><span>Ambient animation</span><input type="checkbox" checked={!ambientPaused} onChange={(event) => setAmbientPaused(!event.target.checked)} /></label>
          <label><span>Distance streaming</span><input type="checkbox" checked={streamingEnabled} onChange={(event) => toggleWorldStreaming(event.target.checked)} /></label>
        </section>
        <section className="diagnostic-sliders">
          <div className="water-control"><label htmlFor="fog-density"><span>Fog density</span><output>{fogDensity.toFixed(1)}×</output></label><input id="fog-density" type="range" min="0.25" max="1.75" step="0.05" value={fogDensity} onChange={(event) => setFogDensity(Number(event.target.value))} /></div>
          <div className="water-control"><label htmlFor="bloom-strength"><span>Bloom strength</span><output>{bloomStrength.toFixed(1)}×</output></label><input id="bloom-strength" type="range" min="0" max="1.8" step="0.1" value={bloomStrength} onChange={(event) => setBloomStrength(Number(event.target.value))} /></div>
          <div className="water-control"><label htmlFor="water-motion"><span>Water motion</span><output>{waterMotion.toFixed(1)}×</output></label><input id="water-motion" type="range" min="0" max="1.6" step="0.1" value={waterMotion} onChange={(event) => setWaterMotion(Number(event.target.value))} /></div>
        </section>
        <p>Generator {manifest.generatorVersion} · {manifest.counts.trees} trees<br />LOD {manifest.forestLod.nearTrees} near / {manifest.forestLod.farTrees} far · Seed {manifest.seedHash}</p>
        <button className="soak-audit" onClick={runSoakAudit} disabled={soakAudit.running}>{soakAudit.running ? `Rebuild audit ${soakAudit.completed}/${soakAudit.total}` : soakAudit.finalGeometries === null ? 'Run 20× rebuild audit' : `${auditGeometryStable && auditHeapStable ? 'Audit clean' : 'Audit review'} · ${soakAudit.baselineGeometries}→${soakAudit.finalGeometries} geometries`}</button>
        {soakAudit.finalHeapMb !== null && <p className="audit-heap">Heap sample · {soakAudit.baselineHeapMb ?? 'N/A'}→{soakAudit.finalHeapMb} MB</p>}
        <button className="manifest-copy" onClick={copyManifest}>{manifestCopied ? 'Manifest copied' : 'Copy world manifest'}</button>
      </aside>
      {entered && <nav className="scene-switcher" aria-label="Scene selection"><span>Jump to</span>{manifest.cameraLandmarks.map((landmark, index) => <button key={landmark.id} className={!fixedView && tourLocation.id === landmark.id && (mode === 'tour' || mode === 'orbit') ? 'active' : ''} onClick={() => selectScene(landmark.id)} aria-label={`Go to ${landmark.label}`}><kbd>{index + 1}</kbd>{SCENE_LABELS[landmark.id]}</button>)}{manifest.validationViews.filter((view) => view.id === 'courtyard-stair' || view.id === 'aerial-orbit' || view.id === 'great-hall' || view.id === 'station-hall').map((view) => <button key={view.id} className={fixedView?.id === view.id ? 'active' : ''} onClick={() => selectFixedView(view.id)} aria-label={`Go to ${view.label}`}><kbd>{FIXED_SCENE_SHORTCUTS[view.id]}</kbd>{FIXED_SCENE_LABELS[view.id]}</button>)}</nav>}
      <footer className="scene-footer">
        <div className="landmark-caption"><span>{fixedView ? 'V' : mode === 'tour' ? String(manifest.cameraLandmarks.findIndex((landmark) => landmark.id === tourLocation.id) + 1).padStart(2, '0') : mode === 'walk' ? 'G' : mode === 'fly' ? 'F' : 'O'}</span><p><strong>{fixedView ? fixedView.label : mode === 'tour' ? tourLocation.label : mode === 'walk' ? 'Ground walk' : mode === 'fly' ? 'Free flight' : `${tourLocation.label} orbit`}</strong><small>{fixedView ? fixedView.subtitle : mode === 'tour' ? tourLocation.subtitle : mode === 'walk' ? 'Terrain-bound collision navigation' : mode === 'fly' ? 'Manual navigation' : 'Drag to inspect · Auto resumes on release'}</small></p>{mode === 'tour' && <button className="tour-pause" onClick={toggleTourPause}>{tourPaused ? 'Resume' : 'Pause'}</button>}</div>
        <nav className="camera-modes" aria-label="Camera mode">
          <button className={mode === 'tour' ? 'active' : ''} onClick={() => selectMode('tour')}><kbd>T</kbd> Tour</button>
          <button className={mode === 'walk' ? 'active' : ''} onClick={() => selectMode('walk')}><kbd>G</kbd> Walk</button>
          <button className={mode === 'fly' ? 'active' : ''} onClick={() => selectMode('fly')}><kbd>F</kbd> Free fly</button>
          <button className={mode === 'orbit' ? 'active' : ''} onClick={() => selectMode('orbit')}><kbd>O</kbd> Orbit</button>
          <button className={autoRotate ? 'active' : ''} onClick={toggleAutoRotate} aria-label={`${autoRotate ? 'Stop' : 'Start'} automatic orbit rotation`} aria-pressed={autoRotate}><kbd>A</kbd> Auto</button>
        </nav>
        <p className="coordinates">{mode === 'walk' ? 'WASD · SHIFT · CLICK TO LOOK' : mode === 'fly' ? 'WASD · Q/E · SHIFT' : mode === 'orbit' ? `${autoRotate ? 'AUTO · ' : ''}DRAG · SCROLL/PINCH` : `SPACE · ${tourPaused ? 'RESUME' : 'PAUSE'} TOUR`}<br />A · AUTO ROTATE · R · NEW WORLD</p>
      </footer>
    </main>
  );
}
