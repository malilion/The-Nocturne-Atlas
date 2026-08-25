import * as THREE from 'three';
import type { QualityTier } from './world-core';

export type TimeOfDay = 'day' | 'night';

interface EnvironmentWorld {
  starMaterial: THREE.PointsMaterial;
  celestialMaterial: THREE.MeshBasicMaterial;
  celestialOrb: THREE.Object3D;
  waterMaterial: THREE.ShaderMaterial;
}

export interface EnvironmentSettings {
  timeOfDay: TimeOfDay;
  fogEnabled: boolean;
  fogDensity: number;
  postEnabled: boolean;
  bloomStrength: number;
  shadowsEnabled: boolean;
  quality: QualityTier;
}

export interface EnvironmentFrame {
  toneMappingExposure: number;
  bloomStrength: number;
}

export class EnvironmentSystem {
  readonly fog = new THREE.FogExp2(0x111827, 0.0095);
  readonly hemisphere = new THREE.HemisphereLight(0x7086b3, 0x191814, 1.55);
  readonly keyLight = new THREE.DirectionalLight(0xb8c9ff, 3.2);
  readonly fillLight = new THREE.DirectionalLight(0x7185b8, 0.82);

  private readonly background = new THREE.Color(0x080c16);
  private readonly nightSky = new THREE.Color(0x080c16);
  private readonly daySky = new THREE.Color(0x88b9d2);
  private readonly nightFog = new THREE.Color(0x111827);
  private readonly dayFog = new THREE.Color(0x9fc1cc);
  private readonly nightHemi = new THREE.Color(0x7086b3);
  private readonly dayHemi = new THREE.Color(0xc9e1ea);
  private readonly nightGround = new THREE.Color(0x191814);
  private readonly dayGround = new THREE.Color(0x667058);
  private readonly nightLight = new THREE.Color(0xb8c9ff);
  private readonly dayLight = new THREE.Color(0xffe0a8);
  private readonly nightFill = new THREE.Color(0x7185b8);
  private readonly dayFill = new THREE.Color(0xffd7aa);
  private readonly nightOrb = new THREE.Color().setRGB(1.25, 1.4, 2.1);
  private readonly dayOrb = new THREE.Color().setRGB(4.2, 2.8, 1.25);
  private readonly nightWater = new THREE.Color(0xb9cbff);
  private readonly dayWater = new THREE.Color(0xffd69b);
  private readonly nightLightPosition = new THREE.Vector3(-35, 52, -25);
  private readonly dayLightPosition = new THREE.Vector3(42, 58, 24);
  private readonly nightFillPosition = new THREE.Vector3(38, 24, 32);
  private readonly dayFillPosition = new THREE.Vector3(-28, 22, -20);
  private readonly nightOrbPosition = new THREE.Vector3(-52, 44, -62);
  private readonly dayOrbPosition = new THREE.Vector3(55, 52, 34);
  private readonly scene: THREE.Scene;
  private daylightBlend: number;
  private disposed = false;

  constructor(scene: THREE.Scene, initialTime: TimeOfDay = 'night') {
    this.scene = scene;
    this.daylightBlend = initialTime === 'day' ? 1 : 0;
    this.scene.background = this.background;
    this.scene.fog = this.fog;
    this.keyLight.position.copy(this.nightLightPosition);
    this.fillLight.position.copy(this.nightFillPosition);
    this.fillLight.castShadow = false;
    this.keyLight.castShadow = true;
    this.keyLight.shadow.mapSize.set(2048, 2048);
    this.keyLight.shadow.camera.left = -70;
    this.keyLight.shadow.camera.right = 70;
    this.keyLight.shadow.camera.top = 70;
    this.keyLight.shadow.camera.bottom = -70;
    this.scene.add(this.hemisphere, this.keyLight, this.fillLight);
  }

  get daylight() {
    return this.daylightBlend;
  }

  update(delta: number, settings: EnvironmentSettings, world: EnvironmentWorld): EnvironmentFrame {
    if (this.disposed) throw new Error('Cannot update a disposed EnvironmentSystem.');

    this.scene.fog = settings.fogEnabled ? this.fog : null;
    const daylightTarget = settings.timeOfDay === 'day' ? 1 : 0;
    this.daylightBlend = THREE.MathUtils.lerp(this.daylightBlend, daylightTarget, 1 - Math.exp(-delta * 2.4));
    const daylight = this.daylightBlend;

    this.background.lerpColors(this.nightSky, this.daySky, daylight);
    this.fog.color.lerpColors(this.nightFog, this.dayFog, daylight);
    this.fog.density = THREE.MathUtils.lerp(0.0095, 0.0065, daylight) * settings.fogDensity;
    this.hemisphere.color.lerpColors(this.nightHemi, this.dayHemi, daylight);
    this.hemisphere.groundColor.lerpColors(this.nightGround, this.dayGround, daylight);
    this.hemisphere.intensity = THREE.MathUtils.lerp(1.55, 2.45, daylight);
    this.keyLight.color.lerpColors(this.nightLight, this.dayLight, daylight);
    this.keyLight.intensity = THREE.MathUtils.lerp(3.2, 4.6, daylight);
    this.keyLight.position.lerpVectors(this.nightLightPosition, this.dayLightPosition, daylight);
    this.keyLight.castShadow = settings.shadowsEnabled;
    this.fillLight.color.lerpColors(this.nightFill, this.dayFill, daylight);
    this.fillLight.intensity = THREE.MathUtils.lerp(0.82, 0.34, daylight);
    this.fillLight.position.lerpVectors(this.nightFillPosition, this.dayFillPosition, daylight);
    world.starMaterial.opacity = THREE.MathUtils.lerp(0.72, 0.025, daylight);
    world.celestialMaterial.color.lerpColors(this.nightOrb, this.dayOrb, daylight);
    world.celestialOrb.position.lerpVectors(this.nightOrbPosition, this.dayOrbPosition, daylight);
    const moonUniform = world.waterMaterial.uniforms.uMoon;
    if (moonUniform?.value instanceof THREE.Color) {
      moonUniform.value.lerpColors(this.nightWater, this.dayWater, daylight);
    }

    const baseBloom = settings.quality === 'low' ? 0.28 : settings.quality === 'medium' ? 0.48 : 0.62;
    return {
      toneMappingExposure: THREE.MathUtils.lerp(settings.postEnabled ? 1.12 : 0.93, settings.postEnabled ? 1.16 : 1, daylight),
      bloomStrength: baseBloom * settings.bloomStrength,
    };
  }

  dispose() {
    if (this.disposed) return;
    this.disposed = true;
    this.scene.remove(this.hemisphere, this.keyLight, this.fillLight);
    if (this.scene.background === this.background) this.scene.background = null;
    if (this.scene.fog === this.fog) this.scene.fog = null;
  }
}
