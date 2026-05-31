const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..");
const www = path.join(root, "www");

const COPY_FILES = [
  "index.html",
  "styles.css",
  "mobile.css",
  "app.js",
  "sw.js",
  "manifest.webmanifest",
];

const COPY_DIRS = ["icons"];

function rmDir(dir) {
  if (fs.existsSync(dir)) fs.rmSync(dir, { recursive: true, force: true });
}

function copyFile(src, dest) {
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.copyFileSync(src, dest);
}

function copyDir(src, dest) {
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const s = path.join(src, entry.name);
    const d = path.join(dest, entry.name);
    if (entry.isDirectory()) copyDir(s, d);
    else copyFile(s, d);
  }
}

rmDir(www);
fs.mkdirSync(www, { recursive: true });

for (const file of COPY_FILES) {
  const src = path.join(root, file);
  if (!fs.existsSync(src)) {
    console.warn(`Skip missing: ${file}`);
    continue;
  }
  copyFile(src, path.join(www, file));
}

for (const dir of COPY_DIRS) {
  const src = path.join(root, dir);
  if (fs.existsSync(src)) copyDir(src, path.join(www, dir));
}

console.log("www/ ready for Capacitor");
