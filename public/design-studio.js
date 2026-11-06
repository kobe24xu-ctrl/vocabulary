const $ = (s) => document.querySelector(s);
const esc = (v) =>
  String(v ?? "").replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );
const icons = {
  home: "M3 10l9-7 9 7v11H3z M9 21v-8h6v8",
  calendar: "M4 5h16v16H4z M8 2v6 M16 2v6 M4 11h16 M8 15h2 M14 15h2",
  class: "M4 3h16v13H4z M8 21l4-5 4 5 M8 7h8 M8 11h5",
  book: "M3 4h6l3 3 3-3h6v15h-6l-3 2-3-2H3z M12 7v14",
  chart: "M4 3v17h17 M8 16v-5 M13 16V6 M18 16V9",
  arrow: "M5 12h14 M13 6l6 6-6 6",
  back: "M19 12H5 M11 6l-6 6 6 6",
  down: "M6 9l6 6 6-6",
  plus: "M12 4v16 M4 12h16",
  check: "M4 12l5 5L20 6",
  close: "M5 5l14 14 M5 19L19 5",
  clock: "M12 7v6l4 2 M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20",
  bell: "M6 8a6 6 0 0 1 12 0c0 6 3 6 3 9H3c0-3 3-3 3-9 M10 21h4",
  math: "M3 5h6l4 14L21 3 M13 3h9 M4 14h4 M6 12v4",
  engineering: "M4 20V4h16 M8 8h12 M8 12h9 M8 16h6 M15 21l5-5",
  economics: "M4 20h17 M6 16v-4 M12 16V6 M18 16V9 M3 8l6-5 7 2 5-3",
  business: "M8 6V3h8v3 M3 6h18v15H3z M3 10l9 5 9-5 M10 13h4v4h-4z",
  english:
    "M3 4h12 M9 2v2 M5 8q2 6 9 8 M13 5q-2 7-10 11 M13 21l4-11 4 11 M15 17h4",
  physics:
    "M3 12a9 4 0 1 0 18 0 9 4 0 1 0-18 0 M7.5 4.2a9 4 60 1 0 9 15.6 9 4 60 1 0-9-15.6 M12 10v4 M10 12h4",
  chemistry:
    "M9 3h6 M10 3v7L4 20q-1 2 2 2h12q3 0 2-2l-6-10V3 M7 15h10 M10 18h1 M14 20h1",
  computer: "M3 3h18v14H3z M9 21h6 M12 17v4 M7 7l3 3-3 3 M13 13h4",
  repeat:
    "M20 7H8a5 5 0 0 0-5 5 M20 7l-4-4 M20 7l-4 4 M4 17h12a5 5 0 0 0 5-5 M4 17l4 4 M4 17l4-4",
  user: "M12 12a5 5 0 1 0 0-10 5 5 0 0 0 0 10 M3 22v-3a6 6 0 0 1 6-6h6a6 6 0 0 1 6 6v3",
};
const I = (n) =>
  `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${icons[n] || icons.book}"/></svg>`;
const designs = {
  cloud: {
    n: "01",
    name: "云白工作台",
    short: "云白",
    copy: "轻盈的白色工作区，把待考、班级和下一步操作摆在眼前。",
    tags: ["极简清爽", "连续列表", "柔和蓝色"],
    colors: ["#4559DF", "#E9EEFF", "#FFFFFF", "#25324A"],
  },
  folio: {
    n: "02",
    name: "纸页学院",
    short: "纸页",
    copy: "像翻开一本教学手册：淡紫纸页、清楚的页边日历和完整例句。",
    tags: ["淡紫纸页", "横向导航", "阅读感"],
    colors: ["#715890", "#E8E0F0", "#F6F4FA", "#383247"],
  },
  sky: {
    n: "03",
    name: "晴空日历",
    short: "晴空",
    copy: "以考试日历为中心，日期、考试内容和进入按钮放在同一处。",
    tags: ["日历优先", "晴空蓝", "学生友好"],
    colors: ["#2863E8", "#EAF2FF", "#F1C647", "#FFFFFF"],
  },
  night: {
    n: "04",
    name: "夜航数据台",
    short: "夜航",
    copy: "石墨色工作台，大幅成绩曲线与紧凑考程，适合看长期变化。",
    tags: ["深色模式", "图表优先", "蓝灰配色"],
    colors: ["#252A35", "#303745", "#83B8E5", "#EAC585"],
  },
  board: {
    n: "05",
    name: "赤橙班级看板",
    short: "赤橙",
    copy: "用班级色和考试状态组织工作，待考与已完成一眼分清。",
    tags: ["班级分色", "状态看板", "鲜明层级"],
    colors: ["#EF713E", "#F9E6DC", "#4D75CA", "#8C76B9"],
  },
};
const classes = [
  {
    id: "engineering",
    name: "NCUK 工科班",
    program: "NCUK",
    people: 22,
    color: "#567CC0",
    soft: "#EDF2FD",
    subjects: ["engineering", "physics", "chemistry", "english"],
    average: 86,
  },
  {
    id: "business-a",
    name: "NCUK 商科一班",
    program: "NCUK",
    people: 24,
    color: "#9B71AE",
    soft: "#F4EDF9",
    subjects: ["math", "business", "economics", "english"],
    average: 84,
  },
  {
    id: "business-b",
    name: "NCUK 商科二班",
    program: "NCUK",
    people: 23,
    color: "#BA8146",
    soft: "#FCF1E4",
    subjects: ["math", "business", "economics", "english"],
    average: 81,
  },
  {
    id: "unsw",
    name: "新南预科班",
    program: "UNSW",
    people: 25,
    color: "#BF7684",
    soft: "#FBEFF1",
    subjects: ["math", "computer", "economics", "english"],
    average: 88,
  },
  {
    id: "uow",
    name: "沃隆港预科班",
    program: "UOW",
    people: 18,
    color: "#648E98",
    soft: "#EDF5F7",
    subjects: ["math", "computer", "economics", "english"],
    average: 83,
  },
];
const subjects = {
  engineering: "工科数学",
  math: "商科数学",
  physics: "物理",
  chemistry: "化学",
  english: "英语",
  economics: "经济学",
  business: "商务",
  computer: "计算机",
};
let exams = [
  {
    id: "today",
    classId: "engineering",
    subject: "english",
    week: "W06",
    date: "2026-11-06",
    time: "13:00",
    duration: 15,
    kind: "五选一",
    status: "upcoming",
    count: 24,
  },
  {
    id: "math",
    classId: "engineering",
    subject: "engineering",
    week: "W07",
    date: "2026-11-11",
    time: "13:00",
    duration: 20,
    kind: "填空题",
    status: "upcoming",
    count: 22,
  },
  {
    id: "economics",
    classId: "business-a",
    subject: "economics",
    week: "Topic C",
    date: "2026-11-13",
    time: "14:00",
    duration: 15,
    kind: "五选一",
    status: "upcoming",
    count: 28,
  },
  {
    id: "physics",
    classId: "engineering",
    subject: "physics",
    week: "W05",
    date: "2026-11-04",
    time: "13:00",
    duration: 15,
    kind: "填空题",
    status: "done",
    count: 20,
    average: 89,
  },
  {
    id: "unsw-math",
    classId: "unsw",
    subject: "math",
    week: "W06",
    date: "2026-11-12",
    time: "10:00",
    duration: 15,
    kind: "五选一",
    status: "upcoming",
    count: 26,
  },
  {
    id: "uow",
    classId: "uow",
    subject: "computer",
    week: "W06",
    date: "2026-11-10",
    time: "14:00",
    duration: 15,
    kind: "填空题",
    status: "upcoming",
    count: 20,
  },
];
const wordSets = {
  engineering: [
    [
      "coefficient",
      "系数",
      "Find the coefficient of x² in the expansion.",
      "求展开式中 x² 的系数。",
    ],
    [
      "gradient",
      "斜率",
      "Calculate the gradient of the tangent at point P.",
      "计算曲线在 P 点处切线的斜率。",
    ],
    [
      "differentiate",
      "求导",
      "Differentiate the function with respect to x.",
      "对该函数关于 x 求导。",
    ],
    [
      "intercept",
      "截距",
      "State the y-intercept of the straight line.",
      "写出该直线在 y 轴上的截距。",
    ],
  ],
  english: [
    [
      "evidence",
      "证据",
      "Use evidence from the passage to support your argument.",
      "使用文章中的证据支持你的论点。",
    ],
    [
      "evaluate",
      "评估",
      "Evaluate the reliability of the information in the report.",
      "评估报告中信息的可靠性。",
    ],
    [
      "contrast",
      "对比",
      "Contrast the two approaches to solving this problem.",
      "对比解决此问题的两种方法。",
    ],
    [
      "significant",
      "显著的",
      "The results show a significant increase in demand.",
      "结果显示需求显著增加。",
    ],
  ],
  economics: [
    [
      "opportunity cost",
      "机会成本",
      "Explain the opportunity cost of choosing a university course.",
      "解释选择一门大学课程的机会成本。",
    ],
    [
      "demand",
      "需求",
      "Explain how an increase in income affects demand.",
      "解释收入增加如何影响需求。",
    ],
    [
      "equilibrium",
      "均衡",
      "Identify the equilibrium price on the diagram.",
      "在图中找出均衡价格。",
    ],
    [
      "subsidy",
      "补贴",
      "Explain how a subsidy affects the supply of a good.",
      "解释补贴如何影响一种商品的供给。",
    ],
  ],
  physics: [
    [
      "velocity",
      "速度",
      "Calculate the velocity of the object after three seconds.",
      "计算物体三秒后的速度。",
    ],
    [
      "acceleration",
      "加速度",
      "Determine the acceleration from the velocity-time graph.",
      "根据速度时间图确定加速度。",
    ],
    [
      "resultant force",
      "合力",
      "Find the resultant force acting on the block.",
      "求作用在木块上的合力。",
    ],
    [
      "displacement",
      "位移",
      "State the displacement of the particle from its starting point.",
      "写出粒子相对于起点的位移。",
    ],
  ],
  chemistry: [
    [
      "catalyst",
      "催化剂",
      "Explain why the catalyst does not change the equilibrium position.",
      "解释为什么催化剂不会改变平衡位置。",
    ],
    [
      "concentration",
      "浓度",
      "Calculate the concentration of the acid solution.",
      "计算酸溶液的浓度。",
    ],
    [
      "precipitate",
      "沉淀",
      "Identify the precipitate formed when the solutions are mixed.",
      "辨认溶液混合时生成的沉淀。",
    ],
    [
      "oxidation",
      "氧化",
      "Determine the oxidation state of iron in this compound.",
      "确定此化合物中铁的氧化态。",
    ],
  ],
};
wordSets.math = wordSets.engineering;
wordSets.computer = [
  [
    "algorithm",
    "算法",
    "Describe an algorithm that sorts the list in ascending order.",
    "描述将列表按升序排序的算法。",
  ],
  [
    "variable",
    "变量",
    "Store the total number of students in a variable.",
    "将学生总数存储在一个变量中。",
  ],
  [
    "iteration",
    "迭代",
    "Explain how iteration is used to process each record.",
    "解释如何使用迭代处理每条记录。",
  ],
  [
    "condition",
    "条件",
    "State the condition that terminates the loop.",
    "写出终止循环的条件。",
  ],
];
wordSets.business = [
  [
    "stakeholder",
    "利益相关者",
    "Explain how the decision affects different stakeholders.",
    "解释该决策如何影响不同的利益相关者。",
  ],
  [
    "revenue",
    "收入",
    "Calculate the total revenue earned from sales.",
    "计算销售获得的总收入。",
  ],
  [
    "profit",
    "利润",
    "Calculate profit by subtracting total costs from revenue.",
    "通过从收入中减去总成本来计算利润。",
  ],
  [
    "market share",
    "市场份额",
    "Explain one way the business could increase its market share.",
    "解释企业可以增加市场份额的一种方法。",
  ],
];
const params = new URLSearchParams(location.search);
const allowedViews = [
  "home",
  "classes",
  "tasks",
  "words",
  "reports",
  "calendar",
  "practice",
  "review",
];
const state = {
  style: designs[params.get("style")] ? params.get("style") : null,
  role: params.get("role") === "student" ? "student" : "teacher",
  view: allowedViews.includes(params.get("view")) ? params.get("view") : "home",
  classId: "engineering",
  classOpen: false,
  subject: null,
  week: "W06",
  month: "2026-11",
  day: "2026-11-06",
  graphWeek: 5,
  person: false,
  search: "",
  exam: null,
  answers: {},
  question: 0,
};
const capture = params.get("capture") === "1";
const cls = () => classes.find((c) => c.id === state.classId) || classes[0];
const subjectName = (key, c = cls()) =>
  key === "math" && c.program !== "NCUK" ? "数学" : subjects[key] || key;
const ETitle = (e) =>
  `${subjectName(
    e.subject,
    classes.find((c) => c.id === e.classId),
  )} ${e.week}`;
const taskList = () =>
  exams
    .filter((e) => state.role === "teacher" || e.classId === "engineering")
    .sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time));
const styleURL = (key, role = state.role, view = "home") =>
  `/design-studio.html?${new URLSearchParams({ style: key, role, view })}`;
const btn = (text, action, extra = "", kind = "primary") =>
  `<button class="s-btn ${kind}" data-act="${action}" ${extra}>${text}</button>`;
const back = (action = "back") => btn(`${I("back")}返回`, action, "", "quiet");
const tag = (text, kind = "") =>
  `<span class="s-tag ${kind}">${esc(text)}</span>`;
const tint = (c) => `--class-color:${c.color};--class-soft:${c.soft}`;
function announce(text) {
  $("#studio-toast").innerHTML =
    `<div role="status">${I("check")}${esc(text)}</div>`;
  setTimeout(() => $("#studio-toast").replaceChildren(), 3500);
}
function navigate(view, extra = {}) {
  close();
  Object.assign(
    state,
    { view, subject: null, classOpen: false, search: "", exam: null },
    extra,
  );
  render();
  window.scrollTo({ top: 0, behavior: "instant" });
}
function saveURL() {
  if (!state.style) return;
  const q = new URLSearchParams({
    style: state.style,
    role: state.role,
    view: state.view,
  });
  history.replaceState(null, "", `?${q}`);
}
function toolbar() {
  const d = designs[state.style];
  return `<header class="studio-bar"><a class="studio-return" href="/design-studio.html">${I("back")}全部样稿</a><nav aria-label="切换设计">${Object.entries(
    designs,
  )
    .map(
      ([k, v]) =>
        `<button data-act="style" data-key="${k}" class="${k === state.style ? "on" : ""}" aria-pressed="${k === state.style}"><span>${v.n}</span>${v.short}</button>`,
    )
    .join(
      "",
    )}</nav><div class="role-switch" role="group" aria-label="切换老师与学生端">${["teacher", "student"].map((r) => `<button data-act="role" data-key="${r}" class="${state.role === r ? "on" : ""}" aria-pressed="${state.role === r}">${r === "teacher" ? "老师端" : "学生端"}</button>`).join("")}</div><button class="studio-choose" data-act="choose">选这套 ${d.n}</button></header><div class="studio-caption"><strong>${d.name}</strong><span>${d.copy}</span><small>可点击样稿 · 示例数据</small></div>`;
}
function gallery() {
  document.body.dataset.skin = "gallery";
  let chosen = "";
  try {
    chosen = localStorage.getItem("classwords-design-pick") || "";
  } catch {}
  return `<main class="gallery"><header class="gallery-top"><a class="studio-wordmark" href="/">${I("book")}词间课堂</a><span>设计样稿 / 2026.11</span><a href="/">返回网站 ${I("arrow")}</a></header><section class="gallery-intro"><div><p>重新整理你的课堂</p><h1>五种风格。<br>点开，用一用再选。</h1></div><div><p>老师的班级、科目和成绩，<br>学生的考试、日历和错题。</p><span>每套都有老师端和学生端，可以选班、看词库、切换日历、体验答题。样稿使用虚构数据。</span></div></section><div class="gallery-grid">${Object.entries(
    designs,
  )
    .map(
      ([key, d]) =>
        `<article class="proposal proposal-${key}"><a class="proposal-preview" href="${styleURL(key, "teacher")}"><img src="/studio-${key}.png" alt="${d.name}老师工作台实际界面预览" loading="${key === "cloud" ? "eager" : "lazy"}" width="1360" height="920"/><span>打开可交互样稿 ${I("arrow")}</span></a><div class="proposal-copy"><div class="proposal-heading"><span class="proposal-number">${d.n}</span><h2>${d.name}</h2>${chosen === key ? '<span class="picked">上次选择</span>' : ""}<div class="swatches">${d.colors.map((c) => `<i style="background:${c}"></i>`).join("")}</div></div><p>${d.copy}</p><div class="proposal-tags">${d.tags.map((t) => `<span>${t}</span>`).join("")}</div><div class="proposal-links"><a href="${styleURL(key, "teacher")}">体验老师端 ${I("arrow")}</a><a href="${styleURL(key, "student")}">体验学生端 ${I("arrow")}</a></div></div></article>`,
    )
    .join(
      "",
    )}</div><footer class="gallery-footer"><p>喜欢哪套，回聊天告诉我编号；也可以指定保留某套的配色、另一套的布局。</p><a href="/font-licenses.html">字体许可</a></footer></main>`;
}
function brand() {
  return `<button class="s-brand" data-act="nav" data-key="home"><span class="brand-symbol">${I("book")}</span><strong>词间课堂<small>LexiClass</small></strong></button>`;
}
function items() {
  return state.role === "teacher"
    ? [
        ["home", "home", "教学工作台"],
        ["classes", "class", "班级与学生"],
        ["tasks", "calendar", "听写安排"],
        ["words", "book", "课程词库"],
        ["reports", "chart", "学习报告"],
      ]
    : [
        ["home", "home", "我的学习"],
        ["calendar", "calendar", "考试日历"],
        ["words", "book", "每周词汇"],
        ["practice", "repeat", "自主练习"],
        ["reports", "chart", "我的成绩"],
        ["review", "book", "历史错题"],
      ];
}
function nav() {
  return `<nav class="s-nav" aria-label="样稿主导航">${items()
    .map(
      ([v, i, t]) =>
        `<button class="${state.view === v || (v === "tasks" && state.view === "calendar") ? "active" : ""}" data-act="nav" data-key="${v}" aria-current="${state.view === v ? "page" : "false"}">${I(i)}<span>${t}</span></button>`,
    )
    .join("")}</nav>`;
}
function shell() {
  return `<div class="s-shell"><aside class="s-sidebar">${brand()}${nav()}<div class="sidebar-help">${I("book")}<p>词汇，放进真正的题目里。</p></div><div class="s-account"><span class="s-avatar">${state.role === "teacher" ? "M" : "学"}</span><div><b>${state.role === "teacher" ? "Master" : "示例同学"}</b><small>${state.role === "teacher" ? "统一教学管理" : "NCUK 工科班"}</small></div><span class="account-dot"></span></div></aside><div class="s-main"><header class="s-top"><span>${state.role === "teacher" ? "教学工作台" : "NCUK 工科班"}<i>/</i>${items().find((x) => x[0] === state.view)?.[2] || (state.view === "calendar" ? "听写日历" : "课堂")}</span><div>${state.role === "student" ? `<button class="s-bell" data-act="notice" aria-label="查看考试提醒">${I("bell")}<span>1</span></button>` : '<span class="top-date">11月6日 星期五</span>'}<span class="s-avatar">${state.role === "teacher" ? "M" : "学"}</span></div></header><main class="s-content" id="s-content">${content()}</main><footer class="s-footer"><span>词间课堂</span><span>${state.role === "teacher" ? "UNSW / NCUK / UOW" : "学习和考试记录跟随你的账号保存"}</span></footer></div></div>`;
}
function title(text, copy, action = "") {
  return `<header class="s-heading"><div><h1>${text}</h1><p>${copy}</p></div>${action ? `<div class="s-heading-actions">${action}</div>` : ""}</header>`;
}
function examRows(list, compact = false) {
  return `<div class="s-exam-list ${compact ? "compact" : ""}">${
    list
      .map((e) => {
        const c = classes.find((x) => x.id === e.classId);
        return `<button class="s-exam-row" style="${tint(c)}" data-act="exam-detail" data-id="${e.id}"><span class="subject-mark ${e.subject}">${I(e.subject)}</span><span class="exam-main"><strong>${esc(ETitle(e))}</strong><small>${state.role === "teacher" ? `${c.name} · ` : ""}${e.count}个词汇 · ${e.duration}分钟</small></span><span class="exam-when"><b>${e.date.slice(5).replace("-", "月")}日</b><small>${e.time}</small></span>${tag(e.status === "done" ? "已完成" : "待开始", e.status)}<span class="row-end">${I("arrow")}</span></button>`;
      })
      .join("") || '<div class="s-empty">这里暂时没有考试安排。</div>'
  }</div>`;
}
function classRows() {
  return `<div class="s-class-rows">${classes.map((c) => `<button data-act="class" data-id="${c.id}" class="s-class-row" style="${tint(c)}"><span class="class-dot"></span><span><strong>${c.name}</strong><small>${c.people}位学生 / ${c.subjects.length}门科目</small></span><span class="class-progress"><i style="width:${c.average}%"></i></span><span class="class-score">${c.average}<small>均分</small></span>${I("arrow")}</button>`).join("")}</div>`;
}
function sectionHead(text, view, label = "查看全部") {
  return `<div class="section-head"><h2>${text}</h2>${view ? `<button data-act="nav" data-key="${view}">${label}${I("arrow")}</button>` : ""}</div>`;
}
function contextualWord(subject = "engineering") {
  const w = (wordSets[subject] || wordSets.english)[0];
  return `<section class="featured-word"><span class="word-caption">读懂专业课</span><h2>${esc(w[0])}</h2><p class="word-meaning">${esc(w[1])}</p><blockquote>${esc(w[2])}</blockquote><p>${esc(w[3])}</p>${btn("打开本周词汇", "home-words", `data-key="${subject}"`, "quiet")}</section>`;
}
function nextExam(large = false) {
  const e = exams.find((e) => e.id === "today");
  return `<section class="next-exam ${large ? "large" : ""}"><div class="next-info"><span class="exam-pill"><i></i>今天有一场考试</span><h2>${esc(ETitle(e))}</h2><p>${e.time} 开放 / ${e.duration} 分钟 / ${e.count} 个词汇</p><div class="next-actions">${btn(state.role === "teacher" ? "查看考试安排" : "查看考试入口", "exam-detail", 'data-id="today"')}${state.role === "student" ? btn("先学本周词汇", "home-words", 'data-key="english"', "quiet") : ""}</div></div><div class="exam-symbol">${I("english")}<span>中英双向翻译</span></div></section>`;
}
function weekStrip() {
  const days = [
    ["一", "02"],
    ["二", "03"],
    ["三", "04"],
    ["四", "05"],
    ["五", "06"],
    ["六", "07"],
    ["日", "08"],
  ];
  return `<div class="week-strip">${days.map(([d, n]) => `<button data-act="day" data-key="2026-11-${n}" class="${n === "06" ? "today" : ""} ${state.day.endsWith(n) ? "selected" : ""}"><small>周${d}</small><strong>${n}</strong>${["04", "06"].includes(n) ? "<i></i>" : "<span></span>"}</button>`).join("")}</div>`;
}
function sparkline(values, color = "currentColor") {
  const points = values
    .map((v, i) => `${8 + i * 37},${54 - v * 0.5}`)
    .join(" ");
  return `<svg class="sparkline" viewBox="0 0 170 60" aria-label="最近五次成绩趋势" role="img"><path d="M5 53H165" stroke="currentColor" opacity=".12"/><polyline points="${points}" stroke="${color}" stroke-width="2.5" fill="none"/>${values.map((v, i) => `<circle cx="${8 + i * 37}" cy="${54 - v * 0.5}" r="3" fill="${color}"/>`).join("")}</svg>`;
}
function trend(person = false) {
  const values = (
    person ? [72, 78, 83, 87, 91, 89] : [68, 74, 78, 82, 85, 89]
  ).map((v) => v - (state.view === "reports" ? state.reportSubject || 0 : 0));
  return `<div class="trend-chart"><svg viewBox="0 0 720 235" role="group" aria-label="按教学周查看平均分趋势">${[60, 80, 100].map((v) => `<g><line x1="38" y1="${205 - (v - 40) * 2.7}" x2="695" y2="${205 - (v - 40) * 2.7}" class="chart-grid"/><text x="0" y="${210 - (v - 40) * 2.7}">${v}</text></g>`).join("")}<path d="M40 ${205 - (values[0] - 40) * 2.7} ${values
    .slice(1)
    .map((v, i) => `L${170 + i * 130} ${205 - (v - 40) * 2.7}`)
    .join(
      " ",
    )} L690 205 L40 205Z" class="chart-area"/><polyline points="${values.map((v, i) => `${40 + i * 130},${205 - (v - 40) * 2.7}`).join(" ")}" fill="none" class="chart-line"/>${values.map((v, i) => `<g role="button" tabindex="0" data-act="graph-week" data-week="${i}" aria-label="第${i + 1}周，${v}分"><rect x="${12 + i * 130}" y="0" width="56" height="235" fill="transparent"/><circle cx="${40 + i * 130}" cy="${205 - (v - 40) * 2.7}" r="18" fill="transparent"/><circle cx="${40 + i * 130}" cy="${205 - (v - 40) * 2.7}" r="${i === state.graphWeek ? 7 : 4}" class="chart-point ${i === state.graphWeek ? "selected" : ""}"/><text x="${40 + i * 130}" y="232" text-anchor="middle">第${i + 1}周</text></g>`).join("")}</svg></div><div class="chart-caption"><span>第${state.graphWeek + 1}周</span><strong>${values[state.graphWeek]}<small>分</small></strong><span>${person ? "本人平均成绩" : "班级平均成绩"}<small>点击曲线上的点，查看各周表现</small></span></div>`;
}
function monthCalendar(compact = false) {
  const [y, m] = state.month.split("-").map(Number);
  const off = (new Date(Date.UTC(y, m - 1, 1)).getUTCDay() + 6) % 7;
  const count = new Date(Date.UTC(y, m, 0)).getUTCDate();
  const list = taskList();
  return `<section class="s-calendar ${compact ? "small-calendar" : ""}"><header><div><h2>${y}年${m}月</h2><small>考试时间均为北京时间</small></div><div><button data-act="month" data-delta="-1" aria-label="上个月">${I("back")}</button><button data-act="month" data-delta="1" aria-label="下个月">${I("arrow")}</button></div></header><div class="s-month-grid">${["一", "二", "三", "四", "五", "六", "日"].map((d) => `<span class="day-name">${d}</span>`).join("")}${"<span></span>".repeat(off)}${Array.from(
    { length: count },
    (_, i) => {
      const date = `${state.month}-${String(i + 1).padStart(2, "0")}`;
      const entries = list.filter((e) => e.date === date);
      return `<button data-act="day" data-key="${date}" aria-label="${date}，${entries.length}场考试" aria-pressed="${date === state.day}" class="month-day ${date === state.day ? "selected" : ""} ${date === "2026-11-06" ? "is-today" : ""} ${entries.length ? "has-event" : ""}"><strong>${i + 1}</strong>${
        entries.length
          ? `<span class="day-event">${
              compact
                ? "<i></i>"
                : `${I(entries[0].subject)}<span>${subjectName(
                    entries[0].subject,
                    classes.find((c) => c.id === entries[0].classId),
                  )}<small>${entries[0].time}</small></span>`
            }</span>`
          : ""
      }</button>`;
    },
  ).join(
    "",
  )}</div><p class="calendar-hint"><i></i>有考试安排 <span>点击日期查看详情</span></p></section>`;
}
function dayAgenda() {
  const es = taskList().filter((e) => e.date === state.day);
  return `<aside class="s-day-agenda"><span class="agenda-date">${state.day.slice(5).replace("-", "月")}日</span><h2>${es.length ? "当天考试" : "当天暂无考试"}</h2>${es.map((e) => `<article><span class="subject-mark">${I(e.subject)}</span>${tag(e.status === "done" ? "已完成" : "待开始", e.status)}<h3>${esc(ETitle(e))}</h3><p>${state.role === "teacher" ? esc(classes.find((c) => c.id === e.classId).name) + "<br>" : ""}${e.time} 开放 · ${e.duration}分钟<br>${e.count}个词汇 / ${e.kind}</p>${btn(state.role === "teacher" ? "查看安排" : e.status === "done" ? "回看答卷" : "进入考试说明", "exam-detail", `data-id="${e.id}"`)}</article>`).join("") || `<div class="day-empty">${I("calendar")}<p>可以点击其他日期，或先学习本周词汇。</p>${btn("打开课程词库", "nav", 'data-key="words"', "quiet")}</div>`}</aside>`;
}
function calendarView() {
  return `${title(state.role === "teacher" ? "听写日历" : "我的考试日历", "提前知道哪一天、哪一科、什么时候考。", state.role === "teacher" ? btn(`${I("plus")}安排听写`, "publish") : "")}<div class="calendar-spread">${monthCalendar()}${dayAgenda()}</div>`;
}
function cloudHome() {
  return `${title(state.role === "teacher" ? "教学工作台" : "今天，从这里开始。", state.role === "teacher" ? "5个班级，112位学生。先看看今天的教学安排。" : "NCUK 工科班 · 考试与学习内容都为你准备好了。", state.role === "teacher" ? btn(`${I("plus")}安排听写`, "publish") : "")}${nextExam()}<div class="home-columns"><div>${sectionHead(state.role === "teacher" ? "班级学习情况" : "这周的学习内容", state.role === "teacher" ? "classes" : "words")}${state.role === "teacher" ? classRows() : subjectTiles("home-words")}<div class="quiet-note">${I("check")}<p>${state.role === "teacher" ? "上一场工科数学已完成批改。平均89分，较上周提高4分。" : "上次物理听写89分，2个错词等待巩固。"}</p>${btn(state.role === "teacher" ? "查看报告" : "复习错题", "nav", `data-key="${state.role === "teacher" ? "reports" : "review"}"`, "quiet")}</div></div><aside>${sectionHead("本周考程", "calendar")}${weekStrip()}${examRows(
    taskList()
      .filter((e) => e.status !== "done")
      .slice(0, 3),
    true,
  )}</aside></div>`;
}
function folioHome() {
  return `${title(state.role === "teacher" ? "本周教学手册" : "我的学习手册", "2026年11月2日—8日 · 第6教学周", state.role === "teacher" ? btn("安排一场听写", "publish") : "")}<div class="folio-spread"><div class="folio-page"><div class="folio-topic"><span>${I("book")}本周在学</span><span>${state.role === "teacher" ? "NCUK 工科班" : "第6周词汇"}</span></div>${contextualWord(state.role === "teacher" ? "engineering" : "english")}<div class="folio-footnote">${I("check")}词汇放进题干，再把句子读懂。</div>${sectionHead(state.role === "teacher" ? "教学班级" : "学习进展", state.role === "teacher" ? "classes" : "reports")}${state.role === "teacher" ? classRows() : `<div class="personal-progress"><div><span>上次听写</span><strong>89<small>分</small></strong></div>${sparkline([72, 79, 84, 87, 89])}<p>过去五次考试稳步提高。<br>还有2个错词可以再练一次。</p></div>`}</div><aside class="folio-margin">${monthCalendar(true)}<div class="margin-exam">${sectionHead("今天的听写")}${examRows([exams[0]], true)}${btn(state.role === "teacher" ? "查看安排" : "打开考试入口", "exam-detail", 'data-id="today"')}</div></aside></div>`;
}
function skyHome() {
  return `${title(state.role === "teacher" ? "这周，怎么安排？" : "这周，什么时候考？", "点一下日期，就知道要准备哪些词汇。", state.role === "teacher" ? btn(`${I("plus")}安排听写`, "publish") : "")}<div class="sky-banner"><div>${I("calendar")}<strong>本周 2 场听写</strong><span>今天13:00，英语 W06</span></div>${btn(state.role === "teacher" ? "查看今天安排" : "打开今天的考试", "exam-detail", 'data-id="today"')}</div><div class="calendar-spread">${monthCalendar()}${dayAgenda()}</div><div class="sky-next-steps"><div>${I("book")}<h2>提前学习</h2><p>各周词汇一直开放。</p>${btn("选一科开始", "nav", 'data-key="words"', "quiet")}</div><div>${I("repeat")}<h2>随时自测</h2><p>不用等老师发布，练习不限次数。</p>${btn("开始自主练习", "nav", 'data-key="practice"', "quiet")}</div></div>`;
}
function nightHome() {
  return `${title(state.role === "teacher" ? "课堂学习进展" : "看见自己的进步", state.role === "teacher" ? "第6周 · 正式听写成绩" : "从第1周到第6周，每次练习都有记录。", state.role === "teacher" ? btn(`${I("plus")}安排听写`, "publish") : "")}<div class="night-spread"><section class="night-graph"><div class="graph-heading"><div><span>${state.role === "teacher" ? "NCUK 工科班" : "示例同学"} / 全部科目</span><h2>${state.role === "teacher" ? "每周平均分" : "我的成绩趋势"}</h2></div>${tag("比上周提高 4 分", "upcoming")}</div>${trend(state.role === "student")}${sectionHead(state.role === "teacher" ? "班级对比" : "本周待巩固", state.role === "teacher" ? "reports" : "review")}${
    state.role === "teacher"
      ? classRows()
      : `<div class="night-review">${wordSets.physics
          .slice(0, 2)
          .map(
            (w) =>
              `<button data-act="nav" data-key="review"><strong>${w[0]}</strong><span>${w[1]}</span>${I("repeat")}</button>`,
          )
          .join("")}</div>`
  }</section><aside>${nextExam()}${sectionHead("接下来的考试", "calendar")}${examRows(
    taskList()
      .filter((e) => e.status !== "done" && e.id !== "today")
      .slice(0, 3),
    true,
  )}</aside></div>`;
}
function boardExam(e) {
  const c = classes.find((c) => c.id === e.classId);
  return `<button class="board-exam" data-act="exam-detail" data-id="${e.id}" style="${tint(c)}"><span class="board-class">${c.name}</span><div class="board-subject">${I(e.subject)}<h3>${esc(subjectName(e.subject, c))}</h3></div><span class="board-week">${esc(e.week)}</span><p>${e.date.slice(5).replace("-", "月")}日 ${e.time}<br>${e.count}词 / ${e.kind}</p><footer>${e.status === "done" ? "查看成绩" : "查看安排"}${I("arrow")}</footer></button>`;
}
function boardHome() {
  const list = taskList();
  return `${title(state.role === "teacher" ? "班级里，正在发生。" : "我的学习看板", state.role === "teacher" ? "每个班级一种颜色，每场考试各归其位。" : "按自己的节奏，准备考试、练习词汇。", state.role === "teacher" ? btn(`${I("plus")}安排听写`, "publish") : "")}<div class="board-class-strip">${(state.role === "teacher" ? classes : [classes[0]]).map((c) => `<button data-act="${state.role === "teacher" ? "class" : "nav"}" data-id="${c.id}" data-key="words" style="${tint(c)}"><i></i>${c.name}<span>${state.role === "teacher" ? c.people + "人" : "我的班级"}</span></button>`).join("")}</div><div class="status-board"><section><header><i class="status-dot today"></i><h2>今天要考</h2><span>1</span></header>${boardExam(exams[0])}${state.role === "student" ? `<div class="board-note">${I("book")}<h3>还没准备好？</h3><p>先看这次要考的词汇。</p>${btn("先学词汇", "home-words", 'data-key="english"', "quiet")}</div>` : ""}</section><section><header><i class="status-dot later"></i><h2>接下来</h2><span>${list.filter((e) => e.status === "upcoming" && e.id !== "today").length}</span></header>${list
    .filter((e) => e.status === "upcoming" && e.id !== "today")
    .slice(0, 3)
    .map(boardExam)
    .join(
      "",
    )}</section><section><header><i class="status-dot finished"></i><h2>已经完成</h2><span>1</span></header>${boardExam(exams[3])}<div class="board-note">${I("chart")}<h3>物理听写，平均89分</h3><p>较上次提高4分。</p>${btn("打开学习报告", "nav", 'data-key="reports"', "quiet")}</div></section></div>`;
}
function subjectTiles(action = "subject") {
  const c = state.role === "student" ? classes[0] : cls();
  return `<div class="subject-tiles">${c.subjects.map((s) => `<button data-act="${action}" data-key="${s}" class="subject-tile"><span class="subject-mark">${I(s)}</span><div><h3>${subjectName(s, c)}</h3><p>${s === "economics" || s === "business" ? "按 Topic 学习" : "按教学周学习"}</p></div>${I("arrow")}</button>`).join("")}</div>`;
}
function classTiles() {
  return `<div class="class-tiles">${classes.map((c) => `<button data-act="class" data-id="${c.id}" class="class-tile" style="${tint(c)}"><header><span>${c.program}</span><span>${c.people}位学生</span></header><span class="tile-class-icon">${I("class")}</span><h2>${c.name}</h2><p>${c.subjects.map((s) => subjectName(s, c)).join(" / ")}</p><footer><span>${state.view === "reports" ? "查看学习报告" : state.view === "tasks" ? "查看科目与考试" : "管理课程和学生"}</span>${I("arrow")}</footer></button>`).join("")}</div>`;
}
function classesView() {
  if (!state.classOpen)
    return `${title("班级与学生", "先选班级，在同一处管理课程与学生。", btn(`${I("plus")}添加班级`, "new-class"))}${classTiles()}`;
  const c = cls();
  return `${back()}${title(c.name, `${c.people}位学生 / ${c.subjects.length}门课程`, btn(`${I("plus")}添加学生`, "new-student"))}<section class="class-course-section"><h2>本班课程</h2>${subjectTiles("course-info")}</section>${sectionHead("学生名单")}<div class="student-tiles">${Array.from({ length: 8 }, (_, i) => `<button data-act="student-profile" data-id="${i}"><span class="s-avatar" style="${tint(c)}">${String.fromCharCode(65 + i)}</span><div><h3>示例同学 ${String.fromCharCode(65 + i)}</h3><p>${2 + (i % 3)}次听写 / ${83 + i}分</p></div>${sparkline([65 + i * 2, 76 + i, 80 + i, 82 + i, 83 + i])}${I("arrow")}</button>`).join("")}</div>`;
}
function tasksView() {
  if (!state.classOpen)
    return `${title("听写安排", "点选班级，再查看科目和每次听写。", btn(`${I("plus")}安排听写`, "publish"))}${classTiles()}`;
  if (!state.subject)
    return `${back()}${title(cls().name, "选择科目查看听写。", btn(`${I("plus")}安排听写`, "publish"))}${subjectTiles()}`;
  return `${back()}${title(`${cls().name} / ${subjectName(state.subject)}`, "按日期整理，已完成考试可以查看成绩。", btn(`${I("plus")}安排听写`, "publish"))}${examRows(exams.filter((e) => e.classId === state.classId && e.subject === state.subject))}`;
}
function wordsView(review = false) {
  const c = state.role === "student" ? classes[0] : cls();
  if (!state.subject && !review)
    return `${title(review ? "历史错题" : "每周词汇", state.role === "teacher" ? "先选班级和科目，查阅带题干例句的词汇。" : "随时预习、回顾，不需要老师发布。")}${state.role === "teacher" ? `<div class="class-tabs">${classes.map((c) => `<button style="${tint(c)}" data-act="word-class" data-id="${c.id}" class="${state.classId === c.id ? "selected" : ""}">${c.name}</button>`).join("")}</div>` : ""}${subjectTiles()}`;
  const s = state.subject || "physics";
  const words = wordSets[s] || wordSets.english;
  const groups = ["economics", "business"].includes(s)
    ? ["Topic A", "Topic B", "Topic C", "Topic D", "Topic E"]
    : ["W05", "W06", "W07", "W08", "W09", "W10"];
  if (!groups.includes(state.week)) state.week = groups[1];
  return `${back()}${title(review ? "把错过的，再练一次。" : `${subjectName(s, c)} / 每周词汇`, review ? "这里收好每次考试的错词。答对后会逐步移出待复习列表。" : `${c.name} / ${state.week}`)}${!review ? `<div class="week-tabs">${groups.map((w) => `<button data-act="word-week" data-key="${w}" class="${state.week === w ? "selected" : ""}">${w}<small>${w.startsWith("W") ? `第${Number(w.slice(1))}周` : "主题词汇"}</small></button>`).join("")}</div>` : ""}<div class="word-layout">${(review ? words.slice(0, 2) : words).map((w, i) => `<article class="lexical-entry"><div class="lexical-top">${tag(review ? "待巩固" : state.week)}<span>${I(s)}${subjectName(s, c)}</span></div><h2>${esc(w[0])}</h2><p class="lexical-meaning">${esc(w[1])}</p><div class="lexical-example"><span>在题目中理解</span><blockquote>${esc(w[2]).replace(esc(w[0]), `<mark>${esc(w[0])}</mark>`)}</blockquote><p>${esc(w[3])}</p></div>${review ? btn("再练一次", "practice-start", `data-subject="${s}"`, "quiet") : ""}</article>`).join("")}</div>${btn("用这组词汇自测", "practice-start", `data-subject="${s}"`)}`;
}
function reportsView() {
  const personal = state.role === "student" || state.person;
  if (!personal && !state.classOpen)
    return `${title("学习报告", "从班级开始，看各科成绩与每周变化。")}${classTiles()}`;
  return `${state.role === "teacher" ? back() : ""}${title(personal ? "示例同学的学习记录" : `${cls().name} / 学习报告`, personal ? "把不同科目、不同考试的进步放在一起看。" : "点选教学周或学生，查看更细的学习情况。")}<div class="report-spread"><section class="report-graph"><div class="report-tabs">${["全部科目", ...(personal ? classes[0] : cls()).subjects.map((s) => subjectName(s))].map((s, i) => `<button data-act="report-subject" data-index="${i}" class="${(state.reportSubject || 0) === i ? "selected" : ""}">${s}</button>`).join("")}</div><h2>${personal ? "我的成绩变化" : "班级周平均分"}</h2>${trend(personal)}<div class="score-scale"><div><strong>89<small>分</small></strong><span>本周平均分</span></div><div class="score-bars">${["英语", "工科数学", "物理", "化学"].map((s, i) => `<div><span>${s}</span><i><b style="width:${89 - i * 3}%"></b></i><strong>${89 - i * 3}</strong></div>`).join("")}</div></div></section><aside class="report-notes"><h2>${personal ? "待巩固的部分" : "这周的观察"}</h2><p>${personal ? "物理中的速度、加速度还可以再练一次。" : "物理听写平均89分。计算类词汇掌握较好，题干动词仍需巩固。"}</p><div class="report-insight"><strong>+4</strong><span>平均分较上次提高</span></div>${btn(personal ? "去复习错词" : "查看学生画像", personal ? "nav" : "student-profile", personal ? 'data-key="review"' : 'data-id="0"', "quiet")}<h3>最近一次考试</h3>${examRows([exams[3]], true)}</aside></div>`;
}
function practiceView() {
  return `${title("自主练习", "选一周，自己试一试。每次可重复练习。")}<div class="practice-spread"><section><h2>先选一门课</h2>${subjectTiles("practice-course")}<div class="practice-settings"><h3>${subjectName(state.subject || "engineering", classes[0])}</h3><div class="week-tabs">${["W05", "W06", "W07"].map((w) => `<button data-act="word-week" data-key="${w}" class="${state.week === w ? "selected" : ""}">${w}</button>`).join("")}</div><p>这份样稿提供3道交互示例题，选项为五选一；真实网站按所选周的完整词库出题。</p>${btn("开始这组练习", "practice-start", `data-subject="${state.subject || "engineering"}"`)}</div></section>${contextualWord(state.subject || "engineering")}</div>`;
}
function examView() {
  const ex = state.exam;
  const qs = (wordSets[ex.subject] || wordSets.english).slice(0, 3);
  if (ex.done) {
    const score = Math.round(
      (Object.entries(state.answers).filter(([k, v]) => v === qs[Number(k)][1])
        .length /
        qs.length) *
        100,
    );
    return `<section class="sample-result"><span class="result-check">${I("check")}</span><p>本次样稿练习已完成</p><h1>${score}<small>分</small></h1><p>答题人：示例同学 / 共3道示例题</p><div>${btn("再练一次", "practice-start", `data-subject="${ex.subject}"`)}${btn("返回我的学习", "nav", 'data-key="home"', "quiet")}</div><p class="s-footnote">这是交互样稿成绩，未写入正式账号。</p></section>`;
  }
  const q = qs[state.question],
    options = [
      q[1],
      ...["速度", "系数", "对比", "证据", "评估", "位移"].filter(
        (x) => x !== q[1],
      ),
    ].slice(0, 5);
  const rotate = (state.question + 2) % 5;
  const choices = [...options.slice(rotate), ...options.slice(0, rotate)];
  return `<div class="sample-exam"><header>${back("leave-exam")}<span>${state.exam.formal ? "考试页面样稿" : "自主练习样稿"}</span><b>${state.question + 1} / 3</b></header><div class="exam-progress"><i style="width:${((state.question + 1) / 3) * 100}%"></i></div><div class="exam-question"><p>请结合题干，选择画线词汇的中文含义。</p><h1>${esc(q[2]).replace(esc(q[0]), `<mark>${esc(q[0])}</mark>`)}</h1><div class="answer-choices">${choices.map((v, i) => `<button data-act="answer" data-key="${esc(v)}" class="${state.answers[state.question] === v ? "selected" : ""}" aria-pressed="${state.answers[state.question] === v}"><span>${String.fromCharCode(65 + i)}</span>${esc(v)}${state.answers[state.question] === v ? I("check") : ""}</button>`).join("")}</div><div class="exam-bottom"><span>${I("user")}示例同学</span>${btn(state.question === 2 ? "提交本次练习" : "下一题", "exam-next", "", state.answers[state.question] ? "primary" : "disabled")}</div><p class="s-footnote">交互样稿 / 无实际计时 / 不保存到正式考试</p></div></div>`;
}
function content() {
  if (state.exam) return examView();
  switch (state.view) {
    case "home":
      return {
        cloud: cloudHome,
        folio: folioHome,
        sky: skyHome,
        night: nightHome,
        board: boardHome,
      }[state.style]();
    case "classes":
      return classesView();
    case "tasks":
      return tasksView();
    case "calendar":
      return calendarView();
    case "words":
      return wordsView();
    case "review":
      return wordsView(true);
    case "reports":
      return reportsView();
    case "practice":
      return practiceView();
    default:
      return cloudHome();
  }
}
function render() {
  if (!state.style) {
    $("#studio").innerHTML = gallery();
    return;
  }
  document.body.dataset.skin = state.style;
  document.body.dataset.role = state.role;
  document.body.classList.toggle("capture", capture);
  document.title = `${designs[state.style].name} / ${state.role === "teacher" ? "老师端" : "学生端"} · 词间课堂设计样稿`;
  $("#studio").innerHTML = (capture ? "" : toolbar()) + shell();
  saveURL();
}
let dialogFocus;
function dialog(title, body, footer = "") {
  dialogFocus = document.activeElement;
  $("#studio-dialog").innerHTML =
    `<div class="s-dialog-backdrop"><section class="s-dialog" role="dialog" aria-modal="true" aria-labelledby="s-dialog-title"><header><h2 id="s-dialog-title">${esc(title)}</h2><button data-act="close" aria-label="关闭">${I("close")}</button></header><div class="s-dialog-body">${body}</div>${footer ? `<footer>${footer}</footer>` : ""}</section></div>`;
  $("#studio-dialog button")?.focus();
}
function close() {
  $("#studio-dialog").replaceChildren();
  dialogFocus?.isConnected && dialogFocus.focus();
}
let publishDraft = {
  classId: "engineering",
  subject: "english",
  kind: "五选一",
};
function publish() {
  const c = classes.find((c) => c.id === publishDraft.classId);
  dialog(
    "安排一场听写",
    `<form id="sample-publish"><p class="dialog-lead">选择班级与科目，任务名称自动生成。</p><fieldset><legend>参加班级</legend><div class="dialog-class-choices">${classes.map((c) => `<button type="button" style="${tint(c)}" data-act="draft-class" data-id="${c.id}" aria-pressed="${c.id === publishDraft.classId}" class="${c.id === publishDraft.classId ? "selected" : ""}">${c.name}</button>`).join("")}</div></fieldset><fieldset><legend>本班科目</legend><div class="dialog-subject-choices">${c.subjects.map((s) => `<button type="button" data-act="draft-subject" data-key="${s}" class="${s === publishDraft.subject ? "selected" : ""}" aria-pressed="${s === publishDraft.subject}">${I(s)}${subjectName(s, c)}</button>`).join("")}</div></fieldset><div class="dialog-fields"><label>教学周<input name="week" value="W07" maxlength="20" required/></label><label>考试日期<input type="date" name="date" value="2026-11-13" required/></label><label>开放时间<input type="time" name="time" value="13:00" required/></label><label>答题时长（分钟）<input type="number" name="duration" value="15" min="1" max="180" required/></label></div><fieldset><legend>题型</legend><div class="dialog-subject-choices">${["五选一", "填空题"].map((k) => `<button type="button" data-act="draft-kind" data-key="${k}" class="${publishDraft.kind === k ? "selected" : ""}" aria-pressed="${publishDraft.kind === k}">${k}</button>`).join("")}</div></fieldset><p class="sample-note">此处发布仅用于体验样稿，不会给真实学生布置考试。</p></form>`,
    `${btn("取消", "close", "", "quiet")}<button class="s-btn primary" form="sample-publish" type="submit">在样稿中安排听写</button>`,
  );
}
function examDetail(id) {
  const e = exams.find((x) => x.id === id);
  if (!e) return;
  const c = classes.find((x) => x.id === e.classId);
  dialog(
    ETitle(e),
    `<div class="exam-detail-symbol">${I(e.subject)}</div><p class="dialog-lead">${c.name}</p><div class="exam-detail-grid"><div><small>开放时间</small><strong>${e.date.slice(5).replace("-", "月")}日 ${e.time}</strong></div><div><small>考试范围</small><strong>${e.week} / ${e.count}个词汇</strong></div><div><small>答题方式</small><strong>${e.kind} / ${e.duration}分钟</strong></div></div><p>${state.role === "teacher" ? "默认全班参加，也可以在正式发布时选择个别学生。" : "确认开始后才计时。样稿提供3题，用于体验答题页面。"}</p>`,
    `${btn("关闭", "close", "", "quiet")}${btn(state.role === "teacher" ? "查看成绩样稿" : "体验答题页面", state.role === "teacher" ? "exam-report" : "practice-start", `data-subject="${e.subject}" data-formal="1"`)}`,
  );
}
function updateDraftForm() {
  const f = $("#sample-publish");
  if (!f) return;
  state.savedDraftValues = Object.fromEntries(new FormData(f));
}
function restoreDraft() {
  if (!state.savedDraftValues) return;
  Object.entries(state.savedDraftValues).forEach(([k, v]) => {
    const f = $("#sample-publish");
    if (f?.elements[k]) f.elements[k].value = v;
  });
}
document.addEventListener("click", (e) => {
  const b = e.target.closest("[data-act]");
  if (!b) return;
  const a = b.dataset.act;
  switch (a) {
    case "style":
      state.style = b.dataset.key;
      state.exam = null;
      close();
      render();
      break;
    case "role":
      state.role = b.dataset.key;
      navigate("home");
      break;
    case "nav":
      navigate(b.dataset.key);
      break;
    case "back":
      if (state.subject) {
        state.subject = null;
        render();
      } else {
        state.classOpen = false;
        state.person = false;
        render();
      }
      break;
    case "class":
      state.classId = b.dataset.id;
      state.classOpen = true;
      state.subject = null;
      render();
      break;
    case "subject":
      state.subject = b.dataset.key;
      state.week = "W06";
      render();
      break;
    case "word-class":
      state.classId = b.dataset.id;
      state.subject = null;
      render();
      break;
    case "word-week":
      state.week = b.dataset.key;
      render();
      break;
    case "home-words":
      navigate("words", { subject: b.dataset.key });
      break;
    case "course-info":
      dialog(
        subjectName(b.dataset.key),
        contextualWord(b.dataset.key),
        btn("关闭", "close", "", "quiet"),
      );
      break;
    case "graph-week":
      state.graphWeek = Number(b.dataset.week);
      render();
      break;
    case "report-subject":
      state.reportSubject = Number(b.dataset.index);
      state.graphWeek = (state.reportSubject + 3) % 6;
      render();
      break;
    case "student-profile":
      state.person = true;
      state.classOpen = true;
      state.view = "reports";
      close();
      render();
      break;
    case "month": {
      const [y, m] = state.month.split("-").map(Number);
      state.month = new Date(Date.UTC(y, m - 1 + Number(b.dataset.delta), 1))
        .toISOString()
        .slice(0, 7);
      state.day =
        state.month === "2026-11" ? "2026-11-06" : state.month + "-01";
      render();
      break;
    }
    case "day":
      state.day = b.dataset.key;
      state.month = state.day.slice(0, 7);
      if (state.style !== "sky" || state.view !== "home")
        state.view = "calendar";
      render();
      break;
    case "notice":
      examDetail("today");
      break;
    case "exam-detail":
      examDetail(b.dataset.id);
      break;
    case "close":
      close();
      break;
    case "publish":
      publishDraft.classId = state.classId;
      publishDraft.subject = cls().subjects.includes(state.subject)
        ? state.subject
        : cls().subjects[0];
      state.savedDraftValues = null;
      publish();
      break;
    case "draft-class":
      updateDraftForm();
      publishDraft.classId = b.dataset.id;
      publishDraft.subject = classes.find(
        (c) => c.id === b.dataset.id,
      ).subjects[0];
      publish();
      restoreDraft();
      break;
    case "draft-subject":
      updateDraftForm();
      publishDraft.subject = b.dataset.key;
      publish();
      restoreDraft();
      break;
    case "draft-kind":
      updateDraftForm();
      publishDraft.kind = b.dataset.key;
      publish();
      restoreDraft();
      break;
    case "exam-report":
      close();
      navigate("reports", { classOpen: true });
      break;
    case "practice-course":
      state.subject = b.dataset.key;
      render();
      break;
    case "practice-start":
      close();
      state.exam = {
        subject: b.dataset.subject || "engineering",
        formal: b.dataset.formal === "1",
      };
      state.question = 0;
      state.answers = {};
      render();
      window.scrollTo(0, 0);
      break;
    case "answer":
      state.answers[state.question] = b.dataset.key;
      render();
      break;
    case "exam-next":
      if (!state.answers[state.question]) {
        announce("先选择一个答案，再继续。");
        break;
      }
      if (state.question === 2) state.exam.done = true;
      else state.question++;
      render();
      window.scrollTo(0, 0);
      break;
    case "leave-exam":
      state.exam = null;
      render();
      break;
    case "choose":
      try {
        localStorage.setItem("classwords-design-pick", state.style);
      } catch {}
      dialog(
        `你选择了 ${designs[state.style].n} ${designs[state.style].name}`,
        `<p class="dialog-lead">回到聊天告诉我这个编号，我就可以按这套风格继续改正式网站。</p><p>也可以告诉我想保留另一套的某个细节，例如日历布局或班级配色。</p>`,
        btn("继续比较", "close", "", "quiet"),
      );
      break;
    case "new-class":
      dialog(
        "添加班级",
        `<p class="dialog-lead">一个班级对应实际的课程和学生。</p><p>此样稿展示班级的管理布局。正式网站仍通过「班级与学生」创建班级。</p>`,
        btn("知道了", "close", "", "quiet"),
      );
      break;
    case "new-student":
      dialog(
        "添加班级学生",
        `<p class="dialog-lead">${cls().name}</p><label class="sample-label">学生姓名 · 每行一位<textarea placeholder="在正式网站中批量录入学生姓名" rows="4"></textarea></label><p class="sample-note">样稿不会创建真实账号。</p>`,
        btn("完成体验", "close"),
      );
      break;
  }
});
document.addEventListener("submit", (e) => {
  if (e.target.id !== "sample-publish") return;
  e.preventDefault();
  const d = Object.fromEntries(new FormData(e.target));
  exams.push({
    ...publishDraft,
    ...d,
    id: "sample-" + Date.now(),
    status: "upcoming",
    count: 24,
    duration: Number(d.duration),
  });
  state.day = d.date;
  state.month = d.date.slice(0, 7);
  close();
  state.view = "calendar";
  state.exam = null;
  render();
  announce("已在样稿中安排听写。");
});
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") close();
  if (
    (e.key === "Enter" || e.key === " ") &&
    e.target.matches(".trend-chart [data-act]")
  ) {
    e.preventDefault();
    e.target.dispatchEvent(new MouseEvent("click", { bubbles: true }));
  }
  const root = $("#studio-dialog .s-dialog");
  if (e.key === "Tab" && root) {
    const nodes = [...root.querySelectorAll("button,input,textarea,a")].filter(
      (x) => !x.disabled && x.getClientRects().length,
    );
    const first = nodes[0],
      last = nodes[nodes.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last?.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first?.focus();
    }
  }
});
render();
