import * as THREE from 'three';
import { hashSeed, mulberry32 } from './world-core.ts';

export interface GreatHallMaterials {
  stone: THREE.Material;
  roof: THREE.Material;
  wood: THREE.Material;
  glow: THREE.Material;
}

function markShadow(mesh: THREE.Mesh | THREE.InstancedMesh, receive = false) {
  mesh.castShadow = true;
  mesh.receiveShadow = receive;
  return mesh;
}

export function createGreatHallArchitecture(seed: string, materials: GreatHallMaterials) {
  const hall = new THREE.Group();
  hall.name = 'great-hall-architecture';
  hall.position.set(-1, 0, 0);

  const shell = new THREE.Group();
  shell.name = 'great-hall-hollow-shell';
  const shellParts: Array<[THREE.BufferGeometry, [number, number, number]]> = [
    [new THREE.BoxGeometry(17, 0.5, 10), [0, 0.25, 0]],
    [new THREE.BoxGeometry(17, 9, 0.6), [0, 4.5, -4.7]],
    [new THREE.BoxGeometry(0.6, 9, 10), [-8.2, 4.5, 0]],
    [new THREE.BoxGeometry(0.6, 9, 10), [8.2, 4.5, 0]],
    [new THREE.BoxGeometry(5.8, 9, 0.6), [-5.6, 4.5, 4.7]],
    [new THREE.BoxGeometry(5.8, 9, 0.6), [5.6, 4.5, 4.7]],
    [new THREE.BoxGeometry(5.4, 3, 0.6), [0, 7.5, 4.7]],
  ];
  for (const [geometry, position] of shellParts) {
    const part = markShadow(new THREE.Mesh(geometry, materials.stone), true);
    part.position.set(...position);
    shell.add(part);
  }
  hall.add(shell);

  const roof = markShadow(new THREE.Mesh(new THREE.ConeGeometry(8.7, 7, 4), materials.roof));
  roof.name = 'great-hall-roof';
  roof.rotation.y = Math.PI / 4;
  roof.scale.z = 0.72;
  roof.position.y = 12.2;
  hall.add(roof);

  const portalShape = new THREE.Shape();
  portalShape.moveTo(-1.55, 0);
  portalShape.lineTo(-1.55, 1.8);
  portalShape.quadraticCurveTo(-1.55, 3.8, 0, 4.1);
  portalShape.quadraticCurveTo(1.55, 3.8, 1.55, 1.8);
  portalShape.lineTo(1.55, 0);
  portalShape.closePath();
  const portal = new THREE.Mesh(new THREE.ShapeGeometry(portalShape), new THREE.MeshBasicMaterial({ color: 0x07080a, toneMapped: false }));
  portal.name = 'great-hall-portal';
  portal.position.set(0, 0.03, 4.39);
  hall.add(portal);
  const arch = markShadow(new THREE.Mesh(new THREE.TorusGeometry(1.55, 0.26, 6, 20, Math.PI), materials.stone));
  arch.position.set(0, 1.88, 4.31);
  arch.rotation.y = Math.PI;
  hall.add(arch);

  const floor = new THREE.Mesh(new THREE.PlaneGeometry(15.8, 8.8), materials.wood);
  floor.name = 'great-hall-interior-floor';
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = 0.52;
  floor.receiveShadow = true;
  hall.add(floor);

  const matrix = new THREE.Matrix4();
  const quaternion = new THREE.Quaternion();
  const tableTops = markShadow(new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), materials.wood, 2), true);
  tableTops.name = 'great-hall-tables';
  for (let index = 0; index < 2; index += 1) {
    matrix.compose(new THREE.Vector3(index === 0 ? -4.3 : 4.3, 1.55, -0.4), quaternion, new THREE.Vector3(2.4, 0.2, 6.3));
    tableTops.setMatrixAt(index, matrix);
  }
  hall.add(tableTops);

  const benches = markShadow(new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), materials.wood, 4), true);
  benches.name = 'great-hall-benches';
  for (let index = 0; index < 4; index += 1) {
    const tableSide = index < 2 ? -4.3 : 4.3;
    const benchSide = index % 2 === 0 ? -1.55 : 1.55;
    matrix.compose(new THREE.Vector3(tableSide + benchSide, 0.92, -0.4), quaternion, new THREE.Vector3(0.42, 0.24, 6));
    benches.setMatrixAt(index, matrix);
  }
  hall.add(benches);

  const tableLegs = markShadow(new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), materials.wood, 8), true);
  tableLegs.name = 'great-hall-table-legs';
  let legIndex = 0;
  for (const x of [-4.95, -3.65, 3.65, 4.95]) {
    for (const z of [-2.65, 1.85]) {
      matrix.compose(new THREE.Vector3(x, 1.02, z), quaternion, new THREE.Vector3(0.18, 1, 0.18));
      tableLegs.setMatrixAt(legIndex, matrix);
      legIndex += 1;
    }
  }
  hall.add(tableLegs);

  const dais = markShadow(new THREE.Mesh(new THREE.BoxGeometry(5.5, 0.65, 1.7), materials.stone), true);
  dais.name = 'great-hall-dais';
  dais.position.set(0, 0.83, -3.75);
  hall.add(dais);
  const lectern = markShadow(new THREE.Mesh(new THREE.BoxGeometry(1.2, 2.1, 0.9), materials.wood));
  lectern.name = 'great-hall-lectern';
  lectern.position.set(0, 1.85, -3.8);
  lectern.rotation.x = -0.12;
  hall.add(lectern);

  const windows = new THREE.InstancedMesh(new THREE.PlaneGeometry(0.9, 1.8), materials.glow, 12);
  windows.name = 'great-hall-windows';
  let windowIndex = 0;
  for (const x of [-6, -3, 3, 6]) {
    matrix.compose(new THREE.Vector3(x, 5, 4.38), quaternion, new THREE.Vector3(1, 1, 1));
    windows.setMatrixAt(windowIndex, matrix);
    windowIndex += 1;
  }
  for (const x of [-8.49, 8.49]) {
    const sideRotation = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), x < 0 ? Math.PI / 2 : -Math.PI / 2);
    for (const z of [-3, -0.5, 2.1, 3.7]) {
      matrix.compose(new THREE.Vector3(x, 4.7, z), sideRotation, new THREE.Vector3(1, 1, 1));
      windows.setMatrixAt(windowIndex, matrix);
      windowIndex += 1;
    }
  }
  hall.add(windows);

  const banners = new THREE.InstancedMesh(
    new THREE.PlaneGeometry(1.5, 3.2),
    new THREE.MeshStandardMaterial({ color: 0x38294d, roughness: 0.88, side: THREE.DoubleSide }),
    3,
  );
  banners.name = 'great-hall-banners';
  for (let index = 0; index < 3; index += 1) {
    matrix.makeTranslation((index - 1) * 3.3, 5.8, -4.37);
    banners.setMatrixAt(index, matrix);
  }
  hall.add(banners);

  const rafters = markShadow(new THREE.InstancedMesh(new THREE.BoxGeometry(16, 0.28, 0.35), materials.wood, 5));
  rafters.name = 'great-hall-rafters';
  for (let index = 0; index < 5; index += 1) {
    matrix.makeTranslation(0, 8.25, -3.6 + index * 1.8);
    rafters.setMatrixAt(index, matrix);
  }
  hall.add(rafters);

  const random = mulberry32(hashSeed(`${seed.trim().toUpperCase()}::interior/great-hall`));
  const waxMaterial = new THREE.MeshStandardMaterial({ color: 0xe5ddc4, roughness: 0.7 });
  const flameMaterial = new THREE.MeshBasicMaterial({ color: new THREE.Color().setRGB(3.4, 0.82, 0.12), toneMapped: false });
  const wax = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.06, 0.07, 0.45, 6), waxMaterial, 24);
  const flames = new THREE.InstancedMesh(new THREE.SphereGeometry(0.08, 5, 5), flameMaterial, 24);
  wax.name = 'great-hall-floating-candles';
  flames.name = 'great-hall-candle-flames';
  for (let index = 0; index < 24; index += 1) {
    const x = -6.8 + random() * 13.6;
    const y = 3.6 + random() * 3.6;
    const z = -3.8 + random() * 7.2;
    matrix.makeTranslation(x, y, z);
    wax.setMatrixAt(index, matrix);
    matrix.makeTranslation(x, y + 0.31, z);
    flames.setMatrixAt(index, matrix);
  }
  hall.add(wax, flames);

  const candleLightRig = new THREE.Group();
  candleLightRig.name = 'great-hall-candle-light-rig';
  for (const [x, y, z, intensity] of [
    [-4.2, 4.6, -0.5, 18],
    [4.2, 4.6, -0.5, 18],
    [0, 4.8, -3.2, 13],
  ] as const) {
    const light = new THREE.PointLight(0xffb36b, intensity, 14, 2);
    light.position.set(x, y, z);
    candleLightRig.add(light);
  }
  hall.add(candleLightRig);

  hall.traverse((object) => {
    if (object instanceof THREE.InstancedMesh) object.instanceMatrix.needsUpdate = true;
  });
  return hall;
}
