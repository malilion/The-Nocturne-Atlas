import assert from 'node:assert/strict';
import test from 'node:test';
import * as THREE from 'three';
import { createGlassMaterial, createMetalMaterial, createRoofMaterial, createStoneMaterial, createWoodMaterial } from '../app/procedural-materials.ts';
import { createWorldManifest } from '../app/world-core.ts';
import { createWorldRegions } from '../app/world-regions.ts';

function materials(seed: number) {
  return {
    stone: createStoneMaterial(seed),
    roof: createRoofMaterial(seed),
    wood: createWoodMaterial(seed),
    metal: createMetalMaterial(seed),
    glass: createGlassMaterial(seed),
  };
}

function instanceMatrix(root: THREE.Object3D, name: string, index = 0) {
  const batch = root.getObjectByName(name) as THREE.InstancedMesh;
  assert.ok(batch);
  const matrix = new THREE.Matrix4();
  batch.getMatrixAt(index, matrix);
  return matrix.toArray();
}

test('world regions build mountains, a complete ruin, and Veilcross station', () => {
  const manifest = createWorldManifest('MAGIC-001', 'medium');
  const regions = createWorldRegions(manifest, 'medium', materials(manifest.seedHash));
  assert.ok(regions.root.getObjectByName('umbravale-mountain-range'));
  assert.ok(regions.root.getObjectByName('north-pass-gate'));
  assert.ok(regions.root.getObjectByName('orison-ruins-region'));
  assert.ok(regions.root.getObjectByName('orison-memory-monolith'));
  assert.ok(regions.root.getObjectByName('veilcross-station'));
  assert.ok(regions.root.getObjectByName('veilcross-waiting-hall'));
  assert.ok(regions.root.getObjectByName('veilcross-departure-board'));
  assert.ok(regions.root.getObjectByName('station-quest-departure-anchor'));
  assert.ok(regions.root.getObjectByName('veilcross-platform'));
  assert.ok(regions.root.getObjectByName('veilcross-arcane-railcar'));
});

test('region silhouettes are deterministic and seed-sensitive', () => {
  const firstManifest = createWorldManifest('MAGIC-001', 'high');
  const secondManifest = createWorldManifest('MAGIC-002', 'high');
  const first = createWorldRegions(firstManifest, 'high', materials(firstManifest.seedHash));
  const repeated = createWorldRegions(firstManifest, 'high', materials(firstManifest.seedHash));
  const different = createWorldRegions(secondManifest, 'high', materials(secondManifest.seedHash));
  assert.deepEqual(instanceMatrix(first.root, 'umbravale-mountain-peaks'), instanceMatrix(repeated.root, 'umbravale-mountain-peaks'));
  assert.notDeepEqual(instanceMatrix(first.root, 'umbravale-mountain-peaks'), instanceMatrix(different.root, 'umbravale-mountain-peaks'));
});

test('region detail density scales with quality', () => {
  const lowManifest = createWorldManifest('MAGIC-001', 'low');
  const highManifest = createWorldManifest('MAGIC-001', 'high');
  const low = createWorldRegions(lowManifest, 'low', materials(lowManifest.seedHash));
  const high = createWorldRegions(highManifest, 'high', materials(highManifest.seedHash));
  assert.ok((high.root.getObjectByName('umbravale-mountain-peaks') as THREE.InstancedMesh).count > (low.root.getObjectByName('umbravale-mountain-peaks') as THREE.InstancedMesh).count);
  assert.ok((high.root.getObjectByName('orison-broken-columns') as THREE.InstancedMesh).count > (low.root.getObjectByName('orison-broken-columns') as THREE.InstancedMesh).count);
  assert.ok((high.root.getObjectByName('veilcross-rail-sleepers') as THREE.InstancedMesh).count > (low.root.getObjectByName('veilcross-rail-sleepers') as THREE.InstancedMesh).count);
});
