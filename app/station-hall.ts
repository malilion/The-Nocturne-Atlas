import * as THREE from 'three';
import { hashSeed, mulberry32 } from './world-core.ts';

export interface StationHallMaterials {
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

export function createStationHallInterior(seed: string, materials: StationHallMaterials) {
  const hall = new THREE.Group();
  hall.name = 'veilcross-waiting-hall';

  const shell = new THREE.Group();
  shell.name = 'veilcross-hollow-shell';
  const shellParts: Array<[THREE.BufferGeometry, [number, number, number]]> = [
    [new THREE.BoxGeometry(14, 0.45, 8), [0, 0.225, 0]],
    [new THREE.BoxGeometry(14, 6.8, 0.35), [0, 3.4, -3.85]],
    [new THREE.BoxGeometry(0.35, 6.8, 8), [-6.85, 3.4, 0]],
    [new THREE.BoxGeometry(0.35, 6.8, 8), [6.85, 3.4, 0]],
    [new THREE.BoxGeometry(4.9, 6.8, 0.35), [-4.55, 3.4, 3.85]],
    [new THREE.BoxGeometry(4.9, 6.8, 0.35), [4.55, 3.4, 3.85]],
    [new THREE.BoxGeometry(4.2, 2.1, 0.35), [0, 5.75, 3.85]],
  ];
  for (const [geometry, coordinates] of shellParts) {
    const part = markShadow(new THREE.Mesh(geometry, materials.stone), true);
    part.position.set(...coordinates);
    shell.add(part);
  }
  hall.add(shell);

  const floor = new THREE.Mesh(new THREE.PlaneGeometry(13.45, 7.45), materials.wood);
  floor.name = 'veilcross-interior-floor';
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = 0.46;
  floor.receiveShadow = true;
  hall.add(floor);

  const matrix = new THREE.Matrix4();
  const quaternion = new THREE.Quaternion();
  const benches = markShadow(new THREE.InstancedMesh(new THREE.BoxGeometry(2.65, 0.24, 0.58), materials.wood, 6), true);
  const backrests = markShadow(new THREE.InstancedMesh(new THREE.BoxGeometry(2.65, 0.9, 0.18), materials.wood, 6));
  benches.name = 'veilcross-waiting-benches';
  backrests.name = 'veilcross-bench-backrests';
  let benchIndex = 0;
  for (const x of [-3.75, 3.75]) {
    for (const z of [-1.35, 0.55, 2.35]) {
      matrix.compose(new THREE.Vector3(x, 0.92, z), quaternion, new THREE.Vector3(1, 1, 1));
      benches.setMatrixAt(benchIndex, matrix);
      matrix.compose(new THREE.Vector3(x, 1.35, z - 0.25), quaternion, new THREE.Vector3(1, 1, 1));
      backrests.setMatrixAt(benchIndex, matrix);
      benchIndex += 1;
    }
  }
  hall.add(benches, backrests);

  const counter = markShadow(new THREE.Mesh(new THREE.BoxGeometry(7.6, 1.15, 0.95), materials.wood), true);
  counter.name = 'veilcross-ticket-counter';
  counter.position.set(0, 1.02, -2.85);
  const counterTop = markShadow(new THREE.Mesh(new THREE.BoxGeometry(8.05, 0.18, 1.18), materials.metal));
  counterTop.position.set(0, 1.65, -2.85);
  hall.add(counter, counterTop);

  const ticketWindows = new THREE.InstancedMesh(new THREE.PlaneGeometry(1.65, 1.55), materials.glass, 3);
  ticketWindows.name = 'veilcross-ticket-windows';
  for (let index = 0; index < 3; index += 1) {
    matrix.makeTranslation((index - 1) * 2.35, 2.65, -3.66);
    ticketWindows.setMatrixAt(index, matrix);
  }
  hall.add(ticketWindows);

  const board = markShadow(new THREE.Mesh(new THREE.BoxGeometry(4.8, 1.65, 0.18), materials.metal));
  board.name = 'veilcross-departure-board';
  board.position.set(0, 5.15, -3.62);
  const glyphMaterial = new THREE.MeshBasicMaterial({ color: new THREE.Color().setRGB(1.5, 0.86, 0.3), toneMapped: false });
  const glyphs = new THREE.InstancedMesh(new THREE.BoxGeometry(0.36, 0.055, 0.025), glyphMaterial, 18);
  glyphs.name = 'veilcross-departure-glyphs';
  for (let index = 0; index < 18; index += 1) {
    const column = index % 6;
    const row = Math.floor(index / 6);
    matrix.makeTranslation(-1.72 + column * 0.69, 5.53 - row * 0.38, -3.51);
    glyphs.setMatrixAt(index, matrix);
  }
  hall.add(board, glyphs);

  const rafters = markShadow(new THREE.InstancedMesh(new THREE.BoxGeometry(13.5, 0.22, 0.3), materials.wood, 5));
  rafters.name = 'veilcross-hall-rafters';
  for (let index = 0; index < 5; index += 1) {
    matrix.makeTranslation(0, 6.38, -3 + index * 1.5);
    rafters.setMatrixAt(index, matrix);
  }
  hall.add(rafters);

  const random = mulberry32(hashSeed(`${seed.trim().toUpperCase()}::interior/veilcross-hall`));
  const luggage = markShadow(new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), materials.wood, 14), true);
  luggage.name = 'veilcross-seeded-luggage';
  for (let index = 0; index < 14; index += 1) {
    const side = index % 2 === 0 ? -1 : 1;
    const x = side * (5.35 + random() * 0.65);
    const z = -2.5 + random() * 5.55;
    const width = 0.42 + random() * 0.58;
    const height = 0.35 + random() * 0.62;
    const depth = 0.32 + random() * 0.42;
    quaternion.setFromAxisAngle(new THREE.Vector3(0, 1, 0), (random() - 0.5) * 0.28);
    matrix.compose(new THREE.Vector3(x, 0.47 + height / 2, z), quaternion, new THREE.Vector3(width, height, depth));
    luggage.setMatrixAt(index, matrix);
  }
  hall.add(luggage);

  const lanternGlass = new THREE.InstancedMesh(new THREE.OctahedronGeometry(0.28, 0), materials.glass, 5);
  const lanternStems = markShadow(new THREE.InstancedMesh(new THREE.CylinderGeometry(0.025, 0.025, 1.25, 5), materials.metal, 5));
  lanternGlass.name = 'veilcross-hanging-lanterns';
  lanternStems.name = 'veilcross-lantern-stems';
  for (let index = 0; index < 5; index += 1) {
    const z = -2.75 + index * 1.38;
    matrix.makeTranslation(0, 4.85, z);
    lanternGlass.setMatrixAt(index, matrix);
    matrix.makeTranslation(0, 5.6, z);
    lanternStems.setMatrixAt(index, matrix);
  }
  hall.add(lanternGlass, lanternStems);

  const lightRig = new THREE.Group();
  lightRig.name = 'veilcross-interior-light-rig';
  for (const z of [-1.7, 1.55]) {
    const light = new THREE.PointLight(0xffb46b, 12, 11, 2);
    light.position.set(0, 4.85, z);
    lightRig.add(light);
  }
  hall.add(lightRig);

  const anchors = new THREE.Group();
  anchors.name = 'veilcross-content-anchors';
  for (const [name, role, coordinates] of [
    ['station-npc-clerk-anchor', 'npc', [0, 0.48, -2.25]],
    ['station-npc-conductor-anchor', 'npc', [4.8, 0.48, 2.85]],
    ['station-quest-departure-anchor', 'quest', [0, 4.25, -3.2]],
  ] as const) {
    const anchor = new THREE.Group();
    anchor.name = name;
    anchor.userData.role = role;
    anchor.position.set(...coordinates);
    anchors.add(anchor);
  }
  hall.add(anchors);

  hall.traverse((object) => {
    if (object instanceof THREE.InstancedMesh) object.instanceMatrix.needsUpdate = true;
  });
  return hall;
}
