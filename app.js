const LEGACY_STORAGE_KEY = "mindfulBreakData";
const USERS_KEY = "mindfulBreakUsers";
const SESSION_KEY = "mindfulBreakSession";

let currentUser = null;

function getStorageKey(userId) {
  return `mindfulBreakData_${userId}`;
}

function getUsers() {
  try {
    const raw = localStorage.getItem(USERS_KEY);
    if (raw) return JSON.parse(raw);
  } catch (_) {}
  return [];
}

function saveUsers(users) {
  localStorage.setItem(USERS_KEY, JSON.stringify(users));
}

function getSession() {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (raw) return JSON.parse(raw);
  } catch (_) {}
  return null;
}

function setSession(user) {
  localStorage.setItem(
    SESSION_KEY,
    JSON.stringify({ userId: user.id, email: user.email, name: user.name })
  );
  currentUser = { userId: user.id, email: user.email, name: user.name };
}

function clearSession() {
  localStorage.removeItem(SESSION_KEY);
  currentUser = null;
}

async function hashPassword(password, salt) {
  const data = new TextEncoder().encode(`${salt}:${password}`);
  const hash = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function generateSalt() {
  return Array.from(crypto.getRandomValues(new Uint8Array(16)))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function normalizeEmail(email) {
  return email.trim().toLowerCase();
}

function migrateLegacyData(userId) {
  const legacy = localStorage.getItem(LEGACY_STORAGE_KEY);
  if (!legacy) return;
  const userKey = getStorageKey(userId);
  if (!localStorage.getItem(userKey)) {
    localStorage.setItem(userKey, legacy);
  }
}

function createDefaultData() {
  return {
    streak: 0,
    bestStreak: 0,
    totalMinutes: 0,
    sessionsCompleted: 0,
    checkins: {},
    platforms: DEFAULT_PLATFORMS.map((p) => ({ ...p })),
    dailyGoalMinutes: 30,
    activity: [],
    journal: [],
    remindersEnabled: false,
    reminderTime: "20:00",
    lastReminderDate: null,
    notifSessionEnabled: true,
    notifActivityEnabled: false,
    notifActivityTime: "09:00",
    lastActivityReminderDate: null,
    forumPosts: [],
    forumUsername: "You",
    offlineCompleted: [],
    notifications: [],
    unlockedBadges: [],
    dailyTrioDates: [],
  };
}

const DEFAULT_PLATFORMS = [
  { id: "instagram", name: "Instagram", icon: "📷", blocked: true },
  { id: "facebook", name: "Facebook", icon: "👥", blocked: true },
  { id: "tiktok", name: "TikTok", icon: "🎵", blocked: true },
  { id: "twitter", name: "X (Twitter)", icon: "🐦", blocked: true },
  { id: "youtube", name: "YouTube", icon: "▶️", blocked: false },
  { id: "snapchat", name: "Snapchat", icon: "👻", blocked: true },
  { id: "reddit", name: "Reddit", icon: "🔶", blocked: false },
  { id: "linkedin", name: "LinkedIn", icon: "💼", blocked: false },
];

const OFFLINE_ACTIVITIES = {
  physical: {
    label: "Physical",
    icon: "🏃",
    items: [
      { id: "walk", title: "Take a 20-minute walk", desc: "Leave your phone at home or in your pocket.", duration: "20 min" },
      { id: "stretch", title: "Stretching routine", desc: "Loosen neck, shoulders, and back from scrolling posture.", duration: "10 min" },
      { id: "yoga", title: "Yoga flow", desc: "Follow a short routine or free movement.", duration: "15 min" },
      { id: "workout", title: "Bodyweight workout", desc: "Push-ups, squats, planks — no equipment needed.", duration: "20 min" },
    ],
  },
  creative: {
    label: "Creative",
    icon: "🎨",
    items: [
      { id: "draw", title: "Sketch or doodle", desc: "Draw what you see around you — no posting required.", duration: "15 min" },
      { id: "write", title: "Free writing", desc: "Write three pages of whatever comes to mind.", duration: "20 min" },
      { id: "music", title: "Play an instrument", desc: "Or listen actively without multitasking.", duration: "30 min" },
      { id: "cook", title: "Cook something new", desc: "Focus on smells, textures, and taste.", duration: "45 min" },
    ],
  },
  social: {
    label: "Social",
    icon: "💬",
    items: [
      { id: "call", title: "Call someone you miss", desc: "A real voice beats a comment thread.", duration: "15 min" },
      { id: "letter", title: "Write a letter or card", desc: "On paper — send it later.", duration: "20 min" },
      { id: "family", title: "Quality time offline", desc: "Board game, walk, or meal with no phones.", duration: "1 hr" },
      { id: "help", title: "Help a neighbor", desc: "Small acts build real connection.", duration: "30 min" },
    ],
  },
  mindful: {
    label: "Mindful",
    icon: "🧘",
    items: [
      { id: "breathe", title: "Breathing exercise", desc: "4 seconds in, 4 hold, 4 out — repeat 10 times.", duration: "5 min" },
      { id: "meditate", title: "Meditation", desc: "Sit quietly and notice your breath.", duration: "10 min" },
      { id: "read", title: "Read a physical book", desc: "One chapter without checking your phone.", duration: "30 min" },
      { id: "journal-offline", title: "Paper journal", desc: "Write by hand — different from typing.", duration: "15 min" },
    ],
  },
  outdoor: {
    label: "Outdoors",
    icon: "🌳",
    items: [
      { id: "nature", title: "Nature walk", desc: "Notice trees, birds, sky — no photos needed.", duration: "30 min" },
      { id: "garden", title: "Garden or plants", desc: "Water, prune, or repot something living.", duration: "20 min" },
      { id: "stargaze", title: "Stargazing", desc: "Step outside after dark and look up.", duration: "15 min" },
      { id: "bike", title: "Bike ride", desc: "Explore a route you have not taken lately.", duration: "45 min" },
    ],
  },
  learning: {
    label: "Learning",
    icon: "📚",
    items: [
      { id: "skill", title: "Practice a skill", desc: "Language, coding on paper, knitting — screen-free.", duration: "30 min" },
      { id: "podcast", title: "Podcast with eyes closed", desc: "Listen only — no feed scrolling.", duration: "25 min" },
      { id: "puzzle", title: "Puzzle or brain teaser", desc: "Crossword, sudoku, or jigsaw.", duration: "20 min" },
      { id: "museum", title: "Visit a local spot", desc: "Library, museum, or café — phone stays off.", duration: "1 hr" },
    ],
  },
};

const FORUM_STARTER_POSTS = [
  {
    id: "starter-1",
    author: "Maya",
    text: "Replaced my morning scroll with a 15-minute walk. Felt more awake than any reel ever made me.",
    at: new Date(Date.now() - 86400000 * 2).toISOString(),
    likes: 3,
    liked: false,
    replies: [{ author: "Alex", text: "Going to try this tomorrow!", at: new Date(Date.now() - 86400000).toISOString() }],
  },
  {
    id: "starter-2",
    author: "Jordan",
    text: "Called my grandmother instead of watching stories. Best detox win this week.",
    at: new Date(Date.now() - 86400000 * 5).toISOString(),
    likes: 5,
    liked: false,
    replies: [],
  },
];

const LEVELS = [
  { level: 1, title: "Mindful Novice", xp: 0 },
  { level: 2, title: "Focus Seeker", xp: 100 },
  { level: 3, title: "Attention Guardian", xp: 250 },
  { level: 4, title: "Scroll Breaker", xp: 500 },
  { level: 5, title: "Digital Minimalist", xp: 800 },
  { level: 6, title: "Presence Master", xp: 1200 },
  { level: 7, title: "Calm Champion", xp: 1700 },
  { level: 8, title: "Detox Hero", xp: 2300 },
  { level: 9, title: "Mindful Legend", xp: 3000 },
  { level: 10, title: "Zen Grandmaster", xp: 4000 },
];

const XP_RULES = [
  { label: "Complete a detox session", xp: 50 },
  { label: "Each minute of focus time", xp: 2 },
  { label: "Successful daily check-in", xp: 35 },
  { label: "Screen-off activity completed", xp: 40 },
  { label: "Journal entry", xp: 25 },
  { label: "Forum post shared", xp: 20 },
  { label: "Current streak (per day)", xp: 15 },
  { label: "All daily challenges done", xp: 50 },
];

const BADGES = [
  { id: "first-session", icon: "🎯", title: "First Focus", desc: "Complete your first detox session", check: (s) => s.sessions >= 1 },
  { id: "sessions-5", icon: "🔥", title: "On a Roll", desc: "Complete 5 detox sessions", check: (s) => s.sessions >= 5 },
  { id: "sessions-25", icon: "⚡", title: "Focus Machine", desc: "Complete 25 detox sessions", check: (s) => s.sessions >= 25 },
  { id: "streak-3", icon: "🌱", title: "Growing Roots", desc: "Reach a 3-day streak", check: (s) => s.bestStreak >= 3 },
  { id: "streak-7", icon: "📅", title: "Week Warrior", desc: "Reach a 7-day streak", check: (s) => s.bestStreak >= 7 },
  { id: "streak-30", icon: "👑", title: "Monthly Monarch", desc: "Reach a 30-day streak", check: (s) => s.bestStreak >= 30 },
  { id: "hours-5", icon: "⏱️", title: "Time Keeper", desc: "Log 5 hours of detox time", check: (s) => s.totalMinutes >= 300 },
  { id: "offline-5", icon: "📵", title: "Screen-Free", desc: "Complete 5 screen-off activities", check: (s) => s.offlineCount >= 5 },
  { id: "offline-15", icon: "🌳", title: "Offline Explorer", desc: "Complete 15 screen-off activities", check: (s) => s.offlineCount >= 15 },
  { id: "journal-3", icon: "📓", title: "Reflective Soul", desc: "Write 3 journal entries", check: (s) => s.journalCount >= 3 },
  { id: "forum-1", icon: "💬", title: "Community Voice", desc: "Post in the activity forum", check: (s) => s.userPosts >= 1 },
  { id: "checkins-7", icon: "✅", title: "Honest Habit", desc: "7 successful check-ins", check: (s) => s.successCheckins >= 7 },
  { id: "daily-trio", icon: "🏅", title: "Triple Threat", desc: "Complete all daily challenges in one day", check: (s) => s.dailyTrioEver },
  { id: "level-5", icon: "🌟", title: "Rising Star", desc: "Reach level 5", check: (s) => s.level >= 5 },
  { id: "level-10", icon: "💎", title: "Grandmaster", desc: "Reach level 10", check: (s) => s.level >= 10 },
];

const QUOTES = [
  "Almost everything will work again if you unplug it for a few minutes — including you. — Anne Lamott",
  "The attention economy is not the real economy. Your time is finite.",
  "Comparison is the thief of joy. — Theodore Roosevelt",
  "You don't need more content. You need more connection with your own life.",
  "Social media is a tool. When the tool uses you, it's time to put it down.",
  "Boredom is where creativity begins.",
  "Your worth is not measured in likes.",
  "The best moments rarely fit in a square frame.",
  "Disconnect to reconnect — with people, nature, and yourself.",
  "Every scroll is a choice. Choose presence.",
];

function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

function loadData() {
  if (!currentUser) return createDefaultData();
  try {
    const raw = localStorage.getItem(getStorageKey(currentUser.userId));
    if (raw) {
      const d = migrateData(JSON.parse(raw));
      if (!d.forumUsername || d.forumUsername === "You") {
        d.forumUsername = currentUser.name;
      }
      return d;
    }
  } catch (_) {}
  const fresh = createDefaultData();
  fresh.forumUsername = currentUser.name;
  return fresh;
}

function migrateData(d) {
  if (d.remindersEnabled === undefined) d.remindersEnabled = false;
  if (!d.reminderTime) d.reminderTime = "20:00";
  if (d.lastReminderDate === undefined) d.lastReminderDate = null;
  if (d.notifSessionEnabled === undefined) d.notifSessionEnabled = true;
  if (d.notifActivityEnabled === undefined) d.notifActivityEnabled = false;
  if (!d.notifActivityTime) d.notifActivityTime = "09:00";
  if (d.lastActivityReminderDate === undefined) d.lastActivityReminderDate = null;
  if (!d.forumPosts) d.forumPosts = [];
  if (!d.forumUsername) d.forumUsername = "You";
  if (!d.offlineCompleted) d.offlineCompleted = [];
  if (!d.notifications) d.notifications = [];
  if (!d.unlockedBadges) d.unlockedBadges = [];
  if (!d.dailyTrioDates) d.dailyTrioDates = [];
  if (d.forumPosts.length === 0) d.forumPosts = FORUM_STARTER_POSTS.map((p) => ({ ...p }));
  return d;
}

function saveData(dataToSave) {
  if (!currentUser) return;
  localStorage.setItem(getStorageKey(currentUser.userId), JSON.stringify(dataToSave));
}

let data = createDefaultData();

// Timer state
let selectedMinutes = 25;
let remainingSeconds = 25 * 60;
let timerInterval = null;
let timerRunning = false;
const CIRCUMFERENCE = 2 * Math.PI * 54;

// DOM refs
const views = document.querySelectorAll(".view");
const navBtns = document.querySelectorAll(".nav-btn[data-view]");
const MOBILE_PRIMARY_VIEWS = ["dashboard", "session", "offline", "gamification"];
const MOBILE_MORE_VIEWS = ["forum", "notifications", "platforms", "journal", "settings"];

function showToast(message) {
  const toast = document.getElementById("toast");
  toast.textContent = message;
  toast.classList.remove("hidden");
  clearTimeout(showToast._t);
  showToast._t = setTimeout(() => toast.classList.add("hidden"), 2800);
}

function addActivity(text) {
  data.activity.unshift({
    text,
    at: new Date().toISOString(),
  });
  if (data.activity.length > 20) data.activity.length = 20;
  saveData(data);
  renderActivity();
}

function logNotification(title, body, type = "info") {
  data.notifications.unshift({
    id: "n-" + Date.now(),
    title,
    body,
    type,
    at: new Date().toISOString(),
    read: false,
  });
  if (data.notifications.length > 50) data.notifications.length = 50;
  saveData(data);
  renderNotificationHistory();
  updateNotifBadge();
}

function sendBrowserNotification(title, body, tag) {
  if (Notification.permission !== "granted") return;
  new Notification(title, { body, icon: "icons/icon-192.png", tag });
  logNotification(title, body, tag);
}

function switchToView(viewId) {
  switchView(viewId);
}

function closeMobileMenu() {
  const menu = document.getElementById("mobile-menu");
  const moreBtn = document.getElementById("btn-mobile-more");
  if (!menu) return;
  menu.classList.add("hidden");
  menu.setAttribute("aria-hidden", "true");
  if (moreBtn) moreBtn.setAttribute("aria-expanded", "false");
}

function openMobileMenu() {
  const menu = document.getElementById("mobile-menu");
  const moreBtn = document.getElementById("btn-mobile-more");
  if (!menu) return;
  menu.classList.remove("hidden");
  menu.setAttribute("aria-hidden", "false");
  if (moreBtn) moreBtn.setAttribute("aria-expanded", "true");
  document.querySelectorAll(".mobile-menu-item").forEach((item) => {
    const viewId = item.dataset.view;
    const activeView = document.querySelector(".view.active");
    const current = activeView ? activeView.id.replace("view-", "") : "";
    item.classList.toggle("active", viewId === current);
  });
}

function switchView(viewId) {
  if (viewId === "more") {
    openMobileMenu();
    return;
  }

  closeMobileMenu();

  navBtns.forEach((b) => {
    const active = b.dataset.view === viewId;
    b.classList.toggle("active", active);
    b.setAttribute("aria-selected", active ? "true" : "false");
  });

  document.querySelectorAll(".mobile-nav-btn").forEach((b) => {
    const v = b.dataset.view;
    if (v === "more") {
      b.classList.toggle("active", MOBILE_MORE_VIEWS.includes(viewId));
    } else {
      b.classList.toggle("active", v === viewId);
    }
  });

  views.forEach((v) => {
    const match = v.id === `view-${viewId}`;
    v.classList.toggle("active", match);
    v.hidden = !match;
  });

  if (viewId === "gamification") renderGamification();

  window.scrollTo({ top: 0, behavior: "smooth" });
}

function getGamificationStats() {
  const today = todayKey();
  const userPosts = data.forumPosts.filter((p) => !String(p.id).startsWith("starter-")).length;
  const successCheckins = Object.values(data.checkins).filter((s) => s === "success").length;
  const sessionToday = data.activity.some(
    (a) => a.at.startsWith(today) && /detox session/i.test(a.text)
  );
  const offlineToday = data.offlineCompleted.some((c) => c.date === today);
  const checkinToday = data.checkins[today] === "success";
  const challenges = { sessionToday, offlineToday, checkinToday };
  const allChallengesToday = sessionToday && offlineToday && checkinToday;

  if (allChallengesToday && !data.dailyTrioDates.includes(today)) {
    data.dailyTrioDates.push(today);
    if (data.dailyTrioDates.length > 90) data.dailyTrioDates = data.dailyTrioDates.slice(-90);
    saveData(data);
  }

  const dailyTrioEver = data.dailyTrioDates.length > 0;
  const baseXp =
    data.sessionsCompleted * 50 +
    data.totalMinutes * 2 +
    successCheckins * 35 +
    data.offlineCompleted.length * 40 +
    data.journal.length * 25 +
    userPosts * 20 +
    data.streak * 15;
  const challengeBonus = data.dailyTrioDates.length * 50;
  const totalXp = baseXp + challengeBonus;
  const levelInfo = getLevelFromXp(totalXp);

  return {
    totalXp,
    level: levelInfo.level,
    levelTitle: levelInfo.title,
    levelXp: levelInfo.currentXp,
    levelXpNeeded: levelInfo.xpForNext,
    levelProgress: levelInfo.progress,
    sessions: data.sessionsCompleted,
    totalMinutes: data.totalMinutes,
    streak: data.streak,
    bestStreak: data.bestStreak,
    offlineCount: data.offlineCompleted.length,
    journalCount: data.journal.length,
    userPosts,
    successCheckins,
    challenges,
    allChallengesToday,
    dailyTrioEver,
  };
}

function getLevelFromXp(xp) {
  let current = LEVELS[0];
  for (let i = LEVELS.length - 1; i >= 0; i--) {
    if (xp >= LEVELS[i].xp) {
      current = LEVELS[i];
      break;
    }
  }
  const next = LEVELS.find((l) => l.xp > current.xp);
  const currentXp = xp - current.xp;
  const xpForNext = next ? next.xp - current.xp : 0;
  const progress = next ? Math.min(100, (currentXp / xpForNext) * 100) : 100;
  return {
    level: current.level,
    title: current.title,
    currentXp,
    xpForNext: next ? xpForNext : currentXp,
    progress,
  };
}

function syncBadges() {
  const stats = getGamificationStats();
  const newlyUnlocked = [];
  BADGES.forEach((badge) => {
    if (badge.check(stats) && !data.unlockedBadges.includes(badge.id)) {
      data.unlockedBadges.push(badge.id);
      newlyUnlocked.push(badge);
    }
  });
  if (newlyUnlocked.length) {
    saveData(data);
    newlyUnlocked.forEach((badge) => {
      showToast(`🏆 Badge unlocked: ${badge.title}`);
      logNotification("Badge unlocked!", badge.title, "badge");
      addActivity(`Earned badge: ${badge.title}`);
    });
    renderGamification();
    updateRewardsNavBadge();
  }
}

function updateRewardsNavBadge() {
  const btn = document.querySelector('.nav-btn[data-view="gamification"]');
  if (!btn) return;
  const unlocked = data.unlockedBadges.length;
  const total = BADGES.length;
  btn.textContent = unlocked === total ? "Rewards ★" : "Rewards";
}

function renderGamification() {
  syncBadges();
  const stats = getGamificationStats();
  const unlockedSet = new Set(data.unlockedBadges);

  const badgeEl = document.getElementById("game-level-badge");
  const titleEl = document.getElementById("game-level-title");
  const xpTextEl = document.getElementById("game-xp-text");
  const barEl = document.getElementById("game-xp-bar");
  const totalXpEl = document.getElementById("game-total-xp");
  const badgeCountEl = document.getElementById("game-badge-count");

  if (!badgeEl) return;

  badgeEl.textContent = stats.level;
  titleEl.textContent = stats.levelTitle;
  const nextLevel = LEVELS.find((l) => l.level === stats.level + 1);
  xpTextEl.textContent = nextLevel
    ? `${stats.levelXp} / ${stats.levelXpNeeded} XP to level ${nextLevel.level}`
    : "Max level reached!";
  barEl.style.width = `${stats.levelProgress}%`;
  totalXpEl.textContent = stats.totalXp;
  badgeCountEl.textContent = data.unlockedBadges.length;

  const challengeList = document.getElementById("challenge-list");
  const challengeDefs = [
    { key: "sessionToday", text: "Complete a detox session", xp: 50 },
    { key: "offlineToday", text: "Log a screen-off activity", xp: 40 },
    { key: "checkinToday", text: "Successful daily check-in", xp: 35 },
  ];
  challengeList.innerHTML =
    challengeDefs
      .map((c) => {
        const done = stats.challenges[c.key];
        return `
        <li class="challenge-item ${done ? "done" : ""}">
          <span class="challenge-check" aria-hidden="true">${done ? "✓" : ""}</span>
          <span class="challenge-text">${c.text}</span>
          <span class="challenge-xp">+${c.xp} XP</span>
        </li>`;
      })
      .join("") +
    `<li class="challenge-bonus ${stats.allChallengesToday ? "claimed" : "pending"}">
      ${stats.allChallengesToday ? "🎉 Daily trio complete! +50 bonus XP earned" : "Complete all 3 for +50 bonus XP"}
    </li>`;

  const badgeGrid = document.getElementById("badge-grid");
  const progressText = document.getElementById("badge-progress-text");
  progressText.textContent = `${data.unlockedBadges.length} of ${BADGES.length} unlocked`;

  badgeGrid.innerHTML = BADGES.map((badge) => {
    const unlocked = unlockedSet.has(badge.id) || badge.check(stats);
    return `
      <div class="badge-card ${unlocked ? "unlocked" : "locked"}" title="${escapeHtml(badge.desc)}">
        <span class="badge-icon" aria-hidden="true">${badge.icon}</span>
        <div class="badge-title">${escapeHtml(badge.title)}</div>
        <div class="badge-desc">${escapeHtml(badge.desc)}</div>
      </div>`;
  }).join("");

  const rulesEl = document.getElementById("xp-rules");
  rulesEl.innerHTML = XP_RULES.map(
    (r) => `<li><span>${r.label}</span><span class="xp-amount">+${r.xp}</span></li>`
  ).join("");

  updateRewardsNavBadge();
}

function onGamificationAction() {
  syncBadges();
  renderGamification();
}

function formatDate(iso) {
  const d = new Date(iso);
  return d.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

// Navigation (desktop + mobile)
navBtns.forEach((btn) => {
  btn.addEventListener("click", () => switchView(btn.dataset.view));
});

document.querySelectorAll(".mobile-nav-btn").forEach((btn) => {
  btn.addEventListener("click", () => switchView(btn.dataset.view));
});

document.querySelectorAll(".mobile-menu-item").forEach((btn) => {
  btn.addEventListener("click", () => switchView(btn.dataset.view));
});

document.getElementById("mobile-menu-backdrop")?.addEventListener("click", closeMobileMenu);
document.getElementById("btn-mobile-menu-close")?.addEventListener("click", closeMobileMenu);

let mobileInstallBannerInit = false;

function initMobileInstallBanner() {
  if (mobileInstallBannerInit) return;
  mobileInstallBannerInit = true;
  const banner = document.getElementById("mobile-install-banner");
  if (!banner) return;
  if (isNativeApp()) return;
  const dismissed = localStorage.getItem("mindfulBreakInstallDismissed");
  const isMobile = window.matchMedia("(max-width: 767px)").matches;
  const isStandalone =
    window.matchMedia("(display-mode: standalone)").matches || window.navigator.standalone;
  if (isMobile && !isStandalone && !dismissed) {
    banner.classList.remove("hidden");
  }
  document.getElementById("btn-dismiss-install")?.addEventListener("click", () => {
    localStorage.setItem("mindfulBreakInstallDismissed", "1");
    banner.classList.add("hidden");
  });
  document.getElementById("btn-mobile-install")?.addEventListener("click", async () => {
    if (deferredInstallPrompt) {
      deferredInstallPrompt.prompt();
      await deferredInstallPrompt.userChoice;
      deferredInstallPrompt = null;
      banner.classList.add("hidden");
    } else {
      const isIos = /iphone|ipad|ipod/i.test(navigator.userAgent);
      showToast(
        isIos ? 'Tap Share, then "Add to Home Screen"' : "Use browser menu → Install app"
      );
    }
  });
}

// Dashboard stats
function renderStats() {
  document.getElementById("stat-streak").textContent = data.streak;
  document.getElementById("stat-best-streak").textContent = data.bestStreak;
  document.getElementById("stat-hours").textContent = (data.totalMinutes / 60).toFixed(1);
  document.getElementById("stat-sessions").textContent = data.sessionsCompleted;
}

function renderWeekChart() {
  const container = document.getElementById("week-chart");
  container.innerHTML = "";
  const today = new Date();

  for (let i = 6; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    const status = data.checkins[key];
    const isFuture = key > todayKey();

    const col = document.createElement("div");
    col.className = "day-col";

    const barWrap = document.createElement("div");
    barWrap.className = "day-bar-wrap";

    const bar = document.createElement("div");
    bar.className = "day-bar";
    if (isFuture) {
      bar.classList.add("future");
      bar.style.height = "4px";
    } else if (status === "success") {
      bar.classList.add("success");
      bar.style.height = "56px";
    } else if (status === "slip") {
      bar.classList.add("slip");
      bar.style.height = "32px";
    } else {
      bar.classList.add("none");
      bar.style.height = "4px";
    }

    barWrap.appendChild(bar);

    const label = document.createElement("span");
    label.className = "day-label";
    label.textContent = d.toLocaleDateString(undefined, { weekday: "short" });

    col.appendChild(barWrap);
    col.appendChild(label);
    container.appendChild(col);
  }
}

function renderCheckin() {
  const today = todayKey();
  const statusEl = document.getElementById("checkin-status");
  const actionsEl = document.getElementById("checkin-actions");
  const existing = data.checkins[today];

  if (existing) {
    actionsEl.classList.add("hidden");
    statusEl.classList.remove("hidden");
    if (existing === "success") {
      statusEl.textContent = "✓ You checked in successfully today. Keep it up!";
      statusEl.className = "checkin-status success";
    } else {
      statusEl.textContent = "You noted a slip today. Tomorrow is a fresh start.";
      statusEl.className = "checkin-status slip";
    }
  } else {
    actionsEl.classList.remove("hidden");
    statusEl.classList.add("hidden");
  }
}

function updateStreak(success) {
  const today = todayKey();
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayKey = yesterday.toISOString().slice(0, 10);

  data.checkins[today] = success ? "success" : "slip";

  if (success) {
    data.streak = data.checkins[yesterdayKey] === "success" ? data.streak + 1 : 1;
    if (data.streak > data.bestStreak) data.bestStreak = data.streak;
  } else {
    data.streak = 0;
  }

  saveData(data);
  renderStats();
  renderWeekChart();
  renderCheckin();
  onGamificationAction();
}

document.getElementById("btn-checkin-yes").addEventListener("click", () => {
  updateStreak(true);
  addActivity("Completed daily check-in — stayed off social media");
  showToast("Great job! Streak updated.");
});

document.getElementById("btn-checkin-no").addEventListener("click", () => {
  updateStreak(false);
  addActivity("Noted a slip on daily check-in");
  showToast("Honesty helps. You can start again tomorrow.");
  onGamificationAction();
});

// Quotes
function showQuote() {
  const q = QUOTES[Math.floor(Math.random() * QUOTES.length)];
  document.getElementById("daily-quote").textContent = q;
}

document.getElementById("btn-new-quote").addEventListener("click", showQuote);

// Activity
function renderActivity() {
  const list = document.getElementById("activity-list");
  if (!data.activity.length) {
    list.innerHTML = '<li class="empty-state">No activity yet. Start your first detox session!</li>';
    return;
  }
  list.innerHTML = data.activity
    .map(
      (a) =>
        `<li><span class="activity-time">${formatDate(a.at)}</span><br>${escapeHtml(a.text)}</li>`
    )
    .join("");
}

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}

// Timer
function formatTime(seconds) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

function updateRing() {
  const total = selectedMinutes * 60;
  const progress = remainingSeconds / total;
  const offset = CIRCUMFERENCE * (1 - progress);
  document.getElementById("ring-progress").style.strokeDashoffset = offset;
}

function setTimerDisplay() {
  document.getElementById("timer-display").textContent = formatTime(remainingSeconds);
  updateRing();
}

function setTimerUIState(state) {
  const picker = document.getElementById("duration-picker");
  const startBtn = document.getElementById("btn-start-session");
  const pauseBtn = document.getElementById("btn-pause-session");
  const resetBtn = document.getElementById("btn-reset-session");
  const label = document.getElementById("timer-label");

  if (state === "idle") {
    picker.classList.remove("hidden");
    startBtn.classList.remove("hidden");
    startBtn.textContent = "Start detox";
    pauseBtn.classList.add("hidden");
    resetBtn.classList.add("hidden");
    label.textContent = "Ready to focus";
  } else if (state === "running") {
    picker.classList.add("hidden");
    startBtn.classList.add("hidden");
    pauseBtn.classList.remove("hidden");
    resetBtn.classList.remove("hidden");
    pauseBtn.textContent = "Pause";
    label.textContent = "Stay off social media…";
  } else if (state === "paused") {
    pauseBtn.textContent = "Resume";
    label.textContent = "Paused";
  }
}

function completeSession() {
  clearInterval(timerInterval);
  timerInterval = null;
  timerRunning = false;

  data.totalMinutes += selectedMinutes;
  data.sessionsCompleted += 1;
  saveData(data);
  addActivity(`Completed ${selectedMinutes}-minute detox session`);
  renderStats();

  remainingSeconds = selectedMinutes * 60;
  setTimerDisplay();
  setTimerUIState("idle");

  if (data.notifSessionEnabled) {
    const title = "Detox session complete!";
    const body = `You focused for ${selectedMinutes} minutes. Well done.`;
    if (document.hidden && Notification.permission === "granted") {
      new Notification(title, { body, icon: "icons/icon-192.png", tag: "session-complete" });
    }
    logNotification(title, body, "session-complete");
  }

  document.getElementById("modal-complete").showModal();
  onGamificationAction();
}

function tick() {
  if (remainingSeconds <= 0) {
    completeSession();
    return;
  }
  remainingSeconds -= 1;
  setTimerDisplay();
}

document.querySelectorAll(".chip[data-minutes]").forEach((chip) => {
  chip.addEventListener("click", () => {
    if (timerRunning) return;
    document.querySelectorAll(".chip").forEach((c) => c.classList.remove("active"));
    chip.classList.add("active");
    selectedMinutes = Number(chip.dataset.minutes);
    remainingSeconds = selectedMinutes * 60;
    setTimerDisplay();
  });
});

document.getElementById("btn-start-session").addEventListener("click", () => {
  if (timerRunning) return;
  timerRunning = true;
  setTimerUIState("running");
  timerInterval = setInterval(tick, 1000);
});

document.getElementById("btn-pause-session").addEventListener("click", () => {
  if (timerRunning) {
    clearInterval(timerInterval);
    timerInterval = null;
    timerRunning = false;
    setTimerUIState("paused");
  } else {
    timerRunning = true;
    setTimerUIState("running");
    timerInterval = setInterval(tick, 1000);
  }
});

document.getElementById("btn-reset-session").addEventListener("click", () => {
  clearInterval(timerInterval);
  timerInterval = null;
  timerRunning = false;
  remainingSeconds = selectedMinutes * 60;
  setTimerDisplay();
  setTimerUIState("idle");
});

document.getElementById("btn-modal-close").addEventListener("click", () => {
  document.getElementById("modal-complete").close();
});

// Platforms
function renderPlatforms() {
  const list = document.getElementById("platform-list");
  list.innerHTML = data.platforms
    .map(
      (p) => `
    <li>
      <span class="platform-icon" aria-hidden="true">${p.icon}</span>
      <label class="platform-name">
        <input type="checkbox" data-id="${p.id}" ${p.blocked ? "checked" : ""} />
        ${escapeHtml(p.name)}
      </label>
    </li>`
    )
    .join("");

  list.querySelectorAll("input").forEach((input) => {
    input.addEventListener("change", () => {
      const platform = data.platforms.find((x) => x.id === input.dataset.id);
      if (platform) {
        platform.blocked = input.checked;
        saveData(data);
      }
    });
  });
}

document.getElementById("btn-add-platform").addEventListener("click", () => {
  const input = document.getElementById("custom-platform");
  const name = input.value.trim();
  if (!name) return;
  const id = "custom-" + Date.now();
  data.platforms.push({ id, name, icon: "📱", blocked: true });
  saveData(data);
  input.value = "";
  renderPlatforms();
  showToast(`Added ${name} to your list`);
});

document.getElementById("custom-platform").addEventListener("keydown", (e) => {
  if (e.key === "Enter") document.getElementById("btn-add-platform").click();
});

const goalSlider = document.getElementById("goal-slider");
const goalDisplay = document.getElementById("goal-display");
goalSlider.value = data.dailyGoalMinutes;
goalDisplay.textContent = data.dailyGoalMinutes;

goalSlider.addEventListener("input", () => {
  data.dailyGoalMinutes = Number(goalSlider.value);
  goalDisplay.textContent = data.dailyGoalMinutes;
  saveData(data);
});

// Journal
function renderJournal() {
  const list = document.getElementById("journal-list");
  if (!data.journal.length) {
    list.innerHTML = '<li class="empty-state">No journal entries yet.</li>';
    return;
  }
  list.innerHTML = data.journal
    .map(
      (e) => `
    <li>
      <div class="journal-entry-date">${formatDate(e.at)}</div>
      <div class="journal-entry-text">${escapeHtml(e.text)}</div>
    </li>`
    )
    .join("");
}

document.getElementById("btn-save-journal").addEventListener("click", () => {
  const input = document.getElementById("journal-input");
  const text = input.value.trim();
  if (!text) {
    showToast("Write something first");
    return;
  }
  data.journal.unshift({ text, at: new Date().toISOString() });
  if (data.journal.length > 50) data.journal.length = 50;
  saveData(data);
  input.value = "";
  renderJournal();
  addActivity("Added a journal entry");
  showToast("Entry saved");
  onGamificationAction();
});

// Export & import
function downloadFile(filename, content, mime) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function exportJournalJson() {
  if (!data.journal.length) {
    showToast("No journal entries to export");
    return;
  }
  const payload = {
    exportedAt: new Date().toISOString(),
    entries: data.journal,
  };
  downloadFile(
    `mindful-break-journal-${todayKey()}.json`,
    JSON.stringify(payload, null, 2),
    "application/json"
  );
  showToast("Journal exported as JSON");
}

function exportJournalCsv() {
  if (!data.journal.length) {
    showToast("No journal entries to export");
    return;
  }
  const rows = [["date", "text"]];
  data.journal.forEach((e) => {
    rows.push([`"${e.at}"`, `"${e.text.replace(/"/g, '""')}"`]);
  });
  const csv = rows.map((r) => r.join(",")).join("\n");
  downloadFile(`mindful-break-journal-${todayKey()}.csv`, csv, "text/csv");
  showToast("Journal exported as CSV");
}

function exportFullBackup() {
  const payload = {
    app: "Mindful Break",
    version: 1,
    exportedAt: new Date().toISOString(),
    data,
  };
  downloadFile(
    `mindful-break-backup-${todayKey()}.json`,
    JSON.stringify(payload, null, 2),
    "application/json"
  );
  showToast("Full backup downloaded");
}

function importBackup(file) {
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const parsed = JSON.parse(reader.result);
      const imported = parsed.data ? migrateData(parsed.data) : migrateData(parsed);
      if (!imported.journal || !imported.checkins) throw new Error("Invalid backup");
      data = imported;
      saveData(data);
      goalSlider.value = data.dailyGoalMinutes;
      goalDisplay.textContent = data.dailyGoalMinutes;
      renderStats();
      renderWeekChart();
      renderCheckin();
      renderActivity();
      renderPlatforms();
      renderJournal();
      renderSettings();
      renderNotificationsPage();
      renderForum();
      renderOfflineActivities();
      renderGamification();
      showToast("Backup restored successfully");
    } catch {
      showToast("Could not read backup file");
    }
  };
  reader.readAsText(file);
}

document.getElementById("btn-export-journal-json").addEventListener("click", exportJournalJson);
document.getElementById("btn-export-journal-csv").addEventListener("click", exportJournalCsv);
document.getElementById("btn-export-all").addEventListener("click", exportFullBackup);
document.getElementById("import-file").addEventListener("change", (e) => {
  const file = e.target.files[0];
  if (file) importBackup(file);
  e.target.value = "";
});

// Screen-off activities
let activeOfflineCategory = "physical";

function isOfflineDoneToday(id) {
  return data.offlineCompleted.some((c) => c.id === id && c.date === todayKey());
}

function renderOfflineActivities() {
  const countEl = document.getElementById("offline-count");
  if (countEl) countEl.textContent = data.offlineCompleted.length;

  const tabsEl = document.getElementById("offline-category-tabs");
  const panelEl = document.getElementById("offline-activities-panel");
  if (!tabsEl || !panelEl) return;

  tabsEl.innerHTML = Object.entries(OFFLINE_ACTIVITIES)
    .map(
      ([key, cat]) =>
        `<button type="button" class="category-tab ${key === activeOfflineCategory ? "active" : ""}" data-category="${key}" role="tab">${cat.icon} ${cat.label}</button>`
    )
    .join("");

  tabsEl.querySelectorAll(".category-tab").forEach((tab) => {
    tab.addEventListener("click", () => {
      activeOfflineCategory = tab.dataset.category;
      renderOfflineActivities();
    });
  });

  const cat = OFFLINE_ACTIVITIES[activeOfflineCategory];
  panelEl.innerHTML = `<div class="activity-grid">${cat.items
    .map((item) => {
      const done = isOfflineDoneToday(item.id);
      return `
        <button type="button" class="activity-card cat-${activeOfflineCategory} ${done ? "done" : ""}" data-activity-id="${item.id}">
          <span class="activity-card-icon" aria-hidden="true">${cat.icon}</span>
          <div class="activity-card-body">
            <h3>${escapeHtml(item.title)}</h3>
            <p>${escapeHtml(item.desc)}</p>
            <span class="activity-card-meta">${done ? "✓ Done today" : item.duration}</span>
          </div>
        </button>`;
    })
    .join("")}</div>`;

  panelEl.querySelectorAll(".activity-card").forEach((card) => {
    card.addEventListener("click", () => completeOfflineActivity(card.dataset.activityId));
  });
}

function completeOfflineActivity(id) {
  if (isOfflineDoneToday(id)) {
    showToast("You already completed this today");
    return;
  }
  let title = id;
  for (const cat of Object.values(OFFLINE_ACTIVITIES)) {
    const item = cat.items.find((i) => i.id === id);
    if (item) {
      title = item.title;
      break;
    }
  }
  data.offlineCompleted.push({ id, date: todayKey(), at: new Date().toISOString() });
  saveData(data);
  addActivity(`Completed screen-off activity: ${title}`);
  renderOfflineActivities();
  showToast("Activity logged — nice work!");
  onGamificationAction();
}

// Activity forum
function renderForum() {
  const usernameInput = document.getElementById("forum-username");
  if (usernameInput) usernameInput.value = data.forumUsername;

  const list = document.getElementById("forum-list");
  if (!list) return;

  if (!data.forumPosts.length) {
    list.innerHTML = '<li class="empty-state">No posts yet. Be the first to share!</li>';
    return;
  }

  list.innerHTML = data.forumPosts
    .map((post) => {
      const repliesHtml = (post.replies || [])
        .map(
          (r) =>
            `<li class="forum-reply"><strong>${escapeHtml(r.author)}:</strong> ${escapeHtml(r.text)}</li>`
        )
        .join("");
      return `
        <li class="forum-post" data-post-id="${post.id}">
          <div class="forum-post-header">
            <span class="forum-author">${escapeHtml(post.author)}</span>
            <span class="forum-date">${formatDate(post.at)}</span>
          </div>
          <p class="forum-body">${escapeHtml(post.text)}</p>
          <div class="forum-actions">
            <button type="button" class="forum-like-btn ${post.liked ? "liked" : ""}" data-like-id="${post.id}">
              ♥ ${post.likes || 0}
            </button>
            <form class="forum-reply-form" data-reply-id="${post.id}">
              <input type="text" placeholder="Reply…" maxlength="200" aria-label="Reply to post" />
              <button type="submit" class="btn btn-secondary btn-sm">Reply</button>
            </form>
          </div>
          ${repliesHtml ? `<ul class="forum-replies">${repliesHtml}</ul>` : ""}
        </li>`;
    })
    .join("");

  list.querySelectorAll(".forum-like-btn").forEach((btn) => {
    btn.addEventListener("click", () => toggleForumLike(btn.dataset.likeId));
  });

  list.querySelectorAll(".forum-reply-form").forEach((form) => {
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      const input = form.querySelector("input");
      const text = input.value.trim();
      if (!text) return;
      addForumReply(form.dataset.replyId, text);
      input.value = "";
    });
  });
}

function toggleForumLike(postId) {
  const post = data.forumPosts.find((p) => p.id === postId);
  if (!post) return;
  if (post.liked) {
    post.liked = false;
    post.likes = Math.max(0, (post.likes || 0) - 1);
  } else {
    post.liked = true;
    post.likes = (post.likes || 0) + 1;
  }
  saveData(data);
  renderForum();
}

function addForumReply(postId, text) {
  const post = data.forumPosts.find((p) => p.id === postId);
  if (!post) return;
  if (!post.replies) post.replies = [];
  post.replies.push({
    author: data.forumUsername || "You",
    text,
    at: new Date().toISOString(),
  });
  saveData(data);
  renderForum();
  showToast("Reply added");
}

document.getElementById("btn-forum-post").addEventListener("click", () => {
  const username = document.getElementById("forum-username").value.trim() || "You";
  const text = document.getElementById("forum-post-input").value.trim();
  if (!text) {
    showToast("Write a post first");
    return;
  }
  data.forumUsername = username;
  data.forumPosts.unshift({
    id: "post-" + Date.now(),
    author: username,
    text,
    at: new Date().toISOString(),
    likes: 0,
    liked: false,
    replies: [],
  });
  if (data.forumPosts.length > 100) data.forumPosts.length = 100;
  saveData(data);
  document.getElementById("forum-post-input").value = "";
  renderForum();
  addActivity("Posted in activity forum");
  showToast("Posted to forum");
  onGamificationAction();
});

// Notifications page
function updateNotifBadge() {
  const unread = data.notifications.filter((n) => !n.read).length;
  const btn = document.querySelector('.nav-btn[data-view="notifications"]');
  if (!btn) return;
  const base = "Alerts";
  btn.textContent = unread ? `${base} (${unread})` : base;
}

function updateNotificationPermissionUI() {
  const el = document.getElementById("notification-permission-status");
  if (!el) return;
  if (!("Notification" in window)) {
    el.textContent = "Notifications are not supported in this browser.";
    el.className = "hint muted denied";
    return;
  }
  if (Notification.permission === "granted") {
    el.textContent = "Notifications are enabled.";
    el.className = "hint granted";
  } else if (Notification.permission === "denied") {
    el.textContent = "Notifications blocked. Enable them in browser settings.";
    el.className = "hint denied";
  } else {
    el.textContent = "Allow notifications to get check-in and session alerts.";
    el.className = "hint muted";
  }
}

async function requestNotificationPermission() {
  if (!("Notification" in window)) {
    showToast("Notifications not supported here");
    return;
  }
  const result = await Notification.requestPermission();
  updateNotificationPermissionUI();
  if (result === "granted") {
    logNotification("Notifications enabled", "You will receive detox reminders and alerts.", "settings");
    showToast("Notifications enabled");
  } else if (result === "denied") showToast("Notifications were denied");
}

function renderNotificationHistory() {
  const list = document.getElementById("notification-list");
  if (!list) return;

  if (!data.notifications.length) {
    list.innerHTML = '<li class="empty-state">No notifications yet.</li>';
    return;
  }

  const icons = {
    "daily-checkin": "🔔",
    "session-complete": "🎉",
    "activity-suggestion": "🌿",
    settings: "⚙️",
    badge: "🏆",
  };
  list.innerHTML = data.notifications
    .map((n) => {
      const icon = icons[n.type] || "📬";
      return `
        <li class="notification-item ${n.read ? "" : "unread"}" data-notif-id="${n.id}">
          <span class="notification-icon" aria-hidden="true">${icon}</span>
          <div class="notification-content">
            <h4>${escapeHtml(n.title)}</h4>
            <p>${escapeHtml(n.body)}</p>
            <span class="notification-time">${formatDate(n.at)}</span>
          </div>
        </li>`;
    })
    .join("");

  list.querySelectorAll(".notification-item").forEach((item) => {
    item.addEventListener("click", () => {
      const notif = data.notifications.find((x) => x.id === item.dataset.notifId);
      if (notif) notif.read = true;
      saveData(data);
      renderNotificationHistory();
      updateNotifBadge();
    });
  });
}

function renderNotificationsPage() {
  updateNotificationPermissionUI();

  const checkinEnabled = document.getElementById("notif-checkin-enabled");
  const checkinTime = document.getElementById("notif-checkin-time");
  const checkinRow = document.getElementById("notif-checkin-time-row");
  const sessionEnabled = document.getElementById("notif-session-enabled");
  const activityEnabled = document.getElementById("notif-activity-enabled");
  const activityTime = document.getElementById("notif-activity-time");
  const activityRow = document.getElementById("notif-activity-time-row");

  if (!checkinEnabled) return;

  checkinEnabled.checked = data.remindersEnabled;
  checkinTime.value = data.reminderTime;
  checkinRow.classList.toggle("disabled", !data.remindersEnabled);
  sessionEnabled.checked = data.notifSessionEnabled;
  activityEnabled.checked = data.notifActivityEnabled;
  activityTime.value = data.notifActivityTime;
  activityRow.classList.toggle("disabled", !data.notifActivityEnabled);

  renderNotificationHistory();
  updateNotifBadge();
}

function maybeSendDailyReminder() {
  if (!data.remindersEnabled) return;
  if (data.checkins[todayKey()]) return;
  if (data.lastReminderDate === todayKey()) return;

  const now = new Date();
  const [h, m] = data.reminderTime.split(":").map(Number);
  const target = new Date();
  target.setHours(h, m, 0, 0);

  if (now >= target) {
    data.lastReminderDate = todayKey();
    saveData(data);
    const title = "Time for your check-in";
    const body = "How did your social media detox go today?";
    if (Notification.permission === "granted") {
      sendBrowserNotification(title, body, "daily-checkin");
    } else {
      logNotification(title, body, "daily-checkin");
    }
  }
}

function maybeSendActivitySuggestion() {
  if (!data.notifActivityEnabled) return;
  if (data.lastActivityReminderDate === todayKey()) return;

  const now = new Date();
  const [h, m] = data.notifActivityTime.split(":").map(Number);
  const target = new Date();
  target.setHours(h, m, 0, 0);

  if (now >= target) {
    data.lastActivityReminderDate = todayKey();
    saveData(data);
    const cats = Object.values(OFFLINE_ACTIVITIES);
    const cat = cats[Math.floor(Math.random() * cats.length)];
    const item = cat.items[Math.floor(Math.random() * cat.items.length)];
    const title = "Screen-off idea for today";
    const body = `Try: ${item.title} (${item.duration})`;
    if (Notification.permission === "granted") {
      sendBrowserNotification(title, body, "activity-suggestion");
    } else {
      logNotification(title, body, "activity-suggestion");
    }
  }
}

function renderSettings() {}

document.getElementById("btn-notif-allow").addEventListener("click", requestNotificationPermission);

document.getElementById("notif-checkin-enabled").addEventListener("change", (e) => {
  data.remindersEnabled = e.target.checked;
  document.getElementById("notif-checkin-time-row").classList.toggle("disabled", !data.remindersEnabled);
  data.lastReminderDate = null;
  saveData(data);
  if (data.remindersEnabled && Notification.permission === "default") requestNotificationPermission();
});

document.getElementById("notif-checkin-time").addEventListener("change", (e) => {
  data.reminderTime = e.target.value;
  data.lastReminderDate = null;
  saveData(data);
});

document.getElementById("notif-session-enabled").addEventListener("change", (e) => {
  data.notifSessionEnabled = e.target.checked;
  saveData(data);
});

document.getElementById("notif-activity-enabled").addEventListener("change", (e) => {
  data.notifActivityEnabled = e.target.checked;
  document.getElementById("notif-activity-time-row").classList.toggle("disabled", !data.notifActivityEnabled);
  data.lastActivityReminderDate = null;
  saveData(data);
});

document.getElementById("notif-activity-time").addEventListener("change", (e) => {
  data.notifActivityTime = e.target.value;
  data.lastActivityReminderDate = null;
  saveData(data);
});

document.getElementById("btn-clear-notifications").addEventListener("click", () => {
  data.notifications = [];
  saveData(data);
  renderNotificationHistory();
  updateNotifBadge();
  showToast("Notification history cleared");
});

document.getElementById("btn-goto-notifications").addEventListener("click", () => switchToView("notifications"));

setInterval(() => {
  maybeSendDailyReminder();
  maybeSendActivitySuggestion();
}, 60_000);
document.addEventListener("visibilitychange", () => {
  if (!document.hidden) {
    maybeSendDailyReminder();
    maybeSendActivitySuggestion();
  }
});

// PWA install & service worker
let deferredInstallPrompt = null;

window.addEventListener("beforeinstallprompt", (e) => {
  e.preventDefault();
  deferredInstallPrompt = e;
  initInstallUi();
});

window.addEventListener("appinstalled", () => {
  deferredInstallPrompt = null;
  document.getElementById("install-card").classList.add("hidden");
  showToast("App installed on your device");
});

function isNativeApp() {
  return window.Capacitor?.isNativePlatform?.() === true;
}

function isAppInstalled() {
  return (
    isNativeApp() ||
    window.matchMedia("(display-mode: standalone)").matches ||
    window.navigator.standalone === true
  );
}

function initInstallUi() {
  if (isAppInstalled()) return;
  const card = document.getElementById("install-card");
  const btn = document.getElementById("btn-install-pwa");
  const isIos = /iphone|ipad|ipod/i.test(navigator.userAgent);

  if (deferredInstallPrompt || isIos) {
    card.classList.remove("hidden");
    if (isIos && !deferredInstallPrompt) {
      btn.textContent = "Add to Home Screen";
    }
  }
}

document.getElementById("btn-install-pwa").addEventListener("click", async () => {
  const isIos = /iphone|ipad|ipod/i.test(navigator.userAgent);
  if (!deferredInstallPrompt) {
    showToast(
      isIos
        ? 'Tap Share (↑), then "Add to Home Screen"'
        : "Use browser menu → Install app"
    );
    return;
  }
  deferredInstallPrompt.prompt();
  await deferredInstallPrompt.userChoice;
  deferredInstallPrompt = null;
});

function updateOfflineBadge() {
  const badge = document.getElementById("offline-badge");
  badge.classList.toggle("hidden", navigator.onLine);
}

window.addEventListener("online", updateOfflineBadge);
window.addEventListener("offline", updateOfflineBadge);

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./sw.js").catch(() => {});
  });
}

// Auth UI
function showAuthError(message) {
  const el = document.getElementById("auth-error");
  el.textContent = message;
  el.classList.remove("hidden");
}

function clearAuthError() {
  document.getElementById("auth-error").classList.add("hidden");
}

function switchAuthTab(tab) {
  document.querySelectorAll(".auth-tab").forEach((btn) => {
    const active = btn.dataset.authTab === tab;
    btn.classList.toggle("active", active);
    btn.setAttribute("aria-selected", active ? "true" : "false");
  });
  document.getElementById("form-login").classList.toggle("hidden", tab !== "login");
  document.getElementById("form-signup").classList.toggle("hidden", tab !== "signup");
  clearAuthError();
}

function updateUserHeader() {
  if (!currentUser) return;
  const initial = currentUser.name.charAt(0).toUpperCase();
  document.getElementById("header-user-name").textContent = currentUser.name;
  document.getElementById("header-user-avatar").textContent = initial;
  const emailEl = document.getElementById("settings-user-email");
  const nameEl = document.getElementById("settings-user-name");
  if (emailEl) emailEl.textContent = currentUser.email;
  if (nameEl) nameEl.textContent = currentUser.name;
}

function showMainApp() {
  document.getElementById("auth-screen").classList.add("hidden");
  document.getElementById("main-app").classList.remove("hidden");
  updateUserHeader();
}

function showAuthScreen() {
  document.getElementById("auth-screen").classList.remove("hidden");
  document.getElementById("main-app").classList.add("hidden");
  clearAuthError();
}

function signOut() {
  if (timerInterval) {
    clearInterval(timerInterval);
    timerInterval = null;
  }
  timerRunning = false;
  clearSession();
  data = createDefaultData();
  showAuthScreen();
  document.getElementById("form-login").reset();
  document.getElementById("form-signup").reset();
}

async function handleLogin(e) {
  e.preventDefault();
  clearAuthError();
  const email = normalizeEmail(document.getElementById("login-email").value);
  const password = document.getElementById("login-password").value;
  const users = getUsers();
  const user = users.find((u) => u.email === email);

  if (!user) {
    showAuthError("No account found with this email.");
    return;
  }

  const hash = await hashPassword(password, user.salt);
  if (hash !== user.passwordHash) {
    showAuthError("Incorrect password. Please try again.");
    return;
  }

  setSession(user);
  migrateLegacyData(user.id);
  data = loadData();
  saveData(data);
  showMainApp();
  initApp();
}

async function handleSignup(e) {
  e.preventDefault();
  clearAuthError();
  const name = document.getElementById("signup-name").value.trim();
  const email = normalizeEmail(document.getElementById("signup-email").value);
  const password = document.getElementById("signup-password").value;
  const confirm = document.getElementById("signup-password-confirm").value;

  if (!name) {
    showAuthError("Please enter your name.");
    return;
  }
  if (password.length < 6) {
    showAuthError("Password must be at least 6 characters.");
    return;
  }
  if (password !== confirm) {
    showAuthError("Passwords do not match.");
    return;
  }

  const users = getUsers();
  if (users.some((u) => u.email === email)) {
    showAuthError("An account with this email already exists. Sign in instead.");
    return;
  }

  const salt = generateSalt();
  const passwordHash = await hashPassword(password, salt);
  const user = {
    id: "user_" + Date.now(),
    name,
    email,
    salt,
    passwordHash,
    createdAt: new Date().toISOString(),
  };

  users.push(user);
  saveUsers(users);
  setSession(user);
  migrateLegacyData(user.id);
  data = loadData();
  saveData(data);
  showMainApp();
  initApp();
}

function initNativeShell() {
  if (!isNativeApp()) return;
  document.body.classList.add("native-app");
  document.getElementById("install-card")?.classList.add("hidden");
  document.getElementById("mobile-install-banner")?.classList.add("hidden");
}

function initApp() {
  initNativeShell();
  document.getElementById("ring-progress").style.strokeDasharray = CIRCUMFERENCE;
  setTimerDisplay();
  renderStats();
  renderWeekChart();
  renderCheckin();
  renderActivity();
  renderPlatforms();
  renderJournal();
  renderSettings();
  renderNotificationsPage();
  renderForum();
  renderOfflineActivities();
  renderGamification();
  updateOfflineBadge();
  maybeSendDailyReminder();
  maybeSendActivitySuggestion();
  initInstallUi();
  initMobileInstallBanner();
  showQuote();
}

function bootstrap() {
  document.querySelectorAll(".auth-tab").forEach((btn) => {
    btn.addEventListener("click", () => switchAuthTab(btn.dataset.authTab));
  });
  document.getElementById("form-login").addEventListener("submit", handleLogin);
  document.getElementById("form-signup").addEventListener("submit", handleSignup);
  document.getElementById("btn-sign-out").addEventListener("click", signOut);
  document.getElementById("btn-sign-out-settings").addEventListener("click", signOut);

  const session = getSession();
  if (session?.userId) {
    const users = getUsers();
    const user = users.find((u) => u.id === session.userId);
    if (user) {
      currentUser = session;
      data = loadData();
      showMainApp();
      initApp();
      return;
    }
    clearSession();
  }
  showAuthScreen();
}

bootstrap();
