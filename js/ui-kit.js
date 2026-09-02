/* =========================================================
   SMART100 × رأس الخير (Fable build) — UI Kit
   Shared vanilla-JS behavior helpers for css/components.css.
   ========================================================= */
(function (global) {
  "use strict";

  var Gauge = {
    render: function (el, opts) {
      if (!el) return;
      opts = opts || {};
      var value = typeof opts.value === "number" ? opts.value : 0;
      var max = typeof opts.max === "number" ? opts.max : 100;
      var label = opts.label || "";
      var frac = max > 0 ? Math.max(0, Math.min(1, value / max)) : 0;

      var size = 140, stroke = 10, r = (size - stroke) / 2, c = size / 2;
      var circumference = 2 * Math.PI * r;
      var offset = circumference * (1 - frac);

      el.innerHTML =
        '<svg viewBox="0 0 ' + size + ' ' + size + '" width="100%" height="100%">' +
          '<circle class="gauge__track" cx="' + c + '" cy="' + c + '" r="' + r + '"></circle>' +
          '<circle class="gauge__fill" cx="' + c + '" cy="' + c + '" r="' + r + '" ' +
            'stroke-dasharray="' + circumference + '" stroke-dashoffset="' + circumference + '" ' +
            'transform="rotate(-90 ' + c + ' ' + c + ')"></circle>' +
          '<text class="gauge__value" x="50%" y="46%" text-anchor="middle" dominant-baseline="middle">' + Math.round(value) + '</text>' +
          '<text class="gauge__label" x="50%" y="64%" text-anchor="middle" dominant-baseline="middle">' + label + '</text>' +
        '</svg>';

      var fillEl = el.querySelector(".gauge__fill");
      requestAnimationFrame(function () {
        requestAnimationFrame(function () {
          if (fillEl) fillEl.setAttribute("stroke-dashoffset", String(offset));
        });
      });
    }
  };

  function initInfoTips(root) {
    root = root || document;
    var tips = root.querySelectorAll(".info-tip[data-tip]");
    tips.forEach(function (tip) {
      if (tip.__infoTipInit) return;
      tip.__infoTipInit = true;

      var pop = document.createElement("div");
      pop.className = "info-tip__popover";
      pop.setAttribute("role", "tooltip");
      pop.textContent = tip.getAttribute("data-tip");
      pop.hidden = true;
      document.body.appendChild(pop);

      function position() {
        var rect = tip.getBoundingClientRect();
        pop.style.top = (window.scrollY + rect.bottom + 6) + "px";
        pop.style.left = (window.scrollX + rect.left) + "px";
      }
      function open() { position(); pop.hidden = false; }
      function close() { pop.hidden = true; }

      tip.addEventListener("mouseenter", open);
      tip.addEventListener("mouseleave", close);
      tip.addEventListener("focus", open);
      tip.addEventListener("blur", close);
      tip.addEventListener("click", function (e) {
        e.stopPropagation();
        if (pop.hidden) open(); else close();
      });
      document.addEventListener("click", close);
      document.addEventListener("keydown", function (e) { if (e.key === "Escape") close(); });
      window.addEventListener("scroll", function () { if (!pop.hidden) position(); }, true);
      window.addEventListener("resize", function () { if (!pop.hidden) position(); });
    });
  }

  var MODE_KEY = "smr:mode";
  var DEFAULT_MODE = "simple";

  function getMode() {
    try { return localStorage.getItem(MODE_KEY) || DEFAULT_MODE; } catch (e) { return DEFAULT_MODE; }
  }
  function setMode(mode) {
    if (mode !== "simple" && mode !== "technical") return;
    document.documentElement.setAttribute("data-mode", mode);
    try { localStorage.setItem(MODE_KEY, mode); } catch (e) { /* storage unavailable */ }
    document.querySelectorAll(".mode-toggle__btn").forEach(function (btn) {
      btn.setAttribute("aria-pressed", btn.getAttribute("data-mode-value") === mode ? "true" : "false");
    });
    document.dispatchEvent(new CustomEvent("smr:modechange", { detail: { mode: mode } }));
  }
  function initModeToggle(root) {
    root = root || document;
    document.documentElement.setAttribute("data-mode", getMode());
    var toggles = root.querySelectorAll(".mode-toggle");
    toggles.forEach(function (toggle) {
      if (toggle.__modeToggleInit) return;
      toggle.__modeToggleInit = true;
      toggle.querySelectorAll(".mode-toggle__btn").forEach(function (btn) {
        btn.addEventListener("click", function () { setMode(btn.getAttribute("data-mode-value")); });
      });
    });
    setMode(getMode());
  }

  function initExplainToggles(root) {
    root = root || document;
    var btns = root.querySelectorAll(".explain-btn[data-explain-target]");
    btns.forEach(function (btn) {
      if (btn.__explainInit) return;
      btn.__explainInit = true;
      var target = document.querySelector(btn.getAttribute("data-explain-target"));
      if (!target) return;
      btn.addEventListener("click", function () {
        var willShow = target.hidden;
        target.hidden = !willShow;
        btn.setAttribute("aria-expanded", String(willShow));
      });
    });
  }

  document.addEventListener("DOMContentLoaded", function () {
    initModeToggle();
    initInfoTips();
    initExplainToggles();
  });

  global.SMR_UI = {
    Gauge: Gauge,
    initInfoTips: initInfoTips,
    initModeToggle: initModeToggle,
    setMode: setMode,
    getMode: getMode,
    initExplainToggles: initExplainToggles
  };
})(window);
