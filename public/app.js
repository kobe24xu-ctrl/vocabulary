import {
  exportableWords,
  buildVocabularyWorkbook,
  vocabularyExportFilename,
  VOCABULARY_XLSX_TYPE,
} from "./vocabulary-export.js";
import { MIXED_SUBJECT, taskSubjects, scopedTaskTitle } from "./task-scopes.js";
import {
  assessmentRows,
  gradeMetrics,
  assessmentGroups,
  learningGroups,
  courseGroups,
  studentGroups,
  scoreBins,
  inScoreBin,
  completedGrade,
  learningLabel,
  reportDay,
  REPORT_COLORS,
} from "./reporting.js";
import { linePlot, barPlot, donutPlot, miniPlot } from "./charts.js";
import {
  enrichGradeRows,
  collapseGradeRows,
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
  back: "M19 12H5 M11 6l-6 6 6 6",
  calendar:
    "M5 5h14a2 2 0 0 1 2 2v14H3V7a2 2 0 0 1 2-2 M7 3v4 M17 3v4 M3 11h18 M7 15h2 M13 15h2 M7 18h2",
  business: "M8 6V3h8v3 M3 6h18v14H3z M3 10l9 5 9-5 M10 13h4v4h-4z",
  accounting:
    "M5 2h14v20H5z M8 6h8 M8 10h2 M14 10h2 M8 14h2 M14 14h2 M8 18h2 M14 18h2",
  businessMath:
    "M4 3h12v18H4z M7 6h6 M7 10h1 M11 10h2 M7 14h1 M11 14h2 M18 9l4-4 M18 5h4v4 M18 16h4 M20 14v4",
  engineeringMath:
    "M3 18l5-12 5 12 M5 14h6 M15 20V4h6 M17 8h4 M17 12h4 M17 16h4",
  physics:
    "M12 10a2 2 0 1 0 0 4 2 2 0 0 0 0-4 M3 12a9 4 0 1 0 18 0 9 4 0 1 0-18 0 M7.5 4.2a9 4 60 1 0 9 15.6 9 4 60 1 0-9-15.6 M16.5 4.2a9 4 120 1 0-9 15.6 9 4 120 1 0 9-15.6",
  chemistry:
    "M9 3h6 M10 3v7L4 20q-1 2 2 2h12q3 0 2-2l-6-10V3 M7 15h10 M9 18h1 M14 19h1",
  computer: "M3 3h18v14H3z M9 21h6 M12 17v4 M7 7l3 3-3 3 M13 13h4",
  language:
    "M3 4h12 M9 2v2 M5 8q2 6 9 8 M13 5q-2 7-10 11 M13 21l4-11 4 11 M15 17h4",
  writing: "M4 3h10v5h5v13H4z M14 3l5 5 M8 11h6 M8 15h4 M15 19l5-5 2 2-5 5h-2z",
  biology: "M6 3q12 3 0 18 M18 3Q6 6 18 21 M8 6h8 M9 10h6 M9 14h6 M8 18h8",
  statistics: "M3 20h18 M6 16v-4 M12 16V5 M18 16V9 M4 7l5-4 7 3 5-3",
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
  ({
    Mixed: "grid",
    Economics: "economy",
    Business: "business",
    Accounting: "accounting",
    Mathematics: "math",
    "Integrated Mathematics": "businessMath",
    "Technical Mathematics": "engineeringMath",
    Physics: "physics",
    Chemistry: "chemistry",
    "Computer Science": "computer",
    English: "language",
    "Academic English": "writing",
    "Language Learning": "language",
    "Academic Writing": "writing",
    Biology: "biology",
    Statistics: "statistics",
  })[s] || "book";
let uiFontSize = 18;
try {
  const stored = Number(localStorage.getItem("classwords-ui-font-size"));
  if (Number.isFinite(stored) && stored >= 16 && stored <= 26)
    uiFontSize = stored;
} catch {}
document.documentElement.style.setProperty("--ui-font-size", `${uiFontSize}px`);
function fontControls() {
  return `<div class="font-size-control" role="group" aria-label="调节界面字号"><button type="button" data-action="font-size" data-step="-2" title="减小字号" aria-label="减小字号" ${uiFontSize <= 16 ? "disabled" : ""}>A−</button><span class="font-size-value" aria-live="polite">${uiFontSize}</span><button type="button" data-action="font-size" data-step="2" title="增大字号" aria-label="增大字号" ${uiFontSize >= 26 ? "disabled" : ""}>A＋</button><button type="button" data-action="font-size" data-reset="true" title="还原默认18号字体" aria-label="还原默认字号">↺</button></div>`;
}
function changeFontSize(button) {
  uiFontSize = button.dataset.reset
    ? 18
    : Math.min(26, Math.max(16, uiFontSize + Number(button.dataset.step)));
  document.documentElement.style.setProperty(
    "--ui-font-size",
    `${uiFontSize}px`,
  );
  try {
    localStorage.setItem("classwords-ui-font-size", String(uiFontSize));
  } catch {}
  $$(".font-size-control").forEach((node) => {
    node.outerHTML = fontControls();
  });
}
const CLASS_TONES = [
  ["#365f85", "#edf3fa", "#b9cde0"],
  ["#8a5574", "#f8eff4", "#dec5d5"],
  ["#926627", "#fcf4e5", "#e3cea7"],
  ["#397776", "#edf7f5", "#b9d9d5"],
  ["#665d9a", "#f2f0fa", "#ccc6e5"],
  ["#9a5746", "#fbf0ea", "#e5c8bb"],
  ["#536e38", "#f1f6e9", "#cad8b7"],
];
function classTone(cls) {
  const id = typeof cls === "string" ? cls : cls?.id;
  const ids = state.classes.map((c) => c.id).sort();
  const index =
    state.user?.role === "student" && state.user.classId === id
      ? (state.user.classColorIndex ?? 0)
      : Math.max(0, ids.indexOf(id));
  return CLASS_TONES[index % CLASS_TONES.length];
}
function classStyle(cls) {
  const [color, soft, border] = classTone(cls);
  return `--class-color:${color};--class-soft:${soft};--class-border:${border}`;
}
const backButton = (action, label = "返回班级列表") =>
  `<button class="btn btn-light back-button" data-action="${action}">${icon("back")}${label}</button>`;
function scopeTrail({ program, subject, student = false } = {}) {
  return `<nav class="scope-trail" aria-label="词库位置">${backButton(student ? "learning-back" : "library-back", subject && subject !== "all" ? "返回科目选择" : "返回项目选择")}<span>${esc(program || state.learning?.className || "")}</span>${subject && subject !== "all" ? `${icon("chevron")}<strong>${icon(subjectIcon(subject))}${esc(nameSubject(subject))}</strong>` : ""}</nav>`;
}
let choiceControlIndex = 0;
// Keep the original select as the form value, but expose direct buttons to users.
function enhanceChoiceControls() {
  const selectors = [
    'select[data-filter="program"]',
    'select[data-filter="classId"]',
    'select[data-filter="subject"]',
    'select[data-grade="program"]',
    'select[data-grade="classId"]',
    'select[data-grade="subject"]',
    'select[name="classId"]',
    'select[name="subject"]',
    'select[name="program"]',
  ];
  document.querySelectorAll(selectors.join(",")).forEach((select) => {
    const kind = select.dataset.filter || select.dataset.grade || select.name;
    if (!select.id) select.id = `direct-select-${++choiceControlIndex}`;
    select.classList.add("card-select-native");
    select.tabIndex = -1;
    select.setAttribute("aria-hidden", "true");
    let list = select.nextElementSibling;
    if (!list?.classList.contains("direct-choice-list")) {
      list = document.createElement("div");
      list.className = `direct-choice-list ${kind === "classId" ? "class-options" : ""}`;
      list.setAttribute("role", "group");
      select.after(list);
    }
    const label =
      select.getAttribute("aria-label") ||
      select.closest("label")?.querySelector("span")?.textContent ||
      (kind === "classId"
        ? "选择班级"
        : kind === "subject"
          ? "选择科目"
          : "选择项目");
    list.setAttribute("aria-label", label);
    const options = [...select.options].filter((o) => o.value !== "");
    const html =
      options
        .map((o) => {
          const cls =
            kind === "classId"
              ? state.classes.find((c) => c.id === o.value)
              : null;
          const symbol =
            kind === "classId"
              ? "class"
              : kind === "subject"
                ? subjectIcon(o.value)
                : "book";
          return `<button type="button" class="direct-choice ${o.selected ? "selected" : ""} ${cls ? "class-tinted" : ""}" style="${cls ? classStyle(cls) : ""}" data-action="choose-option" data-select="${esc(select.id)}" data-key="${esc(o.value)}" aria-pressed="${o.selected}" ${select.disabled || o.disabled ? "disabled" : ""}>${icon(o.value === "all" ? "grid" : symbol)}<span>${esc(o.textContent)}</span>${o.selected ? icon("check") : ""}</button>`;
        })
        .join("") ||
      `<span class="muted">${esc(select.options[0]?.textContent || "暂无可选内容")}</span>`;
    if (list._choiceMarkup !== html) {
      list._choiceMarkup = html;
      list.innerHTML = html;
    }
    list.classList.toggle("needs-selection", select.required && !select.value);
  });
}
new MutationObserver(enhanceChoiceControls).observe(document.body, {
  childList: true,
  subtree: true,
});
document.addEventListener(
  "invalid",
  (e) => {
    if (!e.target.matches(".card-select-native")) return;
    e.preventDefault();
    const list = e.target.nextElementSibling;
    list?.classList.add("selection-error");
    list?.querySelector("button:not(:disabled)")?.focus();
    if (e.target.form)
      formError(e.target.form, "请先选择班级、项目和科目中尚未选定的内容。");
  },
  true,
);

function retakeForm(taskId, studentId = "") {
  const task = state.tasks.find((t) => t.id === taskId);
  if (!task || task.closesAt > now()) {
    toast("请在原考试关闭后安排补考。", true);
    return;
  }
  const students = state.students.filter(
    (s) =>
      task.classIds.includes(s.classId) &&
      (task.audience === "all" || task.audience.includes(s.id)),
  );
  modal(
    "安排个人补考",
    task.title,
    `<p class="retake-explainer">补考沿用这次考试的词汇、题目与判分标准，原成绩保留。只有勾选的学生会收到新的考试提醒。</p><form id="retake-form"><input type="hidden" name="taskId" value="${task.id}"><div class="form-grid"><label class="form-field"><span>开放时间（北京时间）</span><input name="opensAt" type="datetime-local" value="${beijingInput()}" required></label><label class="form-field"><span>截止时间（北京时间）</span><input name="closesAt" type="datetime-local" value="${beijingInput(Date.now() + 86400000)}" required></label><label class="form-field full"><span>答题时长（分钟）</span><input name="duration" type="number" min="1" max="180" value="${task.duration}" required></label></div><div class="form-section">选择补考学生</div><div class="retake-students">${state.classes
      .filter((c) => task.classIds.includes(c.id))
      .map(
        (c) =>
          `<fieldset><legend>${esc(c.name)}</legend>${students
            .filter((s) => s.classId === c.id)
            .map((s) => {
              const old = state.results.find(
                (r) => r.taskId === task.id && r.studentId === s.id,
              );
              return `<label class="check-item"><input type="checkbox" name="studentIds" value="${s.id}" ${studentId === s.id ? "checked" : ""}><span><strong>${esc(s.name)}</strong><small>${old?.score !== null && Number.isFinite(old?.score) ? `原成绩 ${old.score}分` : "原考试未交卷"}</small></span></label>`;
            })
            .join("")}</fieldset>`,
      )
      .join("")}</div></form>`,
    `<button class="btn btn-light" data-action="close-modal">取消</button><button class="btn btn-primary" type="submit" form="retake-form">安排补考并通知</button>`,
    true,
  );
}

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
  report: newReport(),
  taskFolders: {},
  scheduleDates: new Set(),
  scheduleOverrides: {},
  scheduleMonth: "",
  studentCalendarMonth: "",
  studentCalendarDate: "",
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
  examIndex: 0,
  examPositionAttempt: null,
  boardChartsOpen: false,
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
const nameSubject = (s) =>
  s === MIXED_SUBJECT ? "多科目综合" : state.config?.subjectNames[s] || s;
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
  return `<div class="brand"><div class="brand-mark">${icon("book")}</div><div class="brand-name">词间课堂<small>LexiClass</small></div></div>`;
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
        ["classes", "class", "班级与学生"],
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
let examCalendarReady = false;
let examEventSource = null,
  examFallbackTimer = null,
  examNotificationUser = null,
  lastExamPulse = 0;
let examAlertItems = [],
  examPanelOpen = false;
let examAnnounced = new Set(),
  examAcknowledged = new Set(),
  examCompletedHere = new Set();
function alertPhaseKey(t) {
  return `${t.id}:${t.phase}`;
}
function noticeRoot() {
  let node = $("#exam-notice-root");
  if (!node) {
    node = document.createElement("div");
    node.id = "exam-notice-root";
    document.body.appendChild(node);
  }
  return node;
}
function visibleExamAlerts() {
  return examAlertItems.filter(
    (t) =>
      !examCompletedHere.has(t.id) &&
      t.closesAt > now() &&
      !(
        state.attempt &&
        !state.attempt.task.practice &&
        state.attempt.task.id === t.id
      ),
  );
}
function paintExamAlerts() {
  const root = noticeRoot(),
    items = visibleExamAlerts(),
    attention = items.filter(
      (t) => t.phase === "open" || !examAcknowledged.has(alertPhaseKey(t)),
    );
  const area = $("#exam-alert-area");
  if (area)
    area.innerHTML = `<button class="exam-alert-button ${attention.length ? "urgent" : ""}" data-action="alerts-open" aria-label="${attention.length}场待参加考试" title="查看老师发布的考试">${icon("bell")}<span>${attention.length ? `待考 ${attention.length}` : "考试提醒"}</span>${attention.length ? "<i></i>" : ""}</button>`;
  if (!items.length) examPanelOpen = false;
  root.innerHTML =
    examPanelOpen && !(state.attempt && !state.attempt.task.practice)
      ? `<section class="exam-notice" role="region" aria-label="待参加考试提醒"><header><div><span>老师的考试安排</span><h2>${items.some((t) => t.phase === "open") ? "你有考试可以参加" : "收到新的考试安排"}</h2></div><button class="icon-button" data-action="alerts-close" aria-label="关闭考试提醒">${icon("close")}</button></header><div class="exam-notice-items">${items
          .slice(0, 3)
          .map(
            (t) =>
              `<article><div>${t.retakeOf ? '<strong class="notice-retake">个人补考</strong>' : ""}<span>${t.phase === "open" ? "已开放 · 请及时参加" : "预约考试"}</span></div><h3>${esc(t.title)}</h3><p>${t.phase === "open" ? "截止" : "开放"}：${date(t.phase === "open" ? t.closesAt : t.opensAt, true)}</p><button class="btn btn-primary" data-action="alert-exam" data-id="${t.id}">${t.phase === "open" ? "进入考试" : "查看考试安排"} ${icon("arrow")}</button></article>`,
          )
          .join(
            "",
          )}</div><footer><button data-action="alerts-all">${items.length > 3 ? `还有 ${items.length - 3} 场 · ` : ""}查看全部考试</button><small>点击进入后，确认开始才计时。</small></footer></section>`
      : "";
}
function closeExamAlerts() {
  visibleExamAlerts()
    .filter((t) => t.phase !== "open")
    .forEach((t) => examAcknowledged.add(alertPhaseKey(t)));
  examPanelOpen = false;
  paintExamAlerts();
}
function receiveExamAlerts(snapshot, userId) {
  if (state.user?.id !== userId || state.user.role !== "student") return;
  lastExamPulse = Date.now();
  if (Number.isFinite(snapshot.serverTime))
    state.serverOffset = snapshot.serverTime - Date.now();
  examAlertItems = Array.isArray(snapshot.exams) ? snapshot.exams : [];
  examCalendarReady = true;
  paintStudentCalendar();
  const unseen = visibleExamAlerts().filter(
    (t) => !examAnnounced.has(alertPhaseKey(t)),
  );
  if (unseen.length && !(state.attempt && !state.attempt.task.practice)) {
    unseen.forEach((t) => examAnnounced.add(alertPhaseKey(t)));
    examPanelOpen = true;
  }
  paintExamAlerts();
}
function stopExamAlerts() {
  examEventSource?.close();
  examEventSource = null;
  clearInterval(examFallbackTimer);
  examFallbackTimer = null;
  lastExamPulse = 0;
}
function syncExamAlerts() {
  if (state.user?.role !== "student") {
    stopExamAlerts();
    examNotificationUser = null;
    examPanelOpen = false;
    examAlertItems = [];
    const root = $("#exam-notice-root");
    if (root) root.innerHTML = "";
    return;
  }
  const userId = state.user.id;
  if (examNotificationUser !== userId) {
    stopExamAlerts();
    examNotificationUser = userId;
    examCalendarReady = false;
    state.studentCalendarMonth = "";
    state.studentCalendarDate = "";
    examAnnounced = new Set();
    examAcknowledged = new Set();
    examCompletedHere = new Set();
    examAlertItems = [];
  }
  if (document.hidden) {
    stopExamAlerts();
    return;
  }
  paintExamAlerts();
  if (examFallbackTimer) return;
  const poll = () =>
    api("/api/student/alerts")
      .then((data) => receiveExamAlerts(data, userId))
      .catch(() => {});
  poll();
  if ("EventSource" in window && !state.user.isDemo) {
    examEventSource = new EventSource("/api/student/events");
    examEventSource.addEventListener("exams", (event) => {
      try {
        receiveExamAlerts(JSON.parse(event.data), userId);
      } catch {}
    });
    examEventSource.addEventListener("pulse", () => {
      lastExamPulse = Date.now();
    });
    examEventSource.addEventListener("retry-needed", () => {
      lastExamPulse = 0;
      poll();
    });
    examEventSource.onopen = () => {
      lastExamPulse = Date.now();
    };
    examEventSource.onerror = () => {
      lastExamPulse = 0;
    };
  }
  examFallbackTimer = setInterval(
    () => {
      if (!examEventSource || Date.now() - lastExamPulse > 12000) poll();
    },
    state.user.isDemo ? 5000 : 8000,
  );
}
async function enterAlertExam(id) {
  if (state.attempt && !state.attempt.task.practice) {
    if (state.attempt.task.id !== id)
      toast("请先完成当前考试，再参加另一场考试。");
    closeExamAlerts();
    return;
  }
  if (state.attempt?.task.practice) {
    readAnswers();
    await queueSave();
    state.attempt = null;
    submitting = false;
    clearTimeout(saveTimer);
    sessionStorage.removeItem("lexiclass-practice");
  }
  await load();
  const task = state.tasks.find((t) => t.id === id);
  if (!task) {
    toast("这场考试已结束或不再分配给你。", true);
    closeExamAlerts();
    return;
  }
  state.examResult = null;
  state.requestedExamId = id;
  sessionStorage.setItem("lexiclass-exam", id);
  state.view = "exam-entry";
  examPanelOpen = false;
  closeModal();
  render();
  window.scrollTo(0, 0);
}
document.addEventListener("visibilitychange", () => {
  if (document.hidden) stopExamAlerts();
  else syncExamAlerts();
});
window.addEventListener("pagehide", stopExamAlerts);

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
    )}</nav><div class="sidebar-spacer"></div><div class="side-footer"><div class="avatar">${esc(state.user.name.slice(0, 1))}</div><div><strong>${esc(state.user.name)}</strong><small>${teacher ? "Master 管理台" : "学生学习空间"}</small></div><button data-action="logout" title="退出登录" aria-label="退出登录">${icon("logout")}</button></div></aside><header class="topbar"><div class="breadcrumb"><button class="icon-button mobile-menu" data-action="menu" aria-label="展开导航">${icon("menu")}</button><span>${teacher ? "Master 管理台" : "词间课堂"}</span>${icon("chevron")}<strong>${label}</strong></div><div class="top-actions">${fontControls()}${teacher ? "" : '<div id="exam-alert-area"></div>'}<span class="today-label">${new Date().toLocaleDateString("zh-CN", { year: "numeric", month: "long", day: "numeric", weekday: "long" })}</span><span class="divider"></span>${teacher ? `<button class="btn btn-light btn-sm" data-action="install">${icon("download")}教师桌面快捷方式</button>` : '<span class="badge gray">网页学习</span>'}<button class="icon-button" data-action="help" title="使用帮助" aria-label="使用帮助">${icon("help")}</button><span class="avatar">${esc(state.user.name.slice(0, 1))}</span></div></header>${state.user.isDemo ? `<div class="demo-banner">演示空间 · 所有姓名与成绩均为示例，和正式班级隔离。${teacher ? '<button data-action="demo-pick">体验学生端 →</button>' : '<button data-action="demo-teacher">返回教师端 →</button>'}</div>` : ""}${state.user.role === "student" && state.user.initialPassword ? '<div class="demo-banner">账号已由老师开通，你可以设置自己的登录密码。<button data-action="nav" data-view="account">修改密码 →</button></div>' : ""}<div id="connection-status">${!navigator.onLine ? '<div class="connection-banner">当前离线。测试和提交需要联网，请保持应用打开并恢复连接。</div>' : ""}</div><main class="main ${teacher ? "" : "student-main"}" id="main-view">${content()}</main><footer class="main page-footer"><span>LexiClass 词间课堂 · 让词汇在语境中生长</span><span>${teacher ? "UNSW · NCUK · UOW" : "每一个进步，都值得被记录。"}</span></footer></div>`;
}
function heading(title, subtitle, actions = "") {
  return `<div class="page-heading"><div><h1>${title}</h1><p>${subtitle}</p></div><div class="heading-actions">${actions}</div></div>`;
}
function stat(label, value, unit, ic, foot, color = "") {
  return `<div class="stat-card"><div class="stat-top">${label}<span class="stat-icon ${color}">${icon(ic)}</span></div><div class="stat-number mono">${value ?? "—"}<small>${unit}</small></div><div class="stat-foot">${foot}</div></div>`;
}
function recentTask(t) {
  const [label, color] = statusOf(t);
  return `<div class="task-row"><div class="subject-icon ${t.subject}">${icon(subjectIcon(t.subject))}</div><div class="task-detail"><div class="task-title">${esc(t.title)}</div><div class="task-meta"><span>${esc(programShort(t.program))} · ${esc(nameSubject(t.subject))}</span><span>·</span><span>${t.questionCount} 题 / ${t.duration} 分钟</span><span>·</span><span>${t.classIds.map(clsName).map(esc).join("、")}</span></div></div><div class="task-side">${badge(label, color, true)}<p>${t.submitted} / ${t.studentCount} 已提交</p></div><button class="btn btn-quiet" data-action="task-results" data-id="${t.id}" title="查看成绩">${icon("chevron")}</button></div>`;
}
function gradeData() {
  const a = state.analytics;
  const all = assessmentRows(
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
  const rows = collapseGradeRows(
    scope.filter(
      (r) =>
        a.group === "all" ||
        (a.group === "ungrouped"
          ? !r.groups.length
          : r.groups.includes(a.group)),
    ),
  );
  return { all, scope, rows };
}
function gradeDashboard(compact = false) {
  const a = state.analytics,
    { all, scope, rows } = gradeData();
  const projectRows = all.filter(
    (r) =>
      (a.program === "all" || r.program === a.program) &&
      (a.classId === "all" || r.classId === a.classId),
  );
  const subjects = [
    ...new Set([
      ...projectRows.map((r) => r.subject),
      ...state.classes
        .filter(
          (c) =>
            (a.program === "all" || c.program === a.program) &&
            (a.classId === "all" || c.id === a.classId),
        )
        .flatMap((c) => (c.courses || []).map((x) => x.subject)),
    ]),
  ];
  const groups = [...new Set(scope.flatMap((r) => r.groups))].sort((x, y) =>
    x.localeCompare(y, "en", { numeric: true }),
  );
  const weekly = learningGroups(
    scope.filter((r) => r.examAt <= now() || completedGrade(r)),
  );
  const classes = state.classes.map((c) => ({
    key: c.id,
    label: c.name,
    value: gradeAverage(rows.filter((r) => r.classId === c.id)),
    color: classTone(c)[0],
  }));
  const visible = rows.filter((r) => a.band === "all" || inScoreBin(r, a.band));
  return `${compact ? "" : heading("教学概览", "先看整体变化，再按班级进入详细成绩报告。", `<button class="btn btn-light" data-action="nav" data-view="results">${icon("chart")}按班级查看成绩</button><button class="btn btn-primary" data-action="create-task">${icon("plus")}发布听写</button>`)}<section class="panel grade-filters"><label>课程项目<select data-grade="program" aria-label="成绩项目">${option("all", "全部项目", a.program)}${state.config.programs.map((p) => option(p, p, a.program)).join("")}</select></label><label>科目<select data-grade="subject" aria-label="成绩科目">${option("all", "全部科目", a.subject)}${subjects.map((s) => option(s, nameSubject(s), a.subject)).join("")}</select></label><label>周次 / Topic<select data-grade="group" aria-label="成绩周次">${option("all", "全部周次 / Topic", a.group)}${groups.map((g) => option(g, learningLabel(g), a.group)).join("")}${scope.some((r) => !r.groups.length) ? option("ungrouped", "未标注周次 / 单元", a.group) : ""}</select></label><label>班级<select data-grade="classId" aria-label="成绩班级">${option("all", "全部班级", a.classId)}${state.classes
    .filter(
      (c) =>
        (a.program === "all" || c.program === a.program) &&
        (a.subject === "all" ||
          c.courses?.some((x) => x.subject === a.subject)),
    )
    .map((c) => option(c.id, c.name, a.classId))
    .join(
      "",
    )}</select></label><button class="btn btn-light" data-action="grade-reset">重置</button></section>${reportMetricsView(rows)}<section class="report-chart-grid"><div class="panel report-panel"><header class="report-panel-header"><div><h2>教学周平均分趋势</h2><p>点击成绩点筛选周次，收到答卷后自动更新。</p></div></header>${linePlot([{ name: "平均分", color: "#365f80", points: weekly.map((g) => ({ key: g.key, value: g.average, label: g.label })) }], { items: weekly.map((g) => ({ key: g.key, label: g.label })), action: "grade-group", selected: a.group })}</div><div class="panel report-panel"><header class="report-panel-header"><div><h2>成绩分布</h2><p>点击区间查看相应学生。</p></div></header>${donutPlot(scoreBins(rows), { action: "grade-band", selected: a.band, average: gradeAverage(rows) })}${a.band !== "all" ? '<button class="btn btn-quiet" data-action="grade-band" data-key="all">显示全部分数段</button>' : ""}</div></section><section class="panel report-panel"><header class="report-panel-header"><div><h2>班级表现</h2><p>点击班级，进入各科成绩分析。</p></div></header>${barPlot(classes, { action: "report-class" })}</section><section class="panel report-panel"><header class="report-panel-header"><div><h2>学生学习表现</h2><p>点击学生查看各科、各次考试的完整学习画像。</p></div></header>${reportStudentCards(visible)}</section><p class="report-footnote">平均分仅统计已交答卷，未交卷不会被当成零分。各教学周的考试范围按词库分组识别。</p>`;
}
function boardTeacherCard(task) {
  const cls = state.classes.find((c) => task.classIds.includes(c.id));
  const rows = reportData().filter((r) => r.taskId === task.id),
    average = gradeAverage(rows);
  const [status, color] = statusOf(task);
  return `<article class="board-exam-card class-tinted" style="${classStyle(cls)}"><header><span>${esc(task.classIds.map(clsName).join("、"))}</span>${badge(status, color)}</header><button class="board-exam-open" data-action="task-results" data-id="${task.id}"><span class="board-subject">${icon(subjectIcon(taskSubjectForClass(task, cls)))}${esc(nameSubject(taskSubjectForClass(task, cls)))}</span><h3>${esc(task.title)}</h3><p>${date(task.opensAt)} 开放<br>${task.questionCount}题 / ${task.duration}分钟 / ${task.questionType === "choice" ? "五选一" : "填空题"}</p></button><div class="board-task-completion"><span>${task.submitted} / ${task.studentCount}人已提交</span>${average !== null ? `<strong>${average}<small>均分</small></strong>` : ""}</div><div class="board-card-actions"><button class="btn btn-light btn-sm" data-action="task-share" data-id="${task.id}">考试链接</button><button class="btn btn-quiet btn-sm" data-action="task-results" data-id="${task.id}">查看成绩${icon("arrow")}</button></div></article>`;
}
function boardColumn(
  title,
  items,
  { student = false, emptyText = "这里暂时没有考试。", kind = "later" } = {},
) {
  return `<section class="board-column"><header><i class="board-status-dot ${kind}"></i><h2>${title}</h2><span>${items.length}</span></header><div>${
    items
      .slice(0, 3)
      .map(student ? studentTaskCard : boardTeacherCard)
      .join("") ||
    `<div class="board-column-empty">${icon(kind === "done" ? "check" : "calendar")}<p>${emptyText}</p></div>`
  }</div>${items.length > 3 ? `<button class="btn btn-quiet board-more" data-action="nav" data-view="${student && kind === "done" ? "history" : "tasks"}">查看全部 ${items.length} 场${icon("arrow")}</button>` : ""}</section>`;
}
function dashboard() {
  const open = state.tasks
    .filter((t) => t.opensAt <= now() && t.closesAt > now())
    .sort((a, b) => a.closesAt - b.closesAt);
  const upcoming = state.tasks
    .filter((t) => t.opensAt > now())
    .sort((a, b) => a.opensAt - b.opensAt);
  const done = state.tasks
    .filter((t) => t.closesAt <= now())
    .sort((a, b) => b.closesAt - a.closesAt);
  return `${heading("教学概览", "按班级分色，按考试状态安排每天的教学。", `<button class="btn btn-light" data-action="nav" data-view="results">${icon("chart")}成绩分析</button><button class="btn btn-primary" data-action="create-task">${icon("plus")}发布听写</button>`)}<div class="board-class-strip">${state.classes.map((c) => `<button data-action="board-class" data-id="${c.id}" style="${classStyle(c)}"><i></i><span>${esc(c.name)}</span><small>${state.students.filter((s) => s.classId === c.id).length}人</small></button>`).join("")}</div><div class="classroom-board">${boardColumn("正在开放", open, { kind: "open", emptyText: "当前没有开放的考试。" })}${boardColumn("接下来", upcoming, { kind: "later", emptyText: "下一场听写，随时可以安排。" })}${boardColumn("已经结束", done, { kind: "done", emptyText: "考试结束后，在这里查看成绩。" })}</div><details class="board-teaching-progress" data-board-charts ${state.boardChartsOpen ? "open" : ""}><summary><span>${icon("chart")}教学进展与成绩图表</span><span>按项目、班级、科目和周次查看 ${icon("down")}</span></summary><div>${gradeDashboard(true)}</div></details>`;
}
function studentDashboard() {
  const pending = state.tasks.filter(
    (t) => !t.attempt?.submittedAt && t.closesAt > now(),
  );
  const open = pending
    .filter((t) => t.opensAt <= now())
    .sort((a, b) => a.closesAt - b.closesAt);
  const upcoming = pending
    .filter((t) => t.opensAt > now())
    .sort((a, b) => a.opensAt - b.opensAt);
  const done = state.tasks
    .filter((t) => t.attempt?.submittedAt)
    .sort((a, b) => b.attempt.submittedAt - a.attempt.submittedAt);
  const average = done.length
    ? mean(done.map((t) => ({ score: t.attempt.score })))
    : null;
  const due = state.mistakes.filter(
    (m) => !m.resolved && m.nextReview <= now(),
  );
  return `${heading("我的学习", `${esc(state.user.name)} / ${esc(state.user.className)}`, `<button class="btn btn-light" data-action="nav" data-view="learning">${icon("book")}词汇学习</button><button class="btn btn-primary" data-action="nav" data-view="practice">${icon("repeat")}自主模拟</button>`)}<div class="board-student-summary"><span style="${classStyle(state.user.classId)}"><i></i>${esc(state.user.className)}</span><span>已完成 ${done.length} 场听写</span><span>平均成绩 ${average ?? "—"} 分</span><button data-action="nav" data-view="review">${due.length} 个错词待复习 ${icon("arrow")}</button></div><div class="classroom-board student-board">${boardColumn("现在可以参加", open, { student: true, kind: "open", emptyText: "现在没有开放的测试，先学一组词汇吧。" })}${boardColumn("接下来", upcoming, { student: true, kind: "later", emptyText: "老师发布新考试后，会自动显示在这里。" })}${boardColumn("已经完成", done, { student: true, kind: "done", emptyText: "交卷后可以随时回看成绩。" })}</div><div id="student-calendar-root">${studentCalendar()}</div>`;
}

function option(value, label, current) {
  return `<option value="${esc(value)}" ${current === value ? "selected" : ""}>${esc(label)}</option>`;
}
function filters({
  program = true,
  classes = false,
  subject = false,
  subjectOptions = state.config.subjects,
  subjectPlaceholder = "全部科目",
  search = false,
} = {}) {
  return `<div class="toolbar">${search ? `<div class="search-field">${icon("search")}<input data-filter="search" aria-label="搜索" placeholder="搜索${["students", "classes"].includes(state.view) ? "班级或学生姓名" : "听写或词汇"}…" value="${esc(state.filter.search)}"></div>` : ""}${program ? `<select data-filter="program" aria-label="按课程项目筛选">${option("all", "全部课程项目", state.filter.program)}${state.config.programs.map((p) => option(p, p, state.filter.program)).join("")}</select>` : ""}${
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
  }${subject ? `<select data-filter="subject" aria-label="按科目筛选">${option("all", subjectPlaceholder, state.filter.subject)}${subjectOptions.map((s) => option(s, nameSubject(s), state.filter.subject)).join("")}</select>` : ""}</div>`;
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
        taskSubjects(t).includes(state.filter.subject) ||
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
  const cls = state.classes.find((c) => c.id === state.filter.classId);
  const tasks = filteredTasks();
  const headingActions = `${cls ? backButton("tasks-back", state.filter.subject !== "all" ? "返回班级科目" : "返回班级列表") : ""}<button class="btn btn-primary" data-action="create-task">${icon("plus")}发布听写</button>`;
  const header = heading(
    "听写任务",
    "点击班级，再点击科目查看考试；各班使用固定的区分色。",
    headingActions,
  );
  if (!cls)
    return (
      header +
      filters({ search: true }) +
      classChoiceCards("tasks-class", state.filter.search)
    );
  const subjects = [
    ...new Set([
      ...(cls.courses || []).map((c) => c.subject),
      ...state.tasks
        .filter((t) => t.classIds.includes(cls.id))
        .map((t) => taskSubjectForClass(t, cls)),
    ]),
  ];
  const subject = state.filter.subject;
  const context = `<section class="class-navigation-context class-tinted" style="${classStyle(cls)}"><span class="class-emblem">${icon("class")}</span><div><small>${esc(cls.program)}</small><h2>${esc(cls.name)}</h2><p>${state.students.filter((s) => s.classId === cls.id).length} 位学生 · ${subjects.length} 门科目</p></div></section>`;
  if (subject === "all")
    return (
      header +
      context +
      `<div class="task-course-choices scope-subject-grid">${
        subjects
          .map((s) => {
            const entries = state.tasks.filter(
              (t) =>
                t.classIds.includes(cls.id) &&
                (taskSubjects(t).includes(s) ||
                  taskSubjectForClass(t, cls) === s),
            );
            return `<button data-action="tasks-subject" data-key="${esc(s)}"><span class="subject-icon">${icon(subjectIcon(s))}</span><div><strong>${esc(nameSubject(s))}</strong><small>${entries.length} 次听写 · ${entries.filter((t) => t.opensAt <= now() && t.closesAt > now()).length} 场进行中</small></div>${icon("arrow")}</button>`;
          })
          .join("") || empty("尚未配置科目", "请在班级与学生中配置本班课程。")
      }</div>`
    );
  const entries = tasks.sort((a, b) => b.opensAt - a.opensAt);
  const rows = entries
    .map((t) => {
      const [label, color] = statusOf(t);
      return `<article class="task-table-row"><div><strong>${esc(t.title)}</strong><small>${t.questionCount} 题 · ${t.duration} 分钟 · ${esc(taskModeName(t))}${t.retakeOf ? " · 个人补考" : ""}</small></div><div>${date(t.opensAt)}<small>至 ${date(t.closesAt)}</small></div><div>${t.submitted} / ${t.studentCount}</div><div>${badge(label, color, true)}</div><div class="task-actions"><button class="btn btn-light btn-sm" data-action="task-share" data-id="${t.id}">链接</button><button class="btn btn-light btn-sm" data-action="task-results" data-id="${t.id}">成绩</button>${t.closesAt <= now() ? `<button class="btn btn-light btn-sm" data-action="retake-create" data-id="${t.id}">安排补考</button>` : ""}<button class="btn btn-danger btn-sm" data-action="delete-task" data-id="${t.id}">删除</button></div></article>`;
    })
    .join("");
  return (
    header +
    context +
    `<div class="task-subject-title">${icon(subjectIcon(subject))}<h2>${esc(nameSubject(subject))}</h2><span>${entries.length} 次听写</span></div>${filters({ program: false, search: true })}<details class="task-subject-folder class-tinted" style="${classStyle(cls)}" data-task-folder="${cls.id}:${esc(subject)}" ${(state.taskFolders[`${cls.id}:${subject}`] ?? true) ? "open" : ""}><summary><strong>${icon(subjectIcon(subject))}${esc(nameSubject(subject))}</strong><span>点击收起 / 展开考试</span></summary><div class="task-list-head"><span>听写名称 / 题型</span><span>开放 / 截止</span><span>提交</span><span>状态</span><span>操作</span></div>${rows || empty("本科目还没有听写", "点击发布听写，为本班安排考试。")}</details>`
  );
}

function classesView() {
  return studentsView();
}
function studentsView() {
  const cls = state.classes.find((c) => c.id === state.filter.classId);
  const q = state.filter.search.trim().toLowerCase();
  const title = heading(
    "班级与学生",
    cls
      ? "按班级管理学生账号，点击学生查看全科学习画像。"
      : "先选择班级，再展开学生名单。",
    `<button class="btn btn-light" data-action="export-students">${icon("download")}导出${cls ? "本班" : "名单"}</button>${cls ? `<button class="btn btn-light" data-action="class-courses" data-id="${cls.id}">${icon("book")}管理课程</button><button class="btn btn-primary" data-action="add-students">${icon("plus")}添加学生</button>` : `<button class="btn btn-primary" data-action="create-class">${icon("plus")}新建班级</button>`}`,
  );
  if (!cls)
    return (
      title +
      filters({ classes: false, search: true }) +
      classChoiceCards("roster-class", q)
    );
  const rows = state.students
    .filter(
      (s) =>
        s.classId === cls.id &&
        `${s.name} ${s.username || ""}`.toLowerCase().includes(q),
    )
    .sort((a, b) => a.name.localeCompare(b.name, "zh-CN"));
  return `${title}<nav class="report-breadcrumb">${backButton("roster-root")}<button data-action="roster-root">全部班级</button>${icon("chevron")}<strong>${esc(cls.name)}</strong></nav><div class="roster-context class-tinted" style="${classStyle(cls)}"><div><span>${esc(cls.program)}</span><h2>${esc(cls.name)}</h2><p>${state.students.filter((s) => s.classId === cls.id).length} 位学生 · ${(cls.courses || []).map((c) => esc(c.title || nameSubject(c.subject))).join(" · ")}</p></div><div class="search-field">${icon("search")}<input data-filter="search" aria-label="搜索本班学生" placeholder="搜索本班姓名或账号" value="${esc(state.filter.search)}"></div></div><section class="class-courses-strip" aria-label="本班课程">${(cls.courses || []).map((c) => `<button class="course-tag" data-action="class-course-detail" data-id="${cls.id}" data-key="${esc(c.subject)}">${icon(subjectIcon(c.subject))}${esc(c.title || nameSubject(c.subject))}${icon("arrow")}</button>`).join("")}</section><div class="roster-student-grid class-tinted" style="${classStyle(cls)}">${
    rows
      .map((s) => {
        const history = reportData().filter((r) => r.studentId === s.id),
          exams = assessmentGroups(history)
            .filter((e) => Number.isFinite(e.average))
            .slice(-7);
        return `<article class="roster-student-card"><button class="roster-person" data-action="report-student" data-id="${s.id}"><span class="avatar">${esc(s.name.slice(-1))}</span><div><h3>${esc(s.name)}</h3><small>${esc(s.username || "尚未开通账号")}</small></div>${icon("arrow")}</button><div class="roster-student-progress"><div><strong>${s.average ?? "—"}</strong><small>${s.average === null ? "等待首次听写" : "正式听写均分"}</small></div>${miniPlot(exams.map((e) => e.average))}</div><div class="roster-student-status"><span>${s.attempts}次完成</span><span>${s.mistakes}项待复习</span>${badge(s.accountReady ? "账号已开通" : "待开通", s.accountReady ? "gray" : "gold")}</div><details class="student-account-menu"><summary>账号操作 ${icon("down")}</summary><div><button class="btn btn-light btn-sm" data-action="student-invite" data-id="${s.id}">重置并获取入口</button><button class="btn btn-danger btn-sm" data-action="delete-student" data-id="${s.id}">删除学生</button></div></details></article>`;
      })
      .join("") ||
    empty("没有匹配的学生", "可调整搜索条件，或向这个班级添加学生。")
  }</div>`;
}
function wordGrammar(word) {
  if (!word.partOfSpeech) return "";
  return `<div class="word-grammar"><span>${esc(word.partOfSpeech)}</span>${word.partOfSpeechNote ? `<p>${esc(word.partOfSpeechNote)}</p>` : ""}</div>`;
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
function libraryGroupLabel(group) {
  const semester = /^Term\s+(\d+)\s*·\s*Week\s+(\d+)/i.exec(group || "");
  if (semester) return `第${semester[1]}学期 · 第${Number(semester[2])}周`;
  const week = /^Week\s*(\d+)/i.exec(group || "");
  if (week) return `第${Number(week[1])}周 · W${week[1].padStart(2, "0")}`;
  return group;
}
function librarySubjectChoices(subjects, { student = false } = {}) {
  return `<section class="scope-picker"><div class="scope-picker-copy">${icon("book")}<h2>选择${student ? "你的学习科目" : "课程科目"}</h2><p>选定科目后，才会显示对应的词汇和周次 / Topic。</p></div><div class="scope-subject-grid">${subjects.map((s) => `<button data-action="${student ? "learning-subject" : "library-subject"}" data-key="${esc(s)}"><span class="subject-icon">${icon(subjectIcon(s))}</span><strong>${esc(nameSubject(s))}</strong>${icon("arrow")}</button>`).join("") || '<p class="muted">当前项目尚未配置科目。</p>'}</div></section>`;
}
function wordsView() {
  const program = state.filter.program,
    subjects = wordSubjects(program);
  if (program === "all" || !subjects.includes(state.filter.subject)) {
    state.filter.subject = "all";
    state.filter.group = "all";
  }
  const selected = program !== "all" && state.filter.subject !== "all";
  const header = heading(
    "课程词库",
    "先选择项目与科目，再按教学周或Topic查阅词汇。",
    `<button class="btn btn-light" data-action="export-words">${icon("download")}导出单词</button><button class="btn btn-light" data-action="import-words">${icon("upload")}批量导入</button><button class="btn btn-primary" data-action="add-word">${icon("plus")}添加词汇</button>`,
  );
  const controls =
    program === "all"
      ? ""
      : scopeTrail({ program, subject: state.filter.subject });
  if (program === "all")
    return (
      header +
      controls +
      `<section class="scope-picker"><div class="scope-picker-copy">${icon("book")}<h2>从一个课程项目开始</h2><p>各项目的词汇、科目与周次分别整理。</p></div><div class="scope-program-grid">${state.config.programs.map((p) => `<button data-action="library-program" data-key="${esc(p)}"><span>${esc(programShort(p))}</span><strong>${esc(p)}</strong><small>${wordSubjects(p).length} 门可选科目</small>${icon("arrow")}</button>`).join("")}</div></section>`
    );
  if (!selected) return header + controls + librarySubjectChoices(subjects);
  const all = state.words.filter((w) =>
    wordAvailableFor(w, program, state.filter.subject),
  );
  const available = all.some((w) => w.program !== "通用示例")
    ? all.filter((w) => w.program !== "通用示例")
    : all;
  const groups = [...new Set(available.flatMap((w) => w.groups || []))].sort(
    (a, b) => a.localeCompare(b, "en", { numeric: true }),
  );
  const group = groups.includes(state.filter.group)
    ? state.filter.group
    : "all";
  const words = available.filter(
    (w) =>
      (group === "all" || w.groups?.includes(group)) &&
      `${w.term} ${w.translation}`
        .toLowerCase()
        .includes(state.filter.search.toLowerCase()),
  );
  const groupType =
    program === "NCUK 国际预科" &&
    ["Business", "Economics"].includes(state.filter.subject)
      ? "Topic"
      : "周次 / 单元";
  return (
    header +
    controls +
    `<div class="search-field library-search">${icon("search")}<input data-filter="search" aria-label="搜索当前科目词汇" placeholder="搜索这个科目的词汇…" value="${esc(state.filter.search)}"></div>` +
    `<div class="library-current-scope"><div><span>${esc(program)}</span><h2>${esc(nameSubject(state.filter.subject))}</h2></div><label><span>${groupType}</span><select data-filter="group" aria-label="按当前科目周次筛选">${option("all", `全部${groupType}`, group)}${groups.map((g) => option(g, libraryGroupLabel(g), group)).join("")}</select></label><p>${words.length} 个词汇 · 已显示 ${Math.min(words.length, state.wordLimit || 60)} 个</p></div><div class="cards-grid">${words
      .slice(0, state.wordLimit || 60)
      .map(
        (w) =>
          `<article class="word-card">${badge(nameSubject(state.filter.subject), "gray")}${program === "UOW 沃隆港预科" && w.program === "UNSW 新南预科" ? badge("新南共用词库") : ""}<h3>${esc(w.term)}</h3><p class="translation">${esc(w.translation)}</p>${wordGrammar(w)}<div class="word-sentence">${highlight(w.sentence, w.term)}</div><p class="table-secondary word-chinese-context">${esc(w.sentenceZh)}</p><footer><span>${esc((w.groups || []).map(libraryGroupLabel).join(" · ") || w.source)}</span></footer></article>`,
      )
      .join(
        "",
      )}</div>${words.length > (state.wordLimit || 60) ? '<button class="btn btn-light" data-action="more-words">加载更多词汇</button>' : ""}${!words.length ? empty("当前范围暂无词汇", "可调整周次或搜索条件，也可导入这个科目的词汇。") : ""}<p class="library-note">词汇由master按课程维护，双语例句用于课堂学习与模拟练习。</p>`
  );
}

function visibleResults() {
  return reportRows();
}
function newReport() {
  return {
    classId: null,
    subject: null,
    studentId: null,
    group: "all",
    taskId: null,
    band: "all",
    limit: 16,
    hidden: [],
    studentLimit: 48,
    examLimit: 12,
  };
}
function reportData() {
  const c = state.reportCache;
  if (
    c &&
    c.results === state.results &&
    c.tasks === state.tasks &&
    c.words === state.words &&
    c.classes === state.classes
  )
    return c.rows;
  const rows = assessmentRows(
    state.results,
    state.tasks,
    state.words,
    state.classes,
  );
  state.reportCache = {
    results: state.results,
    tasks: state.tasks,
    words: state.words,
    classes: state.classes,
    rows,
  };
  return rows;
}
function reportRows({ group = true, task = true, band = false } = {}) {
  const r = state.report;
  return reportData().filter(
    (x) =>
      (!r.classId || x.classId === r.classId) &&
      (!r.studentId || x.studentId === r.studentId) &&
      (!r.subject || x.subject === r.subject) &&
      (!group ||
        r.group === "all" ||
        (r.group === "未标注分组"
          ? !x.groups.length
          : x.groups.includes(r.group))) &&
      (!task || !r.taskId || x.taskId === r.taskId) &&
      (!band || inScoreBin(x, r.band)),
  );
}
function openStudentReport(id) {
  const student = state.students.find((s) => s.id === id);
  if (!student) return;
  state.report = { ...newReport(), classId: student.classId, studentId: id };
  state.resultTaskId = null;
  state.view = "results";
  state.examResult = null;
  render();
  window.scrollTo(0, 0);
}
function reportCourseName(subject, cls) {
  return (
    cls?.courses?.find((c) => c.subject === subject)?.title ||
    nameSubject(subject)
  );
}
function reportStudentPicker() {
  return `<label class="report-student-picker"><span>${icon("users")}查看学生学习画像</span><select data-report-student aria-label="查看某位学生的各科成绩">${option("", "选择学生…", state.report.studentId || "")}${state.classes
    .map(
      (c) =>
        `<optgroup label="${esc(c.name)}">${state.students
          .filter((s) => s.classId === c.id)
          .sort((a, b) => a.name.localeCompare(b.name, "zh-CN"))
          .map((s) => option(s.id, s.name, state.report.studentId))
          .join("")}</optgroup>`,
    )
    .join("")}</select></label>`;
}
function reportBreadcrumb(cls, student) {
  return `<nav class="report-breadcrumb" aria-label="成绩分析层级"><button data-action="report-root">全部班级</button>${cls ? `${icon("chevron")}<button data-action="report-class" data-id="${cls.id}">${esc(cls.name)}</button>` : ""}${student ? `${icon("chevron")}<strong>${esc(student.name)} · 全科学习画像</strong>` : state.report.subject ? `${icon("chevron")}<strong>${esc(reportCourseName(state.report.subject, cls))}</strong>` : ""}</nav>`;
}
function reportMetricsView(rows) {
  const m = gradeMetrics(rows, now());
  return `<section class="report-metrics">${stat("平均成绩", m.average, "分", "chart", `基于 ${m.completed} 份已交答卷`, "blue")}${stat("已开放考试提交率", m.completion, "%", "check", m.due ? `${m.completed} 份已交 · ${m.due} 份应交` : "当前没有已开放的考试")}${stat("达到80分", m.good, "份", "spark", "仅统计实际提交成绩", "gold")}${stat("已参加学生", new Set(rows.filter(completedGrade).map((r) => r.studentId)).size, "位", "users", m.upcoming ? `另有 ${m.upcoming} 份待开始考试` : `${m.missing} 份逾期未交`)}</section>`;
}
function classChoiceCards(action = "report-class", search = "") {
  const q = search.trim().toLowerCase();
  const classes = state.classes.filter(
    (c) =>
      (state.filter.program === "all" || c.program === state.filter.program) &&
      (!q ||
        `${c.name} ${c.program}`.toLowerCase().includes(q) ||
        (action === "tasks-class" &&
          state.tasks.some(
            (t) =>
              t.classIds.includes(c.id) && t.title.toLowerCase().includes(q),
          )) ||
        state.students.some(
          (s) =>
            s.classId === c.id &&
            `${s.name} ${s.username || ""}`.toLowerCase().includes(q),
        )),
  );
  return (
    state.config.programs
      .map((program) => {
        const chosen = classes
          .filter((c) => c.program === program)
          .sort((a, b) =>
            a.name.localeCompare(b.name, "zh-CN", { numeric: true }),
          );
        if (!chosen.length) return "";
        return `<section class="class-choice-section"><header><span>${esc(programShort(program))}</span><h2>${esc(program)}</h2><small>${chosen.length} 个班级</small></header><div class="class-choice-grid">${chosen
          .map((c) => {
            const rows = reportData().filter((r) => r.classId === c.id),
              m = gradeMetrics(rows, now());
            const students = state.students.filter((s) => s.classId === c.id),
              matched = q
                ? students.filter((s) =>
                    `${s.name} ${s.username || ""}`.toLowerCase().includes(q),
                  )
                : [];
            const exams = assessmentGroups(rows)
              .filter((e) => Number.isFinite(e.average))
              .slice(-8);
            return `<button class="class-choice-card class-tinted" style="${classStyle(c)}" data-action="${action}" data-id="${c.id}"><div class="class-choice-top"><span class="class-emblem">${icon("class")}</span><span>${students.length} 位学生</span></div><h3>${esc(c.name)}</h3><p>${(c.courses || []).map((x) => esc(x.title || nameSubject(x.subject))).join(" · ") || "尚未配置科目"}</p>${
              action === "report-class"
                ? `<div class="class-choice-chart">${miniPlot(exams.map((e) => e.average))}<div><strong>${m.average ?? "—"}</strong><small>${m.average === null ? "等待首次提交" : "班级均分"}</small></div></div>`
                : `<div class="class-avatar-row">${students
                    .slice(0, 5)
                    .map((s) => `<i>${esc(s.name.slice(-1))}</i>`)
                    .join(
                      "",
                    )}<span>${matched.length ? `找到 ${matched.length} 位匹配学生` : action === "tasks-class" ? `${state.tasks.filter((t) => t.classIds.includes(c.id)).length} 次听写 · 点击选择科目` : "按姓名查看与管理账号"}</span></div>`
            }<footer><span>${action === "report-class" ? "查看各科成绩" : action === "tasks-class" ? "选择科目，查看听写" : "管理课程与学生"}</span>${icon("arrow")}</footer></button>`;
          })
          .join("")}</div></section>`;
      })
      .join("") || empty("没有匹配的班级", "调整项目或搜索条件后再试。")
  );
}
function reportStudentCards(
  rows,
  { students = null, action = "report-student", band = "all" } = {},
) {
  const filtered =
    band === "all" ? rows : rows.filter((r) => inScoreBin(r, band));
  const people = studentGroups(filtered, band === "all" ? students || [] : []);
  return `<div class="report-student-grid">${
    people
      .map((s) => {
        const exams = assessmentGroups(s.rows)
          .filter((e) => Number.isFinite(e.average))
          .slice(-7);
        return `<button class="report-student-card" data-action="${action}" data-id="${s.key}"><div class="report-person"><span class="avatar">${esc(s.name.slice(-1))}</span><div><strong>${esc(s.name)}</strong><small>${esc(clsName(s.classId))}</small></div><span class="report-person-score">${s.average ?? "—"}<small>${s.average === null ? "暂无成绩" : "均分"}</small></span></div><div class="student-spark">${miniPlot(exams.map((e) => e.average))}<span>${s.total ? `${s.completed} / ${s.total} 份已交` : "未安排听写"}</span></div><footer>查看全科学习画像 ${icon("arrow")}</footer></button>`;
      })
      .join("") || '<p class="muted report-no-rows">当前分数段没有学生。</p>'
  }</div>`;
}
function reportExamCards(rows, limit = 12) {
  const records = [...rows]
    .sort((a, b) => b.examAt - a.examAt || a.taskId.localeCompare(b.taskId))
    .slice(0, limit);
  return `<div class="report-exam-grid">${
    records
      .map((r) => {
        const done = completedGrade(r),
          status = done
            ? "已交卷"
            : r.examAt > now()
              ? "待开始"
              : r.state === "in_progress"
                ? "答题中"
                : "未提交";
        return `<article class="report-exam-card" data-student="${r.studentId}" data-task="${r.taskId}"><div class="report-exam-heading"><span>${esc(nameSubject(r.subject))}</span><small>${date(r.examAt, true)}</small></div><h3>${esc(r.taskTitle)}</h3><p>${esc(r.groups.map(learningLabel).join(" · ") || "未标注周次")}</p><div class="report-exam-score"><strong>${done ? r.score : "—"}<small>${done ? "分" : status}</small></strong><span>${done ? `用时 ${formatElapsed(r.elapsedSeconds)}` : status}</span></div><div class="exam-score-track"><i style="width:${done ? r.score : 0}%"></i></div>${r.result ? `<button class="btn btn-light btn-sm" data-action="result-detail" data-task="${r.taskId}" data-student="${r.studentId}">逐题回看 ${icon("arrow")}</button>` : r.closesAt <= now() ? `<button class="btn btn-light btn-sm" data-action="retake-create" data-id="${r.taskId}" data-student="${r.studentId}">安排补考</button>` : ""}</article>`;
      })
      .join("") || '<div class="viz-empty"><p>当前范围没有考试记录。</p></div>'
  }</div>`;
}
function reportGroupTabs(rows) {
  const groups = learningGroups(rows);
  return `<div class="report-group-tabs" role="group" aria-label="按教学周或Topic查看"><button data-action="report-group" data-key="all" class="${state.report.group === "all" ? "selected" : ""}">全部周次 / Topic</button>${groups.map((g) => `<button data-action="report-group" data-key="${esc(g.key)}" class="${state.report.group === g.key ? "selected" : ""}">${esc(g.label)}<small>${g.completed ? "已交 " + g.completed : "暂无提交"}</small></button>`).join("")}</div>`;
}
function reportHeatmap(rows, students) {
  const groups = learningGroups(rows),
    visible = students.slice(0, state.report.studentLimit);
  if (!groups.length)
    return '<div class="viz-empty"><p>发布听写并收到答卷后，这里会显示学生的掌握热力图。</p></div>';
  const cells = visible
    .map((s) => {
      const row = rows.filter((r) => r.studentId === s.id);
      return `<button class="heat-person" data-action="report-student" data-id="${s.id}">${esc(s.name)}</button>${groups
        .map((g) => {
          const selected = row.filter(
              (r) =>
                r.groups.includes(g.key) ||
                (g.key === "未标注分组" && !r.groups.length),
            ),
            average = gradeAverage(selected);
          const color =
            average === null
              ? "none"
              : average < 60
                ? "low"
                : average < 80
                  ? "middle"
                  : average < 90
                    ? "strong"
                    : "excellent";
          const description =
            average === null
              ? selected.length
                ? "尚未提交"
                : "未安排"
              : `平均 ${average} 分`;
          return `<button class="heat-cell ${color} ${selected.length && !Number.isFinite(average) ? "pending" : ""}" data-action="report-cell" data-student="${s.id}" data-key="${esc(g.key)}" aria-label="${esc(s.name)}，${esc(g.label)}，${description}" title="${esc(s.name)} · ${esc(g.label)} · ${description}"><span class="visually-hidden">${description}</span></button>`;
        })
        .join("")}`;
    })
    .join("");
  return `<div class="heatmap-scroll"><div class="report-heatmap" style="grid-template-columns:140px repeat(${groups.length},minmax(46px,1fr));min-width:${Math.max(420, 140 + groups.length * 46)}px"><span class="heat-corner">学生 / 教学周</span>${groups.map((g) => `<button class="heat-group" data-action="report-group" data-key="${esc(g.key)}" title="${esc(g.key)}">${esc(g.label)}</button>`).join("")}${cells}</div></div><div class="heat-legend"><span><i class="low"></i>低于60</span><span><i class="middle"></i>60–79</span><span><i class="strong"></i>80–89</span><span><i class="excellent"></i>90–100</span><span><i class="none"></i>未安排 / 未交</span></div>${students.length > visible.length ? '<button class="btn btn-quiet" data-action="report-more-students">展开其余学生</button>' : ""}`;
}
function reportRangeControls() {
  return `<div class="chart-range" role="group" aria-label="趋势图显示范围">${[8, 16, "all"].map((n) => `<button data-action="report-range" data-key="${n}" aria-pressed="${String(state.report.limit) === String(n)}" class="${String(state.report.limit) === String(n) ? "selected" : ""}">${n === "all" ? "全部考试" : `最近${n}场`}</button>`).join("")}</div>`;
}
function reportTrend(rows, { student = false, cls = null } = {}) {
  const allExams = assessmentGroups(rows).filter(
      (e) => e.at <= now() || e.completed,
    ),
    exams =
      state.report.limit === "all"
        ? allExams
        : allExams.slice(-Number(state.report.limit));
  const items = exams.map((e) => ({
    key: e.key,
    label: reportDay(e.at),
    fullLabel: e.title + " · " + reportDay(e.at),
  }));
  let courses = courseGroups(rows, cls?.courses || []);
  if (!student)
    courses = [
      {
        key: state.report.subject || "class",
        color: "#365f80",
        rows,
        average: gradeAverage(rows),
      },
    ];
  const series = courses
    .filter((c) => !state.report.hidden.includes(c.key))
    .map((c) => ({
      key: c.key,
      name: student ? reportCourseName(c.key, cls) : "班级均分",
      color: c.color,
      points: exams
        .filter((e) => !student || e.subject === c.key)
        .map((e) => ({
          key: e.key,
          value: e.average,
          label: e.title,
          note: `${e.completed}份已交`,
        })),
    }));
  return `${student ? `<div class="chart-series-legend">${courses.map((c) => `<button data-action="report-series" data-key="${esc(c.key)}" class="${state.report.hidden.includes(c.key) ? "muted-series" : ""}" aria-pressed="${!state.report.hidden.includes(c.key)}"><i style="background:${c.color}"></i>${esc(reportCourseName(c.key, cls))}</button>`).join("")}</div>` : ""}${linePlot(series, { items, action: "report-exam", selected: state.report.taskId, label: student ? "学生各科考试轨迹" : "本周各次考试成绩走势" })}`;
}
function resultsView() {
  const r = state.report;
  const cls = state.classes.find((c) => c.id === r.classId),
    student = state.students.find((s) => s.id === r.studentId);
  if (r.studentId && !student) r.studentId = null;
  if (r.classId && !cls) {
    state.report = newReport();
    return resultsView();
  }
  const title = student
    ? `${student.name}的学习画像`
    : r.subject
      ? `${reportCourseName(r.subject, cls)} · 成绩报告`
      : cls
        ? `${cls.name} · 各科成绩`
        : "成绩分析";
  const intro = student
    ? "各科放在一起看，也能点开每一次考试。"
    : r.subject
      ? "从跨周变化到周内表现，点击图表查看学生与答卷。"
      : cls
        ? "选择一门科目，查看周次走势与学生掌握情况。"
        : "从班级开始，逐层查看科目、周次与学生。";
  const top = `${reportBreadcrumb(cls, student)}${heading(student ? "学生学习画像" : "成绩分析", intro, `${cls ? backButton("report-back", r.subject || student ? "返回班级科目" : "返回班级列表") : ""}<button class="btn btn-light" data-action="export-results">${icon("download")}导出当前成绩</button>`)}${cls ? `<div class="report-context class-tinted" style="${classStyle(cls)}"><div><span>${esc(cls.program)}</span><h2>${esc(title)}</h2></div>${reportStudentPicker()}</div>` : `<div class="report-entry-toolbar">${reportStudentPicker()}</div>`}`;
  if (!cls) return top + classChoiceCards("report-class");
  const classRows = reportData().filter((x) => x.classId === cls.id);
  if (!r.subject && !student) {
    const courses = courseGroups(classRows, cls.courses || []);
    return (
      top +
      `<div class="course-choice-grid">${
        courses
          .map((c) => {
            const exams = assessmentGroups(c.rows)
              .filter((e) => Number.isFinite(e.average))
              .slice(-8);
            return `<button class="course-choice-card" data-action="report-subject" data-key="${esc(c.key)}"><div><span class="subject-icon">${icon(subjectIcon(c.key))}</span><span>${c.completed} 份已交</span></div><h3>${esc(reportCourseName(c.key, cls))}</h3><div class="course-choice-score"><strong>${c.average ?? "—"}</strong><small>${c.average === null ? "暂无已交成绩" : "平均分"}</small></div>${miniPlot(
              exams.map((e) => e.average),
              c.color,
            )}<footer>查看教学周报告 ${icon("arrow")}</footer></button>`;
          })
          .join("") || empty("尚无课程", "请先在班级管理中配置科目。")
      }</div><section class="panel report-panel"><header class="report-panel-header"><div><h2>选择学生，查看全科学习画像</h2><p>个人画像会同时展示不同科目和每次考试。</p></div></header>${reportStudentCards(classRows, { students: state.students.filter((s) => s.classId === cls.id) })}</section>`
    );
  }
  const scope = reportRows({ group: false, task: false }),
    rows = reportRows();
  if (student) {
    const courses = courseGroups(
        reportData().filter((x) => x.studentId === student.id),
        cls.courses || [],
      ),
      personalTasks = new Set(
        reportData()
          .filter((x) => x.studentId === student.id)
          .map((x) => x.taskId),
      );
    const comparison = courses.map((c) => ({
      key: c.key,
      label: reportCourseName(c.key, cls),
      value: c.average,
      color: c.color,
      reference: gradeAverage(
        classRows.filter(
          (x) => x.subject === c.key && personalTasks.has(x.taskId),
        ),
      ),
      note: `${c.completed}份已交`,
    }));
    const observed = rows.filter((x) => x.examAt <= now() || completedGrade(x));
    return (
      top +
      `<div class="subject-focus-tabs"><button data-action="report-all-subjects" class="${!r.subject ? "selected" : ""}">全部科目</button>${courses.map((c) => `<button data-action="report-subject" data-key="${esc(c.key)}" class="${r.subject === c.key ? "selected" : ""}">${esc(reportCourseName(c.key, cls))}</button>`).join("")}</div>${reportMetricsView(rows)}<section class="report-chart-grid"><div class="panel report-panel"><header class="report-panel-header"><div><h2>各科表现对照</h2><p>实色为本人均分，竖线为同场考试的班级均分。</p></div></header>${barPlot(comparison, { selected: r.subject, reference: true })}</div><div class="panel report-panel"><header class="report-panel-header"><div><h2>成绩分布</h2><p>只统计已交试卷，未交卷不按0分处理。</p></div></header>${donutPlot(scoreBins(rows), { average: gradeAverage(rows), selected: r.band })}</div></section><section class="panel report-panel"><header class="report-panel-header"><div><h2>各科考试轨迹</h2><p>点击图例可隐藏某科目，点击成绩点可回看试卷。</p></div>${reportRangeControls()}</header>${reportTrend(scope, { student: true, cls })}</section><section class="panel report-panel"><header class="report-panel-header"><div><h2>每次考试</h2><p>${r.band !== "all" ? "正在按所选分数段筛选。" : "按时间回看作答情况与用时。"}</p></div>${r.band !== "all" ? '<button class="btn btn-quiet" data-action="report-band" data-key="all">清除分数段</button>' : ""}</header>${reportExamCards(
        observed.filter((x) => inScoreBin(x, r.band)),
        r.examLimit,
      )}${observed.filter((x) => inScoreBin(x, r.band)).length > r.examLimit ? '<button class="btn btn-light report-load-more" data-action="report-more-exams">显示更早的考试</button>' : ""}</section>${
        rows.some((x) => !completedGrade(x) && x.examAt > now())
          ? `<details class="report-upcoming"><summary>待开始的考试 · ${rows.filter((x) => !completedGrade(x) && x.examAt > now()).length} 场</summary>${reportExamCards(
              rows.filter((x) => !completedGrade(x) && x.examAt > now()),
              1000,
            )}</details>`
          : ""
      }`
    );
  }
  const groups = learningGroups(
      scope.filter((x) => x.examAt <= now() || completedGrade(x)),
    ),
    people = state.students.filter((s) => s.classId === cls.id);
  return (
    top +
    reportGroupTabs(scope) +
    `${r.taskId ? `<div class="report-selection"><strong>当前考试：${esc(state.tasks.find((t) => t.id === r.taskId)?.title || "")}</strong><button data-action="report-clear-exam">返回当前周次全部考试 ×</button></div>` : ""}${reportMetricsView(rows)}<section class="report-chart-grid"><div class="panel report-panel"><header class="report-panel-header"><div><h2>跨周 / Topic 平均分趋势</h2><p>点击一个教学周，联动查看下方考试与学生表现。</p></div></header>${linePlot([{ key: r.subject, name: "班级均分", color: "#365f80", points: groups.map((g) => ({ key: g.key, value: g.average, label: g.label, note: `${g.completed}份已交` })) }], { items: groups.map((g) => ({ key: g.key, label: g.label })), action: "report-group", selected: r.group, label: "跨周平均分趋势" })}</div><div class="panel report-panel"><header class="report-panel-header"><div><h2>成绩分布</h2><p>点击分数段，筛选下方对应学生。</p></div></header>${donutPlot(scoreBins(rows), { average: gradeAverage(rows), selected: r.band })}</div></section><section class="panel report-panel"><header class="report-panel-header"><div><h2>${r.group === "all" ? "各次考试走势" : learningLabel(r.group) + " · 周内考试走势"}</h2><p>一次考试一个点，悬停看分数，点击查看该场学生表现。</p></div>${reportRangeControls()}</header>${reportTrend(reportRows({ task: false }), { cls })}</section><section class="panel report-panel"><header class="report-panel-header"><div><h2>学生掌握热力图</h2><p>颜色表示成绩区间。点击格子看本周考试，点击姓名看全科画像。</p></div></header>${reportHeatmap(rows, people)}</section><section class="panel report-panel"><header class="report-panel-header"><div><h2>学生学习表现</h2><p>${r.band === "all" ? "每张卡片可进入该学生的全科学习画像。" : "已按所选分数段筛选；点击学生可查看完整画像。"}</p></div>${r.band !== "all" ? '<button class="btn btn-quiet" data-action="report-band" data-key="all">清除分数段 ×</button>' : ""}</header>${reportStudentCards(rows, { students: people, band: r.band })}</section><p class="report-footnote">平均分只计算有效已交答卷。教学周按考试词汇分组识别，跨周考试会出现在所涉及的周次，总体统计不重复。</p>`
  );
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
  if (state.filter.subject === "all")
    return (
      heading("词汇学习", "先选择科目，再查看对应的周次、词汇和双语例句。") +
      librarySubjectChoices(subjects, { student: true })
    );
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
  return `${heading("词汇学习", `${data.className} · ${data.program === "NCUK 国际预科" ? "全部分组长期开放" : "全部周次与单元长期开放"}，无需等待老师发布考试。`)}<div class="alert">${icon("book")} 选择科目及${groupName}即可学习，支持预习与回顾。内容包含词汇、中文释义和双语场景例句；场景例句为教学材料，并非官方试题。</div>${scopeTrail({ program: data.className, subject: state.filter.subject, student: true })}${filters({ program: false, search: true })}<div class="toolbar"><select data-filter="group" aria-label="按分组学习">${option("all", `全部 ${groupName}`, group)}${groups.map((g) => option(g, g, group)).join("")}${available.some((w) => !w.groups.length) ? option("ungrouped", "未分组词汇", group) : ""}</select><span class="muted">共 ${words.length} 条 · 已显示 ${Math.min(words.length, limit)} 条</span></div><div class="cards-grid">${words
    .slice(0, limit)
    .map(
      (w) =>
        `<article class="word-card">${badge(nameSubject(w.subject), "gray")}<h3>${esc(w.term)}</h3><p class="translation">${esc(w.translation)}</p>${wordGrammar(w)}<div class="word-sentence">${highlight(w.sentence, w.term)}</div><p class="table-secondary" style="line-height:1.9">${esc(w.sentenceZh)}</p><footer><span>${esc(w.groups.map(libraryGroupLabel).join(" · ") || "未分组")}</span></footer></article>`,
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
    `<div class="alert">考试时间：${date(task.opensAt, true)} — ${date(task.closesAt, true)}<br>这是本次考试要考的词汇。提前学习不计时；点击「开始测试」才开始计时。</div><div class="study-word-grid">${words.map((w, i) => `<article class="word-card"><span class="eyebrow">WORD ${String(i + 1).padStart(2, "0")}</span><h3>${esc(w.term)}</h3><p class="translation">${esc(w.translation)}</p>${wordGrammar(w)}<div class="word-sentence">${highlight(w.sentence, w.term)}</div><p class="table-secondary" style="line-height:1.9">${esc(w.sentenceZh)}</p></article>`).join("")}</div>`,
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
  <div class="practice-layout"><section class="panel practice-setup"><h2>创建模拟考试</h2><form id="practice-form"><div class="form-grid"><label class="form-field"><span>科目</span><select name="subject" data-practice-setting="subject" aria-label="模拟科目">${subjects.map((v) => option(v, nameSubject(v), s.subject)).join("")}</select></label><label class="form-field"><span>周次 / Topic</span><select name="wordGroup" data-practice-setting="wordGroup" aria-label="模拟周次" required>${groups.map((g) => option(g, libraryGroupLabel(g), s.wordGroup)).join("")}</select></label><label class="form-field"><span>题型</span><select name="questionType" data-practice-setting="questionType">${option("choice", "选择题 · 五选一", s.questionType)}${option("fill", "填空题 · 手动输入", s.questionType)}</select></label><label class="form-field"><span>翻译方向</span><select name="mode" data-practice-setting="mode">${["mixed", "en-zh", "zh-en"].map((m) => option(m, modeName(m), s.mode)).join("")}</select></label><label class="form-field full"><span>模拟时长（分钟）</span><input type="number" name="duration" value="${esc(s.duration)}" min="1" max="180" required data-practice-setting="duration"></label></div><label class="check-item"><input type="checkbox" name="mistakesOnly" data-practice-setting="mistakesOnly" ${s.mistakesOnly ? "checked" : ""}><span>只练本周的模拟错词 <small>（${wrongIds.size} 个词汇）</small></span></label><div class="practice-scope"><strong>${questionCount} 题</strong><br>${esc(nameSubject(s.subject))} · ${esc(s.wordGroup || "暂无周次")}<br>${s.mistakesOnly ? "从本周的模拟错词出题。" : "本周词库全部词汇，不依赖任何听写任务。"}<br>每次打乱题序，变换提问方式与选项。</div>${active ? '<p class="privacy-note">开始新模拟会结束上一场未交卷的练习；结束的练习不计成绩。</p>' : ""}<button type="submit" class="btn btn-primary" ${!questionCount ? "disabled" : ""}>${icon("plus")}重新出题并开始</button><p class="privacy-note">模拟考试自动保存，可刷新继续。交卷后查看结果，也可以立刻再练同一周。</p></form></section>
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

function calendarDayKey(time = now()) {
  return new Date(Number(time) + 8 * 3600000).toISOString().slice(0, 10);
}
function calendarTime(time) {
  return new Date(time).toLocaleTimeString("zh-CN", {
    timeZone: "Asia/Shanghai",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}
function studentCalendarTasks() {
  const combined = new Map(state.tasks.map((t) => [t.id, t]));
  for (const t of examAlertItems)
    combined.set(t.id, { ...combined.get(t.id), ...t });
  return [...combined.values()]
    .filter((t) => {
      if (!Number.isFinite(t.opensAt)) return false;
      return (
        !examCalendarReady ||
        t.attempt?.submittedAt ||
        t.closesAt <= now() ||
        examAlertItems.some((a) => a.id === t.id)
      );
    })
    .sort((a, b) => a.opensAt - b.opensAt);
}
function studentCalendar() {
  const today = calendarDayKey();
  const month = state.studentCalendarMonth || today.slice(0, 7);
  const selected = state.studentCalendarDate || today;
  const [year, m] = month.split("-").map(Number);
  const offset = (new Date(Date.UTC(year, m - 1, 1)).getUTCDay() + 6) % 7;
  const count = new Date(Date.UTC(year, m, 0)).getUTCDate();
  const tasks = studentCalendarTasks();
  const monthTasks = tasks.filter((t) =>
    calendarDayKey(t.opensAt).startsWith(month),
  );
  const dayTasks = tasks.filter((t) => calendarDayKey(t.opensAt) === selected);
  const upcoming = tasks.filter(
    (t) =>
      !t.attempt?.submittedAt &&
      t.closesAt > now() &&
      (calendarDayKey(t.opensAt).startsWith(month) ||
        (t.opensAt <= now() && month === today.slice(0, 7))),
  );
  const list = dayTasks.length ? dayTasks : selected === today ? upcoming : [];
  const color = classStyle(state.user.classId);
  return `<section class="panel student-calendar class-tinted" style="${color}" aria-label="我的考试日历"><header class="student-calendar-header"><div><span class="eyebrow">YOUR EXAM CALENDAR</span><h2>${icon("calendar")}考试日历</h2><p>老师安排的考试会自动出现在这里 · 北京时间</p></div><div class="student-calendar-nav"><button class="icon-button" data-action="student-calendar-month" data-delta="-1" aria-label="考试日历上个月">${icon("back")}</button><strong>${year}年${m}月</strong><button class="icon-button" data-action="student-calendar-month" data-delta="1" aria-label="考试日历下个月">${icon("arrow")}</button><button class="btn btn-light btn-sm" data-action="student-calendar-today">今天</button></div></header><div class="student-calendar-layout"><div><div class="student-calendar-grid">${["一", "二", "三", "四", "五", "六", "日"].map((d) => `<span class="student-calendar-weekday">周${d}</span>`).join("")}${Array.from({ length: offset }, () => '<span class="calendar-spacer" aria-hidden="true"></span>').join("")}${Array.from(
    { length: count },
    (_, i) => {
      const key = `${month}-${String(i + 1).padStart(2, "0")}`;
      const items = monthTasks.filter((t) => calendarDayKey(t.opensAt) === key);
      return `<button class="student-calendar-day ${key === today ? "is-today" : ""} ${key === selected ? "selected" : ""} ${items.length ? "has-exam" : ""}" data-action="student-calendar-day" data-key="${key}" aria-pressed="${key === selected}" aria-current="${key === today ? "date" : "false"}" aria-label="${key}${key === today ? " 今天" : ""}，${items.length}场考试"><strong>${i + 1}</strong>${items.length ? `<span class="calendar-count">${items.length} 场</span><span class="calendar-exam-name">${icon(subjectIcon(items[0].subject))}${esc(nameSubject(items[0].subject))}</span>` : ""}</button>`;
    },
  ).join(
    "",
  )}</div><p class="calendar-legend"><i></i>有考试安排 <b></b>今天 · 点击日期查看考试</p></div><aside class="student-calendar-agenda"><header><small>${esc(selected === today && !dayTasks.length ? "接下来的考试" : selected)}</small><h3>${dayTasks.length ? `${dayTasks.length} 场考试安排` : selected === today ? "本月待考安排" : "当天安排"}</h3></header><div class="calendar-agenda-list">${
    list
      .map((t) => {
        const done = !!t.attempt?.submittedAt;
        const phase = done
          ? "已完成"
          : t.closesAt <= now()
            ? "已截止"
            : t.opensAt <= now()
              ? "正在开放"
              : "即将开始";
        return `<article class="calendar-exam-item"><div class="calendar-exam-meta"><span>${icon(subjectIcon(t.subject))}${esc(nameSubject(t.subject))}</span><small class="${phase === "正在开放" ? "exam-open" : ""}">${phase}</small></div><h4>${esc(t.title)}</h4><p>${calendarDayKey(t.opensAt).slice(5).replace("-", "月")}日 ${calendarTime(t.opensAt)} 开放<br>截止 ${calendarDayKey(t.closesAt).slice(5).replace("-", "月")}日 ${calendarTime(t.closesAt)}${t.duration ? ` · 限时${t.duration}分钟` : ""}</p>${t.retakeOf ? '<span class="notice-retake">个人补考</span>' : ""}<button class="btn btn-light btn-sm" data-action="${done ? "student-result" : "calendar-exam"}" data-id="${t.id}">${done ? "回看成绩" : t.closesAt <= now() ? "查看考试信息" : t.opensAt <= now() ? "进入考试" : "查看考试安排"}${icon("arrow")}</button></article>`;
      })
      .join("") ||
    '<div class="calendar-no-exam">' +
      icon("calendar") +
      "<p>当天没有考试安排</p><small>新考试发布后会自动显示，无需手动添加。</small></div>"
  }</div></aside></div></section>`;
}
function paintStudentCalendar() {
  const node = $("#student-calendar-root");
  if (node && state.user?.role === "student")
    node.innerHTML = studentCalendar();
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
    )}</div></div><div class="cards-grid">${items.map((m) => `<article class="mistake-card">${badge(nameSubject(m.question.subject), "gray")} ${badge(m.resolved ? "已掌握" : m.nextReview <= now() ? "待复习" : "学习中", m.resolved ? "" : "gold")}<h3>${esc(m.question.term)}</h3><p class="translation muted">${esc(m.question.translation)}</p>${wordGrammar(m.question)}<div class="word-sentence">${highlight(m.question.sentence, m.question.term)}</div><p class="table-secondary">${esc(m.question.sentenceZh)}</p><div class="task-meta" style="margin-top:14px"><span>累计错 ${m.errorCount} 次</span><span>·</span><span>连续正确 ${m.streak} / 3</span></div><p class="table-secondary" style="margin-top:5px">${m.resolved ? "已完成本轮复习" : `下次复习：${date(m.nextReview)}`}</p><button class="btn btn-light" data-action="review-word" data-id="${m.id}" ${m.resolved || m.nextReview > now() ? "disabled" : ""}>${icon("repeat")}${m.resolved ? "已经掌握" : "再练一次"}</button></article>`).join("")}</div>${!items.length ? empty("这里暂时没有错题", "完成听写后，答错或未作答的词汇会自动收录。") : ""}`;
}
function highlight(text, focus) {
  const source = String(text),
    index = source.toLowerCase().indexOf(String(focus).toLowerCase());
  if (index < 0) return esc(source);
  return `${esc(source.slice(0, index))}<mark>${esc(source.slice(index, index + focus.length))}</mark>${esc(source.slice(index + focus.length))}`;
}
const answerAttrs =
  'autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="false" data-gramm="false" data-gramm_editor="false" data-enable-grammarly="false"';
let autoQuestionTimer;
function questionPositionKey() {
  return `classwords-question:${state.attempt?.attempt.id || ""}`;
}
function currentQuestionIndex() {
  const a = state.attempt;
  if (!a) return 0;
  if (state.examPositionAttempt !== a.attempt.id) {
    let index = 0;
    try {
      index =
        Math.trunc(Number(sessionStorage.getItem(questionPositionKey()))) || 0;
    } catch {}
    state.examIndex = Math.min(a.questions.length - 1, Math.max(0, index));
    state.examPositionAttempt = a.attempt.id;
  }
  return state.examIndex || 0;
}
function refreshQuestionNavigator() {
  const a = state.attempt;
  if (!a) return;
  const answered = Object.values(a.attempt.answers).filter((v) =>
    v.trim(),
  ).length;
  $$("#question-navigation [data-question]").forEach((b) => {
    const index = Number(b.dataset.question),
      q = a.questions[index];
    const done = !!a.attempt.answers[q.id]?.trim();
    b.classList.toggle("answered", done);
    b.classList.toggle("current", index === currentQuestionIndex());
    b.setAttribute(
      "aria-current",
      index === currentQuestionIndex() ? "step" : "false",
    );
    b.setAttribute(
      "aria-label",
      `第${index + 1}题，${done ? "已作答" : "未作答"}`,
    );
  });
  if ($("#answered-count"))
    $("#answered-count").textContent =
      `已作答 ${answered} / ${a.questions.length} 题`;
  if ($("#question-answered"))
    $("#question-answered").textContent =
      `${answered} / ${a.questions.length} 已作答`;
  if ($("#exam-progress-fill"))
    $("#exam-progress-fill").style.width =
      `${(answered / a.questions.length) * 100}%`;
}
function showExamQuestion(index, focus = true) {
  clearTimeout(autoQuestionTimer);
  const a = state.attempt;
  if (!a) return;
  readAnswers();
  const next = Math.min(
    a.questions.length - 1,
    Math.max(0, Number(index) || 0),
  );
  state.examIndex = next;
  try {
    sessionStorage.setItem(questionPositionKey(), String(next));
  } catch {}
  $$("#exam-form [data-question-index]").forEach(
    (card) => (card.hidden = Number(card.dataset.questionIndex) !== next),
  );
  if ($("#exam-previous")) $("#exam-previous").disabled = next === 0;
  if ($("#exam-next"))
    $("#exam-next").disabled = next === a.questions.length - 1;
  if ($("#current-question-label"))
    $("#current-question-label").textContent =
      `第 ${next + 1} / ${a.questions.length} 题`;
  refreshQuestionNavigator();
  if (focus) {
    const card = $(`#exam-form [data-question-index="${next}"]`);
    card?.querySelector("h3")?.focus({ preventScroll: true });
    card?.scrollIntoView({
      block: "start",
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
        ? "instant"
        : "smooth",
    });
  }
}
function examView() {
  const a = state.attempt,
    index = currentQuestionIndex();
  const answered = Object.values(a.attempt.answers).filter((v) =>
    v.trim(),
  ).length;
  return `<div class="exam-layout">${a.task.practice ? `<div class="practice-inline-note">自主模拟 <button class="btn btn-quiet btn-sm" data-action="nav" data-view="practice">保存并返回模拟设置</button></div>` : ""}<header class="exam-top"><div><h2>${esc(a.task.title)}</h2><p class="attempt-user">答题人：${esc(state.user.name)} · ${esc(state.user.className)}</p></div><div><span class="exam-timer-caption">剩余答题时间</span><div class="exam-clock mono" id="exam-clock">--:--</div></div></header><div class="exam-instructions">${icon("check")}点击选项即记下答案，并进入下一题。可用上一题、下一题或题号返回检查；最后统一交卷。</div><div class="exam-progress"><div id="exam-progress-fill" style="width:${(answered / a.questions.length) * 100}%"></div></div><div class="exam-workspace"><form id="exam-form" class="exam-paper">${a.questions.map((q, i) => `<article class="question-card" data-question-index="${i}" ${i !== index ? "hidden" : ""}><div class="question-label"><span>第 ${i + 1} / ${a.questions.length} 题</span>${badge(`${nameSubject(q.subject)} · ${q.choices ? "选择题" : "填空题"} · ${modeName(q.direction)}`, "gray")}</div><h3 tabindex="-1">${q.choices ? (q.direction === "zh-en" ? "请选择对应的英文词汇" : "请选择词汇在本句中的含义") : q.direction === "zh-en" ? "请写出对应的英文词汇" : "请写出词汇在本句中的中文含义"}</h3><div class="question-prompt">${highlight(q.prompt, q.focus)}</div>${q.choices ? `<div class="question-options">${q.choices.map((c, j) => `<label class="choice-label"><input type="radio" name="${q.id}" value="${esc(c)}" ${a.attempt.answers[q.id] === c ? "checked" : ""}><span class="choice-letter">${String.fromCharCode(65 + j)}</span><span class="choice-text">${esc(c)}</span><span class="choice-picked">${icon("check")}</span></label>`).join("")}</div>` : `<label class="form-field"><span>你的答案</span><input name="${q.id}" type="text" lang="${q.direction === "zh-en" ? "en" : "zh-CN"}" ${answerAttrs} maxlength="2000" placeholder="${q.direction === "zh-en" ? "输入英文词汇或短语…" : "输入中文释义…"}" value="${esc(a.attempt.answers[q.id] || "")}"></label><p class="answer-input-note">已请求关闭浏览器自动纠错；请同时关闭系统输入法的联想纠正。</p>`}</article>`).join("")}<div class="question-page-controls"><button id="exam-previous" type="button" class="btn btn-light" data-action="exam-previous" ${index === 0 ? "disabled" : ""}>${icon("back")}上一题</button><span id="current-question-label">第 ${index + 1} / ${a.questions.length} 题</span><button id="exam-next" type="button" class="btn btn-light" data-action="exam-next" ${index === a.questions.length - 1 ? "disabled" : ""}>下一题${icon("arrow")}</button></div><div class="exam-sticky"><div><div class="save-indicator" id="save-indicator">${icon("shield")} 已保存到服务器</div><small class="muted" id="answered-count">已作答 ${answered} / ${a.questions.length} 题</small></div><button type="button" class="btn btn-primary" data-action="confirm-submit" id="submit-button">${a.task.practice ? "提交模拟考试" : "提交本次听写"}${icon("arrow")}</button></div></form><aside class="question-navigation" aria-label="答题导航"><div><h3>答题检查</h3><span id="question-answered">${answered} / ${a.questions.length} 已作答</span></div><div class="question-number-grid" id="question-navigation">${a.questions.map((q, i) => `<button type="button" data-action="exam-question" data-question="${i}" class="${a.attempt.answers[q.id]?.trim() ? "answered" : ""} ${i === index ? "current" : ""}" aria-current="${i === index ? "step" : "false"}" aria-label="第${i + 1}题，${a.attempt.answers[q.id]?.trim() ? "已作答" : "未作答"}">${i + 1}</button>`).join("")}</div><div class="question-navigation-legend"><span><i class="answer-done"></i>已作答</span><span><i></i>未作答</span></div><button class="btn btn-light btn-sm" data-action="exam-unanswered">检查未答题</button><p>点击题号可随时跳转。<br>返回后可以重新选择答案。</p></aside></div></div>`;
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
  const charts = $("[data-board-charts]");
  if (charts) state.boardChartsOpen = charts.open;
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
    syncExamAlerts();
    renderAuth();
    return;
  }
  $("#app").innerHTML = shell();
  syncExamAlerts();
  if (state.attempt) {
    tick();
    refreshQuestionNavigator();
  }
}
async function load({ background = false } = {}) {
  if (!state.user) return;
  const teacher = state.user.role === "teacher";
  const responses = await Promise.all(
    teacher
      ? [
          api("/api/tasks"),
          api("/api/students"),
          api("/api/classes"),
          background && state.words.length
            ? Promise.resolve({ words: state.words })
            : api("/api/words"),
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
async function refresh({ background = false } = {}) {
  if (state.user?.role === "student" && state.view === "practice") {
    await loadPractice();
  } else if (
    state.user?.role === "student" &&
    state.view === "learning" &&
    !background
  ) {
    state.learning = await api("/api/learning");
    state.learningError = null;
  } else await load({ background });
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
    `<div class="auth-font-controls">${fontControls()}</div><div class="login-layout"><section class="login-art">${brand()}<div><div class="eyebrow" style="color:#FFD4A6;margin-top:45px">WORDS MEET THE REAL WORLD</div><h1>学会一个词，<br>读懂<em>更大的世界。</em></h1><p>从经济学的第一道题，到专业课的每一次进步。<br>打开网页，走进你的课堂。</p>${art()}</div><footer>UNSW · NCUK · UOW &nbsp; / &nbsp; YOUR CLASSROOM, CONNECTED.</footer></section><section class="login-form-area"><div class="login-box"><div class="login-badge">${icon("leaf")} 网页直接学习 · 无需安装</div><h2>${title}</h2><p>${tab === "setup" ? "由你设置唯一管理账户的密码，统一管理全部班级与教学内容。" : tab === "teacher" ? "统一维护全部项目、班级、学生名单、课程词库和考试。" : activating ? "只需首次开通，班级和项目由老师分配。" : "每次的成绩、错题与进步，都保存在你的账号中。"}</p>${state.requestedExamId ? '<div class="alert">你正在打开老师分享的考试。登录后将直接进入考试说明页，点击开始才计时。</div>' : ""}${tab !== "setup" ? `<div class="tabs"><button class="${tab !== "teacher" ? "active" : ""}" data-action="auth-tab" data-tab="student">学生账号</button><button class="${tab === "teacher" ? "active" : ""}" data-action="auth-tab" data-tab="teacher">Master 管理</button></div>` : ""}<form id="auth-form"><input type="hidden" name="role" value="${tab}">${fields}<button type="submit" class="btn btn-primary">${tab === "setup" ? "建立 Master 账户" : activating ? "开通账号并进入" : "进入课堂"} ${icon("arrow")}</button></form>${tab === "student" ? '<button class="btn btn-quiet" style="margin-top:10px" data-action="auth-tab" data-tab="activate">首次使用？用老师的学习码开通账号 →</button>' : ""}${activating ? '<button class="btn btn-quiet" style="margin-top:10px" data-action="auth-tab" data-tab="student">已有账号，直接登录 →</button>' : ""}<div class="login-bottom">${state.config?.demoAvailable ? '<p>想先看看课堂是什么样？</p><button data-action="demo-login">体验教师与学生演示 →</button>' : ""}${state.config?.setupRequired && tab !== "setup" ? '<p><button data-action="auth-tab" data-tab="setup">首次使用 · 设置 Master 账户</button></p>' : ""}${tab === "setup" ? '<button data-action="auth-tab" data-tab="teacher">返回登录</button>' : ""}</div><p class="privacy-note">${icon("shield")} 学生只需浏览器，无需安装客户端。请妥善保管账号与密码。<br>课程与班级由老师设置，历史成绩和错题跟随账号保存。</p></div></section></div>`;
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
  if (combinedTask())
    return planSchedule({
      opensAt: form.elements.opensAt.value,
      closesAt: form.elements.closesAt.value,
      dates: [...state.scheduleDates],
      groups: Array.from({ length: 30 }, (_, i) => `combined-${i}`),
      startGroup: "combined-0",
    }).map((entry) => ({ ...entry, group: "all", combined: true }));
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
  $("#task-calendar-help").textContent = combinedTask()
    ? "多科目模式：后续日期沿用各科当前范围，每场重新随机抽词。需要改换各科周次时可单独发布。"
    : "点击后续日期，将按同一开放时刻、相同答题窗口，依次安排后续分组；每批最多30场。";
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
    preview.innerHTML = `<div class="schedule-preview"><div class="schedule-preview-head">发布预览 · ${plan.length} 场 · 北京时间</div>${plan.map((p, i) => `<div class="schedule-preview-row"><strong>${p.date}</strong><span>${form.elements.opensAt.value.slice(11)} 开放</span>${combinedTask() ? `<span>各科所选范围 · 每场独立抽${Number(form.elements.wordCount.value) || 0}词</span>` : i === 0 ? `<span>${esc(p.group === "all" ? "综合词汇" : p.group)}</span>` : `<select data-schedule-date="${p.date}" aria-label="${p.date}词汇分组">${groups.map((g) => option(g.value, g.textContent, p.group)).join("")}</select>`}</div>`).join("")}</div>`;
  } catch (error) {
    preview.innerHTML = `<div class="alert error">${esc(error.message)}</div>`;
  }
  taskSummary();
}
function combinedTask() {
  return !!$("#task-form")?.elements.combineSubjects?.checked;
}
function selectedTaskScopes() {
  const form = $("#task-form");
  if (!form) return [];
  if (combinedTask())
    return Object.entries(state.taskScopes || {}).map(([subject, groups]) => ({
      subject,
      groups,
    }));
  return form.elements.subject.value
    ? [
        {
          subject: form.elements.subject.value,
          groups: [form.elements.wordGroup.value || "all"],
        },
      ]
    : [];
}
function taskScopeWords(scopes, cls) {
  if (!cls) return [];
  const words = scopes.flatMap((scope) =>
    state.words
      .filter(
        (w) =>
          wordAvailableFor(w, cls.program, scope.subject) &&
          wordAvailableToClass(w, cls) &&
          (scope.groups.includes("all") ||
            scope.groups.some((g) => w.groups?.includes(g))),
      )
      .map((w) => ({ ...w, subject: scope.subject })),
  );
  return [...new Map(words.map((w) => [w.id, w])).values()];
}
function renderCombinedScopes() {
  const form = $("#task-form"),
    cls = state.classes.find((c) => c.id === form.elements.classId.value);
  const node = $("#task-combined-scopes");
  node.innerHTML =
    (cls?.courses || [])
      .map((course) => {
        const subject = course.subject,
          selected = Object.hasOwn(state.taskScopes, subject);
        const bank = state.words.filter(
          (w) =>
            wordAvailableFor(w, cls.program, subject) &&
            wordAvailableToClass(w, cls),
        );
        const groups = [...new Set(bank.flatMap((w) => w.groups || []))].sort(
          (a, b) => a.localeCompare(b, "en", { numeric: true }),
        );
        return `<section class="task-scope-card ${selected ? "selected" : ""}"><label class="check-item task-scope-heading"><input type="checkbox" name="taskSubjects" value="${esc(subject)}" data-change="task-scope-subject" ${selected ? "checked" : ""} ${!bank.length ? "disabled" : ""}>${icon(subjectIcon(subject))}<strong>${esc(course.title || nameSubject(subject))}</strong><small>${bank.length}词</small></label>${selected ? `<div class="task-scope-groups" role="group" aria-label="${esc(nameSubject(subject))}考察范围">${["all", ...groups].map((g) => `<label><input type="checkbox" data-change="task-scope-group" data-subject="${esc(subject)}" value="${esc(g)}" ${state.taskScopes[subject].includes(g) ? "checked" : ""}><span>${esc(g === "all" ? "全部范围" : libraryGroupLabel(g))}</span></label>`).join("")}</div><p>可多选；本科目已选 ${state.taskScopes[subject].length} 个范围。</p>` : ""}</section>`;
      })
      .join("") || '<p class="muted">先选班级，再勾选要考察的科目。</p>';
}
function syncTaskScopeMode() {
  const form = $("#task-form"),
    mixed = combinedTask();
  $("#task-single-scope").hidden = mixed;
  $("#task-combined-scopes").hidden = !mixed;
  form.elements.subject.disabled =
    mixed ||
    !form.elements.subject.options.length ||
    !form.elements.classId.value;
  form.elements.wordGroup.disabled = mixed;
  if (
    mixed &&
    !Object.keys(state.taskScopes).length &&
    form.elements.subject.value
  )
    state.taskScopes[form.elements.subject.value] = [
      form.elements.wordGroup.value || "all",
    ];
  renderCombinedScopes();
  $("#task-candidate-details").open = !mixed;
  taskWords();
}

function createTask() {
  state.taskScopes = {};
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
    "先选班级、该班课程和考试周次；默认全班参加，可取消勾选个别人。",
    `<form id="task-form"><div class="form-grid"><div class="full auto-task-title"><span>自动生成听写名称</span><strong id="task-title-preview">选择班级、科目与周次后生成</strong></div><label class="form-field full"><span>选择班级</span><select name="classId" data-change="task-class" required>${option("", "请选择班级", initialClass)}${state.classes.map((c) => option(c.id, `${c.name} · ${programShort(c.program)}`, initialClass)).join("")}</select></label><label class="check-item full"><input type="checkbox" name="combineSubjects" data-change="task-scope-mode">多科目混合听写 <small>每门科目可分别选择多个周次 / Topic</small></label><div id="task-combined-scopes" class="full" hidden></div><div id="task-single-scope" class="full task-single-scope"><label class="form-field full"><span>该班科目</span><select name="subject" data-change="task-words" required disabled><option value="">请先选择班级</option></select></label><label class="form-field full"><span>考试周次 / Topic / 单元</span><select name="wordGroup" data-change="task-words" disabled></select><small>先选课程，再选择本次考察范围；每份任务最多 100 个词汇。</small></label></div><label class="form-field full"><span>随机考察词数（每场总计）</span><input name="wordCount" type="number" min="1" max="100" value="50" required data-change="task-count"><small id="task-count-meta">从所选科目与分组合并后的候选词池随机抽取，每场最多100词。</small></label><label class="form-field"><span>题型</span><select name="questionType" required><option value="fill">填空题 · 手动输入答案</option><option value="choice">选择题 · 五选一（A–E）</option></select></label><label class="form-field"><span>翻译方向</span><select name="mode">${[
      ["mixed", "双向翻译 · 英中交替"],
      ["en-zh", "英译中 · 理解中文含义"],
      ["zh-en", "中译英 · 掌握英文词汇"],
    ]
      .map(([v, l]) => option(v, l, "mixed"))
      .join(
        "",
      )}</select></label>${field("答题时长（分钟，1–180）", "duration", "number", "", true, "15")}<label class="form-field"><span>首场开放时间（北京时间）</span><input name="opensAt" data-change="schedule" type="datetime-local" value="${beijingInput()}" required></label><label class="form-field"><span>首场截止时间（北京时间）</span><input name="closesAt" data-change="schedule" type="datetime-local" value="${beijingInput(Date.now() + 86400000)}" required></label></div><div class="form-section">01 &nbsp; 参加学生 · 默认全选 <button type="button" class="btn btn-quiet" data-action="select-all-students">全选 / 取消全选</button></div><div id="task-students" class="check-list"></div><p class="muted" id="task-audience-count"></p><div class="form-section">02 &nbsp; 候选词汇 · 发布时随机抽取 <button type="button" class="btn btn-quiet" data-action="select-all-words">全选 / 取消</button></div><details id="task-candidate-details" open><summary>查看或排除候选词汇</summary><div class="check-list" id="task-words"></div></details><p class="task-summary" id="task-summary"></p><div class="form-section">03 &nbsp; 日历安排后续周次 · 可跳过假期</div><p class="muted" id="task-calendar-help">首场使用上面选定的词汇。点击后续日期，将按同一开放时刻和相同答题窗口，依次安排后续分组；每批最多30场。</p><div id="task-calendar"></div><div id="task-schedule-preview"></div><div class="alert" style="margin-top:17px;margin-bottom:0">任务发布后即按预约时间开放。学生开始后计时，截止时间与答题时长先到者为准；超时按服务端已保存答案自动评分。</div></form>`,
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
    previous =
      subjectSelect.value ||
      (state.filter.subject !== "all" ? state.filter.subject : "");
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
  state.taskScopes = {};
  taskAudience();
  syncTaskScopeMode();
}
function taskWords() {
  const form = $("#task-form");
  if (!form) return;
  const cls = state.classes.find((c) => c.id === form.elements.classId.value),
    subject = form.elements.subject.value;
  if (!combinedTask()) {
    const bank =
      cls && subject
        ? state.words.filter(
            (w) =>
              wordAvailableFor(w, cls.program, subject) &&
              wordAvailableToClass(w, cls),
          )
        : [];
    const groupSelect = form.elements.wordGroup,
      scope = `${cls?.id || ""}:${subject}`;
    const groups = [...new Set(bank.flatMap((w) => w.groups || []))].sort(
      (a, b) => a.localeCompare(b, "en", { numeric: true }),
    );
    const previous = groupSelect.value;
    const selected =
      groupSelect.dataset.scope === scope &&
      (previous === "all" || groups.includes(previous))
        ? previous
        : groups[0] || "all";
    groupSelect.innerHTML =
      option("all", "全部 Topic / 周次 / 单元", selected) +
      groups.map((g) => option(g, libraryGroupLabel(g), selected)).join("");
    groupSelect.dataset.scope = scope;
    groupSelect.disabled = !bank.length;
  }
  const words = taskScopeWords(selectedTaskScopes(), cls);
  $("#task-words").innerHTML = words.length
    ? words
        .map(
          (w) =>
            `<label class="check-item word-choice"><input type="checkbox" name="wordIds" value="${w.id}" data-change="task-candidate" checked><span><strong>${esc(w.term)}</strong><small>${esc(nameSubject(w.subject))} · ${esc(w.translation)}</small></span></label>`,
        )
        .join("")
    : '<div class="alert">请选择班级、科目及有词汇的周次 / Topic。</div>';
  const count = form.elements.wordCount;
  if (!count.dataset.edited) count.value = Math.min(50, words.length) || 50;
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
  const words = data.getAll("wordIds").length,
    count = Number(form.elements.wordCount.value),
    scopes = selectedTaskScopes();
  const valid = scopes.length && scopes.every((s) => s.groups.length);
  $("#task-title-preview").textContent =
    cls && valid
      ? scopedTaskTitle(
          cls.program,
          scopes,
          count || 0,
          state.config.subjectNames,
        )
      : "选择班级、科目与周次后生成";
  $("#task-audience-count").textContent = cls
    ? `已选 ${selected} / ${total} 人${selected === total && total ? " · 全班参加" : ""}`
    : "";
  $("#task-summary").textContent =
    `候选 ${words} 词 → 随机考察 ${Number.isInteger(count) ? count : "—"} 词 · ${scopes.length} 门科目 · ${selected} 人参加`;
  $("#task-count-meta").textContent =
    count > words
      ? `候选词汇只有 ${words} 个，请减少考察词数或扩大范围。`
      : `当前候选 ${words} 词；发布时随机抽取，整班使用同一套题。各科题量不固定，共用词条去重。`;
  const submit = document.querySelector('[form="task-form"][type="submit"]');
  if (submit)
    submit.disabled =
      !cls ||
      !valid ||
      !selected ||
      !Number.isInteger(count) ||
      count < 1 ||
      count > 100 ||
      count > words;
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
    `<form id="word-form"><div class="form-grid"><label class="form-field"><span>课程项目</span><select name="program"><option value="通用示例">跨项目通用</option>${state.config.programs.map((p) => option(p, p)).join("")}</select></label><label class="form-field"><span>科目</span><select name="subject">${state.config.subjects.map((s) => option(s, nameSubject(s))).join("")}</select></label>${field("英文词汇或短语", "term", "text", "opportunity cost")}${field("标准中文释义", "translation", "text", "机会成本")}${field("词性（可选）", "partOfSpeech", "text", "例如 n. 名词 / v. 动词 / 名词短语", false)}${field("词性用法介绍（可选）", "partOfSpeechNote", "text", "例如：可数名词，表示代数式中与变量相乘的系数。", false)}<label class="form-field full"><span>英文场景 / 题干（必须包含该英文词汇）</span><textarea name="sentence" rows="3" required placeholder="Explain the opportunity cost of choosing one investment over another."></textarea></label><label class="form-field full"><span>对应中文场景（必须包含标准中文释义）</span><textarea name="sentenceZh" rows="3" required placeholder="解释选择一种投资而放弃另一种投资的机会成本。"></textarea></label><div class="full">${field("可接受的其他中文答案（用分号分隔）", "aliases", "text", "机会代价；替代成本", false)}</div><div class="full">${field("词汇来源（供老师标识）", "source", "text", "例如：授课讲义第 3 单元", false)}</div></div></form>`,
    `<button class="btn btn-light" data-action="close-modal">取消</button><button class="btn btn-primary" type="submit" form="word-form">保存到词库</button>`,
    true,
  );
}
function importWords() {
  modal(
    "批量导入词库",
    "上传 UTF-8 CSV，或下载模板后填写正式课程词汇。",
    `<form id="import-form"><div class="alert">必填列：program, subject, term, translation, sentence, sentenceZh<br>可选列：partOfSpeech（词性）、partOfSpeechNote（词性用法介绍）、aliases（中文别名）、enAliases（英文别名）、groups（Topic、周次或单元，以上均用分号分隔）、source。项目和科目请使用模板中的完整名称。每批最多 300 条。</div><button class="btn btn-light" type="button" data-action="word-template">${icon("download")}下载 CSV 模板</button><div class="file-input"><label class="form-field"><span>选择词库 CSV 文件</span><input name="csv" type="file" accept=".csv,text/csv" required></label></div></form>`,
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
function exportSubjects(program) {
  return state.config.subjects.filter(
    (subject) => exportableWords(state.words, program, subject).length,
  );
}
function updateVocabularyExport({ keepSubject = true } = {}) {
  const form = $("#vocabulary-export-form");
  if (!form) return;
  const program = form.elements.program.value,
    select = form.elements.subject;
  const subjects = exportSubjects(program),
    previous = select.value;
  select.innerHTML =
    option("", "请选择科目", "") +
    subjects.map((s) => option(s, nameSubject(s))).join("");
  select.value =
    keepSubject && subjects.includes(previous)
      ? previous
      : subjects.includes(state.filter.subject)
        ? state.filter.subject
        : subjects.length === 1
          ? subjects[0]
          : "";
  select.disabled = !subjects.length;
  updateVocabularyExportCount();
}
function updateVocabularyExportCount() {
  const form = $("#vocabulary-export-form");
  if (!form) return;
  const words = exportableWords(
    state.words,
    form.elements.program.value,
    form.elements.subject.value,
  );
  $("#vocabulary-export-count").textContent = form.elements.subject.value
    ? `当前词库：${words.length} 条记录。下载时会读取最新完整词库。`
    : "先选择项目与科目。";
  const button = document.querySelector(
    '[form="vocabulary-export-form"][type="submit"]',
  );
  if (button) button.disabled = !words.length;
}
function openVocabularyExport() {
  const programs = [...state.config.programs, "通用示例"].filter(
    (p) => exportSubjects(p).length,
  );
  const program = programs.includes(state.filter.program)
    ? state.filter.program
    : programs[0] || "";
  modal(
    "导出单词",
    "选择项目与科目，下载完整 Excel 词库。",
    `<form id="vocabulary-export-form"><div class="form-grid"><label class="form-field full"><span>课程项目</span><select name="program" data-change="export-program" required>${programs.map((p) => option(p, p, program)).join("") || '<option value="">暂无已录入词库</option>'}</select></label><label class="form-field full"><span>科目</span><select name="subject" data-change="export-subject" required></select></label><div class="full export-word-summary" id="vocabulary-export-count" role="status"></div><p class="full privacy-note">包含释义、词性与用法、双语例句、全部周次 / Topic、可接受答案及来源信息。导出全部词条，不受搜索、周次筛选或页面显示条数限制。</p></div></form>`,
    `<button class="btn btn-light" data-action="close-modal">取消</button><button class="btn btn-primary" type="submit" form="vocabulary-export-form">${icon("download")}下载 Excel</button>`,
    true,
  );
  updateVocabularyExport();
}
function download(name, contents, type = "text/csv;charset=utf-8") {
  const url = URL.createObjectURL(new Blob([contents], { type }));
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.hidden = true;
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 60000);
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
  state.attempt.attempt.answers = {
    ...state.attempt.attempt.answers,
    ...Object.fromEntries(data.entries()),
  };
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
  clearTimeout(autoQuestionTimer);
  try {
    sessionStorage.removeItem(questionPositionKey());
  } catch {}
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
  if (!task.practice) {
    examCompletedHere.add(task.id);
    examAlertItems = examAlertItems.filter((t) => t.id !== task.id);
    examPanelOpen = false;
  }
  state.attempt = null;
  state.examResult = { attempt: a, task };
  clearTimeout(saveTimer);
  submitting = false;
  render();
  if (task.practice) {
    sessionStorage.removeItem("lexiclass-practice");
    loadPractice().catch(() => {});
  } else {
    receiveExamAlerts({ exams: examAlertItems }, state.user.id);
    load().catch(() => {});
  }
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
  if (view === "results") state.report = newReport();
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
    if (action === "board-class") {
      state.view = "classes";
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
    if (
      [
        "exam-previous",
        "exam-next",
        "exam-question",
        "exam-unanswered",
      ].includes(action)
    ) {
      if (!state.attempt) return;
      let index = currentQuestionIndex();
      if (action === "exam-previous") index--;
      if (action === "exam-next") index++;
      if (action === "exam-question") index = Number(b.dataset.question);
      if (action === "exam-unanswered") {
        index = state.attempt.questions.findIndex(
          (q) => !state.attempt.attempt.answers[q.id]?.trim(),
        );
        if (index < 0) {
          toast("所有题目均已作答，可以逐题检查后交卷。");
          return;
        }
      }
      showExamQuestion(index);
      return;
    }
    if (action === "choose-option") {
      const select = document.getElementById(b.dataset.select);
      if (!select || select.disabled) return;
      select.value = b.dataset.key;
      select.dispatchEvent(new Event("change", { bubbles: true }));
      enhanceChoiceControls();
      return;
    }
    if (action === "library-back" || action === "learning-back") {
      if (state.filter.subject !== "all") state.filter.subject = "all";
      else if (action === "library-back") state.filter.program = "all";
      state.filter.group = "all";
      state.filter.search = "";
      render();
      return;
    }
    if (action === "tasks-class") {
      state.filter.classId = b.dataset.id;
      state.filter.subject = "all";
      state.filter.search = "";
      render();
      return;
    }
    if (action === "tasks-subject") {
      state.filter.subject = b.dataset.key;
      state.filter.search = "";
      render();
      return;
    }
    if (action === "tasks-back") {
      if (state.filter.subject !== "all") state.filter.subject = "all";
      else state.filter.classId = "all";
      state.filter.search = "";
      render();
      return;
    }
    if (action === "class-course-detail") {
      const cls = state.classes.find((c) => c.id === b.dataset.id);
      const course = cls?.courses?.find((c) => c.subject === b.dataset.key);
      if (course)
        modal(
          course.title || nameSubject(course.subject),
          cls.name,
          `<div class="course-detail-symbol">${icon(subjectIcon(course.subject))}</div><p class="course-content">${esc(course.content || "尚未填写课程内容，可在管理课程中补充。")}</p>`,
          `<button class="btn btn-light" data-action="close-modal">关闭</button><button class="btn btn-primary" data-action="edit-class-courses" data-id="${cls.id}">编辑班级课程</button>`,
        );
      return;
    }
    if (action.startsWith("student-calendar-")) {
      const today = calendarDayKey();
      if (action === "student-calendar-month") {
        const [year, month] = (state.studentCalendarMonth || today.slice(0, 7))
          .split("-")
          .map(Number);
        const next = new Date(
          Date.UTC(year, month - 1 + Number(b.dataset.delta), 1),
        );
        state.studentCalendarMonth = next.toISOString().slice(0, 7);
        state.studentCalendarDate =
          state.studentCalendarMonth === today.slice(0, 7)
            ? today
            : state.studentCalendarMonth + "-01";
      }
      if (action === "student-calendar-today") {
        state.studentCalendarMonth = today.slice(0, 7);
        state.studentCalendarDate = today;
      }
      if (action === "student-calendar-day")
        state.studentCalendarDate = b.dataset.key;
      paintStudentCalendar();
      return;
    }
    if (action === "calendar-exam") {
      await load();
      state.requestedExamId = b.dataset.id;
      state.view = "exam-entry";
      state.examResult = null;
      sessionStorage.setItem("lexiclass-exam", b.dataset.id);
      closeExamAlerts();
      render();
      window.scrollTo(0, 0);
      return;
    }
    if (action === "alerts-open") {
      if (state.attempt && !state.attempt.task.practice) {
        toast("请先完成当前考试，交卷后可查看其他考试安排。");
        return;
      }
      if (!visibleExamAlerts().length) {
        toast("目前没有等待参加的考试。");
        return;
      }
      examPanelOpen = !examPanelOpen;
      paintExamAlerts();
      return;
    }
    if (action === "alerts-close") {
      closeExamAlerts();
      return;
    }
    if (action === "alerts-all") {
      closeExamAlerts();
      await navigate("tasks");
      return;
    }
    if (action === "alert-exam") {
      await enterAlertExam(b.dataset.id);
      return;
    }
    if (action === "font-size") {
      changeFontSize(b);
      return;
    }
    if (action === "retake-create") {
      retakeForm(b.dataset.id, b.dataset.student || "");
      return;
    }
    if (action === "roster-class") {
      state.filter.classId = b.dataset.id;
      state.filter.search = "";
      render();
      window.scrollTo(0, 0);
      return;
    }
    if (action === "roster-root") {
      state.filter.classId = "all";
      state.filter.search = "";
      render();
      return;
    }
    if (action === "library-program") {
      state.filter.program = b.dataset.key;
      state.filter.subject = "all";
      state.filter.group = "all";
      state.filter.search = "";
      render();
      return;
    }
    if (action === "library-subject" || action === "learning-subject") {
      state.filter.subject = b.dataset.key;
      state.filter.group = "all";
      state.filter.search = "";
      state.wordLimit = 60;
      render();
      return;
    }
    if (action.startsWith("report-")) {
      const r = state.report,
        key = b.dataset.key || b.dataset.id;
      if (action === "report-student") {
        openStudentReport(key);
        return;
      }
      if (action === "report-back") {
        if (r.subject || r.studentId)
          state.report = { ...newReport(), classId: r.classId };
        else state.report = newReport();
        state.resultTaskId = null;
        state.filter.program = "all";
      }
      if (action === "report-root") {
        state.report = newReport();
        state.resultTaskId = null;
        state.filter.program = "all";
      }
      if (action === "report-class") {
        state.report = { ...newReport(), classId: key };
        state.resultTaskId = null;
        state.view = "results";
      }
      if (action === "report-subject") {
        r.subject = key;
        r.group = "all";
        r.taskId = null;
        r.band = "all";
        r.hidden = [];
        r.examLimit = 12;
      }
      if (action === "report-all-subjects") {
        r.subject = null;
        r.group = "all";
        r.taskId = null;
        r.band = "all";
        r.hidden = [];
      }
      if (action === "report-group") {
        r.group = key;
        r.taskId = null;
        r.band = "all";
      }
      if (action === "report-clear-exam") {
        r.taskId = null;
        state.resultTaskId = null;
      }
      if (action === "report-band") r.band = r.band === key ? "all" : key;
      if (action === "report-range")
        r.limit = key === "all" ? "all" : Number(key);
      if (action === "report-more-exams") r.examLimit += 12;
      if (action === "report-more-students") r.studentLimit += 48;
      if (action === "report-series") {
        r.hidden = r.hidden.includes(key)
          ? r.hidden.filter((s) => s !== key)
          : [...r.hidden, key];
      }
      if (action === "report-cell") {
        const person = state.students.find((s) => s.id === b.dataset.student);
        const rows = reportRows({ group: false, task: false }).filter(
          (x) =>
            x.studentId === person?.id &&
            (x.groups.includes(key) ||
              (key === "未标注分组" && !x.groups.length)),
        );
        modal(
          `${person?.name || "学生"} · ${learningLabel(key)}`,
          `${clsName(r.classId)} · ${nameSubject(r.subject)}`,
          reportMetricsView(rows) + reportExamCards(rows, 100),
          `<button class="btn btn-light" data-action="close-modal">关闭</button><button class="btn btn-primary" data-action="report-student" data-id="${person?.id}">查看全科学习画像</button>`,
          true,
        );
        return;
      }
      if (action === "report-exam") {
        if (r.studentId) {
          const row = reportData().find(
            (x) => x.taskId === key && x.studentId === r.studentId,
          );
          if (row?.result) {
            modal(
              `${row.name} · ${row.score} 分`,
              row.taskTitle,
              timingSummary(row) + resultBody(row.result),
              "",
              true,
            );
          } else toast("这次考试尚未提交，可以在考试记录中查看状态。");
          return;
        }
        r.taskId = key;
      }
      closeModal();
      render();
      return;
    }
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
      if (action === "grade-band") a.band = b.dataset.band || b.dataset.key;
      if (action === "grade-group") {
        a.group = ["未标注周次 / 单元", "未标注分组"].includes(
          b.dataset.group || b.dataset.key,
        )
          ? "ungrouped"
          : b.dataset.group || b.dataset.key;
        a.band = "all";
      }
      if (action === "grade-class") {
        a.classId = b.dataset.id || b.dataset.key;
        a.band = "all";
      }
      if (action === "grade-student") {
        openStudentReport(b.dataset.id || b.dataset.key);
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
      state.view = "classes";
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
      const task = state.tasks.find((t) => t.id === b.dataset.id),
        cls = state.classes.find((c) => task?.classIds.includes(c.id));
      state.report = {
        ...newReport(),
        classId: cls?.id || null,
        subject: task && cls ? taskSubjectForClass(task, cls) : null,
        taskId: b.dataset.id,
      };
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
        checked = !inputs.every((i) => i.checked);
      inputs.forEach((i) => (i.checked = checked));
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
    if (action === "export-words") return openVocabularyExport();
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
            "partOfSpeech",
            "partOfSpeechNote",
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
            "n. phr. 名词短语",
            "名词短语，表示作出选择时放弃的次优机会的价值。",
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
        `<p style="font-size:0.88rem;color:#647269">你已完成 ${count} / ${state.attempt.questions.length} 题。提交后不能修改，${count < state.attempt.questions.length ? "未作答的题目将计为错误并收入错题本。" : "系统会立即评分并自动整理错题。"}</p>`,
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
        `<ol class="install-steps">${state.user.role === "teacher" ? "<li>按 UNSW / NCUK / UOW 创建班级，批量添加姓名。</li><li>将每位学生的个人开通入口私下发给本人，首次设置网页账号和密码。</li><li>添加或导入学科词汇、双语场景句与可接受答案。</li><li>发布任务时选择项目、科目、班级或个人，设置时间，复制考试链接发到班级群。</li><li>在成绩分析里按班级查看姓名、分数和逐题答案，导出 CSV。</li>" : "<li>首次用老师的学习码开通账号；之后直接在网页中用账号密码登录。</li><li>打开老师发来的考试链接，登录后点击开始，不需要安装客户端。</li><li>在开放时间内开始测试；开始后计时持续进行。</li><li>输入答案会自动保存，提交后查看成绩与错题。</li><li>按错题本提示反复复习；老师发布的科目无需自行选择。</li>"}</ol><div class="alert" style="margin-top:18px">答题框已请求关闭浏览器纠错。系统或输入法的自动纠正需在电脑设置中另行关闭；此应用不能强制更改系统输入法。联网异常时请保持答题页打开，确认保存状态。</div><p class="privacy-note">词库按班级实际课程维护，双语场景用于学习与听写。主观题按已配置的语义判分与参考答案规则评分。</p>`,
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
    if (form.id === "vocabulary-export-form") {
      if (state.user?.role !== "teacher")
        throw new Error("请使用老师账号导出词库。");
      const latest = await api("/api/words");
      const words = exportableWords(latest.words, data.program, data.subject);
      const exportedAt = Date.now();
      const file = buildVocabularyWorkbook(words, {
        program: data.program,
        subjectName: nameSubject(data.subject),
        exportedAt,
      });
      download(
        vocabularyExportFilename(
          data.program,
          nameSubject(data.subject),
          exportedAt,
        ),
        file,
        VOCABULARY_XLSX_TYPE,
      );
      state.words = latest.words;
      closeModal();
      toast(`已导出 ${words.length} 条词汇记录。`);
      return;
    }
    if (form.id === "retake-form") {
      const taskId = data.taskId;
      const result = await post(`/api/tasks/${taskId}/retakes`, {
        studentIds: new FormData(form).getAll("studentIds"),
        opensAt: beijingISO(data.opensAt),
        closesAt: beijingISO(data.closesAt),
        duration: Number(data.duration),
      });
      closeModal();
      await load();
      state.view = "tasks";
      render();
      shareExams([result.task]);
      toast("补考已安排，指定学生会自动收到提醒。");
    }
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
      state.view = "classes";
      render();
      invitesModal(r.students);
    }
    if (form.id === "task-form") {
      const fd = new FormData(form),
        cls = state.classes.find((c) => c.id === data.classId);
      if (!cls) throw new Error("请选择班级。");
      const scopes = selectedTaskScopes();
      if (
        !scopes.length ||
        scopes.some(
          (scope) =>
            !scope.groups.length ||
            !cls.courses?.some((c) => c.subject === scope.subject),
        )
      )
        throw new Error("请选择该班科目及各科考察范围。");
      const studentIds = fd.getAll("studentIds"),
        students = state.students.filter((s) => s.classId === cls.id);
      if (!studentIds.length) throw new Error("请至少选择一名参加学生。");
      if (
        studentIds.some((id) => !students.some((student) => student.id === id))
      )
        throw new Error("所选学生不属于该班级。");
      const payload = {
        autoTitle: true,
        program: cls.program,
        mode: data.mode,
        questionType: data.questionType,
        duration: Number(data.duration),
        classIds: [cls.id],
        audience: studentIds.length === students.length ? "all" : studentIds,
        wordCount: Number(data.wordCount),
      };
      if (
        !Number.isInteger(payload.wordCount) ||
        payload.wordCount < 1 ||
        payload.wordCount > 100
      )
        throw new Error("考察词数须为1–100。");
      const plan = currentTaskPlan();
      const tasks = plan.map((entry, index) => {
        const subjectScopes =
          combinedTask() || index === 0
            ? scopes
            : [{ subject: scopes[0].subject, groups: [entry.group] }];
        const wordIds =
          index === 0 || combinedTask()
            ? fd.getAll("wordIds")
            : taskScopeWords(subjectScopes, cls).map((w) => w.id);
        if (wordIds.length < payload.wordCount)
          throw new Error(
            `${entry.date} 的范围只有 ${wordIds.length} 个候选词，无法抽取 ${payload.wordCount} 个。`,
          );
        return {
          ...payload,
          ...entry,
          subjectScopes,
          wordIds,
          subject:
            subjectScopes.length > 1 ? MIXED_SUBJECT : subjectScopes[0].subject,
          wordGroup:
            subjectScopes.length === 1 && subjectScopes[0].groups.length === 1
              ? subjectScopes[0].groups[0]
              : "all",
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
  if (el.dataset.change === "task-count") {
    el.dataset.edited = "true";
    renderTaskCalendar();
    return;
  }
  if (el.closest("#exam-form")) {
    readAnswers();
    refreshQuestionNavigator();
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
  if (el.matches('#exam-form input[type="radio"]')) {
    const attempt = state.attempt;
    if (!attempt) return;
    const index = Number(
      el.closest("[data-question-index]").dataset.questionIndex,
    );
    readAnswers();
    refreshQuestionNavigator();
    clearTimeout(saveTimer);
    queueSave().catch(() => {});
    clearTimeout(autoQuestionTimer);
    if (index < attempt.questions.length - 1)
      autoQuestionTimer = setTimeout(() => {
        if (state.attempt === attempt && currentQuestionIndex() === index)
          showExamQuestion(index + 1);
      }, 200);
    return;
  }
  if (el.hasAttribute("data-report-student")) {
    if (el.value) openStudentReport(el.value);
    return;
  }
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
    if (key === "classId") {
      a.group = "all";
      a.subject = "all";
    }
    $("#main-view").innerHTML = content();
    return;
  }
  if (el.dataset.filter && el.dataset.filter !== "search") {
    state.filter[el.dataset.filter] = el.value;
    state.wordLimit = 60;
    if (["program", "subject"].includes(el.dataset.filter))
      state.filter.group = "all";
    if (el.dataset.filter === "program") {
      state.filter.classId = "all";
      if (state.view === "words") state.filter.subject = "all";
    }
    $("#main-view").innerHTML = content();
  }
  if (el.dataset.change === "export-program")
    updateVocabularyExport({ keepSubject: false });
  if (el.dataset.change === "export-subject") updateVocabularyExportCount();
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
  if (el.dataset.change === "task-scope-mode") syncTaskScopeMode();
  if (el.dataset.change === "task-scope-subject") {
    if (el.checked) state.taskScopes[el.value] = ["all"];
    else delete state.taskScopes[el.value];
    renderCombinedScopes();
    taskWords();
  }
  if (el.dataset.change === "task-scope-group") {
    const subject = el.dataset.subject;
    let groups = [...state.taskScopes[subject]];
    if (el.value === "all" && el.checked) groups = ["all"];
    else {
      groups = groups.filter(
        (g) => g !== el.value && (!el.checked || g !== "all"),
      );
      if (el.checked) groups.push(el.value);
    }
    state.taskScopes[subject] = groups;
    renderCombinedScopes();
    taskWords();
  }
  if (el.dataset.change === "task-count") {
    el.dataset.edited = "true";
    renderTaskCalendar();
  }
  if (el.dataset.change === "task-candidate") taskSummary();
  if (el.dataset.change === "task-words") taskWords();
  if (el.dataset.change === "task-summary") taskSummary();
});
document.addEventListener(
  "toggle",
  (e) => {
    if (!e.target.isConnected) return;
    if (e.target.hasAttribute?.("data-board-charts"))
      state.boardChartsOpen = e.target.open;
    if (e.target.dataset?.taskFolder)
      state.taskFolders[e.target.dataset.taskFolder] = e.target.open;
  },
  true,
);
document.addEventListener("keydown", (e) => {
  if (
    (e.key === "Enter" || e.key === " ") &&
    e.target.matches("[data-chart-point]")
  ) {
    e.preventDefault();
    e.target.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    return;
  }

  if (e.key === "Escape" && modalOpen) closeModal();
  if ((e.key === "Enter" || e.key === " ") && e.target.matches(".class-card")) {
    e.preventDefault();
    e.target.click();
  }
  if (e.key === "Tab" && modalOpen) {
    const nodes = $$(
      "#modal-root button:not(:disabled),#modal-root input:not(:disabled),#modal-root select,#modal-root textarea,#modal-root a",
    ).filter((n) => n.tabIndex >= 0 && n.getClientRects().length);
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
    await refresh({ background: true });
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
