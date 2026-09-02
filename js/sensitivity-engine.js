/* =========================================================
   SENSITIVITY ENGINE
   Reproduces the project's verified LCOW model exactly.
   Baseline (unmodified BASE, 10 units, normal scenario) = $5.672/m3.
   Exposed on window.SensitivityEngine for use by dashboard.js.
   ========================================================= */
(function (global) {
  "use strict";

  /* ---- Baseline model constants (do not alter formula logic) ---- */
  var BASE = {
    smrElec: 100.0, smrEff: 0.303, productionTotal: 1036000, msfShare: 0.702, roShare: 0.298,
    roKwh: 4.0, msfAuxKwh: 3.0, gor: 10.0, steamEnthalpy: 0.627, smrCf: 0.92,
    capexPerUnit: 1000, smrLcoe: 75, discountRate: 0.07, projectLife: 60
  };

  var SCENARIOS = {
    normal:     [1.00, 1.00],
    high_water: [1.20, 1.05],
    high_elec:  [1.00, 1.20],
    peak:       [1.30, 1.30]
  };

  function scenarioLoad(p, wm, em) {
    var production = p.productionTotal * wm;
    var msfProd = production * p.msfShare;
    var steamPerM3 = 1000 / p.gor;
    var thermalMw = (msfProd * steamPerM3 * p.steamEnthalpy) / 24 / 1000;
    var roProd = production * p.roShare;
    var electricMw = (roProd * p.roKwh + msfProd * p.msfAuxKwh) * em / 24 / 1000;
    return { production: production, totalEq: thermalMw + electricMw / p.smrEff };
  }

  function calcLCOWFull(overrides, unitsOverride) {
    var p = Object.assign({}, BASE, overrides || {});
    var capPerUnit = p.smrElec / p.smrEff;

    var peakLoad = 0;
    Object.keys(SCENARIOS).forEach(function (key) {
      var wm = SCENARIOS[key][0], em = SCENARIOS[key][1];
      var load = scenarioLoad(p, wm, em).totalEq;
      if (load > peakLoad) peakLoad = load;
    });

    var unitsNeeded = unitsOverride || Math.ceil(peakLoad / capPerUnit);
    var crf = (p.discountRate * Math.pow(1 + p.discountRate, p.projectLife)) /
      (Math.pow(1 + p.discountRate, p.projectLife) - 1);
    var annualCapex = unitsNeeded * p.capexPerUnit * crf;

    var normal = scenarioLoad(p, 1.0, 1.0);
    var annualOpex = (normal.totalEq * 8760 * p.smrCf) * p.smrLcoe / 1000000;

    var lcow = ((annualCapex + annualOpex) * 1000000) / (normal.production * 365);

    return { lcow: lcow, unitsNeeded: unitsNeeded, peakLoad: peakLoad, normal: normal, capPerUnit: capPerUnit };
  }

  /* ---- Blended specific energy (kWh-eq/m3), verified figure ----
     Same formula already used elsewhere on this site (integration.html's
     carbon calculator, cc-energy field): the thermal-equivalent energy per
     m3 of blended product, weighted by technology share:
       msfShare * (1000/gor * steamEnthalpy)   [thermal kWh-eq per m3 of MSF water]
     + roShare  * (roKwh / smrEff)             [electric kWh converted to
                                                 thermal-equivalent per m3 of RO water]
     At BASE values this equals 47.95 kWh-eq/m3 (0.702*62.7 + 0.298*13.20). */
  function blendedSpecificEnergy(overrides) {
    var p = Object.assign({}, BASE, overrides || {});
    var msfKwhEq = (1000 / p.gor) * p.steamEnthalpy;
    var roKwhEq = p.roKwh / p.smrEff;
    return p.msfShare * msfKwhEq + p.roShare * roKwhEq;
  }

  /* ---- Actual electrical load (MWe) at the normal scenario ----
     This is the electricMw component alone (RO pumping + MSF auxiliary
     electric load), NOT divided by reactor efficiency — i.e. the real
     electric demand in MWe, as opposed to totalEq's thermal-equivalent
     MW used for reactor fleet sizing. At BASE values this equals ~142.4 MWe. */
  function normalElectricLoadMWe(overrides) {
    var p = Object.assign({}, BASE, overrides || {});
    var production = p.productionTotal;
    var msfProd = production * p.msfShare;
    var roProd = production * p.roShare;
    return (roProd * p.roKwh + msfProd * p.msfAuxKwh) / 24 / 1000;
  }

  /* ---- Illustrative CO2-avoided-per-m3 constant ----
     Not a measured figure. Derived as an order-of-magnitude estimate from the
     baseline scenario's annual CO2 avoided vs. natural gas (~8.27 million
     tons/year) spread over baseline annual production, then rounded for use
     as a simple, fixed illustrative multiplier in the carbon-price sensitivity
     test below. Do not present this as an official emissions factor. */
  var CO2_PER_M3 = 0.0195; // tons CO2 avoided per m3 (illustrative)

  /* ---- Scenario table used by the "Decision Maker" ranking list ---- */
  function scenarioRanking() {
    var rows = [];
    Object.keys(SCENARIOS).forEach(function (key) {
      var wm = SCENARIOS[key][0], em = SCENARIOS[key][1];
      var overrides = {};
      // Reconstruct each named scenario's LCOW using the same peak-load fleet
      // sizing (10 units, driven by the true worst-case "peak" scenario) — this
      // mirrors calcLCOWFull's own internal unit-sizing logic exactly, just
      // evaluated at each scenario's own demand multipliers for annualOpex/production.
      var full = calcLCOWFull(overrides);
      var p = Object.assign({}, BASE, overrides);
      var load = scenarioLoad(p, wm, em);
      var crf = (p.discountRate * Math.pow(1 + p.discountRate, p.projectLife)) /
        (Math.pow(1 + p.discountRate, p.projectLife) - 1);
      var annualCapex = full.unitsNeeded * p.capexPerUnit * crf;
      var annualOpex = (load.totalEq * 8760 * p.smrCf) * p.smrLcoe / 1000000;
      var lcow = ((annualCapex + annualOpex) * 1000000) / (load.production * 365);
      rows.push({ key: key, lcow: lcow });
    });
    rows.sort(function (a, b) { return a.lcow - b.lcow; });
    return rows;
  }

  /* ---- Tornado sensitivity: 8 variables, +/-15% (or as specified) ---- */
  function computeTornado() {
    var baseLcow = calcLCOWFull({}).lcow;

    var defs = [
      {
        key: "smrElec", label: "قدرة المفاعل (Reactor Capacity)",
        run: function () {
          return [calcLCOWFull({ smrElec: 85 }).lcow, calcLCOWFull({ smrElec: 115 }).lcow];
        }
      },
      {
        key: "productionTotal", label: "الطلب المائي (Water Demand)",
        run: function () {
          return [
            calcLCOWFull({ productionTotal: BASE.productionTotal * 0.85 }).lcow,
            calcLCOWFull({ productionTotal: BASE.productionTotal * 1.15 }).lcow
          ];
        }
      },
      {
        key: "roKwh", label: "استهلاك طاقة RO (RO Energy Use)",
        run: function () {
          return [calcLCOWFull({ roKwh: 3.4 }).lcow, calcLCOWFull({ roKwh: 4.6 }).lcow];
        }
      },
      {
        key: "steamEnthalpy", label: "استهلاك حرارة MSF (MSF Thermal Use)",
        run: function () {
          return [calcLCOWFull({ steamEnthalpy: 0.533 }).lcow, calcLCOWFull({ steamEnthalpy: 0.721 }).lcow];
        }
      },
      {
        key: "smrLcoe", label: "سعر الكهرباء (Electricity Price)",
        run: function () {
          return [calcLCOWFull({ smrLcoe: 63.75 }).lcow, calcLCOWFull({ smrLcoe: 86.25 }).lcow];
        }
      },
      {
        key: "smrCf", label: "معامل الاستغلال (Capacity Factor)",
        run: function () {
          return [calcLCOWFull({ smrCf: 0.782 }).lcow, calcLCOWFull({ smrCf: 1.0 }).lcow];
        }
      },
      {
        key: "unitsNeeded", label: "عدد المفاعلات (Number of Reactors)",
        run: function () {
          return [calcLCOWFull({}, 9).lcow, calcLCOWFull({}, 12).lcow];
        }
      },
      {
        key: "carbonPrice", label: "سعر الكربون (Carbon Price) — توضيحي غير رسمي",
        illustrative: true,
        run: function () {
          return [
            baseLcow - 50 * CO2_PER_M3,
            baseLcow - 10 * CO2_PER_M3
          ];
        }
      }
    ];

    var results = defs.map(function (d) {
      var pair = d.run();
      var lo = Math.min(pair[0], pair[1]);
      var hi = Math.max(pair[0], pair[1]);
      return {
        key: d.key,
        label: d.label,
        illustrative: !!d.illustrative,
        lcowLow: lo,
        lcowHigh: hi,
        diff: hi - lo
      };
    });

    results.sort(function (a, b) { return b.diff - a.diff; });
    return { baseLcow: baseLcow, rows: results };
  }

  /* ---- Box-Muller normal sampler (as specified) ---- */
  function sampleNormal(mean, sigma) {
    var u1 = 0, u2 = 0;
    while (u1 === 0) u1 = Math.random();
    while (u2 === 0) u2 = Math.random();
    var z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
    return mean + z * sigma;
  }

  /* Linear-interpolated percentile over a pre-sorted array. */
  function percentile(sortedArr, p) {
    var n = sortedArr.length;
    if (n === 0) return NaN;
    if (n === 1) return sortedArr[0];
    var idx = (p / 100) * (n - 1);
    var lo = Math.floor(idx), hi = Math.ceil(idx);
    if (lo === hi) return sortedArr[lo];
    var frac = idx - lo;
    return sortedArr[lo] + (sortedArr[hi] - sortedArr[lo]) * frac;
  }

  /* ---- Monte Carlo uncertainty simulation ----
     1-sigma = 10% of each variable's base value. This 10% figure is an
     engineering assumption made for this dashboard, not a measured
     statistic on any of these parameters. */
  var MC_SIGMA_FRACTION = 0.10;
  var GAS_EMISSION_FACTOR_BASE = 56.1; // secondary display only, not used in LCOW

  function runMonteCarlo(n) {
    n = n || 1000;
    var lcowSamples = [];
    var gasSamples = [];

    for (var i = 0; i < n; i++) {
      var roKwh = sampleNormal(BASE.roKwh, BASE.roKwh * MC_SIGMA_FRACTION);
      var productionTotal = sampleNormal(BASE.productionTotal, BASE.productionTotal * MC_SIGMA_FRACTION);
      var smrCf = sampleNormal(BASE.smrCf, BASE.smrCf * MC_SIGMA_FRACTION);
      smrCf = Math.min(1.0, Math.max(0.3, smrCf));
      var smrLcoe = sampleNormal(BASE.smrLcoe, BASE.smrLcoe * MC_SIGMA_FRACTION);
      var gasEmissionFactor = sampleNormal(GAS_EMISSION_FACTOR_BASE, GAS_EMISSION_FACTOR_BASE * MC_SIGMA_FRACTION);

      var result = calcLCOWFull({
        roKwh: roKwh,
        productionTotal: productionTotal,
        smrCf: smrCf,
        smrLcoe: smrLcoe
      });

      lcowSamples.push(result.lcow);
      gasSamples.push(gasEmissionFactor);
    }

    lcowSamples.sort(function (a, b) { return a - b; });

    var gasMean = gasSamples.reduce(function (s, v) { return s + v; }, 0) / gasSamples.length;

    return {
      n: n,
      samples: lcowSamples,
      p10: percentile(lcowSamples, 10),
      p50: percentile(lcowSamples, 50),
      p90: percentile(lcowSamples, 90),
      gasEmissionMean: gasMean
    };
  }

  global.SensitivityEngine = {
    BASE: BASE,
    SCENARIOS: SCENARIOS,
    CO2_PER_M3: CO2_PER_M3,
    MC_SIGMA_FRACTION: MC_SIGMA_FRACTION,
    GAS_EMISSION_FACTOR_BASE: GAS_EMISSION_FACTOR_BASE,
    scenarioLoad: scenarioLoad,
    calcLCOWFull: calcLCOWFull,
    blendedSpecificEnergy: blendedSpecificEnergy,
    normalElectricLoadMWe: normalElectricLoadMWe,
    scenarioRanking: scenarioRanking,
    computeTornado: computeTornado,
    sampleNormal: sampleNormal,
    percentile: percentile,
    runMonteCarlo: runMonteCarlo
  };
})(window);
