import assert from 'node:assert/strict';
import test from 'node:test';
import * as THREE from 'three';
import { createNpcMotionProfile, NpcBehaviorSystem } from '../app/npc-behavior.ts';

function createNpcRoot() {
  const root = new THREE.Group();
  const clerk = new THREE.Group();
  clerk.name = 'veilcross-clerk-elyra';
  clerk.position.set(2.3, 0, -3.3);
  const badge = new THREE.Group();
  badge.name = 'veilcross-clerk-elyra-quest-badge';
  clerk.add(badge);
  const anchor = new THREE.Group();
  anchor.name = 'station-npc-conductor-anchor';
  anchor.position.set(4.8, 0.48, 2.85);
  const conductor = new THREE.Group();
  conductor.name = 'veilcross-conductor';
  conductor.rotation.y = -2.1;
  anchor.add(conductor);
  root.add(clerk, anchor);
  return root;
}

test('NPC motion profiles are deterministic, seed-sensitive, and bounded', () => {
  const profile = createNpcMotionProfile('MAGIC-001', 'conductor');
  assert.deepEqual(profile, createNpcMotionProfile('MAGIC-001', 'conductor'));
  assert.notDeepEqual(profile, createNpcMotionProfile('MAGIC-002', 'conductor'));
  assert.ok(profile.speed >= 0.26 && profile.speed <= 0.48);
  assert.ok(profile.patrolX >= 0.55 && profile.patrolX <= 1.25);
  assert.ok(profile.patrolZ >= 0.32 && profile.patrolZ <= 0.87);
});

test('NPC behavior animates bound figures and restores stable reduced-motion poses', () => {
  const root = createNpcRoot();
  const anchor = root.getObjectByName('station-npc-conductor-anchor')!;
  const conductor = root.getObjectByName('veilcross-conductor')!;
  const clerk = root.getObjectByName('veilcross-clerk-elyra')!;
  const anchorBase = anchor.position.clone();
  const conductorRotation = conductor.rotation.y;
  const clerkBase = clerk.position.clone();
  const behavior = new NpcBehaviorSystem(root, 'MAGIC-001');
  assert.equal(behavior.boundNpcCount, 2);
  behavior.update(12.5);
  assert.notDeepEqual(anchor.position.toArray(), anchorBase.toArray());
  assert.notEqual(conductor.rotation.y, conductorRotation);
  assert.notDeepEqual(clerk.position.toArray(), clerkBase.toArray());
  assert.ok([...anchor.position.toArray(), conductor.rotation.y].every(Number.isFinite));
  behavior.update(14, true);
  assert.deepEqual(anchor.position.toArray(), anchorBase.toArray());
  assert.equal(conductor.rotation.y, conductorRotation);
  assert.deepEqual(clerk.position.toArray(), clerkBase.toArray());
  behavior.dispose();
  behavior.dispose();
});
