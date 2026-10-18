import { DatabaseSync, backup } from "node:sqlite";
import { resolve, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { mkdirSync, existsSync, chmodSync } from "node:fs";
const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const source = resolve(
  process.env.DATA_DIR || join(root, "data"),
  "lexiclass.sqlite",
);
const destination = process.argv[2] && resolve(process.argv[2]);
if (!destination || source === destination || existsSync(destination)) {
  console.error(
    "Usage: npm run backup -- /private/backups/lexiclass-YYYY-MM-DD.sqlite (new destination required)",
  );
  process.exit(1);
}
mkdirSync(dirname(destination), { recursive: true, mode: 0o700 });
const db = new DatabaseSync(source, { readOnly: true });
try {
  await backup(db, destination);
  chmodSync(destination, 0o600);
  console.log("Database backup completed. Keep this file private.");
} finally {
  db.close();
}
