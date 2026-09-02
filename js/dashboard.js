(function () {
  "use strict";

  var Engine = window.SensitivityEngine;
  if (!Engine) return;

  /* =========================================================
     Formatting helpers
     ========================================================= */
  function fmtMoney(v) { return "$" + v.toFixed(3); }
  function fmtInt(v) { return Math.round(v).toLocaleString("en-US"); }
  function fmtNum(v, d) { return v.toFixed(d == null ? 2 : d); }

  /* =========================================================
     1) Mode tabs (Engineering / Decision Maker / Research)
     ========================================================= */
  (function initModeTabs() {
    var tablist = document.getElementById("mode-tablist");
    if (!tablist) return;
    var tabs = Array.prototype.slice.call(tablist.querySelectorAll('[role="tab"]'));

    function activate(tab) {
      tabs.forEach(function (t) {
        var isActive = t === tab;
        t.setAttribute("aria-selected", String(isActive));
        t.tabIndex = isActive ? 0 : -1;
        t.classList.toggle("is-active", isActive);
        var panel = document.getElementById(t.getAttribute("aria-controls"));
        if (panel) {
          if (isActive) panel.removeAttribute("hidden");
          else panel.setAttribute("hidden", "");
        }
      });
      tab.focus();
    }

    tabs.forEach(function (tab, i) {
      tab.addEventListener("click", function () { activate(tab); });
      tab.addEventListener("keydown", function (e) {
        var idx = i;
        if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
          e.preventDefault();
          var dir = e.key === "ArrowLeft" ? 1 : -1; // RTL: left = next
          var next = (idx + dir + tabs.length) % tabs.length;
          activate(tabs[next]);
        } else if (e.key === "Home") {
          e.preventDefault();
          activate(tabs[0]);
        } else if (e.key === "End") {
          e.preventDefault();
          activate(tabs[tabs.length - 1]);
        }
      });
    });
  })();

  /* =========================================================
     2) Decision Maker mode: computed LCOW average + ranking list
     ========================================================= */
  (function renderDecisionMaker() {
    var ranking = Engine.scenarioRanking();

    var avg = ranking.reduce(function (s, r) { return s + r.lcow; }, 0) / ranking.length;
    var lcowNum = document.getElementById("dm-lcow-num");
    if (lcowNum) lcowNum.textContent = fmtMoney(avg);

    var labels = {
      normal: "السيناريو العادي",
      high_water: "ارتفاع الطلب المائي",
      high_elec: "ارتفاع الطلب الكهربائي",
      peak: "سيناريو الذروة"
    };

    var list = document.getElementById("scenario-ranking-list");
    if (list) {
      list.innerHTML = "";
      ranking.forEach(function (row) {
        var li = document.createElement("li");
        li.className = "dash-rank-item";
        li.innerHTML =
          '<span class="dash-rank-name">' + labels[row.key] + '</span>' +
          '<span class="dash-rank-value ff-mono">' + fmtMoney(row.lcow) + '</span>';
        list.appendChild(li);
      });
    }
  })();

  /* =========================================================
     3) Run Scenario builder
     ========================================================= */
  (function initScenarioBuilder() {
    var select = document.getElementById("tech-select");
    var btn = document.getElementById("run-scenario-btn");
    var out = document.getElementById("scenario-results");
    if (!select || !btn || !out) return;

    var techLabels = {
      ro: "RO بالكامل",
      msf: "MSF بالكامل",
      hybrid: "هجين (70.2% MSF / 29.8% RO)"
    };

    function msfShareFor(tech) {
      if (tech === "ro") return 0;
      if (tech === "msf") return 1;
      return 0.702; // hybrid — current real mix
    }

    function run() {
      var tech = select.value;
      var msfShare = msfShareFor(tech);
      var overrides = { msfShare: msfShare, roShare: 1 - msfShare };

      var result = Engine.calcLCOWFull(overrides);
      var specificEnergy = Engine.blendedSpecificEnergy(overrides);

      out.innerHTML =
        '<div class="dash-stat-grid dash-stat-grid-4">' +
          '<div class="dash-stat-card dash-tone-water">' +
            '<span class="dash-stat-num">' + fmtInt(Engine.BASE.productionTotal) + '</span>' +
            '<span class="dash-stat-label">إنتاج المياه (م³/يوم)</span>' +
          '</div>' +
          '<div class="dash-stat-card dash-tone-nuclear">' +
            '<span class="dash-stat-num">' + fmtMoney(result.lcow) + '</span>' +
            '<span class="dash-stat-label">تكلفة الإنتاج LCOW — ' + techLabels[tech] + '</span>' +
          '</div>' +
          '<div class="dash-stat-card dash-tone-thermal">' +
            '<span class="dash-stat-num">' + result.unitsNeeded + '</span>' +
            '<span class="dash-stat-label">عدد وحدات SMART100 اللازمة</span>' +
          '</div>' +
          '<div class="dash-stat-card dash-tone-green">' +
            '<span class="dash-stat-num">' + fmtNum(specificEnergy, 2) + '</span>' +
            '<span class="dash-stat-label">الطاقة النوعية لهذا المزيج (kWh-eq/م³)</span>' +
          '</div>' +
        '</div>';
    }

    btn.addEventListener("click", run);
    run(); // show a default result (hybrid) on load
  })();

  /* =========================================================
     4) Tornado sensitivity chart
     ========================================================= */
  (function initTornado() {
    var chartEl = document.getElementById("tornado-chart");
    var axisEl = document.getElementById("tornado-axis");
    var tbody = document.getElementById("tornado-table-body");
    if (!chartEl) return;

    var data = Engine.computeTornado();
    var rows = data.rows;

    var allValues = [];
    rows.forEach(function (r) { allValues.push(r.lcowLow, r.lcowHigh); });
    allValues.push(data.baseLcow);
    var rawMin = Math.min.apply(null, allValues);
    var rawMax = Math.max.apply(null, allValues);
    var pad = (rawMax - rawMin) * 0.08 || 0.1;
    var domainMin = rawMin - pad;
    var domainMax = rawMax + pad;
    var span = domainMax - domainMin;

    function pct(v) { return ((v - domainMin) / span) * 100; }

    if (axisEl) {
      axisEl.innerHTML =
        '<span>' + fmtMoney(domainMin) + '</span>' +
        '<span>خط الأساس: ' + fmtMoney(data.baseLcow) + '</span>' +
        '<span>' + fmtMoney(domainMax) + '</span>';
    }

    var basePct = pct(data.baseLcow);
    var html = '<div class="dash-tornado-baseline" style="left:' + basePct + '%"></div>';

    rows.forEach(function (r) {
      var left = pct(r.lcowLow);
      var right = pct(r.lcowHigh);
      var width = right - left;
      html +=
        '<div class="dash-tornado-row">' +
          '<span class="dash-tornado-label">' + r.label + '</span>' +
          '<div class="dash-tornado-track">' +
            '<div class="dash-tornado-range' + (r.illustrative ? " is-illustrative" : "") + '" style="left:' + left + '%;width:' + width + '%"></div>' +
            '<span class="dash-tornado-value low" style="left:' + left + '%">' + fmtNum(r.lcowLow, 2) + '</span>' +
            '<span class="dash-tornado-value high" style="left:' + right + '%">' + fmtNum(r.lcowHigh, 2) + '</span>' +
          '</div>' +
        '</div>';
    });
    chartEl.innerHTML = html;
    chartEl.style.position = "relative";

    if (tbody) {
      tbody.innerHTML = rows.map(function (r) {
        return '<tr>' +
          '<td>' + r.label + '</td>' +
          '<td class="ff-mono">' + fmtNum(r.lcowLow, 3) + '</td>' +
          '<td class="ff-mono">' + fmtNum(r.lcowHigh, 3) + '</td>' +
          '<td class="ff-mono">' + fmtNum(r.diff, 3) + '</td>' +
          '</tr>';
      }).join("");
    }
  })();

  /* =========================================================
     5) Monte Carlo uncertainty panel
     ========================================================= */
  (function initMonteCarlo() {
    var p10El = document.getElementById("mc-p10");
    var p50El = document.getElementById("mc-p50");
    var p90El = document.getElementById("mc-p90");
    var gasEl = document.getElementById("mc-gas-mean");
    var histEl = document.getElementById("mc-histogram");
    var metaEl = document.getElementById("mc-meta");
    var btn = document.getElementById("mc-rerun-btn");
    if (!p10El || !p50El || !p90El) return;

    function renderHistogram(samples) {
      if (!histEl) return;
      var n = samples.length;
      var min = samples[0], max = samples[n - 1];
      var bins = 24;
      var width = (max - min) / bins || 1;
      var counts = new Array(bins).fill(0);
      samples.forEach(function (v) {
        var idx = Math.min(bins - 1, Math.floor((v - min) / width));
        counts[idx]++;
      });
      var maxCount = Math.max.apply(null, counts);
      histEl.innerHTML = counts.map(function (c) {
        var h = maxCount > 0 ? (c / maxCount) * 100 : 0;
        return '<div class="dash-histogram-bar" style="height:' + Math.max(h, 2) + '%"></div>';
      }).join("");
    }

    function run() {
      var mc = Engine.runMonteCarlo(1000);
      p10El.textContent = fmtMoney(mc.p10);
      p50El.textContent = fmtMoney(mc.p50);
      p90El.textContent = fmtMoney(mc.p90);
      if (gasEl) gasEl.textContent = fmtNum(mc.gasEmissionMean, 1);
      if (metaEl) metaEl.textContent = "n = " + mc.n;
      renderHistogram(mc.samples);
    }

    if (btn) btn.addEventListener("click", run);
    run();
  })();

})();
