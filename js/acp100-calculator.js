(function () {
  "use strict";

  /* =========================================================
     ACP100 water-production calculator
     Formula and constants exactly as specified for this page —
     a theoretical maximum-output model, not a real plant design.
     ========================================================= */
  var ACP100_MWTH = 385;
  var ACP100_MWE = 125;
  var ACP100_EFF = ACP100_MWE / ACP100_MWTH; // ~0.3247

  function calcAcp100Water(units, msfShare, capacityFactor, specificTh, specificEl) {
    specificTh = typeof specificTh === "number" ? specificTh : 62.7;
    specificEl = typeof specificEl === "number" ? specificEl : 4.0;

    var totalThermalCapacity = units * ACP100_MWTH * capacityFactor;
    var k1 = (msfShare * specificTh) / 24000;
    var k2 = ((1 - msfShare) * specificEl) / 24000;
    var denom = k1 + k2 / ACP100_EFF;
    var dailyProduction = denom > 0 ? totalThermalCapacity / denom : 0; // m3/day
    return dailyProduction;
  }

  var TECH_MSF_SHARE = { msf: 1, ro: 0, hybrid: 0.702 };

  var unitsInput = document.getElementById("acp-units");
  var techSelect = document.getElementById("acp-tech");
  var cfRange = document.getElementById("acp-cf");
  var cfValueEl = document.getElementById("acp-cf-value");
  var resultNumEl = document.getElementById("acp-result-num");

  function formatNumber(n) {
    var rounded = Math.max(0, Math.round(n));
    return rounded.toLocaleString("en-US");
  }

  function updateCalculator() {
    if (!unitsInput || !techSelect || !cfRange || !resultNumEl) return;

    var units = parseInt(unitsInput.value, 10);
    if (!units || units < 1) units = 1;
    if (units > 50) units = 50;

    var msfShare = TECH_MSF_SHARE[techSelect.value];
    if (typeof msfShare !== "number") msfShare = TECH_MSF_SHARE.hybrid;

    var cfPercent = parseInt(cfRange.value, 10);
    if (isNaN(cfPercent)) cfPercent = 92;
    cfPercent = Math.min(100, Math.max(1, cfPercent));
    var capacityFactor = cfPercent / 100;

    if (cfValueEl) cfValueEl.textContent = cfPercent + "%";

    var dailyProduction = calcAcp100Water(units, msfShare, capacityFactor);
    resultNumEl.textContent = formatNumber(dailyProduction);
  }

  [unitsInput, techSelect, cfRange].forEach(function (el) {
    if (el) {
      el.addEventListener("input", updateCalculator);
      el.addEventListener("change", updateCalculator);
    }
  });

  updateCalculator();

  /* =========================================================
     Development timeline — accordion-style, keyboard accessible
     (native <button> elements; same expand/collapse technique
     used by the safety FAQ accordion on reactor.html)
     ========================================================= */
  var triggers = document.querySelectorAll(".acp-timeline-trigger");

  function setPanelHeight(panel, expanded) {
    if (!panel) return;
    panel.style.maxHeight = expanded ? panel.scrollHeight + "px" : "0px";
  }

  triggers.forEach(function (trigger) {
    var panelId = trigger.getAttribute("aria-controls");
    var panel = document.getElementById(panelId);
    if (!panel) return;

    var expanded = trigger.getAttribute("aria-expanded") === "true";
    setPanelHeight(panel, expanded);

    trigger.addEventListener("click", function () {
      var isExpanded = trigger.getAttribute("aria-expanded") === "true";
      trigger.setAttribute("aria-expanded", String(!isExpanded));
      setPanelHeight(panel, !isExpanded);
    });
  });

  window.addEventListener("resize", function () {
    triggers.forEach(function (trigger) {
      var panelId = trigger.getAttribute("aria-controls");
      var panel = document.getElementById(panelId);
      if (!panel) return;
      if (trigger.getAttribute("aria-expanded") === "true") {
        panel.style.maxHeight = panel.scrollHeight + "px";
      }
    });
  });
})();
