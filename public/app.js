import {
  enrichGradeRows,
  gradeAverage,
  summarizeGrades,
  scoreBand,
} from "./analytics.js";
import {
  beijingInput,
  beijingISO,
  automaticTaskTitle,
  planSchedule,
} from "./scheduling.js";
import {
  wordAvailableFor,
  sharedWordSubjects,
  wordAvailableToClass,
} from "./word-banks.js";

const $ = (s) => document.querySelector(s);
const $$ = (s) => [...document.querySelectorAll(s)];
const esc = (v) =>
  String(v ?? "").replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );
const paths = {
  grid: "M3 3h7v7H3z M14 3h7v7h-7z M3 14h7v7H3z M14 14h7v7h-7z",
  book: "M4 4h6a3 3 0 0 1 3 3v14a4 4 0 0 0-4-2H3V4z M13 7a3 3 0 0 1 3-3h5v15h-5a4 4 0 0 0-3 2",
  clipboard:
    "M9 4H6a2 2 0 0 0-2 2v14h16V6a2 2 0 0 0-2-2h-3 M9 2h6v4H9z M8 11h8 M8 15h5",
  users:
    "M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2 M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8 M17 4a4 4 0 0 1 0 8 M22 21v-2a4 4 0 0 0-3-3.87",
  chart: "M4 3v18h17 M8 16v-4 M13 16V7 M18 16v-7",
  class: "M3 3h18v13H3z M8 21l4-5 4 5 M7 7h10 M7 11h6",
  plus: "M12 5v14 M5 12h14",
  arrow: "M5 12h14 M13 6l6 6-6 6",
  chevron: "M9 5l7 7-7 7",
  down: "M6 9l6 6 6-6",
  bell: "M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9 M10 21h4",
  search: "M21 21l-5-5 M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16",
  check: "M5 12l4 4L19 6",
  close: "M6 6l12 12 M6 18L18 6",
  clock: "M12 8v5l3 2 M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20",
  logout: "M9 5H4v14h5 M10 12h11 M17 8l4 4-4 4",
  download: "M12 3v12 M7 10l5 5 5-5 M4 16v5h16v-5",
  upload: "M12 17V3 M7 8l5-5 5 5 M4 17v4h16v-4",
  leaf: "M20 3C8 2 2 8 5 15s16 7 15-12z M5 20L15 9",
  spark: "M12 3l2.5 6.5L21 12l-6.5 2.5L12 21l-2.5-6.5L3 12l6.5-2.5z",
  economy: "M4 18V8 M10 18V4 M16 18v-8 M22 18v-5 M2 21h21",
  math: "M4 5h16 M6 10l4 4-4 4 M14 14h6",
  repeat:
    "M20 7H8a5 5 0 0 0-5 5 M20 7l-4-4 M20 7l-4 4 M4 17h12a5 5 0 0 0 5-5 M4 17l4 4 M4 17l4-4",
  shield: "M12 2l9 4v6c0 5-9 10-9 10S3 17 3 12V6z M8 12l3 3 5-6",
  menu: "M4 6h16 M4 12h16 M4 18h16",
  mail: "M3 5h18v14H3z M3 5l9 8 9-8",
  help: "M9 8a3 3 0 0 1 6 0c0 2-3 2-3 5 M12 17h.01 M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20",
};
const icon = (name, cls = "") =>
  `<svg class="icon ${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${paths[name] || paths.book}"/></svg>`;
const subjectIcon = (s) =>
  s === "Economics"
    ? "economy"
    : [
          "Mathematics",
          "Integrated Mathematics",
          "Technical Mathematics",
        ].includes(s)
      ? "math"
      : s === "Academic English"
        ? "book"
        : s === "Computer Science"
          ? "grid"
          : "leaf";
const state = {
  user: null,
  config: null,
  view: "dashboard",
  tasks: [],
  analytics: {
    program: "all",
    subject: "all",
    group: "all",
    classId: "all",
    band: "all",
  },
  taskFolders: {},
  scheduleDates: new Set(),
  scheduleOverrides: {},
  scheduleMonth: "",
  students: [],
  classes: [],
  words: [],
  learning: null,
  learningError: null,
  practiceData: null,
  practiceError: null,
  practiceSettings: {
    subject: "",
    wordGroup: "",
    questionType: "choice",
    mode: "mixed",
    duration: 15,
    mistakesOnly: false,
  },
  results: [],
  mistakes: [],
  filter: {
    program: "all",
    classId: "all",
    subject: "all",
    status: "all",
    search: "",
  },
  attempt: null,
  examResult: null,
  serverOffset: 0,
  authTab: "student",
  reminded: new Set(),
  installPrompt: null,
  requestedExamId: null,
};
let modalOpen = false,
  saveTimer,
  saveQueue = Promise.resolve(),
  saveVersion = 0,
  savedVersion = 0,
  submitting = false,
  reviewing = null;
const now = () => Date.now() + state.serverOffset;
const nameSubject = (s) => state.config?.subjectNames[s] || s;
const programShort = (p) => p?.split(" ")[0] || "";
const modeName = (m) =>
  ({
    "en-zh": "英译中",
    "zh-en": "中译英",
    mixed: "双向翻译",
    choice: "场景选择题",
  })[m] || m;
const taskModeName = (t) =>
  `${t.questionType === "choice" || t.mode === "choice" ? "选择题" : "填空题"} · ${t.mode === "choice" ? "英译中" : modeName(t.mode)}`;
const date = (v, full = false) =>
  v
    ? new Date(v).toLocaleString("zh-CN", {
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        ...(full ? { year: "numeric" } : {}),
      })
    : "—";
const shortDate = (v) =>
  new Date(v).toLocaleDateString("zh-CN", { month: "short", day: "numeric" });
const fmtLocal = (d) => {
  const v = new Date(d);
  return new Date(v.getTime() - v.getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, 16);
};
const mean = (rows) =>
  rows.length
    ? Math.round(rows.reduce((a, r) => a + r.score, 0) / rows.length)
    : null;
const clsName = (id) => state.classes.find((c) => c.id === id)?.name || "—";
function toast(message, error = false) {
  $("#toast-root").innerHTML =
    `<div class="toast ${error ? "error" : ""}" role="status">${esc(message)}</div>`;
  setTimeout(() => {
    $("#toast-root").innerHTML = "";
  }, 4500);
}
async function api(path, options = {}) {
  const response = await fetch(path, {
    credentials: "same-origin",
    ...options,
    headers: { "Content-Type": "application/json", ...options.headers },
  });
  let data;
  try {
    data = await response.json();
  } catch {
    throw new Error("服务器响应异常，请检查网络后重试。");
  }
  if (!response.ok) {
    const error = new Error(data.error || "请求失败");
    error.status = response.status;
    throw error;
  }
  if (data.serverTime) state.serverOffset = data.serverTime - Date.now();
  return data;
}
const post = (path, value = {}) =>
  api(path, { method: "POST", body: JSON.stringify(value) });
function statusOf(t) {
  if (t.attempt?.submittedAt) return ["已完成", "gray"];
  if (t.closesAt <= now()) return ["已截止", "gray"];
  if (t.opensAt > now()) return ["未开始", "blue"];
  return ["进行中", ""];
}
const badge = (text, color = "", dot = false) =>
  `<span class="badge ${color} ${dot ? "dot" : ""}">${esc(text)}</span>`;
const empty = (title, body, button = "") =>
  `<div class="empty">${icon("leaf")}<h3>${esc(title)}</h3><p>${esc(body)}</p>${button}</div>`;
function art() {
  return `<svg class="welcome-art" viewBox="0 0 300 180" fill="none" aria-hidden="true"><circle cx="191" cy="125" r="108" fill="#eee5d5"/><circle cx="191" cy="125" r="84" stroke="#cfb78e" stroke-dasharray="3 7"/><path d="M84 125l101-20 74 37-100 25z" fill="#ab834b"/><path d="M84 125v12l75 35 100-20v-10l-100 25z" fill="#80623e"/><path d="M100 105l96-18 65 33-101 21z" fill="#FFFCF5"/><path d="M100 105v13l61 31 100-20v-9l-101 21z" fill="#E9C7A2"/><path d="M112 85l86-17 64 28-93 22z" fill="#8099af"/><path d="M112 85v13l57 29 93-21V96l-93 22z" fill="#4d6c8a"/><rect x="117" y="28" width="72" height="72" rx="8" transform="rotate(-12 117 28)" fill="#FFFFFF"/><text x="143" y="69" transform="rotate(-12 143 69)" fill="#294864" font-size="29" font-family="Georgia">Aa</text><path d="M221 55c-17-21-5-34 4-32 9 2 6 19-4 32z" fill="#526f8c"/><path d="M221 55c5-26 25-28 27-17 1 9-14 15-27 17z" fill="#a5b8c8"/><path d="M216 67l7-29" stroke="#36516d" stroke-width="2"/><path d="M73 61l5 10 11 1-8 8 1 11-10-5-9 5 1-11-8-8 11-1z" fill="#d5b782"/><circle cx="251" cy="72" r="4" fill="#ab834b"/><path d="M73 145l6 6m-6 0l6-6" stroke="#ab834b" stroke-width="2"/><path d="M260 160h15" stroke="#b6c1cc" stroke-width="2"/></svg>`;
}
function brand() {
  return `<div class="brand"><div class="brand-mark">L<span>·</span></div><div class="brand-name">LexiClass<small>词 间 课 堂</small></div></div>`;
}
function navItems() {
  return state.user.role === "teacher"
    ? [
        ["dashboard", "grid", "教学概览"],
        [
          "tasks",
          "clipboard",
          "听写任务",
          state.tasks.filter((t) => statusOf(t)[0] === "进行中").length,
        ],
        ["classes", "class", "班级管理"],
        ["students", "users", "学生名单"],
        ["words", "book", "课程词库"],
        ["results", "chart", "成绩分析"],
      ]
    : [
        ["dashboard", "grid", "我的学习"],
        ["learning", "book", "词汇学习"],
        ["practice", "clipboard", "自主模拟"],
        [
          "tasks",
          "clipboard",
          "我的测试",
          state.tasks.filter(
            (t) => !t.attempt?.submittedAt && t.closesAt > now(),
          ).length,
        ],
        ["history", "chart", "历史成绩"],
        ["account", "shield", "账号设置"],
        [
          "review",
          "repeat",
          "我的错题本",
          state.mistakes.filter((m) => !m.resolved).length,
        ],
      ];
}
function shell() {
  const teacher = state.user.role === "teacher";
  const label =
    navItems().find((n) => n[0] === state.view)?.[2] ||
    (state.view === "exam-entry" ? "考试入口" : "场景听写");
  return `<div class="app-shell"><aside class="sidebar">${brand()}<div class="nav-caption">${teacher ? "MASTER WORKSPACE" : "MY LEARNING SPACE"}</div><nav class="nav" aria-label="主要导航">${navItems()
    .map(
      ([v, i, n, c]) =>
        `<button data-action="nav" data-view="${v}" class="${state.view === v ? "active" : ""}">${icon(i)}${n}${c ? `<span class="nav-count">${c}</span>` : ""}</button>`,
    )
    .join(
      "",
    )}</nav><div class="sidebar-spacer"></div><div class="side-footer"><div class="avatar">${esc(state.user.name.slice(0, 1))}</div><div><strong>${esc(state.user.name)}</strong><small>${teacher ? "Master 管理台" : "学生学习空间"}</small></div><button data-action="logout" title="退出登录" aria-label="退出登录">${icon("logout")}</button></div></aside><header class="topbar"><div class="breadcrumb"><button class="icon-button mobile-menu" data-action="menu" aria-label="展开导航">${icon("menu")}</button><span>${teacher ? "Master 管理台" : "词间课堂"}</span>${icon("chevron")}<strong>${label}</strong></div><div class="top-actions"><span class="today-label">${new Date().toLocaleDateString("zh-CN", { year: "numeric", month: "long", day: "numeric", weekday: "long" })}</span><span class="divider"></span>${teacher ? `<button class="btn btn-light btn-sm" data-action="install">${icon("download")}教师桌面快捷方式</button>` : '<span class="badge gray">网页学习</span>'}<button class="icon-button" data-action="help" title="使用帮助" aria-label="使用帮助">${icon("help")}</button><span class="avatar">${esc(state.user.name.slice(0, 1))}</span></div></header>${state.user.isDemo ? `<div class="demo-banner">演示空间 · 所有姓名与成绩均为示例，和正式班级隔离。${teacher ? '<button data-action="demo-pick">体验学生端 →</button>' : '<button data-action="demo-teacher">返回教师端 →</button>'}</div>` : ""}${state.user.role === "student" && state.user.initialPassword ? '<div class="demo-banner">账号已由老师开通，你可以设置自己的登录密码。<button data-action="nav" data-view="account">修改密码 →</button></div>' : ""}<div id="connection-status">${!navigator.onLine ? '<div class="connection-banner">当前离线。测试和提交需要联网，请保持应用打开并恢复连接。</div>' : ""}</div><main class="main ${teacher ? "" : "student-main"}" id="main-view">${content()}</main><footer class="main page-footer"><span>LexiClass 词间课堂 · 让词汇在语境中生长</span><span>${teacher ? "UNSW · NCUK · UOW" : "每一个进步，都值得被记录。"}</span></footer></div>`;
}
function heading(title, subtitle, actions = "") {
  return `<div class="page-heading"><div><h1>${title}</h1><p>${subtitle}</p></div><div class="heading-actions">${actions}</div></div>`;
}
function stat(label, value, unit, ic, foot, color = "") {
  return `<div class="stat-card"><div class="stat-top">${label}<span class="stat-icon ${color}">${icon(ic)}</span></div><div class="stat-number mono">${value ?? "—"}<small>${unit}</small></div><div class="stat-foot">${foot}</div></div>`;
}
function classCards(classes = state.classes) {
  return classes
    .map(
      (c) =>
        `<div class="class-card clickable" data-action="class-detail" data-id="${c.id}" tabindex="0" role="button"><div class="program-label">${esc(programShort(c.program))} FOUNDATION</div><h3>${esc(c.name)}</h3><p>${esc(c.program)}</p><p class="muted">${(c.courses || []).map((course) => esc(course.title)).join(" · ") || "科目尚未配置"}</p><button class="btn btn-light btn-sm" data-action="class-courses" data-id="${c.id}">课程内容</button><div class="class-card-bottom"><div class="mini-avatars">${state.students
          .filter((s) => s.classId === c.id)
          .slice(0, 4)
          .map((s) => `<span>${esc(s.name.slice(-1))}</span>`)
          .join(
            "",
          )}</div><span>${c.studentCount} 位学生 &nbsp; ${icon("arrow")}</span></div></div>`,
    )
    .join("");
}
function recentTask(t) {
  const [label, color] = statusOf(t);
  return `<div class="task-row"><div class="subject-icon ${t.subject}">${icon(subjectIcon(t.subject))}</div><div class="task-detail"><div class="task-title">${esc(t.title)}</div><div class="task-meta"><span>${esc(programShort(t.program))} · ${esc(nameSubject(t.subject))}</span><span>·</span><span>${t.questionCount} 题 / ${t.duration} 分钟</span><span>·</span><span>${t.classIds.map(clsName).map(esc).join("、")}</span></div></div><div class="task-side">${badge(label, color, true)}<p>${t.submitted} / ${t.studentCount} 已提交</p></div><button class="btn btn-quiet" data-action="task-results" data-id="${t.id}" title="查看成绩">${icon("chevron")}</button></div>`;
}
function gradeData() {
  const a = state.analytics;
  const all = enrichGradeRows(
    state.results,
    state.tasks,
    state.words,
    state.classes,
  );
  const scope = all.filter(
    (r) =>
      (a.program === "all" || r.program === a.program) &&
      (a.subject === "all" || r.subject === a.subject) &&
      (a.classId === "all" || r.classId === a.classId),
  );
  const rows = scope.filter(
    (r) =>
      a.group === "all" ||
      (a.group === "ungrouped" ? !r.groups.length : r.groups.includes(a.group)),
  );
  return { all, scope, rows };
}
function dashboard() {
  const a = state.analytics,
    { all, scope, rows } = gradeData();
  const projectRows = all.filter(
    (r) => a.program === "all" || r.program === a.program,
  );
  const subjects = [
    ...new Set([
      ...projectRows.map((r) => r.subject),
      ...state.classes
        .filter((c) => a.program === "all" || c.program === a.program)
        .flatMap((c) => (c.courses || []).map((x) => x.subject)),
    ]),
  ];
  const groups = [...new Set(scope.flatMap((r) => r.groups))].sort((x, y) =>
    x.localeCompare(y, "zh-CN", { numeric: true }),
  );
  const done = rows.filter(
    (r) => r.state === "submitted" && Number.isFinite(r.score),
  );
  const bands = [
    ["high", "80–100 分"],
    ["middle", "60–79 分"],
    ["low", "低于 60 分"],
    ["pending", "尚未提交"],
  ];
  const detail = rows.filter(
    (r) => a.band === "all" || scoreBand(r) === a.band,
  );
  const students = summarizeGrades(detail, "studentId").sort(
    (x, y) => (x.average ?? -1) - (y.average ?? -1),
  );
  const weekly = summarizeGrades(scope, "groups").sort((x, y) =>
    x.value.localeCompare(y.value, "zh-CN", { numeric: true }),
  );
  const classStats = summarizeGrades(rows, "classId");
  return `${heading("教学概览", "按项目、科目与教学周追踪成绩，点击图表查看学生明细。", `<a class="btn btn-light" href="/design-options.html" target="_blank" rel="noopener">五种界面预览 ↗</a><button class="btn btn-primary" data-action="create-task">${icon("plus")}发布听写</button>`)}
  <section class="panel grade-filters"><label>课程项目<select data-grade="program" aria-label="成绩项目">${option("all", "全部项目", a.program)}${state.config.programs.map((p) => option(p, p, a.program)).join("")}</select></label><label>科目<select data-grade="subject" aria-label="成绩科目">${option("all", "全部科目", a.subject)}${subjects.map((s) => option(s, nameSubject(s), a.subject)).join("")}</select></label><label>周次 / Topic<select data-grade="group" aria-label="成绩周次">${option("all", "全部周次 / Topic", a.group)}${groups.map((g) => option(g, g, a.group)).join("")}${scope.some((r) => !r.groups.length) ? option("ungrouped", "未标注周次 / 单元", a.group) : ""}</select></label><label>班级<select data-grade="classId" aria-label="成绩班级">${option("all", "全部班级", a.classId)}${state.classes
    .filter(
      (c) =>
        (a.program === "all" || c.program === a.program) &&
        (a.subject === "all" ||
          (c.courses || []).some((x) => x.subject === a.subject)),
    )
    .map((c) => option(c.id, c.name, a.classId))
    .join(
      "",
    )}</select></label><button class="btn btn-light" data-action="grade-reset">重置</button></section>
  <section class="stats-grid">${stat("平均成绩", gradeAverage(rows), "分", "chart", `基于 ${done.length} 份有效提交`, "blue")}${stat("提交率", rows.length ? Math.round((done.length / rows.length) * 100) : 0, "%", "check", `${done.length} / ${rows.length} 份应交练习`)}${stat("应考学生", new Set(rows.map((r) => r.studentId)).size, "位", "users", "按当前筛选范围统计")}${stat("达到 80 分", done.filter((r) => r.score >= 80).length, "份", "spark", "未交卷不计入平均分", "purple")}</section>
  <section class="grade-charts"><div class="panel"><div class="panel-header"><div><h2>周次成绩趋势</h2><p>点击柱形筛选周次 · 柱高为平均分</p></div></div><div class="grade-week-chart" role="group" aria-label="周次成绩趋势">${weekly.map((g) => `<button class="grade-week ${a.group === g.value ? "selected" : ""}" data-action="grade-group" data-group="${esc(g.value)}" aria-pressed="${a.group === g.value}" title="${esc(g.value)}：${g.average ?? "暂无"}分，${g.submitted}/${g.total}份已交"><b>${g.average ?? "—"}</b><span class="grade-track"><i style="height:${Math.max(2, g.average ?? 0)}%"></i></span><small>${esc(g.value.replace("Week ", "W"))}</small><em>${g.submitted}/${g.total} 已交</em></button>`).join("") || '<p class="muted">尚无考试记录</p>'}</div></div>
  <div class="panel"><div class="panel-header"><div><h2>成绩分布</h2><p>点击分数段查看对应学生</p></div></div><div class="grade-distribution">${bands
    .map(([key, label]) => {
      const n = rows.filter((r) => scoreBand(r) === key).length;
      return `<button data-action="grade-band" data-band="${key}" class="grade-band ${a.band === key ? "selected" : ""}" aria-pressed="${a.band === key}"><span>${label}</span><span class="grade-band-track"><i style="width:${rows.length ? (n / rows.length) * 100 : 0}%"></i></span><b>${n}</b></button>`;
    })
    .join(
      "",
    )}<button class="btn btn-quiet" data-action="grade-band" data-band="all">显示全部分数段</button></div></div></section>
  <section class="panel grade-class-panel"><div class="panel-header"><div><h2>班级对比</h2><p>点击班级进一步筛选</p></div></div><div class="grade-class-chart">${classStats.map((c) => `<button data-action="grade-class" data-id="${esc(c.value)}" title="查看${esc(clsName(c.value))}"><span>${esc(clsName(c.value))}</span><i style="width:${Math.max(1, c.average ?? 0)}%"></i><b>${c.average ?? "—"} 分</b><small>${c.submitted}/${c.total} 已交</small></button>`).join("") || '<p class="muted">当前范围没有考试</p>'}</div></section>
  <section class="panel"><div class="panel-header"><div><h2>学生成绩明细 ${a.band !== "all" ? `· ${bands.find((b) => b[0] === a.band)?.[1] || ""}` : ""}</h2><p>点击学生查看本范围内每次听写、分数与用时</p></div><span class="badge gray">${students.length} 位学生</span></div><div class="table-wrap"><table><thead><tr><th>姓名</th><th>班级</th><th>平均分</th><th>已交 / 应交</th><th>最低 / 最高分</th><th>查看</th></tr></thead><tbody>${students
    .map((s) => {
      const scores = s.rows
        .filter((r) => r.state === "submitted" && Number.isFinite(r.score))
        .map((r) => r.score);
      const r = s.rows[0];
      return `<tr><td><button class="section-link" data-action="grade-student" data-id="${esc(s.value)}">${esc(r.name)}</button></td><td>${esc(r.className)}</td><td><strong>${s.average ?? "—"}</strong></td><td>${s.submitted} / ${s.total}</td><td>${scores.length ? `${Math.min(...scores)} / ${Math.max(...scores)}` : "—"}</td><td><button class="btn btn-light btn-sm" data-action="grade-student" data-id="${esc(s.value)}">查看考试</button></td></tr>`;
    })
    .join(
      "",
    )}</tbody></table></div>${!students.length ? empty("暂无对应成绩", "调整筛选，或等待学生参加考试。") : ""}</section><p class="privacy-note">周次来自考试词汇分组；跨周考试在涉及的各周展示同一份成绩，总体统计不重复。无法识别周次的历史考试归入“未标注周次 / 单元”。尚未提交包括待开放、待完成、答题中和逾期未交。</p>`;
}
function option(value, label, current) {
  return `<option value="${esc(value)}" ${current === value ? "selected" : ""}>${esc(label)}</option>`;
}
function filters({
  program = true,
  classes = false,
  subject = false,
  subjectOptions = state.config.subjects,
  search = false,
} = {}) {
  return `<div class="toolbar">${search ? `<div class="search-field">${icon("search")}<input data-filter="search" aria-label="搜索" placeholder="搜索${state.view === "students" ? "姓名" : "名称或词汇"}…" value="${esc(state.filter.search)}"></div>` : ""}${program ? `<select data-filter="program" aria-label="按课程项目筛选">${option("all", "全部课程项目", state.filter.program)}${state.config.programs.map((p) => option(p, p, state.filter.program)).join("")}</select>` : ""}${
    classes
      ? `<select data-filter="classId" aria-label="按班级筛选">${option("all", "全部班级", state.filter.classId)}${state.classes
          .filter(
            (c) =>
              state.filter.program === "all" ||
              c.program === state.filter.program,
          )
          .map((c) => option(c.id, c.name, state.filter.classId))
          .join("")}</select>`
      : ""
  }${subject ? `<select data-filter="subject" aria-label="按科目筛选">${option("all", "全部科目", state.filter.subject)}${subjectOptions.map((s) => option(s, nameSubject(s), state.filter.subject)).join("")}</select>` : ""}</div>`;
}
const taskSubjectForClass = (t, c) =>
  t.program === "NCUK 国际预科" && t.subject === "Mathematics"
    ? c?.courses?.find((x) =>
        ["Integrated Mathematics", "Technical Mathematics"].includes(x.subject),
      )?.subject || t.subject
    : t.subject;

function filteredTasks() {
  return state.tasks.filter(
    (t) =>
      (state.filter.program === "all" || t.program === state.filter.program) &&
      (state.filter.classId === "all" ||
        t.classIds.includes(state.filter.classId)) &&
      (state.filter.subject === "all" ||
        t.subject === state.filter.subject ||
        t.classIds.some(
          (cid) =>
            (state.filter.classId === "all" || cid === state.filter.classId) &&
            taskSubjectForClass(
              t,
              state.classes.find((c) => c.id === cid),
            ) === state.filter.subject,
        )) &&
      (state.filter.search === "" ||
        t.title.toLowerCase().includes(state.filter.search.toLowerCase())),
  );
}
function tasksView() {
  const tasks = filteredTasks();
  const classes = state.classes
    .filter((c) => tasks.some((t) => t.classIds.includes(c.id)))
    .sort(
      (a, b) =>
        a.program.localeCompare(b.program) ||
        a.name.localeCompare(b.name, "zh-CN", { numeric: true }),
    );
  const tree = classes
    .map((c) => {
      const rows = tasks.filter((t) => t.classIds.includes(c.id));
      const subjects = [
        ...new Set(rows.map((t) => taskSubjectForClass(t, c))),
      ].sort((a, b) => nameSubject(a).localeCompare(nameSubject(b), "zh-CN"));
      const classKey = `class:${c.id}`;
      return `<details class="task-class-folder" data-task-folder="${classKey}" ${(state.taskFolders[classKey] ?? state.filter.classId !== "all") ? "open" : ""}><summary><span>${esc(c.name)}<small>${esc(c.program)}</small></span><span>${subjects.length} 门科目 · ${rows.length} 次听写</span></summary>${subjects
        .map((subject) => {
          const key = `${c.id}:${subject}`,
            entries = rows
              .filter((t) => taskSubjectForClass(t, c) === subject)
              .sort((a, b) => b.opensAt - a.opensAt);
          return `<details class="task-subject-folder" data-task-folder="${key}" ${(state.taskFolders[key] ?? state.filter.subject !== "all") ? "open" : ""}><summary><strong>${esc(nameSubject(subject))}</strong><span>${entries.length} 次听写</span></summary><div class="task-list-head"><span>听写名称 / 题型</span><span>开放 / 截止</span><span>提交</span><span>状态</span><span>操作</span></div>${entries
            .map((t) => {
              const [label, color] = statusOf(t);
              return `<article class="task-table-row"><div><strong>${esc(t.title)}</strong><small>${t.questionCount} 题 · ${t.duration} 分钟 · ${esc(taskModeName(t))}</small></div><div>${date(t.opensAt)}<small>至 ${date(t.closesAt)}</small></div><div>${t.submitted} / ${t.studentCount}</div><div>${badge(label, color, true)}</div><div class="task-actions"><button class="btn btn-light btn-sm" data-action="task-share" data-id="${t.id}">链接</button><button class="btn btn-light btn-sm" data-action="task-results" data-id="${t.id}">成绩</button><button class="btn btn-danger btn-sm" data-action="delete-task" data-id="${t.id}">删除</button></div></article>`;
            })
            .join("")}</details>`;
        })
        .join("")}</details>`;
    })
    .join("");
  return `${heading("听写任务", "按班级与科目归档，展开查看具体考试。", `<button class="btn btn-light" data-action="task-folders" data-open="false">全部收起</button><button class="btn btn-light" data-action="task-folders" data-open="true">全部展开</button><button class="btn btn-primary" data-action="create-task">${icon("plus")}发布听写</button>`)}${filters({ classes: true, subject: true, search: true })}<div class="task-tree">${tree || empty("没有匹配的任务", "可调整筛选条件，或发布新的听写。")}</div>`;
}
function classesView() {
  const classes = state.classes.filter(
    (c) => state.filter.program === "all" || c.program === state.filter.program,
  );
  return `${heading("班级管理", "所有课程项目，一个清晰有序的教学空间。", `<button class="btn btn-primary" data-action="create-class">${icon("plus")}新建班级</button>`)}${filters()}<div class="class-cards">${classCards(classes)}</div>${!classes.length ? empty("从一个班级开始", "选择课程项目，创建班级后添加学生。", `<button class="btn btn-primary" data-action="create-class">新建班级</button>`) : ""}`;
}
function studentsView() {
  const rows = state.students.filter(
    (s) =>
      (state.filter.program === "all" || s.program === state.filter.program) &&
      (state.filter.classId === "all" || s.classId === state.filter.classId) &&
      s.name.includes(state.filter.search),
  );
  return `${heading("学生名单", "每一位学生的练习与进步，都有迹可循。", `<button class="btn btn-light" data-action="export-students">${icon("download")}导出名单</button><button class="btn btn-primary" data-action="add-students">${icon("plus")}添加学生</button>`)}${filters({ classes: true, search: true })}<div class="panel"><div class="panel-header"><h2>班级学生 <small class="muted">&nbsp; ${rows.length} 位</small></h2><span class="muted" style="font-size:10px">学生通过账号登录，考试与错题跨设备保存</span></div><div class="table-wrap"><table><thead><tr><th>学生姓名</th><th>网页账号</th><th>课程项目 / 班级</th><th>完成听写</th><th>平均成绩</th><th>待复习错词</th><th>账号与操作</th></tr></thead><tbody>${rows.map((s) => `<tr><td><div class="person"><span class="avatar">${esc(s.name.slice(-1))}</span><strong>${esc(s.name)}</strong></div></td><td>${esc(s.username || "尚未开通")}<div class="table-secondary">${s.accountReady ? "已开通" : "等待学生开通"}</div></td><td>${esc(clsName(s.classId))}<div class="table-secondary">${esc(s.program)}</div></td><td>${s.attempts} 次</td><td><span class="score ${s.average !== null && s.average < 60 ? "low" : ""}">${s.average ?? "—"}</span>${s.average !== null ? ' <small class="muted">分</small>' : ""}</td><td>${s.mistakes ? badge(`${s.mistakes} 个`, "gold") : '<span class="muted">暂无</span>'}</td><td><button class="btn btn-light btn-sm" data-action="student-invite" data-id="${s.id}">${icon("repeat")}重置并获取入口</button><button class="btn btn-danger btn-sm" data-action="delete-student" data-id="${s.id}">删除学生</button></td></tr>`).join("")}</tbody></table></div>${!rows.length ? empty("这里还没有学生", "先创建班级，再批量添加学生姓名。") : ""}</div>`;
}
function wordSubjects(program) {
  if (program === "all") return state.config.subjects;
  const available = new Set([
    ...state.classes
      .filter((c) => c.program === program)
      .flatMap((c) => (c.courses || []).map((course) => course.subject)),
    ...state.words.filter((w) => w.program === program).map((w) => w.subject),
    ...sharedWordSubjects(program),
  ]);
  return state.config.subjects.filter((subject) => available.has(subject));
}
function wordsView() {
  const subjects = wordSubjects(state.filter.program);
  if (
    state.filter.subject !== "all" &&
    !subjects.includes(state.filter.subject)
  ) {
    state.filter.subject = "all";
    state.filter.group = "all";
    state.wordLimit = 60;
  }
  const available = state.words.filter(
    (w) =>
      (w.program !== "通用示例" || subjects.includes(w.subject)) &&
      wordAvailableFor(w, state.filter.program, state.filter.subject),
  );
  const groups = [...new Set(available.flatMap((w) => w.groups || []))].sort(
    (a, b) => a.localeCompare(b, "en", { numeric: true }),
  );
  const group = groups.includes(state.filter.group)
    ? state.filter.group
    : "all";
  const words = available.filter(
    (w) =>
      (group === "all" || (w.groups || []).includes(group)) &&
      `${w.term} ${w.translation}`
        .toLowerCase()
        .includes(state.filter.search.toLowerCase()),
  );
  return `${heading("课程词库", "从专业词汇到真实题干，让理解多走一步。", `<button class="btn btn-light" data-action="import-words">${icon("upload")}批量导入</button><button class="btn btn-primary" data-action="add-word">${icon("plus")}添加词汇</button>`)}<div class="alert">${icon("book")} 内置内容为自编场景示例，并非 UNSW、NCUK 或 UOW 官方课程词表。请按实际教材和授课范围补充词汇。中文答案按老师设置的释义及可接受答案匹配。</div>${filters({ subject: true, subjectOptions: subjects, search: true })}<div class="toolbar"><select data-filter="group" aria-label="按Topic、周次或单元筛选">${option("all", "全部 Topic / 周次 / 单元", group)}${groups.map((g) => option(g, g, group)).join("")}</select><span class="muted">共 ${words.length} 条 · 已显示 ${Math.min(words.length, state.wordLimit || 60)} 条</span></div><div class="cards-grid">${words
    .slice(0, state.wordLimit || 60)
    .map(
      (w) =>
        `<article class="word-card">${badge(nameSubject(state.filter.program === "UOW 沃隆港预科" && state.filter.subject !== "all" ? state.filter.subject : w.subject), "gray")} ${badge(w.program === "通用示例" ? "通用场景" : state.filter.program === "UOW 沃隆港预科" && w.program === "UNSW 新南预科" ? "新南共用词库" : programShort(w.program))}<h3>${esc(w.term)}</h3><p class="translation">${esc(w.translation)}</p><div class="word-sentence">${highlight(w.sentence, w.term)}</div><p class="table-secondary" style="line-height:1.9;margin-bottom:14px">${esc(w.sentenceZh)}</p><footer><span>${esc(w.source)}</span></footer></article>`,
    )
    .join(
      "",
    )}</div>${words.length > (state.wordLimit || 60) ? `<button class="btn btn-light" data-action="more-words">加载更多词汇</button>` : ""}${!words.length ? empty("还没有匹配的词汇", "添加本学科词汇和场景句，或调整筛选条件。") : ""}`;
}
function visibleResults() {
  return enrichGradeRows(
    state.results,
    state.tasks,
    state.words,
    state.classes,
  ).filter(
    (r) =>
      (!state.resultTaskId || r.taskId === state.resultTaskId) &&
      (state.filter.program === "all" || r.program === state.filter.program) &&
      (state.filter.classId === "all" || r.classId === state.filter.classId) &&
      (state.filter.subject === "all" || r.subject === state.filter.subject) &&
      `${r.name} ${r.taskTitle}`.includes(state.filter.search),
  );
}
function resultsView() {
  const rows = visibleResults(),
    done = rows.filter((r) => r.score !== null);
  return `${heading("成绩分析", "看见每次提交，也看见需要多一点帮助的学生。", `<button class="btn btn-light" data-action="export-results">${icon("download")}导出成绩 CSV</button>`)}<div class="stats-grid">${stat("应交练习", rows.length, "份", "clipboard", "按当前筛选范围统计")}${stat("已交练习", done.length, "份", "check", `提交率 <strong>${rows.length ? Math.round((done.length / rows.length) * 100) : 0}%</strong>`, "blue")}${stat("平均成绩", mean(done), "分", "chart", "每份听写按 100 分制计分", "gold")}${stat("达到 80 分", done.filter((r) => r.score >= 80).length, "份", "spark", "用于识别当前词汇掌握情况", "purple")}</div>${state.resultTaskId ? `<div class="alert">当前任务：${esc(state.tasks.find((t) => t.id === state.resultTaskId)?.title)} <button class="btn btn-quiet" data-action="clear-task-filter">查看全部任务 ×</button></div>` : ""}${filters({ classes: true, subject: true, search: true })}<div class="panel"><div class="table-wrap"><table><thead><tr><th>学生姓名</th><th>项目 / 班级</th><th>听写任务</th><th>成绩</th><th>考试用时</th><th>状态 / 提交时间</th><th>答题详情</th></tr></thead><tbody>${rows.map((r) => `<tr><td><div class="person"><span class="avatar">${esc(r.name.slice(-1))}</span>${esc(r.name)}</div></td><td>${esc(r.className)}<div class="table-secondary">${esc(programShort(r.program))} · ${esc(nameSubject(r.subject))}</div></td><td>${esc(r.taskTitle)}</td><td><span class="score ${r.score !== null && r.score < 60 ? "low" : ""}">${r.score ?? "—"}</span></td><td><strong>${r.state === "in_progress" ? "答题中" : formatElapsed(r.elapsedSeconds)}</strong></td><td>${badge({ submitted: r.timedOut ? "超时自动交卷" : "已提交", pending: "待完成", in_progress: "答题中", missing: "未提交" }[r.state], r.state === "missing" ? "red" : r.state === "submitted" ? "" : "blue")}<div class="table-secondary">${r.finishedAt ? date(r.finishedAt) : "—"}</div></td><td>${r.result ? `<button class="btn btn-light btn-sm" data-action="result-detail" data-task="${r.taskId}" data-student="${r.studentId}">查看详情</button>` : '<span class="muted">—</span>'}</td></tr>`).join("")}</tbody></table></div>${!rows.length ? empty("暂无成绩记录", "发布任务后，这里会展示每位学生的完成状态。") : ""}</div>`;
}
function learningView() {
  const data = state.learning;
  if (state.learningError)
    return (
      heading("词汇学习", "所有 Topic、周次与单元长期开放。") +
      empty(
        "词汇加载失败",
        state.learningError,
        '<button class="btn btn-light" data-action="nav" data-view="learning">重新加载</button>',
      )
    );
  if (!data)
    return (
      heading(
        "词汇学习",
        "按你的班级和科目，随时学习所有 Topic、周次与单元。",
      ) + empty("正在加载词汇", "请稍候…")
    );
  const subjects = data.subjects;
  const groupName =
    ["Business", "Economics"].includes(state.filter.subject) &&
    data.program === "NCUK 国际预科"
      ? "Topic"
      : "Topic / 周次 / 单元";
  if (
    state.filter.subject !== "all" &&
    !subjects.includes(state.filter.subject)
  ) {
    state.filter.subject = "all";
    state.filter.group = "all";
  }
  const available = data.words.filter(
    (w) => state.filter.subject === "all" || w.subject === state.filter.subject,
  );
  const groups = [...new Set(available.flatMap((w) => w.groups))].sort((a, b) =>
    a.localeCompare(b, "en", { numeric: true }),
  );
  const group =
    groups.includes(state.filter.group) || state.filter.group === "ungrouped"
      ? state.filter.group
      : "all";
  const search = state.filter.search.toLowerCase();
  const words = available.filter(
    (w) =>
      (group === "all" ||
        (group === "ungrouped"
          ? !w.groups.length
          : w.groups.includes(group))) &&
      `${w.term} ${w.translation}`.toLowerCase().includes(search),
  );
  const limit = state.wordLimit || 60;
  return `${heading("词汇学习", `${data.className} · ${data.program === "NCUK 国际预科" ? "全部分组长期开放" : "全部周次与单元长期开放"}，无需等待老师发布考试。`)}<div class="alert">${icon("book")} 选择科目及${groupName}即可学习，支持预习与回顾。内容包含词汇、中文释义和双语场景例句；场景例句为教学材料，并非官方试题。</div>${filters({ program: false, subject: true, subjectOptions: subjects, search: true })}<div class="toolbar"><select data-filter="group" aria-label="按分组学习">${option("all", `全部 ${groupName}`, group)}${groups.map((g) => option(g, g, group)).join("")}${available.some((w) => !w.groups.length) ? option("ungrouped", "未分组词汇", group) : ""}</select><span class="muted">共 ${words.length} 条 · 已显示 ${Math.min(words.length, limit)} 条</span></div><div class="cards-grid">${words
    .slice(0, limit)
    .map(
      (w) =>
        `<article class="word-card">${badge(nameSubject(w.subject), "gray")}<h3>${esc(w.term)}</h3><p class="translation">${esc(w.translation)}</p><div class="word-sentence">${highlight(w.sentence, w.term)}</div><p class="table-secondary" style="line-height:1.9">${esc(w.sentenceZh)}</p><footer><span>${esc(w.groups.join(" · ") || "未分组")}</span></footer></article>`,
    )
    .join(
      "",
    )}</div>${words.length > limit ? '<button class="btn btn-light" data-action="more-words">加载更多词汇</button>' : ""}${!words.length ? empty("暂无匹配词汇", subjects.length ? "可切换科目、周次或搜索条件；尚未录入的科目需由 master 补充词库。" : "班级尚未配置科目，请联系 master。") : ""}`;
}
function studyButton(t, small = true) {
  if (t.attempt && !t.attempt.submittedAt) return "";
  return `<button class="btn btn-light ${small ? "btn-sm" : ""}" data-action="study-task" data-id="${t.id}">${icon("book")}学习词汇</button>`;
}
async function studyTask(taskId) {
  if (state.attempt) throw new Error("请先提交当前测试，再查看学习词汇。");
  const { task, words } = await api(
    `/api/tasks/${encodeURIComponent(taskId)}/study`,
  );
  modal(
    "考前学习 · 本次考试词汇",
    `${task.title} · ${nameSubject(task.subject)} · ${words.length} 个词汇`,
    `<div class="alert">考试时间：${date(task.opensAt, true)} — ${date(task.closesAt, true)}<br>这是本次考试要考的词汇。提前学习不计时；点击「开始测试」才开始计时。</div><div class="study-word-grid">${words.map((w, i) => `<article class="word-card"><span class="eyebrow">WORD ${String(i + 1).padStart(2, "0")}</span><h3>${esc(w.term)}</h3><p class="translation">${esc(w.translation)}</p><div class="word-sentence">${highlight(w.sentence, w.term)}</div><p class="table-secondary" style="line-height:1.9">${esc(w.sentenceZh)}</p></article>`).join("")}</div>`,
    `<button class="btn btn-primary" data-action="close-modal">完成学习</button>`,
    true,
  );
}
function studentTaskCard(t) {
  const [label, color] = statusOf(t),
    done = !!t.attempt?.submittedAt;
  return `<article class="assignment-card"><div class="assignment-top"><div class="subject-icon ${t.subject}">${icon(subjectIcon(t.subject))}</div>${badge(label, color, true)}</div><h3>${esc(t.title)}</h3><p>${esc(nameSubject(t.subject))} · ${esc(taskModeName(t))}</p>${done ? `<div class="student-score">${t.attempt.score}<small> / 100 分</small></div>` : `<div class="assignment-stats"><span><strong>${t.questionCount}</strong>题</span><span><strong>${t.duration}</strong>分钟</span></div>`}<p>${icon("clock")} ${t.opensAt > now() ? "开始" : "截止"}：${date(t.opensAt > now() ? t.opensAt : t.closesAt)}</p><div class="assignment-bottom" style="margin-top:18px"><span>${done ? `用时 ${formatElapsed(t.attempt.elapsedSeconds)}` : "提交后自动整理错题"}</span><div class="task-actions">${studyButton(t)}<button class="btn ${done ? "btn-light" : "btn-primary"} btn-sm" data-action="${done ? "student-result" : "start-task"}" data-id="${t.id}" ${!done && (t.opensAt > now() || t.closesAt <= now()) ? "disabled" : ""}>${done ? "查看结果" : t.attempt ? "继续答题" : t.opensAt > now() ? "等待开始" : t.closesAt <= now() ? "已截止" : "开始测试"} ${icon("arrow")}</button></div></div></article>`;
}
async function loadPractice(more = false, forceLearning = false) {
  const before = more ? state.practiceData?.nextBefore : null;
  const [learning, data] = await Promise.all([
    forceLearning ||
    !state.learning ||
    state.practiceLearningUser !== state.user.id ||
    !state.practiceLearningAt ||
    Date.now() - state.practiceLearningAt > 300000
      ? api("/api/learning").then((data) => {
          state.practiceLearningAt = Date.now();
          state.practiceLearningUser = state.user.id;
          return data;
        })
      : Promise.resolve(state.learning),
    api(`/api/practice${before ? `?before=${before}` : ""}`),
  ]);
  state.learning = learning;
  if (more)
    data.attempts = [...(state.practiceData?.attempts || []), ...data.attempts];
  state.practiceData = data;
  state.practiceError = null;
}
function practiceFormSettings() {
  const form = $("#practice-form");
  if (form) {
    const fd = new FormData(form);
    state.practiceSettings = {
      ...Object.fromEntries(fd),
      mistakesOnly: fd.has("mistakesOnly"),
    };
  }
  return state.practiceSettings;
}
function practiceWords() {
  const s = state.practiceSettings;
  return (state.learning?.words || []).filter(
    (w) => w.subject === s.subject && w.groups?.includes(s.wordGroup),
  );
}
function studentPracticeView() {
  const h = heading(
    "自主模拟",
    "任意周次，随时练习。词汇跟随课程，题面与选项每次重新组合。",
  );
  if (state.practiceError)
    return (
      h +
      empty(
        "模拟考试暂时无法加载",
        state.practiceError,
        '<button class="btn btn-light" data-action="practice-refresh">重试</button>',
      )
    );
  if (!state.practiceData || !state.learning)
    return h + empty("正在准备你的课程", "正在载入各科词汇与模拟记录…");
  const subjects = state.learning.subjects.filter((s) =>
    state.learning.words.some((w) => w.subject === s),
  );
  if (!subjects.length)
    return (
      h +
      empty(
        "暂时没有可练习的词汇",
        "班级词库录入后，各周词汇会自动开放，无需发布考试。",
      )
    );
  const s = state.practiceSettings;
  if (!subjects.includes(s.subject)) s.subject = subjects[0];
  const groups = [
    ...new Set(
      state.learning.words
        .filter((w) => w.subject === s.subject)
        .flatMap((w) => w.groups),
    ),
  ].sort((a, b) => a.localeCompare(b, "en", { numeric: true }));
  if (!groups.includes(s.wordGroup)) s.wordGroup = groups[0] || "";
  const words = practiceWords(),
    data = state.practiceData;
  const wrong = data.mistakes.filter(
    (m) =>
      m.subject === s.subject &&
      (m.wordGroup === s.wordGroup || m.question.groups?.includes(s.wordGroup)),
  );
  const wrongIds = new Set(wrong.map((m) => m.question.wordId));
  const questionCount = s.mistakesOnly
    ? words.filter((w) => wrongIds.has(w.id)).length
    : words.length;
  const active = data.attempts.find((a) => !a.submittedAt);
  const completed =
    data.stats?.completed ??
    data.attempts.filter((a) => a.submittedAt && !a.abandoned).length;
  return `${h}<section class="panel practice-intro"><div><div class="eyebrow">YOUR OWN PRACTICE ROOM</div><h2>按你的节奏，再练一遍。</h2><p>不需要老师发布，不限制练习次数。选择本班科目与周次，开始你自己的模拟考试。</p></div><span class="practice-label">课程词库 · 独立模拟成绩</span></section>
  ${active ? `<section class="practice-active"><div><strong>有一场未完成的模拟</strong><p>${esc(active.title)} · ${active.questionCount} 题 · 还可继续作答</p></div><button class="btn btn-light" data-action="practice-open" data-id="${active.id}">继续模拟 ${icon("arrow")}</button></section>` : ""}
  <div class="practice-layout"><section class="panel practice-setup"><h2>创建模拟考试</h2><form id="practice-form"><div class="form-grid"><label class="form-field"><span>科目</span><select name="subject" data-practice-setting="subject" aria-label="模拟科目">${subjects.map((v) => option(v, nameSubject(v), s.subject)).join("")}</select></label><label class="form-field"><span>周次 / Topic</span><select name="wordGroup" data-practice-setting="wordGroup" aria-label="模拟周次" required>${groups.map((g) => option(g, g, s.wordGroup)).join("")}</select></label><label class="form-field"><span>题型</span><select name="questionType" data-practice-setting="questionType">${option("choice", "选择题 · 五选一", s.questionType)}${option("fill", "填空题 · 手动输入", s.questionType)}</select></label><label class="form-field"><span>翻译方向</span><select name="mode" data-practice-setting="mode">${["mixed", "en-zh", "zh-en"].map((m) => option(m, modeName(m), s.mode)).join("")}</select></label><label class="form-field full"><span>模拟时长（分钟）</span><input type="number" name="duration" value="${esc(s.duration)}" min="1" max="180" required data-practice-setting="duration"></label></div><label class="check-item"><input type="checkbox" name="mistakesOnly" data-practice-setting="mistakesOnly" ${s.mistakesOnly ? "checked" : ""}><span>只练本周的模拟错词 <small>（${wrongIds.size} 个词汇）</small></span></label><div class="practice-scope"><strong>${questionCount} 题</strong><br>${esc(nameSubject(s.subject))} · ${esc(s.wordGroup || "暂无周次")}<br>${s.mistakesOnly ? "从本周的模拟错词出题。" : "本周词库全部词汇，不依赖任何听写任务。"}<br>每次打乱题序，变换提问方式与选项。</div>${active ? '<p class="privacy-note">开始新模拟会结束上一场未交卷的练习；结束的练习不计成绩。</p>' : ""}<button type="submit" class="btn btn-primary" ${!questionCount ? "disabled" : ""}>${icon("plus")}重新出题并开始</button><p class="privacy-note">模拟考试自动保存，可刷新继续。交卷后查看结果，也可以立刻再练同一周。</p></form></section>
  <aside><div class="practice-summary"><div><small>累计完成</small><strong>${completed}</strong></div><div><small>模拟均分</small><strong>${data.stats?.average ?? "—"}</strong></div><div><small>待巩固错词</small><strong>${data.mistakes.length}</strong></div></div><section class="panel"><div class="panel-header"><div><h2>练习错词</h2><p>${esc(nameSubject(s.subject))} · ${esc(s.wordGroup)}</p></div></div><div class="practice-wrong-list">${
    wrong.length
      ? wrong
          .slice(0, state.practiceWrongLimit || 20)
          .map(
            (m) =>
              `<div class="practice-wrong-item"><div><strong>${esc(m.question.term)}</strong><small>${esc(m.question.translation)} · ${esc(modeName(m.question.direction))}</small><small>上次作答：${esc(m.lastAnswer || "未作答")}</small></div><span class="badge gray">${m.errorCount} 次</span></div>`,
          )
          .join("")
      : '<p class="muted">本周暂无练习错词，开始一场模拟看看吧。</p>'
  }${wrong.length > (state.practiceWrongLimit || 20) ? '<button class="btn btn-quiet" data-action="practice-more-wrong">显示更多错词</button>' : ""}</div></section><p class="privacy-note">模拟成绩与练习错词单独记录，老师的正式听写成绩和错题本保持独立。</p></aside></div>
  <section class="panel practice-history"><div class="panel-header"><div><h2>我的模拟记录</h2><p>每次的科目、范围、成绩与用时都会保留</p></div><button class="btn btn-light btn-sm" data-action="practice-refresh">刷新记录</button></div><div class="table-wrap"><table><thead><tr><th>科目 / 周次</th><th>题型</th><th>成绩</th><th>用时</th><th>开始时间</th><th>操作</th></tr></thead><tbody>${data.attempts.map((a) => `<tr><td>${esc(nameSubject(a.subject))}<div class="table-secondary">${esc(a.wordGroup)} · ${a.questionCount} 题</div></td><td>${esc(taskModeName(a))}</td><td><strong>${a.score ?? (a.abandoned ? "已结束" : "进行中")}</strong></td><td>${formatElapsed(a.elapsedSeconds)}</td><td>${date(a.startedAt, true)}</td><td>${!a.abandoned ? `<button class="btn btn-light btn-sm" data-action="practice-open" data-id="${a.id}">${a.submittedAt ? "查看结果" : "继续模拟"}</button>` : '<span class="muted">未交卷</span>'}</td></tr>`).join("")}</tbody></table></div>${!data.attempts.length ? empty("还没有模拟记录", "先选一科、一周，开始第一次自测。") : ""}${data.nextBefore ? '<button class="btn btn-light" style="margin:20px" data-action="practice-more">更早的模拟记录</button>' : ""}</section>`;
}
function enterPractice(data) {
  state.practiceSettings = {
    ...state.practiceSettings,
    subject: data.task.subject,
    wordGroup: data.task.wordGroup,
    questionType: data.task.questionType,
    mode: data.task.mode,
    duration: data.task.duration,
  };
  if (data.attempt.abandoned) {
    sessionStorage.removeItem("lexiclass-practice");
    return navigate("practice");
  }
  state.view = "practice";
  state.requestedExamId = null;
  sessionStorage.removeItem("lexiclass-exam");
  if (data.attempt.submittedAt) {
    state.examResult = { attempt: data.attempt, task: data.task };
    state.attempt = null;
    sessionStorage.removeItem("lexiclass-practice");
  } else {
    state.attempt = data;
    state.examResult = null;
    sessionStorage.setItem("lexiclass-practice", data.attempt.id);
    saveVersion = 0;
    savedVersion = 0;
    saveQueue = Promise.resolve();
    submitting = false;
  }
  render();
  window.scrollTo(0, 0);
}
const attemptEndpoint = (a) =>
  a.task.practice
    ? `/api/practice/${a.attempt.id}`
    : `/api/attempts/${a.attempt.id}`;

function studentDashboard() {
  const pending = state.tasks.filter(
      (t) => !t.attempt?.submittedAt && t.closesAt > now(),
    ),
    done = state.tasks.filter((t) => t.attempt?.submittedAt),
    due = state.mistakes.filter((m) => !m.resolved && m.nextReview <= now());
  return `${heading("我的学习", "每天一点积累，让专业课里的每一句话都更清晰。", `<button class="btn btn-primary" data-action="nav" data-view="practice">${icon("clipboard")}自主模拟 · 随时练习</button><button class="btn btn-light" data-action="nav" data-view="learning">${icon("book")}词汇学习</button><button class="btn btn-light" data-action="notifications">${icon("bell")}开启任务提醒</button>`)}<section class="student-welcome"><h2>${esc(state.user.name)}，今天也要有所收获。</h2><p>${esc(state.user.className)}<br>老师已为你安排好学习内容，准备好就开始吧。</p>${art()}</section><div class="stats-grid">${stat("待完成测试", pending.length, "份", "clipboard", "记得在截止时间前提交")}${stat("已完成测试", done.length, "份", "check", "每一次努力都有记录", "blue")}${stat("听写平均分", mean(done.map((t) => ({ score: t.attempt.score }))), "分", "chart", "持续练习，慢慢进步", "gold")}${stat("今天待复习", due.length, "个", "repeat", `共 ${state.mistakes.filter((m) => !m.resolved).length} 个未掌握错词`, "purple")}</div><div class="panel-header" style="padding:0 0 18px"><h2>接下来，完成这些练习</h2><button class="section-link" data-action="nav" data-view="tasks">全部测试 ${icon("arrow")}</button></div><div class="cards-grid">${pending.slice(0, 3).map(studentTaskCard).join("")}</div>${!pending.length ? empty("今天的待办已清空", "可以去错题本复习，或者回看之前的成绩。", `<button class="btn btn-primary" data-action="nav" data-view="review">${icon("repeat")}复习错题</button>`) : ""}`;
}
function studentTasks(history = false) {
  const tasks = state.tasks.filter((t) =>
    history ? !!t.attempt?.submittedAt : !t.attempt?.submittedAt,
  );
  return `${heading(history ? "历史成绩" : "我的测试", history ? "回看每次练习的答案与成绩，发现自己的进步。" : "老师已安排好课程和科目，按时完成即可。")}<div class="cards-grid">${tasks.map(studentTaskCard).join("")}</div>${!tasks.length ? empty(history ? "还没有完成过测试" : "暂时没有待完成的测试", history ? "完成并提交第一份任务后，成绩就会出现在这里。" : "新任务发布后会显示在这里，请留意老师通知。") : ""}`;
}
function mistakesView() {
  const items = state.mistakes.filter(
    (m) =>
      state.filter.status === "all" ||
      (state.filter.status === "mastered"
        ? m.resolved
        : !m.resolved &&
          (state.filter.status !== "due" || m.nextReview <= now())),
  );
  return `${heading("我的错题本", "把暂时不会的，变成真正掌握的。")}<div class="alert">采用间隔复习：先即时巩固，第一次答对后 1 天复习，第二次答对后 3 天复习；连续答对 3 次标为已掌握。答错后 10 分钟可再练习。场景翻译按老师给定答案及别名匹配。</div><div class="toolbar"><div class="tabs">${[
    ["all", "全部错题"],
    ["due", "到期复习"],
    ["learning", "学习中"],
    ["mastered", "已掌握"],
  ]
    .map(
      ([v, t]) =>
        `<button data-action="mistake-tab" data-id="${v}" class="${state.filter.status === v ? "active" : ""}">${t}</button>`,
    )
    .join(
      "",
    )}</div></div><div class="cards-grid">${items.map((m) => `<article class="mistake-card">${badge(nameSubject(m.question.subject), "gray")} ${badge(m.resolved ? "已掌握" : m.nextReview <= now() ? "待复习" : "学习中", m.resolved ? "" : "gold")}<h3>${esc(m.question.term)}</h3><p class="translation muted">${esc(m.question.translation)}</p><div class="word-sentence">${highlight(m.question.sentence, m.question.term)}</div><p class="table-secondary">${esc(m.question.sentenceZh)}</p><div class="task-meta" style="margin-top:14px"><span>累计错 ${m.errorCount} 次</span><span>·</span><span>连续正确 ${m.streak} / 3</span></div><p class="table-secondary" style="margin-top:5px">${m.resolved ? "已完成本轮复习" : `下次复习：${date(m.nextReview)}`}</p><button class="btn btn-light" data-action="review-word" data-id="${m.id}" ${m.resolved || m.nextReview > now() ? "disabled" : ""}>${icon("repeat")}${m.resolved ? "已经掌握" : "再练一次"}</button></article>`).join("")}</div>${!items.length ? empty("这里暂时没有错题", "完成听写后，答错或未作答的词汇会自动收录。") : ""}`;
}
function highlight(text, focus) {
  const source = String(text),
    index = source.toLowerCase().indexOf(String(focus).toLowerCase());
  if (index < 0) return esc(source);
  return `${esc(source.slice(0, index))}<mark>${esc(source.slice(index, index + focus.length))}</mark>${esc(source.slice(index + focus.length))}`;
}
const answerAttrs =
  'autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="false" data-gramm="false" data-gramm_editor="false" data-enable-grammarly="false"';
function examView() {
  const a = state.attempt;
  return `<div class="exam-layout">${a.task.practice ? `<div class="practice-inline-note">自主模拟 · 可不限次数练习 <button class="btn btn-quiet btn-sm" data-action="nav" data-view="practice">保存并返回模拟设置</button></div>` : ""}<div class="exam-top"><div><span class="eyebrow">CONTEXTUAL PRACTICE</span><h2>${esc(a.task.title)}</h2><p class="attempt-user">答题人：${esc(state.user.name)} · ${esc(state.user.className)}</p></div><div class="exam-clock mono" id="exam-clock">--:--</div></div><div class="alert">请翻译场景句中高亮的词汇或短语。答题框已关闭浏览器自动纠错、拼写检查和自动补全；请同时关闭输入法的联想纠错。到时会按服务端已保存答案自动交卷。</div><div class="exam-progress"><div id="exam-progress-fill" style="width:${(Object.values(a.attempt.answers).filter((v) => v.trim()).length / a.questions.length) * 100}%"></div></div><form id="exam-form">${a.questions.map((q, i) => `<article class="question-card"><div class="question-label"><span>QUESTION ${String(i + 1).padStart(2, "0")} / ${String(a.questions.length).padStart(2, "0")}</span>${badge(`${q.choices ? "选择题" : "填空题"} · ${modeName(q.direction)}`, "gray")}</div><h3>${q.choices ? (q.direction === "zh-en" ? "请选择高亮词义对应的英文词汇" : "请选择高亮词汇在本句中的含义") : q.direction === "zh-en" ? "请写出高亮词汇对应的英文" : "请写出高亮词汇在本句中的中文含义"}</h3><div class="question-prompt">${highlight(q.prompt, q.focus)}</div>${q.choices ? q.choices.map((c, j) => `<label class="choice-label"><input type="radio" name="${q.id}" value="${esc(c)}" ${a.attempt.answers[q.id] === c ? "checked" : ""}><span>${String.fromCharCode(65 + j)}.</span>${esc(c)}</label>`).join("") : `<label class="form-field"><span class="visually-hidden">第 ${i + 1} 题答案</span><input name="${q.id}" type="text" lang="${q.direction === "zh-en" ? "en" : "zh-CN"}" ${answerAttrs} maxlength="2000" placeholder="${q.direction === "zh-en" ? "在此输入英文词汇或短语…" : "在此输入中文释义…"}" value="${esc(a.attempt.answers[q.id] || "")}"></label>`}</article>`).join("")}<div class="exam-sticky"><div><div class="save-indicator" id="save-indicator">${icon("shield")} 已保存到服务器</div><small class="muted" id="answered-count">已作答 ${Object.values(a.attempt.answers).filter((v) => v.trim()).length} / ${a.questions.length} 题</small></div><button type="button" class="btn btn-primary" data-action="confirm-submit" id="submit-button">${a.task.practice ? "提交模拟考试" : "提交本次听写"} ${icon("arrow")}</button></div></form></div>`;
}
function formatElapsed(seconds) {
  if (!Number.isFinite(seconds) || seconds < 0) return "—";
  const total = Math.floor(seconds);
  const hours = Math.floor(total / 3600),
    minutes = Math.floor((total % 3600) / 60);
  return `${hours ? `${hours}小时` : ""}${minutes || hours ? `${minutes}分` : ""}${total % 60}秒`;
}
function timingSummary(attempt) {
  return `<p class="muted">开始：${attempt.startedAt ? date(attempt.startedAt, true) : "—"}<br>交卷：${attempt.finishedAt ? date(attempt.finishedAt, true) : "—"}<br>考试用时：<strong>${formatElapsed(attempt.elapsedSeconds)}</strong>${attempt.timedOut ? " · 到时自动提交" : ""}</p>`;
}
function resultBody(result) {
  return (
    (result.semanticGrading?.fallback
      ? '<div class="alert">部分中文释义未完成 AI 判分，当前按预设答案计分，请联系 master 复核。</div>'
      : "") +
    result.results
      .map(
        (r, i) =>
          `<div class="answer-row ${r.correct ? "" : "wrong"}">${icon(r.correct ? "check" : "close")}<div><strong>${i + 1}. ${esc(r.focus)}</strong><p>${esc(r.prompt)}</p><p>你的答案：${esc(r.submitted || "（未作答）")} ${!r.correct ? `<br>参考答案：<strong>${esc(r.answer)}</strong>` : ""}</p><small>${r.questionType === "choice" ? "选择题 · " : r.questionType === "fill" ? "填空题 · " : ""}${esc(modeName(r.direction))} · ${r.correct ? "回答正确" : "已收入错题本"}${r.gradingMethod === "ai" ? " · AI 语义判分" : r.gradingMethod === "standard_fallback" ? " · 仅按预设答案判分，待老师复核" : ""}</small></div></div>`,
      )
      .join("")
  );
}
function resultView() {
  const { attempt: a, task } = state.examResult,
    r = a.result;
  if (task.practice)
    return `<div class="exam-layout"><div class="practice-inline-note">自主模拟成绩 · 已单独保存</div><div class="result-hero"><span class="eyebrow">SELF PRACTICE / COMPLETE</span><h2>${esc(state.user.name)}，本次模拟已完成。</h2><div class="result-number mono">${a.score}<small>分</small></div><p>${esc(task.title)} · 答对 ${r.correct} / ${r.total} 题</p>${timingSummary(a)}<div class="result-actions"><button class="btn btn-primary" data-action="practice-again">${icon("repeat")}再练同一周</button><button class="btn btn-light" data-action="nav" data-view="practice">选择其他科目 / 周次</button></div></div>${resultBody(r).replaceAll("已收入错题本", "已加入练习错词")}</div>`;
  return `<div class="exam-layout"><div class="result-hero"><span class="eyebrow">PRACTICE COMPLETE</span><h2>${esc(state.user.name)}，本次听写已提交。</h2><div class="result-number mono">${a.score}<small>分</small></div><p>${esc(task.title)} · 答对 ${r.correct} / ${r.total} 题</p>${timingSummary(a)}<div class="result-actions"><button class="btn btn-light" data-action="finish-result">返回我的学习</button><button class="btn btn-primary" data-action="result-review">${icon("repeat")}去错题本复习</button></div></div>${resultBody(r)}</div>`;
}
function accountView() {
  return `${heading("账号设置", "姓名账号由老师登记，密码可以由你自己修改。")}
    <section class="panel" style="max-width:680px;padding:28px">
      ${state.user.initialPassword ? '<div class="alert">你的账号使用老师设置的初始密码，可以在这里更换为自己的密码。</div>' : ""}
      <form id="password-form"><label class="form-field"><span>学生账号</span><input value="${esc(state.user.username || state.user.name)}" readonly></label>
      <label class="form-field"><span>当前密码</span><input type="password" name="currentPassword" autocomplete="current-password" maxlength="200" required></label>
      <label class="form-field"><span>新密码 · 至少 10 位</span><input type="password" name="newPassword" autocomplete="new-password" minlength="10" maxlength="200" required></label>
      <label class="form-field"><span>再次输入新密码</span><input type="password" name="passwordConfirm" autocomplete="new-password" minlength="10" maxlength="200" required></label>
      <p class="muted">修改后其他设备需要重新登录，历史成绩和错题会保留。</p>
      <button class="btn btn-primary" type="submit">保存新密码</button></form>
    </section>`;
}
function classCourses(classId, editing = false) {
  const cls = state.classes.find((c) => c.id === classId);
  if (!cls) return;
  const courses = cls.courses || [];
  if (!editing) {
    modal(
      `${cls.name} · 课程内容`,
      "按班级维护实际科目和当前学习内容。",
      courses.length
        ? courses
            .map(
              (c) =>
                `<section class="form-section"><h3>${esc(c.title)}</h3><p style="white-space:pre-wrap;font-weight:400">${esc(c.content || "本次反馈表未填写课程内容，可由 master 补充。")}</p>${c.source ? `<small class="muted">${esc(c.source)}</small>` : ""}</section>`,
            )
            .join("")
        : '<div class="alert">尚未设置班级课程，发布时可选择全部科目。</div>',
      `<button class="btn btn-light" data-action="close-modal">关闭</button><button class="btn btn-primary" data-action="edit-class-courses" data-id="${cls.id}">编辑班级课程</button>`,
      true,
    );
    return;
  }
  modal(
    `${cls.name} · 编辑课程`,
    "勾选实际开设的科目，并填写对应的课程内容。",
    `<form id="courses-form"><input type="hidden" name="classId" value="${cls.id}">${state.config.subjects
      .map((subject, index) => {
        const c = courses.find((c) => c.subject === subject);
        return `<section class="form-section"><label class="check-item"><input type="checkbox" name="subjects" value="${esc(subject)}" ${c ? "checked" : ""}>${esc(nameSubject(subject))}</label><label class="form-field"><span>显示名称</span><input name="title-${index}" value="${esc(c?.title || nameSubject(subject))}" maxlength="60"></label><label class="form-field"><span>当前课程内容</span><textarea name="content-${index}" maxlength="10000" rows="3">${esc(c?.content || "")}</textarea></label></section>`;
      })
      .join("")}</form>`,
    '<button class="btn btn-light" data-action="close-modal">取消</button><button class="btn btn-primary" type="submit" form="courses-form">保存课程</button>',
    true,
  );
}
function content() {
  if (state.attempt) return examView();
  if (state.examResult) return resultView();
  if (state.user.role === "student" && state.view === "practice")
    return studentPracticeView();
  if (state.user.role === "student" && state.view === "learning")
    return learningView();
  if (state.user.role === "student" && state.view === "account")
    return accountView();
  if (state.user.role === "student" && state.view === "exam-entry")
    return examEntryView();
  if (state.user.role === "student")
    return state.view === "dashboard"
      ? studentDashboard()
      : state.view === "review"
        ? mistakesView()
        : studentTasks(state.view === "history");
  return (
    {
      dashboard,
      tasks: tasksView,
      classes: classesView,
      students: studentsView,
      words: wordsView,
      results: resultsView,
    }[state.view] || dashboard
  )();
}
function render() {
  if (!state.user) {
    renderAuth();
    return;
  }
  $("#app").innerHTML = shell();
  if (state.attempt) tick();
}
async function load() {
  if (!state.user) return;
  const teacher = state.user.role === "teacher";
  const responses = await Promise.all(
    teacher
      ? [
          api("/api/tasks"),
          api("/api/students"),
          api("/api/classes"),
          api("/api/words"),
          api("/api/results"),
        ]
      : [api("/api/tasks"), api("/api/mistakes")],
  );
  if (teacher)
    [state.tasks, state.students, state.classes, state.words, state.results] =
      responses.map(
        (r, i) => r[["tasks", "students", "classes", "words", "results"][i]],
      );
  else
    [state.tasks, state.mistakes] = responses.map(
      (r, i) => r[["tasks", "mistakes"][i]],
    );
}
async function refresh() {
  if (state.user?.role === "student" && state.view === "practice") {
    await loadPractice();
  } else if (state.user?.role === "student" && state.view === "learning") {
    state.learning = await api("/api/learning");
    state.learningError = null;
  } else await load();
  if (!modalOpen && !state.attempt && !state.examResult) render();
}
function modal(title, description, body, footer = "", wide = false) {
  modalOpen = true;
  $("#modal-root").innerHTML =
    `<div class="modal-backdrop"><section class="modal ${wide ? "wide" : ""}" role="dialog" aria-modal="true" aria-labelledby="modal-title"><div class="modal-head"><div><h2 id="modal-title">${esc(title)}</h2><p>${esc(description)}</p></div><button class="icon-button" data-action="close-modal" aria-label="关闭">${icon("close")}</button></div><div class="modal-body">${body}</div>${footer ? `<div class="modal-footer">${footer}</div>` : ""}</section></div>`;
  setTimeout(
    () =>
      $(
        "#modal-root input:not([type=checkbox]),#modal-root select,#modal-root button",
      )?.focus(),
    50,
  );
}
function closeModal() {
  modalOpen = false;
  reviewing = null;
  $("#modal-root").innerHTML = "";
}
function formError(form, message) {
  let node = form.querySelector(".form-error");
  if (!node) {
    node = document.createElement("div");
    node.className = "alert error form-error";
    node.setAttribute("role", "alert");
    form.prepend(node);
  }
  node.textContent = message;
  node.scrollIntoView({ block: "nearest" });
}
function field(
  label,
  name,
  type = "text",
  placeholder = "",
  required = true,
  value = "",
) {
  return `<label class="form-field"><span>${label}</span><input name="${name}" type="${type}" placeholder="${placeholder}" value="${esc(value)}" ${required ? "required" : ""}></label>`;
}
function renderAuth() {
  const tab = state.authTab,
    invite = localStorage.getItem("lexiclass-student-entry");
  const activating = tab === "activate";
  const title =
    tab === "setup"
      ? "设置唯一的 Master 账户"
      : tab === "teacher"
        ? "Master 管理登录"
        : activating
          ? "开通你的学习账号"
          : "登录你的学习账号";
  const masterAccountField = `<label class="form-field"><span>管理账号 · 固定</span><input name="username" type="text" value="master" autocomplete="username" readonly></label>`;
  let fields;
  if (tab === "student")
    fields = `${field("学生账号", "username", "text", "输入老师登记的姓名")}${field("登录密码", "password", "password", "请输入你的密码")}<p class="privacy-note" style="margin:0 0 18px">老师已开通账号的同学，请直接使用姓名和老师提供的初始密码登录，无需再次开通。登录后可在「账号设置」修改密码。忘记密码可联系老师重置，历史成绩和错题会保留。</p>`;
  else if (activating)
    fields = `${field("老师登记的姓名", "name", "text", "请与老师名单保持一致")}${invite ? '<div class="alert success">已识别老师提供的个人开通码。</div>' : field("老师提供的学习码", "invite", "text", "请勿使用其他同学的学习码")}${field("设置学生账号", "username", "text", "支持中文姓名，最多 60 个字符")}${field("设置密码（至少 10 位）", "password", "password", "用于以后在任何电脑登录")}${field("再次输入密码", "passwordConfirm", "password", "请再次输入密码")}`;
  else if (tab === "teacher")
    fields = `${masterAccountField}${field("Master 密码", "password", "password", "请输入你设置的管理密码")}`;
  else
    fields = `${field("设置密钥", "setupKey", "password", state.config?.hosting === "cloudflare" ? "在 Cloudflare 中自行设置的 SETUP_KEY" : "从服务器 data/setup-key 获取")}${masterAccountField}${field("设置 Master 密码（至少 10 位）", "password", "password", "由你保管的管理密码")}${field("再次输入 Master 密码", "passwordConfirm", "password", "请再次输入密码")}${field("首个班级名称（UNSW，可稍后添加其他项目）", "className", "text", "例如：UNSW 商科 A 班")}`;
  $("#app").innerHTML =
    `<div class="login-layout"><section class="login-art">${brand()}<div><div class="eyebrow" style="color:#FFD4A6;margin-top:45px">WORDS MEET THE REAL WORLD</div><h1>学会一个词，<br>读懂<em>更大的世界。</em></h1><p>从经济学的第一道题，到专业课的每一次进步。<br>打开网页，走进你的课堂。</p>${art()}</div><footer>UNSW · NCUK · UOW &nbsp; / &nbsp; YOUR CLASSROOM, CONNECTED.</footer></section><section class="login-form-area"><div class="login-box"><div class="login-badge">${icon("leaf")} 网页直接学习 · 无需安装</div><h2>${title}</h2><p>${tab === "setup" ? "由你设置唯一管理账户的密码，统一管理全部班级与教学内容。" : tab === "teacher" ? "统一维护全部项目、班级、学生名单、课程词库和考试。" : activating ? "只需首次开通，班级和项目由老师分配。" : "每次的成绩、错题与进步，都保存在你的账号中。"}</p>${state.requestedExamId ? '<div class="alert">你正在打开老师分享的考试。登录后将直接进入考试说明页，点击开始才计时。</div>' : ""}${tab !== "setup" ? `<div class="tabs"><button class="${tab !== "teacher" ? "active" : ""}" data-action="auth-tab" data-tab="student">学生账号</button><button class="${tab === "teacher" ? "active" : ""}" data-action="auth-tab" data-tab="teacher">Master 管理</button></div>` : ""}<form id="auth-form"><input type="hidden" name="role" value="${tab}">${fields}<button type="submit" class="btn btn-primary">${tab === "setup" ? "建立 Master 账户" : activating ? "开通账号并进入" : "进入课堂"} ${icon("arrow")}</button></form>${tab === "student" ? '<button class="btn btn-quiet" style="margin-top:10px" data-action="auth-tab" data-tab="activate">首次使用？用老师的学习码开通账号 →</button>' : ""}${activating ? '<button class="btn btn-quiet" style="margin-top:10px" data-action="auth-tab" data-tab="student">已有账号，直接登录 →</button>' : ""}<div class="login-bottom">${state.config?.demoAvailable ? '<p>想先看看课堂是什么样？</p><button data-action="demo-login">体验教师与学生演示 →</button>' : ""}${state.config?.setupRequired && tab !== "setup" ? '<p><button data-action="auth-tab" data-tab="setup">首次使用 · 设置 Master 账户</button></p>' : ""}${tab === "setup" ? '<button data-action="auth-tab" data-tab="teacher">返回登录</button>' : ""}</div><p class="privacy-note">${icon("shield")} 学生只需浏览器，无需安装客户端。请妥善保管账号与密码。<br>课程与班级由老师设置，历史成绩和错题跟随账号保存。</p></div></section></div>`;
}
function examUrl(taskId) {
  const url = new URL("/", location.origin);
  url.searchParams.set("exam", taskId);
  return url.href;
}
function shareExams(tasks) {
  modal(
    "考试已准备好，分享给学生吧",
    "考试链接可发班级群；学生登录自己的账号后答题，无需安装。",
    `<div class="alert">仅已分配的班级或学生可以参加；学生身份由自己的账号确认，转发链接不会扩大考试范围。首次使用的学生需先用老师私发的学习码开通账号。</div>${tasks.map((t) => `<div class="share-exam"><h3>${esc(t.title)}</h3><p class="muted">${date(t.opensAt)} 开始 · ${t.duration} 分钟 · ${t.questionCount} 题</p><label class="form-field"><span>考试链接</span><input readonly id="exam-link-${t.id}" value="${esc(examUrl(t.id))}"></label><button class="btn btn-light btn-sm" data-action="copy-exam" data-id="${t.id}">${icon("clipboard")}复制考试链接</button></div>`).join("")}`,
    `<button class="btn btn-primary" data-action="close-modal">完成</button>`,
  );
}
function openRequestedExam() {
  if (!state.requestedExamId) return;
  state.view = state.user.role === "student" ? "exam-entry" : "tasks";
}
function examEntryView() {
  const t = state.tasks.find((t) => t.id === state.requestedExamId);
  if (!t)
    return `${heading("考试入口", "使用自己的学生账号参加老师安排的考试。")}${empty("未找到分配给你的考试", "请核对当前账号是否属于老师指定的班级，或联系老师确认链接。", `<button class="btn btn-light" data-action="nav" data-view="dashboard">返回我的学习</button>`)}`;
  return `<div class="exam-layout">${heading("考试入口", "无需安装，准备好后即可在网页中开始。")}<div class="exam-intro"><span class="eyebrow">YOUR CLASSROOM, CONNECTED</span><h2>${esc(t.title)}</h2><p class="attempt-user">答题人：${esc(state.user.name)} · ${esc(state.user.className)}</p><div class="detail-grid"><div><strong>${t.questionCount}</strong><small>道场景题</small></div><div><strong>${t.duration}</strong><small>分钟限时</small></div><div><strong>${esc(nameSubject(t.subject))}</strong><small>${esc(taskModeName(t))}</small></div></div><p class="muted">开放时间：${date(t.opensAt, true)}<br>截止时间：${date(t.closesAt, true)}</p><div class="alert" style="margin-top:20px">开始后计时不可暂停，刷新可继续；到时按已保存答案自动交卷。成绩、历史记录和错题保存在你自己的账号中。</div>${studyButton(t, false)}${t.attempt?.submittedAt ? `<button class="btn btn-primary" data-action="student-result" data-id="${t.id}">已完成 · 查看 ${t.attempt.score} 分的答题结果 ${icon("arrow")}</button>` : `<button class="btn btn-primary" data-action="start-task" data-id="${t.id}" ${t.opensAt > now() || t.closesAt <= now() ? "disabled" : ""}>${t.opensAt > now() ? "等待考试开放" : t.closesAt <= now() ? "考试已截止" : t.attempt ? "继续考试" : "我已准备好，开始考试"} ${icon("arrow")}</button>`}<button class="btn btn-quiet" data-action="nav" data-view="dashboard">返回我的学习</button></div></div>`;
}
function currentTaskPlan() {
  const form = $("#task-form");
  const groups = [...form.elements.wordGroup.options]
    .map((o) => o.value)
    .filter((g) => g !== "all");
  return planSchedule({
    opensAt: form.elements.opensAt.value,
    closesAt: form.elements.closesAt.value,
    dates: [...state.scheduleDates],
    groups,
    startGroup: form.elements.wordGroup.value,
    overrides: state.scheduleOverrides,
  });
}
function renderTaskCalendar() {
  const form = $("#task-form"),
    node = $("#task-calendar"),
    preview = $("#task-schedule-preview");
  if (!form || !node) return;
  const base = form.elements.opensAt.value.slice(0, 10);
  state.scheduleMonth ||= base.slice(0, 7);
  const [year, month] = state.scheduleMonth.split("-").map(Number),
    offset = (new Date(Date.UTC(year, month - 1, 1)).getUTCDay() + 6) % 7,
    days = new Date(Date.UTC(year, month, 0)).getUTCDate();
  node.innerHTML = `<div class="calendar-nav"><button type="button" class="btn btn-quiet" data-action="schedule-month" data-delta="-1">← 上月</button><strong>${year}年 ${month}月</strong><button type="button" class="btn btn-quiet" data-action="schedule-month" data-delta="1">下月 →</button></div><div class="schedule-calendar">${["一", "二", "三", "四", "五", "六", "日"].map((d) => `<span class="calendar-weekday">${d}</span>`).join("")}${Array.from({ length: offset }, () => "<span></span>").join("")}${Array.from(
    { length: days },
    (_, i) => {
      const date = `${year}-${String(month).padStart(2, "0")}-${String(i + 1).padStart(2, "0")}`;
      return `<button type="button" data-action="schedule-date" data-date="${date}" class="calendar-day ${date === base ? "base-date" : ""} ${state.scheduleDates.has(date) ? "selected" : ""}" aria-pressed="${state.scheduleDates.has(date)}" ${date <= base ? "disabled" : ""}>${i + 1}${date === base ? "<small>首场</small>" : ""}</button>`;
    },
  ).join("")}</div>`;
  try {
    const plan = currentTaskPlan(),
      groups = [...form.elements.wordGroup.options].filter(
        (o) => o.value !== "all",
      );
    preview.innerHTML = `<div class="schedule-preview"><div class="schedule-preview-head">发布预览 · ${plan.length} 场 · 北京时间</div>${plan.map((p, i) => `<div class="schedule-preview-row"><strong>${p.date}</strong><span>${form.elements.opensAt.value.slice(11)} 开放</span>${i === 0 ? `<span>${esc(p.group === "all" ? "综合词汇" : p.group)}</span>` : `<select data-schedule-date="${p.date}" aria-label="${p.date}词汇分组">${groups.map((g) => option(g.value, g.textContent, p.group)).join("")}</select>`}</div>`).join("")}</div>`;
  } catch (error) {
    preview.innerHTML = `<div class="alert error">${esc(error.message)}</div>`;
  }
  taskSummary();
}
function createTask() {
  state.scheduleDates = new Set();
  state.scheduleOverrides = {};
  state.scheduleMonth = beijingInput().slice(0, 7);

  if (!state.classes.length) {
    toast("请先创建班级并添加学生。");
    createClass();
    return;
  }
  if (!state.students.length) {
    toast("请先添加班级学生。");
    addStudents();
    return;
  }
  const initialClass =
    state.classes.find((c) => c.id === state.filter.classId)?.id || "";
  modal(
    "发布场景听写",
    "先选班级，再选该班科目；默认全班参加，可取消勾选个别人。",
    `<form id="task-form"><div class="form-grid"><div class="full auto-task-title"><span>自动生成听写名称</span><strong id="task-title-preview">选择班级、科目与周次后生成</strong></div><label class="form-field full"><span>选择班级</span><select name="classId" data-change="task-class" required>${option("", "请选择班级", initialClass)}${state.classes.map((c) => option(c.id, `${c.name} · ${programShort(c.program)}`, initialClass)).join("")}</select></label><label class="form-field"><span>该班科目</span><select name="subject" data-change="task-words" required disabled><option value="">请先选择班级</option></select></label><label class="form-field"><span>题型</span><select name="questionType" required><option value="fill">填空题 · 手动输入答案</option><option value="choice">选择题 · 五选一（A–E）</option></select></label><label class="form-field"><span>翻译方向</span><select name="mode">${[
      ["mixed", "双向翻译 · 英中交替"],
      ["en-zh", "英译中 · 理解中文含义"],
      ["zh-en", "中译英 · 掌握英文词汇"],
    ]
      .map(([v, l]) => option(v, l, "mixed"))
      .join(
        "",
      )}</select></label>${field("答题时长（分钟，1–180）", "duration", "number", "", true, "15")}<label class="form-field"><span>首场开放时间（北京时间）</span><input name="opensAt" data-change="schedule" type="datetime-local" value="${beijingInput()}" required></label><label class="form-field"><span>首场截止时间（北京时间）</span><input name="closesAt" data-change="schedule" type="datetime-local" value="${beijingInput(Date.now() + 86400000)}" required></label></div><div class="form-section">01 &nbsp; 参加学生 · 默认全选 <button type="button" class="btn btn-quiet" data-action="select-all-students">全选 / 取消全选</button></div><div id="task-students" class="check-list"></div><p class="muted" id="task-audience-count"></p><div class="form-section">02 &nbsp; 场景词汇 <button type="button" class="btn btn-quiet" data-action="select-all-words">全选 / 取消</button></div><label class="form-field"><span>词汇 Topic / 周次 / 单元</span><select name="wordGroup" data-change="task-words" disabled></select><small>每份任务最多 100 个词汇；可按 Topic、周次、单元分批发布。</small></label><div class="check-list" id="task-words"></div><p class="task-summary" id="task-summary"></p><div class="form-section">03 &nbsp; 日历安排后续周次 · 可跳过假期</div><p class="muted">首场使用上面选定的词汇。点击后续日期，将按同一开放时刻和相同答题窗口，依次安排后续分组；每批最多30场。</p><div id="task-calendar"></div><div id="task-schedule-preview"></div><div class="alert" style="margin-top:17px;margin-bottom:0">任务发布后即按预约时间开放。学生开始后计时，截止时间与答题时长先到者为准；超时按服务端已保存答案自动评分。</div></form>`,
    `<button class="btn btn-light" data-action="close-modal">取消</button><button class="btn btn-primary" type="submit" form="task-form">${icon("check")}确认发布</button>`,
    true,
  );
  taskFilters();
}
function taskFilters() {
  const form = $("#task-form");
  if (!form) return;
  const cls = state.classes.find((c) => c.id === form.elements.classId.value);
  const subjectSelect = form.elements.subject,
    previous = subjectSelect.value;
  const courses = cls?.courses || [];
  subjectSelect.innerHTML =
    option("", cls ? "请选择该班科目" : "请先选择班级", "") +
    courses
      .map((c) => option(c.subject, c.title || nameSubject(c.subject)))
      .join("");
  subjectSelect.disabled = !courses.length;
  subjectSelect.value = courses.some((c) => c.subject === previous)
    ? previous
    : courses.length === 1
      ? courses[0].subject
      : "";
  if (cls && !courses.length)
    subjectSelect.innerHTML = option("", "该班尚未配置科目", "");
  taskAudience();
  taskWords();
}
function taskWords() {
  const form = $("#task-form");
  if (!form) return;
  const cls = state.classes.find((c) => c.id === form.elements.classId.value),
    subject = form.elements.subject.value;
  const available =
    cls && subject
      ? state.words.filter(
          (w) =>
            wordAvailableFor(w, cls.program, subject) &&
            wordAvailableToClass(w, cls),
        )
      : [];
  const groupSelect = form.elements.wordGroup;
  const scope = `${cls?.id || ""}:${subject}`;
  const groups = [...new Set(available.flatMap((w) => w.groups || []))].sort(
    (a, b) => a.localeCompare(b, "en", { numeric: true }),
  );
  const previous = groupSelect.value;
  const selectedGroup =
    groupSelect.dataset.scope === scope &&
    (previous === "all" || groups.includes(previous))
      ? previous
      : groups[0] || "all";
  groupSelect.innerHTML =
    option("all", "全部 Topic / 周次 / 单元", selectedGroup) +
    groups.map((g) => option(g, g, selectedGroup)).join("");
  groupSelect.dataset.scope = scope;
  groupSelect.disabled = !available.length;
  const words = available.filter(
    (w) => selectedGroup === "all" || (w.groups || []).includes(selectedGroup),
  );
  $("#task-words").innerHTML = words.length
    ? words
        .map(
          (w, index) =>
            `<label class="check-item word-choice"><input type="checkbox" name="wordIds" value="${w.id}" data-change="task-summary" ${index < 100 ? "checked" : ""}><span><strong>${esc(w.term)}</strong><small>${esc(w.translation)} · ${w.program === "通用示例" ? "自编示例" : w.program !== cls.program ? "新南共用词库" : "教师词库"}</small></span></label>`,
        )
        .join("")
    : `<div class="alert">${!cls ? "请先选择班级。" : !cls.courses?.length ? "请先到班级管理中配置该班科目。" : !subject ? "请选择该班的科目。" : "这个科目暂无词汇，请先添加词汇与场景句。"}</div>`;
  taskSummary();
  renderTaskCalendar();
}
function taskAudience() {
  const form = $("#task-form");
  if (!form) return;
  const cls = state.classes.find((c) => c.id === form.elements.classId.value);
  const students = cls
    ? state.students.filter((s) => s.classId === cls.id)
    : [];
  $("#task-students").innerHTML = students.length
    ? students
        .map(
          (s) =>
            `<label class="check-item"><input type="checkbox" name="studentIds" value="${s.id}" data-change="task-summary" checked>${esc(s.name)}</label>`,
        )
        .join("")
    : `<div class="alert">${cls ? "该班还没有学生，请先添加学生。" : "选择班级后，将显示该班全部学生并默认全选。"}</div>`;
  taskSummary();
}
function taskSummary() {
  const form = $("#task-form");
  if (!form) return;
  const data = new FormData(form),
    cls = state.classes.find((c) => c.id === data.get("classId"));
  const selected = data.getAll("studentIds").length,
    total = cls ? state.students.filter((s) => s.classId === cls.id).length : 0;
  const words = data.getAll("wordIds").length;
  const titleNode = $("#task-title-preview");
  if (titleNode)
    titleNode.textContent =
      cls && data.get("subject")
        ? automaticTaskTitle(
            cls.program,
            data.get("subject"),
            data.get("wordGroup"),
            state.config.subjectNames,
          )
        : "选择班级、科目与周次后生成";
  $("#task-audience-count").textContent = cls
    ? `已选 ${selected} / ${total} 人${selected === total && total ? " · 全班参加" : ""}`
    : "";
  $("#task-summary").textContent =
    `已选择 ${words} / 100 个场景词汇 · ${cls ? cls.name : "未选择班级"} · ${selected} 人参加`;
  const submit = document.querySelector('[form="task-form"][type="submit"]');
  if (submit)
    submit.disabled =
      !cls || !data.get("subject") || !selected || !words || words > 100;
}
function createClass() {
  modal(
    "新建班级",
    "按实际授课项目和教学班组织学生。",
    `<form id="class-form">${field("班级名称", "name", "text", "例如：NCUK 经济学 2 班")}<label class="form-field"><span>所属课程项目</span><select name="program">${state.config.programs.map((p) => option(p, p)).join("")}</select></label><div class="alert">学生加入班级后会自动关联项目，无需在学生端自行选择。</div></form>`,
    `<button class="btn btn-light" data-action="close-modal">取消</button><button class="btn btn-primary" type="submit" form="class-form">创建班级</button>`,
  );
}
function addStudents() {
  if (!state.classes.length) {
    toast("请先创建班级。");
    createClass();
    return;
  }
  modal(
    "添加班级学生",
    "可一次录入多个姓名，每位学生会获得独立学习入口。",
    `<form id="students-form"><label class="form-field"><span>加入班级</span><select name="classId">${state.classes.map((c) => option(c.id, `${c.name} · ${programShort(c.program)}`, state.filter.classId)).join("")}</select></label><label class="form-field"><span>学生姓名 · 每行一位</span><textarea name="names" rows="7" placeholder="陈思远\n林雨桐\n王子涵" required></textarea><small>同一班级内姓名需唯一；同名学生请加上学号，例如「张明 02」。</small></label><div class="alert">添加成功后，请保存并私下分发个人开通入口。学生通过个人链接首次开通账号，以后使用账号密码登录。考试链接可以单独发给班级。</div></form>`,
    `<button class="btn btn-light" data-action="close-modal">取消</button><button class="btn btn-primary" type="submit" form="students-form">添加并生成入口</button>`,
  );
}
let pendingInvites = [];
function invitesModal(students) {
  pendingInvites = students;
  modal(
    "学生学习入口已生成",
    "入口包含个人学习凭证，请分别发送给对应学生，不要发到公开群。",
    `<div class="alert">学习码仅用于首次开通或账号重置，开通成功后即失效。请私下分发；考试链接可以发到班级群。</div>${students.map((s) => `<div style="margin-bottom:18px"><strong>${esc(s.name)}</strong> <small class="muted">学习码：${esc(s.invite)}</small><span class="invite-link">${esc(`${location.origin}/#invite=${s.invite}`)}</span></div>`).join("")}`,
    `<button class="btn btn-light" data-action="download-invites">${icon("download")}保存入口 CSV</button><button class="btn btn-primary" data-action="close-modal">已妥善保存</button>`,
  );
}
function addWord() {
  modal(
    "添加场景词汇",
    "同时录入词义、英文题干和中文场景，支持双向翻译。",
    `<form id="word-form"><div class="form-grid"><label class="form-field"><span>课程项目</span><select name="program"><option value="通用示例">跨项目通用</option>${state.config.programs.map((p) => option(p, p)).join("")}</select></label><label class="form-field"><span>科目</span><select name="subject">${state.config.subjects.map((s) => option(s, nameSubject(s))).join("")}</select></label>${field("英文词汇或短语", "term", "text", "opportunity cost")}${field("标准中文释义", "translation", "text", "机会成本")}<label class="form-field full"><span>英文场景 / 题干（必须包含该英文词汇）</span><textarea name="sentence" rows="3" required placeholder="Explain the opportunity cost of choosing one investment over another."></textarea></label><label class="form-field full"><span>对应中文场景（必须包含标准中文释义）</span><textarea name="sentenceZh" rows="3" required placeholder="解释选择一种投资而放弃另一种投资的机会成本。"></textarea></label><div class="full">${field("可接受的其他中文答案（用分号分隔）", "aliases", "text", "机会代价；替代成本", false)}</div><div class="full">${field("词汇来源（供老师标识）", "source", "text", "例如：授课讲义第 3 单元", false)}</div></div></form>`,
    `<button class="btn btn-light" data-action="close-modal">取消</button><button class="btn btn-primary" type="submit" form="word-form">保存到词库</button>`,
    true,
  );
}
function importWords() {
  modal(
    "批量导入词库",
    "上传 UTF-8 CSV，或下载模板后填写正式课程词汇。",
    `<form id="import-form"><div class="alert">必填列：program, subject, term, translation, sentence, sentenceZh<br>可选列：aliases（中文别名）、enAliases（英文别名）、groups（Topic、周次或单元，以上均用分号分隔）、source。项目和科目请使用模板中的完整名称。每批最多 300 条。</div><button class="btn btn-light" type="button" data-action="word-template">${icon("download")}下载 CSV 模板</button><div class="file-input"><label class="form-field"><span>选择词库 CSV 文件</span><input name="csv" type="file" accept=".csv,text/csv" required></label></div></form>`,
    `<button class="btn btn-light" data-action="close-modal">取消</button><button class="btn btn-primary" type="submit" form="import-form">导入并校验</button>`,
  );
}
function csv(rows) {
  return (
    "\ufeff" +
    rows
      .map((row) =>
        row
          .map((v) => {
            let s = String(v ?? "");
            if (/^[\s]*[=+@\-\t\r]/.test(s)) s = "'" + s;
            return `"${s.replace(/"/g, '""')}"`;
          })
          .join(","),
      )
      .join("\r\n")
  );
}
function download(name, contents, type = "text/csv;charset=utf-8") {
  const url = URL.createObjectURL(new Blob([contents], { type }));
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
function parseCSV(text) {
  text = text.replace(/^\ufeff/, "");
  const rows = [];
  let row = [],
    cell = "",
    quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (c === '"') {
      if (quoted && text[i + 1] === '"') {
        cell += '"';
        i++;
      } else quoted = !quoted;
    } else if (c === "," && !quoted) {
      row.push(cell);
      cell = "";
    } else if ((c === "\n" || c === "\r") && !quoted) {
      if (c === "\r" && text[i + 1] === "\n") i++;
      row.push(cell);
      if (row.some((v) => v.trim())) rows.push(row);
      row = [];
      cell = "";
    } else cell += c;
  }
  if (quoted) throw new Error("CSV 引号未闭合。");
  row.push(cell);
  if (row.some((v) => v.trim())) rows.push(row);
  const headers = rows.shift()?.map((v) => v.trim());
  if (
    !headers ||
    ![
      "program",
      "subject",
      "term",
      "translation",
      "sentence",
      "sentenceZh",
    ].every((h) => headers.includes(h))
  )
    throw new Error("缺少必填列，请使用提供的 CSV 模板。");
  return rows.map((r, i) => {
    if (r.length !== headers.length)
      throw new Error(`第 ${i + 2} 行列数不匹配，请检查逗号和引号。`);
    return Object.fromEntries(
      headers.map((h, j) => [
        h,
        ["aliases", "enAliases", "groups"].includes(h)
          ? r[j]
              .split(/[;；]/)
              .map((v) => v.trim())
              .filter(Boolean)
          : r[j].trim(),
      ]),
    );
  });
}
async function startTask(tid) {
  sessionStorage.removeItem("lexiclass-practice");
  const data = await post(`/api/tasks/${tid}/start`);
  if (data.attempt.submittedAt) {
    state.examResult = { attempt: data.attempt, task: data.task };
    state.attempt = null;
  } else {
    state.attempt = data;
    state.examResult = null;
    saveVersion = 0;
    savedVersion = 0;
    saveQueue = Promise.resolve();
  }
  render();
  window.scrollTo(0, 0);
}
function readAnswers() {
  if (!state.attempt || !$("#exam-form")) return;
  const data = new FormData($("#exam-form"));
  state.attempt.attempt.answers = Object.fromEntries(data.entries());
}
function saveStatus(text, warning = false) {
  const el = $("#save-indicator");
  if (el) {
    el.className = `save-indicator ${warning ? "warning" : ""}`;
    el.textContent = text;
  }
}
function queueSave() {
  if (!state.attempt || submitting) return saveQueue;
  const attempt = state.attempt,
    version = saveVersion,
    answers = { ...attempt.attempt.answers };
  saveStatus("正在保存…");
  saveQueue = saveQueue
    .catch(() => {})
    .then(async () => {
      if (state.attempt !== attempt) return;
      try {
        const r = await api(attemptEndpoint(attempt), {
          method: "PATCH",
          body: JSON.stringify({ answers }),
        });
        if (state.attempt !== attempt) return;
        if (r.attempt?.submittedAt) {
          completeExam(r.attempt);
          return;
        }
        savedVersion = Math.max(savedVersion, version);
        saveStatus(
          savedVersion === saveVersion ? "已保存到服务器" : "正在保存最新答案…",
        );
      } catch (e) {
        saveStatus("保存失败，请恢复网络后重试", true);
        throw e;
      }
    });
  return saveQueue;
}
function completeExam(a) {
  if (!state.attempt) return;
  if (a.abandoned) {
    state.attempt = null;
    submitting = false;
    clearTimeout(saveTimer);
    sessionStorage.removeItem("lexiclass-practice");
    navigate("practice");
    return;
  }
  closeModal();
  const task = state.attempt.task;
  state.attempt = null;
  state.examResult = { attempt: a, task };
  clearTimeout(saveTimer);
  submitting = false;
  render();
  if (task.practice) {
    sessionStorage.removeItem("lexiclass-practice");
    loadPractice().catch(() => {});
  } else load().catch(() => {});
  window.scrollTo(0, 0);
}
async function submitExam() {
  if (!state.attempt || submitting) return;
  readAnswers();
  submitting = true;
  clearTimeout(saveTimer);
  const attempt = state.attempt;
  $("#submit-button")?.setAttribute("disabled", "");
  saveStatus("正在提交，请保持联网…");
  try {
    await saveQueue.catch(() => {});
    if (state.attempt !== attempt) return;
    const r = await post(`${attemptEndpoint(attempt)}/submit`, {
      answers: attempt.attempt.answers,
    });
    if (state.attempt !== attempt) return;
    completeExam(r.attempt);
  } catch (e) {
    submitting = false;
    $("#submit-button")?.removeAttribute("disabled");
    saveStatus("提交失败，正在保留本页答案；请联网重试", true);
    toast(e.message, true);
  }
}
function tick() {
  if (!state.attempt) return;
  const seconds = Math.max(
      0,
      Math.ceil((state.attempt.attempt.deadline - now()) / 1000),
    ),
    clock = $("#exam-clock");
  if (clock) {
    clock.textContent = `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;
    clock.classList.toggle("urgent", seconds < 60);
  }
  if (seconds === 0 && !submitting) submitExam();
}
function reviewWord(mid) {
  const m = state.mistakes.find((m) => m.id === mid);
  reviewing = m;
  const q = m.question;
  modal(
    "再练一次，记得更牢一点",
    `${nameSubject(q.subject)} · ${modeName(q.direction)}`,
    `<form id="review-form"><div class="question-prompt">${highlight(q.prompt, q.focus)}</div>${q.choices ? q.choices.map((c, j) => `<label class="choice-label"><input type="radio" name="answer" value="${esc(c)}" required><span>${String.fromCharCode(65 + j)}.</span>${esc(c)}</label>`).join("") : `<label class="form-field"><span>${q.direction === "zh-en" ? "请输入英文词汇或短语" : "请输入中文释义"}</span><input name="answer" type="text" ${answerAttrs} maxlength="2000" required placeholder="试着独立作答…"></label>`}</form>`,
    `<button class="btn btn-light" data-action="close-modal">稍后复习</button><button class="btn btn-primary" type="submit" form="review-form">检查答案</button>`,
  );
  reviewing = m;
}
async function navigate(view) {
  if (state.attempt?.task.practice) {
    readAnswers();
    await queueSave();
    state.attempt = null;
    submitting = false;
    clearTimeout(saveTimer);
    sessionStorage.removeItem("lexiclass-practice");
  }
  if (state.attempt) {
    toast("请先完成并提交当前测试。");
    return;
  }
  state.examResult = null;
  state.requestedExamId = null;
  sessionStorage.removeItem("lexiclass-exam");
  history.replaceState(null, "", location.pathname);
  state.view = view;
  state.filter = {
    program: "all",
    classId: "all",
    subject: "all",
    status: "all",
    search: "",
  };
  state.resultTaskId = null;
  if (view === "practice") {
    state.practiceData = null;
    state.practiceError = null;
  }
  if (view === "learning") {
    state.learning = null;
    state.learningError = null;
  }
  render();
  window.scrollTo(0, 0);
  if (view === "practice") {
    try {
      await loadPractice(false, true);
    } catch (error) {
      state.practiceError = error.message;
    }
    render();
  }
  if (view === "learning") {
    try {
      state.learning = await api("/api/learning");
    } catch (error) {
      state.learningError = error.message || "请检查网络后重试。";
    }
    render();
  }
}

document.addEventListener("click", async (e) => {
  const b = e.target.closest("[data-action]");
  if (!b) return;
  const action = b.dataset.action;
  try {
    if (action.startsWith("grade-")) {
      const a = state.analytics;
      if (action === "grade-reset")
        state.analytics = {
          program: "all",
          subject: "all",
          group: "all",
          classId: "all",
          band: "all",
        };
      if (action === "grade-band") a.band = b.dataset.band;
      if (action === "grade-group") {
        a.group =
          b.dataset.group === "未标注周次 / 单元"
            ? "ungrouped"
            : b.dataset.group;
        a.band = "all";
      }
      if (action === "grade-class") {
        a.classId = b.dataset.id;
        a.band = "all";
      }
      if (action === "grade-student") {
        const rows = gradeData().rows.filter(
          (r) =>
            r.studentId === b.dataset.id &&
            (a.band === "all" || scoreBand(r) === a.band),
        );
        modal(
          `${rows[0]?.name || "学生"} · 考试记录`,
          "当前项目、科目、周次及班级筛选范围",
          `<div class="table-wrap"><table><thead><tr><th>考试</th><th>周次</th><th>成绩 / 状态</th><th>用时</th><th>答题</th></tr></thead><tbody>${rows.map((r) => `<tr><td>${esc(r.taskTitle)}</td><td>${esc(r.groups.join("、") || "未标注")}</td><td>${r.score ?? ({ pending: "待完成", missing: "未提交", in_progress: "答题中" }[r.state] || "—")}</td><td>${formatElapsed(r.elapsedSeconds)}</td><td>${r.result ? `<button class="btn btn-light btn-sm" data-action="result-detail" data-task="${esc(r.taskId)}" data-student="${esc(r.studentId)}">逐题详情</button>` : "—"}</td></tr>`).join("")}</tbody></table></div>`,
        );
        return;
      }
      $("#main-view").innerHTML = content();
      return;
    }
    if (action.startsWith("practice-")) {
      if (action === "practice-open") {
        enterPractice(await api(`/api/practice/${b.dataset.id}`));
        return;
      }
      if (action === "practice-again") {
        const t = state.examResult.task;
        enterPractice(
          await post("/api/practice", {
            subject: t.subject,
            wordGroup: t.wordGroup,
            mode: t.mode,
            questionType: t.questionType,
            duration: t.duration,
          }),
        );
        return;
      }
      if (action === "practice-more-wrong") {
        state.practiceWrongLimit = (state.practiceWrongLimit || 20) + 30;
        render();
        return;
      }
      if (action === "practice-refresh" || action === "practice-more") {
        await loadPractice(
          action === "practice-more",
          action === "practice-refresh",
        );
        render();
        return;
      }
    }
    if (action === "nav") return await navigate(b.dataset.view);
    if (action === "close-modal") return closeModal();
    if (action === "menu") return $(".sidebar")?.classList.toggle("open");
    if (action === "auth-tab") {
      state.authTab = b.dataset.tab;
      renderAuth();
      return;
    }
    if (action === "clear-entry") {
      localStorage.removeItem("lexiclass-student-entry");
      renderAuth();
      return;
    }
    if (action === "demo-login") {
      b.disabled = true;
      try {
        const r = await post("/api/demo");
        state.user = r.user;
        state.view = "dashboard";
        await load();
        render();
      } finally {
        b.disabled = false;
      }
      return;
    }
    if (action === "logout") {
      if (state.attempt) {
        toast("请先提交当前测试再退出。");
        return;
      }
      await post("/api/logout");
      state.user = null;
      state.learning = null;
      state.authTab = "student";
      state.attempt = null;
      state.examResult = null;
      closeModal();
      render();
      return;
    }
    if (action === "schedule-month") {
      const [y, m] = state.scheduleMonth.split("-").map(Number);
      state.scheduleMonth = new Date(
        Date.UTC(y, m - 1 + Number(b.dataset.delta), 1),
      )
        .toISOString()
        .slice(0, 7);
      renderTaskCalendar();
      return;
    }
    if (action === "schedule-date") {
      const date = b.dataset.date;
      if (state.scheduleDates.has(date)) {
        state.scheduleDates.delete(date);
        delete state.scheduleOverrides[date];
      } else {
        if (state.scheduleDates.size >= 29) throw new Error("每批最多30场。");
        state.scheduleDates.add(date);
      }
      renderTaskCalendar();
      return;
    }
    if (action === "task-folders") {
      document.querySelectorAll("[data-task-folder]").forEach((node) => {
        node.open = b.dataset.open === "true";
        state.taskFolders[node.dataset.taskFolder] = node.open;
      });
      return;
    }
    if (action === "task-share")
      return shareExams([state.tasks.find((t) => t.id === b.dataset.id)]);
    if (action === "copy-exam") {
      try {
        await navigator.clipboard.writeText(examUrl(b.dataset.id));
        toast("考试链接已复制，可发到班级群。");
      } catch {
        const input = $(`#exam-link-${b.dataset.id}`);
        input?.focus();
        input?.select();
        toast("请复制已选中的考试链接。");
      }
      return;
    }
    if (action === "delete-task") {
      if (state.user?.role !== "teacher") return;
      const task = state.tasks.find((t) => t.id === b.dataset.id);
      if (!task) return;
      modal(
        "删除这次考试？",
        "删除后无法恢复，请确认考试名称和班级。",
        `<h3>${esc(task.title)}</h3><p>${esc(task.classIds.map(clsName).join("、"))} · ${esc(nameSubject(task.subject))}</p><div class="alert">将永久删除本次考试、全部答题记录和成绩，并更新成绩统计。考试链接将失效，正在答题的学生也无法继续保存或提交。学生账号、词库和已有错题本保留。连续发布的其他日期考试不会删除。</div>`,
        `<button class="btn btn-light" data-action="close-modal">取消</button><button class="btn btn-danger" data-action="confirm-delete-task" data-id="${task.id}">确认永久删除</button>`,
      );
      return;
    }
    if (action === "confirm-delete-task") {
      if (state.user?.role !== "teacher") return;
      b.disabled = true;
      try {
        await api(`/api/tasks/${encodeURIComponent(b.dataset.id)}`, {
          method: "DELETE",
        });
        state.tasks = state.tasks.filter((t) => t.id !== b.dataset.id);
        state.results = state.results.filter((r) => r.taskId !== b.dataset.id);
        if (state.resultTaskId === b.dataset.id) state.resultTaskId = null;
        closeModal();
        render();
        toast("考试及其答题记录、成绩已删除。");
        await refresh();
      } finally {
        b.disabled = false;
      }
      return;
    }
    if (action === "select-all-students") {
      const inputs = $$('#task-students input[name="studentIds"]');
      const checked = !inputs.every((input) => input.checked);
      for (const input of inputs) input.checked = checked;
      taskSummary();
      return;
    }
    if (action === "create-task") return createTask();
    if (action === "create-class") return createClass();
    if (action === "add-students") return addStudents();
    if (action === "add-word") return addWord();
    if (action === "import-words") return importWords();
    if (action === "class-courses") return classCourses(b.dataset.id);
    if (action === "edit-class-courses")
      return classCourses(b.dataset.id, true);
    if (action === "class-detail") {
      state.view = "students";
      state.filter = {
        program: "all",
        classId: b.dataset.id,
        subject: "all",
        status: "all",
        search: "",
      };
      render();
      return;
    }
    if (action === "task-results") {
      state.view = "results";
      state.resultTaskId = b.dataset.id;
      state.filter = {
        program: "all",
        classId: "all",
        subject: "all",
        status: "all",
        search: "",
      };
      await load();
      render();
      return;
    }
    if (action === "clear-task-filter") {
      state.resultTaskId = null;
      render();
      return;
    }
    if (action === "result-detail") {
      const r = state.results.find(
        (r) => r.taskId === b.dataset.task && r.studentId === b.dataset.student,
      );
      modal(
        `${r.name} · ${r.score} 分`,
        `${r.className} · ${r.taskTitle} · ${date(r.finishedAt || r.submittedAt, true)}`,
        timingSummary(r) + resultBody(r.result),
        "",
        true,
      );
      return;
    }
    if (action === "more-words") {
      state.wordLimit = (state.wordLimit || 60) + 60;
      $("#main-view").innerHTML = content();
      return;
    }
    if (action === "select-all-words") {
      const inputs = $$("#task-words input"),
        checked = !inputs.slice(0, 100).every((i) => i.checked);
      inputs.forEach((i, index) => (i.checked = checked && index < 100));
      if (checked && inputs.length > 100)
        toast(
          "每份最多 100 个词汇，已勾选前 100 个；可按 Topic、周次或单元分批发布。",
        );
      taskSummary();
      return;
    }
    if (action === "delete-student") {
      const student = state.students.find((s) => s.id === b.dataset.id);
      modal(
        "删除学生",
        "请核对姓名和班级，删除后无法恢复。",
        `<div class="alert error">即将删除 <strong>${esc(student.name)}</strong>（${esc(clsName(student.classId))}）的账号、成绩、错题和登录记录。其他学生、班级、词库及考试任务保留。</div>`,
        `<button class="btn btn-light" data-action="close-modal">取消</button><button class="btn btn-danger" data-action="confirm-delete-student" data-id="${student.id}">确认删除该学生</button>`,
      );
      return;
    }
    if (action === "confirm-delete-student") {
      b.disabled = true;
      try {
        await api(`/api/students/${encodeURIComponent(b.dataset.id)}`, {
          method: "DELETE",
        });
        closeModal();
        await load();
        render();
        toast("学生已删除。");
      } finally {
        b.disabled = false;
      }
      return;
    }
    if (action === "student-invite") {
      const s = state.students.find((s) => s.id === b.dataset.id);
      modal(
        "重置个人学习入口",
        `${s.name} · ${clsName(s.classId)}`,
        `<div class="alert">重置后该学生当前登录会退出，旧密码、学习码和旧入口立即失效。学生需用新开通码重新设置密码，历史成绩和错题保留。请确认学生没有正在进行的测试，并将新入口私下交给本人。</div>`,
        `<button class="btn btn-light" data-action="close-modal">取消</button><button class="btn btn-primary" data-action="confirm-reset-invite" data-id="${s.id}">重置并生成新入口</button>`,
      );
      return;
    }
    if (action === "confirm-reset-invite") {
      const s = state.students.find((s) => s.id === b.dataset.id),
        r = await post(`/api/students/${s.id}/invite`);
      invitesModal([{ ...s, invite: r.invite }]);
      return;
    }
    if (action === "download-invites") {
      download(
        "学生专属入口-请私下分发.csv",
        csv([
          ["姓名", "学习码", "专属入口"],
          ...pendingInvites.map((s) => [
            s.name,
            s.invite,
            `${location.origin}/#invite=${s.invite}`,
          ]),
        ]),
      );
      return;
    }
    if (action === "word-template") {
      download(
        "场景词库导入模板.csv",
        csv([
          [
            "program",
            "subject",
            "term",
            "translation",
            "sentence",
            "sentenceZh",
            "aliases",
            "source",
          ],
          [
            state.config.programs[0],
            "Economics",
            "opportunity cost",
            "机会成本",
            "Explain the opportunity cost of choosing one investment over another.",
            "解释选择一种投资而放弃另一种投资的机会成本。",
            "机会代价;替代成本",
            "教师讲义示例",
          ],
        ]),
      );
      return;
    }
    if (action === "export-students") {
      const rows = state.students.filter(
        (s) =>
          (state.filter.classId === "all" ||
            s.classId === state.filter.classId) &&
          (state.filter.program === "all" ||
            s.program === state.filter.program) &&
          s.name.includes(state.filter.search),
      );
      download(
        "班级学生名单.csv",
        csv([
          ["姓名", "项目", "班级", "已完成听写", "平均分", "待复习错词"],
          ...rows.map((s) => [
            s.name,
            s.program,
            clsName(s.classId),
            s.attempts,
            s.average,
            s.mistakes,
          ]),
        ]),
      );
      return;
    }
    if (action === "export-results") {
      download(
        "班级听写成绩.csv",
        csv([
          [
            "姓名",
            "项目",
            "班级",
            "科目",
            "任务",
            "成绩",
            "状态",
            "提交时间",
            "超时交卷",
            "开始时间",
            "有效交卷时间",
            "考试用时（秒）",
            "考试用时",
          ],
          ...visibleResults().map((r) => [
            r.name,
            r.program,
            r.className,
            nameSubject(r.subject),
            r.taskTitle,
            r.score,
            {
              submitted: "已提交",
              missing: "未提交",
              pending: "待完成",
              in_progress: "答题中",
            }[r.state],
            r.submittedAt ? new Date(r.submittedAt).toISOString() : "",
            r.timedOut ? "是" : "否",
            r.startedAt ? new Date(r.startedAt).toISOString() : "",
            r.finishedAt ? new Date(r.finishedAt).toISOString() : "",
            r.elapsedSeconds ?? "",
            Number.isFinite(r.elapsedSeconds)
              ? formatElapsed(r.elapsedSeconds)
              : "",
          ]),
        ]),
      );
      return;
    }
    if (action === "study-task") {
      b.disabled = true;
      try {
        await studyTask(b.dataset.id);
      } finally {
        b.disabled = false;
      }
      return;
    }
    if (action === "start-task") {
      b.disabled = true;
      try {
        await startTask(b.dataset.id);
      } finally {
        b.disabled = false;
      }
      return;
    }
    if (action === "student-result") {
      const t = state.tasks.find((t) => t.id === b.dataset.id);
      state.examResult = { attempt: t.attempt, task: t };
      render();
      window.scrollTo(0, 0);
      return;
    }
    if (action === "confirm-submit") {
      readAnswers();
      const count = Object.values(state.attempt.attempt.answers).filter((v) =>
        v.trim(),
      ).length;
      modal(
        "提交本次听写",
        `答题人：${state.user.name}`,
        `<p style="font-size:13px;color:#647269">你已完成 ${count} / ${state.attempt.questions.length} 题。提交后不能修改，${count < state.attempt.questions.length ? "未作答的题目将计为错误并收入错题本。" : "系统会立即评分并自动整理错题。"}</p>`,
        `<button class="btn btn-light" data-action="close-modal">继续检查</button><button class="btn btn-primary" data-action="submit-exam">确认提交</button>`,
      );
      return;
    }
    if (action === "submit-exam") {
      closeModal();
      return submitExam();
    }
    if (action === "finish-result" || action === "result-review") {
      state.examResult = null;
      await load();
      navigate(action === "result-review" ? "review" : "dashboard");
      return;
    }
    if (action === "mistake-tab") {
      state.filter.status = b.dataset.id;
      render();
      return;
    }
    if (action === "review-word") return reviewWord(b.dataset.id);
    if (action === "demo-pick") {
      modal(
        "体验学生视角",
        "选择一个示例学生，查看属于他的测试和错题。",
        `<div class="check-list">${state.students.map((s) => `<button class="btn btn-light" data-action="demo-student" data-id="${s.id}">${esc(s.name)} · ${esc(clsName(s.classId))}</button>`).join("")}</div>`,
      );
      return;
    }
    if (action === "demo-student" || action === "demo-teacher") {
      if (state.attempt) {
        toast("请先完成本次测试。");
        return;
      }
      const r = await post(
        "/api/demo/switch",
        action === "demo-student" ? { studentId: b.dataset.id } : {},
      );
      closeModal();
      state.user = r.user;
      state.examResult = null;
      state.view = "dashboard";
      await load();
      render();
      return;
    }
    if (action === "notifications") {
      if (!("Notification" in window)) {
        toast("此浏览器暂不支持桌面提醒。", true);
        return;
      }
      const permission = await Notification.requestPermission();
      toast(
        permission === "granted"
          ? "已开启任务提醒；请保持应用运行。"
          : "未获得提醒权限，请在浏览器设置中开启。",
        permission !== "granted",
      );
      return;
    }
    if (action === "install") {
      if (state.installPrompt) {
        await state.installPrompt.prompt();
        state.installPrompt = null;
      } else
        modal(
          "把词间课堂安装到电脑",
          "Windows 与 macOS 均可使用，学生数据保存在同一服务器。",
          `<ol class="install-steps"><li><strong>Windows：</strong>使用 Edge 或 Chrome，点击地址栏安装图标，或菜单中的「安装此站点为应用」。</li><li><strong>Mac：</strong>使用 Chrome 的安装按钮；macOS Sonoma 及以上也可使用 Safari「文件 → 添加到程序坞」。</li><li>安装后会像应用一样独立打开。课堂测试、成绩和提交需要连接学校部署的服务。</li></ol><div class="alert" style="margin-top:20px">正式部署需 HTTPS；普通局域网 HTTP 地址可用于网页访问，但浏览器可能不提供安装和系统通知。若安装选项暂不可见，可先用浏览器访问。</div>`,
        );
      return;
    }
    if (action === "help")
      modal(
        "让每一次听写更有效",
        "词间课堂使用说明",
        `<ol class="install-steps">${state.user.role === "teacher" ? "<li>按 UNSW / NCUK / UOW 创建班级，批量添加姓名。</li><li>将每位学生的个人开通入口私下发给本人，首次设置网页账号和密码。</li><li>添加或导入学科词汇、双语场景句与可接受答案。</li><li>发布任务时选择项目、科目、班级或个人，设置时间，复制考试链接发到班级群。</li><li>在成绩分析里按班级查看姓名、分数和逐题答案，导出 CSV。</li>" : "<li>首次用老师的学习码开通账号；之后直接在网页中用账号密码登录。</li><li>打开老师发来的考试链接，登录后点击开始，不需要安装客户端。</li><li>在开放时间内开始测试；开始后计时持续进行。</li><li>输入答案会自动保存，提交后查看成绩与错题。</li><li>按错题本提示反复复习；老师发布的科目无需自行选择。</li>"}</ol><div class="alert" style="margin-top:18px">答题框已请求关闭浏览器纠错。系统或输入法的自动纠正需在电脑设置中另行关闭；此应用不能强制更改系统输入法。联网异常时请保持答题页打开，确认保存状态。</div><p class="privacy-note">内置词库为原创教学示例，不是官方课程词表。未接入官方考纲，也未使用 AI 模糊判分；译文按参考答案和教师提供的可接受答案匹配。</p>`,
      );
  } catch (error) {
    toast(error.message || "操作失败，请重试。", true);
  }
});

document.addEventListener("submit", async (e) => {
  e.preventDefault();
  const form = e.target;
  if (form.id === "exam-form") return;
  const data = Object.fromEntries(new FormData(form));
  const submit =
    document.querySelector(`[form="${form.id}"][type=submit]`) ||
    form.querySelector("[type=submit]");
  if (submit) submit.disabled = true;
  try {
    if (form.id === "practice-form") {
      const settings = practiceFormSettings();
      enterPractice(
        await post("/api/practice", {
          ...settings,
          duration: Number(settings.duration),
        }),
      );
    }
    if (form.id === "password-form") {
      if (data.newPassword !== data.passwordConfirm)
        throw new Error("两次输入的新密码不一致。");
      const r = await post("/api/account/password", {
        currentPassword: data.currentPassword,
        newPassword: data.newPassword,
      });
      state.user = r.user;
      render();
      toast("密码已修改，下次请使用新密码登录。");
    }
    if (form.id === "courses-form") {
      const selected = new FormData(form).getAll("subjects"),
        cls = state.classes.find((c) => c.id === data.classId);
      const courses = state.config.subjects.flatMap((subject, index) =>
        selected.includes(subject)
          ? [
              {
                subject,
                title: data[`title-${index}`],
                content: data[`content-${index}`],
                source: "master 维护",
              },
            ]
          : [],
      );
      await api(`/api/classes/${data.classId}/courses`, {
        method: "PUT",
        body: JSON.stringify({ courses }),
      });
      closeModal();
      await load();
      render();
      toast("班级课程已保存。");
    }
    if (form.id === "auth-form") {
      const activating = data.role === "activate";
      if (
        (activating || data.role === "setup") &&
        data.password !== data.passwordConfirm
      )
        throw new Error("两次输入的密码不一致。");
      const payload = activating
        ? {
            ...data,
            invite:
              localStorage.getItem("lexiclass-student-entry") || data.invite,
          }
        : data;
      const r = await post(
        data.role === "setup"
          ? "/api/setup"
          : activating
            ? "/api/student/activate"
            : "/api/login",
        payload,
      );
      if (activating) localStorage.removeItem("lexiclass-student-entry");
      state.user = r.user;
      state.authTab = "student";
      state.view = "dashboard";
      await load();
      openRequestedExam();
      render();
    }
    if (form.id === "class-form") {
      await post("/api/classes", data);
      closeModal();
      await load();
      state.view = "classes";
      render();
      toast("班级已创建，可以添加学生了。");
    }
    if (form.id === "students-form") {
      const names = data.names
        .split(/\r?\n/)
        .map((v) => v.trim())
        .filter(Boolean);
      if (!names.length) throw new Error("请至少填写一位学生。");
      const r = await post("/api/students", {
        students: names.map((name) => ({ name, classId: data.classId })),
      });
      await load();
      state.view = "students";
      render();
      invitesModal(r.students);
    }
    if (form.id === "task-form") {
      const fd = new FormData(form),
        cls = state.classes.find((c) => c.id === data.classId);
      if (!cls) throw new Error("请选择班级。");
      if (!cls.courses?.some((c) => c.subject === data.subject))
        throw new Error("请选择该班已配置的科目。");
      const studentIds = fd.getAll("studentIds"),
        students = state.students.filter((s) => s.classId === cls.id);
      if (!studentIds.length) throw new Error("请至少选择一名参加学生。");
      if (
        studentIds.some((id) => !students.some((student) => student.id === id))
      )
        throw new Error("所选学生不属于该班级。");
      const payload = {
        autoTitle: true,
        wordGroup: data.wordGroup,
        program: cls.program,
        subject: data.subject,
        mode: data.mode,
        questionType: data.questionType,
        opensAt: beijingISO(data.opensAt),
        closesAt: beijingISO(data.closesAt),
        duration: Number(data.duration),
        classIds: [cls.id],
        wordIds: fd.getAll("wordIds"),
        audience: studentIds.length === students.length ? "all" : studentIds,
      };
      const plan = currentTaskPlan();
      const pool = state.words.filter(
        (w) =>
          wordAvailableFor(w, cls.program, data.subject) &&
          wordAvailableToClass(w, cls),
      );
      const tasks = plan.map((entry, index) => {
        const wordIds =
          index === 0
            ? fd.getAll("wordIds")
            : pool
                .filter((w) => (w.groups || []).includes(entry.group))
                .map((w) => w.id);
        if (!wordIds.length || wordIds.length > 100)
          throw new Error(
            `${entry.group}有${wordIds.length}个词汇，请选择1–100个词汇的分组后单独发布。`,
          );
        return {
          ...payload,
          ...entry,
          wordIds,
          wordGroup: entry.group,
          autoTitle: true,
          title: automaticTaskTitle(
            cls.program,
            data.subject,
            entry.group,
            state.config.subjectNames,
          ),
        };
      });
      const published = await post("/api/tasks/batch", { tasks });
      closeModal();
      await load();
      state.view = "tasks";
      render();
      shareExams(published.tasks);
      toast("考试已发布，复制链接即可发给学生。");
    }
    if (form.id === "word-form") {
      await post("/api/words", {
        ...data,
        aliases: data.aliases
          .split(/[;；]/)
          .map((v) => v.trim())
          .filter(Boolean),
      });
      closeModal();
      await load();
      state.view = "words";
      render();
      toast("场景词汇已保存。");
    }
    if (form.id === "import-form") {
      const file = form.elements.csv.files[0];
      if (!file) throw new Error("请选择 CSV 文件。");
      if (file.size > 1024 * 1024)
        throw new Error("文件过大，请按每批最多 300 条拆分。");
      const words = parseCSV(await file.text());
      const r = await post("/api/words", { words });
      closeModal();
      await load();
      state.view = "words";
      render();
      toast(`已成功导入 ${r.words.length} 个场景词汇。`);
    }
    if (form.id === "review-form") {
      const r = await post(`/api/mistakes/${reviewing.id}/review`, {
        answer: data.answer,
      });
      await load();
      render();
      modal(
        r.correct ? "答对了，再向前一步。" : "别着急，再记牢一次。",
        r.resolved
          ? "这个词已标记为已掌握。"
          : `下次复习：${date(r.nextReview)}`,
        `<div class="alert ${r.correct ? "success" : "error"}">参考答案：<strong>${esc(r.answer)}</strong><br>你的答案：${esc(data.answer)}<br>连续正确 ${r.streak} / 3 次${r.gradingMethod === "ai" ? " · AI 语义判分" : ""}</div>`,
        `<button class="btn btn-primary" data-action="close-modal">知道了</button>`,
      );
    }
  } catch (error) {
    if (form.isConnected)
      formError(form, error.message || "操作失败，请重试。");
    else toast(error.message || "操作失败，请重试。", true);
  } finally {
    if (submit) submit.disabled = false;
  }
});
let searchTimer;
document.addEventListener("input", (e) => {
  const el = e.target;
  if (el.closest("#exam-form")) {
    readAnswers();
    saveVersion++;
    saveStatus("尚有答案等待保存…");
    const count = Object.values(state.attempt.attempt.answers).filter((v) =>
      v.trim(),
    ).length;
    $("#answered-count").textContent =
      `已作答 ${count} / ${state.attempt.questions.length} 题`;
    $("#exam-progress-fill").style.width =
      `${(count / state.attempt.questions.length) * 100}%`;
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => queueSave().catch(() => {}), 450);
  }
  if (el.dataset.filter === "search") {
    state.filter.search = el.value;
    state.wordLimit = 60;
    clearTimeout(searchTimer);
    searchTimer = setTimeout(() => {
      const pos = el.selectionStart;
      $("#main-view").innerHTML = content();
      const input = $("[data-filter=search]");
      input?.focus();
      input?.setSelectionRange(pos, pos);
    }, 180);
  }
});
document.addEventListener("beforeinput", (e) => {
  if (
    e.target.matches('#exam-form input[lang="en"]') &&
    e.inputType === "insertReplacementText" &&
    e.cancelable
  ) {
    e.preventDefault();
    toast("答题时不接受自动替换，请手动输入答案。");
  }
});
document.addEventListener("change", (e) => {
  const el = e.target;
  if (el.dataset.practiceSetting) {
    practiceFormSettings();
    state.practiceWrongLimit = 20;
    if (el.dataset.practiceSetting === "subject") {
      state.practiceSettings.wordGroup = "";
      state.practiceSettings.mistakesOnly = false;
    }
    if (
      ["subject", "wordGroup", "mistakesOnly"].includes(
        el.dataset.practiceSetting,
      )
    )
      $("#main-view").innerHTML = content();
    return;
  }
  if (el.dataset.grade) {
    const a = state.analytics,
      key = el.dataset.grade;
    a[key] = el.value;
    a.band = "all";
    if (key === "program") {
      a.subject = "all";
      a.classId = "all";
      a.group = "all";
    }
    if (key === "subject") {
      a.classId = "all";
      a.group = "all";
    }
    if (key === "classId") a.group = "all";
    $("#main-view").innerHTML = content();
    return;
  }
  if (el.dataset.filter && el.dataset.filter !== "search") {
    state.filter[el.dataset.filter] = el.value;
    state.wordLimit = 60;
    if (["program", "subject"].includes(el.dataset.filter))
      state.filter.group = "all";
    if (el.dataset.filter === "program") state.filter.classId = "all";
    $("#main-view").innerHTML = content();
  }
  if (el.dataset.change === "schedule") {
    state.scheduleMonth = el.form.elements.opensAt.value.slice(0, 7);
    renderTaskCalendar();
  }
  if (el.dataset.scheduleDate) {
    state.scheduleOverrides[el.dataset.scheduleDate] = el.value;
    renderTaskCalendar();
  }
  if (el.dataset.change === "task-class") {
    state.scheduleDates.clear();
    state.scheduleOverrides = {};
    taskFilters();
  }
  if (el.dataset.change === "task-words") taskWords();
  if (el.dataset.change === "task-summary") taskSummary();
});
document.addEventListener(
  "toggle",
  (e) => {
    if (e.target.dataset?.taskFolder)
      state.taskFolders[e.target.dataset.taskFolder] = e.target.open;
  },
  true,
);
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && modalOpen) closeModal();
  if ((e.key === "Enter" || e.key === " ") && e.target.matches(".class-card")) {
    e.preventDefault();
    e.target.click();
  }
  if (e.key === "Tab" && modalOpen) {
    const nodes = $$(
      "#modal-root button:not(:disabled),#modal-root input:not(:disabled),#modal-root select,#modal-root textarea,#modal-root a",
    );
    if (!nodes.length) return;
    const first = nodes[0],
      last = nodes[nodes.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  }
});
window.addEventListener("beforeunload", (e) => {
  if (state.attempt && saveVersion > savedVersion) {
    e.preventDefault();
    e.returnValue = "";
  }
});
window.addEventListener("beforeinstallprompt", (e) => {
  e.preventDefault();
  state.installPrompt = e;
});
window.addEventListener("offline", () => {
  $("#connection-status")?.replaceChildren(
    Object.assign(document.createElement("div"), {
      className: "connection-banner",
      textContent:
        "网络已断开。请保持答题页打开，恢复网络后会重试保存；服务端仍会按时交卷。",
    }),
  );
});
window.addEventListener("online", () => {
  if ($("#connection-status")) $("#connection-status").innerHTML = "";
  if (state.attempt) queueSave().catch(() => {});
  else refresh().catch(() => {});
});
setInterval(tick, 1000);
setInterval(() => {
  if (state.attempt && saveVersion > savedVersion && !submitting)
    queueSave().catch(() => {});
}, 5000);
setInterval(async () => {
  if (!state.user || state.attempt || document.hidden) return;
  try {
    await refresh();
    if (state.user.role === "student")
      for (const t of state.tasks) {
        if (
          !t.attempt?.submittedAt &&
          t.opensAt <= now() &&
          t.closesAt > now() &&
          !state.reminded.has(t.id)
        ) {
          state.reminded.add(t.id);
          if ("Notification" in window && Notification.permission === "granted")
            new Notification("词间课堂 · 有测试可以开始了", {
              body: t.title,
              icon: "/icon.svg",
              tag: t.id,
            });
        }
      }
  } catch {}
}, 30000);
async function init() {
  try {
    const query = new URLSearchParams(location.search),
      examId = query.get("exam");
    if (query.has("exam")) {
      sessionStorage.setItem(
        "lexiclass-exam",
        examId && /^[a-f0-9-]{36}$/i.test(examId) ? examId : "invalid-link",
      );
    }
    state.requestedExamId = sessionStorage.getItem("lexiclass-exam");
    const params = new URLSearchParams(location.hash.slice(1)),
      entry =
        params.get("invite") ||
        new URLSearchParams(location.search).get("invite");
    if (entry) {
      localStorage.setItem("lexiclass-student-entry", entry.toUpperCase());
      state.authTab = "activate";
      history.replaceState(
        null,
        "",
        location.pathname +
          (state.requestedExamId
            ? `?exam=${encodeURIComponent(state.requestedExamId)}`
            : ""),
      );
    }
    state.config = await api("/api/config");
    try {
      const me = await api("/api/me");
      state.user = me.user;
    } catch (e) {
      if (e.status !== 401) throw e;
    }
    if (state.user) {
      await load();
      openRequestedExam();
    }
    const practiceId = sessionStorage.getItem("lexiclass-practice");
    if (
      state.user?.role === "student" &&
      practiceId &&
      !state.requestedExamId
    ) {
      try {
        enterPractice(await api(`/api/practice/${practiceId}`));
      } catch {
        sessionStorage.removeItem("lexiclass-practice");
      }
    }
    render();
    if ("serviceWorker" in navigator)
      navigator.serviceWorker.register("/sw.js").catch(() => {});
  } catch (e) {
    $("#app").innerHTML =
      `<div class="loading-screen"><div class="brand-mark">L<span>·</span></div><h2>暂时无法连接课堂</h2><p>${esc(e.message)}</p><button class="btn btn-light" id="retry-init">重新连接</button></div>`;
    $("#retry-init").onclick = init;
  }
}
init();
