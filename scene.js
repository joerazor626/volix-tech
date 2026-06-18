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

  // Deterministic pseudo-random (no Math.random dependency for stable layout feel)
  function rand(seed) {
    const x = Math.sin(seed * 127.1 + 311.7) * 43758.5453;
    return x - Math.floor(x);
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
          flash: 0,
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

  // ----- "Ping" signals: random module pairs fire a pulse at each other -----
  // A small pool of reusable links. Each active link draws a faint connecting
  // line + a bright dot travelling from A to B, and flashes both endpoints.
  const PING_POOL = 6;
  const pings = [];
  for (let i = 0; i < PING_POOL; i++) {
    const lineGeo = new THREE.BufferGeometry();
    lineGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(6), 3));
    const line = new THREE.Line(
      lineGeo,
      new THREE.LineBasicMaterial({
        color: 0xc7d2fe, transparent: true, opacity: 0,
        blending: THREE.AdditiveBlending, depthWrite: false,
      })
    );
    const dot = new THREE.Sprite(new THREE.SpriteMaterial({
      map: glowTexPlaceholder(), color: 0xe0e7ff,
      transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending,
    }));
    dot.scale.set(0.45, 0.45, 1);
    moduleGroup.add(line);
    moduleGroup.add(dot);
    pings.push({ line: line, lineGeo: lineGeo, dot: dot, active: false, a: null, b: null, t: 0, dur: 1 });
  }
  let nextPingAt = 1.5;   // seconds until the next ping fires

  // Soft round sprite for the travelling pulse dot (built once, reused)
  function glowTexPlaceholder() {
    const c = document.createElement('canvas');
    c.width = c.height = 64;
    const ctx = c.getContext('2d');
    const g = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
    g.addColorStop(0, 'rgba(255,255,255,1)');
    g.addColorStop(0.4, 'rgba(199,210,254,0.7)');
    g.addColorStop(1, 'rgba(129,140,248,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 64, 64);
    return new THREE.CanvasTexture(c);
  }

  function firePing() {
    const slot = pings.find(function (p) { return !p.active; });
    if (!slot) return;
    // Pick two distinct random modules
    const ai = Math.floor(rand(nextPingAt * 13.7 + 1) * modules.length);
    let bi = Math.floor(rand(nextPingAt * 31.3 + 7) * modules.length);
    if (bi === ai) bi = (bi + 1) % modules.length;
    slot.a = modules[ai];
    slot.b = modules[bi];
    slot.t = 0;
    slot.dur = 0.7 + rand(nextPingAt * 5.1) * 0.8;   // 0.7–1.5s travel
    slot.active = true;
  }

  // ----- Starfield: layered "universe" drifting in depth -----
  // Each layer has its own count, spread, star size, colour and drift speed.
  // Stars wrap around in Z so the field flows endlessly toward the camera.
  const STAR_DEPTH = 60;               // Z extent stars travel through
  function makeStarLayer(count, spread, size, color, opacity, speed, seedBase) {
    const pos = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      pos[i * 3 + 0] = (rand(seedBase + i * 3) - 0.5) * spread;
      pos[i * 3 + 1] = (rand(seedBase + i * 3 + 1) - 0.5) * spread * 0.7;
      pos[i * 3 + 2] = (rand(seedBase + i * 3 + 2) - 0.5) * STAR_DEPTH;
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const pts = new THREE.Points(
      g,
      new THREE.PointsMaterial({
        color: color, size: size, transparent: true, opacity: opacity,
        sizeAttenuation: true, depthWrite: false, blending: THREE.AdditiveBlending,
      })
    );
    scene.add(pts);
    return { points: pts, geo: g, count: count, speed: speed };
  }

  const starLayers = [
    makeStarLayer(420, 70, 0.05, 0x818cf8, 0.85, 2.4, 1000),   // near — bright, fast
    makeStarLayer(620, 90, 0.032, 0xc7d2fe, 0.6, 1.4, 4000),   // mid
    makeStarLayer(900, 120, 0.02, 0x8b93c9, 0.4, 0.7, 8000),   // far — dim, slow
  ];

  // Faint nebula glow drifting behind the stars for "universe" depth
  const nebula = new THREE.Mesh(
    new THREE.PlaneGeometry(160, 100),
    new THREE.MeshBasicMaterial({
      color: ACCENT, transparent: true, opacity: 0.05,
      blending: THREE.AdditiveBlending, depthWrite: false,
    })
  );
  nebula.position.z = -30;
  scene.add(nebula);

  // ----- Galaxies: distant spiral clusters we travel toward on scroll -----
  // Each galaxy is a flattened spiral of points + a soft glow core sprite.
  // They sit deep in Z, drift toward the camera (boosted by scroll warp),
  // and wrap back when they pass — so scrolling feels like approaching them.
  const GALAXY_FARZ = -120;            // spawn depth (far back)
  const GALAXY_PASSZ = 9;              // past this they wrap to the back

  // Soft radial glow texture for galaxy cores
  function makeGlowTexture() {
    const c = document.createElement('canvas');
    c.width = c.height = 128;
    const ctx = c.getContext('2d');
    const grd = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
    grd.addColorStop(0, 'rgba(199,210,254,0.9)');
    grd.addColorStop(0.3, 'rgba(129,140,248,0.45)');
    grd.addColorStop(1, 'rgba(99,102,241,0)');
    ctx.fillStyle = grd;
    ctx.fillRect(0, 0, 128, 128);
    return new THREE.CanvasTexture(c);
  }
  const glowTex = makeGlowTexture();
  const GAL_COLORS = [0x818cf8, 0x22d3ee, 0xc084fc, 0xa5b4fc];

  function makeGalaxy(seedBase, idx) {
    const group = new THREE.Group();
    const STARS = 1400;
    const ARMS = 3 + Math.floor(rand(seedBase) * 2);    // 3-4 spiral arms
    const RADIUS = 5 + rand(seedBase + 1) * 4;
    const pos = new Float32Array(STARS * 3);
    for (let i = 0; i < STARS; i++) {
      const r = Math.pow(rand(seedBase + i + 2), 0.6) * RADIUS;
      const arm = i % ARMS;
      // angle = base arm offset + spiral winding + a little scatter
      const ang = (arm / ARMS) * Math.PI * 2 + r * 0.6 + (rand(seedBase + i + 50) - 0.5) * 0.5;
      const spread = (rand(seedBase + i + 90) - 0.5) * 0.6;
      pos[i * 3 + 0] = Math.cos(ang) * r + spread;
      pos[i * 3 + 1] = (rand(seedBase + i + 120) - 0.5) * 0.7;  // thin disk
      pos[i * 3 + 2] = Math.sin(ang) * r + spread;
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const disk = new THREE.Points(
      g,
      new THREE.PointsMaterial({
        color: GAL_COLORS[idx % GAL_COLORS.length],
        size: 0.06, transparent: true, opacity: 0.8,
        sizeAttenuation: true, depthWrite: false, blending: THREE.AdditiveBlending,
      })
    );
    group.add(disk);

    const core = new THREE.Sprite(new THREE.SpriteMaterial({
      map: glowTex, color: GAL_COLORS[idx % GAL_COLORS.length],
      transparent: true, opacity: 0.9, depthWrite: false, blending: THREE.AdditiveBlending,
    }));
    core.scale.set(RADIUS * 1.6, RADIUS * 1.6, 1);
    group.add(core);

    // Random position & tilt, staggered through the depth range
    group.position.set(
      (rand(seedBase + 7) - 0.5) * 36,
      (rand(seedBase + 8) - 0.5) * 22,
      GALAXY_FARZ + idx * 34 + rand(seedBase + 9) * 20
    );
    group.rotation.set(rand(seedBase + 10) * 1.2 - 0.6, rand(seedBase + 11) * Math.PI, rand(seedBase + 12) * 0.6 - 0.3);
    scene.add(group);
    return { group: group, spin: 0.04 + rand(seedBase + 13) * 0.06 };
  }

  const galaxies = [];
  const GALAXY_COUNT = 4;
  for (let i = 0; i < GALAXY_COUNT; i++) galaxies.push(makeGalaxy(2000 + i * 137, i));
  const galaxyRange = Math.abs(GALAXY_FARZ - GALAXY_PASSZ);

  // ----- Scroll-driven assembly progress -----
  // Spread the build across the WHOLE page: 0 at the very top (dispersed),
  // 1 at the bottom (cube fully formed + glowing). The modules lock in
  // section by section as you scroll down.
  let assembly = 0;          // smoothed value actually rendered
  let assemblyTarget = 0;
  let scrollVel = 0;         // normalised scroll speed -> drives starfield warp
  let warp = 0;              // smoothed warp factor used by the render loop
  // Small baseline so the cube reads as "seeded" at the very top.
  const BASE = 0.08;
  let lastY = window.scrollY || 0;
  function computeAssembly() {
    const doc = document.documentElement;
    const max = (doc.scrollHeight - window.innerHeight) || 1;
    const y = window.scrollY || 0;
    const scrolled = Math.min(y / max, 1);           // 0..1 across full page
    assemblyTarget = BASE + (1 - BASE) * scrolled;
    // Track instantaneous scroll distance for the space-warp effect
    scrollVel = Math.min(Math.abs(y - lastY) / 60, 1);
    lastY = y;
  }
  computeAssembly();
  window.addEventListener('scroll', computeAssembly, { passive: true });

  // ----- Pointer steering -----
  const pointer = { x: 0, y: 0, tx: 0, ty: 0 };
  const lookTarget = new THREE.Vector3(0, 0, 0);   // smoothed camera aim point
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

      // Fade/brighten as modules lock in, plus any active ping flash
      if (md.flash > 0) md.flash = Math.max(0, md.flash - dt * 2.2);
      md.body.opacity = 0.10 + p * 0.30 + md.flash * 0.5;
      md.wire.opacity = 0.45 + p * 0.50 + md.flash * 0.5;
    }

    // Glowing outline frame ramps in over the last stretch of assembly
    const frameP = smoothstep(0.55, 1, assembly);
    frameCore.material.opacity = frameP * 0.9;
    frameGlow.material.opacity = frameP * (0.35 + Math.sin(t * 1.6) * 0.12);

    // ----- Ping signals between random modules -----
    // Fire at any assembly level, including while the boxes float on load,
    // so signals dart between pieces before and after the cube forms.
    if (!reduceMotion) {
      if (t >= nextPingAt) {
        firePing();
        nextPingAt = t + 0.6 + rand(t * 7.3) * 1.6;   // random cadence ~0.6–2.2s
      }
      for (let i = 0; i < pings.length; i++) {
        const pg = pings[i];
        if (!pg.active) continue;
        pg.t += dt / pg.dur;
        // Use the modules' LIVE positions so links track the boxes as they
        // float/assemble (not their fixed assembled targets).
        const a = pg.a.mesh.position, b = pg.b.mesh.position;
        // Connecting line
        const arr = pg.lineGeo.attributes.position.array;
        arr[0] = a.x; arr[1] = a.y; arr[2] = a.z;
        arr[3] = b.x; arr[4] = b.y; arr[5] = b.z;
        pg.lineGeo.attributes.position.needsUpdate = true;
        // Pulse intensity rises then falls over the link's life
        const env = Math.sin(Math.min(pg.t, 1) * Math.PI);
        pg.line.material.opacity = env * 0.5;
        // Travelling dot from A -> B
        _v.copy(a).lerp(b, Math.min(pg.t, 1));
        pg.dot.position.copy(_v);
        pg.dot.material.opacity = env;
        const s = 0.4 + env * 0.4;
        pg.dot.scale.set(s, s, 1);
        // Flash the endpoints as the pulse departs / arrives
        if (pg.t < 0.12) pg.a.flash = 1;
        if (pg.t > 0.88 && pg.t < 1) pg.b.flash = 1;
        if (pg.t >= 1) {
          pg.active = false;
          pg.line.material.opacity = 0;
          pg.dot.material.opacity = 0;
        }
      }
    }

    // Whole assembled cube gently breathes/rotates once built
    if (!reduceMotion) {
      moduleGroup.rotation.y += dt * (0.12 + assembly * 0.18);
      moduleGroup.rotation.x = Math.sin(t * 0.4) * 0.12 * assembly;
      const breathe = 1 + Math.sin(t * 1.2) * 0.015 * assembly;
      // Keep the cube smaller/further back while dispersed (so it doesn't
      // overlap the hero text), growing forward as it assembles.
      const grow = 0.62 + assembly * 0.38;
      moduleGroup.scale.setScalar(breathe * grow);
      moduleGroup.position.z = -3.5 * (1 - assembly);
    }

    // Starfield: flow stars toward the camera. Scrolling accelerates the
    // flow (warp), so moving down the page feels like travelling through space.
    warp += (scrollVel - warp) * 0.06;           // smooth the warp factor
    scrollVel *= 0.9;                            // decay between scroll events
    if (!reduceMotion) {
      const halfDepth = STAR_DEPTH / 2;
      const boost = 1 + warp * 14;               // up to ~15x speed while scrolling
      for (let l = 0; l < starLayers.length; l++) {
        const layer = starLayers[l];
        const arr = layer.geo.attributes.position.array;
        const step = layer.speed * boost * dt;
        for (let i = 2; i < arr.length; i += 3) {
          arr[i] += step;                        // drift toward camera (+Z)
          if (arr[i] > halfDepth) arr[i] -= STAR_DEPTH; // wrap to the back
        }
        layer.geo.attributes.position.needsUpdate = true;
        layer.points.rotation.z += dt * 0.01 * (l + 1); // slow swirl per layer
      }
      // Stars stretch into streaks during warp for the "into space" feel
      starLayers[0].points.material.size = 0.05 * (1 + warp * 2.5);
      nebula.rotation.z += dt * 0.008;
    }

    // Galaxies: drift toward the camera (boosted by scroll warp) and wrap.
    // They swell as they approach, so scrolling = travelling toward galaxies.
    if (!reduceMotion) {
      const galStep = (1.6 + warp * 26) * dt;     // slow idle, fast on scroll
      for (let i = 0; i < galaxies.length; i++) {
        const gx = galaxies[i];
        gx.group.position.z += galStep;
        if (gx.group.position.z > GALAXY_PASSZ) {
          gx.group.position.z -= galaxyRange;     // wrap far behind
          gx.group.position.x = (rand(3000 + i + Math.floor(t)) - 0.5) * 36;
          gx.group.position.y = (rand(3100 + i + Math.floor(t)) - 0.5) * 22;
        }
        gx.group.rotation.y += dt * gx.spin;      // spin the disk
        // Fade in from the deep distance so they emerge rather than pop
        const depth = (gx.group.position.z - GALAXY_FARZ) / galaxyRange; // 0 far -> 1 near
        gx.group.children[0].material.opacity = Math.min(0.85, depth * 1.2);
        gx.group.children[1].material.opacity = Math.min(0.9, depth * 1.3);
      }
    }

    // Pointer steering: the camera banks toward the cursor and aims its
    // gaze in that direction, so whatever is over there (a galaxy) swings
    // into centre view and feels pulled forward. The cube stays the anchor.
    pointer.x += (pointer.tx - pointer.x) * 0.04;   // smooth, gentle
    pointer.y += (pointer.ty - pointer.y) * 0.04;
    // Slight positional parallax (keeps the cube as the pivot)
    camera.position.x += (pointer.x * 0.9 - camera.position.x) * 0.04;
    camera.position.y += (-pointer.y * 0.7 - camera.position.y) * 0.04;
    // Aim point leans toward the cursor and outward into space, but only as
    // the cursor moves AWAY from centre — so a still/centred cursor keeps the
    // cube framed dead-centre, while aiming at a galaxy turns the view there.
    var aim = Math.min(Math.sqrt(pointer.x * pointer.x + pointer.y * pointer.y), 1);
    lookTarget.x += (pointer.x * 9 - lookTarget.x) * 0.04;
    lookTarget.y += (-pointer.y * 6 - lookTarget.y) * 0.04;
    lookTarget.z += (-aim * 16 - lookTarget.z) * 0.04;  // lean outward only when steering
    camera.lookAt(lookTarget);

    renderer.render(scene, camera);
    requestAnimationFrame(animate);
  }
  animate();

  document.body.classList.add('scene-ready');
})();
