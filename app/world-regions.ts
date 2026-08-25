import * as THREE from 'three';
import { seededStream, terrainHeight, type QualityTier, type WorldManifest } from './world-core.ts';
import type { EmbellishmentMaterials } from './world-embellishments.ts';

export interface WorldRegions {
  root: THREE.Group;
  stationClockHands: THREE.Group;
  railcarRoot: THREE.Group;
}

function finalize(batch: THREE.InstancedMesh, castShadow = true) {
  batch.instanceMatrix.needsUpdate = true;
  batch.computeBoundingSphere();
  batch.castShadow = castShadow;
  batch.receiveShadow = castShadow;
  return batch;
}

function setInstance(
  batch: THREE.InstancedMesh,
  index: number,
  matrix: THREE.Matrix4,
  position: THREE.Vector3,
  quaternion: THREE.Quaternion,
  scale: THREE.Vector3,
) {
  matrix.compose(position, quaternion, scale);
  batch.setMatrixAt(index, matrix);
}

function createMountainRange(manifest: WorldManifest, quality: QualityTier, materials: EmbellishmentMaterials) {
  const root = new THREE.Group();
  root.name = 'umbravale-mountain-range';
  const random = seededStream(manifest.seed, 'regions/mountains');
  const peakCount = quality === 'low' ? 14 : quality === 'medium' ? 22 : 32;
  const peakGeometry = new THREE.ConeGeometry(1, 1, quality === 'low' ? 6 : 8);
  const capMaterial = new THREE.MeshStandardMaterial({ color: 0x8f9898, roughness: 0.96 });
  const peaks = new THREE.InstancedMesh(peakGeometry, materials.stone, peakCount);
  const caps = new THREE.InstancedMesh(peakGeometry, capMaterial, peakCount);
  peaks.name = 'umbravale-mountain-peaks';
  caps.name = 'umbravale-snow-caps';
  const matrix = new THREE.Matrix4();
  const position = new THREE.Vector3();
  const quaternion = new THREE.Quaternion();
  const scale = new THREE.Vector3();

  for (let index = 0; index < peakCount; index += 1) {
    const layer = index % 3;
    const x = -76 + (index / Math.max(1, peakCount - 1)) * 152 + (random() - 0.5) * 7;
    const z = -65 - layer * 7 + (random() - 0.5) * 4;
    const height = 17 + random() * 28 + (layer === 2 ? 8 : 0);
    const width = 7 + random() * 9;
    const ground = terrainHeight(x, z, manifest.seedHash) - 1.5;
    quaternion.setFromEuler(new THREE.Euler(0, random() * Math.PI, (random() - 0.5) * 0.08));
    position.set(x, ground + height / 2, z);
    setInstance(peaks, index, matrix, position, quaternion, scale.set(width, height, width * (0.72 + random() * 0.3)));
    const capHeight = height * (0.16 + random() * 0.08);
    position.y = ground + height - capHeight / 2 - 0.15;
    setInstance(caps, index, matrix, position, quaternion, scale.set(width * 0.2, capHeight, width * 0.2));
  }
  root.add(finalize(peaks), finalize(caps, false));

  const pass = new THREE.Group();
  pass.name = 'north-pass-gate';
  const passY = terrainHeight(-5, -61, manifest.seedHash);
  pass.position.set(-5, passY, -61);
  const pylons = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), materials.stone, 2);
  for (let index = 0; index < 2; index += 1) {
    position.set(index === 0 ? -4.2 : 4.2, 4.5, 0);
    setInstance(pylons, index, matrix, position, quaternion.identity(), scale.set(2.2, 9, 3.4));
  }
  const lintel = new THREE.Mesh(new THREE.BoxGeometry(11, 1.5, 3.4), materials.stone);
  lintel.position.y = 9.2;
  const crest = new THREE.Mesh(new THREE.ConeGeometry(2.4, 3.8, 4), materials.metal);
  crest.position.y = 11.8;
  crest.rotation.y = Math.PI / 4;
  pass.add(finalize(pylons), lintel, crest);
  root.add(pass);
  return root;
}

function createRuinsRegion(manifest: WorldManifest, quality: QualityTier, materials: EmbellishmentMaterials) {
  const root = new THREE.Group();
  root.name = 'orison-ruins-region';
  const random = seededStream(manifest.seed, 'regions/ruins');
  const centerX = 50;
  const centerZ = -28;
  const centerY = terrainHeight(centerX, centerZ, manifest.seedHash);
  const matrix = new THREE.Matrix4();
  const position = new THREE.Vector3();
  const quaternion = new THREE.Quaternion();
  const scale = new THREE.Vector3();
  const columnCount = quality === 'low' ? 8 : quality === 'medium' ? 12 : 18;
  const columns = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.52, 0.7, 1, 8), materials.stone, columnCount);
  columns.name = 'orison-broken-columns';
  for (let index = 0; index < columnCount; index += 1) {
    const angle = (index / columnCount) * Math.PI * 2 + (random() - 0.5) * 0.12;
    const radius = 6 + random() * 3.2;
    const x = centerX + Math.cos(angle) * radius;
    const z = centerZ + Math.sin(angle) * radius;
    const height = 2 + random() * 7;
    position.set(x, terrainHeight(x, z, manifest.seedHash) + height / 2, z);
    quaternion.setFromEuler(new THREE.Euler((random() - 0.5) * 0.08, -angle, (random() - 0.5) * 0.12));
    setInstance(columns, index, matrix, position, quaternion, scale.set(1, height, 1));
  }
  root.add(finalize(columns));

  const archCount = quality === 'low' ? 3 : 5;
  const arches = new THREE.InstancedMesh(new THREE.TorusGeometry(2.1, 0.34, 7, 20, Math.PI), materials.stone, archCount);
  arches.name = 'orison-standing-arches';
  for (let index = 0; index < archCount; index += 1) {
    const angle = (index / archCount) * Math.PI * 2;
    const x = centerX + Math.cos(angle) * 7.4;
    const z = centerZ + Math.sin(angle) * 7.4;
    position.set(x, terrainHeight(x, z, manifest.seedHash) + 4.2, z);
    quaternion.setFromEuler(new THREE.Euler(0, -angle + Math.PI / 2, 0));
    setInstance(arches, index, matrix, position, quaternion, scale.set(1, 1, 1));
  }
  root.add(finalize(arches));

  const dais = new THREE.Mesh(new THREE.CylinderGeometry(4.2, 4.8, 1.1, 12), materials.stone);
  dais.name = 'orison-central-dais';
  dais.position.set(centerX, centerY + 0.4, centerZ);
  dais.receiveShadow = true;
  const monolith = new THREE.Mesh(new THREE.OctahedronGeometry(1.6, 0), materials.glass);
  monolith.name = 'orison-memory-monolith';
  monolith.position.set(centerX, centerY + 3.1, centerZ);
  monolith.scale.y = 1.8;
  root.add(dais, monolith);

  const rubbleCount = quality === 'low' ? 20 : quality === 'medium' ? 38 : 58;
  const rubble = new THREE.InstancedMesh(new THREE.DodecahedronGeometry(0.4, 0), materials.stone, rubbleCount);
  rubble.name = 'orison-rubble-field';
  for (let index = 0; index < rubbleCount; index += 1) {
    const angle = random() * Math.PI * 2;
    const radius = 4.8 + random() * 8.5;
    const x = centerX + Math.cos(angle) * radius;
    const z = centerZ + Math.sin(angle) * radius;
    position.set(x, terrainHeight(x, z, manifest.seedHash) + 0.25, z);
    quaternion.setFromEuler(new THREE.Euler(random() * Math.PI, random() * Math.PI, random() * Math.PI));
    const size = 0.45 + random() * 1.1;
    setInstance(rubble, index, matrix, position, quaternion, scale.set(size, size * 0.7, size));
  }
  root.add(finalize(rubble));
  return root;
}

function createStationRegion(manifest: WorldManifest, quality: QualityTier, materials: EmbellishmentMaterials) {
  const root = new THREE.Group();
  root.name = 'veilcross-station-region';
  const baseX = -53;
  const baseZ = -33;
  const baseY = terrainHeight(baseX, baseZ, manifest.seedHash);
  const matrix = new THREE.Matrix4();
  const position = new THREE.Vector3();
  const quaternion = new THREE.Quaternion();
  const scale = new THREE.Vector3();

  const station = new THREE.Group();
  station.name = 'veilcross-station';
  station.position.set(baseX, baseY, baseZ);
  const hall = new THREE.Mesh(new THREE.BoxGeometry(14, 6.8, 8), materials.stone);
  hall.position.y = 3.4;
  hall.castShadow = true;
  hall.receiveShadow = true;
  const roof = new THREE.Mesh(new THREE.ConeGeometry(8.2, 4.8, 4), materials.roof);
  roof.position.y = 9;
  roof.rotation.y = Math.PI / 4;
  roof.scale.z = 0.62;
  roof.castShadow = true;
  station.add(hall, roof);

  const windows = new THREE.InstancedMesh(new THREE.PlaneGeometry(1.25, 1.8), materials.glass, 8);
  windows.name = 'veilcross-station-windows';
  for (let index = 0; index < 8; index += 1) {
    const side = index < 4 ? -1 : 1;
    position.set(-5.1 + (index % 4) * 3.4, 3.7, side * 4.01);
    quaternion.setFromAxisAngle(new THREE.Vector3(0, 1, 0), side < 0 ? 0 : Math.PI);
    setInstance(windows, index, matrix, position, quaternion, scale.set(1, 1, 1));
  }
  station.add(finalize(windows, false));

  const clockTower = new THREE.Mesh(new THREE.BoxGeometry(3.4, 8.5, 3.4), materials.stone);
  clockTower.position.set(0, 8.6, 0);
  clockTower.castShadow = true;
  station.add(clockTower);
  const clockFace = new THREE.Mesh(new THREE.CircleGeometry(1.05, 24), materials.glass);
  clockFace.name = 'veilcross-clock-face';
  clockFace.position.set(0, 10.1, 1.71);
  station.add(clockFace);
  const stationClockHands = new THREE.Group();
  stationClockHands.name = 'veilcross-clock-hands';
  stationClockHands.position.set(0, 10.1, 1.75);
  const hourHand = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.72, 0.05), materials.metal);
  hourHand.position.y = 0.3;
  const minuteHand = new THREE.Mesh(new THREE.BoxGeometry(0.065, 1.05, 0.05), materials.metal);
  minuteHand.position.y = 0.48;
  minuteHand.rotation.z = 1.35;
  stationClockHands.add(hourHand, minuteHand);
  station.add(stationClockHands);
  root.add(station);

  const platform = new THREE.Mesh(new THREE.BoxGeometry(34, 0.75, 5.4), materials.stone);
  platform.name = 'veilcross-platform';
  platform.position.set(baseX + 5, baseY + 0.15, baseZ + 7.1);
  platform.receiveShadow = true;
  root.add(platform);
  const railMaterial = materials.metal;
  for (const offset of [-1.05, 1.05]) {
    const rail = new THREE.Mesh(new THREE.BoxGeometry(54, 0.16, 0.12), railMaterial);
    rail.position.set(baseX + 6, baseY - 0.15, baseZ + 12 + offset);
    rail.castShadow = true;
    root.add(rail);
  }
  const sleeperCount = quality === 'low' ? 26 : 40;
  const sleepers = new THREE.InstancedMesh(new THREE.BoxGeometry(1.2, 0.12, 3.4), materials.wood, sleeperCount);
  sleepers.name = 'veilcross-rail-sleepers';
  for (let index = 0; index < sleeperCount; index += 1) {
    const x = baseX - 21 + index * (54 / sleeperCount);
    position.set(x, baseY - 0.22, baseZ + 12);
    setInstance(sleepers, index, matrix, position, quaternion.identity(), scale.set(1, 1, 1));
  }
  root.add(finalize(sleepers));

  const canopyPosts = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.11, 0.15, 4.5, 6), materials.metal, 8);
  const canopyGlass = new THREE.InstancedMesh(new THREE.BoxGeometry(3.8, 0.12, 4.8), materials.glass, 4);
  canopyPosts.name = 'veilcross-canopy-posts';
  canopyGlass.name = 'veilcross-glass-canopy';
  for (let index = 0; index < 8; index += 1) {
    const bay = Math.floor(index / 2);
    const z = baseZ + 5.1 + (index % 2) * 4;
    position.set(baseX - 8 + bay * 5.4, baseY + 2.3, z);
    setInstance(canopyPosts, index, matrix, position, quaternion.identity(), scale.set(1, 1, 1));
  }
  for (let index = 0; index < 4; index += 1) {
    position.set(baseX - 8 + index * 5.4, baseY + 4.6, baseZ + 7.05);
    quaternion.setFromEuler(new THREE.Euler(0, 0, (index % 2 === 0 ? -1 : 1) * 0.035));
    setInstance(canopyGlass, index, matrix, position, quaternion, scale.set(1, 1, 1));
  }
  root.add(finalize(canopyPosts), finalize(canopyGlass, false));

  const railcarRoot = new THREE.Group();
  railcarRoot.name = 'veilcross-arcane-railcar';
  railcarRoot.position.set(baseX + 12, baseY + 1.35, baseZ + 12);
  railcarRoot.userData.baseX = railcarRoot.position.x;
  const railcarBody = new THREE.Mesh(new THREE.BoxGeometry(11, 2.7, 3.3), materials.wood);
  railcarBody.castShadow = true;
  const railcarRoof = new THREE.Mesh(new THREE.CylinderGeometry(1.75, 1.75, 11, 12, 1, false, 0, Math.PI), materials.metal);
  railcarRoof.rotation.z = Math.PI / 2;
  railcarRoof.position.y = 1.4;
  const railcarWindows = new THREE.InstancedMesh(new THREE.PlaneGeometry(1.35, 1.05), materials.glass, 8);
  railcarWindows.name = 'railcar-windows';
  for (let index = 0; index < 8; index += 1) {
    const side = index < 4 ? -1 : 1;
    position.set(-4.2 + (index % 4) * 2.8, 0.35, side * 1.66);
    quaternion.setFromAxisAngle(new THREE.Vector3(0, 1, 0), side < 0 ? 0 : Math.PI);
    setInstance(railcarWindows, index, matrix, position, quaternion, scale.set(1, 1, 1));
  }
  railcarRoot.add(railcarBody, railcarRoof, finalize(railcarWindows, false));
  root.add(railcarRoot);

  return { root, stationClockHands, railcarRoot };
}

export function createWorldRegions(manifest: WorldManifest, quality: QualityTier, materials: EmbellishmentMaterials): WorldRegions {
  const root = new THREE.Group();
  root.name = 'world-regions';
  root.add(createMountainRange(manifest, quality, materials));
  root.add(createRuinsRegion(manifest, quality, materials));
  const station = createStationRegion(manifest, quality, materials);
  root.add(station.root);
  return { root, stationClockHands: station.stationClockHands, railcarRoot: station.railcarRoot };
}
