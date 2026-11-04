const options = {
  wenkai: {
    title: "01 清润文楷",
    family: "霞鹜文楷",
    description:
      "有自然书写的起伏，字形舒展、不生硬。标题和正文统一用文楷，适合长时间看题与背词。",
    faces: ["CW Wenkai"],
  },
  xihei: {
    title: "02 轻柔黑体",
    family: "霞鹜新晰黑",
    description:
      "笔画纤细，字面松弛，比常见粗黑体更轻盈。标题与正文都保持简洁，接近安静的校园教务界面。",
    faces: ["CW Xihei"],
  },
  xiaowei: {
    title: "03 书卷细宋",
    family: "站酷小薇体",
    description:
      "细笔画搭配温和的衬线，带一点书页的气质。比传统粗宋体更秀气，适合学院蓝的暖白纸面。",
    faces: ["CW Xiaowei", "CW Wenkai"],
  },
  smiley: {
    title: "04 灵动标题",
    family: "得意黑标题 + 霞鹜文楷正文",
    description:
      "标题带一点自然倾斜与手绘感，正文用文楷保持舒适。适合想要更有辨识度、又容易阅读的界面。",
    faces: ["CW Smiley", "CW Wenkai"],
  },
  kuaile: {
    title: "05 圆润活泼",
    family: "站酷快乐体标题 + 霞鹜文楷正文",
    description:
      "标题的转角圆润、字形像手写卡片，整体更轻松。正文仍用文楷，保留词汇与成绩的阅读清晰度。",
    faces: ["CW Kuaile", "CW Wenkai"],
  },
};
let selection = 0;
async function chooseFont(key) {
  if (!options[key]) key = "wenkai";
  const current = ++selection,
    option = options[key];
  document.body.dataset.font = key;
  document.querySelector("#font-title").textContent = option.title;
  document.querySelector("#font-description").textContent = option.description;
  document.querySelector("#font-family-name").textContent = option.family;
  document.querySelectorAll(".font-choices button").forEach((button) => {
    const active = button.dataset.font === key;
    button.classList.toggle("selected", active);
    button.setAttribute("aria-pressed", String(active));
  });
  history.replaceState(null, "", `?font=${key}${location.hash}`);
  document.body.dataset.fontReady = "loading";
  try {
    await Promise.all(
      option.faces.map((face) =>
        document.fonts.load(`20px "${face}"`, "教学概览听写安排机会成本NCUK"),
      ),
    );
    if (current === selection) document.body.dataset.fontReady = "ready";
  } catch {
    if (current === selection) document.body.dataset.fontReady = "failed";
  }
}
document
  .querySelectorAll(".font-choices button")
  .forEach((button) =>
    button.addEventListener("click", () => chooseFont(button.dataset.font)),
  );
chooseFont(new URLSearchParams(location.search).get("font"));
const calendar = document.querySelector("#mini-calendar");
calendar.innerHTML =
  ["一", "二", "三", "四", "五", "六", "日"]
    .map((x) => `<small>${x}</small>`)
    .join("") +
  "<span></span>".repeat(6) +
  Array.from(
    { length: 30 },
    (_, i) =>
      `<span class="${[4, 18, 25].includes(i + 1) ? "marked" : ""}">${i + 1}</span>`,
  ).join("");
