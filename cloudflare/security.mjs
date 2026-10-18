const encoder = new TextEncoder();
const hex = (bytes) =>
  Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
const unhex = (text) =>
  Uint8Array.from(text.match(/.{2}/g) || [], (v) => parseInt(v, 16));
export const id = () => crypto.randomUUID();
export const token = (size = 24) =>
  hex(crypto.getRandomValues(new Uint8Array(size)));
export const hash = async (value) =>
  hex(
    new Uint8Array(
      await crypto.subtle.digest("SHA-256", encoder.encode(String(value))),
    ),
  );
export function equal(a, b) {
  if (a.length !== b.length) return false;
  let mismatch = 0;
  for (let i = 0; i < a.length; i++)
    mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return mismatch === 0;
}
async function derive(password, salt, iterations) {
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(password),
    "PBKDF2",
    false,
    ["deriveBits"],
  );
  return hex(
    new Uint8Array(
      await crypto.subtle.deriveBits(
        { name: "PBKDF2", hash: "SHA-256", salt: unhex(salt), iterations },
        key,
        256,
      ),
    ),
  );
}
export async function passwordHash(password) {
  const salt = token(16),
    iterations = 100000;
  return `pbkdf2-sha256:${iterations}:${salt}:${await derive(password, salt, iterations)}`;
}
export async function passwordOK(password, stored) {
  if (!stored) return false;
  const [algorithm, count, salt, expected] = stored.split(":");
  if (
    algorithm !== "pbkdf2-sha256" ||
    !/^\d+$/.test(count) ||
    Number(count) !== 100000 ||
    !/^[a-f0-9]{32}$/.test(salt || "") ||
    !/^[a-f0-9]{64}$/.test(expected || "")
  )
    return false;
  return equal(await derive(password, salt, Number(count)), expected);
}
