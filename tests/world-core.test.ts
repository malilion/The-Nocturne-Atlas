import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { createWorldManifest, hashSeed, seededStream, terrainHeight } from '../app/world-core.ts';

test('same seed and quality produce an identical manifest', () => {
  const first = createWorldManifest('MAGIC-001', 'medium');
  const second = createWorldManifest('MAGIC-001', 'medium');
  assert.deepEqual(first, second);
  assert.equal(first.manifestHash, second.manifestHash);
});

test('different seeds produce visibly different castle parameters', () => {
  const first = createWorldManifest('MAGIC-001', 'medium');
  const second = createWorldManifest('MAGIC-002', 'medium');
  assert.notEqual(first.manifestHash, second.manifestHash);
  assert.notDeepEqual(first.towerHeights, second.towerHeights);
});

test('forked streams are independent and repeatable', () => {
  const castleA = seededStream('MAGIC-001', 'castle');
  const forest = seededStream('MAGIC-001', 'forest');
  forest();
  forest();
  const castleB = seededStream('MAGIC-001', 'castle');
  assert.deepEqual([castleA(), castleA(), castleA()], [castleB(), castleB(), castleB()]);
});

test('twenty regression seeds create finite terrain and valid manifests', () => {
  for (let index = 1; index <= 20; index += 1) {
    const seed = `MAGIC-${String(index).padStart(3, '0')}`;
    const manifest = createWorldManifest(seed, 'medium');
    assert.equal(manifest.counts.towers, 4);
    assert.ok(manifest.counts.trees >= 100);
    for (let x = -70; x <= 70; x += 14) {
      const height = terrainHeight(x, -x / 2, hashSeed(seed));
      assert.ok(Number.isFinite(height));
      assert.ok(Math.abs(height) < 50);
    }
  }
});

test('camera landmarks are deterministic, complete, and terrain-safe', () => {
  const manifest = createWorldManifest('MAGIC-001', 'high');
  assert.deepEqual(manifest.cameraLandmarks.map((landmark) => landmark.id), ['castle', 'village', 'lake', 'forest', 'tower']);
  assert.equal(new Set(manifest.cameraLandmarks.map((landmark) => landmark.label)).size, 5);
  for (const landmark of manifest.cameraLandmarks) {
    assert.ok(landmark.position.every(Number.isFinite));
    const terrain = terrainHeight(landmark.position[0], landmark.position[2], manifest.seedHash);
    assert.ok(landmark.position[1] >= terrain + 6.9);
  }
});

test('lake ecology scales by quality while preserving one shared boundary', () => {
  const low = createWorldManifest('MAGIC-001', 'low');
  const high = createWorldManifest('MAGIC-001', 'high');
  assert.ok(high.counts.reeds > low.counts.reeds);
  assert.ok(high.counts.shoreRocks > low.counts.shoreRocks);
  assert.deepEqual(low.zones.find((zone) => zone.type === 'lake'), high.zones.find((zone) => zone.type === 'lake'));
  assert.equal(low.zones.find((zone) => zone.type === 'lake')?.radius, 26);
});

test('generation source never calls Math.random', async () => {
  const source = await readFile(new URL('../app/page.tsx', import.meta.url), 'utf8');
  assert.equal(source.includes('Math.random('), false);
});
