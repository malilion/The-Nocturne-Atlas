import assert from 'node:assert/strict';
import test from 'node:test';
import * as THREE from 'three';
import { createGreatHallArchitecture } from '../app/great-hall.ts';

const createMaterials = () => ({
  stone: new THREE.MeshStandardMaterial(),
  roof: new THREE.MeshStandardMaterial(),
  wood: new THREE.MeshStandardMaterial(),
  glow: new THREE.MeshBasicMaterial(),
});

test('Great Hall creates a hollow shell and complete interior landmarks', () => {
  const hall = createGreatHallArchitecture('MAGIC-001', createMaterials());
  const requiredNames = [
    'great-hall-hollow-shell',
    'great-hall-portal',
    'great-hall-interior-floor',
    'great-hall-tables',
    'great-hall-benches',
    'great-hall-dais',
    'great-hall-lectern',
    'great-hall-windows',
    'great-hall-banners',
    'great-hall-rafters',
    'great-hall-floating-candles',
    'great-hall-candle-light-rig',
  ];

  for (const name of requiredNames) assert.ok(hall.getObjectByName(name), `Missing ${name}`);
  assert.equal((hall.getObjectByName('great-hall-windows') as THREE.InstancedMesh).count, 12);
  assert.equal((hall.getObjectByName('great-hall-floating-candles') as THREE.InstancedMesh).count, 24);
  assert.equal((hall.getObjectByName('great-hall-candle-light-rig') as THREE.Group).children.length, 3);
});

test('Great Hall candle layout is deterministic and seed-sensitive', () => {
  const first = createGreatHallArchitecture('MAGIC-001', createMaterials()).getObjectByName('great-hall-floating-candles') as THREE.InstancedMesh;
  const repeat = createGreatHallArchitecture('MAGIC-001', createMaterials()).getObjectByName('great-hall-floating-candles') as THREE.InstancedMesh;
  const changed = createGreatHallArchitecture('MAGIC-002', createMaterials()).getObjectByName('great-hall-floating-candles') as THREE.InstancedMesh;

  assert.deepEqual(Array.from(first.instanceMatrix.array), Array.from(repeat.instanceMatrix.array));
  assert.notDeepEqual(Array.from(first.instanceMatrix.array), Array.from(changed.instanceMatrix.array));
  assert.ok(Array.from(first.instanceMatrix.array).every(Number.isFinite));
});
