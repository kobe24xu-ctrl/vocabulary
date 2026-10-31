import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { resolve, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const read = (path) => readFileSync(join(root, path), "utf8");
let app = read("public/app.js")
  .replace(/^import .*speech\.js.*;\n/m, "")
  .replace(/^import .*word-banks\.js.*;\n/m, "")
  .replaceAll('"lexiclass-student-entry"', '"lexiclass-offline-entry"')
  .replaceAll('"lexiclass-exam"', '"lexiclass-offline-exam"')
  .replaceAll("${location.origin}/#invite=", "${DEMO_FILE_BASE}#invite=")
  .replace('new URL("/", location.origin)', "new URL(DEMO_FILE_BASE)")
  .replace('if ("serviceWorker" in navigator)', "if (false)")
  .replaceAll('data-action="install"', 'data-action="help"')
  .replaceAll("教师桌面快捷方式", "演示使用说明");
app = app
  .replaceAll("服务器", "本机浏览器")
  .replaceAll("服务端", "本机浏览器")
  .replaceAll(
    "考试链接可发班级群；学生登录自己的账号后答题，无需安装。",
    "本机演示链接仅用于这台电脑。请切换示例学生体验，不可发给全班。",
  )
  .replaceAll(
    "考试已发布，复制链接即可发给学生。",
    "演示考试已发布，请切换到示例学生体验。",
  )
  .replaceAll(
    "考试链接已复制，可发到班级群。",
    "本机演示链接已复制，仅用于同一台电脑。",
  )
  .replaceAll("复制考试链接", "复制本机演示链接")
  .replaceAll("用于以后在任何电脑登录", "仅用于本机演示，请勿使用真实密码");
const shared =
  read("public/word-banks.js")
    .replaceAll("export const ", "const ")
    .replaceAll("export function ", "function ") +
  "\n" +
  read("lib/words.mjs").replaceAll("export const ", "const ") +
  "\n" +
  read("lib/domain.mjs")
    .replace(/^import .*\n/gm, "")
    .replaceAll("export const ", "const ")
    .replaceAll("export function ", "function ");
const speech = read("public/speech.js")
  .replaceAll("export function ", "function ")
  .replaceAll("export async function ", "async function ");
const script =
  `const DEMO_FILE_BASE=location.href.split(/[?#]/)[0];\nconst randomInt=max=>Math.floor(Math.random()*max);\n${shared}\n${read("scripts/demo-runtime.js")}\n${speech}\n${app}`.replace(
    /<\/script/gi,
    "<\\/script",
  );
const icon = `data:image/svg+xml,${encodeURIComponent(read("public/icon.svg"))}`;
const guideCSS = `body{padding-top:58px}.sidebar{top:58px}.offline-guide{position:fixed;inset:0 0 auto;min-height:58px;background:#fff3d9;color:#735e2d;z-index:250;padding:10px 22px;display:flex;gap:12px;align-items:center;font:12px/1.5 -apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;border-bottom:1px solid #e9d6a4}.offline-guide strong{white-space:nowrap}.offline-guide span{flex:1}.offline-guide button{background:white;border:1px solid #e5d5ae;border-radius:6px;color:#735e2d;padding:6px 10px;font:inherit;white-space:nowrap;cursor:pointer}@media(max-width:760px){body{padding-top:110px}.sidebar{top:110px}.offline-guide{min-height:110px;gap:7px;flex-wrap:wrap;font-size:10px;padding:10px}.offline-guide span{min-width:65%}}`;
const html = `<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; img-src data: blob:; connect-src 'none'; font-src 'none'; base-uri 'none'; form-action 'none'"><title>词间课堂 · 本机交互试用版</title><link rel="icon" href="${icon}"><style>${read("public/styles.css")}\n${guideCSS}</style></head><body><section class="offline-guide"><strong>本机交互试用版</strong><span>不是在线托管；只在本机浏览器保存，不能供全班共享。请勿输入真实学生信息或真实密码。<small id="offline-storage-note">先发布听写，再点「体验学生端」试答题。</small></span><button id="offline-teacher">回到教师端</button><button id="offline-reset">重置示例</button></section><div id="app"></div><div id="modal-root"></div><div id="toast-root" aria-live="polite"></div><script type="module">${script}</script></body></html>`;
const output = resolve(
  process.argv[2] || join(root, "dist/lexiclass-demo.html"),
);
mkdirSync(dirname(output), { recursive: true });
writeFileSync(output, html);
console.log(`Standalone local demo written: ${output}`);
