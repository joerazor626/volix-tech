// ============================================
// Volix Tech — 3D hero scene
// Original Three.js scene: glowing wireframe cube + drifting particle field.
// Indigo palette. Degrades silently if WebGL is unavailable.
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
    // No WebGL -> CSS .scene-fallback remains visible
    canvas.style.display = 'none';
    return;
  }

  const ACCENT = 0x6366f1;
  const ACCENT_LIGHT = 0x818cf8;

  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);

  const scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0x0a0a0b, 0.06);

  const camera = new THREE.PerspectiveCamera(
    50, window.innerWidth / window.innerHeight, 0.1, 100
  );
  camera.position.set(0, 0, 7);

  // ----- Central glowing cube (solid core + wireframe shell + edge lines) -----
  const cubeGroup = new THREE.Group();

  const coreGeo = new THREE.BoxGeometry(2.2, 2.2, 2.2);
  const coreMat = new THREE.MeshBasicMaterial({
    color: ACCENT, transparent: true, opacity: 0.18,
  });
  cubeGroup.add(new THREE.Mesh(coreGeo, coreMat));

  const shellGeo = new THREE.BoxGeometry(2.55, 2.55, 2.55, 4, 4, 4);
  const shellMat = new THREE.MeshBasicMaterial({
    color: ACCENT_LIGHT, wireframe: true, transparent: true, opacity: 0.35,
  });
  cubeGroup.add(new THREE.Mesh(shellGeo, shellMat));

  const edges = new THREE.LineSegments(
    new THREE.EdgesGeometry(new THREE.BoxGeometry(2.6, 2.6, 2.6)),
    new THREE.LineBasicMaterial({ color: ACCENT_LIGHT, transparent: true, opacity: 0.9 })
  );
  cubeGroup.add(edges);

  cubeGroup.rotation.set(0.5, 0.8, 0);
  scene.add(cubeGroup);

  // ----- Drifting particle field -----
  const COUNT = 900;
  const positions = new Float32Array(COUNT * 3);
  for (let i = 0; i < COUNT; i++) {
    positions[i * 3 + 0] = (Math.random() - 0.5) * 26;
    positions[i * 3 + 1] = (Math.random() - 0.5) * 18;
    positions[i * 3 + 2] = (Math.random() - 0.5) * 22 - 4;
  }
  const pGeo = new THREE.BufferGeometry();
  pGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  const particles = new THREE.Points(
    pGeo,
    new THREE.PointsMaterial({
      color: ACCENT_LIGHT, size: 0.045, transparent: true, opacity: 0.7,
      sizeAttenuation: true,
    })
  );
  scene.add(particles);

  // ----- Pointer parallax -----
  const pointer = { x: 0, y: 0, tx: 0, ty: 0 };
  if (window.matchMedia('(pointer: fine)').matches) {
    window.addEventListener('mousemove', function (e) {
      pointer.tx = (e.clientX / window.innerWidth - 0.5) * 2;
      pointer.ty = (e.clientY / window.innerHeight - 0.5) * 2;
    }, { passive: true });
  }

  // ----- Scroll-driven cube transform (sinks/recedes as you scroll the hero) -----
  let scrollY = 0;
  window.addEventListener('scroll', function () {
    scrollY = window.scrollY || 0;
  }, { passive: true });

  // ----- Resize -----
  window.addEventListener('resize', function () {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });

  // ----- Render loop -----
  const clock = new THREE.Clock();
  function animate() {
    const dt = clock.getDelta();
    const t = clock.elapsedTime;

    if (!reduceMotion) {
      cubeGroup.rotation.y += dt * 0.25;
      cubeGroup.rotation.x += dt * 0.08;
      cubeGroup.position.y = Math.sin(t * 0.7) * 0.18;
      particles.rotation.y += dt * 0.012;
    }

    // Hero scroll: cube drifts down & back as the first viewport scrolls away
    const vh = window.innerHeight || 1;
    const p = Math.min(scrollY / vh, 1);
    cubeGroup.position.z = -p * 6;
    cubeGroup.position.x = p * 1.5;

    // Smooth pointer parallax
    pointer.x += (pointer.tx - pointer.x) * 0.05;
    pointer.y += (pointer.ty - pointer.y) * 0.05;
    camera.position.x += (pointer.x * 0.6 - camera.position.x) * 0.05;
    camera.position.y += (-pointer.y * 0.4 - camera.position.y) * 0.05;
    camera.lookAt(0, 0, 0);

    renderer.render(scene, camera);
    requestAnimationFrame(animate);
  }
  animate();

  // Mark scene ready so CSS can fade the canvas in / hide the fallback
  document.body.classList.add('scene-ready');
})();
