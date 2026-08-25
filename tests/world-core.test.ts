import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { createCastleDetailProfile, createForestTreeDetailProfile, createVillageDetailProfile } from '../app/procedural-details.ts';
import { createWorldManifest, hashSeed, sampleClosedTourPosition, seededStream, terrainHeight, validateWorldManifest } from '../app/world-core.ts';

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
    const validation = validateWorldManifest(manifest);
    assert.equal(manifest.counts.towers, 4);
    assert.equal(validation.ok, true, validation.errors.join('\n'));
    assert.ok(manifest.counts.trees >= 100);
    for (let x = -70; x <= 70; x += 14) {
      const height = terrainHeight(x, -x / 2, hashSeed(seed));
      assert.ok(Number.isFinite(height));
      assert.ok(Math.abs(height) < 50);
    }
  }
});

test('castle topology is connected and resolves every route endpoint', () => {
  const manifest = createWorldManifest('MAGIC-001', 'medium');
  const report = validateWorldManifest(manifest);
  assert.equal(report.ok, true, report.errors.join('\n'));
  assert.equal(manifest.castleGraph.nodes.filter((node) => node.type === 'tower').length, 4);
  assert.ok(manifest.castleGraph.edges.some((edge) => edge.type === 'moving-stair'));
});

test('manifest validation rejects a dangling castle route', () => {
  const manifest = structuredClone(createWorldManifest('MAGIC-001', 'medium'));
  manifest.castleGraph.edges[0].to = 'missing-tower';
  const report = validateWorldManifest(manifest);
  assert.equal(report.ok, false);
  assert.ok(report.errors.some((error) => error.includes('missing node')));
});

test('camera landmarks are deterministic, complete, and terrain-safe', () => {
  const manifest = createWorldManifest('MAGIC-001', 'high');
  assert.equal(manifest.generatorVersion, '2.5.0');
  assert.deepEqual(manifest.cameraLandmarks.map((landmark) => landmark.id), ['castle', 'village', 'lake', 'forest', 'tower', 'mountains', 'ruins', 'station']);
  assert.equal(new Set(manifest.cameraLandmarks.map((landmark) => landmark.label)).size, 8);
  for (const landmark of manifest.cameraLandmarks) {
    assert.ok(landmark.position.every(Number.isFinite));
    const terrain = terrainHeight(landmark.position[0], landmark.position[2], manifest.seedHash);
    assert.ok(landmark.position[1] >= terrain + 6.9);
  }
});

test('presentation cameras preserve landmark clearance across regression seeds', () => {
  for (let seedIndex = 1; seedIndex <= 20; seedIndex += 1) {
    const manifest = createWorldManifest(`MAGIC-${String(seedIndex).padStart(3, '0')}`, 'medium');
    const village = manifest.cameraLandmarks.find((landmark) => landmark.id === 'village')!;
    const forest = manifest.cameraLandmarks.find((landmark) => landmark.id === 'forest')!;
    const tower = manifest.cameraLandmarks.find((landmark) => landmark.id === 'tower')!;
    const stairs = manifest.validationViews.find((view) => view.id === 'courtyard-stair')!;
    const distanceToTarget = (view: { position: number[]; target: number[] }) => Math.hypot(
      view.position[0] - view.target[0],
      view.position[1] - view.target[1],
      view.position[2] - view.target[2],
    );

    assert.ok(Math.abs(village.position[2] - 13) <= 3.1);
    assert.ok(village.position[1] >= 21);
    assert.ok(forest.position[1] >= 25);
    assert.ok(distanceToTarget(tower) >= 35);
    assert.ok(distanceToTarget(stairs) >= 42);
  }
});

test('closed cinematic tour samples stay finite and above terrain', () => {
  for (let seedIndex = 1; seedIndex <= 20; seedIndex += 1) {
    const manifest = createWorldManifest(`MAGIC-${String(seedIndex).padStart(3, '0')}`, 'medium');
    for (let segment = 0; segment < manifest.cameraLandmarks.length; segment += 1) {
      for (let step = 0; step <= 16; step += 1) {
        const position = sampleClosedTourPosition(manifest.cameraLandmarks, segment, step / 16);
        const ground = terrainHeight(position[0], position[2], manifest.seedHash);
        assert.ok(position.every(Number.isFinite));
        assert.ok(position[1] >= ground + 4);
      }
    }
  }
});

test('eight fixed visual validation views are complete and terrain-safe', () => {
  const expected = ['castle-hero', 'courtyard-stair', 'village-approach', 'forest-edge', 'lake-shore', 'aerial-orbit', 'great-hall', 'station-hall'];
  for (let seedIndex = 1; seedIndex <= 20; seedIndex += 1) {
    const manifest = createWorldManifest(`MAGIC-${String(seedIndex).padStart(3, '0')}`, 'high');
    assert.deepEqual(manifest.validationViews.map((view) => view.id), expected);
    for (const view of manifest.validationViews) {
      const ground = terrainHeight(view.position[0], view.position[2], manifest.seedHash);
      assert.ok(view.position.every(Number.isFinite));
      assert.ok(view.target.every(Number.isFinite));
      assert.ok(view.position[1] >= ground + (view.id === 'great-hall' || view.id === 'station-hall' ? 1.6 : 6.8));
    }
  }
});

test('lake ecology scales by quality while preserving one shared boundary', () => {
  const low = createWorldManifest('MAGIC-001', 'low');
  const high = createWorldManifest('MAGIC-001', 'high');
  assert.ok(high.counts.reeds > low.counts.reeds);
  assert.ok(high.counts.shoreRocks > low.counts.shoreRocks);
  assert.ok(high.counts.trees >= 1000);
  assert.deepEqual(low.zones.find((zone) => zone.type === 'lake'), high.zones.find((zone) => zone.type === 'lake'));
  assert.equal(low.zones.find((zone) => zone.type === 'lake')?.radius, 26);
});

test('world topology includes every major region exactly once', () => {
  const manifest = createWorldManifest('MAGIC-001', 'medium');
  assert.deepEqual(manifest.zones.map((zone) => zone.type), ['castle', 'village', 'forest', 'lake', 'mountains', 'ruins', 'station']);
  assert.equal(new Set(manifest.zones.map((zone) => zone.id)).size, manifest.zones.length);
});

test('forest LOD policy is deterministic, complete, and quality-aware', () => {
  const medium = createWorldManifest('MAGIC-001', 'medium');
  const high = createWorldManifest('MAGIC-001', 'high');
  assert.equal(medium.forestLod.nearTrees + medium.forestLod.farTrees, medium.counts.trees);
  assert.equal(high.forestLod.nearTrees + high.forestLod.farTrees, high.counts.trees);
  assert.ok(high.forestLod.nearTrees > medium.forestLod.nearTrees);
  assert.ok(high.forestLod.farTrees > medium.forestLod.farTrees);
  assert.ok(high.forestLod.splitRadius > medium.forestLod.splitRadius);
});

test('village plans obey constraints and do not cascade across quality tiers', () => {
  for (let seedIndex = 1; seedIndex <= 20; seedIndex += 1) {
    const seed = `MAGIC-${String(seedIndex).padStart(3, '0')}`;
    const low = createWorldManifest(seed, 'low');
    const high = createWorldManifest(seed, 'high');
    assert.equal(validateWorldManifest(high).ok, true, validateWorldManifest(high).errors.join('\n'));
    assert.equal(high.villageBuildings.length, high.counts.houses);
    assert.equal(new Set(high.villageBuildings.map((building) => building.id)).size, high.villageBuildings.length);
    assert.deepEqual(high.villageBuildings.slice(0, low.villageBuildings.length), low.villageBuildings);
    assert.deepEqual(high.towerHeights, low.towerHeights);
  }
});

test('architectural and forest detail profiles are deterministic and bounded', () => {
  const castle = createCastleDetailProfile('MAGIC-001');
  assert.deepEqual(castle, createCastleDetailProfile('MAGIC-001'));
  assert.notDeepEqual(castle, createCastleDetailProfile('MAGIC-002'));
  assert.ok(castle.battlementScale >= 0.88 && castle.battlementScale <= 1.1);
  assert.ok(castle.gateArchScale >= 0.92 && castle.gateArchScale <= 1.08);

  const village = Array.from({ length: 12 }, (_, index) => createVillageDetailProfile('MAGIC-001', index));
  assert.deepEqual(village, Array.from({ length: 12 }, (_, index) => createVillageDetailProfile('MAGIC-001', index)));
  assert.equal(village.filter((profile) => profile.hasSign).length, 3);
  assert.ok(village.every((profile) => profile.chimneyOffset >= 0.42 && profile.chimneyOffset <= 0.7));

  const forest = Array.from({ length: 20 }, (_, index) => createForestTreeDetailProfile('MAGIC-001', index));
  assert.deepEqual(forest, Array.from({ length: 20 }, (_, index) => createForestTreeDetailProfile('MAGIC-001', index)));
  assert.ok(forest.every((profile) => profile.heightScale >= 0.82 && profile.heightScale <= 1.26));
  assert.ok(forest.every((profile) => Math.abs(profile.leanX) <= 0.07 && Math.abs(profile.leanZ) <= 0.07));
  assert.ok(new Set(forest.map((profile) => profile.canopyWidth.toFixed(3))).size > 10);
});

test('generation source never calls Math.random', async () => {
  const source = await readFile(new URL('../app/page.tsx', import.meta.url), 'utf8');
  assert.equal(source.includes('Math.random('), false);
});
