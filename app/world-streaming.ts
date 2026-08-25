import * as THREE from 'three';
import type { QualityTier, WorldManifest, WorldZoneType } from './world-core.ts';

interface StreamChunkDefinition {
  id: string;
  objectName: string;
  zoneType: WorldZoneType;
}

interface StreamChunk extends StreamChunkDefinition {
  object: THREE.Object3D;
  center: THREE.Vector2;
  activationDistance: number;
  releaseDistance: number;
  active: boolean;
}

export interface StreamingStatus {
  active: number;
  total: number;
}

const CHUNK_DEFINITIONS: readonly StreamChunkDefinition[] = [
  { id: 'castle-detail', objectName: 'castle-embellishments', zoneType: 'castle' },
  { id: 'village-detail', objectName: 'village-embellishments', zoneType: 'village' },
  { id: 'mountain-region', objectName: 'umbravale-mountain-range', zoneType: 'mountains' },
  { id: 'ruins-region', objectName: 'orison-ruins-region', zoneType: 'ruins' },
  { id: 'station-region', objectName: 'veilcross-station-region', zoneType: 'station' },
] as const;

const STREAMING_DISTANCES: Record<QualityTier, { activation: number; release: number }> = {
  low: { activation: 48, release: 60 },
  medium: { activation: 58, release: 72 },
  high: { activation: 74, release: 90 },
};

export class WorldStreamingSystem {
  private chunks: StreamChunk[] = [];
  private enabled = true;

  constructor(root: THREE.Object3D, manifest: WorldManifest, quality: QualityTier) {
    this.setWorld(root, manifest, quality);
  }

  setWorld(root: THREE.Object3D, manifest: WorldManifest, quality: QualityTier) {
    this.chunks.forEach((chunk) => { chunk.object.visible = true; });
    const distances = STREAMING_DISTANCES[quality];
    this.chunks = CHUNK_DEFINITIONS.flatMap((definition) => {
      const object = root.getObjectByName(definition.objectName);
      const zone = manifest.zones.find((candidate) => candidate.type === definition.zoneType);
      if (!object || !zone) return [];
      const zoneAllowance = Math.min(zone.radius, 26) * 0.3;
      return [{
        ...definition,
        object,
        center: new THREE.Vector2(...zone.center),
        activationDistance: distances.activation + zoneAllowance,
        releaseDistance: distances.release + zoneAllowance,
        active: true,
      }];
    });
    if (!this.enabled) this.chunks.forEach((chunk) => { chunk.object.visible = true; });
  }

  setEnabled(enabled: boolean) {
    this.enabled = enabled;
    if (!enabled) {
      this.chunks.forEach((chunk) => {
        chunk.active = true;
        chunk.object.visible = true;
      });
    }
  }

  update(cameraPosition: THREE.Vector3, forceAll = false): StreamingStatus {
    for (const chunk of this.chunks) {
      const distance = Math.hypot(cameraPosition.x - chunk.center.x, cameraPosition.z - chunk.center.y);
      const shouldActivate = !this.enabled || forceAll || distance <= chunk.activationDistance;
      const shouldRelease = this.enabled && !forceAll && distance > chunk.releaseDistance;
      if (shouldActivate) chunk.active = true;
      else if (shouldRelease) chunk.active = false;
      chunk.object.visible = chunk.active;
    }
    return this.status;
  }

  get status(): StreamingStatus {
    return {
      active: this.chunks.filter((chunk) => chunk.active).length,
      total: this.chunks.length,
    };
  }

  dispose() {
    this.chunks.forEach((chunk) => { chunk.object.visible = true; });
    this.chunks = [];
  }
}
