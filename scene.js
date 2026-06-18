// ============================================
// Volix Tech — 3D hero scene
// Scattered software "modules" assemble into a single glowing cube.
// Assembly progress is driven by hero scroll position (0 = dispersed, 1 = built).
// Original Three.js scene, indigo palette. Silent fallback if WebGL unavailable.
// ============================================

import * as THREE from 'three';

(function () {
  const canvas = document.getElementById('scene-canvas');
  if (!canvas) return;

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({
      canvas: canvas,
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance',
    });
  } catch (e) {
    canvas.style.display = 'none';
    return; // CSS .scene-fallback stays visible
  }

  const ACCENT = 0x6366f1;
  const ACCENT_LIGHT = 0x818cf8;

  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);

  const scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0x0a0a0b, 0.055);

  const camera = new THREE.PerspectiveCamera(
    50, window.innerWidth / window.innerHeight, 0.1, 100
  );
  camera.position.set(0, 0, 8);

  // ----- Lighting (for the solid module faces) -----
  scene.add(new THREE.AmbientLight(0x8088c0, 0.6));
  const key = new THREE.DirectionalLight(0xa5b4fc, 1.1);
  key.position.set(4, 6, 8);
  scene.add(key);
  const rim = new THREE.DirectionalLight(0x22d3ee, 0.5);
  rim.position.set(-6, -3, -4);
  scene.add(rim);

  // ----- Build the assembled cube out of NxNxN module blocks -----
  const N = 3;                       // 3x3x3 = 27 modules
  const UNIT = 1.15;                 // spacing between module centres
  const SIZE = 1.02;                 // module box size (slight gap)
  const half = (N - 1) / 2;

  const moduleGroup = new THREE.Group();
  scene.add(moduleGroup);

  const boxGeo = new THREE.BoxGeometry(SIZE, SIZE, SIZE);
  const edgeGeo = new THREE.EdgesGeometry(boxGeo);

  const modules = [];
  let order = 0;
  const total = N * N * N;

  // Capability labels shown on the assembled modules
  const LABELS = [
    'API', 'MOBILE APP', 'WEB APP', 'SSL', 'AI', 'AUTOMATION',
    'DATABASE', 'AUTH', 'PAYMENTS', 'CLOUD', 'REST', 'QUEUE',
    'ANALYTICS', 'CACHE', 'GEOFENCE', 'PUSH', 'PDF', 'SEARCH',
    'DEVOPS', 'CI/CD', 'BACKUP', 'MONITOR', 'WEBHOOK', 'SDK',
    'OAUTH', 'GRAPHQL', 'STORAGE',
  ];

  // Deterministic pseudo-random (no Math.random dependency for stable layout feel)
  function rand(seed) {
    const x = Math.sin(seed * 127.1 + 311.7) * 43758.5453;
    return x - Math.floor(x);
  }

  // Build a sprite whose texture is the given label text (transparent background)
  function makeLabel(text) {
    const c = document.createElement('canvas');
    const w = 256, h = 64;
    c.width = w; c.height = h;
    const ctx = c.getContext('2d');
    ctx.clearRect(0, 0, w, h);
    ctx.font = '600 30px "JetBrains Mono", monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.shadowColor = 'rgba(129,140,248,0.9)';
    ctx.shadowBlur = 12;
    ctx.fillStyle = '#e6e8ff';
    ctx.fillText(text, w / 2, h / 2);
    const tex = new THREE.CanvasTexture(c);
    tex.anisotropy = 4;
    const sprite = new THREE.Sprite(
      new THREE.SpriteMaterial({ map: tex, transparent: true, opacity: 0, depthTest: false })
    );
    sprite.scale.set(1.05, 0.26, 1);
    sprite.renderOrder = 10;
    return sprite;
  }

  for (let x = 0; x < N; x++) {
    for (let y = 0; y < N; y++) {
      for (let z = 0; z < N; z++) {
        const seed = order + 1;

        // Solid translucent body + bright wireframe edges = "module" look
        const body = new THREE.Mesh(
          boxGeo,
          new THREE.MeshStandardMaterial({
            color: ACCENT,
            transparent: true,
            opacity: 0.28,
            metalness: 0.2,
            roughness: 0.45,
            emissive: ACCENT,
            emissiveIntensity: 0.15,
          })
        );
        const wire = new THREE.LineSegments(
          edgeGeo,
          new THREE.LineBasicMaterial({ color: ACCENT_LIGHT, transparent: true, opacity: 0.9 })
        );
        const m = new THREE.Group();
        m.add(body);
        m.add(wire);

        // Label sprite, parked just in front of the module's front face
        const label = makeLabel(LABELS[order % LABELS.length]);
        label.position.set(0, 0, SIZE / 2 + 0.02);
        m.add(label);

        moduleGroup.add(m);

        // Assembled target position (forms the cube)
        const target = new THREE.Vector3(
          (x - half) * UNIT,
          (y - half) * UNIT,
          (z - half) * UNIT
        );

        // Scattered start: pushed far out along a random direction, random spin
        const dir = new THREE.Vector3(
          rand(seed) - 0.5,
          rand(seed + 11) - 0.5,
          rand(seed + 23) - 0.5
        ).normalize();
        const dist = 9 + rand(seed + 31) * 9;
        const scatter = dir.clone().multiplyScalar(dist);

        modules.push({
          mesh: m,
          target: target,
          scatter: scatter,
          spin: new THREE.Vector3(
            (rand(seed + 41) - 0.5) * 6,
            (rand(seed + 53) - 0.5) * 6,
            (rand(seed + 67) - 0.5) * 6
          ),
          // stagger window: each module assembles over a slice of progress
          start: (order / total) * 0.55,
          end: (order / total) * 0.55 + 0.45,
          opacity: body.material.opacity,
          body: body.material,
          wire: wire.material,
          label: label.material,
        });
        order++;
      }
    }
  }

  // ----- Glowing outline frame around the fully assembled cube -----
  // Two passes: a bright core line + a fatter soft "glow" line behind it.
  const cubeSpan = N * UNIT;            // outer extent of the assembled cube
  const frameGeo = new THREE.EdgesGeometry(new THREE.BoxGeometry(cubeSpan, cubeSpan, cubeSpan));
  const frameCore = new THREE.LineSegments(
    frameGeo,
    new THREE.LineBasicMaterial({ color: 0xc7d2fe, transparent: true, opacity: 0 })
  );
  const frameGlow = new THREE.LineSegments(
    frameGeo,
    new THREE.LineBasicMaterial({
      color: ACCENT_LIGHT, transparent: true, opacity: 0,
      blending: THREE.AdditiveBlending, depthWrite: false,
    })
  );
  frameGlow.scale.setScalar(1.04);
  moduleGroup.add(frameGlow);
  moduleGroup.add(frameCore);

  // ----- Drifting particle field (depth) -----
  const PCOUNT = 700;
  const positions = new Float32Array(PCOUNT * 3);
  for (let i = 0; i < PCOUNT; i++) {
    positions[i * 3 + 0] = (rand(i + 1) - 0.5) * 30;
    positions[i * 3 + 1] = (rand(i + 100) - 0.5) * 20;
    positions[i * 3 + 2] = (rand(i + 200) - 0.5) * 24 - 4;
  }
  const pGeo = new THREE.BufferGeometry();
  pGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  const particles = new THREE.Points(
    pGeo,
    new THREE.PointsMaterial({ color: ACCENT_LIGHT, size: 0.04, transparent: true, opacity: 0.6, sizeAttenuation: true })
  );
  scene.add(particles);

  // ----- Scroll-driven assembly progress -----
  // 0 at top of hero (dispersed) -> 1 once you've scrolled ~70% of a viewport.
  let assembly = 0;          // smoothed value actually rendered
  let assemblyTarget = 0;
  // Baseline so the cube reads as "loosely formed" at the top of the hero,
  // then fully locks in as you scroll.
  const BASE = 0.45;
  function computeAssembly() {
    const vh = window.innerHeight || 1;
    const y = window.scrollY || 0;
    const scrolled = Math.min(y / (vh * 0.7), 1);
    assemblyTarget = BASE + (1 - BASE) * scrolled;
  }
  computeAssembly();
  window.addEventListener('scroll', computeAssembly, { passive: true });

  // ----- Pointer parallax -----
  const pointer = { x: 0, y: 0, tx: 0, ty: 0 };
  if (window.matchMedia('(pointer: fine)').matches) {
    window.addEventListener('mousemove', function (e) {
      pointer.tx = (e.clientX / window.innerWidth - 0.5) * 2;
      pointer.ty = (e.clientY / window.innerHeight - 0.5) * 2;
    }, { passive: true });
  }

  window.addEventListener('resize', function () {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    computeAssembly();
  });

  const _v = new THREE.Vector3();
  function smoothstep(a, b, t) {
    t = Math.max(0, Math.min(1, (t - a) / (b - a)));
    return t * t * (3 - 2 * t);
  }

  const clock = new THREE.Clock();
  function animate() {
    const dt = Math.min(clock.getDelta(), 0.05);
    const t = clock.elapsedTime;

    // Ease the assembly value toward its scroll target
    assembly += (assemblyTarget - assembly) * 0.08;

    for (let i = 0; i < modules.length; i++) {
      const md = modules[i];
      // Per-module progress within its staggered window
      const p = smoothstep(md.start, md.end, assembly);

      // Position: scatter -> target
      _v.copy(md.scatter).lerp(md.target, p);
      md.mesh.position.copy(_v);

      // Rotation: spin while scattered, settle to aligned when assembled
      if (!reduceMotion) {
        const spinAmt = (1 - p);
        md.mesh.rotation.x = md.spin.x * spinAmt + t * 0.05 * p;
        md.mesh.rotation.y = md.spin.y * spinAmt + t * 0.05 * p;
        md.mesh.rotation.z = md.spin.z * spinAmt;
      } else {
        md.mesh.rotation.set(0, 0, 0);
      }

      // Fade/brighten as modules lock in
      md.body.opacity = 0.10 + p * 0.30;
      md.wire.opacity = 0.45 + p * 0.50;
      // Labels appear only once a module is nearly settled
      md.label.opacity = smoothstep(0.7, 1, p);
    }

    // Glowing outline frame ramps in over the last stretch of assembly
    const frameP = smoothstep(0.55, 1, assembly);
    frameCore.material.opacity = frameP * 0.9;
    frameGlow.material.opacity = frameP * (0.35 + Math.sin(t * 1.6) * 0.12);

    // Whole assembled cube gently breathes/rotates once built
    if (!reduceMotion) {
      moduleGroup.rotation.y += dt * (0.12 + assembly * 0.18);
      moduleGroup.rotation.x = Math.sin(t * 0.4) * 0.12 * assembly;
      const breathe = 1 + Math.sin(t * 1.2) * 0.015 * assembly;
      moduleGroup.scale.setScalar(breathe);
      particles.rotation.y += dt * 0.01;
    }

    // Pointer parallax on camera
    pointer.x += (pointer.tx - pointer.x) * 0.05;
    pointer.y += (pointer.ty - pointer.y) * 0.05;
    camera.position.x += (pointer.x * 0.7 - camera.position.x) * 0.05;
    camera.position.y += (-pointer.y * 0.5 - camera.position.y) * 0.05;
    camera.lookAt(0, 0, 0);

    renderer.render(scene, camera);
    requestAnimationFrame(animate);
  }
  animate();

  document.body.classList.add('scene-ready');
})();
