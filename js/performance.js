(function () {
  "use strict";

  /* ---- Scenario data: keep in sync with the table markup in performance.html ---- */
  var scenarios = {
    normal: {
      tag: "السيناريو العادي",
      text: "السيناريو العادي (1.0× طلب مائي / 1.0× طلب كهربائي) هو خط الأساس: عشر وحدات " +
        "SMART100 تغطي الطلب القياسي على المياه والكهرباء بتكلفة إنتاج مياه (LCOW) قدرها " +
        "5.67 دولار للمتر المكعب."
    },
    "high-water": {
      tag: "ارتفاع الطلب المائي",
      text: "في سيناريو ارتفاع الطلب المائي (1.2× طلب مائي / 1.05× طلب كهربائي)، يرتفع إنتاج " +
        "المياه أكثر من الكهرباء المطلوبة، فتتوزع التكلفة الرأسمالية الثابتة على كمية مياه " +
        "أكبر — وهو ما يجعل هذا السيناريو الأرخص بين الأربعة عند 5.40 دولار للمتر المكعب."
    },
    "high-elec": {
      tag: "ارتفاع الطلب الكهربائي",
      text: "في سيناريو ارتفاع الطلب الكهربائي (1.0× طلب مائي / 1.2× طلب كهربائي)، ترتفع تكلفة " +
        "التشغيل دون أن يقابلها ارتفاع مماثل في إنتاج المياه، فترتفع تكلفة الإنتاج لتصبح " +
        "الأعلى بين السيناريوهات الأربعة عند 5.82 دولار للمتر المكعب."
    },
    peak: {
      tag: "سيناريو الذروة",
      text: "سيناريو الذروة (1.3× طلب مائي / 1.3× طلب كهربائي) هو السيناريو الذي يحدد حجم " +
        "الأسطول: هو ما يفرض الحاجة إلى عشر وحدات SMART100 لتغطية أعلى حمل متوقع، بتكلفة " +
        "إنتاج قدرها 5.46 دولار للمتر المكعب."
    }
  };

  var rowButtons = document.querySelectorAll(".perf-row-btn");
  var chartBars = document.querySelectorAll(".perf-bar");
  var detailTag = document.getElementById("scenario-detail-tag");
  var detailText = document.getElementById("scenario-detail-text");

  if (!rowButtons.length && !chartBars.length) return;

  function selectScenario(id) {
    var data = scenarios[id];
    if (!data) return;

    rowButtons.forEach(function (btn) {
      var active = btn.getAttribute("data-scenario") === id;
      btn.setAttribute("aria-pressed", String(active));
      var row = btn.closest("tr");
      if (row) row.classList.toggle("is-active", active);
    });

    chartBars.forEach(function (bar) {
      bar.setAttribute("aria-pressed", String(bar.getAttribute("data-scenario") === id));
    });

    if (detailTag) detailTag.textContent = data.tag;
    if (detailText) detailText.textContent = data.text;
  }

  rowButtons.forEach(function (btn) {
    btn.addEventListener("click", function () {
      selectScenario(btn.getAttribute("data-scenario"));
    });
  });

  chartBars.forEach(function (bar) {
    bar.addEventListener("click", function () {
      selectScenario(bar.getAttribute("data-scenario"));
    });
  });

  /* Initial state matches the "normal" scenario already marked in the markup. */
  selectScenario("normal");
})();
