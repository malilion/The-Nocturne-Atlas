import assert from 'node:assert/strict';
import test from 'node:test';
import { isWalkablePosition, resolveWalkMovement } from '../app/walk-collision.ts';
import { createWorldManifest, terrainHeight } from '../app/world-core.ts';

const manifest = createWorldManifest('MAGIC-001', 'medium');

test('walk collision keeps the player inside the generated terrain', () => {
  assert.equal(isWalkablePosition({ x: 0, z: 74 }, manifest), false);
  assert.equal(isWalkablePosition({ x: 50, z: -50 }, manifest), true);
});

test('walk collision rejects lake and castle structure interiors', () => {
  assert.equal(isWalkablePosition({ x: 28, z: 18 }, manifest), false);
  const tower = manifest.castleGraph.nodes.find((node) => node.type === 'tower');
  assert.ok(tower);
  assert.equal(isWalkablePosition({ x: -7 + tower.position[0], z: -4 + tower.position[2] }, manifest), false);
});

test('walk collision follows rotated village footprints', () => {
  const building = manifest.villageBuildings[0];
  assert.equal(isWalkablePosition({ x: building.position[0], z: building.position[1] }, manifest), false);
  assert.equal(isWalkablePosition({ x: building.position[0], z: building.position[1] + 5 }, manifest), true);
});

test('walk collision includes visual landmark footprints', () => {
  const manifest = createWorldManifest('MAGIC-001', 'medium');
  assert.equal(isWalkablePosition({ x: -24.5, z: -7 }, manifest), false);
  assert.equal(isWalkablePosition({ x: -48.5, z: 22.2 }, manifest), false);
  assert.equal(isWalkablePosition({ x: -31, z: 13 }, manifest), false);
  assert.equal(isWalkablePosition({ x: 18, z: -43 }, manifest), false);
});

test('walk movement blocks obstacles, slides along them, and returns terrain height', () => {
  const building = manifest.villageBuildings[0];
  const current = { x: building.position[0] - 4, z: building.position[1] - 2 };
  const desired = { x: building.position[0], z: building.position[1] };
  const resolved = resolveWalkMovement(current, desired, manifest);

  assert.equal(isWalkablePosition(resolved, manifest), true);
  assert.notDeepEqual({ x: resolved.x, z: resolved.z }, desired);
  assert.equal(resolved.groundY, terrainHeight(resolved.x, resolved.z, manifest.seedHash));
  assert.equal(resolved.blocked, true);
});
