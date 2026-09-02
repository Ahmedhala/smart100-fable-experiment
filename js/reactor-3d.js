/* =========================================================
   SMART100 — Interactive 3D Reactor Model (Three.js)
   Stylized, labeled, non-photorealistic Integral PWR model.
   Not a certified engineering drawing.
   ========================================================= */
(function () {
  "use strict";

  var container = document.getElementById("r3d-container");
  var canvas = document.getElementById("r3d-canvas");
  var loadingEl = document.getElementById("r3d-loading");
  var fallbackEl = document.getElementById("r3d-fallback");
  var titleEl = document.getElementById("r3d-title");
  var descEl = document.getElementById("r3d-desc");
  var listEl = document.getElementById("r3d-list");
  var rotateBtn = document.getElementById("r3d-toggle-rotate");
  var resetBtn = document.getElementById("r3d-reset-view");

  if (!container || !canvas) return;

  var COMPONENTS = window.REACTOR_3D_COMPONENTS || [];
  var COMPONENTS_BY_ID = {};
  COMPONENTS.forEach(function (c) { COMPONENTS_BY_ID[c.id] = c; });

  /* ---- Fallback if Three.js failed to load from CDN ---- */
  if (typeof THREE === "undefined") {
    if (loadingEl) loadingEl.hidden = true;
    if (fallbackEl) fallbackEl.hidden = false;
    if (canvas) canvas.hidden = true;
    buildListOnly();
    return;
  }

  /* =========================================================
     Scene setup
     ========================================================= */
  var scene = new THREE.Scene();
  scene.background = null;

  var camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100);
  var DEFAULT_CAM_POS = new THREE.Vector3(6.2, 3.4, 6.2);
  var DEFAULT_TARGET = new THREE.Vector3(0, 0.2, 0);
  camera.position.copy(DEFAULT_CAM_POS);

  var renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));

  var controls = new THREE.OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.autoRotate = true;
  controls.autoRotateSpeed = 1.4;
  controls.minDistance = 4;
  controls.maxDistance = 14;
  controls.target.copy(DEFAULT_TARGET);
  controls.update();

  /* ---- Lighting ---- */
  scene.add(new THREE.AmbientLight(0xffffff, 0.55));
  var hemi = new THREE.HemisphereLight(0x8fb4ff, 0x0a0d14, 0.5);
  scene.add(hemi);
  var dir = new THREE.DirectionalLight(0xffffff, 0.9);
  dir.position.set(5, 8, 4);
  scene.add(dir);
  var coreGlow = new THREE.PointLight(0x8b6bff, 2.2, 6, 2);
  coreGlow.position.set(0, -2.1, 0);
  scene.add(coreGlow);

  /* =========================================================
     Registration pattern: meshesById (all meshes per component,
     used for highlighting) vs pickable (raycast targets only —
     excludes large translucent enclosing shells like RPV/coolant
     so they don't block clicks on components inside them).
     ========================================================= */
  var meshesById = {};
  var pickable = [];

  function register(id, mesh, opts) {
    mesh.userData.componentId = id;
    (meshesById[id] = meshesById[id] || []).push(mesh);
    if (!(opts && opts.visualOnly)) pickable.push(mesh);
  }

  var reactorGroup = new THREE.Group();
  scene.add(reactorGroup);

  /* ---- Geometry constants ---- */
  var VESSEL_R = 2.1;
  var VESSEL_H = 6.2;
  var VESSEL_TOP = VESSEL_H / 2;   // 3.1
  var VESSEL_BOTTOM = -VESSEL_H / 2; // -3.1
  var CORE_Y = -2.15;

  /* ---- 1. RPV: reactor pressure vessel (visualOnly) ---- */
  (function buildRPV() {
    var rpvData = COMPONENTS_BY_ID["rpv"] || { color: 0x5b6478 };
    var geo = new THREE.CylinderGeometry(VESSEL_R, VESSEL_R, VESSEL_H, 40, 1, true);
    var mat = new THREE.MeshPhysicalMaterial({
      color: rpvData.color,
      transparent: true,
      opacity: 0.16,
      metalness: 0.3,
      roughness: 0.25,
      side: THREE.DoubleSide,
      depthWrite: false
    });
    var mesh = new THREE.Mesh(geo, mat);
    reactorGroup.add(mesh);
    register("rpv", mesh, { visualOnly: true });

    // Domed caps (top head + bottom head), also visualOnly.
    var capGeo = new THREE.SphereGeometry(VESSEL_R, 40, 20, 0, Math.PI * 2, 0, Math.PI / 2);
    var topCap = new THREE.Mesh(capGeo, mat.clone());
    topCap.position.y = VESSEL_TOP;
    reactorGroup.add(topCap);
    register("rpv", topCap, { visualOnly: true });

    var bottomCap = new THREE.Mesh(capGeo, mat.clone());
    bottomCap.position.y = VESSEL_BOTTOM;
    bottomCap.rotation.x = Math.PI;
    reactorGroup.add(bottomCap);
    register("rpv", bottomCap, { visualOnly: true });
  })();

  /* ---- 2. Coolant: translucent inner shell (visualOnly) ---- */
  (function buildCoolant() {
    var coolantData = COMPONENTS_BY_ID["coolant"] || { color: 0x29c3ea };
    var geo = new THREE.CylinderGeometry(VESSEL_R * 0.9, VESSEL_R * 0.9, VESSEL_H * 0.92, 36, 1, true);
    var mat = new THREE.MeshPhysicalMaterial({
      color: coolantData.color,
      transparent: true,
      opacity: 0.14,
      metalness: 0.1,
      roughness: 0.15,
      side: THREE.DoubleSide,
      depthWrite: false
    });
    var mesh = new THREE.Mesh(geo, mat);
    reactorGroup.add(mesh);
    register("coolant", mesh, { visualOnly: true });
  })();

  /* ---- 3. Core: glowing cylinder near bottom of vessel ---- */
  var coreMesh;
  (function buildCore() {
    var coreData = COMPONENTS_BY_ID["core"] || { color: 0x8b6bff };
    var geo = new THREE.CylinderGeometry(0.62, 0.62, 0.95, 28);
    var mat = new THREE.MeshStandardMaterial({
      color: coreData.color,
      emissive: coreData.color,
      emissiveIntensity: 0.85,
      metalness: 0.2,
      roughness: 0.4
    });
    coreMesh = new THREE.Mesh(geo, mat);
    coreMesh.position.y = CORE_Y;
    reactorGroup.add(coreMesh);
    register("core", coreMesh);
  })();

  /* ---- 4. Fuel rods: ring of thin cylinders around the core ---- */
  (function buildFuel() {
    var fuelData = COMPONENTS_BY_ID["fuel"] || { color: 0xa78bfa };
    var count = 18;
    var ringR = 0.46;
    var geo = new THREE.CylinderGeometry(0.055, 0.055, 1.15, 12);
    var mat = new THREE.MeshStandardMaterial({
      color: fuelData.color,
      emissive: fuelData.color,
      emissiveIntensity: 0.5,
      metalness: 0.3,
      roughness: 0.35
    });
    for (var i = 0; i < count; i++) {
      var angle = (i / count) * Math.PI * 2;
      var rod = new THREE.Mesh(geo, mat);
      rod.position.set(Math.cos(angle) * ringR, CORE_Y, Math.sin(angle) * ringR);
      reactorGroup.add(rod);
      register("fuel", rod);
    }
  })();

  /* ---- 5. Control rods: shafts + housings above the core ---- */
  (function buildControlRods() {
    var crData = COMPONENTS_BY_ID["control-rods"] || { color: 0x9aa5b8 };
    var mat = new THREE.MeshStandardMaterial({
      color: crData.color,
      metalness: 0.7,
      roughness: 0.35
    });
    var count = 8;
    var ringR = 0.32;
    var shaftTop = VESSEL_TOP - 0.45;
    var shaftBottom = CORE_Y + 0.6;
    var shaftLen = shaftTop - shaftBottom;
    var shaftGeo = new THREE.CylinderGeometry(0.045, 0.045, shaftLen, 10);
    var housingGeo = new THREE.CylinderGeometry(0.14, 0.14, 0.4, 16);

    for (var i = 0; i < count; i++) {
      var angle = (i / count) * Math.PI * 2;
      var x = Math.cos(angle) * ringR;
      var z = Math.sin(angle) * ringR;

      var shaft = new THREE.Mesh(shaftGeo, mat);
      shaft.position.set(x, shaftBottom + shaftLen / 2, z);
      reactorGroup.add(shaft);
      register("control-rods", shaft);

      var housing = new THREE.Mesh(housingGeo, mat);
      housing.position.set(x, shaftTop + 0.2, z);
      reactorGroup.add(housing);
      register("control-rods", housing);
    }
  })();

  /* ---- 6. Steam generator: ring of tubes ---- */
  (function buildSteamGen() {
    var sgData = COMPONENTS_BY_ID["steam-gen"] || { color: 0xff8a3d };
    var mat = new THREE.MeshStandardMaterial({
      color: sgData.color,
      emissive: sgData.color,
      emissiveIntensity: 0.25,
      metalness: 0.4,
      roughness: 0.3
    });
    var count = 26;
    var ringR = 1.55;
    var tubeGeo = new THREE.CylinderGeometry(0.05, 0.05, 1.7, 10);
    var sgY = -0.2;
    for (var i = 0; i < count; i++) {
      var angle = (i / count) * Math.PI * 2;
      var tube = new THREE.Mesh(tubeGeo, mat);
      tube.position.set(Math.cos(angle) * ringR, sgY, Math.sin(angle) * ringR);
      reactorGroup.add(tube);
      register("steam-gen", tube);
    }
  })();

  /* ---- 7. Pressurizer: dome near the top ---- */
  (function buildPressurizer() {
    var pzData = COMPONENTS_BY_ID["pressurizer"] || { color: 0xc9b6ff };
    var mat = new THREE.MeshStandardMaterial({
      color: pzData.color,
      emissive: pzData.color,
      emissiveIntensity: 0.3,
      metalness: 0.25,
      roughness: 0.35
    });
    var domeY = VESSEL_TOP - 0.9;
    var domeGeo = new THREE.SphereGeometry(0.55, 24, 16, 0, Math.PI * 2, 0, Math.PI / 2);
    var dome = new THREE.Mesh(domeGeo, mat);
    dome.position.y = domeY;
    reactorGroup.add(dome);
    register("pressurizer", dome);

    var baseGeo = new THREE.CylinderGeometry(0.55, 0.55, 0.4, 24);
    var base = new THREE.Mesh(baseGeo, mat);
    base.position.y = domeY - 0.2;
    reactorGroup.add(base);
    register("pressurizer", base);
  })();

  /* ---- Highlighting: iterate ALL registered meshes (not just
     pickable) so visualOnly components (RPV, coolant) still
     visually highlight when chosen from the sidebar list. ---- */
  var allMeshes = Object.keys(meshesById).reduce(function (acc, id) {
    return acc.concat(meshesById[id]);
  }, []);

  var currentId = null;

  function highlight(id) {
    currentId = id;
    allMeshes.forEach(function (m) {
      var isSel = m.userData.componentId === id;
      m.scale.setScalar(isSel ? 1.18 : 1);
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
    var btns = listEl.querySelectorAll(".r3d-list-btn");
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
  window.__r3dSelect = selectComponent; // exposed for potential external hooks

  /* ---- Sidebar component list ---- */
  function buildListOnly() {
    if (!listEl) return;
    COMPONENTS.forEach(function (c) {
      var li = document.createElement("li");
      var btn = document.createElement("button");
      btn.type = "button";
      btn.className = "r3d-list-btn";
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
      var btn = e.target.closest ? e.target.closest(".r3d-list-btn") : null;
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

  /* ---- Toolbar: auto-rotate toggle + reset view ---- */
  if (rotateBtn) {
    rotateBtn.addEventListener("click", function () {
      controls.autoRotate = !controls.autoRotate;
      rotateBtn.textContent = controls.autoRotate
        ? "⏸ إيقاف الدوران التلقائي"
        : "▶ تشغيل الدوران التلقائي";
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
  function animate() {
    requestAnimationFrame(animate);
    controls.update();
    coreGlow.intensity = 1.9 + Math.sin(Date.now() * 0.002) * 0.3;
    renderer.render(scene, camera);
    if (firstFrame) {
      firstFrame = false;
      if (loadingEl) loadingEl.hidden = true;
    }
  }
  animate();

  /* ---- Default selection ---- */
  selectComponent("core");
})();
