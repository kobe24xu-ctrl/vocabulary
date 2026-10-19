export const normalizeUsername = (value) =>
  String(value ?? "")
    .normalize("NFKC")
    .trim()
    .toLowerCase();
export const validStudentUsername = (value) =>
  value.length >= 1 &&
  value.length <= 60 &&
  /^[\p{L}\p{N}][\p{L}\p{N} .·_-]*$/u.test(value) &&
  value !== "master";
export const validNewPassword = (value) =>
  typeof value === "string" &&
  value.length >= 10 &&
  value.length <= 200 &&
  value.trim().length > 0;
