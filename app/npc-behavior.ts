import * as THREE from 'three';
import { seededStream } from './world-core.ts';

export interface NpcMotionProfile {
  speed: number;
  patrolX: number;
  patrolZ: number;
  phase: number;
  gestureRate: number;
}

export function createNpcMotionProfile(seed: string, npcId: string): NpcMotionProfile {
  const random = seededStream(seed, `npc-motion/${npcId}`);
  return {
    speed: Number((0.26 + random() * 0.22).toFixed(4)),
    patrolX: Number((0.55 + random() * 0.7).toFixed(4)),
    patrolZ: Number((0.32 + random() * 0.55).toFixed(4)),
    phase: Number((random() * Math.PI * 2).toFixed(4)),
    gestureRate: Number((0.7 + random() * 0.65).toFixed(4)),
  };
}

interface NpcBinding {
  object: THREE.Object3D;
  basePosition: THREE.Vector3;
  baseRotationY: number;
  baseScale: THREE.Vector3;
}

export class NpcBehaviorSystem {
  private clerk: NpcBinding | null = null;
  private conductorAnchor: NpcBinding | null = null;
  private conductor: NpcBinding | null = null;
  private questBadge: NpcBinding | null = null;
  private clerkProfile: NpcMotionProfile;
  private conductorProfile: NpcMotionProfile;

  constructor(root: THREE.Object3D, seed: string) {
    this.clerkProfile = createNpcMotionProfile(seed, 'clerk-elyra');
    this.conductorProfile = createNpcMotionProfile(seed, 'veilcross-conductor');
    this.setWorld(root, seed);
  }

  private bind(object: THREE.Object3D | undefined): NpcBinding | null {
    return object ? {
      object,
      basePosition: object.position.clone(),
      baseRotationY: object.rotation.y,
      baseScale: object.scale.clone(),
    } : null;
  }

  private restore() {
    for (const binding of [this.clerk, this.conductorAnchor, this.conductor, this.questBadge]) {
      if (!binding) continue;
      binding.object.position.copy(binding.basePosition);
      binding.object.rotation.y = binding.baseRotationY;
      binding.object.scale.copy(binding.baseScale);
    }
  }

  setWorld(root: THREE.Object3D, seed: string) {
    this.restore();
    this.clerkProfile = createNpcMotionProfile(seed, 'clerk-elyra');
    this.conductorProfile = createNpcMotionProfile(seed, 'veilcross-conductor');
    this.clerk = this.bind(root.getObjectByName('veilcross-clerk-elyra'));
    this.conductorAnchor = this.bind(root.getObjectByName('station-npc-conductor-anchor'));
    this.conductor = this.bind(root.getObjectByName('veilcross-conductor'));
    this.questBadge = this.bind(root.getObjectByName('veilcross-clerk-elyra-quest-badge'));
  }

  update(elapsed: number, reducedMotion = false) {
    if (reducedMotion) {
      this.restore();
      return;
    }
    if (this.clerk) {
      const gesture = elapsed * this.clerkProfile.gestureRate + this.clerkProfile.phase;
      this.clerk.object.position.y = this.clerk.basePosition.y + Math.sin(gesture * 1.7) * 0.025;
      this.clerk.object.rotation.y = this.clerk.baseRotationY + Math.sin(gesture) * 0.11;
    }
    if (this.conductorAnchor) {
      const patrol = elapsed * this.conductorProfile.speed + this.conductorProfile.phase;
      this.conductorAnchor.object.position.x = this.conductorAnchor.basePosition.x + Math.sin(patrol) * this.conductorProfile.patrolX;
      this.conductorAnchor.object.position.z = this.conductorAnchor.basePosition.z + Math.sin(patrol * 2) * this.conductorProfile.patrolZ;
    }
    if (this.conductor) {
      const patrol = elapsed * this.conductorProfile.speed + this.conductorProfile.phase;
      this.conductor.object.rotation.y = this.conductor.baseRotationY + Math.cos(patrol) * 0.34;
      this.conductor.object.position.y = this.conductor.basePosition.y + Math.abs(Math.sin(patrol * 2)) * 0.035;
    }
    if (this.questBadge) {
      const pulse = 1 + Math.sin(elapsed * 2.4 + this.clerkProfile.phase) * 0.16;
      this.questBadge.object.scale.copy(this.questBadge.baseScale).multiplyScalar(pulse);
    }
  }

  get boundNpcCount() {
    return Number(Boolean(this.clerk)) + Number(Boolean(this.conductor));
  }

  dispose() {
    this.restore();
    this.clerk = null;
    this.conductorAnchor = null;
    this.conductor = null;
    this.questBadge = null;
  }
}
