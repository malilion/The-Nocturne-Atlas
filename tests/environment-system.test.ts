import assert from 'node:assert/strict';
import test from 'node:test';
import * as THREE from 'three';
import { EnvironmentSystem, type EnvironmentSettings } from '../app/environment-system.ts';

const createWorld = () => ({
  starMaterial: new THREE.PointsMaterial({ opacity: 1, transparent: true }),
  celestialMaterial: new THREE.MeshBasicMaterial(),
  celestialOrb: new THREE.Object3D(),
  waterMaterial: new THREE.ShaderMaterial({ uniforms: { uMoon: { value: new THREE.Color() } } }),
});

const nightSettings: EnvironmentSettings = {
  timeOfDay: 'night',
  fogEnabled: true,
  fogDensity: 1,
  postEnabled: true,
  bloomStrength: 1,
  shadowsEnabled: true,
  quality: 'medium',
};

test('EnvironmentSystem transitions the complete lighting model from night to day', () => {
  const scene = new THREE.Scene();
  const world = createWorld();
  const environment = new EnvironmentSystem(scene, 'night');
  const nightFrame = environment.update(1 / 60, nightSettings, world);
  const nightFogDensity = environment.fog.density;

  assert.equal(environment.keyLight.parent, scene);
  assert.equal(environment.fillLight.parent, scene);
  assert.equal(environment.fillLight.castShadow, false);
  assert.equal(scene.fog, environment.fog);
  assert.equal(world.starMaterial.opacity, 0.72);
  assert.equal(nightFogDensity, 0.0095);
  assert.equal(nightFrame.toneMappingExposure, 1.12);
  assert.equal(environment.hemisphere.intensity, 1.55);
  assert.equal(environment.fillLight.intensity, 0.82);

  let dayFrame = nightFrame;
  for (let frame = 0; frame < 240; frame += 1) {
    dayFrame = environment.update(1 / 60, { ...nightSettings, timeOfDay: 'day' }, world);
  }

  assert.ok(environment.daylight > 0.999);
  assert.ok(environment.fog.density < nightFogDensity);
  assert.ok(world.starMaterial.opacity < 0.03);
  assert.ok(environment.keyLight.position.x > 40);
  assert.ok(environment.fillLight.position.x < -27);
  assert.ok(environment.fillLight.intensity < 0.35);
  assert.ok(world.celestialOrb.position.x > 50);
  assert.ok(dayFrame.toneMappingExposure > nightFrame.toneMappingExposure);
  assert.equal(dayFrame.bloomStrength, 0.48);
});

test('EnvironmentSystem applies toggles and disposes its scene ownership idempotently', () => {
  const scene = new THREE.Scene();
  const world = createWorld();
  const environment = new EnvironmentSystem(scene);
  const frame = environment.update(1 / 60, {
    ...nightSettings,
    fogEnabled: false,
    postEnabled: false,
    bloomStrength: 0.5,
    shadowsEnabled: false,
    quality: 'high',
  }, world);

  assert.equal(scene.fog, null);
  assert.equal(environment.keyLight.castShadow, false);
  assert.equal(frame.toneMappingExposure, 0.93);
  assert.equal(frame.bloomStrength, 0.31);

  environment.dispose();
  environment.dispose();
  assert.equal(environment.keyLight.parent, null);
  assert.equal(environment.fillLight.parent, null);
  assert.equal(environment.hemisphere.parent, null);
  assert.equal(scene.background, null);
  assert.throws(() => environment.update(1 / 60, nightSettings, world), /disposed/);
});
