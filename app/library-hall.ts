import * as THREE from 'three';
import { hashSeed, mulberry32 } from './world-core.ts';

export interface LibraryHallMaterials {
  stone: THREE.Material;
  wood: THREE.Material;
  metal: THREE.Material;
  glass: THREE.Material;
}

function markShadow(mesh: THREE.Mesh | THREE.InstancedMesh, receive = false) {
  mesh.castShadow = true;
  mesh.receiveShadow = receive;
  return mesh;
}

export function createLibraryHallInterior(seed: string, materials: LibraryHallMaterials) {
  const hall = new THREE.Group();
  hall.name = 'veyra-library-hall';

  const shell = new THREE.Group();
  shell.name = 'library-hollow-shell';
  const shellParts: Array<[THREE.BufferGeometry, [number, number, number]]> = [
    [new THREE.BoxGeometry(11, 0.45, 6.2), [0, 0.225, 0]],
    [new THREE.BoxGeometry(11, 7.4, 0.32), [0, 3.7, -3.0]],
    [new THREE.BoxGeometry(0.32, 7.4, 6.2), [-5.34, 3.7, 0]],
    [new THREE.BoxGeometry(0.32, 7.4, 6.2), [5.34, 3.7, 0]],
    [new THREE.BoxGeometry(3.8, 7.4, 0.32), [-3.6, 3.7, 3.0]],
    [new THREE.BoxGeometry(3.8, 7.4, 0.32), [3.6, 3.7, 3.0]],
    [new THREE.BoxGeometry(3.8, 2.15, 0.32), [0, 6.33, 3.0]],
  ];
  for (const [geometry, coordinates] of shellParts) {
    const part = markShadow(new THREE.Mesh(geometry, materials.stone), true);
    part.position.set(...coordinates);
    shell.add(part);
  }
  hall.add(shell);

  const floor = new THREE.Mesh(new THREE.PlaneGeometry(10.4, 5.65), materials.wood);
  floor.name = 'library-interior-floor';
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = 0.46;
  floor.receiveShadow = true;
  hall.add(floor);

  const matrix = new THREE.Matrix4();
  const quaternion = new THREE.Quaternion();
  const bookcases = markShadow(new THREE.InstancedMesh(new THREE.BoxGeometry(0.55, 4.85, 1.05), materials.wood, 8), true);
  bookcases.name = 'library-bookcases';
  let caseIndex = 0;
  for (const x of [-4.82, 4.82]) {
    for (const z of [-2.05, -0.7, 0.65, 2]) {
      matrix.compose(new THREE.Vector3(x, 2.9, z), quaternion, new THREE.Vector3(1, 1, 1));
      bookcases.setMatrixAt(caseIndex, matrix);
      caseIndex += 1;
    }
  }
  hall.add(bookcases);

  const shelfBoards = markShadow(new THREE.InstancedMesh(new THREE.BoxGeometry(0.8, 0.08, 1.08), materials.metal, 40));
  shelfBoards.name = 'library-shelf-bands';
  let shelfIndex = 0;
  for (const x of [-4.78, 4.78]) {
    for (const z of [-2.05, -0.7, 0.65, 2]) {
      for (let level = 0; level < 5; level += 1) {
        matrix.makeTranslation(x, 1 + level * 0.92, z);
        shelfBoards.setMatrixAt(shelfIndex, matrix);
        shelfIndex += 1;
      }
    }
  }
  hall.add(shelfBoards);

  const bookMaterial = new THREE.MeshStandardMaterial({ color: 0x66506f, roughness: 0.9 });
  const books = markShadow(new THREE.InstancedMesh(new THREE.BoxGeometry(0.18, 0.58, 0.48), bookMaterial, 80));
  books.name = 'library-seeded-books';
  const random = mulberry32(hashSeed(`${seed.trim().toUpperCase()}::interior/veyra-library`));
  for (let index = 0; index < 80; index += 1) {
    const side = index % 2 === 0 ? -1 : 1;
    const bay = Math.floor(index / 2) % 4;
    const level = Math.floor(index / 8) % 5;
    const z = -2.38 + bay * 1.35 + (random() - 0.5) * 0.25;
    const y = 1.29 + level * 0.92 + (random() - 0.5) * 0.05;
    const width = 0.12 + random() * 0.16;
    matrix.compose(
      new THREE.Vector3(side * 4.44, y, z),
      quaternion.setFromEuler(new THREE.Euler(0, side < 0 ? Math.PI / 2 : -Math.PI / 2, (random() - 0.5) * 0.08)),
      new THREE.Vector3(width / 0.18, 0.78 + random() * 0.4, 1),
    );
    books.setMatrixAt(index, matrix);
  }
  hall.add(books);

  const desks = markShadow(new THREE.InstancedMesh(new THREE.BoxGeometry(2.35, 0.18, 0.9), materials.wood, 3), true);
  const deskLegs = markShadow(new THREE.InstancedMesh(new THREE.BoxGeometry(0.14, 0.92, 0.14), materials.wood, 12), true);
  desks.name = 'library-reading-desks';
  deskLegs.name = 'library-desk-legs';
  let legIndex = 0;
  for (let index = 0; index < 3; index += 1) {
    const z = -1.7 + index * 1.7;
    matrix.makeTranslation(0, 1.18, z);
    desks.setMatrixAt(index, matrix);
    for (const x of [-0.92, 0.92]) {
      for (const legZ of [z - 0.3, z + 0.3]) {
        matrix.makeTranslation(x, 0.8, legZ);
        deskLegs.setMatrixAt(legIndex, matrix);
        legIndex += 1;
      }
    }
  }
  hall.add(desks, deskLegs);

  const skylight = new THREE.Mesh(new THREE.PlaneGeometry(6.8, 2.5), materials.glass);
  skylight.name = 'library-glass-skylight';
  skylight.rotation.x = Math.PI / 2;
  skylight.position.y = 7.12;
  hall.add(skylight);

  const floatingBooks = markShadow(new THREE.InstancedMesh(new THREE.BoxGeometry(0.65, 0.11, 0.85), bookMaterial, 12));
  floatingBooks.name = 'library-floating-books';
  for (let index = 0; index < 12; index += 1) {
    const angle = (index / 12) * Math.PI * 2 + random() * 0.25;
    const radius = 1.8 + random() * 2.2;
    matrix.compose(
      new THREE.Vector3(Math.cos(angle) * radius, 3.1 + random() * 2.1, Math.sin(angle) * radius * 0.55),
      quaternion.setFromEuler(new THREE.Euler((random() - 0.5) * 0.25, -angle, (random() - 0.5) * 0.35)),
      new THREE.Vector3(1, 1, 1),
    );
    floatingBooks.setMatrixAt(index, matrix);
  }
  hall.add(floatingBooks);

  const archiveTable = markShadow(new THREE.Mesh(new THREE.CylinderGeometry(1.15, 1.35, 0.22, 12), materials.wood), true);
  archiveTable.name = 'library-archive-table';
  archiveTable.position.set(0, 1.25, -2.35);
  const memoryOrb = new THREE.Mesh(new THREE.IcosahedronGeometry(0.42, 1), materials.glass);
  memoryOrb.name = 'library-memory-orb';
  memoryOrb.position.set(0, 2.05, -2.35);
  hall.add(archiveTable, memoryOrb);

  const researcherAnchor = new THREE.Group();
  researcherAnchor.name = 'library-researcher-anchor';
  researcherAnchor.userData.role = 'npc';
  researcherAnchor.userData.interactive = true;
  researcherAnchor.position.set(-2.1, 0.48, -2.1);
  hall.add(researcherAnchor);

  const lightRig = new THREE.Group();
  lightRig.name = 'library-interior-light-rig';
  for (const x of [-2.8, 2.8]) {
    const light = new THREE.PointLight(0xa9c8ff, 11, 10, 2);
    light.position.set(x, 4.8, 0);
    lightRig.add(light);
  }
  hall.add(lightRig);

  hall.traverse((object) => {
    if (object instanceof THREE.InstancedMesh) object.instanceMatrix.needsUpdate = true;
  });
  return hall;
}
