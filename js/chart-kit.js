/* =========================================================
   SMART100 × رأس الخير (Fable build) — Chart Kit
   Chart.js v4 wrapper themed from this site's design tokens.
   Load Chart.js via CDN BEFORE this file.
   ========================================================= */
(function (global) {
  "use strict";

  function cssVar(name, fallback) {
    var v = getComputedStyle(document.documentElement).getPropertyValue(name);
    v = v && v.trim();
    return v || fallback;
  }

  var SMR_CHART_THEME = {
    fontFamily: "Tajawal, sans-serif",
    monoFontFamily: "'IBM Plex Mono', monospace",
    ink: cssVar("--text-1", "#eef2f8"),
    inkSecondary: cssVar("--text-2", "#aab6c9"),
    inkMuted: cssVar("--text-3", "#77839a"),
    grid: "rgba(255,255,255,0.06)",
    panel: cssVar("--bg-3", "#182131"),
    border: cssVar("--card-border-solid", "#263349"),
    nuclear: cssVar("--nuclear", "#8b6bff"),
    thermal: cssVar("--thermal", "#ff8a3d"),
    water: cssVar("--water", "#29c3ea")
  };

  function applyDefaults() {
    if (typeof Chart === "undefined") return;
    Chart.defaults.font.family = SMR_CHART_THEME.fontFamily;
    Chart.defaults.color = SMR_CHART_THEME.inkSecondary;
    Chart.defaults.plugins.legend.labels.color = SMR_CHART_THEME.inkSecondary;
    Chart.defaults.plugins.tooltip.backgroundColor = SMR_CHART_THEME.panel;
    Chart.defaults.plugins.tooltip.titleColor = SMR_CHART_THEME.ink;
    Chart.defaults.plugins.tooltip.bodyColor = SMR_CHART_THEME.inkSecondary;
    Chart.defaults.plugins.tooltip.borderColor = SMR_CHART_THEME.border;
    Chart.defaults.plugins.tooltip.borderWidth = 1;
    Chart.defaults.plugins.tooltip.padding = 10;
    Chart.defaults.plugins.tooltip.titleFont = { family: SMR_CHART_THEME.monoFontFamily, weight: "600" };
  }

  function baseScales(overrides) {
    var scale = { grid: { color: SMR_CHART_THEME.grid }, ticks: { color: SMR_CHART_THEME.inkMuted, font: { family: SMR_CHART_THEME.monoFontFamily, size: 11 } } };
    return Object.assign({ x: Object.assign({}, scale), y: Object.assign({}, scale) }, overrides || {});
  }

  function createBarChart(canvasId, cfg) {
    var el = document.getElementById(canvasId);
    if (!el || typeof Chart === "undefined") return null;
    applyDefaults();
    return new Chart(el, {
      type: "bar",
      data: { labels: cfg.labels, datasets: (cfg.datasets || []).map(function (d) {
        return { label: d.label, data: d.data, backgroundColor: d.color || SMR_CHART_THEME.nuclear, borderRadius: 4, maxBarThickness: 36 };
      }) },
      options: {
        responsive: true, maintainAspectRatio: false, scales: baseScales(),
        plugins: {
          legend: { display: (cfg.datasets || []).length > 1 },
          tooltip: { callbacks: cfg.unit ? { label: function (ctx) { return ctx.dataset.label + ": " + ctx.formattedValue + " " + cfg.unit; } } : undefined }
        }
      }
    });
  }

  function createLineChart(canvasId, cfg) {
    var el = document.getElementById(canvasId);
    if (!el || typeof Chart === "undefined") return null;
    applyDefaults();
    return new Chart(el, {
      type: "line",
      data: { labels: cfg.labels, datasets: (cfg.datasets || []).map(function (d) {
        return { label: d.label, data: d.data, borderColor: d.color || SMR_CHART_THEME.nuclear, backgroundColor: (d.color || SMR_CHART_THEME.nuclear) + "22", fill: !!d.fill, tension: 0.3, pointRadius: 3, pointHoverRadius: 5 };
      }) },
      options: {
        responsive: true, maintainAspectRatio: false, scales: baseScales(),
        plugins: {
          legend: { display: (cfg.datasets || []).length > 1 },
          tooltip: { callbacks: cfg.unit ? { label: function (ctx) { return ctx.dataset.label + ": " + ctx.formattedValue + " " + cfg.unit; } } : undefined }
        }
      }
    });
  }

  function createRadarChart(canvasId, cfg) {
    var el = document.getElementById(canvasId);
    if (!el || typeof Chart === "undefined") return null;
    applyDefaults();
    return new Chart(el, {
      type: "radar",
      data: { labels: cfg.labels, datasets: (cfg.datasets || []).map(function (d) {
        return { label: d.label, data: d.data, borderColor: d.color || SMR_CHART_THEME.nuclear, backgroundColor: (d.color || SMR_CHART_THEME.nuclear) + "33", pointBackgroundColor: d.color || SMR_CHART_THEME.nuclear };
      }) },
      options: {
        responsive: true, maintainAspectRatio: false,
        scales: { r: { angleLines: { color: SMR_CHART_THEME.grid }, grid: { color: SMR_CHART_THEME.grid }, pointLabels: { color: SMR_CHART_THEME.inkSecondary, font: { size: 11 } }, ticks: { display: false, backdropColor: "transparent" } } },
        plugins: { legend: { display: (cfg.datasets || []).length > 1 } }
      }
    });
  }

  global.SMR_CHART_THEME = SMR_CHART_THEME;
  global.SMR_Charts = { createBarChart: createBarChart, createLineChart: createLineChart, createRadarChart: createRadarChart };
})(window);
