import * as THREE from 'three';
import { hashSeed, terrainHeight, type WorldManifest } from './world-core.ts';

export type CameraMode = 'tour' | 'fly' | 'orbit';
export type LandmarkId = WorldManifest['cameraLandmarks'][number]['id'];
export type FixedView = WorldManifest['validationViews'][number];

export interface CameraUpdate {
  elapsed: number;
  delta: number;
  mode: CameraMode;
  tourPaused: boolean;
  reducedMotion: boolean;
  seed: string;
  requestedScene: LandmarkId | null;
  fixedView: FixedView | null;
}

export class CameraManager {
  private readonly camera: THREE.PerspectiveCamera;
  private readonly domElement: HTMLElement | null;
  private manifest: WorldManifest;
  private tourCurves: ReturnType<CameraManager['createTourCurves']>;
  private tourTime = 0;
  private lastTourIndex = -1;
  private tourHandoffStarted = -10;
  private readonly tourHandoffPosition = new THREE.Vector3();
  private readonly tourHandoffTarget = new THREE.Vector3();
  private readonly desiredTourPosition = new THREE.Vector3();
  private readonly desiredTourTarget = new THREE.Vector3();
  private readonly blendedTarget = new THREE.Vector3();
  private readonly sceneDestinationPosition = new THREE.Vector3();
  private readonly sceneDestinationTarget = new THREE.Vector3();
  private sceneHandoffActive = false;
  private readonly fixedViewFromPosition = new THREE.Vector3();
  private readonly fixedViewFromTarget = new THREE.Vector3();
  private readonly fixedViewPosition = new THREE.Vector3();
  private readonly fixedViewTarget = new THREE.Vector3();
  private fixedViewStarted = -10;
  private lastFixedViewId: FixedView['id'] | null = null;
  private mode: CameraMode = 'tour';
  private lastMode: CameraMode = 'tour';
  private flyYaw = 0;
  private flyPitch = 0;
  private orbitYaw = -0.5;
  private orbitPitch = 0.35;
  private orbitRadius = 68;
  private orbitDragging = false;
  private readonly velocity = new THREE.Vector3();
  private readonly movement = new THREE.Vector3();
  private readonly forward = new THREE.Vector3();
  private readonly right = new THREE.Vector3();
  private readonly orbitTarget = new THREE.Vector3(-7, 10, -4);
  private readonly keys = new Set<string>();
  private disposed = false;
  private controlsAttached = false;

  constructor(camera: THREE.PerspectiveCamera, domElement: HTMLElement | null, manifest: WorldManifest) {
    this.camera = camera;
    this.domElement = domElement;
    this.manifest = manifest;
    this.tourCurves = this.createTourCurves(manifest);
    this.attachControls();
  }

  setManifest(manifest: WorldManifest) {
    this.manifest = manifest;
    this.tourCurves = this.createTourCurves(manifest);
    this.tourTime = 0;
    this.lastTourIndex = -1;
    this.lastFixedViewId = null;
    this.sceneHandoffActive = false;
  }

  update(settings: CameraUpdate) {
    if (this.disposed) throw new Error('Cannot update a disposed CameraManager.');
    this.mode = settings.mode;
    let location: WorldManifest['cameraLandmarks'][number] | null = null;

    if (settings.requestedScene) {
      const sceneIndex = this.manifest.cameraLandmarks.findIndex((landmark) => landmark.id === settings.requestedScene);
      if (sceneIndex >= 0) {
        this.captureTourHandoff(settings.elapsed);
        this.tourTime = this.findLandmarkProgress(sceneIndex) * 52;
        this.lastTourIndex = sceneIndex;
        location = this.manifest.cameraLandmarks[sceneIndex];
        this.sceneDestinationPosition.set(...location.position);
        this.sceneDestinationTarget.set(...location.target);
        this.sceneHandoffActive = true;
      }
    }

    if (this.mode !== this.lastMode) {
      const euler = new THREE.Euler().setFromQuaternion(this.camera.quaternion, 'YXZ');
      this.flyYaw = euler.y;
      this.flyPitch = euler.x;
      const offset = this.camera.position.clone().sub(this.orbitTarget);
      this.orbitRadius = THREE.MathUtils.clamp(offset.length(), 27, 115);
      this.orbitYaw = Math.atan2(offset.z, offset.x);
      this.orbitPitch = Math.asin(THREE.MathUtils.clamp(offset.y / this.orbitRadius, -1, 1));
      if (this.mode === 'tour') this.captureTourHandoff(settings.elapsed);
      this.velocity.set(0, 0, 0);
      this.lastMode = this.mode;
    }

    if (this.mode === 'tour') {
      const handoffDuration = settings.reducedMotion ? 2.4 : 1.25;
      if (this.sceneHandoffActive) {
        const handoff = THREE.MathUtils.smoothstep(settings.elapsed - this.tourHandoffStarted, 0, handoffDuration);
        this.camera.position.lerpVectors(this.tourHandoffPosition, this.sceneDestinationPosition, handoff);
        this.blendedTarget.lerpVectors(this.tourHandoffTarget, this.sceneDestinationTarget, handoff);
        this.camera.lookAt(this.blendedTarget);
        if (handoff >= 1 && !settings.tourPaused) this.sceneHandoffActive = false;
      } else {
        if (!settings.tourPaused) this.tourTime += settings.delta * (settings.reducedMotion ? 0.38 : 1);
        const tourProgress = (this.tourTime % 52) / 52;
        this.tourCurves.positions.getPointAt(tourProgress, this.desiredTourPosition);
        this.tourCurves.targets.getPointAt(tourProgress, this.desiredTourTarget);
        const handoff = THREE.MathUtils.smoothstep(settings.elapsed - this.tourHandoffStarted, 0, handoffDuration);
        this.camera.position.lerpVectors(this.tourHandoffPosition, this.desiredTourPosition, handoff);
        this.blendedTarget.lerpVectors(this.tourHandoffTarget, this.desiredTourTarget, handoff);
        this.camera.lookAt(this.blendedTarget);
        const tourIndex = Math.floor(tourProgress * this.manifest.cameraLandmarks.length) % this.manifest.cameraLandmarks.length;
        if (tourIndex !== this.lastTourIndex) {
          this.lastTourIndex = tourIndex;
          location = this.manifest.cameraLandmarks[tourIndex];
        }
      }
    } else if (this.mode === 'orbit') {
      this.camera.position.set(
        this.orbitTarget.x + Math.cos(this.orbitYaw) * Math.cos(this.orbitPitch) * this.orbitRadius,
        this.orbitTarget.y + Math.sin(this.orbitPitch) * this.orbitRadius,
        this.orbitTarget.z + Math.sin(this.orbitYaw) * Math.cos(this.orbitPitch) * this.orbitRadius,
      );
      this.camera.lookAt(this.orbitTarget);
    } else {
      this.updateFly(settings.delta, settings.seed);
    }

    if (settings.fixedView) {
      if (settings.fixedView.id !== this.lastFixedViewId) {
        this.fixedViewFromPosition.copy(this.camera.position);
        this.camera.getWorldDirection(this.forward);
        this.fixedViewFromTarget.copy(this.camera.position).addScaledVector(this.forward, 20);
        this.fixedViewPosition.set(...settings.fixedView.position);
        this.fixedViewTarget.set(...settings.fixedView.target);
        this.fixedViewStarted = settings.elapsed;
        this.lastFixedViewId = settings.fixedView.id;
      }
      const fixedBlend = THREE.MathUtils.smoothstep(settings.elapsed - this.fixedViewStarted, 0, settings.reducedMotion ? 2.4 : 1.25);
      this.camera.position.lerpVectors(this.fixedViewFromPosition, this.fixedViewPosition, fixedBlend);
      this.blendedTarget.lerpVectors(this.fixedViewFromTarget, this.fixedViewTarget, fixedBlend);
      this.camera.lookAt(this.blendedTarget);
    } else {
      this.lastFixedViewId = null;
    }

    return location;
  }

  dispose() {
    if (this.disposed) return;
    this.disposed = true;
    if (!this.controlsAttached || !this.domElement) return;
    window.removeEventListener('keydown', this.onKeyDown);
    window.removeEventListener('keyup', this.onKeyUp);
    window.removeEventListener('mouseup', this.onPointerUp);
    document.removeEventListener('mousemove', this.onMouseMove);
    this.domElement.removeEventListener('mousedown', this.onPointerDown);
    this.domElement.removeEventListener('wheel', this.onWheel);
    this.controlsAttached = false;
  }

  private createTourCurves(manifest: WorldManifest) {
    return {
      positions: new THREE.CatmullRomCurve3(manifest.cameraLandmarks.map((landmark) => new THREE.Vector3(...landmark.position)), true, 'catmullrom', 0.26),
      targets: new THREE.CatmullRomCurve3(manifest.cameraLandmarks.map((landmark) => new THREE.Vector3(...landmark.target)), true, 'catmullrom', 0.3),
    };
  }

  private captureTourHandoff(elapsed: number) {
    this.tourHandoffPosition.copy(this.camera.position);
    this.camera.getWorldDirection(this.forward);
    this.tourHandoffTarget.copy(this.camera.position).addScaledVector(this.forward, 20);
    this.tourHandoffStarted = elapsed;
  }

  private findLandmarkProgress(sceneIndex: number) {
    const destination = this.manifest.cameraLandmarks[sceneIndex].position;
    const destinationVector = new THREE.Vector3(...destination);
    const sample = new THREE.Vector3();
    let closestProgress = sceneIndex / this.manifest.cameraLandmarks.length;
    let closestDistance = Number.POSITIVE_INFINITY;
    for (let index = 0; index <= 512; index += 1) {
      const progress = index / 512;
      this.tourCurves.positions.getPointAt(progress, sample);
      const distance = sample.distanceToSquared(destinationVector);
      if (distance < closestDistance) {
        closestDistance = distance;
        closestProgress = progress;
      }
    }
    return closestProgress;
  }

  private updateFly(delta: number, seed: string) {
    this.camera.rotation.order = 'YXZ';
    this.camera.rotation.y = this.flyYaw;
    this.camera.rotation.x = this.flyPitch;
    this.camera.getWorldDirection(this.forward);
    this.right.crossVectors(this.forward, this.camera.up).normalize();
    this.movement.set(0, 0, 0);
    if (this.keys.has('w')) this.movement.add(this.forward);
    if (this.keys.has('s')) this.movement.sub(this.forward);
    if (this.keys.has('d')) this.movement.add(this.right);
    if (this.keys.has('a')) this.movement.sub(this.right);
    if (this.keys.has('e')) this.movement.y += 1;
    if (this.keys.has('q')) this.movement.y -= 1;
    if (this.movement.lengthSq() > 0) {
      this.movement.normalize().multiplyScalar(this.keys.has('shift') ? 34 : 14);
      this.velocity.addScaledVector(this.movement, delta * 3.2);
    }
    this.velocity.multiplyScalar(Math.exp(-4.5 * delta));
    this.camera.position.addScaledVector(this.velocity, delta);
    this.camera.position.y = Math.max(this.camera.position.y, terrainHeight(this.camera.position.x, this.camera.position.z, hashSeed(seed)) + 1.8);
  }

  private attachControls() {
    if (!this.domElement || typeof window === 'undefined' || typeof document === 'undefined') return;
    window.addEventListener('keydown', this.onKeyDown);
    window.addEventListener('keyup', this.onKeyUp);
    window.addEventListener('mouseup', this.onPointerUp);
    document.addEventListener('mousemove', this.onMouseMove);
    this.domElement.addEventListener('mousedown', this.onPointerDown);
    this.domElement.addEventListener('wheel', this.onWheel, { passive: true });
    this.controlsAttached = true;
  }

  private readonly onKeyDown = (event: KeyboardEvent) => this.keys.add(event.key.toLowerCase());
  private readonly onKeyUp = (event: KeyboardEvent) => this.keys.delete(event.key.toLowerCase());
  private readonly onPointerDown = () => {
    if (this.mode === 'fly') this.domElement?.requestPointerLock();
    if (this.mode === 'orbit') this.orbitDragging = true;
  };
  private readonly onPointerUp = () => { this.orbitDragging = false; };
  private readonly onMouseMove = (event: MouseEvent) => {
    if (this.mode === 'fly' && document.pointerLockElement === this.domElement) {
      this.flyYaw -= event.movementX * 0.0022;
      this.flyPitch = THREE.MathUtils.clamp(this.flyPitch - event.movementY * 0.0022, -1.35, 1.35);
    } else if (this.mode === 'orbit' && this.orbitDragging) {
      this.orbitYaw -= event.movementX * 0.004;
      this.orbitPitch = THREE.MathUtils.clamp(this.orbitPitch + event.movementY * 0.004, 0.08, 1.35);
    }
  };
  private readonly onWheel = (event: WheelEvent) => {
    if (this.mode === 'orbit') this.orbitRadius = THREE.MathUtils.clamp(this.orbitRadius + event.deltaY * 0.035, 27, 115);
  };
}
