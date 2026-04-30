import Database from "better-sqlite3";
import path from "node:path";

let singleton: Database.Database | null = null;

export function db() {
  if (singleton) return singleton;
  const dbPath = path.join(process.cwd(), "data", "uktcrm.sqlite");
  singleton = new Database(dbPath);
  singleton.pragma("journal_mode = WAL");
  singleton.pragma("foreign_keys = ON");
  return singleton;
}

export function closeDb() {
  if (!singleton) return;
  try {
    singleton.close();
  } finally {
    singleton = null;
  }
}
