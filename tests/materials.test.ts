import assert from 'node:assert/strict';
import test from 'node:test';
import { createGlassMaterial, createMetalMaterial, createRoofMaterial, createStoneMaterial, createTerrainMaterial, createWoodMaterial } from '../app/procedural-materials.ts';

test('procedural materials expose stable seed-aware program keys', () => {
  assert.equal(createTerrainMaterial(42).customProgramCacheKey(), createTerrainMaterial(42).customProgramCacheKey());
  assert.notEqual(createTerrainMaterial(42).customProgramCacheKey(), createTerrainMaterial(43).customProgramCacheKey());
  assert.match(createStoneMaterial(42).customProgramCacheKey(), /stone/);
  assert.match(createRoofMaterial(42).customProgramCacheKey(), /roof/);
  assert.match(createWoodMaterial(42).customProgramCacheKey(), /wood/);
  assert.match(createMetalMaterial(42).customProgramCacheKey(), /metal/);
  assert.match(createGlassMaterial(42).customProgramCacheKey(), /glass/);
});

test('metal and glass expose distinct physical surface responses', () => {
  const metal = createMetalMaterial(91);
  const glass = createGlassMaterial(91);
  assert.ok(metal.metalness > 0.8);
  assert.ok(glass.transmission > 0.4);
  assert.equal(glass.transparent, true);
});

test('shader hooks inject world-space procedural fields', () => {
  const material = createStoneMaterial(77);
  const shader = {
    uniforms: {},
    vertexShader: '#include <common>\n#include <worldpos_vertex>',
    fragmentShader: '#include <common>\n#include <color_fragment>',
  };
  material.onBeforeCompile(shader as never, null as never);
  assert.match(shader.vertexShader, /vProceduralWorld/);
  assert.match(shader.fragmentShader, /fieldFbm/);
  assert.match(shader.fragmentShader, /mortar/);
  assert.ok('uMaterialSeed' in shader.uniforms);
});
