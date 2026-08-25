import assert from 'node:assert/strict';
import test from 'node:test';
import * as THREE from 'three';
import { createWorldManifest } from '../app/world-core.ts';
import { createWorldPopulation, WorldPopulationSystem } from '../app/world-population.ts';

test('world population covers every major region with interactive anchors', () => {
  const population = createWorldPopulation(createWorldManifest('MAGIC-001', 'medium'));
  const members = population.userData.members as Array<{ region: string }>;
  assert.equal(members.length, 12);
  assert.deepEqual(new Set(members.map((member) => member.region)), new Set(['castle', 'village', 'forest', 'lake', 'mountains', 'ruins', 'station', 'library']));
  const anchors = population.children.filter((child) => child.name.startsWith('world-npc-'));
  assert.equal(anchors.length, 12);
  assert.ok(anchors.every((anchor) => anchor.userData.interactive && anchor.userData.label && anchor.userData.role));
  assert.equal((population.getObjectByName('world-population-cloaks') as THREE.InstancedMesh).count, 12);
});

test('population cast and motion are deterministic, animated, and reduced-motion safe', () => {
  const first = createWorldPopulation(createWorldManifest('MAGIC-001', 'medium'));
  const repeat = createWorldPopulation(createWorldManifest('MAGIC-001', 'medium'));
  const changed = createWorldPopulation(createWorldManifest('MAGIC-002', 'medium'));
  assert.deepEqual(first.userData.members, repeat.userData.members);
  assert.notDeepEqual(first.userData.members, changed.userData.members);

  const system = new WorldPopulationSystem(first);
  const cloaks = first.getObjectByName('world-population-cloaks') as THREE.InstancedMesh;
  const base = Array.from(cloaks.instanceMatrix.array);
  system.update(4.2);
  assert.notDeepEqual(Array.from(cloaks.instanceMatrix.array), base);
  system.update(8.4, true);
  assert.deepEqual(Array.from(cloaks.instanceMatrix.array), base);
  assert.equal(system.boundNpcCount, 12);
  system.dispose();
  assert.equal(system.boundNpcCount, 0);
});
