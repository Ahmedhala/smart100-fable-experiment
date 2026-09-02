/* =========================================================
   SMART100 — Interactive 3D Reactor Model
   Component data: id, Arabic/English names, base color, description.
   Consumed by js/reactor-3d.js
   ========================================================= */
window.REACTOR_3D_COMPONENTS = [
  {
    id: "core",
    nameAr: "قلب المفاعل",
    nameEn: "Reactor Core",
    color: 0x8b6bff,
    desc: "المصدر الحراري الأساسي للمفاعل، حيث يولّد التفاعل النووي المتسلسل الحرارة التي يحملها المبرد الأولي إلى مولدات البخار المحيطة به مباشرة داخل الوعاء نفسه."
  },
  {
    id: "fuel",
    nameAr: "قضبان الوقود",
    nameEn: "Fuel Rods",
    color: 0xa78bfa,
    desc: "حزمة من قضبان الوقود النووي المرتّبة في نمط حلقي داخل القلب، وهي المكان الفعلي الذي يحدث فيه الانشطار النووي وتُطلَق الحرارة."
  },
  {
    id: "control-rods",
    nameAr: "قضبان وآليات التحكم",
    nameEn: "Control Rod Drive Mechanisms",
    color: 0x9aa5b8,
    desc: "أعمدة وآليات قيادة تُدخل أو تسحب قضبان امتصاص النيوترونات من القلب للتحكم في معدل التفاعل النووي وإيقافه عند الحاجة، وتقع أعلى القلب مباشرة."
  },
  {
    id: "rpv",
    nameAr: "وعاء الضغط",
    nameEn: "Reactor Pressure Vessel",
    color: 0x5b6478,
    desc: "الغلاف الفولاذي السميك الذي يحتضن كل مكونات الدارة الأولية معاً في وعاء واحد، وهو ما يمنح SMART100 صفته كمفاعل «متكامل» (Integral PWR).",
    visualOnly: true
  },
  {
    id: "coolant",
    nameAr: "المبرد الأولي",
    nameEn: "Primary Coolant",
    color: 0x29c3ea,
    desc: "طبقة الماء المضغوط التي تدور بين القلب ومولدات البخار داخل الوعاء نفسه، ناقلةً الحرارة دون أن تُبخَّر بفضل الضغط العالي.",
    visualOnly: true
  },
  {
    id: "steam-gen",
    nameAr: "مولدات البخار",
    nameEn: "Steam Generators",
    color: 0xff8a3d,
    desc: "حزمة أنابيب مدمجة تحيط بالقلب داخل نفس الوعاء، تنقل الحرارة من المبرد الأولي إلى دارة ثانوية منفصلة تولّد البخار اللازم للتوربينات ولوحدات MSF."
  },
  {
    id: "pressurizer",
    nameAr: "المنظّم الضغطي",
    nameEn: "Pressurizer",
    color: 0xc9b6ff,
    desc: "قبة تقع أعلى الوعاء تحافظ على ضغط المبرد الأولي ضمن النطاق التصميمي الآمن، وتقع هي الأخرى داخل نفس وعاء الضغط الواحد بدل وعاء منفصل."
  }
];
