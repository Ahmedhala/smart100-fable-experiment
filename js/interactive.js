(function () {
  "use strict";

  /* =====================================================
     Shared interactivity for plant.html, msf.html, ro.html,
     tech-comparison.html. Every selector is guarded so this
     file is safe to include on any page — sections that
     don't exist simply produce empty NodeLists and no-op.
     ===================================================== */

  /* ---- State toggle (plant.html: current vs proposed) ---- */
  document.querySelectorAll(".state-toggle").forEach(function (toggle) {
    var buttons = toggle.querySelectorAll("button[data-state]");
    var panelsWrap = toggle.parentElement.querySelector(".state-panels");
    if (!panelsWrap) return;
    var panels = panelsWrap.querySelectorAll(".state-panel");

    buttons.forEach(function (btn) {
      btn.addEventListener("click", function () {
        var state = btn.getAttribute("data-state");

        buttons.forEach(function (b) {
          b.setAttribute("aria-pressed", String(b === btn));
        });
        panels.forEach(function (p) {
          p.classList.toggle("active", p.getAttribute("data-state") === state);
        });
      });
    });
  });

  /* ---- Osmosis toggle (ro.html: natural vs reverse) ---- */
  document.querySelectorAll(".osmosis-toggle").forEach(function (toggle) {
    var buttons = toggle.querySelectorAll("button[data-mode]");
    var diagram = toggle.parentElement.querySelector(".osmosis-diagram");
    if (!diagram) return;
    var caption = diagram.querySelector("#osmosis-caption");
    var sideA = diagram.querySelector("#osmosis-side-a");
    var sideB = diagram.querySelector("#osmosis-side-b");

    var captions = {
      natural: "في الحالة الطبيعية، تتحرك جزيئات الماء تلقائياً عبر الغشاء من الجانب الأقل ملوحة إلى الجانب الأكثر ملوحة، سعياً لموازنة التركيز — دون أي تدخل بالضغط، ودون إنتاج ماء عذب مفيد.",
        reverse: "مع تطبيق ضغط عالٍ من مضخة RO يفوق الضغط الأسموزي، ينعكس اتجاه حركة الماء: يعبر الماء العذب الغشاء من الجانب المالح نحو الجانب المنتج، بينما تُحجز الأملاح خلف الغشاء وتُصرَّف كمياه تركيز (Brine)."
    };
    var sideAText = {
      natural: "مياه عذبة",
      reverse: "مياه بحر مالحة<br><small>+ ضغط عالٍ من مضخة RO</small>"
    };
    var sideBText = {
      natural: "مياه بحر مالحة",
      reverse: "ماء عذب (منتج)"
    };

    buttons.forEach(function (btn) {
      btn.addEventListener("click", function () {
        var mode = btn.getAttribute("data-mode");

        buttons.forEach(function (b) {
          b.setAttribute("aria-pressed", String(b === btn));
        });
        diagram.setAttribute("data-mode", mode);
        if (caption) caption.textContent = captions[mode];
        if (sideA && sideAText[mode]) sideA.innerHTML = sideAText[mode];
        if (sideB && sideBText[mode]) sideB.innerHTML = sideBText[mode];
      });
    });
  });

  /* ---- Stepper / tabs (msf.html: flash stages) ---- */
  document.querySelectorAll(".stepper").forEach(function (stepper) {
    var tabs = Array.prototype.slice.call(stepper.querySelectorAll('[role="tab"]'));
    var panels = stepper.querySelectorAll('[role="tabpanel"]');
    if (!tabs.length) return;

    function activate(tab) {
      var step = tab.getAttribute("data-step");

      tabs.forEach(function (t) {
        var selected = t === tab;
        t.setAttribute("aria-selected", String(selected));
        t.setAttribute("tabindex", selected ? "0" : "-1");
        t.classList.toggle("is-active", selected);
      });
      panels.forEach(function (p) {
        var match = p.getAttribute("data-step") === step;
        p.toggleAttribute("hidden", !match);
        p.classList.toggle("active", match);
      });
    }

    tabs.forEach(function (tab, i) {
      tab.addEventListener("click", function () { activate(tab); });
      tab.addEventListener("keydown", function (e) {
        var next = null;
        if (e.key === "ArrowRight") next = tabs[(i + 1) % tabs.length];
        if (e.key === "ArrowLeft") next = tabs[(i - 1 + tabs.length) % tabs.length];
        if (e.key === "Home") next = tabs[0];
        if (e.key === "End") next = tabs[tabs.length - 1];
        if (next) {
          e.preventDefault();
          next.focus();
          activate(next);
        }
      });
    });
  });

  /* ---- Expandable rows (tech-comparison.html: comparison table) ---- */
  document.querySelectorAll(".row-toggle").forEach(function (btn) {
    var targetId = btn.getAttribute("aria-controls");
    var target = targetId ? document.getElementById(targetId) : null;
    if (!target) return;

    btn.addEventListener("click", function () {
      var expanded = btn.getAttribute("aria-expanded") === "true";
      btn.setAttribute("aria-expanded", String(!expanded));
      target.toggleAttribute("hidden", expanded);
    });
  });
})();
