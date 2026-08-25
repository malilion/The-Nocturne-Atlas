import { terrainHeight, type VillageBuildingPlan, type WorldManifest } from './world-core.ts';

export const WALK_EYE_HEIGHT = 1.72;
export const WALK_PLAYER_RADIUS = 0.55;
const WORLD_LIMIT = 72.5;
const LAKE_INNER_RADIUS = 24.25;
const MAX_STEP_HEIGHT = 1.15;
const EMBELLISHMENT_BUILDINGS = [
  { position: [-24.5, -7] as [number, number], width: 11, depth: 6.2, rotation: 0 },
  { position: [-48.5, 22.2] as [number, number], width: 7.6, depth: 5.2, rotation: -0.14 },
  { position: [-17.5, 6.2] as [number, number], width: 6.2, depth: 5.2, rotation: -0.1 },
  { position: [-53, -33] as [number, number], width: 14, depth: 8, rotation: 0 },
];
const EMBELLISHMENT_CIRCLES = [
  { x: -31, z: 13, radius: 1.9 },
  { x: 18, z: -43, radius: 3.4 },
  { x: 50, z: -28, radius: 4.8 },
];

export interface WalkPoint {
  x: number;
  z: number;
}

export interface WalkResolution extends WalkPoint {
  groundY: number;
  blocked: boolean;
}

function pointInsideRotatedBuilding(point: WalkPoint, building: VillageBuildingPlan, padding: number) {
  const dx = point.x - building.position[0];
  const dz = point.z - building.position[1];
  const cosine = Math.cos(building.rotation);
  const sine = Math.sin(building.rotation);
  const localX = dx * cosine - dz * sine;
  const localZ = dx * sine + dz * cosine;
  return Math.abs(localX) <= building.width / 2 + padding && Math.abs(localZ) <= building.depth / 2 + padding;
}

function pointInsideEmbellishment(point: WalkPoint, padding: number) {
  if (EMBELLISHMENT_BUILDINGS.some((building) => pointInsideRotatedBuilding(point, {
    id: 'embellishment',
    side: 1,
    height: 1,
    roofHeight: 1,
    ...building,
  }, padding))) return true;
  return EMBELLISHMENT_CIRCLES.some((collider) => Math.hypot(point.x - collider.x, point.z - collider.z) <= collider.radius + padding);
}

function pointInsideCastle(point: WalkPoint, manifest: WorldManifest, padding: number) {
  for (const node of manifest.castleGraph.nodes) {
    if (node.type === 'courtyard') continue;
    const centerX = -7 + node.position[0];
    const centerZ = -4 + node.position[2];
    const dx = point.x - centerX;
    const dz = point.z - centerZ;
    if (node.type === 'hall') {
      if (Math.abs(dx) <= 8.5 + padding && Math.abs(dz) <= 5 + padding) return true;
    } else if (node.type === 'gate') {
      if (Math.abs(dx) <= 3.5 + padding && Math.abs(dz) <= 1.5 + padding) return true;
    } else if (Math.hypot(dx, dz) <= node.radius + padding) {
      return true;
    }
  }
  return false;
}

export function isWalkablePosition(point: WalkPoint, manifest: WorldManifest, padding = WALK_PLAYER_RADIUS) {
  if (!Number.isFinite(point.x) || !Number.isFinite(point.z)) return false;
  if (Math.abs(point.x) > WORLD_LIMIT - padding || Math.abs(point.z) > WORLD_LIMIT - padding) return false;

  const lake = manifest.zones.find((zone) => zone.type === 'lake');
  if (lake && Math.hypot(point.x - lake.center[0], point.z - lake.center[1]) < LAKE_INNER_RADIUS + padding) return false;
  if (pointInsideCastle(point, manifest, padding)) return false;
  if (manifest.villageBuildings.some((building) => pointInsideRotatedBuilding(point, building, padding))) return false;
  if (pointInsideEmbellishment(point, padding)) return false;
  return true;
}

function candidateIsReachable(current: WalkPoint, candidate: WalkPoint, manifest: WorldManifest) {
  if (!isWalkablePosition(candidate, manifest)) return false;
  const currentHeight = terrainHeight(current.x, current.z, manifest.seedHash);
  const candidateHeight = terrainHeight(candidate.x, candidate.z, manifest.seedHash);
  return Math.abs(candidateHeight - currentHeight) <= MAX_STEP_HEIGHT;
}

export function resolveWalkMovement(current: WalkPoint, desired: WalkPoint, manifest: WorldManifest): WalkResolution {
  const candidates: WalkPoint[] = [
    desired,
    { x: desired.x, z: current.z },
    { x: current.x, z: desired.z },
  ];
  const resolved = candidates.find((candidate) => candidateIsReachable(current, candidate, manifest)) ?? current;
  return {
    x: resolved.x,
    z: resolved.z,
    groundY: terrainHeight(resolved.x, resolved.z, manifest.seedHash),
    blocked: resolved.x !== desired.x || resolved.z !== desired.z,
  };
}
