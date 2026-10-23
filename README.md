# FocusFlow — Pomodoro Timer & Task Manager

A responsive, client-side productivity app built with HTML, CSS, and vanilla JavaScript. It combines Pomodoro focus sessions with a daily to-do list.

## Features

- Focus (25 min), short break (5 min), and long break (15 min) modes
- Start, pause, reset, and skip controls
- Circular countdown ring with mode-specific styling
- Audio alert when a session ends; optional browser notifications
- Automatic long break after every fourth completed focus session
- Add, complete, delete, filter, and clear completed tasks
- Task completion progress indicator
- Local Storage persistence for tasks, theme, selected mode, and session count
- Light/dark theme toggle
- Responsive layout and reduced-motion support
- No framework, build step, or backend required

## Run locally

1. Download or clone this repository.
2. Open `index.html` in a modern browser, or use VS Code's Live Server extension.
3. Allow notifications if you want browser notifications. Audio is generated in-browser.

## Deploy on GitHub Pages

1. Create a new repository on GitHub (for example, `pomodoro-task-manager`).
2. Upload `index.html`, `style.css`, `script.js`, and `README.md` to the repository root.
3. Open **Settings → Pages**.
4. Under **Build and deployment**, choose **Deploy from a branch**.
5. Choose branch `main` and folder `/ (root)`, then save.
6. Wait for GitHub Pages to publish. The URL is usually `https://YOUR-USERNAME.github.io/pomodoro-task-manager/`.

## Storage notes

Tasks and preferences are stored in this browser's Local Storage. They do not automatically sync between browsers or devices. Clearing browser data removes saved tasks and preferences.

## Project structure

```text
pomodoro-task-manager/
├── index.html
├── style.css
├── script.js
└── README.md
```

## Technologies

HTML5 · CSS3 · JavaScript (ES2022+) · DOM API · `setInterval()` · Web Storage API · Web Audio API · Notifications API
