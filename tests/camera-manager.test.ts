import assert from 'node:assert/strict';
import test from 'node:test';
import * as THREE from 'three';
import { CameraManager, type CameraUpdate } from '../app/camera-manager.ts';
import { createWorldManifest } from '../app/world-core.ts';

const manifest = createWorldManifest('MAGIC-001', 'medium');
const baseUpdate: CameraUpdate = {
  elapsed: 0,
  delta: 1 / 60,
  mode: 'tour',
  tourPaused: true,
  reducedMotion: false,
  autoRotate: false,
  seed: manifest.seed,
  requestedScene: null,
  fixedView: null,
};

const assertVectorClose = (actual: THREE.Vector3, expected: readonly number[]) => {
  assert.ok(actual.distanceTo(new THREE.Vector3(...expected)) < 0.0001);
};

test('CameraManager parks the initial tour camera until the user resumes it', () => {
  const camera = new THREE.PerspectiveCamera();
  const manager = new CameraManager(camera, null, manifest);
  const initialLocation = manager.update(baseUpdate);
  const parkedPosition = camera.position.clone();
  const parkedQuaternion = camera.quaternion.clone();

  manager.update({ ...baseUpdate, elapsed: 8, delta: 1 });

  assert.equal(initialLocation?.id, 'castle');
  assertVectorClose(parkedPosition, manifest.cameraLandmarks[0].position);
  assert.ok(camera.position.distanceTo(parkedPosition) < 0.0001);
  assert.ok(camera.quaternion.angleTo(parkedQuaternion) < 0.0001);
});

test('CameraManager switches landmarks smoothly while keeping the tour paused', () => {
  const camera = new THREE.PerspectiveCamera();
  const manager = new CameraManager(camera, null, manifest);
  manager.update(baseUpdate);
  const requested = manager.update({ ...baseUpdate, elapsed: 1, requestedScene: 'village' });
  manager.update({ ...baseUpdate, elapsed: 3 });
  const village = manifest.cameraLandmarks.find((landmark) => landmark.id === 'village');

  assert.equal(requested?.id, 'village');
  assert.ok(village);
  assertVectorClose(camera.position, village.position);
});

test('CameraManager owns an idempotent lifecycle', () => {
  const camera = new THREE.PerspectiveCamera();
  const manager = new CameraManager(camera, null, manifest);
  manager.dispose();
  manager.dispose();
  assert.throws(() => manager.update(baseUpdate), /disposed/);
});

test('CameraManager applies orbit drag, zoom, and automatic rotation', () => {
  const camera = new THREE.PerspectiveCamera();
  const manager = new CameraManager(camera, null, manifest);
  manager.update(baseUpdate);
  const orbitUpdate: CameraUpdate = { ...baseUpdate, mode: 'orbit', elapsed: 1 };
  manager.update(orbitUpdate);
  const initialPosition = camera.position.clone();
  const castleTarget = new THREE.Vector3(...manifest.cameraLandmarks[0].target);
  const expectedRadius = THREE.MathUtils.clamp(initialPosition.distanceTo(castleTarget) + 36, 27, 115);

  manager.rotateOrbit(120, -40);
  manager.zoomOrbit(36);
  manager.update({ ...orbitUpdate, elapsed: 2 });
  const manipulatedPosition = camera.position.clone();

  manager.update({ ...orbitUpdate, elapsed: 3, delta: 1, autoRotate: true });
  const rotatedPosition = camera.position.clone();
  manager.setOrbitInteraction(true);
  manager.update({ ...orbitUpdate, elapsed: 4, delta: 1, autoRotate: true });
  const positionWhileDragging = camera.position.clone();
  manager.setOrbitInteraction(false);
  manager.update({ ...orbitUpdate, elapsed: 5, delta: 1, autoRotate: true });

  assert.ok(manipulatedPosition.distanceTo(initialPosition) > 10);
  assert.ok(rotatedPosition.distanceTo(manipulatedPosition) > 1);
  assert.ok(positionWhileDragging.distanceTo(rotatedPosition) < 0.0001);
  assert.ok(camera.position.distanceTo(positionWhileDragging) > 1);
  assert.ok(Math.abs(camera.position.distanceTo(castleTarget) - expectedRadius) < 0.0001);
});

test('CameraManager orbits the most recently presented landmark', () => {
  const camera = new THREE.PerspectiveCamera();
  const manager = new CameraManager(camera, null, manifest);
  manager.update(baseUpdate);
  manager.update({ ...baseUpdate, elapsed: 1, requestedScene: 'village' });
  manager.update({ ...baseUpdate, elapsed: 3 });
  const villageTarget = new THREE.Vector3(...manifest.cameraLandmarks[1].target);

  manager.update({ ...baseUpdate, elapsed: 4, mode: 'orbit' });

  const direction = new THREE.Vector3();
  camera.getWorldDirection(direction);
  const expectedDirection = villageTarget.clone().sub(camera.position).normalize();
  assert.ok(direction.angleTo(expectedDirection) < 0.0001);
});
