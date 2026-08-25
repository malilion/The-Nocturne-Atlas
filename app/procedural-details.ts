import { hashSeed, mulberry32 } from './world-core.ts';

export interface CastleDetailProfile {
  battlementScale: number;
  buttressDepth: number;
  gateArchScale: number;
}

export interface VillageDetailProfile {
  chimneySide: -1 | 1;
  chimneyOffset: number;
  signSide: -1 | 1;
  hasSign: boolean;
}

export interface ForestTreeDetailProfile {
  heightScale: number;
  trunkWidth: number;
  leanX: number;
  leanZ: number;
  canopyWidth: number;
  upperCanopyScale: number;
  canopyTwist: number;
}

function detailStream(seed: string, namespace: string, index = 0) {
  return mulberry32(hashSeed(`${seed.trim().toUpperCase()}::details/${namespace}/${index}`));
}

export function createCastleDetailProfile(seed: string): CastleDetailProfile {
  const random = detailStream(seed, 'castle');
  return {
    battlementScale: 0.88 + random() * 0.22,
    buttressDepth: 1.15 + random() * 0.42,
    gateArchScale: 0.92 + random() * 0.16,
  };
}

export function createVillageDetailProfile(seed: string, index: number): VillageDetailProfile {
  const random = detailStream(seed, 'village', index);
  return {
    chimneySide: random() < 0.5 ? -1 : 1,
    chimneyOffset: 0.42 + random() * 0.28,
    signSide: random() < 0.5 ? -1 : 1,
    hasSign: index % 4 === 0,
  };
}

export function createForestTreeDetailProfile(seed: string, index: number): ForestTreeDetailProfile {
  const random = detailStream(seed, 'forest', index);
  return {
    heightScale: 0.82 + random() * 0.44,
    trunkWidth: 0.78 + random() * 0.44,
    leanX: (random() - 0.5) * 0.14,
    leanZ: (random() - 0.5) * 0.14,
    canopyWidth: 0.78 + random() * 0.5,
    upperCanopyScale: 0.58 + random() * 0.2,
    canopyTwist: random() * Math.PI * 2,
  };
}
