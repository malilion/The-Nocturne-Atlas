'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import * as THREE from 'three';

const DEFAULT_SEED = 'MAGIC-001';
type CameraMode = 'tour' | 'fly' | 'orbit';

interface PerformanceStats {
  fps: number;
  calls: number;
  triangles: number;
}

function hashSeed(value: string) {
  let hash = 2166136261;
  for (let i = 0; i < value.length; i += 1) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function mulberry32(seed: number) {
  return () => {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function seededNoise(x: number, z: number, seed: number) {
  const value = Math.sin(x * 12.9898 + z * 78.233 + seed * 0.001) * 43758.5453;
  return value - Math.floor(value);
}

function terrainHeight(x: number, z: number, seed: number) {
  const broad = Math.sin(x * 0.045 + seed) * 1.8 + Math.cos(z * 0.052 - seed) * 1.4;
  const detail = (seededNoise(Math.floor(x * 0.2), Math.floor(z * 0.2), seed) - 0.5) * 1.4;
  const castleRise = 8 * Math.exp(-((x + 7) ** 2 + (z + 4) ** 2) / 580);
  const lakeBasin = 5.5 * Math.exp(-((x - 28) ** 2 + (z - 18) ** 2) / 700);
  return broad + detail + castleRise - lakeBasin;
}

function disposeObject(root: THREE.Object3D) {
  const geometries = new Set<THREE.BufferGeometry>();
  const materials = new Set<THREE.Material>();
  root.traverse((object) => {
    const mesh = object as THREE.Mesh;
    if (mesh.geometry) geometries.add(mesh.geometry);
    const meshMaterials = Array.isArray(mesh.material) ? mesh.material : mesh.material ? [mesh.material] : [];
    meshMaterials.forEach((material) => materials.add(material));
  });
  geometries.forEach((geometry) => geometry.dispose());
  materials.forEach((material) => material.dispose());
}

function createWorld(scene: THREE.Scene, seedText: string) {
  const seed = hashSeed(seedText);
  const random = mulberry32(seed);
  const root = new THREE.Group();
  root.name = `world-${seedText}`;
  scene.add(root);

  const terrainGeometry = new THREE.PlaneGeometry(150, 150, 96, 96);
  terrainGeometry.rotateX(-Math.PI / 2);
  const positions = terrainGeometry.attributes.position;
  for (let i = 0; i < positions.count; i += 1) {
    const x = positions.getX(i);
    const z = positions.getZ(i);
    positions.setY(i, terrainHeight(x, z, seed));
  }
  terrainGeometry.computeVertexNormals();
  const terrain = new THREE.Mesh(
    terrainGeometry,
    new THREE.MeshStandardMaterial({ color: 0x17221f, roughness: 0.92, metalness: 0.02 }),
  );
  terrain.receiveShadow = true;
  root.add(terrain);

  const stone = new THREE.MeshStandardMaterial({ color: 0x323941, roughness: 0.78, metalness: 0.08 });
  const roof = new THREE.MeshStandardMaterial({ color: 0x11161d, roughness: 0.55, metalness: 0.18 });
  const windowMaterial = new THREE.MeshBasicMaterial({ color: 0xffb55f, toneMapped: false });
  const castle = new THREE.Group();
  castle.position.set(-7, terrainHeight(-7, -4, seed) + 0.2, -4);
  root.add(castle);

  const addTower = (x: number, z: number, radius: number, height: number, variant: number) => {
    const tower = new THREE.Group();
    tower.position.set(x, 0, z);
    const shaft = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius * 1.12, height, 10), stone);
    shaft.position.y = height / 2;
    shaft.castShadow = true;
    shaft.receiveShadow = true;
    tower.add(shaft);
    const crown = new THREE.Mesh(new THREE.CylinderGeometry(radius * 1.2, radius * 1.2, 1.1, 10), stone);
    crown.position.y = height;
    crown.castShadow = true;
    tower.add(crown);
    const roofMesh = new THREE.Mesh(new THREE.ConeGeometry(radius * 1.3, 5.5 + variant, 10), roof);
    roofMesh.position.y = height + 3.2 + variant / 2;
    roofMesh.castShadow = true;
    tower.add(roofMesh);
    for (let floor = 0; floor < Math.max(2, Math.floor(height / 5)); floor += 1) {
      const angle = floor * 2.1 + variant;
      const window = new THREE.Mesh(new THREE.PlaneGeometry(0.7, 1.25), windowMaterial);
      window.position.set(Math.sin(angle) * (radius + 0.01), 3.2 + floor * 4.2, Math.cos(angle) * (radius + 0.01));
      window.lookAt(0, window.position.y, 0);
      tower.add(window);
    }
    castle.add(tower);
  };

  addTower(-9, -3, 3.6, 18 + random() * 4, 0.4);
  addTower(7, -5, 3, 23 + random() * 5, 1.4);
  addTower(2, 8, 4, 16 + random() * 4, 0.8);
  addTower(-12, 8, 2.7, 14 + random() * 5, 1.9);

  const hall = new THREE.Mesh(new THREE.BoxGeometry(17, 9, 10), stone);
  hall.position.set(-1, 4.5, 0);
  hall.castShadow = true;
  hall.receiveShadow = true;
  castle.add(hall);
  const hallRoof = new THREE.Mesh(new THREE.ConeGeometry(8.7, 7, 4), roof);
  hallRoof.rotation.y = Math.PI / 4;
  hallRoof.scale.z = 0.72;
  hallRoof.position.set(-1, 12.2, 0);
  hallRoof.castShadow = true;
  castle.add(hallRoof);

  for (let x = -7; x <= 5; x += 3) {
    const glowingWindow = new THREE.Mesh(new THREE.PlaneGeometry(1.15, 2), windowMaterial);
    glowingWindow.position.set(x, 5, 5.01);
    castle.add(glowingWindow);
  }

  const bridge = new THREE.Mesh(new THREE.BoxGeometry(12, 0.8, 2), stone);
  bridge.position.set(-8, 10, 3.6);
  bridge.rotation.z = -0.18;
  bridge.castShadow = true;
  castle.add(bridge);

  const waterMaterial = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    uniforms: { uTime: { value: 0 }, uMoon: { value: new THREE.Color(0xb9cbff) } },
    vertexShader: `
      uniform float uTime;
      varying vec3 vWorld;
      varying float vWave;
      void main() {
        vec3 p = position;
        float wave = sin(p.x * .22 + uTime * .55) * .18 + cos(p.y * .28 - uTime * .42) * .12;
        p.z += wave;
        vWave = wave;
        vec4 world = modelMatrix * vec4(p, 1.0);
        vWorld = world.xyz;
        gl_Position = projectionMatrix * viewMatrix * world;
      }
    `,
    fragmentShader: `
      uniform vec3 uMoon;
      varying vec3 vWorld;
      varying float vWave;
      void main() {
        vec3 viewDir = normalize(cameraPosition - vWorld);
        float fresnel = pow(1.0 - max(dot(viewDir, vec3(0.0, 1.0, 0.0)), 0.0), 2.4);
        vec3 deep = vec3(.025, .09, .12);
        vec3 edge = vec3(.09, .20, .24);
        vec3 color = mix(deep, edge, fresnel) + uMoon * pow(max(vWave + .12, 0.0), 5.0) * 2.0;
        gl_FragColor = vec4(color, .78 + fresnel * .16);
      }
    `,
  });
  const lake = new THREE.Mesh(new THREE.CircleGeometry(26, 96), waterMaterial);
  lake.rotation.x = -Math.PI / 2;
  lake.position.set(28, -2.1, 18);
  root.add(lake);

  const trunkGeometry = new THREE.CylinderGeometry(0.22, 0.42, 3.5, 6);
  const trunkMaterial = new THREE.MeshStandardMaterial({ color: 0x1d1615, roughness: 1 });
  const trunks = new THREE.InstancedMesh(trunkGeometry, trunkMaterial, 260);
  const canopyGeometry = new THREE.ConeGeometry(1.5, 5.2, 7);
  const canopyMaterial = new THREE.MeshStandardMaterial({ color: 0x111c18, roughness: 0.94 });
  const canopies = new THREE.InstancedMesh(canopyGeometry, canopyMaterial, 260);
  const matrix = new THREE.Matrix4();
  const quaternion = new THREE.Quaternion();
  const scale = new THREE.Vector3();
  const position = new THREE.Vector3();
  for (let i = 0; i < 260; i += 1) {
    let x = 0;
    let z = 0;
    do {
      const angle = random() * Math.PI * 2;
      const distance = 32 + random() * 39;
      x = Math.cos(angle) * distance;
      z = Math.sin(angle) * distance;
    } while ((x - 28) ** 2 + (z - 18) ** 2 < 1050 || (x + 7) ** 2 + (z + 4) ** 2 < 800);
    const y = terrainHeight(x, z, seed);
    const treeScale = 0.7 + random() * 1.25;
    quaternion.setFromAxisAngle(new THREE.Vector3(0, 1, 0), random() * Math.PI * 2);
    position.set(x, y + (3.5 * treeScale) / 2, z);
    scale.set(treeScale, treeScale, treeScale);
    matrix.compose(position, quaternion, scale);
    trunks.setMatrixAt(i, matrix);
    position.y = y + 3.5 * treeScale + 2.2 * treeScale;
    matrix.compose(position, quaternion, scale);
    canopies.setMatrixAt(i, matrix);
  }
  trunks.castShadow = true;
  canopies.castShadow = true;
  root.add(trunks, canopies);

  const fireflyGeometry = new THREE.SphereGeometry(0.08, 5, 5);
  const fireflyMaterial = new THREE.MeshBasicMaterial({ color: 0xb9ffb0, toneMapped: false });
  const fireflies = new THREE.InstancedMesh(fireflyGeometry, fireflyMaterial, 90);
  for (let i = 0; i < 90; i += 1) {
    const x = -50 + random() * 100;
    const z = -50 + random() * 100;
    const y = terrainHeight(x, z, seed) + 1.5 + random() * 5;
    matrix.makeTranslation(x, y, z);
    fireflies.setMatrixAt(i, matrix);
  }
  root.add(fireflies);

  const village = new THREE.Group();
  village.name = 'village-of-lumen-row';
  root.add(village);
  const houseGeometry = new THREE.BoxGeometry(1, 1, 1);
  const plaster = new THREE.MeshStandardMaterial({ color: 0x544b43, roughness: 0.9 });
  const timber = new THREE.MeshStandardMaterial({ color: 0x201b19, roughness: 0.88 });
  const villageRoof = new THREE.ConeGeometry(1, 1, 4);
  const roadMaterial = new THREE.MeshStandardMaterial({ color: 0x242321, roughness: 1 });
  const road = new THREE.Mesh(new THREE.PlaneGeometry(41, 4.2, 10, 1), roadMaterial);
  road.rotation.x = -Math.PI / 2;
  road.rotation.z = -0.14;
  road.position.set(-31, terrainHeight(-31, 13, seed) + 0.12, 13);
  road.receiveShadow = true;
  village.add(road);
  for (let i = 0; i < 16; i += 1) {
    const side = i % 2 === 0 ? -1 : 1;
    const x = -49 + Math.floor(i / 2) * 5.2 + random() * 1.1;
    const z = 13 + side * (4.2 + random() * 2.5);
    const y = terrainHeight(x, z, seed);
    const width = 2.5 + random() * 1.7;
    const depth = 2.8 + random() * 1.5;
    const height = 3 + random() * 2.4;
    const house = new THREE.Group();
    house.position.set(x, y, z);
    house.rotation.y = -0.14 + (random() - 0.5) * 0.18;
    const body = new THREE.Mesh(houseGeometry, i % 3 === 0 ? timber : plaster);
    body.scale.set(width, height, depth);
    body.position.y = height / 2;
    body.castShadow = true;
    body.receiveShadow = true;
    house.add(body);
    const cap = new THREE.Mesh(villageRoof, roof);
    cap.scale.set(width * 0.84, 2.3 + random(), depth * 0.84);
    cap.rotation.y = Math.PI / 4;
    cap.position.y = height + 1.2;
    cap.castShadow = true;
    house.add(cap);
    const litWindow = new THREE.Mesh(new THREE.PlaneGeometry(0.55, 0.8), windowMaterial);
    litWindow.position.set(0, height * 0.55, side < 0 ? depth / 2 + 0.01 : -depth / 2 - 0.01);
    litWindow.rotation.y = side < 0 ? 0 : Math.PI;
    house.add(litWindow);
    village.add(house);
  }

  const stairRoot = new THREE.Group();
  stairRoot.name = 'moving-staircase';
  stairRoot.position.set(-5, terrainHeight(-5, 1, seed) + 8.5, 2.5);
  const stepGeometry = new THREE.BoxGeometry(1.35, 0.3, 3.2);
  const stairs = new THREE.InstancedMesh(stepGeometry, stone, 16);
  for (let i = 0; i < 16; i += 1) {
    matrix.compose(
      new THREE.Vector3(i * 1.08, i * 0.6, 0),
      new THREE.Quaternion(),
      new THREE.Vector3(1, 1, 1),
    );
    stairs.setMatrixAt(i, matrix);
  }
  stairs.castShadow = true;
  stairs.receiveShadow = true;
  stairRoot.add(stairs);
  root.add(stairRoot);

  const candleRoot = new THREE.Group();
  candleRoot.name = 'floating-candles';
  const waxGeometry = new THREE.CylinderGeometry(0.07, 0.08, 0.55, 6);
  const waxMaterial = new THREE.MeshStandardMaterial({ color: 0xe5ddc4, roughness: 0.7 });
  const flameGeometry = new THREE.SphereGeometry(0.095, 5, 5);
  const flameMaterial = new THREE.MeshBasicMaterial({ color: 0xffa63e, toneMapped: false });
  const wax = new THREE.InstancedMesh(waxGeometry, waxMaterial, 120);
  const flames = new THREE.InstancedMesh(flameGeometry, flameMaterial, 120);
  for (let i = 0; i < 120; i += 1) {
    const angle = random() * Math.PI * 2;
    const radius = 7 + random() * 15;
    const x = -7 + Math.cos(angle) * radius;
    const z = -4 + Math.sin(angle) * radius;
    const y = terrainHeight(x, z, seed) + 9 + random() * 15;
    matrix.makeTranslation(x, y, z);
    wax.setMatrixAt(i, matrix);
    matrix.makeTranslation(x, y + 0.39, z);
    flames.setMatrixAt(i, matrix);
  }
  candleRoot.add(wax, flames);
  root.add(candleRoot);

  const moon = new THREE.Mesh(new THREE.SphereGeometry(4.3, 32, 32), new THREE.MeshBasicMaterial({ color: 0xdbe5ff, toneMapped: false }));
  moon.position.set(-52, 44, -62);
  root.add(moon);

  return { root, waterMaterial, stairRoot, candleRoot };
}

export default function Home() {
  const mountRef = useRef<HTMLDivElement>(null);
  const seedRef = useRef(DEFAULT_SEED);
  const modeRef = useRef<CameraMode>('tour');
  const [seed, setSeed] = useState(DEFAULT_SEED);
  const [activeSeed, setActiveSeed] = useState(DEFAULT_SEED);
  const [copied, setCopied] = useState(false);
  const [mode, setMode] = useState<CameraMode>('tour');
  const [stats, setStats] = useState<PerformanceStats>({ fps: 60, calls: 0, triangles: 0 });
  const [hudOpen, setHudOpen] = useState(false);

  useEffect(() => { seedRef.current = activeSeed; }, [activeSeed]);
  useEffect(() => { modeRef.current = mode; }, [mode]);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x05070d);
    scene.fog = new THREE.FogExp2(0x090d15, 0.012);
    const camera = new THREE.PerspectiveCamera(48, mount.clientWidth / mount.clientHeight, 0.1, 350);
    const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.7));
    renderer.setSize(mount.clientWidth, mount.clientHeight);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.05;
    mount.appendChild(renderer.domElement);

    const hemisphere = new THREE.HemisphereLight(0x5a6f9a, 0x11100e, 1.3);
    const moonLight = new THREE.DirectionalLight(0xb8c9ff, 3.2);
    moonLight.position.set(-35, 52, -25);
    moonLight.castShadow = true;
    moonLight.shadow.mapSize.set(2048, 2048);
    moonLight.shadow.camera.left = -70;
    moonLight.shadow.camera.right = 70;
    moonLight.shadow.camera.top = 70;
    moonLight.shadow.camera.bottom = -70;
    scene.add(hemisphere, moonLight);

    let world = createWorld(scene, seedRef.current);
    const clock = new THREE.Clock();
    let frame = 0;
    let rebuildRequested = false;
    let previousElapsed = 0;
    let framesSinceSample = 0;
    let sampleStarted = 0;
    let lastMode: CameraMode = 'tour';
    let flyYaw = 0;
    let flyPitch = 0;
    let orbitYaw = -0.5;
    let orbitPitch = 0.35;
    let orbitRadius = 68;
    let orbitDragging = false;
    const velocity = new THREE.Vector3();
    const movement = new THREE.Vector3();
    const forward = new THREE.Vector3();
    const right = new THREE.Vector3();
    const orbitTarget = new THREE.Vector3(-7, 10, -4);
    const keys = new Set<string>();
    const rebuild = () => { rebuildRequested = true; };
    window.addEventListener('wizard-rebuild', rebuild);

    const onKeyDown = (event: KeyboardEvent) => keys.add(event.key.toLowerCase());
    const onKeyUp = (event: KeyboardEvent) => keys.delete(event.key.toLowerCase());
    const onPointerDown = () => {
      if (modeRef.current === 'fly') renderer.domElement.requestPointerLock();
      if (modeRef.current === 'orbit') orbitDragging = true;
    };
    const onPointerUp = () => { orbitDragging = false; };
    const onMouseMove = (event: MouseEvent) => {
      if (modeRef.current === 'fly' && document.pointerLockElement === renderer.domElement) {
        flyYaw -= event.movementX * 0.0022;
        flyPitch = THREE.MathUtils.clamp(flyPitch - event.movementY * 0.0022, -1.35, 1.35);
      } else if (modeRef.current === 'orbit' && orbitDragging) {
        orbitYaw -= event.movementX * 0.004;
        orbitPitch = THREE.MathUtils.clamp(orbitPitch + event.movementY * 0.004, 0.08, 1.35);
      }
    };
    const onWheel = (event: WheelEvent) => {
      if (modeRef.current === 'orbit') orbitRadius = THREE.MathUtils.clamp(orbitRadius + event.deltaY * 0.035, 27, 115);
    };
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('mouseup', onPointerUp);
    document.addEventListener('mousemove', onMouseMove);
    renderer.domElement.addEventListener('mousedown', onPointerDown);
    renderer.domElement.addEventListener('wheel', onWheel, { passive: true });

    const render = () => {
      frame = requestAnimationFrame(render);
      const elapsed = clock.getElapsedTime();
      const delta = Math.min(0.05, elapsed - previousElapsed);
      previousElapsed = elapsed;
      if (rebuildRequested) {
        disposeObject(world.root);
        scene.remove(world.root);
        world = createWorld(scene, seedRef.current);
        rebuildRequested = false;
      }
      world.waterMaterial.uniforms.uTime.value = elapsed;
      const stairPhase = (elapsed % 16) / 16;
      const stairBlend = stairPhase < 0.5 ? THREE.MathUtils.smoothstep(stairPhase, 0.08, 0.42) : 1 - THREE.MathUtils.smoothstep(stairPhase, 0.58, 0.92);
      world.stairRoot.rotation.y = THREE.MathUtils.lerp(-0.42, 0.7, stairBlend);
      world.candleRoot.position.y = Math.sin(elapsed * 0.8) * 0.24;

      const currentMode = modeRef.current;
      if (currentMode !== lastMode) {
        const euler = new THREE.Euler().setFromQuaternion(camera.quaternion, 'YXZ');
        flyYaw = euler.y;
        flyPitch = euler.x;
        const offset = camera.position.clone().sub(orbitTarget);
        orbitRadius = THREE.MathUtils.clamp(offset.length(), 27, 115);
        orbitYaw = Math.atan2(offset.z, offset.x);
        orbitPitch = Math.asin(THREE.MathUtils.clamp(offset.y / orbitRadius, -1, 1));
        velocity.set(0, 0, 0);
        lastMode = currentMode;
      }

      if (currentMode === 'tour') {
        const angle = elapsed * 0.035 - 0.45;
        const sweep = 61 + Math.sin(elapsed * 0.12) * 9;
        camera.position.set(Math.cos(angle) * sweep - 2, 27 + Math.sin(elapsed * 0.08) * 3, Math.sin(angle) * sweep + 4);
        camera.lookAt(-4, 9, 0);
      } else if (currentMode === 'orbit') {
        camera.position.set(
          orbitTarget.x + Math.cos(orbitYaw) * Math.cos(orbitPitch) * orbitRadius,
          orbitTarget.y + Math.sin(orbitPitch) * orbitRadius,
          orbitTarget.z + Math.sin(orbitYaw) * Math.cos(orbitPitch) * orbitRadius,
        );
        camera.lookAt(orbitTarget);
      } else {
        camera.rotation.order = 'YXZ';
        camera.rotation.y = flyYaw;
        camera.rotation.x = flyPitch;
        camera.getWorldDirection(forward);
        right.crossVectors(forward, camera.up).normalize();
        movement.set(0, 0, 0);
        if (keys.has('w')) movement.add(forward);
        if (keys.has('s')) movement.sub(forward);
        if (keys.has('d')) movement.add(right);
        if (keys.has('a')) movement.sub(right);
        if (keys.has('e')) movement.y += 1;
        if (keys.has('q')) movement.y -= 1;
        if (movement.lengthSq() > 0) {
          movement.normalize().multiplyScalar(keys.has('shift') ? 34 : 14);
          velocity.addScaledVector(movement, delta * 3.2);
        }
        velocity.multiplyScalar(Math.exp(-4.5 * delta));
        camera.position.addScaledVector(velocity, delta);
        camera.position.y = Math.max(camera.position.y, terrainHeight(camera.position.x, camera.position.z, hashSeed(seedRef.current)) + 1.8);
      }
      renderer.render(scene, camera);

      framesSinceSample += 1;
      if (elapsed - sampleStarted > 0.65) {
        setStats({
          fps: Math.round(framesSinceSample / Math.max(0.001, elapsed - sampleStarted)),
          calls: renderer.info.render.calls,
          triangles: renderer.info.render.triangles,
        });
        framesSinceSample = 0;
        sampleStarted = elapsed;
      }
    };
    render();

    const resize = () => {
      const width = mount.clientWidth;
      const height = mount.clientHeight;
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height);
    };
    window.addEventListener('resize', resize);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('resize', resize);
      window.removeEventListener('wizard-rebuild', rebuild);
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('mouseup', onPointerUp);
      document.removeEventListener('mousemove', onMouseMove);
      renderer.domElement.removeEventListener('mousedown', onPointerDown);
      renderer.domElement.removeEventListener('wheel', onWheel);
      disposeObject(world.root);
      scene.clear();
      renderer.dispose();
      renderer.domElement.remove();
    };
  }, []);

  const regenerate = useCallback(() => {
    const normalized = seed.trim() || DEFAULT_SEED;
    setSeed(normalized);
    setActiveSeed(normalized);
    seedRef.current = normalized;
    window.dispatchEvent(new Event('wizard-rebuild'));
  }, [seed]);

  const copySeed = useCallback(async () => {
    await navigator.clipboard.writeText(activeSeed);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1400);
  }, [activeSeed]);

  const randomSeed = useCallback(() => {
    const values = new Uint32Array(1);
    crypto.getRandomValues(values);
    const next = `MAGIC-${String(values[0] % 100000).padStart(5, '0')}`;
    setSeed(next);
    setActiveSeed(next);
    seedRef.current = next;
    window.dispatchEvent(new Event('wizard-rebuild'));
  }, []);

  const selectMode = useCallback((nextMode: CameraMode) => {
    modeRef.current = nextMode;
    setMode(nextMode);
    if (nextMode !== 'fly' && document.pointerLockElement) document.exitPointerLock();
  }, []);

  useEffect(() => {
    const shortcuts = (event: KeyboardEvent) => {
      if (event.target instanceof HTMLInputElement) return;
      const key = event.key.toLowerCase();
      if (key === 't') selectMode('tour');
      if (key === 'f') selectMode('fly');
      if (key === 'o') selectMode('orbit');
      if (key === 'r') randomSeed();
    };
    window.addEventListener('keydown', shortcuts);
    return () => window.removeEventListener('keydown', shortcuts);
  }, [randomSeed, selectMode]);

  return (
    <main className="experience-shell">
      <div ref={mountRef} className="world-canvas" aria-label="Procedurally generated moonlit wizarding world" />
      <div className="atmosphere" aria-hidden="true" />
      <div className="edge-runes" aria-hidden="true">✦　·　✧　·　✦</div>
      <header className="topbar">
        <a className="brand" href="#world" aria-label="The Nocturne Atlas home">
          <span className="brand-mark">N</span>
          <span><strong>The Nocturne Atlas</strong><small>Procedural arcane realms</small></span>
        </a>
        <div className="top-actions">
          <button className="perf-button" onClick={() => setHudOpen((open) => !open)} aria-expanded={hudOpen}>HUD</button>
          <div className="status-pill"><span /> World online</div>
        </div>
      </header>
      <section className="hero-copy" id="world">
        <p className="eyebrow">Atlas entry · 001</p>
        <h1>A realm remembered<br />by a single word.</h1>
        <p className="intro">Every seed reveals a new gothic landscape—castles rise, forests gather, and moonlight finds the water.</p>
      </section>
      <section className="seed-card" aria-label="World seed controls">
        <label htmlFor="seed">World seed</label>
        <div className="seed-row">
          <input id="seed" value={seed} onChange={(event) => setSeed(event.target.value.toUpperCase())} onKeyDown={(event) => event.key === 'Enter' && regenerate()} spellCheck={false} />
          <button onClick={regenerate} aria-label="Generate world from seed">Enter realm <span>↗</span></button>
        </div>
        <div className="seed-meta"><span>Active · {activeSeed}</span><span><button onClick={randomSeed}>Randomize</button><i>·</i><button onClick={copySeed}>{copied ? 'Copied' : 'Copy seed'}</button></span></div>
      </section>
      <aside className={`performance-hud ${hudOpen ? 'is-open' : ''}`} aria-hidden={!hudOpen}>
        <header><span>Field diagnostics</span><button onClick={() => setHudOpen(false)}>×</button></header>
        <dl><div><dt>Frame rate</dt><dd>{stats.fps} <small>FPS</small></dd></div><div><dt>Draw calls</dt><dd>{stats.calls}</dd></div><div><dt>Triangles</dt><dd>{Math.round(stats.triangles / 1000)}k</dd></div><div><dt>Generator</dt><dd>1.0.0</dd></div></dl>
        <p>Deterministic world stream<br />WebGL 2 · Instanced forest</p>
      </aside>
      <footer className="scene-footer">
        <div><span>01</span><p><strong>Castle of Veyra</strong><small>Central highlands</small></p></div>
        <nav className="camera-modes" aria-label="Camera mode">
          <button className={mode === 'tour' ? 'active' : ''} onClick={() => selectMode('tour')}><kbd>T</kbd> Tour</button>
          <button className={mode === 'fly' ? 'active' : ''} onClick={() => selectMode('fly')}><kbd>F</kbd> Free fly</button>
          <button className={mode === 'orbit' ? 'active' : ''} onClick={() => selectMode('orbit')}><kbd>O</kbd> Orbit</button>
        </nav>
        <p className="coordinates">{mode === 'fly' ? 'WASD · Q/E · SHIFT' : mode === 'orbit' ? 'DRAG · SCROLL' : 'CINEMATIC PATH'}<br />R · NEW WORLD</p>
      </footer>
    </main>
  );
}
