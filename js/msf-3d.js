/* =========================================================
   MSF — Interactive 3D Flash-Stage Model (Three.js)
   Stylized, labeled, non-photorealistic model of a multi-stage
   flash distillation train. Not a certified engineering drawing.
   ========================================================= */
(function () {
  "use strict";

  var container = document.getElementById("m3d-container");
  var canvas = document.getElementById("m3d-canvas");
  var loadingEl = document.getElementById("m3d-loading");
  var fallbackEl = document.getElementById("m3d-fallback");
  var titleEl = document.getElementById("m3d-title");
  var descEl = document.getElementById("m3d-desc");
  var listEl = document.getElementById("m3d-list");
  var rotateBtn = document.getElementById("m3d-toggle-rotate");
  var flowBtn = document.getElementById("m3d-toggle-flow");
  var resetBtn = document.getElementById("m3d-reset-view");

  if (!container || !canvas) return;

  var COMPONENTS = window.MSF_3D_COMPONENTS || [];
  var COMPONENTS_BY_ID = {};
  COMPONENTS.forEach(function (c) { COMPONENTS_BY_ID[c.id] = c; });

  /* ---- Fallback if Three.js or OrbitControls failed to load from CDN ---- */
  if (typeof THREE === "undefined" || typeof THREE.OrbitControls !== "function") {
    if (loadingEl) loadingEl.hidden = true;
    if (fallbackEl) fallbackEl.hidden = false;
    if (canvas) canvas.hidden = true;
    buildListOnly();
    return;
  }

  /* =========================================================
     Layout constants
     ========================================================= */
  var STAGE_COUNT = 5;
  var SPACING = 4.2;
  var CHAMBER_W = 3.0;
  var CHAMBER_H = 4.4;
  var CHAMBER_D = 3.0;
  var CHAMBER_Y = 0.3;

  var stageX = [];
  for (var s = 0; s < STAGE_COUNT; s++) {
    stageX.push((s - (STAGE_COUNT - 1) / 2) * SPACING);
  }
  var COLD_X = stageX[0] - SPACING / 2;
  var HOT_X = stageX[STAGE_COUNT - 1] + SPACING / 2;

  var TUBE_Y = 1.85;
  var TRAY_Y = 0.85;
  var HEADER_Y = 0.5;
  var POOL_Y = -1.55;

  var FEED_START_X = COLD_X - 3.2;
  var FEED_END_X = HOT_X + 2.0;
  var OUT_X = COLD_X - 3.2;

  /* =========================================================
     Scene setup
     ========================================================= */
  var scene = new THREE.Scene();
  scene.background = null;

  var camera = new THREE.PerspectiveCamera(42, 1, 0.1, 200);
  var DEFAULT_CAM_POS = new THREE.Vector3(9, 9.5, 22);
  var DEFAULT_TARGET = new THREE.Vector3(0, 0.1, 0);
  camera.position.copy(DEFAULT_CAM_POS);

  var renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));

  var controls = new THREE.OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.autoRotate = false;
  controls.autoRotateSpeed = 1.1;
  controls.minDistance = 10;
  controls.maxDistance = 42;
  controls.target.copy(DEFAULT_TARGET);
  controls.update();

  /* ---- Lighting ---- */
  scene.add(new THREE.AmbientLight(0xffffff, 0.55));
  var hemi = new THREE.HemisphereLight(0xffcf9e, 0x0a0d14, 0.45);
  scene.add(hemi);
  var dir = new THREE.DirectionalLight(0xffffff, 0.85);
  dir.position.set(10, 14, 8);
  scene.add(dir);
  var heaterGlow = new THREE.PointLight(0xff5f3d, 2.4, 12, 2);
  heaterGlow.position.set(HOT_X + 3.4, CHAMBER_Y, 0);
  scene.add(heaterGlow);

  /* =========================================================
     Registration pattern: meshesById (all meshes per component,
     used for highlighting) vs pickable (raycast targets only —
     excludes large translucent enclosing shells like the chamber
     shells so they don't block clicks on things inside them).
     ========================================================= */
  var meshesById = {};
  var pickable = [];

  function register(id, mesh, opts) {
    mesh.userData.componentId = id;
    (meshesById[id] = meshesById[id] || []).push(mesh);
    if (!(opts && opts.visualOnly)) pickable.push(mesh);
  }

  var msfGroup = new THREE.Group();
  scene.add(msfGroup);

  /* ---- Helpers ---- */
  function hPipe(xStart, xEnd, y, z, radius, color, opts) {
    var len = xEnd - xStart;
    var geo = new THREE.CylinderGeometry(radius, radius, Math.abs(len), 14);
    var mat = new THREE.MeshStandardMaterial({
      color: color,
      metalness: (opts && opts.metalness != null) ? opts.metalness : 0.35,
      roughness: (opts && opts.roughness != null) ? opts.roughness : 0.45,
      emissive: (opts && opts.emissive) || 0x000000,
      emissiveIntensity: (opts && opts.emissiveIntensity) || 0
    });
    var mesh = new THREE.Mesh(geo, mat);
    mesh.rotation.z = Math.PI / 2;
    mesh.position.set((xStart + xEnd) / 2, y, z);
    msfGroup.add(mesh);
    return mesh;
  }

  function cone(x, y, z, radius, height, color) {
    var geo = new THREE.ConeGeometry(radius, height, 16);
    var mat = new THREE.MeshStandardMaterial({ color: color, metalness: 0.3, roughness: 0.4 });
    var mesh = new THREE.Mesh(geo, mat);
    mesh.rotation.z = Math.PI / 2;
    mesh.position.set(x, y, z);
    msfGroup.add(mesh);
    return mesh;
  }

  /* ---- 1. Flash chambers: translucent shells (visualOnly) + a
     pickable ring/frame decoration on each chamber front face ---- */
  (function buildChambers() {
    var data = COMPONENTS_BY_ID["flash-chambers"] || { color: 0x5b6478 };
    var shellMat = new THREE.MeshPhysicalMaterial({
      color: data.color,
      transparent: true,
      opacity: 0.13,
      metalness: 0.25,
      roughness: 0.3,
      side: THREE.DoubleSide,
      depthWrite: false
    });
    var ringMat = new THREE.MeshStandardMaterial({
      color: 0x8891a3,
      metalness: 0.6,
      roughness: 0.3
    });
    stageX.forEach(function (x) {
      var shell = new THREE.Mesh(new THREE.BoxGeometry(CHAMBER_W, CHAMBER_H, CHAMBER_D), shellMat.clone());
      shell.position.set(x, CHAMBER_Y, 0);
      msfGroup.add(shell);
      register("flash-chambers", shell, { visualOnly: true });

      var ring = new THREE.Mesh(new THREE.TorusGeometry(1.05, 0.07, 12, 40), ringMat);
      ring.position.set(x, CHAMBER_Y, CHAMBER_D / 2 + 0.04);
      msfGroup.add(ring);
      register("flash-chambers", ring);
    });
  })();

  /* ---- 2. Heat recovery tube bundle: thin cylinders spanning
     the full train, cold end to the brine heater ---- */
  var tubeZ = [-1.0, -0.55, -0.1, 0.35, 0.8, 1.15];
  (function buildTubes() {
    var data = COMPONENTS_BY_ID["heat-recovery"] || { color: 0xff8a3d };
    tubeZ.forEach(function (z) {
      var mesh = hPipe(COLD_X - 1.4, HOT_X + 1.8, TUBE_Y, z, 0.055, data.color, { emissive: data.color, emissiveIntensity: 0.15 });
      register("heat-recovery", mesh);
    });
  })();

  /* ---- 3. Brine heater: glowing cylinder at the hot end ---- */
  var heaterMesh;
  (function buildHeater() {
    var data = COMPONENTS_BY_ID["brine-heater"] || { color: 0xff5f3d };
    var geo = new THREE.CylinderGeometry(1.0, 1.0, 3.3, 28);
    var mat = new THREE.MeshStandardMaterial({
      color: data.color,
      emissive: data.color,
      emissiveIntensity: 0.75,
      metalness: 0.3,
      roughness: 0.35
    });
    heaterMesh = new THREE.Mesh(geo, mat);
    heaterMesh.position.set(HOT_X + 3.4, CHAMBER_Y, 0);
    msfGroup.add(heaterMesh);
    register("brine-heater", heaterMesh);

    // Short connecting stub linking the tube bundle region to the heater body
    var stub = hPipe(HOT_X + 1.8, HOT_X + 2.5, TUBE_Y, 0, 0.14, data.color, { emissive: data.color, emissiveIntensity: 0.3 });
    register("brine-heater", stub);
  })();

  /* ---- 4. Seawater feed inlet: pipe + cone at the cold end ---- */
  (function buildSeawaterIn() {
    var data = COMPONENTS_BY_ID["seawater-in"] || { color: 0x29c3ea };
    var pipe = hPipe(FEED_START_X, COLD_X - 1.4, TUBE_Y, 0, 0.16, data.color);
    register("seawater-in", pipe);
    var tip = cone(FEED_START_X - 0.55, TUBE_Y, 0, 0.34, 0.9, data.color);
    register("seawater-in", tip);
  })();

  /* ---- 5. Brine path: pools under each chamber + connecting pipes ---- */
  (function buildBrinePath() {
    var data = COMPONENTS_BY_ID["brine-path"] || { color: 0xd9843d };
    var poolMat = new THREE.MeshStandardMaterial({ color: data.color, metalness: 0.1, roughness: 0.55 });
    stageX.forEach(function (x, i) {
      var pool = new THREE.Mesh(new THREE.BoxGeometry(CHAMBER_W * 0.88, 0.42, CHAMBER_D * 0.88), poolMat.clone());
      pool.position.set(x, POOL_Y, 0);
      msfGroup.add(pool);
      register("brine-path", pool);

      if (i < stageX.length - 1) {
        var connector = hPipe(x + CHAMBER_W * 0.44, stageX[i + 1] - CHAMBER_W * 0.44, POOL_Y, 0, 0.2, data.color);
        register("brine-path", connector);
      }
    });
  })();

  /* ---- 6. Distillate collection: trays + header pipe + outlet ---- */
  (function buildDistillate() {
    var data = COMPONENTS_BY_ID["distillate"] || { color: 0x4ade80 };
    var trayMat = new THREE.MeshStandardMaterial({ color: data.color, metalness: 0.2, roughness: 0.35, emissive: data.color, emissiveIntensity: 0.12 });
    stageX.forEach(function (x) {
      var tray = new THREE.Mesh(new THREE.BoxGeometry(CHAMBER_W * 0.8, 0.2, CHAMBER_D * 0.8), trayMat.clone());
      tray.position.set(x, TRAY_Y, 0);
      msfGroup.add(tray);
      register("distillate", tray);
    });
    var header = hPipe(COLD_X - 1.4, stageX[stageX.length - 1], HEADER_Y, 0, 0.11, data.color, { emissive: data.color, emissiveIntensity: 0.2 });
    register("distillate", header);
    var outPipe = hPipe(OUT_X, COLD_X - 1.4, HEADER_Y, 0.65, 0.13, data.color);
    register("distillate", outPipe);
    var outTip = cone(OUT_X - 0.5, HEADER_Y, 0.65, 0.3, 0.8, data.color);
    register("distillate", outTip);
  })();

  /* ---- 7. Reject brine outlet: pipe + cone at the cold end ---- */
  (function buildBrineOut() {
    var data = COMPONENTS_BY_ID["brine-out"] || { color: 0xef5757 };
    var pipe = hPipe(OUT_X, COLD_X - 1.4, POOL_Y, -0.65, 0.16, data.color);
    register("brine-out", pipe);
    var tip = cone(OUT_X - 0.55, POOL_Y, -0.65, 0.34, 0.9, data.color);
    register("brine-out", tip);
  })();

  /* ---- Floor ---- */
  (function buildFloor() {
    var geo = new THREE.PlaneGeometry(60, 30);
    var mat = new THREE.MeshStandardMaterial({ color: 0x0a0d14, roughness: 1, metalness: 0 });
    var floor = new THREE.Mesh(geo, mat);
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = -2.9;
    msfGroup.add(floor);
  })();

  /* =========================================================
     Flow particles
     ========================================================= */
  var particleGeo = new THREE.SphereGeometry(0.09, 8, 8);
  var feedParticles = [];
  var brineParticles = [];
  var vaporParticles = [];
  var distParticles = [];

  function makeParticle(color, opts) {
    var mat = new THREE.MeshBasicMaterial({
      color: color,
      transparent: true,
      opacity: (opts && opts.opacity != null) ? opts.opacity : 1
    });
    var mesh = new THREE.Mesh(particleGeo, mat);
    msfGroup.add(mesh);
    return mesh;
  }

  (function buildFeedParticles() {
    var color = (COMPONENTS_BY_ID["seawater-in"] || {}).color || 0x29c3ea;
    var count = 12;
    for (var i = 0; i < count; i++) {
      feedParticles.push({
        mesh: makeParticle(color),
        z: tubeZ[i % tubeZ.length],
        speed: 0.055 + Math.random() * 0.01,
        phase: i / count
      });
    }
  })();

  (function buildBrineParticles() {
    var color = (COMPONENTS_BY_ID["brine-path"] || {}).color || 0xd9843d;
    var count = 12;
    for (var i = 0; i < count; i++) {
      brineParticles.push({
        mesh: makeParticle(color),
        z: ((i % 3) - 1) * 0.7,
        speed: 0.06 + Math.random() * 0.012,
        phase: i / count
      });
    }
  })();

  (function buildVaporParticles() {
    var color = 0xe8f4ff;
    stageX.forEach(function (x) {
      for (var i = 0; i < 3; i++) {
        vaporParticles.push({
          mesh: makeParticle(color, { opacity: 0 }),
          x: x + (Math.random() - 0.5) * (CHAMBER_W * 0.6),
          z: (Math.random() - 0.5) * (CHAMBER_D * 0.6),
          speed: 0.35 + Math.random() * 0.15,
          phase: Math.random()
        });
      }
    });
  })();

  (function buildDistParticles() {
    var color = (COMPONENTS_BY_ID["distillate"] || {}).color || 0x4ade80;
    var count = 10;
    for (var i = 0; i < count; i++) {
      var startX = stageX[i % stageX.length];
      distParticles.push({
        mesh: makeParticle(color),
        startX: startX,
        z: 0,
        speed: 0.05 + Math.random() * 0.01,
        phase: i / count
      });
    }
  })();

  function lerp(a, b, t) { return a + (b - a) * t; }
  function mod1(v) { return v - Math.floor(v); }

  function updateParticles(flowTime) {
    feedParticles.forEach(function (p) {
      var t = mod1(flowTime * p.speed + p.phase);
      p.mesh.position.set(lerp(FEED_START_X, FEED_END_X, t), TUBE_Y, p.z);
    });
    brineParticles.forEach(function (p) {
      var t = mod1(flowTime * p.speed + p.phase);
      p.mesh.position.set(lerp(HOT_X + 1.2, OUT_X, t), POOL_Y, p.z);
    });
    vaporParticles.forEach(function (p) {
      var t = mod1(flowTime * p.speed + p.phase);
      p.mesh.position.set(p.x, lerp(-1.1, TUBE_Y - 0.3, t), p.z);
      p.mesh.material.opacity = Math.sin(t * Math.PI) * 0.85;
    });
    distParticles.forEach(function (p) {
      var t = mod1(flowTime * p.speed + p.phase);
      p.mesh.position.set(lerp(p.startX, OUT_X, t), HEADER_Y, lerp(0, 0.65, t));
    });
  }
  updateParticles(0);

  /* ---- Highlighting: iterate ALL registered meshes (not just
     pickable) so visualOnly components (chamber shells) still
     visually highlight when chosen from the sidebar list. ---- */
  var allMeshes = Object.keys(meshesById).reduce(function (acc, id) {
    return acc.concat(meshesById[id]);
  }, []);

  function highlight(id) {
    allMeshes.forEach(function (m) {
      var isSel = m.userData.componentId === id;
      m.scale.setScalar(isSel ? 1.16 : 1);
    });
  }

  function updatePanel(id) {
    var data = COMPONENTS_BY_ID[id];
    if (!data || !titleEl || !descEl) return;
    titleEl.textContent = data.nameAr + " (" + data.nameEn + ")";
    descEl.textContent = data.desc;
  }

  function updateListActiveState(id) {
    if (!listEl) return;
    var btns = listEl.querySelectorAll(".m3d-list-btn");
    btns.forEach(function (b) {
      b.setAttribute("aria-pressed", b.getAttribute("data-id") === id ? "true" : "false");
    });
  }

  function selectComponent(id) {
    if (!COMPONENTS_BY_ID[id]) return;
    highlight(id);
    updatePanel(id);
    updateListActiveState(id);
  }
  window.__m3dSelect = selectComponent;

  /* ---- Sidebar component list ---- */
  function buildListOnly() {
    if (!listEl) return;
    COMPONENTS.forEach(function (c) {
      var li = document.createElement("li");
      var btn = document.createElement("button");
      btn.type = "button";
      btn.className = "m3d-list-btn";
      btn.setAttribute("data-id", c.id);
      btn.setAttribute("aria-pressed", "false");
      btn.innerHTML = '<i style="background:#' + c.color.toString(16).padStart(6, "0") + '"></i> ' + c.nameAr;
      li.appendChild(btn);
      listEl.appendChild(li);
    });
  }
  buildListOnly();
  if (listEl) {
    listEl.addEventListener("click", function (e) {
      var btn = e.target.closest ? e.target.closest(".m3d-list-btn") : null;
      if (!btn) return;
      selectComponent(btn.getAttribute("data-id"));
    });
  }

  /* ---- Raycasting: only checks `pickable`, never the full mesh list ---- */
  var raycaster = new THREE.Raycaster();

  function pick(clientX, clientY) {
    var rect = canvas.getBoundingClientRect();
    var mouse = new THREE.Vector2(
      ((clientX - rect.left) / rect.width) * 2 - 1,
      -((clientY - rect.top) / rect.height) * 2 + 1
    );
    raycaster.setFromCamera(mouse, camera);
    var hits = raycaster.intersectObjects(pickable, false);
    return hits.length ? hits[0].object : null;
  }

  canvas.addEventListener("click", function (e) {
    var hit = pick(e.clientX, e.clientY);
    if (hit && hit.userData.componentId) {
      selectComponent(hit.userData.componentId);
    }
  });

  /* ---- Toolbar: flow toggle + auto-rotate toggle + reset view ---- */
  var flowPlaying = true;
  if (flowBtn) {
    flowBtn.addEventListener("click", function () {
      flowPlaying = !flowPlaying;
      flowBtn.setAttribute("aria-pressed", flowPlaying ? "true" : "false");
      flowBtn.textContent = flowPlaying ? "⏸ حركة الدورة" : "▶ حركة الدورة";
    });
  }
  if (rotateBtn) {
    rotateBtn.addEventListener("click", function () {
      controls.autoRotate = !controls.autoRotate;
      rotateBtn.setAttribute("aria-pressed", controls.autoRotate ? "true" : "false");
      rotateBtn.textContent = controls.autoRotate ? "⏸ إيقاف الدوران التلقائي" : "🔄 دوران تلقائي";
    });
  }
  if (resetBtn) {
    resetBtn.addEventListener("click", function () {
      camera.position.copy(DEFAULT_CAM_POS);
      controls.target.copy(DEFAULT_TARGET);
      controls.update();
    });
  }

  /* ---- Resize handling ---- */
  function resize() {
    var w = container.clientWidth;
    var h = container.clientHeight;
    if (!w || !h) return;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h, false);
  }
  window.addEventListener("resize", resize);
  if (typeof ResizeObserver !== "undefined") {
    var ro = new ResizeObserver(resize);
    ro.observe(container);
  }
  resize();

  /* ---- Animation loop ---- */
  var firstFrame = true;
  var flowTime = 0;
  var lastTs = null;
  function animate(ts) {
    requestAnimationFrame(animate);
    if (lastTs == null) lastTs = ts;
    var dt = Math.min((ts - lastTs) / 1000, 0.1);
    lastTs = ts;
    if (flowPlaying) flowTime += dt;
    updateParticles(flowTime);
    controls.update();
    heaterGlow.intensity = 2.2 + Math.sin(Date.now() * 0.002) * 0.35;
    renderer.render(scene, camera);
    if (firstFrame) {
      firstFrame = false;
      if (loadingEl) loadingEl.hidden = true;
    }
  }
  requestAnimationFrame(animate);

  /* ---- Default selection ---- */
  selectComponent("flash-chambers");
})();
