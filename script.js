"use strict";

const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => [...document.querySelectorAll(selector)];

const el = {
  time: $("#timeDisplay"), ring: $("#timerRing"), icon: $("#timerIcon"),
  caption: $("#timerCaption"), message: $("#timerMessage"), durationLabel: $("#durationLabel"),
  sessionCount: $("#sessionCount"), start: $("#startBtn"), startText: $("#startText"),
  startIcon: $("#startIcon"), reset: $("#resetBtn"), skip: $("#skipBtn"), theme: $("#themeBtn"),
  form: $("#taskForm"), input: $("#taskInput"), list: $("#taskList"), total: $("#taskTotal"),
  progressText: $("#progressText"), progressFill: $("#progressFill"), remaining: $("#remainingText"),
  empty: $("#emptyState"), emptyTitle: $("#emptyTitle"), emptyMessage: $("#emptyMessage"),
  clearCompleted: $("#clearCompletedBtn"), date: $("#todayDate"), toast: $("#toast")
};

const MODES = {
  work: { seconds: 25 * 60, caption: "TIME TO FOCUS", label: "25 min session", message: "Small steps lead to big results." },
  short: { seconds: 5 * 60, caption: "SHORT BREAK", label: "5 min break", message: "Take a breath. You've earned it." },
  long: { seconds: 15 * 60, caption: "LONG BREAK", label: "15 min break", message: "Recharge your mind and come back stronger." }
};
const KEYS = { tasks: "focusflow_tasks_v1", settings: "focusflow_settings_v1" };

function readStorage(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw === null ? fallback : JSON.parse(raw);
  } catch (error) {
    console.warn(`Could not read ${key}:`, error);
    return fallback;
  }
}
function writeStorage(key, value) {
  try { localStorage.setItem(key, JSON.stringify(value)); return true; }
  catch (error) { console.warn(`Could not save ${key}:`, error); showToast("Could not save data in this browser."); return false; }
}

const savedSettings = readStorage(KEYS.settings, {});
let tasks = readStorage(KEYS.tasks, []);
if (!Array.isArray(tasks)) tasks = [];
tasks = tasks.filter(task => task && typeof task.id === "string" &&
  typeof task.text === "string" && typeof task.completed === "boolean");

let mode = Object.hasOwn(MODES, savedSettings.mode) ? savedSettings.mode : "work";
let duration = MODES[mode].seconds;
let remaining = duration;
let running = false;
let intervalId = null;
let deadline = 0;
let sessions = Number.isSafeInteger(savedSettings.sessions) && savedSettings.sessions >= 0
  ? savedSettings.sessions : 0;
let filter = "all";
let toastTimeout = null;
let audioContext = null;

function saveSettings() {
  writeStorage(KEYS.settings, {
    mode, sessions, theme: document.body.classList.contains("dark") ? "dark" : "light"
  });
}
function saveTasks() { writeStorage(KEYS.tasks, tasks); }
function formatTime(seconds) {
  return `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;
}
function updateDate() {
  el.date.textContent = new Intl.DateTimeFormat("en-IN", {
    weekday: "short", day: "numeric", month: "short", year: "numeric"
  }).format(new Date());
}
function updateTimer() {
  el.time.textContent = formatTime(remaining);
  const pct = duration ? (remaining / duration) * 100 : 0;
  el.ring.style.setProperty("--progress", `${pct}%`);
  el.ring.classList.toggle("running", running);
  el.ring.classList.toggle("break-mode", mode !== "work");
  $$(".mode-btn").forEach(button => {
    const active = button.dataset.mode === mode;
    button.classList.toggle("active", active);
    button.setAttribute("aria-pressed", String(active));
  });
  el.caption.textContent = MODES[mode].caption;
  el.durationLabel.textContent = MODES[mode].label;
  el.message.textContent = MODES[mode].message;
  el.icon.textContent = mode === "work" ? "✦" : "☕";
  el.sessionCount.textContent = `SESSION ${String((sessions % 4) + 1).padStart(2, "0")}`;
  el.startText.textContent = running ? "Pause timer" : `Start ${mode === "work" ? "focus" : "break"}`;
  el.startIcon.textContent = running ? "Ⅱ" : "▶";
  document.title = `${formatTime(remaining)} — FocusFlow`;
}
function pauseTimer() {
  if (intervalId !== null) clearInterval(intervalId);
  intervalId = null;
  running = false;
  if (deadline) remaining = Math.max(0, Math.ceil((deadline - Date.now()) / 1000));
  deadline = 0;
  updateTimer();
}
function startTimer() {
  if (running) return;
  if (remaining <= 0) remaining = duration;
  running = true;
  deadline = Date.now() + remaining * 1000;
  updateTimer();
  intervalId = setInterval(() => {
    remaining = Math.max(0, Math.ceil((deadline - Date.now()) / 1000));
    updateTimer();
    if (remaining === 0) {
      pauseTimer();
      finishSession();
    }
  }, 200);
}
function resetTimer() {
  pauseTimer();
  remaining = duration;
  updateTimer();
  showToast("Timer reset.");
}
function setMode(nextMode, notify = true) {
  if (!Object.hasOwn(MODES, nextMode)) return;
  pauseTimer();
  mode = nextMode;
  duration = MODES[mode].seconds;
  remaining = duration;
  saveSettings();
  updateTimer();
  if (notify) showToast(`${MODES[mode].caption} selected.`);
}
function skipSession() {
  setMode(mode === "work" ? "short" : "work", false);
  showToast("Session skipped.");
}
function finishSession() {
  playAlert();
  if ("Notification" in window && Notification.permission === "granted") {
    try {
      new Notification("FocusFlow", { body: mode === "work"
        ? "Focus session complete! Time for a break."
        : "Break finished! Ready to focus again?" });
    } catch (error) { console.info("Notification unavailable:", error); }
  }
  if (mode === "work") {
    sessions += 1;
    saveSettings();
    if (sessions % 4 === 0) {
      setMode("long", false);
      showToast("Great work! Time for a long break.");
    } else {
      setMode("short", false);
      showToast("Focus session complete! Take a short break.");
    }
  } else {
    setMode("work", false);
    showToast("Break complete. Ready for another focus session?");
  }
}
function playAlert() {
  try {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) { showToast("Session finished!"); return; }
    if (!audioContext) audioContext = new AudioContextClass();
    audioContext.resume().then(() => {
      [0, 0.25, 0.5].forEach((delay, index) => {
        const oscillator = audioContext.createOscillator();
        const gain = audioContext.createGain();
        const at = audioContext.currentTime + delay;
        oscillator.type = "sine";
        oscillator.frequency.value = index === 1 ? 880 : 660;
        gain.gain.setValueAtTime(0.0001, at);
        gain.gain.exponentialRampToValueAtTime(0.16, at + 0.03);
        gain.gain.exponentialRampToValueAtTime(0.0001, at + 0.18);
        oscillator.connect(gain); gain.connect(audioContext.destination);
        oscillator.start(at); oscillator.stop(at + 0.2);
      });
    }).catch(error => console.info("Audio playback unavailable:", error));
  } catch (error) { console.info("Audio alert unavailable:", error); }
}
function requestNotifications() {
  if ("Notification" in window && Notification.permission === "default") {
    Notification.requestPermission().catch(() => {});
  }
}

function makeTask(text) {
  const id = window.crypto?.randomUUID
    ? window.crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  return { id, text, completed: false, createdAt: new Date().toISOString() };
}
function addTask(value) {
  const text = value.trim();
  if (!text) { showToast("Please enter a task first."); return; }
  if (tasks.length >= 500) { showToast("Task limit reached. Clear some tasks first."); return; }
  tasks.unshift(makeTask(text));
  saveTasks();
  filter = "all";
  updateFilters();
  renderTasks();
  el.input.value = "";
  el.input.focus();
  showToast("Task added successfully.");
}
function toggleTask(id, completed) {
  tasks = tasks.map(task => task.id === id ? { ...task, completed } : task);
  saveTasks(); renderTasks();
}
function deleteTask(id) {
  tasks = tasks.filter(task => task.id !== id);
  saveTasks(); renderTasks(); showToast("Task deleted.");
}
function clearCompleted() {
  const count = tasks.filter(task => task.completed).length;
  if (!count) { showToast("No completed tasks to clear."); return; }
  tasks = tasks.filter(task => !task.completed);
  saveTasks(); renderTasks(); showToast("Completed tasks cleared.");
}
function updateFilters() {
  $$(".filter-btn").forEach(button => {
    const active = button.dataset.filter === filter;
    button.classList.toggle("active", active);
    button.setAttribute("aria-pressed", String(active));
  });
}
function renderTasks() {
  el.list.replaceChildren();
  const completed = tasks.filter(task => task.completed).length;
  const pending = tasks.length - completed;
  const percent = tasks.length ? Math.round(completed / tasks.length * 100) : 0;
  el.total.textContent = `${tasks.length} task${tasks.length === 1 ? "" : "s"}`;
  el.progressText.textContent = `${percent}%`;
  el.progressFill.style.width = `${percent}%`;
  el.progressFill.setAttribute("aria-valuenow", String(percent));
  el.remaining.textContent = pending ? `${pending} task${pending === 1 ? "" : "s"} remaining`
    : tasks.length ? "All tasks completed!" : "Nothing pending yet";
  const visible = tasks.filter(task => filter === "all" ||
    (filter === "active" && !task.completed) || (filter === "completed" && task.completed));

  visible.forEach(task => {
    const item = document.createElement("li");
    item.className = `task-item${task.completed ? " completed" : ""}`;
    const checkbox = document.createElement("input");
    checkbox.type = "checkbox"; checkbox.className = "task-check"; checkbox.checked = task.completed;
    checkbox.setAttribute("aria-label", `Complete task: ${task.text}`);
    checkbox.addEventListener("change", () => toggleTask(task.id, checkbox.checked));
    const label = document.createElement("span");
    label.className = "task-text"; label.textContent = task.text;
    const remove = document.createElement("button");
    remove.type = "button"; remove.className = "delete-btn"; remove.textContent = "×";
    remove.setAttribute("aria-label", `Delete task: ${task.text}`);
    remove.addEventListener("click", () => deleteTask(task.id));
    item.append(checkbox, label, remove);
    el.list.append(item);
  });

  el.empty.hidden = visible.length !== 0;
  if (tasks.length === 0) {
    el.emptyTitle.textContent = "A fresh start.";
    el.emptyMessage.textContent = "Add your first task and make today count.";
  } else if (!visible.length && filter === "active") {
    el.emptyTitle.textContent = "All caught up!";
    el.emptyMessage.textContent = "You have no pending tasks.";
  } else if (!visible.length) {
    el.emptyTitle.textContent = "Nothing here yet.";
    el.emptyMessage.textContent = "Tasks will appear here when available.";
  }
  el.clearCompleted.disabled = completed === 0;
}

function showToast(message) {
  el.toast.textContent = message;
  el.toast.classList.add("show");
  clearTimeout(toastTimeout);
  toastTimeout = setTimeout(() => el.toast.classList.remove("show"), 2600);
}

el.start.addEventListener("click", () => {
  if (running) pauseTimer();
  else { requestNotifications(); startTimer(); }
});
el.reset.addEventListener("click", resetTimer);
el.skip.addEventListener("click", skipSession);
$$(".mode-btn").forEach(button => button.addEventListener("click", () => setMode(button.dataset.mode)));
el.theme.addEventListener("click", () => {
  const next = document.body.classList.contains("dark") ? "light" : "dark";
  document.body.classList.toggle("dark", next === "dark");
  el.theme.textContent = next === "dark" ? "☀" : "☾";
  el.theme.setAttribute("aria-label", next === "dark" ? "Switch to light theme" : "Switch to dark theme");
  saveSettings();
});
el.form.addEventListener("submit", event => { event.preventDefault(); addTask(el.input.value); });
$$(".filter-btn").forEach(button => button.addEventListener("click", () => {
  filter = button.dataset.filter; updateFilters(); renderTasks();
}));
el.clearCompleted.addEventListener("click", clearCompleted);

const initialTheme = ["light", "dark"].includes(savedSettings.theme) ? savedSettings.theme : "light";
document.body.classList.toggle("dark", initialTheme === "dark");
el.theme.textContent = initialTheme === "dark" ? "☀" : "☾";
el.theme.setAttribute("aria-label", initialTheme === "dark" ? "Switch to light theme" : "Switch to dark theme");
updateDate();
updateFilters();
renderTasks();
updateTimer();
