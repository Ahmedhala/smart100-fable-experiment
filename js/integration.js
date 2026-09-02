(function () {
  "use strict";

  /* =========================================================
     SCENARIO TABS (A / B / C) — full ARIA tabs pattern
     ========================================================= */
  var tablist = document.querySelector(".tablist");
  if (tablist) {
    var tabs = Array.prototype.slice.call(tablist.querySelectorAll('[role="tab"]'));
    var panels = tabs.map(function (tab) {
      return document.getElementById(tab.getAttribute("aria-controls"));
    });

    function activateTab(index, moveFocus) {
      tabs.forEach(function (tab, i) {
        var selected = i === index;
        tab.setAttribute("aria-selected", String(selected));
        tab.tabIndex = selected ? 0 : -1;
        tab.classList.toggle("is-active", selected);
        if (panels[i]) {
          if (selected) {
            panels[i].removeAttribute("hidden");
          } else {
            panels[i].setAttribute("hidden", "");
          }
        }
      });
      if (moveFocus) tabs[index].focus();
    }

    tabs.forEach(function (tab, i) {
      tab.addEventListener("click", function () {
        activateTab(i, false);
      });

      tab.addEventListener("keydown", function (e) {
        var newIndex = null;
        switch (e.key) {
          case "ArrowRight":
            newIndex = (i + 1) % tabs.length;
            break;
          case "ArrowLeft":
            newIndex = (i - 1 + tabs.length) % tabs.length;
            break;
          case "Home":
            newIndex = 0;
            break;
          case "End":
            newIndex = tabs.length - 1;
            break;
          default:
            return;
        }
        e.preventDefault();
        activateTab(newIndex, true);
      });
    });
  }

  /* =========================================================
     RELIABILITY TOGGLE (10 vs 9 units) — radiogroup pattern
     ========================================================= */
  var toggleGroup = document.querySelector(".reliability-toggle");
  if (toggleGroup) {
    var radios = Array.prototype.slice.call(toggleGroup.querySelectorAll('[role="radio"]'));
    var statusList = document.getElementById("scenario-status-list");
    var readout = document.getElementById("reliability-readout");
    var chips = statusList ? Array.prototype.slice.call(statusList.querySelectorAll(".status-chip")) : [];

    var readouts = {
      "10": "بكامل الوحدات العشر، يُغطّى الطلب في جميع السيناريوهات الأربعة التي اختبرها النموذج.",
      "9": "بغياب وحدة واحدة للصيانة الدورية، تبقى تسع وحدات كافية لثلاثة سيناريوهات من أصل أربعة. سيناريو الذروة القصوى وحده يتجاوز طاقة تسع وحدات — ما لم تُجدوَل الصيانة في فصل الشتاء منخفض الطلب."
    };

    function setUnits(units) {
      radios.forEach(function (r) {
        var active = r.getAttribute("data-units") === units;
        r.setAttribute("aria-checked", String(active));
        r.classList.toggle("is-active", active);
        r.tabIndex = active ? 0 : -1;
      });

      chips.forEach(function (chip) {
        var isPeak = chip.getAttribute("data-scn") === "peak";
        var covered = units === "10" || !isPeak;
        chip.classList.toggle("is-ok", covered);
        chip.classList.toggle("is-warn", !covered);
        var icon = chip.querySelector(".status-icon");
        if (icon) icon.textContent = covered ? "✓" : "⚠";
      });

      if (readout) readout.textContent = readouts[units];
    }

    radios.forEach(function (radio, i) {
      radio.addEventListener("click", function () {
        setUnits(radio.getAttribute("data-units"));
      });
      radio.addEventListener("keydown", function (e) {
        if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
        e.preventDefault();
        var nextIndex = e.key === "ArrowRight" ? (i + 1) % radios.length : (i - 1 + radios.length) % radios.length;
        radios[nextIndex].focus();
        setUnits(radios[nextIndex].getAttribute("data-units"));
      });
    });
  }
})();
