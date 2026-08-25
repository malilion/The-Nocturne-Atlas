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

export interface WorldValidationReport {
  ok: boolean;
  errors: string[];
  warnings: string[];
}

export interface WorldManifest {
  seed: string;
  seedHash: number;
  generatorVersion: '1.2.0';
  manifestHash: string;
  quality: QualityTier;
  towerHeights: number[];
  castleGraph: {
    nodes: CastleGraphNode[];
    edges: CastleGraphEdge[];
  };
  counts: WorldCounts;
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
  low: { towers: 4, houses: 12, trees: 150, fireflies: 40, candles: 60, wisps: 28, reeds: 80, shoreRocks: 34 },
  medium: { towers: 4, houses: 16, trees: 260, fireflies: 90, candles: 120, wisps: 60, reeds: 150, shoreRocks: 58 },
  high: { towers: 4, houses: 22, trees: 520, fireflies: 160, candles: 240, wisps: 110, reeds: 260, shoreRocks: 92 },
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
    { id: 'village', label: 'Lumen Row', subtitle: 'Village approach', position: [-57 + camera() * 5, 13 + camera() * 2, 34 + camera() * 4], target: [-31, 4, 13] },
    { id: 'lake', label: 'Mirror Mere', subtitle: 'Moonlit shoreline', position: [53 + camera() * 5, 10 + camera() * 2, 46 + camera() * 4], target: [28, -0.5, 18] },
    { id: 'forest', label: 'The Thorn Veil', subtitle: 'Ancient forest edge', position: [34 + camera() * 6, 15 + camera() * 3, -55 + camera() * 5], target: [15, 4, -43] },
    { id: 'tower', label: 'Astral Spire', subtitle: 'Upper observatory', position: [-24 + camera() * 4, 31 + camera() * 3, -15 + camera() * 4], target: [-7, 18, -4] },
  ].map((landmark) => ({
    ...landmark,
    position: [
      Number(landmark.position[0].toFixed(3)),
      Number(Math.max(landmark.position[1], terrainHeight(landmark.position[0], landmark.position[2], seedHash) + 7).toFixed(3)),
      Number(landmark.position[2].toFixed(3)),
    ],
  })) as WorldManifest['cameraLandmarks'];
  const towerHeights = [18 + castle() * 4, 23 + castle() * 5, 16 + castle() * 4, 14 + castle() * 5].map((height) => Number(height.toFixed(3)));
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
    generatorVersion: '1.2.0' as const,
    quality,
    towerHeights,
    castleGraph,
    counts: { ...QUALITY_COUNTS[quality] },
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
  for (const [name, count] of Object.entries(manifest.counts)) {
    if (!Number.isInteger(count) || count <= 0) errors.push(`Invalid ${name} count: ${count}`);
  }
  return { ok: errors.length === 0, errors, warnings };
}
