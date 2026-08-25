'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { SSAOPass } from 'three/addons/postprocessing/SSAOPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { CameraManager, type CameraMode, type FixedView, type LandmarkId } from './camera-manager';
import { EnvironmentSystem, type TimeOfDay } from './environment-system';
import { createRoofMaterial, createStoneMaterial, createTerrainMaterial, createWoodMaterial } from './procedural-materials';
import { ResourceRegistry } from './resource-registry';
import { createWorldManifest, hashSeed, mulberry32, terrainHeight, validateWorldManifest, type QualityTier, type WorldManifest } from './world-core';

const DEFAULT_SEED = 'MAGIC-001';
const SCENE_LABELS: Record<LandmarkId, string> = {
  castle: 'Castle',
  village: 'Village',
  lake: 'Lake',
  forest: 'Forest',
  tower: 'Tower',
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

function createWorld(seedText: string, quality: QualityTier) {
  const manifest = createWorldManifest(seedText, quality);
  const validation = validateWorldManifest(manifest);
  if (!validation.ok) throw new Error(`World manifest rejected: ${validation.errors.join(' ')}`);
  const seed = manifest.seedHash;
  const random = mulberry32(hashSeed(`${manifest.seed}::world`));
  const root = new THREE.Group();
  root.name = `world-${seedText}`;

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
  }
  const starGeometry = new THREE.BufferGeometry();
  starGeometry.setAttribute('position', new THREE.BufferAttribute(starPositions, 3));
  const starMaterial = new THREE.PointsMaterial({ color: 0xbfcbe2, size: quality === 'high' ? 0.28 : 0.34, transparent: true, opacity: 0.72, depthWrite: false, fog: false });
  const stars = new THREE.Points(starGeometry, starMaterial);
  root.add(stars);

  const terrainGeometry = new THREE.PlaneGeometry(150, 150, 96, 96);
  terrainGeometry.rotateX(-Math.PI / 2);
  const positions = terrainGeometry.attributes.position;
  for (let i = 0; i < positions.count; i += 1) {
    const x = positions.getX(i);
    const z = positions.getZ(i);
    positions.setY(i, terrainHeight(x, z, seed));
  }
  terrainGeometry.computeVertexNormals();
  const terrain = new THREE.Mesh(
    terrainGeometry,
    createTerrainMaterial(seed),
  );
  terrain.receiveShadow = true;
  root.add(terrain);

  const stone = createStoneMaterial(seed);
  const roof = createRoofMaterial(seed);
  const windowMaterial = new THREE.MeshBasicMaterial({ color: new THREE.Color().setRGB(3.2, 1.2, 0.28), toneMapped: false });
  const castle = new THREE.Group();
  castle.position.set(-7, terrainHeight(-7, -4, seed) + 0.2, -4);
  root.add(castle);

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
      const window = new THREE.Mesh(new THREE.PlaneGeometry(0.7, 1.25), windowMaterial);
      window.position.set(Math.sin(angle) * (radius + 0.01), 3.2 + floor * 4.2, Math.cos(angle) * (radius + 0.01));
      window.lookAt(0, window.position.y, 0);
      tower.add(window);
    }
    castle.add(tower);
  };

  manifest.castleGraph.nodes
    .filter((node) => node.type === 'tower')
    .forEach((node, index) => addTower(node.position[0], node.position[2], node.radius, node.height, [0.4, 1.4, 0.8, 1.9][index]));

  const hall = new THREE.Mesh(new THREE.BoxGeometry(17, 9, 10), stone);
  hall.position.set(-1, 4.5, 0);
  hall.castShadow = true;
  hall.receiveShadow = true;
  castle.add(hall);
  const hallRoof = new THREE.Mesh(new THREE.ConeGeometry(8.7, 7, 4), roof);
  hallRoof.rotation.y = Math.PI / 4;
  hallRoof.scale.z = 0.72;
  hallRoof.position.set(-1, 12.2, 0);
  hallRoof.castShadow = true;
  castle.add(hallRoof);

  for (let x = -7; x <= 5; x += 3) {
    const glowingWindow = new THREE.Mesh(new THREE.PlaneGeometry(1.15, 2), windowMaterial);
    glowingWindow.position.set(x, 5, 5.01);
    castle.add(glowingWindow);
  }

  const bridge = new THREE.Mesh(new THREE.BoxGeometry(12, 0.8, 2), stone);
  bridge.position.set(-8, 10, 3.6);
  bridge.rotation.z = -0.18;
  bridge.castShadow = true;
  castle.add(bridge);

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
  }
  shoreRocks.castShadow = true;
  shoreRocks.receiveShadow = true;
  root.add(shoreRocks);

  const reedGeometry = new THREE.ConeGeometry(0.055, 1, 5);
  const reedMaterial = new THREE.MeshStandardMaterial({ color: 0x344b35, roughness: 0.92 });
  const reeds = new THREE.InstancedMesh(reedGeometry, reedMaterial, manifest.counts.reeds);
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
  }
  root.add(reeds);

  const island = new THREE.Mesh(new THREE.CylinderGeometry(4.3, 5.8, 1.5, 32), createTerrainMaterial(hashSeed(`${manifest.seed}::lake/island`)));
  island.position.set(34, -1.72, 13.5);
  island.rotation.y = shorelineRandom() * Math.PI;
  island.receiveShadow = true;
  root.add(island);

  const nearTrunkGeometry = new THREE.CylinderGeometry(0.22, 0.42, 3.5, 6);
  const farTrunkGeometry = new THREE.CylinderGeometry(0.22, 0.42, 3.5, 4);
  const trunkMaterial = createWoodMaterial(hashSeed(`${manifest.seed}::forest/wood`));
  const nearTrunks = new THREE.InstancedMesh(nearTrunkGeometry, trunkMaterial, manifest.forestLod.nearTrees);
  const farTrunks = new THREE.InstancedMesh(farTrunkGeometry, trunkMaterial, manifest.forestLod.farTrees);
  const nearCanopyGeometry = new THREE.ConeGeometry(1.5, 5.2, 7);
  const farCanopyGeometry = new THREE.ConeGeometry(1.5, 5.2, 4);
  const canopyMaterial = new THREE.MeshStandardMaterial({ color: 0x111c18, roughness: 0.94 });
  const nearCanopies = new THREE.InstancedMesh(nearCanopyGeometry, canopyMaterial, manifest.forestLod.nearTrees);
  const farCanopies = new THREE.InstancedMesh(farCanopyGeometry, canopyMaterial, manifest.forestLod.farTrees);
  const matrix = new THREE.Matrix4();
  const quaternion = new THREE.Quaternion();
  const treeUp = new THREE.Vector3(0, 1, 0);
  const scale = new THREE.Vector3();
  const position = new THREE.Vector3();
  let nearTreeIndex = 0;
  let farTreeIndex = 0;
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
      if ((x - 28) ** 2 + (z - 18) ** 2 >= 1050 && (x + 7) ** 2 + (z + 4) ** 2 >= 800) {
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
    quaternion.setFromAxisAngle(treeUp, random() * Math.PI * 2);
    position.set(x, y + (3.5 * treeScale) / 2, z);
    scale.set(treeScale, treeScale, treeScale);
    matrix.compose(position, quaternion, scale);
    const trunkBatch = isNearTree ? nearTrunks : farTrunks;
    const canopyBatch = isNearTree ? nearCanopies : farCanopies;
    const batchIndex = isNearTree ? nearTreeIndex : farTreeIndex;
    trunkBatch.setMatrixAt(batchIndex, matrix);
    position.y = y + 3.5 * treeScale + 2.2 * treeScale;
    matrix.compose(position, quaternion, scale);
    canopyBatch.setMatrixAt(batchIndex, matrix);
    if (isNearTree) nearTreeIndex += 1;
    else farTreeIndex += 1;
  }
  const treeBatches = [nearTrunks, nearCanopies, farTrunks, farCanopies];
  treeBatches.forEach((batch) => {
    batch.instanceMatrix.needsUpdate = true;
    batch.computeBoundingSphere();
  });
  nearTrunks.castShadow = quality !== 'low';
  nearCanopies.castShadow = quality !== 'low';
  farTrunks.castShadow = false;
  farCanopies.castShadow = false;
  nearTrunks.name = 'forest-near-trunks';
  nearCanopies.name = 'forest-near-canopies';
  farTrunks.name = 'forest-far-trunks';
  farCanopies.name = 'forest-far-canopies';
  root.add(...treeBatches);

  const fireflyGeometry = new THREE.SphereGeometry(0.08, 5, 5);
  const fireflyMaterial = new THREE.MeshBasicMaterial({ color: new THREE.Color().setRGB(0.7, 2.4, 0.8), toneMapped: false });
  const fireflies = new THREE.InstancedMesh(fireflyGeometry, fireflyMaterial, manifest.counts.fireflies);
  for (let i = 0; i < manifest.counts.fireflies; i += 1) {
    const x = -50 + random() * 100;
    const z = -50 + random() * 100;
    const y = terrainHeight(x, z, seed) + 1.5 + random() * 5;
    matrix.makeTranslation(x, y, z);
    fireflies.setMatrixAt(i, matrix);
  }
  root.add(fireflies);

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

  const village = new THREE.Group();
  village.name = 'village-of-lumen-row';
  root.add(village);
  const houseGeometry = new THREE.BoxGeometry(1, 1, 1);
  const plaster = new THREE.MeshStandardMaterial({ color: 0x544b43, roughness: 0.9 });
  const timber = createWoodMaterial(hashSeed(`${manifest.seed}::village/wood`));
  const villageRoof = new THREE.ConeGeometry(1, 1, 4);
  const roadMaterial = new THREE.MeshStandardMaterial({ color: 0x242321, roughness: 1 });
  const road = new THREE.Mesh(new THREE.PlaneGeometry(41, 4.2, 10, 1), roadMaterial);
  road.rotation.x = -Math.PI / 2;
  road.rotation.z = -0.14;
  road.position.set(-31, terrainHeight(-31, 13, seed) + 0.12, 13);
  road.receiveShadow = true;
  village.add(road);
  manifest.villageBuildings.forEach((building, index) => {
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
    const litWindow = new THREE.Mesh(new THREE.PlaneGeometry(0.55, 0.8), windowMaterial);
    litWindow.position.set(0, height * 0.55, side < 0 ? depth / 2 + 0.01 : -depth / 2 - 0.01);
    litWindow.rotation.y = side < 0 ? 0 : Math.PI;
    house.add(litWindow);
    village.add(house);
  });

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
  }
  candleRoot.add(wax, flames);
  root.add(candleRoot);

  const celestialMaterial = new THREE.MeshBasicMaterial({ color: new THREE.Color().setRGB(1.25, 1.4, 2.1), toneMapped: false });
  const moon = new THREE.Mesh(new THREE.SphereGeometry(4.3, 32, 32), celestialMaterial);
  moon.position.set(-52, 44, -62);
  root.add(moon);

  const zoneDebug = new THREE.Group();
  zoneDebug.name = 'zone-debug';
  const zoneColors = { castle: 0xe6b45f, village: 0xd78865, forest: 0x67ae88, lake: 0x65a7d7 };
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

  return { root, waterMaterial, magicMaterial, stairRoot, stairTargets, candleRoot, zoneDebug, starMaterial, celestialOrb: moon, celestialMaterial, manifest, validation };
}

export default function Home() {
  const mountRef = useRef<HTMLDivElement>(null);
  const seedRef = useRef(DEFAULT_SEED);
  const modeRef = useRef<CameraMode>('tour');
  const qualityRef = useRef<QualityTier>('medium');
  const fogRef = useRef(true);
  const postRef = useRef(true);
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
  const sceneRequestRef = useRef<LandmarkId | null>(null);
  const fixedPoseRef = useRef<FixedView | null>(null);
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
  const [fixedView, setFixedView] = useState<FixedView | null>(null);
  const [generationStatus, setGenerationStatus] = useState<'ready' | 'building' | 'error'>('ready');
  const [generationError, setGenerationError] = useState<string | null>(null);
  const [stats, setStats] = useState<PerformanceStats>({ fps: 60, frameMs: 16.7, calls: 0, triangles: 0, points: 0, lines: 0, geometries: 0, textures: 0, heapMb: null, generationMs: 0, disposedGeometries: 0, disposedMaterials: 0 });
  const [soakAudit, setSoakAudit] = useState<SoakAudit>({ running: false, completed: 0, total: 20, baselineGeometries: 0, finalGeometries: null, baselineHeapMb: null, finalHeapMb: null });
  const [hudOpen, setHudOpen] = useState(false);

  useEffect(() => { seedRef.current = activeSeed; }, [activeSeed]);
  useEffect(() => { modeRef.current = mode; }, [mode]);
  useEffect(() => { qualityRef.current = quality; }, [quality]);
  useEffect(() => { fogRef.current = fogEnabled; }, [fogEnabled]);
  useEffect(() => { postRef.current = postEnabled; }, [postEnabled]);
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
    const outputPass = new OutputPass();
    composer.addPass(renderPass);
    composer.addPass(ssaoPass);
    composer.addPass(bloomPass);
    composer.addPass(outputPass);

    const initialGenerationStarted = performance.now();
    let world = createWorld(seedRef.current, qualityRef.current);
    let lastGenerationMs = performance.now() - initialGenerationStarted;
    let lastDisposal = { geometries: 0, materials: 0 };
    scene.add(world.root);
    const cameraManager = new CameraManager(camera, renderer.domElement, world.manifest);
    const startedAt = performance.now();
    let frame = 0;
    let rebuildRequested = false;
    let animationTime = 0;
    let soakRemaining = 0;
    let soakCompleted = 0;
    let soakBaselineGeometries = 0;
    let soakBaselineHeapMb: number | null = null;
    let soakFinalSampleFrames = 0;
    let contextAvailable = true;
    let previousElapsed = 0;
    let framesSinceSample = 0;
    let sampleStarted = 0;
    const rebuild = () => { rebuildRequested = true; };
    const runSoak = () => {
      if (soakRemaining > 0) return;
      soakRemaining = 20;
      soakCompleted = 0;
      soakBaselineGeometries = renderer.info.memory.geometries;
      soakBaselineHeapMb = readHeapMb();
      setSoakAudit({ running: true, completed: 0, total: 20, baselineGeometries: soakBaselineGeometries, finalGeometries: null, baselineHeapMb: soakBaselineHeapMb, finalHeapMb: null });
      setGenerationStatus('building');
      rebuildRequested = true;
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
      rebuildRequested = true;
    };
    renderer.domElement.addEventListener('webglcontextlost', onContextLost);
    renderer.domElement.addEventListener('webglcontextrestored', onContextRestored);

    const render = () => {
      frame = requestAnimationFrame(render);
      const elapsed = (performance.now() - startedAt) / 1000;
      const delta = Math.min(0.05, elapsed - previousElapsed);
      previousElapsed = elapsed;
      if (!contextAvailable) return;
      if (!ambientPausedRef.current) animationTime += delta;
      if (rebuildRequested) {
        rebuildRequested = false;
        try {
          const generationStarted = performance.now();
          const nextWorld = createWorld(seedRef.current, qualityRef.current);
          lastGenerationMs = performance.now() - generationStarted;
          const previousWorld = world;
          scene.add(nextWorld.root);
          world = nextWorld;
          if (fixedPoseRef.current) {
            const updatedFixedView = world.manifest.validationViews.find((view) => view.id === fixedPoseRef.current?.id) ?? null;
            fixedPoseRef.current = updatedFixedView;
            setFixedView(updatedFixedView);
          }
          cameraManager.setManifest(world.manifest);
          scene.remove(previousWorld.root);
          lastDisposal = disposeObject(previousWorld.root);
          renderer.setPixelRatio(Math.min(window.devicePixelRatio, renderScale()));
          renderer.setSize(mount.clientWidth, mount.clientHeight);
          composer.setPixelRatio(renderer.getPixelRatio());
          composer.setSize(mount.clientWidth, mount.clientHeight);
          setManifest(world.manifest);
          setGenerationError(null);
          if (soakRemaining > 0) {
            soakRemaining -= 1;
            soakCompleted += 1;
            const running = soakRemaining > 0;
            if (!running) soakFinalSampleFrames = 2;
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
            if (running) rebuildRequested = true;
          } else {
            setGenerationStatus('ready');
          }
        } catch (error) {
          soakRemaining = 0;
          setSoakAudit((audit) => ({ ...audit, running: false, finalGeometries: renderer.info.memory.geometries, finalHeapMb: readHeapMb() }));
          setGenerationError(error instanceof Error ? error.message : 'World generation failed.');
          setGenerationStatus('error');
        }
      }
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
      renderer.info.reset();
      if (postRef.current) composer.render(delta);
      else renderer.render(scene, camera);

      if (soakFinalSampleFrames > 0) {
        soakFinalSampleFrames -= 1;
        if (soakFinalSampleFrames === 0) {
          setSoakAudit({
            running: false,
            completed: soakCompleted,
            total: 20,
            baselineGeometries: soakBaselineGeometries,
            finalGeometries: renderer.info.memory.geometries,
            baselineHeapMb: soakBaselineHeapMb,
            finalHeapMb: readHeapMb(),
          });
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
    };
    window.addEventListener('resize', resize);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('resize', resize);
      window.removeEventListener('wizard-rebuild', rebuild);
      window.removeEventListener('wizard-soak', runSoak);
      renderer.domElement.removeEventListener('webglcontextlost', onContextLost);
      renderer.domElement.removeEventListener('webglcontextrestored', onContextRestored);
      disposeObject(world.root);
      cameraManager.dispose();
      environment.dispose();
      scene.clear();
      composer.dispose();
      renderer.dispose();
      renderer.domElement.remove();
    };
  }, []);

  const regenerate = useCallback(() => {
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
    if (nextQuality === qualityRef.current) return;
    qualityRef.current = nextQuality;
    setQuality(nextQuality);
    setGenerationError(null);
    setGenerationStatus('building');
    window.dispatchEvent(new Event('wizard-rebuild'));
  }, []);

  const runSoakAudit = useCallback(() => {
    if (soakAudit.running) return;
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
    if (nextMode !== 'fly' && document.pointerLockElement) document.exitPointerLock();
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
      return next;
    });
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
      if (key === 'f') selectMode('fly');
      if (key === 'o') selectMode('orbit');
      if (key === 'a') toggleAutoRotate();
      if (key === 'r') randomSeed();
      if (key >= '1' && key <= '5') selectScene(manifest.cameraLandmarks[Number(key) - 1].id);
      if (key === '6') selectFixedView('courtyard-stair');
      if (key === '7') selectFixedView('aerial-orbit');
      if (key === 'n') toggleTimeOfDay();
      if (key === ' ' && modeRef.current === 'tour') {
        event.preventDefault();
        toggleTourPause();
      }
    };
    window.addEventListener('keydown', shortcuts);
    return () => window.removeEventListener('keydown', shortcuts);
  }, [manifest.cameraLandmarks, randomSeed, selectFixedView, selectMode, selectScene, toggleAutoRotate, toggleTimeOfDay, toggleTourPause]);

  return (
    <main className={`experience-shell ${entered ? 'is-entered' : ''} ${timeOfDay === 'day' ? 'is-day' : 'is-night'}`}>
      <div ref={mountRef} className={`world-canvas ${postEnabled ? '' : 'no-post'}`} aria-label="Procedurally generated moonlit wizarding world" tabIndex={entered ? 0 : -1} />
      <div className="atmosphere" aria-hidden="true" />
      <div className="edge-runes" aria-hidden="true">✦　·　✧　·　✦</div>
      <header className="topbar">
        <a className="brand" href="#world" aria-label="The Nocturne Atlas home">
          <span className="brand-mark">N</span>
          <span><strong>The Nocturne Atlas</strong><small>Procedural arcane realms</small></span>
        </a>
        <div className="top-actions">
          {entered && <button className="perf-button" onClick={() => setSeedPanelOpen((open) => !open)} aria-expanded={seedPanelOpen}>{seedPanelOpen ? 'Close seed' : 'Seed'}</button>}
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
          <input id="seed" value={seed} onChange={(event) => setSeed(event.target.value.toUpperCase())} onKeyDown={(event) => event.key === 'Enter' && (entered ? regenerate() : enterRealm())} spellCheck={false} />
          <button type="button" onClick={entered ? regenerate : enterRealm} aria-label={entered ? 'Rebuild world from seed' : 'Enter the generated world'}>{entered ? 'Rebuild realm' : 'Enter realm'} <span>↗</span></button>
        </div>
        <div className="seed-meta"><span>Active · {activeSeed}</span><span><button onClick={randomSeed}>Randomize</button><i>·</i><button onClick={copySeed}>{copied ? 'Copied' : 'Copy seed'}</button></span></div>
        {generationError && <p className="generation-error" role="alert">The previous world remains active. {generationError}</p>}
      </section>
      <aside className={`performance-hud ${hudOpen ? 'is-open' : ''}`} aria-hidden={!hudOpen}>
        <header><span>Field diagnostics</span><button onClick={() => setHudOpen(false)}>×</button></header>
        <dl><div><dt>Frame rate</dt><dd>{stats.fps} <small>FPS · {stats.frameMs}MS</small></dd></div><div><dt>Draw calls</dt><dd>{stats.calls}</dd></div><div><dt>Triangles</dt><dd>{Math.round(stats.triangles / 1000)}k</dd></div><div><dt>Points / lines</dt><dd>{stats.points}P · {stats.lines}L</dd></div><div><dt>GPU resources</dt><dd>{stats.geometries}G · {stats.textures}T</dd></div><div><dt>JS heap</dt><dd>{stats.heapMb === null ? 'N/A' : `${stats.heapMb} MB`}</dd></div><div><dt>Generation</dt><dd>{stats.generationMs} <small>MS</small></dd></div><div><dt>Last disposal</dt><dd>{stats.disposedGeometries}G · {stats.disposedMaterials}M</dd></div><div><dt>Castle graph</dt><dd>{manifest.castleGraph.nodes.length}N · {manifest.castleGraph.edges.length}E</dd></div><div><dt>Manifest</dt><dd>{manifest.manifestHash}</dd></div></dl>
        <section className="quality-controls">
          <label>Quality tier</label>
          <div>{(['low', 'medium', 'high'] as QualityTier[]).map((tier) => <button key={tier} className={quality === tier ? 'active' : ''} onClick={() => selectQuality(tier)}>{tier}</button>)}</div>
        </section>
        <section className="effect-toggles">
          <label><span>Atmospheric fog</span><input type="checkbox" checked={fogEnabled} onChange={(event) => setFogEnabled(event.target.checked)} /></label>
          <label><span>Cinematic grade</span><input type="checkbox" checked={postEnabled} onChange={(event) => setPostEnabled(event.target.checked)} /></label>
          <label><span>SSAO {quality === 'low' ? '· Medium+' : ''}</span><input type="checkbox" checked={aoEnabled && quality !== 'low'} disabled={quality === 'low'} onChange={(event) => setAoEnabled(event.target.checked)} /></label>
          <label><span>Dynamic shadows</span><input type="checkbox" checked={shadowsEnabled} onChange={(event) => setShadowsEnabled(event.target.checked)} /></label>
          <label><span>Zone boundaries</span><input type="checkbox" checked={zoneDebugEnabled} onChange={(event) => setZoneDebugEnabled(event.target.checked)} /></label>
          <label><span>Reduced camera motion</span><input type="checkbox" checked={reducedMotion} onChange={(event) => setReducedMotion(event.target.checked)} /></label>
          <label><span>Ambient animation</span><input type="checkbox" checked={!ambientPaused} onChange={(event) => setAmbientPaused(!event.target.checked)} /></label>
        </section>
        <section className="diagnostic-sliders">
          <div className="water-control"><label htmlFor="fog-density"><span>Fog density</span><output>{fogDensity.toFixed(1)}×</output></label><input id="fog-density" type="range" min="0.25" max="1.75" step="0.05" value={fogDensity} onChange={(event) => setFogDensity(Number(event.target.value))} /></div>
          <div className="water-control"><label htmlFor="bloom-strength"><span>Bloom strength</span><output>{bloomStrength.toFixed(1)}×</output></label><input id="bloom-strength" type="range" min="0" max="1.8" step="0.1" value={bloomStrength} onChange={(event) => setBloomStrength(Number(event.target.value))} /></div>
          <div className="water-control"><label htmlFor="water-motion"><span>Water motion</span><output>{waterMotion.toFixed(1)}×</output></label><input id="water-motion" type="range" min="0" max="1.6" step="0.1" value={waterMotion} onChange={(event) => setWaterMotion(Number(event.target.value))} /></div>
        </section>
        <p>Generator {manifest.generatorVersion} · {manifest.counts.trees} trees<br />LOD {manifest.forestLod.nearTrees} near / {manifest.forestLod.farTrees} far · Seed {manifest.seedHash}</p>
        <button className="soak-audit" onClick={runSoakAudit} disabled={soakAudit.running}>{soakAudit.running ? `Rebuild audit ${soakAudit.completed}/${soakAudit.total}` : soakAudit.finalGeometries === null ? 'Run 20× rebuild audit' : `${Math.abs(soakAudit.baselineGeometries - soakAudit.finalGeometries) <= 1 ? 'Audit clean' : 'Audit drift'} · ${soakAudit.baselineGeometries}→${soakAudit.finalGeometries} geometries`}</button>
        {soakAudit.finalHeapMb !== null && <p className="audit-heap">Heap sample · {soakAudit.baselineHeapMb ?? 'N/A'}→{soakAudit.finalHeapMb} MB</p>}
        <button className="manifest-copy" onClick={copyManifest}>{manifestCopied ? 'Manifest copied' : 'Copy world manifest'}</button>
      </aside>
      {entered && <nav className="scene-switcher" aria-label="Scene selection"><span>Jump to</span>{manifest.cameraLandmarks.map((landmark, index) => <button key={landmark.id} className={!fixedView && tourLocation.id === landmark.id && mode === 'tour' ? 'active' : ''} onClick={() => selectScene(landmark.id)} aria-label={`Go to ${landmark.label}`}><kbd>{index + 1}</kbd>{SCENE_LABELS[landmark.id]}</button>)}{manifest.validationViews.filter((view) => view.id === 'courtyard-stair' || view.id === 'aerial-orbit').map((view, index) => <button key={view.id} className={fixedView?.id === view.id ? 'active' : ''} onClick={() => selectFixedView(view.id)} aria-label={`Go to ${view.label}`}><kbd>{index + 6}</kbd>{view.id === 'courtyard-stair' ? 'Stairs' : 'Aerial'}</button>)}</nav>}
      <footer className="scene-footer">
        <div className="landmark-caption"><span>{fixedView ? 'V' : mode === 'tour' ? String(manifest.cameraLandmarks.findIndex((landmark) => landmark.id === tourLocation.id) + 1).padStart(2, '0') : mode === 'fly' ? 'F' : 'O'}</span><p><strong>{fixedView ? fixedView.label : mode === 'tour' ? tourLocation.label : mode === 'fly' ? 'Free flight' : 'Atlas survey'}</strong><small>{fixedView ? fixedView.subtitle : mode === 'tour' ? tourLocation.subtitle : mode === 'fly' ? 'Manual navigation' : 'Orbital inspection'}</small></p>{mode === 'tour' && <button className="tour-pause" onClick={toggleTourPause}>{tourPaused ? 'Resume' : 'Pause'}</button>}</div>
        <nav className="camera-modes" aria-label="Camera mode">
          <button className={mode === 'tour' ? 'active' : ''} onClick={() => selectMode('tour')}><kbd>T</kbd> Tour</button>
          <button className={mode === 'fly' ? 'active' : ''} onClick={() => selectMode('fly')}><kbd>F</kbd> Free fly</button>
          <button className={mode === 'orbit' ? 'active' : ''} onClick={() => selectMode('orbit')}><kbd>O</kbd> Orbit</button>
          <button className={autoRotate ? 'active' : ''} onClick={toggleAutoRotate} aria-label={`${autoRotate ? 'Stop' : 'Start'} automatic orbit rotation`} aria-pressed={autoRotate}><kbd>A</kbd> Auto</button>
        </nav>
        <p className="coordinates">{mode === 'fly' ? 'WASD · Q/E · SHIFT' : mode === 'orbit' ? `${autoRotate ? 'AUTO · ' : ''}DRAG · SCROLL/PINCH` : `SPACE · ${tourPaused ? 'RESUME' : 'PAUSE'} TOUR`}<br />A · AUTO ROTATE · R · NEW WORLD</p>
      </footer>
    </main>
  );
}
