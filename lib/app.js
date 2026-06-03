const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { v4: uuidv4 } = require("uuid");
const { query } = require("./db");

const app = express();
const JWT_SECRET = process.env.JWT_SECRET || "mindful-break-secret-change-in-production";

app.use(express.json({ limit: "10mb" }));

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

    const existing = await query("SELECT id FROM users WHERE email = $1", [normalizedEmail]);
    if (existing.rows.length) {
      return res.status(409).json({ error: "An account with this email already exists" });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const id = "user_" + uuidv4();
    const now = new Date().toISOString();
    await query(
      "INSERT INTO users (id, name, email, password_hash, created_at) VALUES ($1, $2, $3, $4, $5)",
      [id, name.trim(), normalizedEmail, passwordHash, now]
    );

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

    const result = await query("SELECT * FROM users WHERE email = $1", [normalizedEmail]);
    if (!result.rows.length) {
      return res.status(401).json({ error: "No account found with this email" });
    }

    const user = result.rows[0];
    const match = await bcrypt.compare(password, user.password_hash);
    if (!match) return res.status(401).json({ error: "Incorrect password" });

    const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: "30d" });
    res.json({ token, user: { id: user.id, name: user.name, email: user.email } });
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

app.get("/api/auth/me", authMiddleware, async (req, res) => {
  try {
    const result = await query("SELECT id, name, email, created_at FROM users WHERE id = $1", [req.userId]);
    if (!result.rows.length) return res.status(404).json({ error: "User not found" });
    res.json({ user: result.rows[0] });
  } catch (err) {
    console.error("Get user error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

app.get("/api/data", authMiddleware, async (req, res) => {
  try {
    const result = await query("SELECT data FROM user_data WHERE user_id = $1", [req.userId]);
    const data = result.rows.length ? result.rows[0].data : null;
    res.json({ data });
  } catch (err) {
    console.error("Get data error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

app.put("/api/data", authMiddleware, async (req, res) => {
  try {
    const data = req.body;
    if (!data || typeof data !== "object") return res.status(400).json({ error: "Invalid data" });
    const uid = req.userId;
    const now = new Date().toISOString();

    const existing = await query("SELECT 1 FROM user_data WHERE user_id = $1", [uid]);
    if (existing.rows.length) {
      await query("UPDATE user_data SET data = $1, updated_at = $2 WHERE user_id = $3", [data, now, uid]);
    } else {
      await query("INSERT INTO user_data (user_id, data, updated_at) VALUES ($1, $2, $3)", [uid, data, now]);
    }
    res.json({ ok: true });
  } catch (err) {
    console.error("Save data error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

module.exports = app;
