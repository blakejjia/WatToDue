# WatToDue 🦅

> **Consolidated Deadlines Calendar and Gradebook Extension for University of Waterloo LEARN (D2L Brightspace).**

WatToDue brings all your assignment dropboxes, quizzes, and grade feedback into one clean, modern dashboard right inside Google Chrome.

---

## ✨ Features

- 📅 **Consolidated Dues Calendar & Agenda**:
  - Automatically pulls deadlines across all your enrolled courses.
  - Visual color-coding: **Blue** for Assignment Dropboxes, **Amber** for Quizzes.
  - Relative timing badges: `🔴 Overdue`, `🟡 Due Today`, `🟢 Due Tomorrow`, `⚪ Upcoming`.
  - Monthly calendar matrix with interactive date-flyouts.
  - Interactive completion tracking: Check off completed assignments directly in the popup or dashboard.
  - One-click deep links: Jump directly to the specific submission folder or quiz in LEARN.

- 📊 **Gradebook & Feedback Viewer**:
  - Course-by-course overview with calculated overall scores.
  - Detailed breakdown: earned scores, max points, weighted percentages, and instructor feedback/comments.

- ⚙️ **Intelligent Course & Term Management**:
  - Automatic Waterloo term code detection (`1265` -> Spring 2026, `1261` -> Winter 2026, etc.).
  - Course offering inspector: Toggle exactly which courses to display (e.g. keep Lectures and Labs, mute Tutorials or Test slots).

- 🗂️ **Dual-Mode Experience**:
  - **Quick Popup**: Click the toolbar icon to check today's and upcoming dues in a compact 380px popover.
  - **Full-Page Dashboard**: Click "⤢ Open in Full Tab" for a spacious wide-screen view of your calendar and grades.

- 🔒 **Zero-Config & Privacy-First**:
  - **100% Client-Side**: Runs locally in your browser using Chrome Manifest V3.
  - **No Passwords Stored**: Inherits your active browser login to `learn.uwaterloo.ca` seamlessly using ambient session cookies.
  - **Zero Tracking**: No remote analytics, no third-party servers, no telemetry.

---

## 🚀 Installation Guide

### Option 1: Load Unpacked in Chrome (Developer Mode)

1. Clone or download this repository:
   ```bash
   git clone git@github.com:blakejjia/WatToDue.git
   ```
2. Open Google Chrome and go to:
   ```text
   chrome://extensions
   ```
3. In the top-right corner, toggle **Developer mode** to **ON**.
4. Click the **Load unpacked** button in the top-left toolbar.
5. Select the `WatToDue` project root folder.
6. Click the extension puzzle piece icon in Chrome's toolbar and pin **WatToDue**.
7. Log in to [Waterloo LEARN](https://learn.uwaterloo.ca) in any tab, then click the extension icon to view your dues!

---

## 🛠️ Tech Stack & Architecture

- **Manifest V3** compliant.
- **Pure Modern ES Modules** (`<script type="module">`): Zero build step, zero bundling, instant reload.
- **Chrome Storage API** (`chrome.storage.local`): Instant 0ms cached loading with automatic TTL refresh.
- **Node.js Test Suite**: Built-in `node --test` unit test suite for parsers, API client, date math, and normalization.

### Running Tests

```bash
npm test
```

---

## 📄 License

MIT License. Built with 💛 for University of Waterloo students.
