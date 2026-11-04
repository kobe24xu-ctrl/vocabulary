const designs = {
  swiss: [
    "01 / 瑞士排版",
    "白底、黑字、朱红强调。细分隔线、紧凑表格与清楚的数字层级，适合大量教学任务。",
  ],
  academy: [
    "02 / 学院蓝",
    "海军蓝导航、暖白纸面与铜色细节。衬线标题配简洁列表，偏成熟的校园教务风格。",
  ],
  paper: [
    "03 / 纸感教案",
    "米色纸张、墨黑文字与赭黄标记。横向导航与档案式列表，像一份整理好的教学手册。",
  ],
  slate: [
    "04 / 冷灰工作台",
    "石墨侧栏、冷灰底与电蓝操作。窄导航、密集信息和侧边日历，面向日常高频管理。",
  ],
  violet: [
    "05 / 紫罗兰档案",
    "淡紫纸面、深紫文字与直角模块。大标题、留白与分栏结构，安静而有编辑设计感。",
  ],
};
function choose(theme) {
  if (!designs[theme]) theme = "swiss";
  document.body.dataset.theme = theme;
  document.querySelector("#style-name").textContent = designs[theme][0];
  document.querySelector("#style-description").textContent = designs[theme][1];
  document.querySelectorAll(".theme-choices button").forEach((b) => {
    b.classList.toggle("selected", b.dataset.theme === theme);
    b.setAttribute("aria-pressed", String(b.dataset.theme === theme));
  });
  history.replaceState(null, "", `?style=${theme}`);
}
document.querySelectorAll("[data-theme]").forEach((b) => {
  if (b.tagName === "BUTTON")
    b.addEventListener("click", () => choose(b.dataset.theme));
});
choose(new URLSearchParams(location.search).get("style"));
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
