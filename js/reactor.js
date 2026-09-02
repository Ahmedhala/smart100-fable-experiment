(function () {
  "use strict";

  /* ---- Integral PWR component explorer ---- */
  var COMPONENTS = {
    core: {
      title: "قلب المفاعل (Reactor Core)",
      desc: "المصدر الحراري الأساسي للمفاعل، حيث يولّد التفاعل النووي المتسلسل الحرارة التي يحملها المبرد الأولي إلى مولدات البخار المحيطة به مباشرة داخل الوعاء نفسه."
    },
    sg: {
      title: "مولدات البخار المدمجة (Integrated Steam Generators)",
      desc: "تحيط بقلب المفاعل داخل نفس الوعاء، وتنقل الحرارة من المبرد الأولي إلى دارة ثانوية منفصلة تولّد البخار اللازم لتوربينات الكهرباء ولوحدات MSF الحرارية."
    },
    pumps: {
      title: "المضخات الأولية (Primary Coolant Pumps)",
      desc: "مضخات مدمجة داخل الوعاء نفسه بدل أن تكون في أنابيب خارجية منفصلة، تُبقي المبرد الأولي في حركة دائمة بين القلب ومولدات البخار."
    },
    pressurizer: {
      title: "المنظّم الضغطي (Pressurizer)",
      desc: "يحافظ على ضغط المبرد الأولي ضمن النطاق التصميمي الآمن، ويقع هو الآخر داخل نفس وعاء الضغط بدلاً من وعاء منفصل كما في المفاعلات التقليدية."
    },
    vessel: {
      title: "وعاء الضغط الواحد (Single Pressure Vessel)",
      desc: "الغلاف الفولاذي السميك الذي يحتضن كل المكونات السابقة معاً، وهو ما يمنح SMART100 صفته كمفاعل «متكامل» (Integral PWR) ويقلص عدد الوصلات والأنابيب الخارجية."
    }
  };

  var buttons = document.querySelectorAll(".component-btn");
  var titleEl = document.getElementById("component-title");
  var descEl = document.getElementById("component-desc");

  if (buttons.length && titleEl && descEl) {
    buttons.forEach(function (btn) {
      btn.addEventListener("click", function () {
        var key = btn.getAttribute("data-target");
        var data = COMPONENTS[key];
        if (!data) return;

        buttons.forEach(function (b) { b.setAttribute("aria-pressed", "false"); });
        btn.setAttribute("aria-pressed", "true");

        titleEl.textContent = data.title;
        descEl.textContent = data.desc;
      });
    });
  }

  /* ---- Safety FAQ accordion ---- */
  var triggers = document.querySelectorAll(".accordion-trigger");

  function setPanelHeight(panel, expanded) {
    if (expanded) {
      panel.style.maxHeight = panel.scrollHeight + "px";
    } else {
      panel.style.maxHeight = "0px";
    }
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
