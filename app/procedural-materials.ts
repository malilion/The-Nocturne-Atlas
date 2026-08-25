import * as THREE from 'three';

type SurfaceKind = 'terrain' | 'stone' | 'roof' | 'wood' | 'metal' | 'glass';

const FIELD_FUNCTIONS = `
  uniform float uMaterialSeed;
  varying vec3 vProceduralWorld;

  float fieldHash(vec2 p) {
    p = fract(p * vec2(123.34, 456.21));
    p += dot(p, p + 45.32 + uMaterialSeed);
    return fract(p.x * p.y);
  }

  float fieldNoise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    return mix(mix(fieldHash(i), fieldHash(i + vec2(1.0, 0.0)), f.x),
               mix(fieldHash(i + vec2(0.0, 1.0)), fieldHash(i + vec2(1.0)), f.x), f.y);
  }

  float fieldFbm(vec2 p) {
    float value = 0.0;
    float amplitude = 0.5;
    for (int octave = 0; octave < 4; octave++) {
      value += fieldNoise(p) * amplitude;
      p = p * 2.03 + 11.7;
      amplitude *= 0.5;
    }
    return value;
  }
`;

const SURFACE_COLOR: Record<SurfaceKind, string> = {
  terrain: `
    float macroNoise = fieldFbm(vProceduralWorld.xz * 0.055 + uMaterialSeed * 17.0);
    float detailNoise = fieldNoise(vProceduralWorld.xz * 0.42);
    float altitude = smoothstep(-2.0, 10.0, vProceduralWorld.y);
    vec3 loam = vec3(0.055, 0.085, 0.075);
    vec3 moss = vec3(0.085, 0.145, 0.105);
    vec3 highland = vec3(0.17, 0.185, 0.17);
    diffuseColor.rgb = mix(loam, moss, macroNoise * 0.82 + detailNoise * 0.18);
    diffuseColor.rgb = mix(diffuseColor.rgb, highland, altitude * (0.32 + macroNoise * 0.3));
  `,
  stone: `
    float stoneNoise = fieldFbm(vProceduralWorld.xz * 0.22 + vProceduralWorld.y * 0.07);
    float courses = smoothstep(0.44, 0.49, abs(fract(vProceduralWorld.y * 0.48) - 0.5));
    float blockShift = step(0.5, fract(floor(vProceduralWorld.y * 0.48) * 0.5));
    float joints = smoothstep(0.44, 0.49, abs(fract(vProceduralWorld.x * 0.24 + blockShift * 0.5) - 0.5));
    float mortar = max(courses, joints) * 0.24;
    vec3 coolStone = vec3(0.145, 0.17, 0.19);
    vec3 wornStone = vec3(0.25, 0.26, 0.255);
    vec3 mossTint = vec3(0.09, 0.15, 0.105);
    diffuseColor.rgb = mix(coolStone, wornStone, stoneNoise);
    diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.07, 0.075, 0.078), mortar);
    diffuseColor.rgb = mix(diffuseColor.rgb, mossTint, smoothstep(0.72, 0.94, stoneNoise) * 0.34);
  `,
  roof: `
    float slate = fieldFbm(vProceduralWorld.xz * 0.3 + vProceduralWorld.y * 0.18);
    float seams = smoothstep(0.43, 0.5, abs(fract((vProceduralWorld.x + vProceduralWorld.z) * 0.42) - 0.5));
    diffuseColor.rgb = mix(vec3(0.025, 0.035, 0.05), vec3(0.09, 0.105, 0.125), slate);
    diffuseColor.rgb *= 1.0 - seams * 0.22;
  `,
  wood: `
    float grain = fieldFbm(vec2(vProceduralWorld.y * 0.72, (vProceduralWorld.x + vProceduralWorld.z) * 0.16));
    float bands = sin(vProceduralWorld.y * 7.0 + grain * 4.0) * 0.5 + 0.5;
    diffuseColor.rgb = mix(vec3(0.055, 0.035, 0.028), vec3(0.16, 0.09, 0.055), grain * 0.72 + bands * 0.28);
  `,
  metal: `
    float hammered = fieldFbm(vProceduralWorld.xy * 1.35 + vProceduralWorld.z * 0.17);
    float streaks = smoothstep(0.78, 0.96, fieldNoise(vec2(vProceduralWorld.y * 2.8, vProceduralWorld.x * 0.22 + vProceduralWorld.z * 0.22)));
    vec3 blackIron = vec3(0.055, 0.065, 0.072);
    vec3 wornEdge = vec3(0.19, 0.22, 0.23);
    vec3 verdigris = vec3(0.08, 0.21, 0.18);
    diffuseColor.rgb = mix(blackIron, wornEdge, hammered * 0.72);
    diffuseColor.rgb = mix(diffuseColor.rgb, verdigris, streaks * (0.24 + hammered * 0.18));
  `,
  glass: `
    float cathedral = fieldFbm(vProceduralWorld.xy * 0.85 + vProceduralWorld.z * 0.12);
    float leadX = smoothstep(0.455, 0.49, abs(fract(vProceduralWorld.x * 0.72) - 0.5));
    float leadY = smoothstep(0.455, 0.49, abs(fract(vProceduralWorld.y * 0.72) - 0.5));
    float leading = max(leadX, leadY);
    vec3 midnightGlass = vec3(0.06, 0.17, 0.24);
    vec3 moonGlass = vec3(0.2, 0.48, 0.52);
    vec3 amberGlass = vec3(0.62, 0.27, 0.075);
    diffuseColor.rgb = mix(midnightGlass, moonGlass, cathedral);
    diffuseColor.rgb = mix(diffuseColor.rgb, amberGlass, smoothstep(0.7, 0.92, cathedral) * 0.48);
    diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.018, 0.024, 0.028), leading * 0.86);
  `,
};

function configureSurfaceMaterial<T extends THREE.MeshStandardMaterial>(material: T, kind: SurfaceKind, seed: number) {
  material.name = `procedural-${kind}`;
  const normalizedSeed = (seed % 9973) / 9973;
  material.onBeforeCompile = (shader) => {
    shader.uniforms.uMaterialSeed = { value: normalizedSeed };
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vProceduralWorld;')
      .replace('#include <worldpos_vertex>', '#include <worldpos_vertex>\nvProceduralWorld = worldPosition.xyz;');
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', `#include <common>\n${FIELD_FUNCTIONS}`)
      .replace('#include <color_fragment>', `#include <color_fragment>\n${SURFACE_COLOR[kind]}`);
  };
  material.customProgramCacheKey = () => `nocturne-${kind}-${seed}`;
  return material;
}

function createSurfaceMaterial(kind: SurfaceKind, seed: number, options: THREE.MeshStandardMaterialParameters) {
  return configureSurfaceMaterial(new THREE.MeshStandardMaterial(options), kind, seed);
}

export function createTerrainMaterial(seed: number) {
  return createSurfaceMaterial('terrain', seed, { color: 0xffffff, roughness: 0.94, metalness: 0.01 });
}

export function createStoneMaterial(seed: number) {
  return createSurfaceMaterial('stone', seed, { color: 0xffffff, roughness: 0.82, metalness: 0.06 });
}

export function createRoofMaterial(seed: number) {
  return createSurfaceMaterial('roof', seed, { color: 0xffffff, roughness: 0.64, metalness: 0.14 });
}

export function createWoodMaterial(seed: number) {
  return createSurfaceMaterial('wood', seed, { color: 0xffffff, roughness: 0.88, metalness: 0.01 });
}

export function createMetalMaterial(seed: number) {
  return createSurfaceMaterial('metal', seed, { color: 0xffffff, roughness: 0.36, metalness: 0.88 });
}

export function createGlassMaterial(seed: number) {
  return configureSurfaceMaterial(new THREE.MeshPhysicalMaterial({
    color: 0xffffff,
    roughness: 0.18,
    metalness: 0,
    transmission: 0.42,
    thickness: 0.32,
    transparent: true,
    opacity: 0.82,
    side: THREE.DoubleSide,
  }), 'glass', seed);
}
