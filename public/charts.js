const chartEscape = (value) =>
  String(value ?? "").replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );
const chartValue = (value) =>
  Number.isFinite(value) ? Math.max(0, Math.min(100, value)) : null;
export function miniPlot(values, color = "#365f80") {
  const usable = values.filter(Number.isFinite);
  if (!usable.length) return '<div class="mini-plot-empty">暂无已交成绩</div>';
  const points = usable.map(
    (value, index) =>
      `${usable.length === 1 ? 80 : 8 + (index * 144) / (usable.length - 1)},${47 - chartValue(value) * 0.4}`,
  );
  return `<svg class="mini-plot" viewBox="0 0 160 54" role="img" aria-label="最近${usable.length}次成绩趋势"><path d="M8 47H152" stroke="#dfe4e9"/><polyline fill="none" stroke="${chartEscape(color)}" stroke-width="2.5" points="${points.join(" ")}"/>${points
    .map((p, i) => {
      const [x, y] = p.split(",");
      return `<circle cx="${x}" cy="${y}" r="3" fill="${chartEscape(color)}"><title>${usable[i]}分</title></circle>`;
    })
    .join("")}</svg>`;
}
export function linePlot(
  series,
  {
    items = [],
    action = "report-exam",
    selected = "",
    label = "成绩趋势",
    empty = "尚无已交成绩",
  } = {},
) {
  if (
    !items.length ||
    !series.some((s) => s.points.some((p) => Number.isFinite(p.value)))
  )
    return `<div class="viz-empty"><span>↗</span><p>${chartEscape(empty)}</p><small>收到有效答卷后自动绘制，未交卷不计为0分。</small></div>`;
  const width = Math.max(680, items.length * 70 + 90),
    height = 280,
    left = 48,
    right = 26,
    top = 24,
    bottom = 54;
  const x = (key) =>
    left +
    (items.length === 1
      ? (width - left - right) / 2
      : (items.findIndex((i) => i.key === key) * (width - left - right)) /
        (items.length - 1));
  const y = (value) =>
    height - bottom - (chartValue(value) * (height - top - bottom)) / 100;
  const grid = [0, 20, 40, 60, 80, 100]
    .map(
      (value) =>
        `<g><line x1="${left}" y1="${y(value)}" x2="${width - right}" y2="${y(value)}" class="plot-grid ${value === 60 ? "pass-line" : ""}"/><text x="${left - 10}" y="${y(value) + 5}" text-anchor="end">${value}</text></g>`,
    )
    .join("");
  const lines = series
    .map((s) => {
      let path = "",
        pen = false;
      for (const p of s.points) {
        if (chartValue(p.value) === null) {
          pen = false;
          continue;
        }
        path += `${pen ? " L" : " M"}${x(p.key)} ${y(p.value)}`;
        pen = true;
      }
      return `<path class="trend-path" d="${path}" fill="none" stroke="${chartEscape(s.color)}" stroke-width="3" pathLength="1"/>${s.points
        .filter((p) => Number.isFinite(p.value))
        .map(
          (p) =>
            `<g class="plot-point ${selected === p.key ? "selected" : ""}" data-chart-point data-action="${action}" data-key="${chartEscape(p.key)}" data-series="${chartEscape(s.key || "")}" role="button" tabindex="0" aria-label="${chartEscape(s.name || label)}，${chartEscape(items.find((i) => i.key === p.key)?.fullLabel || p.label || "")}，${p.value}分，点击查看"><circle cx="${x(p.key)}" cy="${y(p.value)}" r="15" fill="transparent"/><circle class="plot-dot" cx="${x(p.key)}" cy="${y(p.value)}" r="5" fill="${chartEscape(s.color)}" stroke="#fffefa" stroke-width="2"/><text class="plot-value" x="${x(p.key)}" y="${y(p.value) - 13}" text-anchor="middle">${p.value}</text><title>${chartEscape(s.name || label)} · ${chartEscape(p.label || items.find((i) => i.key === p.key)?.label)}：${p.value}分${p.note ? " · " + chartEscape(p.note) : ""}</title></g>`,
        )
        .join("")}`;
    })
    .join("");
  const labels = items
    .map(
      (item) =>
        `<text x="${x(item.key)}" y="${height - 23}" text-anchor="middle">${chartEscape(item.label)}</text>`,
    )
    .join("");
  return `<div class="chart-scroll"><svg class="visual-line-chart" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" style="min-width:${width}px" role="group" aria-label="${chartEscape(label)}">${grid}${lines}${labels}</svg></div>`;
}
export function barPlot(
  items,
  { action = "report-subject", selected = "", reference = false } = {},
) {
  if (!items.length) return '<div class="viz-empty"><p>暂无对应课程</p></div>';
  return `<div class="visual-bars">${items.map((item) => `<button class="visual-bar ${item.key === selected ? "selected" : ""}" data-action="${action}" data-key="${chartEscape(item.key)}" aria-label="${chartEscape(item.label)}，${item.value ?? "暂无"}分，点击查看"><span class="bar-label">${chartEscape(item.label)}</span><span class="bar-track"><i style="width:${chartValue(item.value) || 0}%;background:${chartEscape(item.color || "#365f80")}"></i>${reference && Number.isFinite(item.reference) ? `<b class="bar-reference" style="left:${chartValue(item.reference)}%" title="同场考试班级均分：${item.reference}"></b>` : ""}</span><strong>${item.value ?? "—"}<small>${Number.isFinite(item.value) ? "分" : "暂无提交"}</small></strong>${item.note ? `<span class="bar-note">${chartEscape(item.note)}</span>` : ""}</button>`).join("")}</div>`;
}
export function donutPlot(
  bins,
  { action = "report-band", selected = "all", average = null } = {},
) {
  const total = bins.reduce((n, b) => n + b.count, 0);
  let end = 0;
  const gradient = total
    ? bins
        .filter((b) => b.count)
        .map((b) => {
          const start = end;
          end += (b.count / total) * 100;
          return `${b.color} ${start}% ${end}%`;
        })
        .join(",")
    : "#e3e8ed 0% 100%";
  return `<div class="distribution-visual"><div class="score-donut" style="background:conic-gradient(${gradient})" role="img" aria-label="${total}份已交答卷的成绩分布"><div><strong>${average ?? "—"}</strong><span>${total ? "平均分" : "暂无成绩"}</span></div></div><div class="distribution-legend">${bins.map((b) => `<button data-action="${action}" data-key="${b.key}" class="${selected === b.key ? "selected" : ""}" aria-pressed="${selected === b.key}"><i style="background:${b.color}"></i><span>${chartEscape(b.label)}</span><strong>${b.count}</strong></button>`).join("")}</div></div>`;
}
