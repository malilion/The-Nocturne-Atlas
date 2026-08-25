import assert from 'node:assert/strict';
import test from 'node:test';
import * as THREE from 'three';
import { createGlassMaterial, createMetalMaterial, createRoofMaterial, createStoneMaterial, createWoodMaterial } from '../app/procedural-materials.ts';
import { createAmbientEmbellishments, createCastleEmbellishments, createForestEmbellishments, createVillageEmbellishments } from '../app/world-embellishments.ts';
import { createWorldManifest } from '../app/world-core.ts';

function materials(seed: number) {
  return {
    stone: createStoneMaterial(seed),
    roof: createRoofMaterial(seed),
    wood: createWoodMaterial(seed),
    metal: createMetalMaterial(seed),
    glass: createGlassMaterial(seed),
  };
}

function firstInstanceMatrix(root: THREE.Object3D, name: string) {
  const batch = root.getObjectByName(name) as THREE.InstancedMesh;
  assert.ok(batch);
  const matrix = new THREE.Matrix4();
  batch.getMatrixAt(0, matrix);
  return matrix.toArray();
}

test('embellishments create the planned castle, village, forest, and ambient landmarks', () => {
  const manifest = createWorldManifest('MAGIC-001', 'medium');
  const surfaces = materials(manifest.seedHash);
  const castle = createCastleEmbellishments(manifest, surfaces);
  const village = createVillageEmbellishments(manifest, surfaces);
  const forest = createForestEmbellishments(manifest, surfaces);
  const ambient = createAmbientEmbellishments(manifest, 'medium', surfaces);

  assert.ok(castle.getObjectByName('west-library-wing'));
  assert.ok(castle.getObjectByName('veyra-library-hall'));
  assert.ok(castle.getObjectByName('library-memory-orb'));
  assert.ok(castle.getObjectByName('courtyard-arcade'));
  assert.ok(castle.getObjectByName('bridge-buttress-supports'));
  assert.ok(village.getObjectByName('lumen-row-market-square'));
  assert.ok(village.getObjectByName('the-copper-kettle-tavern'));
  assert.ok(village.getObjectByName('moon-and-quill-shop'));
  assert.ok(forest.getObjectByName('thorn-veil-waystone-ruin'));
  assert.ok(forest.getObjectByName('forest-mushroom-caps'));
  assert.ok(ambient.root.getObjectByName('world-rune-sites'));
  assert.ok(ambient.root.getObjectByName('floating-library-books'));
  assert.ok(ambient.root.getObjectByName('moving-wayfinder-lanterns'));
});

test('seeded embellishment placement is repeatable and seed-sensitive', () => {
  const firstManifest = createWorldManifest('MAGIC-001', 'high');
  const secondManifest = createWorldManifest('MAGIC-002', 'high');
  const first = createForestEmbellishments(firstManifest, materials(firstManifest.seedHash));
  const repeated = createForestEmbellishments(firstManifest, materials(firstManifest.seedHash));
  const different = createForestEmbellishments(secondManifest, materials(secondManifest.seedHash));

  assert.deepEqual(firstInstanceMatrix(first, 'forest-surface-roots'), firstInstanceMatrix(repeated, 'forest-surface-roots'));
  assert.notDeepEqual(firstInstanceMatrix(first, 'forest-surface-roots'), firstInstanceMatrix(different, 'forest-surface-roots'));
});

test('ambient and forest detail density follows the quality tier', () => {
  const lowManifest = createWorldManifest('MAGIC-001', 'low');
  const highManifest = createWorldManifest('MAGIC-001', 'high');
  const lowForest = createForestEmbellishments(lowManifest, materials(lowManifest.seedHash));
  const highForest = createForestEmbellishments(highManifest, materials(highManifest.seedHash));
  const lowAmbient = createAmbientEmbellishments(lowManifest, 'low', materials(lowManifest.seedHash));
  const highAmbient = createAmbientEmbellishments(highManifest, 'high', materials(highManifest.seedHash));

  assert.ok((highForest.getObjectByName('forest-mushroom-caps') as THREE.InstancedMesh).count > (lowForest.getObjectByName('forest-mushroom-caps') as THREE.InstancedMesh).count);
  assert.ok((highAmbient.root.getObjectByName('procedural-cloud-billows') as THREE.InstancedMesh).count > (lowAmbient.root.getObjectByName('procedural-cloud-billows') as THREE.InstancedMesh).count);
  assert.ok((highAmbient.root.getObjectByName('floating-book-covers') as THREE.InstancedMesh).count > (lowAmbient.root.getObjectByName('floating-book-covers') as THREE.InstancedMesh).count);
});
