import * as THREE from 'three';
import { seededStream, terrainHeight, type QualityTier, type WorldManifest } from './world-core.ts';

interface PopulationMember {
  id: string;
  label: string;
  role: string;
  region: string;
  position: [number, number, number];
  yaw: number;
  phase: number;
  pace: number;
  stride: number;
}

const LABELS = [
  'Aster Vale',
  'Briar Wren',
  'Cinder Moss',
  'Dorian Quill',
  'Elowen Voss',
  'Fenn Lark',
  'Galen Thorne',
  'Hester Rune',
  'Iona Mere',
  'Jory Flint',
  'Kael Rowan',
  'Lyra Fen',
  'Maren Ash',
  'Neris Bell',
  'Orin Dusk',
  'Petra Loom',
] as const;

function createPlacements(manifest: WorldManifest): Array<Omit<PopulationMember, 'label' | 'yaw' | 'phase' | 'pace' | 'stride'>> {
  const castleY = terrainHeight(-7, -4, manifest.seedHash) + 0.68;
  const stationY = terrainHeight(-53, -33, manifest.seedHash) + 0.62;
  const atTerrain = (x: number, z: number): [number, number, number] => [x, terrainHeight(x, z, manifest.seedHash), z];
  return [
    { id: 'veyra-apprentice', role: 'castle-apprentice', region: 'castle', position: [-4.2, castleY, 3.8] },
    { id: 'lumen-merchant', role: 'village-merchant', region: 'village', position: atTerrain(-35.4, 16.2) },
    { id: 'thorn-warden', role: 'forest-warden', region: 'forest', position: atTerrain(20.8, -41.2) },
    { id: 'mirror-watcher', role: 'lake-watcher', region: 'lake', position: atTerrain(3.8, 18.2) },
    { id: 'umbravale-warden', role: 'mountain-warden', region: 'mountains', position: atTerrain(-9.2, -58.4) },
    { id: 'orison-scholar', role: 'ruins-scholar', region: 'ruins', position: atTerrain(45.8, -24.5) },
    { id: 'veilcross-traveler', role: 'station-traveler', region: 'station', position: [-47.5, stationY, -25.9] },
    { id: 'veyra-researcher', role: 'archive-researcher', region: 'library', position: [-26.6, castleY, -9.1] },
    { id: 'veyra-astronomer', role: 'castle-astronomer', region: 'castle', position: [-12.4, castleY, 2.9] },
    { id: 'lumen-minstrel', role: 'village-minstrel', region: 'village', position: atTerrain(-27.2, 16.9) },
    { id: 'orison-caretaker', role: 'ruins-caretaker', region: 'ruins', position: atTerrain(54.8, -30.7) },
    { id: 'veilcross-porter', role: 'station-porter', region: 'station', position: [-57.8, stationY, -25.7] },
    { id: 'lumen-courier', role: 'village-courier', region: 'village', position: atTerrain(-42.5, 12.1) },
    { id: 'thorn-herbalist', role: 'forest-herbalist', region: 'forest', position: atTerrain(27.5, -47.4) },
    { id: 'mirror-cartographer', role: 'lake-cartographer', region: 'lake', position: atTerrain(7.1, 8.2) },
    { id: 'umbravale-pilgrim', role: 'mountain-pilgrim', region: 'mountains', position: atTerrain(-1.4, -58.7) },
  ];
}

function setShadow(mesh: THREE.InstancedMesh, castShadow = true) {
  mesh.castShadow = castShadow;
  mesh.receiveShadow = false;
  mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  return mesh;
}

function populationCount(quality: QualityTier) {
  return quality === 'low' ? 8 : quality === 'medium' ? 12 : 16;
}

function applyPopulationPose(group: THREE.Group, elapsed: number, reducedMotion: boolean) {
  const members = group.userData.members as PopulationMember[] | undefined;
  if (!members) return;
  const cloaks = group.getObjectByName('world-population-cloaks') as THREE.InstancedMesh | undefined;
  const heads = group.getObjectByName('world-population-heads') as THREE.InstancedMesh | undefined;
  const brims = group.getObjectByName('world-population-hat-brims') as THREE.InstancedMesh | undefined;
  const crowns = group.getObjectByName('world-population-hat-crowns') as THREE.InstancedMesh | undefined;
  const staffs = group.getObjectByName('world-population-staffs') as THREE.InstancedMesh | undefined;
  if (!cloaks || !heads || !brims || !crowns || !staffs) return;

  const matrix = new THREE.Matrix4();
  const position = new THREE.Vector3();
  const rotation = new THREE.Quaternion();
  const scale = new THREE.Vector3(1, 1, 1);
  const offset = new THREE.Vector3();
  for (const [index, member] of members.entries()) {
    const motion = reducedMotion ? 0 : elapsed * member.pace + member.phase;
    const travel = reducedMotion ? 0 : Math.sin(motion * 0.55) * member.stride;
    const bob = reducedMotion ? 0 : Math.abs(Math.sin(motion * 1.1)) * 0.035;
    const yaw = member.yaw + (reducedMotion ? 0 : Math.sin(motion * 0.7) * 0.2);
    rotation.setFromAxisAngle(new THREE.Vector3(0, 1, 0), yaw);
    position.set(member.position[0] + Math.cos(member.yaw) * travel, member.position[1] + bob, member.position[2] + Math.sin(member.yaw) * travel);

    matrix.compose(offset.set(position.x, position.y + 0.9, position.z), rotation, scale);
    cloaks.setMatrixAt(index, matrix);
    matrix.compose(offset.set(position.x, position.y + 1.92, position.z), rotation, scale);
    heads.setMatrixAt(index, matrix);
    matrix.compose(offset.set(position.x, position.y + 2.18, position.z), rotation, scale);
    brims.setMatrixAt(index, matrix);
    matrix.compose(offset.set(position.x, position.y + 2.51, position.z), rotation, scale);
    crowns.setMatrixAt(index, matrix);
    offset.set(0.53, 1.05, 0.04).applyQuaternion(rotation).add(position);
    matrix.compose(offset, rotation, scale);
    staffs.setMatrixAt(index, matrix);
  }
  for (const batch of [cloaks, heads, brims, crowns, staffs]) batch.instanceMatrix.needsUpdate = true;
}

export function createWorldPopulation(manifest: WorldManifest) {
  const group = new THREE.Group();
  group.name = 'world-population';
  const count = populationCount(manifest.quality);
  const random = seededStream(manifest.seed, 'population/world-cast');
  const placements = createPlacements(manifest).slice(0, count);
  const availableLabels = [...LABELS];
  const members: PopulationMember[] = placements.map((placement) => {
    const labelIndex = Math.floor(random() * availableLabels.length);
    const [label] = availableLabels.splice(labelIndex, 1);
    return {
      ...placement,
      label,
      yaw: random() * Math.PI * 2,
      phase: random() * Math.PI * 2,
      pace: 0.52 + random() * 0.34,
      stride: placement.region === 'library' ? 0.12 : 0.2 + random() * 0.42,
    };
  });
  group.userData.members = members;
  group.userData.populationCount = count;

  const cloakMaterial = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.92, metalness: 0.02 });
  const skinMaterial = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.9 });
  const hatMaterial = new THREE.MeshStandardMaterial({ color: 0x24202e, roughness: 0.88 });
  const staffMaterial = new THREE.MeshStandardMaterial({ color: 0x493726, roughness: 0.94 });
  const cloaks = setShadow(new THREE.InstancedMesh(new THREE.ConeGeometry(0.48, 1.72, 8), cloakMaterial, count));
  const heads = setShadow(new THREE.InstancedMesh(new THREE.SphereGeometry(0.27, 10, 8), skinMaterial, count));
  const brims = setShadow(new THREE.InstancedMesh(new THREE.CylinderGeometry(0.43, 0.43, 0.07, 10), hatMaterial, count));
  const crowns = setShadow(new THREE.InstancedMesh(new THREE.ConeGeometry(0.28, 0.7, 9), hatMaterial, count));
  const staffs = setShadow(new THREE.InstancedMesh(new THREE.CylinderGeometry(0.035, 0.045, 1.9, 6), staffMaterial, count));
  cloaks.name = 'world-population-cloaks';
  heads.name = 'world-population-heads';
  brims.name = 'world-population-hat-brims';
  crowns.name = 'world-population-hat-crowns';
  staffs.name = 'world-population-staffs';

  members.forEach((member, index) => {
    const hue = (0.58 + random() * 0.34) % 1;
    cloaks.setColorAt(index, new THREE.Color().setHSL(hue, 0.34 + random() * 0.28, 0.25 + random() * 0.16));
    heads.setColorAt(index, new THREE.Color().setHSL(0.07 + random() * 0.04, 0.2 + random() * 0.22, 0.48 + random() * 0.24));
    const anchor = new THREE.Group();
    anchor.name = `world-npc-${member.id}`;
    anchor.position.set(...member.position);
    anchor.userData = { role: member.role, region: member.region, label: member.label, interactive: true, populationIndex: index };
    group.add(anchor);
  });
  if (cloaks.instanceColor) cloaks.instanceColor.needsUpdate = true;
  if (heads.instanceColor) heads.instanceColor.needsUpdate = true;
  group.add(cloaks, heads, brims, crowns, staffs);
  applyPopulationPose(group, 0, true);
  return group;
}

export class WorldPopulationSystem {
  private group: THREE.Group | null = null;

  constructor(root: THREE.Object3D) {
    this.setWorld(root);
  }

  setWorld(root: THREE.Object3D) {
    this.group = root.getObjectByName('world-population') as THREE.Group | null;
    if (this.group) applyPopulationPose(this.group, 0, true);
  }

  update(elapsed: number, reducedMotion = false) {
    if (this.group) applyPopulationPose(this.group, elapsed, reducedMotion);
  }

  get boundNpcCount() {
    return (this.group?.userData.members as PopulationMember[] | undefined)?.length ?? 0;
  }

  dispose() {
    if (this.group) applyPopulationPose(this.group, 0, true);
    this.group = null;
  }
}
