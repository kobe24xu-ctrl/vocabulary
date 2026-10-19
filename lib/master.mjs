// One application administrator; never tied to a teacher's personal profile.
export const MASTER_ACCOUNT = "master";
export const MASTER_NAME = "Master";
export const MANAGEMENT_MODEL = "single-master";
export const isMasterLogin = (body) =>
  typeof body.username === "string" &&
  body.username.trim().toLowerCase() === MASTER_ACCOUNT;
