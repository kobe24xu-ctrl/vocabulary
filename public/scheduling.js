// All classroom scheduling uses Beijing time, regardless of the teacher's OS zone.
export const beijingInput = (time = Date.now()) =>
  new Date(time + 8 * 3600000).toISOString().slice(0, 16);
export const beijingISO = (local) => {
  const time = new Date(`${local}+08:00`);
  if (!Number.isFinite(time.getTime()))
    throw new Error("请设置有效的北京时间。");
  return time.toISOString();
};
export function automaticTaskTitle(program, subject, group, names = {}) {
  const week = /^Week\s+(\d+)/i.exec(group || "");
  const semester = /^Term\s+(\d+)\s*·\s*Week\s+(\d+)/i.exec(group || "");
  const label =
    !group || group === "all"
      ? "综合词汇"
      : semester
        ? `T${semester[1]} W${semester[2].padStart(2, "0")}`
        : week
          ? `W${week[1].padStart(2, "0")}`
          : group.split("｜")[0];
  return `${String(program || "").split(" ")[0]} · ${names[subject] || subject} · ${label}`;
}
export function planSchedule({
  opensAt,
  closesAt,
  dates = [],
  groups,
  startGroup,
  overrides = {},
}) {
  const first = beijingISO(opensAt),
    end = beijingISO(closesAt);
  const window = Date.parse(end) - Date.parse(first);
  if (window <= 0) throw new Error("截止时间必须晚于开放时间。");
  const baseDate = opensAt.slice(0, 10),
    clock = opensAt.slice(11);
  const chosen = [...new Set(dates)].sort();
  if (chosen.length > 29) throw new Error("每批最多安排30次考试。");
  if (
    chosen.some((date) => !/^\d{4}-\d{2}-\d{2}$/.test(date) || date <= baseDate)
  )
    throw new Error("后续日期必须晚于首场日期。");
  const start = groups.indexOf(startGroup);
  if (chosen.length && start < 0)
    throw new Error("安排后续周次前，请选择一个具体周次或 Topic。");
  return [baseDate, ...chosen].map((date, index) => {
    const group =
      index === 0 ? startGroup : overrides[date] || groups[start + index];
    if (!group || (group !== "all" && !groups.includes(group)))
      throw new Error("后续词汇分组不足，请减少日期或为该日期指定已有分组。");
    const opens = beijingISO(`${date}T${clock}`);
    return {
      date,
      group,
      opensAt: opens,
      closesAt: new Date(Date.parse(opens) + window).toISOString(),
    };
  });
}
