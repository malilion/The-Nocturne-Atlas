export type QualityTier = 'low' | 'medium' | 'high';

export interface WorldCounts {
  towers: number;
  houses: number;
  trees: number;
  fireflies: number;
  candles: number;
  wisps: number;
}

export interface WorldManifest {
  seed: string;
  seedHash: number;
  generatorVersion: '1.1.0';
  manifestHash: string;
  quality: QualityTier;
  towerHeights: number[];
  counts: WorldCounts;
  zones: Array<{ id: string; type: 'castle' | 'village' | 'forest' | 'lake'; center: [number, number]; radius: number }>;
}

export const QUALITY_COUNTS: Record<QualityTier, WorldCounts> = {
  low: { towers: 4, houses: 12, trees: 150, fireflies: 40, candles: 60, wisps: 28 },
  medium: { towers: 4, houses: 16, trees: 260, fireflies: 90, candles: 120, wisps: 60 },
  high: { towers: 4, houses: 22, trees: 520, fireflies: 160, candles: 240, wisps: 110 },
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
  const base = {
    seed,
    seedHash: hashSeed(seed),
    generatorVersion: '1.1.0' as const,
    quality,
    towerHeights: [18 + castle() * 4, 23 + castle() * 5, 16 + castle() * 4, 14 + castle() * 5].map((height) => Number(height.toFixed(3))),
    counts: { ...QUALITY_COUNTS[quality] },
    zones: [
      { id: 'castle-core', type: 'castle' as const, center: [-7, -4] as [number, number], radius: 25 },
      { id: 'lumen-row', type: 'village' as const, center: [-31, 13] as [number, number], radius: 24 },
      { id: 'thorn-veil', type: 'forest' as const, center: [0, 0] as [number, number], radius: 72 },
      { id: 'mirror-mere', type: 'lake' as const, center: [28, 18] as [number, number], radius: 26 },
    ],
  };
  return { ...base, manifestHash: digestManifest(base) };
}
