import assert from 'node:assert/strict';
import test from 'node:test';
import * as THREE from 'three';
import { createStationHallInterior } from '../app/station-hall.ts';

const createMaterials = () => ({
  stone: new THREE.MeshStandardMaterial(),
  wood: new THREE.MeshStandardMaterial(),
  metal: new THREE.MeshStandardMaterial(),
  glass: new THREE.MeshPhysicalMaterial(),
});

test('Veilcross creates a complete hollow waiting hall with content anchors', () => {
  const hall = createStationHallInterior('MAGIC-001', createMaterials());
  const requiredNames = [
    'veilcross-hollow-shell',
    'veilcross-interior-floor',
    'veilcross-waiting-benches',
    'veilcross-ticket-counter',
    'veilcross-ticket-windows',
    'veilcross-departure-board',
    'veilcross-departure-glyphs',
    'veilcross-hall-rafters',
    'veilcross-seeded-luggage',
    'veilcross-hanging-lanterns',
    'veilcross-interior-light-rig',
    'station-npc-clerk-anchor',
    'station-npc-conductor-anchor',
    'station-quest-departure-anchor',
    'veilcross-clerk-elyra',
    'veilcross-clerk-elyra-quest-badge',
    'veilcross-conductor',
    'veilcross-conductor-staff',
  ];

  for (const name of requiredNames) assert.ok(hall.getObjectByName(name), `Missing ${name}`);
  assert.equal((hall.getObjectByName('veilcross-waiting-benches') as THREE.InstancedMesh).count, 6);
  assert.equal((hall.getObjectByName('veilcross-seeded-luggage') as THREE.InstancedMesh).count, 14);
  assert.equal(hall.getObjectByName('station-npc-clerk-anchor')?.userData.role, 'npc');
  assert.equal(hall.getObjectByName('station-quest-departure-anchor')?.userData.role, 'quest');
  assert.equal(hall.getObjectByName('veilcross-clerk-elyra')?.userData.interactive, true);
  assert.equal(hall.getObjectByName('veilcross-conductor')?.userData.role, 'station-conductor');
});

test('Veilcross luggage placement is deterministic and seed-sensitive', () => {
  const first = createStationHallInterior('MAGIC-001', createMaterials()).getObjectByName('veilcross-seeded-luggage') as THREE.InstancedMesh;
  const repeat = createStationHallInterior('MAGIC-001', createMaterials()).getObjectByName('veilcross-seeded-luggage') as THREE.InstancedMesh;
  const changed = createStationHallInterior('MAGIC-002', createMaterials()).getObjectByName('veilcross-seeded-luggage') as THREE.InstancedMesh;

  assert.deepEqual(Array.from(first.instanceMatrix.array), Array.from(repeat.instanceMatrix.array));
  assert.notDeepEqual(Array.from(first.instanceMatrix.array), Array.from(changed.instanceMatrix.array));
  assert.ok(Array.from(first.instanceMatrix.array).every(Number.isFinite));
});
