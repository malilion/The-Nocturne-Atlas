import assert from 'node:assert/strict';
import test from 'node:test';
import * as THREE from 'three';
import { createLibraryHallInterior } from '../app/library-hall.ts';

const createMaterials = () => ({
  stone: new THREE.MeshStandardMaterial(),
  wood: new THREE.MeshStandardMaterial(),
  metal: new THREE.MeshStandardMaterial(),
  glass: new THREE.MeshPhysicalMaterial(),
});

test('Veyra library creates a hollow, furnished archive interior', () => {
  const library = createLibraryHallInterior('MAGIC-001', createMaterials());
  const requiredNames = [
    'library-hollow-shell',
    'library-interior-floor',
    'library-bookcases',
    'library-shelf-bands',
    'library-seeded-books',
    'library-reading-desks',
    'library-glass-skylight',
    'library-floating-books',
    'library-archive-table',
    'library-memory-orb',
    'library-researcher-anchor',
    'library-interior-light-rig',
  ];
  for (const name of requiredNames) assert.ok(library.getObjectByName(name), `Missing ${name}`);
  assert.equal((library.getObjectByName('library-bookcases') as THREE.InstancedMesh).count, 8);
  assert.equal((library.getObjectByName('library-seeded-books') as THREE.InstancedMesh).count, 80);
  assert.equal((library.getObjectByName('library-floating-books') as THREE.InstancedMesh).count, 12);
  assert.equal(library.getObjectByName('library-researcher-anchor')?.userData.interactive, true);
});

test('library books are deterministic and seed-sensitive', () => {
  const first = createLibraryHallInterior('MAGIC-001', createMaterials()).getObjectByName('library-seeded-books') as THREE.InstancedMesh;
  const repeat = createLibraryHallInterior('MAGIC-001', createMaterials()).getObjectByName('library-seeded-books') as THREE.InstancedMesh;
  const changed = createLibraryHallInterior('MAGIC-002', createMaterials()).getObjectByName('library-seeded-books') as THREE.InstancedMesh;
  assert.deepEqual(Array.from(first.instanceMatrix.array), Array.from(repeat.instanceMatrix.array));
  assert.notDeepEqual(Array.from(first.instanceMatrix.array), Array.from(changed.instanceMatrix.array));
  assert.ok(Array.from(first.instanceMatrix.array).every(Number.isFinite));
});
