export type QualityTier = 'low' | 'medium' | 'high';

export interface WorldCounts {
  towers: number;
  houses: number;
  trees: number;
  fireflies: number;
  candles: number;
  wisps: number;
  reeds: number;
  shoreRocks: number;
}

export interface CastleGraphNode {
  id: string;
  type: 'tower' | 'hall' | 'courtyard' | 'gate';
  position: [number, number, number];
  radius: number;
  height: number;
}

export interface CastleGraphEdge {
  id: string;
  from: string;
  to: string;
  type: 'corridor' | 'bridge' | 'moving-stair';
}

export interface VillageBuildingPlan {
  id: string;
  position: [number, number];
  side: -1 | 1;
  width: number;
  depth: number;
  height: number;
  rotation: number;
  roofHeight: number;
}

export interface ValidationView {
  id: 'castle-hero' | 'courtyard-stair' | 'village-approach' | 'forest-edge' | 'lake-shore' | 'aerial-orbit' | 'great-hall';
  label: string;
  subtitle: string;
  position: [number, number, number];
  target: [number, number, number];
}

export interface WorldValidationReport {
  ok: boolean;
  errors: string[];
  warnings: string[];
}

export interface WorldManifest {
  seed: string;
  seedHash: number;
  generatorVersion: '2.0.0';
  manifestHash: string;
  quality: QualityTier;
  towerHeights: number[];
  castleGraph: {
    nodes: CastleGraphNode[];
    edges: CastleGraphEdge[];
  };
  counts: WorldCounts;
  forestLod: {
    nearTrees: number;
    farTrees: number;
    splitRadius: number;
  };
  villageBuildings: VillageBuildingPlan[];
  validationViews: ValidationView[];
  cameraLandmarks: Array<{
    id: 'castle' | 'village' | 'lake' | 'forest' | 'tower';
    label: string;
    subtitle: string;
    position: [number, number, number];
    target: [number, number, number];
  }>;
  zones: Array<{ id: string; type: 'castle' | 'village' | 'forest' | 'lake'; center: [number, number]; radius: number }>;
}

export const QUALITY_COUNTS: Record<QualityTier, WorldCounts> = {
  low: { towers: 4, houses: 12, trees: 180, fireflies: 40, candles: 60, wisps: 28, reeds: 80, shoreRocks: 34 },
  medium: { towers: 4, houses: 16, trees: 420, fireflies: 90, candles: 120, wisps: 60, reeds: 150, shoreRocks: 58 },
  high: { towers: 4, houses: 22, trees: 1100, fireflies: 160, candles: 240, wisps: 110, reeds: 260, shoreRocks: 92 },
};

export function hashSeed(value: string) {
  let hash = 2166136261;
  for (let i = 0; i < value.length; i += 1) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

export function mulberry32(seed: number) {
  return () => {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function seededStream(seed: string, namespace: string) {
  return mulberry32(hashSeed(`${seed.trim().toUpperCase()}::${namespace}`));
}

export function seededNoise(x: number, z: number, seed: number) {
  const value = Math.sin(x * 12.9898 + z * 78.233 + seed * 0.001) * 43758.5453;
  return value - Math.floor(value);
}

export function terrainHeight(x: number, z: number, seed: number) {
  const broad = Math.sin(x * 0.045 + seed) * 1.8 + Math.cos(z * 0.052 - seed) * 1.4;
  const detail = (seededNoise(Math.floor(x * 0.2), Math.floor(z * 0.2), seed) - 0.5) * 1.4;
  const castleRise = 8 * Math.exp(-((x + 7) ** 2 + (z + 4) ** 2) / 580);
  const lakeBasin = 5.5 * Math.exp(-((x - 28) ** 2 + (z - 18) ** 2) / 700);
  return broad + detail + castleRise - lakeBasin;
}

function digestManifest(value: unknown) {
  return hashSeed(JSON.stringify(value)).toString(16).padStart(8, '0').toUpperCase();
}

export function createWorldManifest(seedText: string, quality: QualityTier): WorldManifest {
  const seed = seedText.trim().toUpperCase() || 'MAGIC-001';
  const castle = seededStream(seed, 'castle/massing');
  const camera = seededStream(seed, 'camera/tour');
  const seedHash = hashSeed(seed);
  const cameraLandmarks: WorldManifest['cameraLandmarks'] = [
    { id: 'castle', label: 'Castle of Veyra', subtitle: 'Central highlands', position: [34 + camera() * 5, 27 + camera() * 3, -44 + camera() * 5], target: [-7, 11, -4] },
    { id: 'village', label: 'Lumen Row', subtitle: 'Village approach', position: [-60 + camera() * 4, 21 + camera() * 2, 10 + camera() * 3], target: [-31, 4, 13] },
    { id: 'lake', label: 'Mirror Mere', subtitle: 'Moonlit shoreline', position: [53 + camera() * 5, 10 + camera() * 2, 46 + camera() * 4], target: [28, -0.5, 18] },
    { id: 'forest', label: 'The Thorn Veil', subtitle: 'Ancient forest edge', position: [49 + camera() * 5, 25 + camera() * 2, -61 + camera() * 4], target: [15, 5, -38] },
    { id: 'tower', label: 'Astral Spire', subtitle: 'Upper observatory', position: [-39 + camera() * 4, 37 + camera() * 3, 11 + camera() * 3], target: [-9, 16, -3] },
  ].map((landmark) => ({
    ...landmark,
    position: [
      Number(landmark.position[0].toFixed(3)),
      Number(Math.max(landmark.position[1], terrainHeight(landmark.position[0], landmark.position[2], seedHash) + 7).toFixed(3)),
      Number(landmark.position[2].toFixed(3)),
    ],
  })) as WorldManifest['cameraLandmarks'];
  const validationCamera = seededStream(seed, 'camera/validation');
  const castleBaseY = terrainHeight(-7, -4, seedHash) + 0.2;
  const landmarkById = Object.fromEntries(cameraLandmarks.map((landmark) => [landmark.id, landmark])) as Record<WorldManifest['cameraLandmarks'][number]['id'], WorldManifest['cameraLandmarks'][number]>;
  const validationViews: ValidationView[] = [
    { id: 'castle-hero', label: 'Castle Hero', subtitle: 'Silhouette and warm windows', position: [...landmarkById.castle.position], target: [...landmarkById.castle.target] },
    { id: 'courtyard-stair', label: 'Moving Stair', subtitle: 'Courtyard connection study', position: [-29 + validationCamera() * 3, 28 + validationCamera() * 2, 34 + validationCamera() * 3], target: [2, 18, 3] },
    { id: 'village-approach', label: 'Village Approach', subtitle: 'Road and building alignment', position: [...landmarkById.village.position], target: [...landmarkById.village.target] },
    { id: 'forest-edge', label: 'Forest Edge', subtitle: 'Near and far vegetation', position: [...landmarkById.forest.position], target: [...landmarkById.forest.target] },
    { id: 'lake-shore', label: 'Lake Shore', subtitle: 'Water and shared boundary', position: [...landmarkById.lake.position], target: [...landmarkById.lake.target] },
    { id: 'aerial-orbit', label: 'Aerial Survey', subtitle: 'World zoning overview', position: [2 + validationCamera() * 4, 68 + validationCamera() * 4, 64 + validationCamera() * 5], target: [-7, 1, -4] },
    { id: 'great-hall', label: 'The Great Hall', subtitle: 'Seeded castle interior', position: [-8, castleBaseY + 3.2, 0], target: [-8, castleBaseY + 2.8, -8] },
  ].map((view) => ({
    ...view,
    position: [
      Number(view.position[0].toFixed(3)),
      Number(Math.max(view.position[1], terrainHeight(view.position[0], view.position[2], seedHash) + (view.id === 'great-hall' ? 1.7 : 7)).toFixed(3)),
      Number(view.position[2].toFixed(3)),
    ],
  })) as ValidationView[];
  const towerHeights = [18 + castle() * 4, 23 + castle() * 5, 16 + castle() * 4, 14 + castle() * 5].map((height) => Number(height.toFixed(3)));
  const counts = { ...QUALITY_COUNTS[quality] };
  const nearTreeRatio = quality === 'low' ? 0.25 : quality === 'medium' ? 0.35 : 0.4;
  const nearTrees = Math.round(counts.trees * nearTreeRatio);
  const forestLod: WorldManifest['forestLod'] = {
    nearTrees,
    farTrees: counts.trees - nearTrees,
    splitRadius: quality === 'low' ? 46 : quality === 'medium' ? 52 : 56,
  };
  const village = seededStream(seed, 'village/buildings');
  const villageBuildings: VillageBuildingPlan[] = Array.from({ length: counts.houses }, (_, index) => {
    const side = (index % 2 === 0 ? -1 : 1) as -1 | 1;
    const laneIndex = Math.floor(index / 2);
    return {
      id: `lumen-house-${String(index + 1).padStart(2, '0')}`,
      position: [
        Number((-53 + laneIndex * 4.05 + (village() - 0.5) * 0.35).toFixed(3)),
        Number((13 + side * (4.9 + village() * 1.3)).toFixed(3)),
      ],
      side,
      width: Number((2.4 + village() * 0.7).toFixed(3)),
      depth: Number((2.8 + village() * 0.9).toFixed(3)),
      height: Number((3 + village() * 2.4).toFixed(3)),
      rotation: Number((-0.14 + (village() - 0.5) * 0.16).toFixed(3)),
      roofHeight: Number((2.3 + village()).toFixed(3)),
    };
  });
  const castleGraph: WorldManifest['castleGraph'] = {
    nodes: [
      { id: 'astral-spire', type: 'tower', position: [-9, 0, -3], radius: 3.6, height: towerHeights[0] },
      { id: 'moon-tower', type: 'tower', position: [7, 0, -5], radius: 3, height: towerHeights[1] },
      { id: 'archive-tower', type: 'tower', position: [2, 0, 8], radius: 4, height: towerHeights[2] },
      { id: 'owlery', type: 'tower', position: [-12, 0, 8], radius: 2.7, height: towerHeights[3] },
      { id: 'great-hall', type: 'hall', position: [-1, 0, 0], radius: 8.5, height: 9 },
      { id: 'inner-court', type: 'courtyard', position: [-3, 0, 7], radius: 5.5, height: 0 },
      { id: 'south-gate', type: 'gate', position: [0, 0, 13], radius: 3.2, height: 6 },
    ],
    edges: [
      { id: 'hall-astral', from: 'great-hall', to: 'astral-spire', type: 'corridor' },
      { id: 'hall-moon', from: 'great-hall', to: 'moon-tower', type: 'moving-stair' },
      { id: 'hall-court', from: 'great-hall', to: 'inner-court', type: 'corridor' },
      { id: 'court-archive', from: 'inner-court', to: 'archive-tower', type: 'bridge' },
      { id: 'court-owlery', from: 'inner-court', to: 'owlery', type: 'bridge' },
      { id: 'court-gate', from: 'inner-court', to: 'south-gate', type: 'corridor' },
    ],
  };
  const base = {
    seed,
    seedHash,
    generatorVersion: '2.0.0' as const,
    quality,
    towerHeights,
    castleGraph,
    counts,
    forestLod,
    villageBuildings,
    validationViews,
    cameraLandmarks,
    zones: [
      { id: 'castle-core', type: 'castle' as const, center: [-7, -4] as [number, number], radius: 25 },
      { id: 'lumen-row', type: 'village' as const, center: [-31, 13] as [number, number], radius: 24 },
      { id: 'thorn-veil', type: 'forest' as const, center: [0, 0] as [number, number], radius: 72 },
      { id: 'mirror-mere', type: 'lake' as const, center: [28, 18] as [number, number], radius: 26 },
    ],
  };
  return { ...base, manifestHash: digestManifest(base) };
}

function catmullRomComponent(p0: number, p1: number, p2: number, p3: number, t: number) {
  const t2 = t * t;
  const t3 = t2 * t;
  return 0.5 * ((2 * p1) + (-p0 + p2) * t + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t2 + (-p0 + 3 * p1 - 3 * p2 + p3) * t3);
}

export function sampleClosedTourPosition(landmarks: WorldManifest['cameraLandmarks'], segment: number, t: number): [number, number, number] {
  const count = landmarks.length;
  if (count < 4) throw new Error('A closed camera tour requires at least four landmarks.');
  const point = (offset: number) => landmarks[(segment + offset + count) % count].position;
  const p0 = point(-1);
  const p1 = point(0);
  const p2 = point(1);
  const p3 = point(2);
  return [
    catmullRomComponent(p0[0], p1[0], p2[0], p3[0], t),
    catmullRomComponent(p0[1], p1[1], p2[1], p3[1], t),
    catmullRomComponent(p0[2], p1[2], p2[2], p3[2], t),
  ];
}

export function validateWorldManifest(manifest: WorldManifest): WorldValidationReport {
  const errors: string[] = [];
  const warnings: string[] = [];
  const nodeIds = new Set<string>();
  for (const node of manifest.castleGraph.nodes) {
    if (nodeIds.has(node.id)) errors.push(`Duplicate castle node: ${node.id}`);
    nodeIds.add(node.id);
    if (![...node.position, node.radius, node.height].every(Number.isFinite)) errors.push(`Non-finite castle node: ${node.id}`);
    if (node.radius <= 0) errors.push(`Castle node has no footprint: ${node.id}`);
  }

  const adjacency = new Map([...nodeIds].map((id) => [id, new Set<string>()]));
  const edgeIds = new Set<string>();
  for (const edge of manifest.castleGraph.edges) {
    if (edgeIds.has(edge.id)) errors.push(`Duplicate castle edge: ${edge.id}`);
    edgeIds.add(edge.id);
    if (!nodeIds.has(edge.from) || !nodeIds.has(edge.to)) {
      errors.push(`Castle edge ${edge.id} references a missing node.`);
      continue;
    }
    adjacency.get(edge.from)?.add(edge.to);
    adjacency.get(edge.to)?.add(edge.from);
  }

  const firstNode = manifest.castleGraph.nodes[0]?.id;
  const visited = new Set<string>();
  if (firstNode) {
    const pending = [firstNode];
    while (pending.length) {
      const current = pending.pop()!;
      if (visited.has(current)) continue;
      visited.add(current);
      adjacency.get(current)?.forEach((neighbor) => pending.push(neighbor));
    }
  }
  if (visited.size !== nodeIds.size) errors.push(`Castle graph is disconnected (${visited.size}/${nodeIds.size} nodes reachable).`);

  const towerCount = manifest.castleGraph.nodes.filter((node) => node.type === 'tower').length;
  if (towerCount !== manifest.counts.towers) errors.push(`Castle tower count mismatch (${towerCount}/${manifest.counts.towers}).`);
  if (!manifest.castleGraph.edges.some((edge) => edge.type === 'moving-stair')) warnings.push('Castle graph has no moving staircase route.');
  if (manifest.forestLod.nearTrees + manifest.forestLod.farTrees !== manifest.counts.trees) errors.push('Forest LOD counts do not match the total tree count.');
  if (manifest.forestLod.nearTrees <= 0 || manifest.forestLod.farTrees <= 0 || manifest.forestLod.splitRadius <= 0) errors.push('Forest LOD policy is invalid.');
  if (manifest.villageBuildings.length !== manifest.counts.houses) errors.push('Village building plan does not match the requested house count.');
  const villageZone = manifest.zones.find((zone) => zone.type === 'village');
  for (const building of manifest.villageBuildings) {
    if (![...building.position, building.width, building.depth, building.height, building.rotation, building.roofHeight].every(Number.isFinite)) {
      errors.push(`Village building has non-finite parameters: ${building.id}`);
      continue;
    }
    if (building.width <= 0 || building.depth <= 0 || building.height <= 0 || building.roofHeight <= 0) errors.push(`Village building has invalid dimensions: ${building.id}`);
    if (Math.abs(building.rotation + 0.14) > 0.1) errors.push(`Village building does not face the main road: ${building.id}`);
    const roadSetback = Math.abs(building.position[1] - 13) - building.depth / 2;
    if (roadSetback < 2.5) errors.push(`Village building violates the road setback: ${building.id}`);
    if (villageZone && Math.hypot(building.position[0] - villageZone.center[0], building.position[1] - villageZone.center[1]) > villageZone.radius) errors.push(`Village building lies outside its zone: ${building.id}`);
    if (Math.hypot(building.position[0] + 7, building.position[1] + 4) < 11) errors.push(`Village building enters the castle exclusion field: ${building.id}`);
    if (Math.hypot(building.position[0] - 28, building.position[1] - 18) < 29) errors.push(`Village building enters the lake exclusion field: ${building.id}`);
    const cornerHeights = [
      terrainHeight(building.position[0] - building.width / 2, building.position[1] - building.depth / 2, manifest.seedHash),
      terrainHeight(building.position[0] + building.width / 2, building.position[1] - building.depth / 2, manifest.seedHash),
      terrainHeight(building.position[0] - building.width / 2, building.position[1] + building.depth / 2, manifest.seedHash),
      terrainHeight(building.position[0] + building.width / 2, building.position[1] + building.depth / 2, manifest.seedHash),
    ];
    if (Math.max(...cornerHeights) - Math.min(...cornerHeights) > 4.2) errors.push(`Village building exceeds the terrain slope budget: ${building.id}`);
  }
  for (let first = 0; first < manifest.villageBuildings.length; first += 1) {
    for (let second = first + 1; second < manifest.villageBuildings.length; second += 1) {
      const a = manifest.villageBuildings[first];
      const b = manifest.villageBuildings[second];
      const overlapsX = Math.abs(a.position[0] - b.position[0]) < (a.width + b.width) / 2 + 0.25;
      const overlapsZ = Math.abs(a.position[1] - b.position[1]) < (a.depth + b.depth) / 2 + 0.25;
      if (overlapsX && overlapsZ) errors.push(`Village buildings overlap: ${a.id} / ${b.id}`);
    }
  }

  const zoneIds = new Set<string>();
  for (const zone of manifest.zones) {
    if (zoneIds.has(zone.id)) errors.push(`Duplicate world zone: ${zone.id}`);
    zoneIds.add(zone.id);
    if (![...zone.center, zone.radius].every(Number.isFinite) || zone.radius <= 0) errors.push(`Invalid world zone: ${zone.id}`);
  }
  if (!manifest.zones.some((zone) => zone.type === 'lake')) errors.push('World has no lake boundary.');

  for (const landmark of manifest.cameraLandmarks) {
    if (![...landmark.position, ...landmark.target].every(Number.isFinite)) errors.push(`Invalid camera landmark: ${landmark.id}`);
    const ground = terrainHeight(landmark.position[0], landmark.position[2], manifest.seedHash);
    if (landmark.position[1] < ground + 6.8) errors.push(`Camera landmark intersects terrain: ${landmark.id}`);
  }
  const expectedValidationViews: ValidationView['id'][] = ['castle-hero', 'courtyard-stair', 'village-approach', 'forest-edge', 'lake-shore', 'aerial-orbit', 'great-hall'];
  if (manifest.validationViews.length !== expectedValidationViews.length || expectedValidationViews.some((id) => !manifest.validationViews.some((view) => view.id === id))) errors.push('Fixed visual validation views are incomplete.');
  for (const view of manifest.validationViews) {
    if (![...view.position, ...view.target].every(Number.isFinite)) errors.push(`Invalid visual validation view: ${view.id}`);
    const ground = terrainHeight(view.position[0], view.position[2], manifest.seedHash);
    const minimumClearance = view.id === 'great-hall' ? 1.6 : 6.8;
    if (view.position[1] < ground + minimumClearance) errors.push(`Visual validation view intersects terrain: ${view.id}`);
  }
  if (manifest.cameraLandmarks.length >= 4) {
    for (let segment = 0; segment < manifest.cameraLandmarks.length; segment += 1) {
      for (let step = 0; step <= 16; step += 1) {
        const position = sampleClosedTourPosition(manifest.cameraLandmarks, segment, step / 16);
        const ground = terrainHeight(position[0], position[2], manifest.seedHash);
        if (!position.every(Number.isFinite) || position[1] < ground + 4) {
          errors.push(`Camera tour segment ${segment} approaches terrain (${position[1].toFixed(2)}m camera / ${ground.toFixed(2)}m ground).`);
          break;
        }
      }
    }
  }
  for (const [name, count] of Object.entries(manifest.counts)) {
    if (!Number.isInteger(count) || count <= 0) errors.push(`Invalid ${name} count: ${count}`);
  }
  return { ok: errors.length === 0, errors, warnings };
}
