(function () {
  "use strict";

  /* =========================================================
     INTERACTIVE CARBON CALCULATOR — "impact" section
     CO2 Avoided = Baseline Emissions − Nuclear Scenario Emissions
     Carbon Reduction % = (CO2 Avoided / Baseline) × 100
     ========================================================= */
  var waterInput = document.getElementById("cc-water");
  if (!waterInput) return; // calculator markup not present on this page load

  var energyInput = document.getElementById("cc-energy");
  var gridInput = document.getElementById("cc-grid");
  var nuclearInput = document.getElementById("cc-nuclear");

  var gridVal = document.getElementById("cc-grid-val");
  var nuclearVal = document.getElementById("cc-nuclear-val");

  var avoidedOut = document.getElementById("cc-avoided");
  var reductionOut = document.getElementById("cc-reduction");

  var barBaseline = document.getElementById("cc-bar-baseline");
  var barNuclear = document.getElementById("cc-bar-nuclear");
  var barBaselineVal = document.getElementById("cc-bar-baseline-val");
  var barNuclearVal = document.getElementById("cc-bar-nuclear-val");

  var badges = {
    water: document.getElementById("cc-badge-water"),
    energy: document.getElementById("cc-badge-energy"),
    grid: document.getElementById("cc-badge-grid"),
    nuclear: document.getElementById("cc-badge-nuclear")
  };

  var badgeDefaults = {
    water: { text: "✓ Official", cls: "cc-badge-official" },
    energy: { text: "🧮 Calculated", cls: "cc-badge-calculated" },
    grid: { text: "✓ IPCC AR5", cls: "cc-badge-ipcc" },
    nuclear: { text: "✓ IPCC AR5", cls: "cc-badge-ipcc" }
  };

  function updateBadge(key, input) {
    var badge = badges[key];
    var def = badgeDefaults[key];
    if (!badge || !def) return;

    var defaultVal = parseFloat(input.getAttribute("data-default"));
    var currentVal = parseFloat(input.value);
    var isDefault = !isNaN(currentVal) && !isNaN(defaultVal) && Math.abs(currentVal - defaultVal) < 1e-9;

    badge.classList.remove(def.cls, "cc-badge-edited");
    if (isDefault) {
      badge.textContent = def.text;
      badge.classList.add(def.cls);
    } else {
      badge.textContent = "✏️ معدَّل";
      badge.classList.add("cc-badge-edited");
    }
  }

  function fmt(num, digits) {
    if (isNaN(num)) num = 0;
    return num.toLocaleString("en-US", { minimumFractionDigits: digits, maximumFractionDigits: digits });
  }

  function calculate() {
    var waterProduction = parseFloat(waterInput.value) || 0;
    var specificEnergy = parseFloat(energyInput.value) || 0;
    var gridIntensity = parseFloat(gridInput.value) || 0;
    var nuclearIntensity = parseFloat(nuclearInput.value) || 0;

    var annualEnergyMWh = waterProduction * 365 * specificEnergy / 1000;
    var annualEnergyKWh = annualEnergyMWh * 1000;
    var baselineTons = annualEnergyKWh * gridIntensity / 1000000;
    var nuclearTons = annualEnergyKWh * nuclearIntensity / 1000000;
    var avoidedTons = baselineTons - nuclearTons;
    var reductionPct = baselineTons > 0 ? (avoidedTons / baselineTons) * 100 : 0;

    if (avoidedOut) avoidedOut.textContent = fmt(avoidedTons / 1000000, 2);
    if (reductionOut) reductionOut.textContent = fmt(reductionPct, 1) + "%";

    var maxTons = Math.max(baselineTons, nuclearTons, 1);
    if (barBaseline) barBaseline.style.width = Math.max(0, Math.min(100, (baselineTons / maxTons) * 100)) + "%";
    if (barNuclear) barNuclear.style.width = Math.max(0, Math.min(100, (nuclearTons / maxTons) * 100)) + "%";
    if (barBaselineVal) barBaselineVal.textContent = fmt(baselineTons / 1000000, 2) + "M طن";
    if (barNuclearVal) barNuclearVal.textContent = fmt(nuclearTons / 1000000, 2) + "M طن";

    if (gridVal) gridVal.textContent = fmt(gridIntensity, 0) + " g/kWh";
    if (nuclearVal) nuclearVal.textContent = fmt(nuclearIntensity, 0) + " g/kWh";

    updateBadge("water", waterInput);
    updateBadge("energy", energyInput);
    updateBadge("grid", gridInput);
    updateBadge("nuclear", nuclearInput);
  }

  [waterInput, energyInput, gridInput, nuclearInput].forEach(function (el) {
    el.addEventListener("input", calculate);
  });

  calculate();

  /* ---- Dismissable honesty note ---- */
  var honestyNote = document.getElementById("cc-honesty-note");
  var dismissBtn = document.getElementById("cc-honesty-dismiss");
  if (dismissBtn && honestyNote) {
    dismissBtn.addEventListener("click", function () {
      honestyNote.classList.add("is-dismissed");
    });
  }
})();
