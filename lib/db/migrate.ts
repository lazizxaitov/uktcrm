import { db } from "@/lib/db/db";
import crypto from "node:crypto";

function sha256(input: string) {
  return crypto.createHash("sha256").update(input).digest("hex");
}

export function migrate() {
  const database = db();

  const hasColumn = (table: string, column: string) => {
    const rows = database.prepare(`PRAGMA table_info(${table})`).all() as Array<{ name: string }>;
    return rows.some((r) => r.name === column);
  };

  database.exec(`
    CREATE TABLE IF NOT EXISTS meta (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      role TEXT NOT NULL,
      password_hash TEXT NOT NULL,
      seller_balance TEXT NOT NULL DEFAULT '0',
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      expires_at TEXT NOT NULL,
      FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS notifications (
      id TEXT PRIMARY KEY,
      type TEXT NOT NULL,
      message TEXT NOT NULL,
      is_read INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS audit (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      action TEXT NOT NULL,
      entity TEXT NOT NULL,
      entity_id TEXT,
      payload TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY(user_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS products (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      sku TEXT NOT NULL UNIQUE,
      barcode TEXT,
      category TEXT,
      box_size INTEGER,
      safety_stock TEXT NOT NULL DEFAULT '0',
      reorder_point TEXT NOT NULL DEFAULT '0',
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS customers (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      phone TEXT,
      deposit_balance TEXT NOT NULL DEFAULT '0',
      debt_limit TEXT NOT NULL DEFAULT '0',
      debt_days INTEGER,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS sales (
      id TEXT PRIMARY KEY,
      customer_id TEXT,
      status TEXT NOT NULL, -- OPEN | CLOSED | REFUNDED
      currency TEXT NOT NULL DEFAULT 'UZS',
      fx_rate_used TEXT,
      total TEXT NOT NULL DEFAULT '0',
      paid TEXT NOT NULL DEFAULT '0',
      deposit_delta TEXT NOT NULL DEFAULT '0',
      seller_delta TEXT NOT NULL DEFAULT '0',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      closed_at TEXT,
      FOREIGN KEY(customer_id) REFERENCES customers(id)
    );

    CREATE TABLE IF NOT EXISTS sale_items (
      id TEXT PRIMARY KEY,
      sale_id TEXT NOT NULL,
      product_id TEXT NOT NULL,
      qty TEXT NOT NULL,
      price TEXT NOT NULL,
      total TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY(sale_id) REFERENCES sales(id) ON DELETE CASCADE,
      FOREIGN KEY(product_id) REFERENCES products(id)
    );

    CREATE TABLE IF NOT EXISTS stock_batches (
      id TEXT PRIMARY KEY,
      product_id TEXT NOT NULL,
      qty_initial TEXT NOT NULL,
      qty_remaining TEXT NOT NULL,
      cost TEXT NOT NULL,
      currency TEXT NOT NULL DEFAULT 'UZS', -- UZS | USD
      fx_rate TEXT, -- USD->UZS rate at purchase
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY(product_id) REFERENCES products(id)
    );

    CREATE TABLE IF NOT EXISTS payments (
      id TEXT PRIMARY KEY,
      sale_id TEXT NOT NULL,
      method TEXT NOT NULL, -- CASH | CARD | MIX
      currency TEXT NOT NULL DEFAULT 'UZS',
      amount TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY(sale_id) REFERENCES sales(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS sale_allocations (
      id TEXT PRIMARY KEY,
      sale_item_id TEXT NOT NULL,
      batch_id TEXT NOT NULL,
      qty TEXT NOT NULL,
      cost TEXT NOT NULL,
      currency TEXT NOT NULL,
      fx_rate TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY(sale_item_id) REFERENCES sale_items(id) ON DELETE CASCADE,
      FOREIGN KEY(batch_id) REFERENCES stock_batches(id)
    );
  `);

  // Lightweight schema upgrades for existing DBs
  if (!hasColumn("users", "seller_balance")) {
    database.exec("ALTER TABLE users ADD COLUMN seller_balance TEXT NOT NULL DEFAULT '0'");
  }
  if (!hasColumn("customers", "deposit_balance")) {
    database.exec("ALTER TABLE customers ADD COLUMN deposit_balance TEXT NOT NULL DEFAULT '0'");
  }
  if (!hasColumn("sales", "fx_rate_used")) {
    database.exec("ALTER TABLE sales ADD COLUMN fx_rate_used TEXT");
  }

  // seed admin
  const count = database.prepare("SELECT COUNT(1) as cnt FROM users").get() as { cnt: number };
  if (count.cnt === 0) {
    database
      .prepare("INSERT INTO users (id, name, email, role, password_hash) VALUES (?, ?, ?, ?, ?)")
      .run("u_admin", "Admin", "admin@local", "Admin", sha256("admin"));
    database
      .prepare("INSERT INTO notifications (id, type, message) VALUES (?, ?, ?)")
      .run("n_welcome", "system", "Добро пожаловать в UKT CRM. Логин: admin@local, пароль: admin");
  }

  const metaCnt = database.prepare("SELECT COUNT(1) as cnt FROM meta").get() as { cnt: number };
  if (metaCnt.cnt === 0) {
    database.prepare("INSERT INTO meta (key, value) VALUES (?, ?)").run("fx_usd_uzs", "12500");
    database.prepare("INSERT INTO meta (key, value) VALUES (?, ?)").run("overpay_mode", "DEPOSIT"); // DEPOSIT | SELLER_MINUS
  }
}
