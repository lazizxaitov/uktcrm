import Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";
import { getDbFilePath } from "@/lib/db/paths";

let singleton: Database.Database | null = null;

export function db() {
  if (singleton) return singleton;
  const dbPath = getDbFilePath();
  fs.mkdirSync(path.dirname(dbPath), { recursive: true });
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
