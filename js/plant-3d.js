(function () {
  "use strict";

  /* =====================================================
     plant.html — Interactive 3D plant-overview model.
     Stylised, high-level model (NOT a certified engineering
     drawing) built with Three.js. Distinguishes the MSF and
     RO trains visually and animates particle flows for
     energy (thermal + electric), seawater intake, product
     water and brine discharge.

     Safe to include on any page: every DOM lookup is guarded,
     so this file no-ops if the #p3d-stage markup is absent.
     ===================================================== */

  var stage = document.getElementById("p3d-stage");
  if (!stage) return;

  var loadingEl = document.getElementById("p3d-loading");
  var fallbackEl = document.getElementById("p3d-fallback");
  var autorotateBtn = document.getElementById("p3d-autorotate-btn");
  var flowBtn = document.getElementById("p3d-flow-btn");
  var resetBtn = document.getElementById("p3d-reset-btn");
  var listEl = document.getElementById("p3d-list");
  var detailTitle = document.getElementById("p3d-detail-title");
  var detailDesc = document.getElementById("p3d-detail-desc");

  function showFallback() {
    if (loadingEl) loadingEl.style.display = "none";
    if (fallbackEl) fallbackEl.style.display = "flex";
  }

  if (typeof THREE === "undefined" || typeof THREE.OrbitControls === "undefined") {
    showFallback();
    return;
  }

  /* ---------- Design-system colors ---------- */
  var cssVars = getComputedStyle(document.documentElement);
  function cssVar(name, fallback) {
    var v = cssVars.getPropertyValue(name);
    return v && v.trim() ? v.trim() : fallback;
  }
  var COLOR_THERMAL = cssVar("--thermal", "#ff8a3d");   // MSF / thermal energy path
  var COLOR_WATER = cssVar("--water", "#29c3ea");       // seawater / product-water bodies
  var COLOR_NUCLEAR = cssVar("--nuclear", "#8b6bff");   // energy-input mast
  var COLOR_ELECTRIC = "#ffd23d";                       // RO / electric energy path
  var COLOR_GREEN = "#3ddc84";                          // product-water flow particles
  var COLOR_RED = "#ff5c5c";                             // brine discharge

  /* ---------- Component metadata ---------- */
  var COMPONENTS = {
    "energy-input": {
      name: "مصدر الطاقة الواردة (Energy Input)",
      desc: "يمثل هذا الصرح نقطة الربط النظرية بين المحطة وعشر وحدات مفاعل SMART100 المعياري الصغير (راجع صفحة المفاعل لتفاصيل المفاعل نفسه، فهذا النموذج لا يعرضه). من هنا تتفرّع الطاقة إلى مسارين: بخار حراري لوحدات MSF، وكهرباء لمضخات وحدات RO.",
      pos: new THREE.Vector3(-32, 3, -6)
    },
    "seawater-intake": {
      name: "مأخذ مياه البحر (Seawater Intake)",
      desc: "منشأة أرضية قريبة من مصدر الطاقة تسحب مياه البحر الخام من الخليج العربي لتغذية كلا خطّي التحلية — MSF وRO — قبل مراحل المعالجة المسبقة.",
      pos: new THREE.Vector3(-32, 1, 6)
    },
    "msf-block": {
      name: "وحدات MSF الثماني (MSF Train)",
      desc: "تمثيل مبسّط لثماني وحدات تقطير ومضي متعدد المراحل (Multi-Stage Flash) تعمل بالبخار الحراري، وتنتج نحو 70.2% من إجمالي إنتاج المحطة اليومي.",
      pos: new THREE.Vector3(-5, 2, -14)
    },
    "ro-block": {
      name: "وحدات RO السبع عشرة (RO Train)",
      desc: "تمثيل مبسّط لسبع عشرة وحدة تناضح عكسي (Reverse Osmosis) تعمل بمضخات ضغط عالٍ كهربائية بدلاً من البخار، وتنتج نحو 29.8% من الإنتاج بكفاءة طاقة أعلى نسبياً.",
      pos: new THREE.Vector3(-5, 2, 14)
    },
    "product-water": {
      name: "خزان المياه المنتجة (Product Water)",
      desc: "خزان رمزي يمثل تجميع إنتاج المياه المحلاة من خطّي MSF وRO معاً، والبالغ إجمالاً 1,036,000 متر مكعب يومياً.",
      pos: new THREE.Vector3(30, 4, -6)
    },
    "brine-discharge": {
      name: "تصريف المياه المالحة (Brine Discharge)",
      desc: "منفذ تصريف رمزي للمياه المركّزة (Brine) الناتجة عن عمليتي MSF وRO مجتمعتين، والتي تُعاد إلى البحر بعد التحلية.",
      pos: new THREE.Vector3(30, 1.5, 8)
    }
  };

  /* ---------- Renderer / scene / camera ---------- */
  var scene = new THREE.Scene();

  var camera = new THREE.PerspectiveCamera(45, 1, 0.5, 500);
  var DEFAULT_CAM_POS = new THREE.Vector3(10, 34, 60);
  var DEFAULT_TARGET = new THREE.Vector3(-2, 3, 0);
  camera.position.copy(DEFAULT_CAM_POS);

  var renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  stage.appendChild(renderer.domElement);

  var controls = new THREE.OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.target.copy(DEFAULT_TARGET);
  controls.minDistance = 20;
  controls.maxDistance = 130;
  controls.maxPolarAngle = Math.PI * 0.49;
  controls.autoRotate = false;
  controls.autoRotateSpeed = 1.1;
  controls.update();

  /* ---------- Lighting ---------- */
  scene.add(new THREE.HemisphereLight(0x8fb3ff, 0x0a0d14, 0.65));
  var sun = new THREE.DirectionalLight(0xffffff, 0.9);
  sun.position.set(40, 60, 20);
  scene.add(sun);
  var fill = new THREE.DirectionalLight(0x8b6bff, 0.25);
  fill.position.set(-30, 20, -30);
  scene.add(fill);

  /* ---------- Ground ---------- */
  var ground = new THREE.Mesh(
    new THREE.PlaneGeometry(180, 90),
    new THREE.MeshStandardMaterial({ color: 0x0c111a, roughness: 1, metalness: 0 })
  );
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = -0.05;
  scene.add(ground);

  var grid = new THREE.GridHelper(180, 36, 0x223049, 0x151d2a);
  grid.position.y = 0;
  scene.add(grid);

  /* ---------- Pick / highlight registry (as specified) ---------- */
  var meshesById = {};
  var pickable = [];
  function register(id, mesh, opts) {
    mesh.userData.componentId = id;
    (meshesById[id] = meshesById[id] || []).push(mesh);
    if (!(opts && opts.visualOnly)) pickable.push(mesh);
  }

  function getAllMeshes() {
    var out = [];
    Object.keys(meshesById).forEach(function (k) {
      out = out.concat(meshesById[k]);
    });
    return out;
  }

  var currentId = null;
  function highlight(id) {
    currentId = id;
    getAllMeshes().forEach(function (m) {
      m.scale.setScalar(m.userData.componentId === id ? 1.14 : 1);
    });
  }

  var raycaster = new THREE.Raycaster();
  function pick(clientX, clientY) {
    var rect = renderer.domElement.getBoundingClientRect();
    var mouse = new THREE.Vector2(
      ((clientX - rect.left) / rect.width) * 2 - 1,
      -((clientY - rect.top) / rect.height) * 2 + 1
    );
    raycaster.setFromCamera(mouse, camera);
    var hits = raycaster.intersectObjects(pickable, false);
    return hits.length ? hits[0].object : null;
  }

  /* ---------- Shared geometries/materials ---------- */
  function mat(color, opts) {
    opts = opts || {};
    return new THREE.MeshStandardMaterial(Object.assign({
      color: color,
      roughness: opts.roughness != null ? opts.roughness : 0.55,
      metalness: opts.metalness != null ? opts.metalness : 0.35,
      emissive: opts.emissive || 0x000000,
      emissiveIntensity: opts.emissiveIntensity || 0
    }, {}));
  }

  /* ---------- 1. energy-input: pylon/mast ---------- */
  (function buildEnergyInput() {
    var p = COMPONENTS["energy-input"].pos;
    var g = new THREE.Group();
    g.position.set(p.x, 0, p.z);

    var mast = new THREE.Mesh(
      new THREE.CylinderGeometry(0.55, 0.9, 16, 8),
      mat(COLOR_NUCLEAR, { metalness: 0.6, roughness: 0.3, emissive: COLOR_NUCLEAR, emissiveIntensity: 0.25 })
    );
    mast.position.y = 8;
    g.add(mast);
    register("energy-input", mast);

    // lattice cross-braces (visual only)
    for (var i = 0; i < 3; i++) {
      var brace = new THREE.Mesh(
        new THREE.BoxGeometry(3.4, 0.18, 0.18),
        mat(0x1e2636, { metalness: 0.7, roughness: 0.4 })
      );
      brace.position.y = 3 + i * 4.5;
      brace.rotation.y = i * 0.6;
      g.add(brace);
      register("energy-input", brace, { visualOnly: true });
    }

    // beacon on top
    var beacon = new THREE.Mesh(
      new THREE.SphereGeometry(0.9, 16, 16),
      mat(COLOR_NUCLEAR, { emissive: COLOR_NUCLEAR, emissiveIntensity: 1, metalness: 0, roughness: 0.2 })
    );
    beacon.position.y = 16.6;
    g.add(beacon);
    register("energy-input", beacon, { visualOnly: true });

    // two small nodes indicating the thermal / electric split
    var thermalNode = new THREE.Mesh(new THREE.SphereGeometry(0.5, 12, 12), mat(COLOR_THERMAL, { emissive: COLOR_THERMAL, emissiveIntensity: 0.7 }));
    thermalNode.position.set(-1.4, 12, -1.2);
    g.add(thermalNode);
    register("energy-input", thermalNode, { visualOnly: true });

    var electricNode = new THREE.Mesh(new THREE.SphereGeometry(0.5, 12, 12), mat(COLOR_ELECTRIC, { emissive: COLOR_ELECTRIC, emissiveIntensity: 0.7 }));
    electricNode.position.set(1.4, 12, 1.2);
    g.add(electricNode);
    register("energy-input", electricNode, { visualOnly: true });

    // base pad
    var base = new THREE.Mesh(new THREE.CylinderGeometry(3, 3.4, 0.6, 8), mat(0x1a2230, { metalness: 0.5 }));
    base.position.y = 0.3;
    g.add(base);
    register("energy-input", base, { visualOnly: true });

    scene.add(g);
  })();

  /* ---------- 2. seawater-intake ---------- */
  (function buildIntake() {
    var p = COMPONENTS["seawater-intake"].pos;
    var g = new THREE.Group();
    g.position.set(p.x, 0, p.z);

    var platform = new THREE.Mesh(
      new THREE.BoxGeometry(6, 1.2, 5),
      mat(0x1a2434, { metalness: 0.4, roughness: 0.6 })
    );
    platform.position.y = 0.6;
    g.add(platform);
    register("seawater-intake", platform);

    var grate = new THREE.Mesh(
      new THREE.TorusGeometry(1.6, 0.18, 8, 20),
      mat(COLOR_WATER, { emissive: COLOR_WATER, emissiveIntensity: 0.5, metalness: 0.3 })
    );
    grate.rotation.x = Math.PI / 2;
    grate.position.y = 1.3;
    g.add(grate);
    register("seawater-intake", grate, { visualOnly: true });

    var pipeDown = new THREE.Mesh(
      new THREE.CylinderGeometry(0.7, 0.7, 2.2, 12),
      mat(0x2a3547, { metalness: 0.6 })
    );
    pipeDown.position.set(0, -0.4, -2.6);
    pipeDown.rotation.z = Math.PI / 2;
    g.add(pipeDown);
    register("seawater-intake", pipeDown, { visualOnly: true });

    scene.add(g);
  })();

  /* ---------- 3. msf-block: row of thermal units ---------- */
  var msfUnitPositions = [];
  (function buildMSF() {
    var base = COMPONENTS["msf-block"].pos;
    var g = new THREE.Group();
    g.position.set(base.x, 0, base.z);

    var count = 4;
    var spacing = 6.4;
    var startX = -((count - 1) * spacing) / 2;

    for (var i = 0; i < count; i++) {
      var unitX = startX + i * spacing;
      var unit = new THREE.Mesh(
        new THREE.BoxGeometry(4.6, 4, 4.6),
        mat(COLOR_THERMAL, { metalness: 0.3, roughness: 0.5, emissive: COLOR_THERMAL, emissiveIntensity: 0.12 })
      );
      unit.position.set(unitX, 2, 0);
      g.add(unit);
      register("msf-block", unit);
      msfUnitPositions.push(new THREE.Vector3(base.x + unitX, 2, base.z));

      if (i % 2 === 0) {
        var ring = new THREE.Mesh(
          new THREE.TorusGeometry(1.3, 0.28, 8, 20),
          mat(0xffcfa0, { metalness: 0.4, emissive: COLOR_THERMAL, emissiveIntensity: 0.3 })
        );
        ring.rotation.x = Math.PI / 2;
        ring.position.set(unitX, 4.4, 0);
        g.add(ring);
        register("msf-block", ring, { visualOnly: true });
      }
    }

    // connecting header pipe along the row (visual only)
    var header = new THREE.Mesh(
      new THREE.CylinderGeometry(0.45, 0.45, count * spacing, 10),
      mat(0x2a3547, { metalness: 0.6 })
    );
    header.rotation.z = Math.PI / 2;
    header.position.set(0, 4.6, -2.6);
    g.add(header);
    register("msf-block", header, { visualOnly: true });

    scene.add(g);
  })();

  /* ---------- 4. ro-block: parallel row of membrane racks ---------- */
  var roUnitPositions = [];
  (function buildRO() {
    var base = COMPONENTS["ro-block"].pos;
    var g = new THREE.Group();
    g.position.set(base.x, 0, base.z);

    var count = 4;
    var spacing = 6.4;
    var startX = -((count - 1) * spacing) / 2;

    for (var i = 0; i < count; i++) {
      var unitX = startX + i * spacing;
      var cluster = new THREE.Group();
      cluster.position.set(unitX, 0, 0);

      var pedestal = new THREE.Mesh(
        new THREE.BoxGeometry(4.2, 0.6, 3.4),
        mat(0x1a2230, { metalness: 0.5 })
      );
      pedestal.position.y = 0.3;
      cluster.add(pedestal);
      register("ro-block", pedestal, { visualOnly: true });

      var rows = 2, cols = 2;
      for (var r = 0; r < rows; r++) {
        for (var c = 0; c < cols; c++) {
          var vessel = new THREE.Mesh(
            new THREE.CylinderGeometry(0.42, 0.42, 3.6, 12),
            mat(COLOR_ELECTRIC, { metalness: 0.55, roughness: 0.35, emissive: COLOR_ELECTRIC, emissiveIntensity: 0.18 })
          );
          vessel.rotation.z = Math.PI / 2;
          vessel.position.set(0, 1.1 + r * 1.1, -0.9 + c * 1.8);
          cluster.add(vessel);
          register("ro-block", vessel);
        }
      }

      g.add(cluster);
      roUnitPositions.push(new THREE.Vector3(base.x + unitX, 1.6, base.z));
    }

    var header = new THREE.Mesh(
      new THREE.CylinderGeometry(0.4, 0.4, count * spacing, 10),
      mat(0x2a3547, { metalness: 0.6 })
    );
    header.rotation.z = Math.PI / 2;
    header.position.set(0, 2.8, -2.2);
    g.add(header);
    register("ro-block", header, { visualOnly: true });

    scene.add(g);
  })();

  /* ---------- 5. product-water tank ---------- */
  (function buildProductTank() {
    var p = COMPONENTS["product-water"].pos;
    var g = new THREE.Group();
    g.position.set(p.x, 0, p.z);

    var tank = new THREE.Mesh(
      new THREE.CylinderGeometry(5, 5, 8, 24),
      mat(COLOR_WATER, { metalness: 0.35, roughness: 0.4, emissive: COLOR_WATER, emissiveIntensity: 0.1 })
    );
    tank.position.y = 4;
    g.add(tank);
    register("product-water", tank);

    var dome = new THREE.Mesh(
      new THREE.SphereGeometry(5, 24, 16, 0, Math.PI * 2, 0, Math.PI / 2),
      mat(0xbfe9f7, { metalness: 0.2, roughness: 0.3, emissive: COLOR_WATER, emissiveIntensity: 0.15 })
    );
    dome.position.y = 8;
    g.add(dome);
    register("product-water", dome, { visualOnly: true });

    var ring = new THREE.Mesh(
      new THREE.TorusGeometry(5, 0.2, 8, 30),
      mat(0x0e1520, { metalness: 0.6 })
    );
    ring.rotation.x = Math.PI / 2;
    ring.position.y = 1;
    g.add(ring);
    register("product-water", ring, { visualOnly: true });

    scene.add(g);
  })();

  /* ---------- 6. brine-discharge outlet ---------- */
  (function buildBrine() {
    var p = COMPONENTS["brine-discharge"].pos;
    var g = new THREE.Group();
    g.position.set(p.x, 0, p.z);

    var outlet = new THREE.Mesh(
      new THREE.CylinderGeometry(0.9, 0.9, 6, 12),
      mat(COLOR_RED, { metalness: 0.5, roughness: 0.4, emissive: COLOR_RED, emissiveIntensity: 0.25 })
    );
    outlet.rotation.z = Math.PI / 2;
    outlet.position.y = 1.5;
    g.add(outlet);
    register("brine-discharge", outlet);

    var nozzle = new THREE.Mesh(
      new THREE.ConeGeometry(1.2, 2, 12),
      mat(0x2a3547, { metalness: 0.6 })
    );
    nozzle.rotation.z = -Math.PI / 2;
    nozzle.position.set(3.6, 1.5, 0);
    g.add(nozzle);
    register("brine-discharge", nozzle, { visualOnly: true });

    scene.add(g);
  })();

  /* ---------- Flow connectors (tubes + animated particles) ---------- */
  var flows = [];
  var particleGeo = new THREE.SphereGeometry(0.34, 8, 8);

  function addFlow(fromV, toV, color, opts) {
    opts = opts || {};
    var lift = opts.lift != null ? opts.lift : 6;
    var count = opts.count || 6;
    var speed = opts.speed || 0.12;

    var mid1 = fromV.clone().lerp(toV, 0.33);
    mid1.y += lift;
    var mid2 = fromV.clone().lerp(toV, 0.66);
    mid2.y += lift;

    var curve = new THREE.CatmullRomCurve3([fromV.clone(), mid1, mid2, toV.clone()]);

    var tubeGeo = new THREE.TubeGeometry(curve, 40, 0.14, 6, false);
    var tubeMesh = new THREE.Mesh(tubeGeo, new THREE.MeshBasicMaterial({
      color: color, transparent: true, opacity: 0.18
    }));
    scene.add(tubeMesh);

    var pMat = new THREE.MeshBasicMaterial({ color: color });
    var particles = [];
    for (var i = 0; i < count; i++) {
      var mesh = new THREE.Mesh(particleGeo, pMat);
      var offset = i / count;
      mesh.position.copy(curve.getPoint(offset));
      scene.add(mesh);
      particles.push({ mesh: mesh, offset: offset });
    }

    flows.push({ curve: curve, particles: particles, speed: speed });
  }

  var EI = COMPONENTS["energy-input"].pos;
  var SW = COMPONENTS["seawater-intake"].pos;
  var PW = COMPONENTS["product-water"].pos;
  var BR = COMPONENTS["brine-discharge"].pos;

  // energy: thermal -> MSF units, electric -> RO units
  msfUnitPositions.forEach(function (v, i) {
    addFlow(EI, v.clone().setY(4.4), COLOR_THERMAL, { count: 4, speed: 0.16, lift: 8 - i });
  });
  roUnitPositions.forEach(function (v, i) {
    addFlow(EI, v.clone().setY(2.8), COLOR_ELECTRIC, { count: 4, speed: 0.16, lift: 8 - i });
  });

  // seawater -> both trains
  addFlow(SW, msfUnitPositions[0].clone(), COLOR_WATER, { count: 5, speed: 0.11, lift: 4 });
  addFlow(SW, roUnitPositions[0].clone(), COLOR_WATER, { count: 5, speed: 0.11, lift: 4 });

  // both trains -> product water (green)
  addFlow(msfUnitPositions[msfUnitPositions.length - 1].clone(), PW.clone(), COLOR_GREEN, { count: 5, speed: 0.13, lift: 7 });
  addFlow(roUnitPositions[roUnitPositions.length - 1].clone(), PW.clone(), COLOR_GREEN, { count: 5, speed: 0.13, lift: 7 });

  // both trains -> brine discharge (red)
  addFlow(msfUnitPositions[1].clone(), BR.clone(), COLOR_RED, { count: 4, speed: 0.1, lift: 5 });
  addFlow(roUnitPositions[1].clone(), BR.clone(), COLOR_RED, { count: 4, speed: 0.1, lift: 5 });

  /* ---------- UI wiring ---------- */
  function selectComponent(id) {
    if (!COMPONENTS[id]) return;
    highlight(id);

    if (listEl) {
      Array.prototype.forEach.call(listEl.querySelectorAll("button[data-id]"), function (btn) {
        btn.setAttribute("aria-pressed", String(btn.getAttribute("data-id") === id));
      });
    }
    if (detailTitle) detailTitle.textContent = COMPONENTS[id].name;
    if (detailDesc) detailDesc.textContent = COMPONENTS[id].desc;

    targetGoal.copy(COMPONENTS[id].pos);
    targetGoal.y = Math.max(targetGoal.y, 2);
  }

  if (listEl) {
    listEl.addEventListener("click", function (e) {
      var btn = e.target.closest ? e.target.closest("button[data-id]") : null;
      if (!btn) return;
      selectComponent(btn.getAttribute("data-id"));
    });
  }

  renderer.domElement.addEventListener("click", function (e) {
    var hit = pick(e.clientX, e.clientY);
    if (hit && hit.userData.componentId) selectComponent(hit.userData.componentId);
  });

  if (autorotateBtn) {
    autorotateBtn.addEventListener("click", function () {
      controls.autoRotate = !controls.autoRotate;
      autorotateBtn.setAttribute("aria-pressed", String(controls.autoRotate));
    });
  }

  var flowRunning = true;
  if (flowBtn) {
    flowBtn.addEventListener("click", function () {
      flowRunning = !flowRunning;
      flowBtn.setAttribute("aria-pressed", String(flowRunning));
      flowBtn.textContent = flowRunning ? "⏸ إيقاف التدفق" : "▶ تشغيل التدفق";
    });
  }

  if (resetBtn) {
    resetBtn.addEventListener("click", function () {
      camera.position.copy(DEFAULT_CAM_POS);
      controls.target.copy(DEFAULT_TARGET);
      targetGoal.copy(DEFAULT_TARGET);
      controls.update();
      highlight(null);
      if (listEl) {
        Array.prototype.forEach.call(listEl.querySelectorAll("button[data-id]"), function (btn) {
          btn.setAttribute("aria-pressed", "false");
        });
      }
      if (detailTitle) detailTitle.textContent = "اختر مكوّناً";
      if (detailDesc) detailDesc.textContent = "انقر على أي مكوّن في النموذج أو من القائمة أعلاه لعرض وصفه هنا.";
    });
  }

  /* ---------- Resize handling ---------- */
  function resize() {
    var w = stage.clientWidth || 1;
    var h = stage.clientHeight || 1;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h, false);
  }
  window.addEventListener("resize", resize);
  if (typeof ResizeObserver !== "undefined") {
    new ResizeObserver(resize).observe(stage);
  }
  resize();

  /* ---------- Animation loop ---------- */
  var clock = new THREE.Clock();
  var targetGoal = DEFAULT_TARGET.clone();

  function animate() {
    requestAnimationFrame(animate);
    var elapsed = clock.getElapsedTime();

    if (flowRunning) {
      flows.forEach(function (flow) {
        flow.particles.forEach(function (p) {
          var t = (p.offset + elapsed * flow.speed) % 1;
          if (t < 0) t += 1;
          flow.curve.getPoint(t, p.mesh.position);
        });
      });
    }

    controls.target.lerp(targetGoal, 0.06);
    controls.update();
    renderer.render(scene, camera);
  }

  if (loadingEl) loadingEl.style.display = "none";
  animate();
})();
