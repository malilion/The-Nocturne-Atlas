import * as THREE from 'three';
import { createLibraryHallInterior } from './library-hall.ts';
import { seededStream, terrainHeight, type QualityTier, type WorldManifest } from './world-core.ts';

export interface EmbellishmentMaterials {
  stone: THREE.Material;
  roof: THREE.Material;
  wood: THREE.Material;
  metal: THREE.Material;
  glass: THREE.Material;
}

export interface AmbientEmbellishments {
  root: THREE.Group;
  cloudRoot: THREE.Group;
  runeRoot: THREE.Group;
  floatingBookRoot: THREE.Group;
  movingLanternRoot: THREE.Group;
}

function compose(
  matrix: THREE.Matrix4,
  position: THREE.Vector3,
  quaternion: THREE.Quaternion,
  scale: THREE.Vector3,
) {
  matrix.compose(position, quaternion, scale);
  return matrix;
}

function finalize(batch: THREE.InstancedMesh, castShadow = true) {
  batch.instanceMatrix.needsUpdate = true;
  batch.computeBoundingSphere();
  batch.castShadow = castShadow;
  batch.receiveShadow = castShadow;
  return batch;
}

export function createCastleEmbellishments(manifest: WorldManifest, materials: EmbellishmentMaterials) {
  const root = new THREE.Group();
  root.name = 'castle-embellishments';
  const baseY = terrainHeight(-7, -4, manifest.seedHash) + 0.2;
  const random = seededStream(manifest.seed, 'embellishments/castle');
  const matrix = new THREE.Matrix4();
  const quaternion = new THREE.Quaternion();
  const position = new THREE.Vector3();
  const scale = new THREE.Vector3();

  const library = new THREE.Group();
  library.name = 'west-library-wing';
  library.position.set(-24.5, baseY, -7);
  library.add(createLibraryHallInterior(manifest.seed, materials));
  const libraryRoof = new THREE.Mesh(new THREE.ConeGeometry(5.7, 4.4, 4), materials.roof);
  libraryRoof.name = 'library-pyramidal-roof';
  libraryRoof.position.y = 9.1;
  libraryRoof.rotation.y = Math.PI / 4;
  libraryRoof.scale.z = 0.62;
  libraryRoof.castShadow = true;
  library.add(libraryRoof);

  const libraryWindowSlots = [-4.4, -2.2, 2.2, 4.4];
  const libraryWindows = new THREE.InstancedMesh(new THREE.PlaneGeometry(1.05, 1.75), materials.glass, libraryWindowSlots.length * 2);
  libraryWindows.name = 'library-leaded-windows';
  for (let index = 0; index < libraryWindowSlots.length * 2; index += 1) {
    const side = index < libraryWindowSlots.length ? -1 : 1;
    const slot = index % libraryWindowSlots.length;
    position.set(libraryWindowSlots[slot], 2.6 + (slot % 2) * 1.8, side * 3.11);
    quaternion.setFromAxisAngle(new THREE.Vector3(0, 1, 0), side < 0 ? 0 : Math.PI);
    compose(matrix, position, quaternion, scale.set(1, 1, 1));
    libraryWindows.setMatrixAt(index, matrix);
  }
  library.add(finalize(libraryWindows, false));

  const balconySlab = new THREE.Mesh(new THREE.BoxGeometry(5.8, 0.34, 1.55), materials.stone);
  balconySlab.position.set(0, 5.7, 3.72);
  balconySlab.castShadow = true;
  library.add(balconySlab);
  const balconyRails = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.045, 0.055, 1.2, 5), materials.metal, 12);
  for (let index = 0; index < 12; index += 1) {
    position.set(-2.55 + index * 0.46, 6.35, 4.36);
    compose(matrix, position, quaternion.identity(), scale.set(1, 1, 1));
    balconyRails.setMatrixAt(index, matrix);
  }
  library.add(finalize(balconyRails));
  root.add(library);

  const arcade = new THREE.Group();
  arcade.name = 'courtyard-arcade';
  arcade.position.set(-2, baseY, 5.6);
  const arcadeColumns = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.28, 0.34, 4.2, 8), materials.stone, 7);
  const arcadeArches = new THREE.InstancedMesh(new THREE.TorusGeometry(1.15, 0.24, 6, 16, Math.PI), materials.stone, 6);
  for (let index = 0; index < 7; index += 1) {
    position.set(-7.2 + index * 2.4, 2.1, 0);
    compose(matrix, position, quaternion.identity(), scale.set(1, 1, 1));
    arcadeColumns.setMatrixAt(index, matrix);
    if (index < 6) {
      position.set(-6 + index * 2.4, 4.05, 0);
      quaternion.setFromEuler(new THREE.Euler(0, 0, 0));
      compose(matrix, position, quaternion, scale.set(1, 1, 1));
      arcadeArches.setMatrixAt(index, matrix);
    }
  }
  arcade.add(finalize(arcadeColumns), finalize(arcadeArches));
  root.add(arcade);

  const bridgeSupports = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.48, 0.68, 9, 8), materials.stone, 4);
  for (let index = 0; index < 4; index += 1) {
    position.set(-17.5 + index * 3.2, baseY + 4.4, -0.3 + index * 0.55);
    quaternion.setFromEuler(new THREE.Euler(0, 0, -0.18));
    compose(matrix, position, quaternion, scale.set(1, 0.9 + random() * 0.16, 1));
    bridgeSupports.setMatrixAt(index, matrix);
  }
  bridgeSupports.name = 'bridge-buttress-supports';
  root.add(finalize(bridgeSupports));

  const observatoryRoof = new THREE.Mesh(new THREE.CylinderGeometry(3.8, 4.4, 2.2, 8), materials.metal);
  observatoryRoof.name = 'astral-observatory-metal-roof';
  observatoryRoof.position.set(-16, baseY + manifest.towerHeights[0] + 1.1, -7);
  observatoryRoof.castShadow = true;
  root.add(observatoryRoof);

  return root;
}

export function createVillageEmbellishments(manifest: WorldManifest, materials: EmbellishmentMaterials) {
  const root = new THREE.Group();
  root.name = 'village-embellishments';
  const random = seededStream(manifest.seed, 'embellishments/village');
  const matrix = new THREE.Matrix4();
  const quaternion = new THREE.Quaternion();
  const position = new THREE.Vector3();
  const scale = new THREE.Vector3();
  const up = new THREE.Vector3(0, 1, 0);

  const plazaY = terrainHeight(-31, 13, manifest.seedHash) + 0.1;
  const plaza = new THREE.Mesh(new THREE.CircleGeometry(7.2, 32), new THREE.MeshStandardMaterial({ color: 0x34312d, roughness: 1 }));
  plaza.name = 'lumen-row-market-square';
  plaza.rotation.x = -Math.PI / 2;
  plaza.position.set(-31, plazaY, 13);
  plaza.receiveShadow = true;
  root.add(plaza);
  const fountain = new THREE.Mesh(new THREE.CylinderGeometry(1.65, 1.9, 0.7, 16), materials.stone);
  fountain.position.set(-31, plazaY + 0.35, 13);
  fountain.castShadow = true;
  root.add(fountain);
  const fountainBowl = new THREE.Mesh(new THREE.CylinderGeometry(1.35, 1.35, 0.18, 24), materials.glass);
  fountainBowl.position.set(-31, plazaY + 0.76, 13);
  root.add(fountainBowl);

  const makeLandmark = (name: string, x: number, z: number, width: number, colorOffset: number) => {
    const group = new THREE.Group();
    group.name = name;
    const y = terrainHeight(x, z, manifest.seedHash);
    group.position.set(x, y, z);
    group.rotation.y = -0.14 + colorOffset * 0.04;
    const body = new THREE.Mesh(new THREE.BoxGeometry(width, 6.3, 5.2), materials.wood);
    body.position.y = 3.15;
    body.castShadow = true;
    body.receiveShadow = true;
    group.add(body);
    const lower = new THREE.Mesh(new THREE.BoxGeometry(width + 0.35, 2.25, 5.55), materials.stone);
    lower.position.y = 1.12;
    lower.castShadow = true;
    group.add(lower);
    const roof = new THREE.Mesh(new THREE.ConeGeometry(width * 0.68, 4.1 + colorOffset * 0.35, colorOffset === 0 ? 4 : 6), materials.roof);
    roof.position.y = 8.15;
    roof.rotation.y = Math.PI / 4;
    roof.scale.z = 0.74;
    roof.castShadow = true;
    group.add(roof);
    const window = new THREE.Mesh(new THREE.PlaneGeometry(1.8, 2.2), materials.glass);
    window.position.set(0, 4.2, 2.62);
    group.add(window);
    return group;
  };
  root.add(
    makeLandmark('the-copper-kettle-tavern', -48.5, 22.2, 7.6, 0),
    makeLandmark('moon-and-quill-shop', -17.5, 6.2, 6.2, 1),
  );

  const lampCount = manifest.quality === 'low' ? 8 : manifest.quality === 'medium' ? 12 : 16;
  const lampPosts = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.09, 0.13, 3.8, 6), materials.metal, lampCount);
  const lampGlass = new THREE.InstancedMesh(new THREE.OctahedronGeometry(0.36, 0), materials.glass, lampCount);
  lampPosts.name = 'lumen-row-lamp-posts';
  lampGlass.name = 'lumen-row-lamp-glass';
  for (let index = 0; index < lampCount; index += 1) {
    const t = index / Math.max(1, lampCount - 1);
    const x = -52 + t * 42;
    const z = 13 + (index % 2 === 0 ? -3.1 : 3.1);
    const y = terrainHeight(x, z, manifest.seedHash);
    position.set(x, y + 1.9, z);
    compose(matrix, position, quaternion.identity(), scale.set(1, 1, 1));
    lampPosts.setMatrixAt(index, matrix);
    position.y = y + 4.05;
    compose(matrix, position, quaternion, scale.set(1, 1, 1));
    lampGlass.setMatrixAt(index, matrix);
  }
  root.add(finalize(lampPosts), finalize(lampGlass, false));

  const fenceCount = manifest.quality === 'low' ? 18 : 30;
  const fencePosts = new THREE.InstancedMesh(new THREE.BoxGeometry(0.14, 1.45, 0.14), materials.wood, fenceCount);
  const alleyStones = new THREE.InstancedMesh(new THREE.BoxGeometry(0.7, 0.08, 0.46), materials.stone, fenceCount * 2);
  for (let index = 0; index < fenceCount; index += 1) {
    const angle = (index / fenceCount) * Math.PI * 2;
    const x = -31 + Math.cos(angle) * 8.2;
    const z = 13 + Math.sin(angle) * 8.2;
    const y = terrainHeight(x, z, manifest.seedHash);
    position.set(x, y + 0.72, z);
    quaternion.setFromAxisAngle(up, -angle);
    compose(matrix, position, quaternion, scale.set(1, 1, 1));
    fencePosts.setMatrixAt(index, matrix);
    for (let lane = 0; lane < 2; lane += 1) {
      const alleyIndex = index * 2 + lane;
      const stoneX = -54 + index * (44 / fenceCount) + (random() - 0.5) * 0.35;
      const stoneZ = 11.7 + lane * 2.6 + (random() - 0.5) * 0.25;
      position.set(stoneX, terrainHeight(stoneX, stoneZ, manifest.seedHash) + 0.09, stoneZ);
      quaternion.setFromAxisAngle(up, -0.14 + (random() - 0.5) * 0.18);
      compose(matrix, position, quaternion, scale.set(0.7 + random() * 0.5, 1, 0.8 + random() * 0.4));
      alleyStones.setMatrixAt(alleyIndex, matrix);
    }
  }
  root.add(finalize(fencePosts), finalize(alleyStones, false));
  return root;
}

export function createForestEmbellishments(manifest: WorldManifest, materials: EmbellishmentMaterials) {
  const root = new THREE.Group();
  root.name = 'forest-embellishments';
  const random = seededStream(manifest.seed, 'embellishments/forest');
  const matrix = new THREE.Matrix4();
  const quaternion = new THREE.Quaternion();
  const position = new THREE.Vector3();
  const scale = new THREE.Vector3();
  const countScale = manifest.quality === 'low' ? 0.55 : manifest.quality === 'medium' ? 1 : 1.55;

  const rootCount = Math.round(22 * countScale);
  const roots = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.09, 0.24, 3.2, 5), materials.wood, rootCount);
  const logs = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.34, 0.48, 4.8, 7), materials.wood, Math.round(7 * countScale));
  roots.name = 'forest-surface-roots';
  logs.name = 'forest-fallen-logs';
  for (let index = 0; index < rootCount; index += 1) {
    const angle = random() * Math.PI * 2;
    const radius = 34 + random() * 30;
    const x = Math.cos(angle) * radius;
    const z = Math.sin(angle) * radius;
    const y = terrainHeight(x, z, manifest.seedHash);
    position.set(x, y + 0.12, z);
    quaternion.setFromEuler(new THREE.Euler(Math.PI / 2 + (random() - 0.5) * 0.22, angle, 0));
    compose(matrix, position, quaternion, scale.set(0.7 + random() * 0.9, 1, 0.7 + random() * 0.6));
    roots.setMatrixAt(index, matrix);
  }
  for (let index = 0; index < logs.count; index += 1) {
    const x = 8 + random() * 37;
    const z = -58 + random() * 25;
    position.set(x, terrainHeight(x, z, manifest.seedHash) + 0.55, z);
    quaternion.setFromEuler(new THREE.Euler(Math.PI / 2, random() * Math.PI, (random() - 0.5) * 0.2));
    compose(matrix, position, quaternion, scale.set(0.8 + random() * 0.7, 1, 0.8 + random() * 0.5));
    logs.setMatrixAt(index, matrix);
  }
  root.add(finalize(roots), finalize(logs));

  const mushroomCount = Math.round(38 * countScale);
  const mushroomStems = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.045, 0.075, 0.42, 5), new THREE.MeshStandardMaterial({ color: 0xc4b89c, roughness: 0.92 }), mushroomCount);
  const mushroomCaps = new THREE.InstancedMesh(new THREE.SphereGeometry(0.18, 6, 4, 0, Math.PI * 2, 0, Math.PI / 2), new THREE.MeshStandardMaterial({ color: 0x7f342f, roughness: 0.86 }), mushroomCount);
  mushroomStems.name = 'forest-mushroom-stems';
  mushroomCaps.name = 'forest-mushroom-caps';
  for (let index = 0; index < mushroomCount; index += 1) {
    const x = 4 + random() * 42;
    const z = -61 + random() * 32;
    const y = terrainHeight(x, z, manifest.seedHash);
    const size = 0.65 + random() * 1.1;
    position.set(x, y + 0.21 * size, z);
    compose(matrix, position, quaternion.identity(), scale.set(size, size, size));
    mushroomStems.setMatrixAt(index, matrix);
    position.y = y + 0.42 * size;
    compose(matrix, position, quaternion, scale.set(size, size, size));
    mushroomCaps.setMatrixAt(index, matrix);
  }
  root.add(finalize(mushroomStems, false), finalize(mushroomCaps, false));

  const ruin = new THREE.Group();
  ruin.name = 'thorn-veil-waystone-ruin';
  const ruinY = terrainHeight(18, -43, manifest.seedHash);
  ruin.position.set(18, ruinY, -43);
  const ruinColumns = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.38, 0.52, 1, 7), materials.stone, 5);
  for (let index = 0; index < 5; index += 1) {
    const angle = (index / 5) * Math.PI * 2;
    const height = 2.1 + random() * 3.8;
    position.set(Math.cos(angle) * 3.1, height / 2, Math.sin(angle) * 3.1);
    compose(matrix, position, quaternion.identity(), scale.set(1, height, 1));
    ruinColumns.setMatrixAt(index, matrix);
  }
  const ruinRing = new THREE.Mesh(new THREE.TorusGeometry(3.2, 0.26, 6, 24), materials.stone);
  ruinRing.rotation.x = Math.PI / 2;
  ruinRing.position.y = 0.28;
  ruin.add(finalize(ruinColumns), ruinRing);
  root.add(ruin);

  const mistMaterial = new THREE.MeshBasicMaterial({ color: 0x718d87, transparent: true, opacity: 0.075, depthWrite: false, fog: false });
  const mistPatches = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 10, 6), mistMaterial, 5);
  for (let index = 0; index < 5; index += 1) {
    const x = 8 + random() * 31;
    const z = -55 + random() * 22;
    position.set(x, terrainHeight(x, z, manifest.seedHash) + 2.2, z);
    compose(matrix, position, quaternion.identity(), scale.set(7 + random() * 5, 1.2 + random(), 5 + random() * 5));
    mistPatches.setMatrixAt(index, matrix);
  }
  root.add(finalize(mistPatches, false));
  return root;
}

export function createAmbientEmbellishments(
  manifest: WorldManifest,
  quality: QualityTier,
  materials: EmbellishmentMaterials,
): AmbientEmbellishments {
  const root = new THREE.Group();
  root.name = 'ambient-embellishments';
  const random = seededStream(manifest.seed, 'embellishments/ambient');
  const matrix = new THREE.Matrix4();
  const quaternion = new THREE.Quaternion();
  const position = new THREE.Vector3();
  const scale = new THREE.Vector3();

  const cloudRoot = new THREE.Group();
  cloudRoot.name = 'procedural-cloud-layer';
  const cloudCount = quality === 'low' ? 12 : quality === 'medium' ? 22 : 34;
  const cloudMaterial = new THREE.MeshStandardMaterial({ color: 0x4f5865, roughness: 1, transparent: true, opacity: 0.2, depthWrite: false, fog: false });
  const clouds = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1, 1), cloudMaterial, cloudCount);
  clouds.name = 'procedural-cloud-billows';
  for (let index = 0; index < cloudCount; index += 1) {
    const angle = random() * Math.PI * 2;
    const radius = 45 + random() * 72;
    position.set(Math.cos(angle) * radius, 49 + random() * 18, Math.sin(angle) * radius);
    quaternion.setFromEuler(new THREE.Euler(random() * 0.2, random() * Math.PI, random() * 0.12));
    compose(matrix, position, quaternion, scale.set(8 + random() * 11, 1.2 + random() * 2.2, 4 + random() * 7));
    clouds.setMatrixAt(index, matrix);
  }
  cloudRoot.add(finalize(clouds, false));
  root.add(cloudRoot);

  const runeRoot = new THREE.Group();
  runeRoot.name = 'world-rune-sites';
  const runeMaterial = new THREE.MeshBasicMaterial({ color: new THREE.Color().setRGB(0.24, 1.15, 1.7), transparent: true, opacity: 0.62, toneMapped: false, depthWrite: false });
  const runeCircles = new THREE.InstancedMesh(new THREE.TorusGeometry(1.6, 0.055, 5, 28), runeMaterial, 4);
  const runeStrokes = new THREE.InstancedMesh(new THREE.BoxGeometry(0.1, 2.4, 0.08), runeMaterial, 12);
  const runeSites: Array<[number, number]> = [[-18, -10], [21, -43], [35, 14], [-31, 13]];
  runeSites.forEach(([x, z], index) => {
    const y = terrainHeight(x, z, manifest.seedHash) + 0.38;
    position.set(x, y, z);
    quaternion.setFromEuler(new THREE.Euler(Math.PI / 2, 0, index * 0.37));
    compose(matrix, position, quaternion, scale.set(1, 1, 1));
    runeCircles.setMatrixAt(index, matrix);
    for (let stroke = 0; stroke < 3; stroke += 1) {
      const angle = (stroke / 3) * Math.PI * 2 + index * 0.41;
      position.set(x + Math.cos(angle) * 0.72, y + 0.02, z + Math.sin(angle) * 0.72);
      quaternion.setFromEuler(new THREE.Euler(Math.PI / 2, angle, angle));
      compose(matrix, position, quaternion, scale.set(1, 0.7 + stroke * 0.16, 1));
      runeStrokes.setMatrixAt(index * 3 + stroke, matrix);
    }
  });
  runeRoot.add(finalize(runeCircles, false), finalize(runeStrokes, false));
  root.add(runeRoot);

  const floatingBookRoot = new THREE.Group();
  floatingBookRoot.name = 'floating-library-books';
  floatingBookRoot.position.set(-24.5, terrainHeight(-24.5, -7, manifest.seedHash) + 8.5, -7);
  floatingBookRoot.userData.baseY = floatingBookRoot.position.y;
  const bookCount = quality === 'low' ? 8 : quality === 'medium' ? 14 : 22;
  const bookCovers = new THREE.InstancedMesh(new THREE.BoxGeometry(1.15, 0.16, 0.82), materials.wood, bookCount);
  const bookPages = new THREE.InstancedMesh(new THREE.BoxGeometry(1.02, 0.12, 0.72), new THREE.MeshStandardMaterial({ color: 0xc8bea5, roughness: 0.88 }), bookCount);
  bookCovers.name = 'floating-book-covers';
  bookPages.name = 'floating-book-pages';
  for (let index = 0; index < bookCount; index += 1) {
    const angle = (index / bookCount) * Math.PI * 2 + random() * 0.3;
    const radius = 3.2 + random() * 4.8;
    position.set(Math.cos(angle) * radius, (random() - 0.5) * 4.6, Math.sin(angle) * radius);
    quaternion.setFromEuler(new THREE.Euler((random() - 0.5) * 0.55, -angle + Math.PI / 2, (random() - 0.5) * 0.5));
    compose(matrix, position, quaternion, scale.set(0.7 + random() * 0.75, 1, 0.7 + random() * 0.5));
    bookCovers.setMatrixAt(index, matrix);
    bookPages.setMatrixAt(index, matrix);
  }
  floatingBookRoot.add(finalize(bookCovers), finalize(bookPages, false));
  root.add(floatingBookRoot);

  const movingLanternRoot = new THREE.Group();
  movingLanternRoot.name = 'moving-wayfinder-lanterns';
  const lanternCount = quality === 'low' ? 7 : quality === 'medium' ? 12 : 18;
  const lanternCageMaterial = new THREE.MeshStandardMaterial({
    color: 0x6d5a3c,
    roughness: 0.54,
    metalness: 0.3,
    emissive: new THREE.Color(0x3a2208),
    emissiveIntensity: 0.85,
    side: THREE.DoubleSide,
  });
  const lanternCages = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.23, 0.3, 0.72, 6, 1, true), lanternCageMaterial, lanternCount);
  const lanternGlowMaterial = new THREE.MeshBasicMaterial({ color: new THREE.Color().setRGB(3.2, 1.1, 0.2), transparent: true, opacity: 0.82, toneMapped: false });
  const lanternGlow = new THREE.InstancedMesh(new THREE.OctahedronGeometry(0.22, 0), lanternGlowMaterial, lanternCount);
  lanternCages.name = 'moving-lantern-cages';
  lanternGlow.name = 'moving-lantern-glow';
  for (let index = 0; index < lanternCount; index += 1) {
    const angle = (index / lanternCount) * Math.PI * 2;
    const radius = 17 + random() * 28;
    const x = -6 + Math.cos(angle) * radius;
    const z = 3 + Math.sin(angle) * radius;
    const y = terrainHeight(x, z, manifest.seedHash) + 5 + random() * 8;
    position.set(x, y, z);
    quaternion.setFromEuler(new THREE.Euler((random() - 0.5) * 0.18, angle, (random() - 0.5) * 0.18));
    compose(matrix, position, quaternion, scale.set(1, 1, 1));
    lanternCages.setMatrixAt(index, matrix);
    lanternGlow.setMatrixAt(index, matrix);
  }
  movingLanternRoot.add(finalize(lanternCages), finalize(lanternGlow, false));
  root.add(movingLanternRoot);

  return { root, cloudRoot, runeRoot, floatingBookRoot, movingLanternRoot };
}
