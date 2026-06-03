const { Pool } = require("pg");

let pool;
let initialized = false;

function getPool() {
  if (!pool) {
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.DATABASE_URL && !process.env.DATABASE_URL.includes("localhost")
        ? { rejectUnauthorized: false }
        : false,
    });
  }
  return pool;
}

async function initDb() {
  if (initialized) return;
  const p = getPool();
  await p.query(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
  await p.query(`
    CREATE TABLE IF NOT EXISTS user_data (
      user_id TEXT PRIMARY KEY REFERENCES users(id),
      data JSONB NOT NULL DEFAULT '{}',
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
  initialized = true;
  console.log("Database initialized");
}

async function query(text, params) {
  const p = getPool();
  return p.query(text, params);
}

initDb().catch((err) => console.error("Database init error:", err));

module.exports = { getPool, initDb, query };
