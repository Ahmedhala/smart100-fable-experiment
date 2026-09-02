(function () {
  "use strict";

  /* =========================================================
     DIGITAL TWIN-INSPIRED 3D VISUALIZATION
     A simplified Three.js scene: reactor cluster -> plant ->
     two particle streams (thermal / electric) in, one
     particle stream (fresh water) out. Rotatable via OrbitControls.
     This is a visualization/simulation of this project's model,
     NOT a live industrial digital twin — no sensor connection to
     any real plant.
     ========================================================= */

  var wrap = document.getElementById("dt-canvas-wrap");
  var canvas = document.getElementById("dt-canvas");
  var spinner = document.getElementById("dt-spinner");
  var fallback = document.getElementById("dt-fallback");
  var toggleBtn = document.getElementById("dt-toggle-rotate");
  var resetBtn = document.getElementById("dt-reset-view");

  if (!wrap || !canvas) return;

  function hideSpinner() {
    if (spinner) spinner.classList.add("is-hidden");
  }

  function showFallback() {
    hideSpinner();
    if (fallback) fallback.removeAttribute("hidden");
    if (toggleBtn) toggleBtn.disabled = true;
    if (resetBtn) resetBtn.disabled = true;
  }

  if (typeof THREE === "undefined" || typeof THREE.OrbitControls !== "function") {
    showFallback();
    return;
  }

  function cssVar(name, fallbackHex) {
    var v = getComputedStyle(document.documentElement).getPropertyValue(name);
    v = v && v.trim();
    return v || fallbackHex;
  }

  var COLOR_NUCLEAR = cssVar("--nuclear", "#8b6bff");
  var COLOR_THERMAL = cssVar("--thermal", "#ff8a3d");
  var COLOR_WATER = cssVar("--water", "#29c3ea");
  var COLOR_BG2 = cssVar("--bg-2", "#121a26");
  var COLOR_BORDER = cssVar("--card-border-solid", "#263349");

  var REACTOR_X = -4.2;
  var PLANT_X = 0.2;
  var WATER_OUT_X = 4.6;

  var scene, camera, renderer, controls;
  var streams = [];
  var clock = new THREE.Clock();
  var frameId = null;

  var DEFAULT_CAMERA_POS = new THREE.Vector3(1, 5.2, 11.5);
  var DEFAULT_TARGET = new THREE.Vector3(0.2, 0.6, 0);

  function buildReactorCluster() {
    var group = new THREE.Group();
    var geo = new THREE.CylinderGeometry(0.16, 0.18, 0.95, 14);
    var mat = new THREE.MeshStandardMaterial({
      color: new THREE.Color(COLOR_NUCLEAR),
      emissive: new THREE.Color(COLOR_NUCLEAR),
      emissiveIntensity: 0.35,
      metalness: 0.3,
      roughness: 0.4
    });

    var cols = 5, rows = 2, spacing = 0.52;
    var idx = 0;
    for (var r = 0; r < rows; r++) {
      for (var c = 0; c < cols; c++) {
        var mesh = new THREE.Mesh(geo, mat);
        var x = REACTOR_X + (c - (cols - 1) / 2) * spacing;
        var z = (r - (rows - 1) / 2) * spacing;
        mesh.position.set(x, 0.48, z);
        group.add(mesh);
        idx++;
      }
    }

    // Subtle glow disc under the cluster
    var discGeo = new THREE.CircleGeometry(1.7, 32);
    var discMat = new THREE.MeshBasicMaterial({
      color: new THREE.Color(COLOR_NUCLEAR),
      transparent: true,
      opacity: 0.08,
      side: THREE.DoubleSide
    });
    var disc = new THREE.Mesh(discGeo, discMat);
    disc.rotation.x = -Math.PI / 2;
    disc.position.set(REACTOR_X, 0.02, 0);
    group.add(disc);

    scene.add(group);
    return group;
  }

  function buildPlant() {
    var group = new THREE.Group();
    var bodyGeo = new THREE.BoxGeometry(2.6, 1.5, 2.1);
    var bodyMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color(COLOR_BG2),
      metalness: 0.2,
      roughness: 0.75
    });
    var body = new THREE.Mesh(bodyGeo, bodyMat);
    body.position.set(PLANT_X, 0.75, 0);
    group.add(body);

    var edges = new THREE.EdgesGeometry(bodyGeo);
    var edgeMat = new THREE.LineBasicMaterial({ color: new THREE.Color(COLOR_WATER), transparent: true, opacity: 0.55 });
    var edgeLines = new THREE.LineSegments(edges, edgeMat);
    edgeLines.position.copy(body.position);
    group.add(edgeLines);

    // Small roof stacks to read as an industrial plant silhouette
    var stackGeo = new THREE.CylinderGeometry(0.09, 0.09, 0.6, 10);
    var stackMat = new THREE.MeshStandardMaterial({ color: new THREE.Color(COLOR_BORDER), roughness: 0.6 });
    [-0.7, 0, 0.7].forEach(function (offset) {
      var stack = new THREE.Mesh(stackGeo, stackMat);
      stack.position.set(PLANT_X + offset, 1.8, 0.4);
      group.add(stack);
    });

    scene.add(group);
    return group;
  }

  function buildGround() {
    var grid = new THREE.GridHelper(22, 22, new THREE.Color(COLOR_BORDER), new THREE.Color(COLOR_BORDER));
    grid.position.y = 0;
    grid.material.transparent = true;
    grid.material.opacity = 0.25;
    scene.add(grid);
  }

  function makeStream(origin, target, colorHex, count, size) {
    var geometry = new THREE.BufferGeometry();
    var positions = new Float32Array(count * 3);
    var progress = new Float32Array(count);
    var speed = new Float32Array(count);
    var jitterY = new Float32Array(count);
    var jitterZ = new Float32Array(count);

    for (var i = 0; i < count; i++) {
      progress[i] = Math.random();
      speed[i] = 0.12 + Math.random() * 0.10;
      jitterY[i] = (Math.random() - 0.5) * 0.35;
      jitterZ[i] = (Math.random() - 0.5) * 0.35;
    }

    geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));

    var material = new THREE.PointsMaterial({
      color: new THREE.Color(colorHex),
      size: size || 0.12,
      transparent: true,
      opacity: 0.85,
      sizeAttenuation: true
    });

    var points = new THREE.Points(geometry, material);
    scene.add(points);

    return {
      points: points,
      geometry: geometry,
      positions: positions,
      progress: progress,
      speed: speed,
      jitterY: jitterY,
      jitterZ: jitterZ,
      origin: origin,
      target: target,
      count: count
    };
  }

  function updateStream(stream, delta) {
    var pos = stream.positions;
    for (var i = 0; i < stream.count; i++) {
      stream.progress[i] += stream.speed[i] * delta;
      if (stream.progress[i] > 1) stream.progress[i] -= 1;
      var t = stream.progress[i];
      var arc = Math.sin(t * Math.PI) * 0.6; // gentle rise mid-flight
      var x = stream.origin.x + (stream.target.x - stream.origin.x) * t;
      var y = stream.origin.y + (stream.target.y - stream.origin.y) * t + arc * 0.4 + stream.jitterY[i];
      var z = stream.origin.z + (stream.target.z - stream.origin.z) * t + stream.jitterZ[i];
      pos[i * 3] = x;
      pos[i * 3 + 1] = y;
      pos[i * 3 + 2] = z;
    }
    stream.geometry.attributes.position.needsUpdate = true;
  }

  function getSize() {
    var w = wrap.clientWidth || 600;
    var h = wrap.clientHeight || Math.round(w * 9 / 16);
    return { w: Math.max(1, w), h: Math.max(1, h) };
  }

  function onResize() {
    var size = getSize();
    camera.aspect = size.w / size.h;
    camera.updateProjectionMatrix();
    renderer.setSize(size.w, size.h, false);
  }

  function animate() {
    frameId = requestAnimationFrame(animate);
    var delta = Math.min(clock.getDelta(), 0.1);
    streams.forEach(function (s) { updateStream(s, delta); });
    controls.update();
    renderer.render(scene, camera);
  }

  function init() {
    var size = getSize();

    scene = new THREE.Scene();
    scene.background = new THREE.Color(COLOR_BG2);
    scene.fog = new THREE.Fog(new THREE.Color(COLOR_BG2), 12, 26);

    camera = new THREE.PerspectiveCamera(45, size.w / size.h, 0.1, 100);
    camera.position.copy(DEFAULT_CAMERA_POS);

    renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(size.w, size.h, false);

    controls = new THREE.OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.autoRotate = true;
    controls.autoRotateSpeed = 1.0;
    controls.minDistance = 5;
    controls.maxDistance = 22;
    controls.maxPolarAngle = Math.PI * 0.49;
    controls.target.copy(DEFAULT_TARGET);
    controls.update();

    scene.add(new THREE.AmbientLight(0xffffff, 0.55));
    var dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
    dirLight.position.set(5, 8, 4);
    scene.add(dirLight);
    var rim = new THREE.PointLight(new THREE.Color(COLOR_NUCLEAR), 1.1, 20);
    rim.position.set(-6, 3, -2);
    scene.add(rim);

    buildGround();
    buildReactorCluster();
    buildPlant();

    // Thermal (steam) path: reactor cluster -> MSF side of the plant, and
    // electric path: reactor cluster -> RO side of the plant. The site's
    // own dual-path diagram legend already colors the electric path with
    // the nuclear/violet token, so this scene reuses the same convention.
    var reactorOrigin = new THREE.Vector3(REACTOR_X, 0.75, 0);
    var thermalTarget = new THREE.Vector3(PLANT_X - 1.1, 0.9, 0.55);
    var electricTarget = new THREE.Vector3(PLANT_X - 1.1, 0.9, -0.55);
    var waterOrigin = new THREE.Vector3(PLANT_X + 1.2, 0.65, 0);
    var waterTarget = new THREE.Vector3(WATER_OUT_X, 0.25, 0);

    streams.push(makeStream(reactorOrigin, thermalTarget, COLOR_THERMAL, 80, 0.11));
    streams.push(makeStream(reactorOrigin, electricTarget, COLOR_NUCLEAR, 80, 0.11));
    streams.push(makeStream(waterOrigin, waterTarget, COLOR_WATER, 60, 0.13));

    hideSpinner();
    window.addEventListener("resize", onResize);
    if ("ResizeObserver" in window) {
      new ResizeObserver(onResize).observe(wrap);
    }

    animate();
  }

  function toggleAutoRotate() {
    controls.autoRotate = !controls.autoRotate;
    if (toggleBtn) {
      toggleBtn.setAttribute("aria-pressed", String(controls.autoRotate));
      toggleBtn.textContent = controls.autoRotate
        ? "⏸ إيقاف الدوران التلقائي"
        : "▶ تشغيل الدوران التلقائي";
      toggleBtn.classList.toggle("is-active", controls.autoRotate);
    }
  }

  function resetView() {
    camera.position.copy(DEFAULT_CAMERA_POS);
    controls.target.copy(DEFAULT_TARGET);
    controls.update();
  }

  try {
    init();
  } catch (err) {
    showFallback();
    return;
  }

  if (toggleBtn) toggleBtn.addEventListener("click", toggleAutoRotate);
  if (resetBtn) resetBtn.addEventListener("click", resetView);
})();
