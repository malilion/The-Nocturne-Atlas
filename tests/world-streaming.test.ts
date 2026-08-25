import assert from 'node:assert/strict';
import test from 'node:test';
import * as THREE from 'three';
import { createWorldManifest } from '../app/world-core.ts';
import { WorldStreamingSystem } from '../app/world-streaming.ts';

function createStreamableRoot() {
  const root = new THREE.Group();
  for (const name of [
    'castle-embellishments',
    'village-embellishments',
    'umbravale-mountain-range',
    'orison-ruins-region',
    'veilcross-station-region',
  ]) {
    const chunk = new THREE.Group();
    chunk.name = name;
    root.add(chunk);
  }
  return root;
}

test('distance streaming activates nearby regions and releases distant detail', () => {
  const root = createStreamableRoot();
  const streaming = new WorldStreamingSystem(root, createWorldManifest('MAGIC-001', 'medium'), 'medium');
  const stationStatus = streaming.update(new THREE.Vector3(-53, 3, -33));
  assert.equal(stationStatus.total, 5);
  assert.equal(root.getObjectByName('veilcross-station-region')?.visible, true);
  assert.equal(root.getObjectByName('orison-ruins-region')?.visible, false);
  assert.ok(stationStatus.active < stationStatus.total);

  const ruinsCenter = new THREE.Vector3(50, 3, -28);
  streaming.update(ruinsCenter);
  assert.equal(root.getObjectByName('orison-ruins-region')?.visible, true);
  streaming.update(new THREE.Vector3(118, 3, -28));
  assert.equal(root.getObjectByName('orison-ruins-region')?.visible, true, 'active chunk should remain inside its release threshold');
  streaming.update(new THREE.Vector3(132, 3, -28));
  assert.equal(root.getObjectByName('orison-ruins-region')?.visible, false);
  streaming.dispose();
  assert.ok(root.children.every((child) => child.visible));
});

test('aerial and disabled streaming modes keep every registered region visible', () => {
  const root = createStreamableRoot();
  const streaming = new WorldStreamingSystem(root, createWorldManifest('MAGIC-001', 'low'), 'low');
  const distant = new THREE.Vector3(240, 70, 240);
  assert.equal(streaming.update(distant).active, 0);
  assert.equal(streaming.update(distant, true).active, 5);
  streaming.setEnabled(false);
  assert.equal(streaming.update(distant).active, 5);
  assert.ok(root.children.every((child) => child.visible));
});
