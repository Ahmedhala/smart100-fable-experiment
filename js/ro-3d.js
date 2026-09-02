/* =========================================================
   RO — Interactive 3D Reverse-Osmosis Train Model (Three.js)
   Stylized, labeled, non-photorealistic model of a single-pass
   RO train. Not a certified engineering drawing.
   ========================================================= */
(function () {
  "use strict";

  var container = document.getElementById("r3d2-container");
  var canvas = document.getElementById("r3d2-canvas");
  var loadingEl = document.getElementById("r3d2-loading");
  var fallbackEl = document.getElementById("r3d2-fallback");
  var titleEl = document.getElementById("r3d2-title");
  var descEl = document.getElementById("r3d2-desc");
  var listEl = document.getElementById("r3d2-list");
  var rotateBtn = document.getElementById("r3d2-toggle-rotate");
  var flowBtn = document.getElementById("r3d2-toggle-flow");
  var resetBtn = document.getElementById("r3d2-reset-view");

  if (!container || !canvas) return;

  var COMPONENTS = window.RO_3D_COMPONENTS || [];
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
     Layout constants
     ========================================================= */
  var FEED_START_X = -16.2;
  var PRETREAT_X = -11.6;
  var PUMP_X = -7.6;
  var MANIFOLD_IN_X = -0.4;
  var MEMBRANE_START_X = -0.1;
  var MEMBRANE_LEN = 4.2;
  var MEMBRANE_END_X = MEMBRANE_START_X + MEMBRANE_LEN; // 4.1
  var MEMBRANE_R = 0.55;
  var MANIFOLD_OUT_X = MEMBRANE_END_X + 0.3; // 4.4
  var RISER_X = MEMBRANE_START_X + MEMBRANE_LEN * 0.62; // ~2.5, riser tap point
  var HEADER_Y = 2.3;
  var CONC_OUT_X = 9.0;
  var PERM_OUT_X = 7.6;

  var vesselZ = [-2.4, -1.2, 0, 1.2, 2.4];

  /* =========================================================
     Scene setup
     ========================================================= */
  var scene = new THREE.Scene();
  scene.background = null;

  var camera = new THREE.PerspectiveCamera(42, 1, 0.1, 200);
  var DEFAULT_CAM_POS = new THREE.Vector3(6, 9, 21);
  var DEFAULT_TARGET = new THREE.Vector3(-1.5, 0.4, 0);
  camera.position.copy(DEFAULT_CAM_POS);

  var renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));

  var controls = new THREE.OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.autoRotate = false;
  controls.autoRotateSpeed = 1.1;
  controls.minDistance = 9;
  controls.maxDistance = 40;
  controls.target.copy(DEFAULT_TARGET);
  controls.update();

  /* ---- Lighting ---- */
  scene.add(new THREE.AmbientLight(0xffffff, 0.55));
  var hemi = new THREE.HemisphereLight(0x9ecdff, 0x0a0d14, 0.45);
  scene.add(hemi);
  var dir = new THREE.DirectionalLight(0xffffff, 0.85);
  dir.position.set(8, 14, 9);
  scene.add(dir);
  var pumpGlow = new THREE.PointLight(0x8b6bff, 2.0, 10, 2);
  pumpGlow.position.set(PUMP_X, 0.4, 0);
  scene.add(pumpGlow);

  /* =========================================================
     Registration pattern: meshesById (all meshes per component,
     used for highlighting) vs pickable (raycast targets only).
     ========================================================= */
  var meshesById = {};
  var pickable = [];

  function register(id, mesh, opts) {
    mesh.userData.componentId = id;
    (meshesById[id] = meshesById[id] || []).push(mesh);
    if (!(opts && opts.visualOnly)) pickable.push(mesh);
  }

  var roGroup = new THREE.Group();
  scene.add(roGroup);

  /* ---- Helpers ---- */
  function hPipe(xStart, xEnd, y, z, radius, color, opts) {
    var len = Math.abs(xEnd - xStart);
    var geo = new THREE.CylinderGeometry(radius, radius, len, 14);
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
    roGroup.add(mesh);
    return mesh;
  }

  function zPipe(x, zStart, zEnd, y, radius, color, opts) {
    var len = Math.abs(zEnd - zStart);
    var geo = new THREE.CylinderGeometry(radius, radius, len, 14);
    var mat = new THREE.MeshStandardMaterial({
      color: color,
      metalness: (opts && opts.metalness != null) ? opts.metalness : 0.35,
      roughness: (opts && opts.roughness != null) ? opts.roughness : 0.45,
      emissive: (opts && opts.emissive) || 0x000000,
      emissiveIntensity: (opts && opts.emissiveIntensity) || 0
    });
    var mesh = new THREE.Mesh(geo, mat);
    mesh.rotation.x = Math.PI / 2;
    mesh.position.set(x, y, (zStart + zEnd) / 2);
    roGroup.add(mesh);
    return mesh;
  }

  function vPipe(x, yStart, yEnd, z, radius, color, opts) {
    var len = Math.abs(yEnd - yStart);
    var geo = new THREE.CylinderGeometry(radius, radius, len, 14);
    var mat = new THREE.MeshStandardMaterial({
      color: color,
      metalness: (opts && opts.metalness != null) ? opts.metalness : 0.35,
      roughness: (opts && opts.roughness != null) ? opts.roughness : 0.45,
      emissive: (opts && opts.emissive) || 0x000000,
      emissiveIntensity: (opts && opts.emissiveIntensity) || 0
    });
    var mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(x, (yStart + yEnd) / 2, z);
    roGroup.add(mesh);
    return mesh;
  }

  function cone(x, y, z, radius, height, color, axis) {
    var geo = new THREE.ConeGeometry(radius, height, 16);
    var mat = new THREE.MeshStandardMaterial({ color: color, metalness: 0.3, roughness: 0.4 });
    var mesh = new THREE.Mesh(geo, mat);
    if (axis === "x") mesh.rotation.z = Math.PI / 2;
    mesh.position.set(x, y, z);
    roGroup.add(mesh);
    return mesh;
  }

  /* ---- 1. Seawater feed inlet: pipe + cone ---- */
  (function buildFeed() {
    var data = COMPONENTS_BY_ID["seawater-feed"] || { color: 0x29c3ea };
    var pipe = hPipe(FEED_START_X, PRETREAT_X - 1.3, 0, 0, 0.16, data.color);
    register("seawater-feed", pipe);
    var tip = cone(FEED_START_X - 0.55, 0, 0, 0.34, 0.9, data.color, "x");
    register("seawater-feed", tip);
  })();

  /* ---- 2. Pretreatment: cluster of vertical filter cylinders ---- */
  (function buildPretreatment() {
    var data = COMPONENTS_BY_ID["pretreatment"] || { color: 0x6b8fa3 };
    var mat = new THREE.MeshStandardMaterial({ color: data.color, metalness: 0.35, roughness: 0.4 });
    var positions = [
      [-0.7, -0.65], [-0.7, 0.65], [0.7, -0.65], [0.7, 0.65]
    ];
    positions.forEach(function (p) {
      var mesh = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.42, 2.6, 20), mat.clone());
      mesh.position.set(PRETREAT_X + p[0], 0, p[1]);
      roGroup.add(mesh);
      register("pretreatment", mesh);
      var cap = new THREE.Mesh(new THREE.CylinderGeometry(0.46, 0.46, 0.14, 20), mat.clone());
      cap.position.set(PRETREAT_X + p[0], 1.37, p[1]);
      roGroup.add(cap);
      register("pretreatment", cap);
    });
    // connector from feed pipe into the cluster
    var link = hPipe(PRETREAT_X - 1.3, PRETREAT_X - 1.1, 0, 0, 0.16, data.color);
    register("pretreatment", link);
  })();

  /* ---- 3. High-pressure pump: glowing box + suction/discharge stubs ---- */
  var pumpMesh;
  (function buildPump() {
    var data = COMPONENTS_BY_ID["hp-pump"] || { color: 0x8b6bff };
    var mat = new THREE.MeshStandardMaterial({
      color: data.color,
      emissive: data.color,
      emissiveIntensity: 0.6,
      metalness: 0.4,
      roughness: 0.3
    });
    pumpMesh = new THREE.Mesh(new THREE.BoxGeometry(1.7, 1.5, 1.7), mat);
    pumpMesh.position.set(PUMP_X, 0, 0);
    roGroup.add(pumpMesh);
    register("hp-pump", pumpMesh);

    var suction = hPipe(PRETREAT_X + 1.1, PUMP_X - 0.85, 0, 0, 0.15, data.color);
    register("hp-pump", suction);

    var discharge = hPipe(PUMP_X + 0.85, MANIFOLD_IN_X, 0, 0, 0.16, data.color, { emissive: data.color, emissiveIntensity: 0.3 });
    register("hp-pump", discharge);

    // inlet distribution manifold feeding all vessels (still pressurized feed water)
    var manifold = zPipe(MANIFOLD_IN_X, vesselZ[0], vesselZ[vesselZ.length - 1], 0, 0.13, data.color, { emissive: data.color, emissiveIntensity: 0.2 });
    register("hp-pump", manifold);
    vesselZ.forEach(function (z) {
      var stub = hPipe(MANIFOLD_IN_X, MEMBRANE_START_X, 0, z, 0.12, data.color);
      register("hp-pump", stub);
    });
  })();

  /* ---- 4. Membrane pressure vessels: the visual centerpiece ---- */
  (function buildMembranes() {
    var data = COMPONENTS_BY_ID["membrane"] || { color: 0xb491ff };
    var mat = new THREE.MeshPhysicalMaterial({
      color: data.color,
      transparent: true,
      opacity: 0.32,
      metalness: 0.25,
      roughness: 0.2,
      side: THREE.DoubleSide,
      depthWrite: false
    });
    var capMat = new THREE.MeshStandardMaterial({ color: 0x5b6478, metalness: 0.6, roughness: 0.3 });
    vesselZ.forEach(function (z) {
      var vessel = new THREE.Mesh(new THREE.CylinderGeometry(MEMBRANE_R, MEMBRANE_R, MEMBRANE_LEN, 28, 1, true), mat.clone());
      vessel.rotation.z = Math.PI / 2;
      vessel.position.set((MEMBRANE_START_X + MEMBRANE_END_X) / 2, 0, z);
      roGroup.add(vessel);
      register("membrane", vessel);

      var capGeo = new THREE.CircleGeometry(MEMBRANE_R, 24);
      var capIn = new THREE.Mesh(capGeo, capMat.clone());
      capIn.rotation.y = Math.PI / 2;
      capIn.position.set(MEMBRANE_START_X, 0, z);
      roGroup.add(capIn);
      register("membrane", capIn);
      var capOut = new THREE.Mesh(capGeo, capMat.clone());
      capOut.rotation.y = -Math.PI / 2;
      capOut.position.set(MEMBRANE_END_X, 0, z);
      roGroup.add(capOut);
      register("membrane", capOut);
    });
  })();

  /* ---- 5. Permeate header: fresh-water riser + header + outlet ---- */
  (function buildPermeate() {
    var data = COMPONENTS_BY_ID["permeate"] || { color: 0x4ade80 };
    vesselZ.forEach(function (z) {
      var riser = vPipe(RISER_X, MEMBRANE_R + 0.05, HEADER_Y, z, 0.09, data.color, { emissive: data.color, emissiveIntensity: 0.25 });
      register("permeate", riser);
    });
    var header = zPipe(RISER_X, vesselZ[0], vesselZ[vesselZ.length - 1], HEADER_Y, 0.11, data.color, { emissive: data.color, emissiveIntensity: 0.2 });
    register("permeate", header);
    var outPipe = hPipe(RISER_X, PERM_OUT_X, HEADER_Y, 0, 0.13, data.color, { emissive: data.color, emissiveIntensity: 0.2 });
    register("permeate", outPipe);
    var outTip = cone(PERM_OUT_X + 0.5, HEADER_Y, 0, 0.3, 0.8, data.color, "x");
    register("permeate", outTip);
  })();

  /* ---- 6. Concentrate manifold: reject brine collection + outlet ---- */
  (function buildConcentrate() {
    var data = COMPONENTS_BY_ID["concentrate"] || { color: 0xef5757 };
    vesselZ.forEach(function (z) {
      var stub = hPipe(MEMBRANE_END_X, MANIFOLD_OUT_X, 0, z, 0.13, data.color);
      register("concentrate", stub);
    });
    var manifold = zPipe(MANIFOLD_OUT_X, vesselZ[0], vesselZ[vesselZ.length - 1], 0, 0.14, data.color, { emissive: data.color, emissiveIntensity: 0.15 });
    register("concentrate", manifold);
    var outPipe = hPipe(MANIFOLD_OUT_X, CONC_OUT_X, 0, 0, 0.17, data.color, { emissive: data.color, emissiveIntensity: 0.2 });
    register("concentrate", outPipe);
    var outTip = cone(CONC_OUT_X + 0.55, 0, 0, 0.35, 0.9, data.color, "x");
    register("concentrate", outTip);
  })();

  /* ---- Floor ---- */
  (function buildFloor() {
    var geo = new THREE.PlaneGeometry(60, 30);
    var mat = new THREE.MeshStandardMaterial({ color: 0x0a0d14, roughness: 1, metalness: 0 });
    var floor = new THREE.Mesh(geo, mat);
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = -1.9;
    roGroup.add(floor);
  })();

  /* =========================================================
     Flow particles
     feed = blue, permeate = green, concentrate = red.
     Concentrate particles stay blue while inside the vessel
     (still undifferentiated feed), turning red once they exit
     the vessel outlet. Permeate particles stay blue until they
     "cross" partway through the vessel, then turn green as they
     rise to the header — visually showing the minority split.
     ========================================================= */
  var particleGeo = new THREE.SphereGeometry(0.1, 8, 8);
  var FEED_COLOR = (COMPONENTS_BY_ID["seawater-feed"] || {}).color || 0x29c3ea;
  var PERM_COLOR = (COMPONENTS_BY_ID["permeate"] || {}).color || 0x4ade80;
  var CONC_COLOR = (COMPONENTS_BY_ID["concentrate"] || {}).color || 0xef5757;

  function makeParticle(color) {
    var mat = new THREE.MeshBasicMaterial({ color: color, transparent: true, opacity: 1 });
    var mesh = new THREE.Mesh(particleGeo, mat);
    roGroup.add(mesh);
    return mesh;
  }

  var feedParticles = [];
  var concParticles = [];
  var permParticles = [];

  (function buildFeedParticles() {
    var count = 10;
    for (var i = 0; i < count; i++) {
      feedParticles.push({
        mesh: makeParticle(FEED_COLOR),
        speed: 0.06 + Math.random() * 0.01,
        phase: i / count
      });
    }
  })();

  var CROSS_T = 0.62; // fraction of vessel length where "crossing" begins for permeate track

  (function buildVesselParticles() {
    vesselZ.forEach(function (z) {
      for (var i = 0; i < 3; i++) {
        concParticles.push({
          mesh: makeParticle(FEED_COLOR),
          z: z,
          speed: 0.05 + Math.random() * 0.012,
          phase: Math.random()
        });
      }
      permParticles.push({
        mesh: makeParticle(FEED_COLOR),
        z: z,
        speed: 0.045 + Math.random() * 0.01,
        phase: Math.random()
      });
    });
  })();

  function lerp(a, b, t) { return a + (b - a) * t; }
  function mod1(v) { return v - Math.floor(v); }

  function updateParticles(flowTime) {
    // Feed: single shared line from inlet to the pump/manifold
    feedParticles.forEach(function (p) {
      var t = mod1(flowTime * p.speed + p.phase);
      p.mesh.position.set(lerp(FEED_START_X, MEMBRANE_START_X, t), 0, 0);
    });

    // Concentrate: majority flow, straight through the vessel then out
    concParticles.forEach(function (p) {
      var t = mod1(flowTime * p.speed + p.phase);
      if (t < 0.7) {
        var tt = t / 0.7;
        p.mesh.position.set(lerp(MEMBRANE_START_X, MEMBRANE_END_X, tt), 0, p.z);
        p.mesh.material.color.setHex(FEED_COLOR);
      } else {
        var tt2 = (t - 0.7) / 0.3;
        p.mesh.position.set(lerp(MANIFOLD_OUT_X, CONC_OUT_X, tt2), 0, lerp(p.z, 0, Math.min(tt2 * 1.4, 1)));
        p.mesh.material.color.setHex(CONC_COLOR);
      }
    });

    // Permeate: minority flow, partial pass then rise to the header and out
    permParticles.forEach(function (p) {
      var t = mod1(flowTime * p.speed + p.phase);
      if (t < 0.4) {
        var tt = t / 0.4;
        p.mesh.position.set(lerp(MEMBRANE_START_X, RISER_X, tt), 0, p.z);
        p.mesh.material.color.setHex(FEED_COLOR);
      } else if (t < 0.65) {
        var tt2 = (t - 0.4) / 0.25;
        p.mesh.position.set(RISER_X, lerp(0, HEADER_Y, tt2), p.z);
        p.mesh.material.color.setHex(PERM_COLOR);
      } else {
        var tt3 = (t - 0.65) / 0.35;
        p.mesh.position.set(lerp(RISER_X, PERM_OUT_X, tt3), HEADER_Y, lerp(p.z, 0, Math.min(tt3 * 1.4, 1)));
        p.mesh.material.color.setHex(PERM_COLOR);
      }
    });
  }
  updateParticles(0);

  /* ---- Highlighting ---- */
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
    var btns = listEl.querySelectorAll(".r3d2-list-btn");
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
  window.__r3d2Select = selectComponent;

  /* ---- Sidebar component list ---- */
  function buildListOnly() {
    if (!listEl) return;
    COMPONENTS.forEach(function (c) {
      var li = document.createElement("li");
      var btn = document.createElement("button");
      btn.type = "button";
      btn.className = "r3d2-list-btn";
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
      var btn = e.target.closest ? e.target.closest(".r3d2-list-btn") : null;
      if (!btn) return;
      selectComponent(btn.getAttribute("data-id"));
    });
  }

  /* ---- Raycasting ---- */
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
    pumpGlow.intensity = 1.8 + Math.sin(Date.now() * 0.0025) * 0.3;
    renderer.render(scene, camera);
    if (firstFrame) {
      firstFrame = false;
      if (loadingEl) loadingEl.hidden = true;
    }
  }
  requestAnimationFrame(animate);

  /* ---- Default selection ---- */
  selectComponent("membrane");
})();
