const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const path = require("path");
const fs = require("fs");
const { v4: uuidv4 } = require("uuid");

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || "mindful-break-secret-change-in-production";
const DB_PATH = path.join(__dirname, "data.db");

let db;

function initDb() {
  const initSqlJs = require("sql.js");
  return initSqlJs().then((SQL) => {
    if (fs.existsSync(DB_PATH)) {
      db = new SQL.Database(fs.readFileSync(DB_PATH));
    } else {
      db = new SQL.Database();
    }
    db.run("CREATE TABLE IF NOT EXISTS users (id TEXT PRIMARY KEY, name TEXT NOT NULL, email TEXT NOT NULL UNIQUE, password_hash TEXT NOT NULL, created_at TEXT NOT NULL)");
    db.run("CREATE TABLE IF NOT EXISTS user_data (user_id TEXT PRIMARY KEY, data TEXT NOT NULL DEFAULT '{}', updated_at TEXT NOT NULL)");
    saveDb();
    return db;
  });
}

function saveDb() {
  if (db) {
    fs.writeFileSync(DB_PATH, Buffer.from(db.export()));
  }
}

app.use(express.json({ limit: "10mb" }));
app.use(express.static(path.join(__dirname)));

function authMiddleware(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  try {
    const payload = jwt.verify(header.slice(7), JWT_SECRET);
    req.userId = payload.userId;
    next();
  } catch {
    return res.status(401).json({ error: "Invalid token" });
  }
}

app.post("/api/auth/signup", async (req, res) => {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password) return res.status(400).json({ error: "Name, email, and password required" });
    if (password.length < 6) return res.status(400).json({ error: "Password must be at least 6 characters" });
    const normalizedEmail = email.trim().toLowerCase();
    const existing = db.exec(`SELECT id FROM users WHERE email = '${normalizedEmail.replace(/'/g, "''")}'`);
    if (existing.length && existing[0].values.length) {
      return res.status(409).json({ error: "An account with this email already exists" });
    }
    const passwordHash = await bcrypt.hash(password, 10);
    const id = "user_" + uuidv4();
    const now = new Date().toISOString();
    const escName = name.trim().replace(/'/g, "''");
    db.run(`INSERT INTO users (id, name, email, password_hash, created_at) VALUES ('${id}', '${escName}', '${normalizedEmail.replace(/'/g, "''")}', '${passwordHash.replace(/'/g, "''")}', '${now}')`);
    saveDb();
    const token = jwt.sign({ userId: id }, JWT_SECRET, { expiresIn: "30d" });
    res.status(201).json({ token, user: { id, name: name.trim(), email: normalizedEmail } });
  } catch (err) {
    console.error("Signup error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

app.post("/api/auth/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: "Email and password required" });
    const normalizedEmail = email.trim().toLowerCase();
    const result = db.exec(`SELECT * FROM users WHERE email = '${normalizedEmail.replace(/'/g, "''")}'`);
    if (!result.length || !result[0].values.length) {
      return res.status(401).json({ error: "No account found with this email" });
    }
    const row = result[0].values[0];
    const cols = result[0].columns;
    const user = {};
    cols.forEach((c, i) => { user[c] = row[i]; });
    const match = await bcrypt.compare(password, user.password_hash);
    if (!match) return res.status(401).json({ error: "Incorrect password" });
    const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: "30d" });
    res.json({ token, user: { id: user.id, name: user.name, email: user.email } });
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

app.get("/api/auth/me", authMiddleware, (req, res) => {
  const result = db.exec(`SELECT id, name, email, created_at FROM users WHERE id = '${req.userId.replace(/'/g, "''")}'`);
  if (!result.length || !result[0].values.length) return res.status(404).json({ error: "User not found" });
  const cols = result[0].columns;
  const user = {};
  result[0].values[0].forEach((v, i) => { user[cols[i]] = v; });
  res.json({ user });
});

app.get("/api/data", authMiddleware, (req, res) => {
  try {
    const result = db.exec(`SELECT data FROM user_data WHERE user_id = '${req.userId.replace(/'/g, "''")}'`);
    const data = result.length && result[0].values.length ? JSON.parse(result[0].values[0][0]) : null;
    res.json({ data });
  } catch (err) {
    console.error("Get data error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

app.put("/api/data", authMiddleware, (req, res) => {
  try {
    const data = req.body;
    if (!data || typeof data !== "object") return res.status(400).json({ error: "Invalid data" });
    const json = JSON.stringify(data).replace(/'/g, "''");
    const uid = req.userId.replace(/'/g, "''");
    const now = new Date().toISOString();
    const existing = db.exec(`SELECT 1 FROM user_data WHERE user_id = '${uid}'`);
    if (existing.length && existing[0].values.length) {
      db.run(`UPDATE user_data SET data = '${json}', updated_at = '${now}' WHERE user_id = '${uid}'`);
    } else {
      db.run(`INSERT INTO user_data (user_id, data, updated_at) VALUES ('${uid}', '${json}', '${now}')`);
    }
    saveDb();
    res.json({ ok: true });
  } catch (err) {
    console.error("Save data error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

app.get("/*", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

initDb().then(() => {
  app.listen(PORT, () => {
    console.log(`Mindful Break server running at http://localhost:${PORT}`);
  });
}).catch((err) => {
  console.error("Failed to initialize database:", err);
  process.exit(1);
});
