# Chrome Web Store Listing — WatToDue - Waterloo LEARN Dues & Grades

> Last Updated: 2026-11-16

## Store Listing

**Extension Name** [REQUIRED]
WatToDue - Waterloo LEARN Dues & Grades

**Short Description** [REQUIRED]
Consolidated calendar for assignments, quizzes, and grades on Waterloo LEARN.

**Detailed Description** [REQUIRED]
Never miss an assignment, quiz, or lab deadline again with WatToDue!

WatToDue automatically syncs your academic deadlines and grade items directly from University of Waterloo LEARN (Brightspace) into a clean, unified dashboard and popup.

KEY FEATURES
- Unified Timeline: See upcoming and overdue deadlines grouped chronologically by day.
- Calendar & Agenda Views: View deadlines in a full-month interactive calendar or an agenda schedule with side-by-side cards.
- True Grade Standing: View course grade items organized into their official Waterloo LEARN categories (Quizzes, Assignments, Midterms).
- Smart Completion Tracking: Completed dropboxes and attempted quizzes are automatically detected and marked as done.
- Component Recognition: Distinguishes Lectures (LEC), Laboratories (LAB), Tutorials (TUT), and Tests (TST).
- Fast Quick Popup: Access pending tasks right from your Chrome toolbar without loading the full page.
- 100% Private & Local: All data stays directly in your browser. No third-party servers, no accounts, and no data tracking.

HOW TO USE
1. Log in to your Waterloo LEARN account as usual at learn.uwaterloo.ca.
2. Click the WatToDue extension icon in your Chrome toolbar.
3. Your active courses, assignments, quizzes, and grades will sync instantly.
4. Click "+ Dashboard" to explore the full calendar and grade breakdowns.

PRIVACY & PERMISSIONS
WatToDue communicates only with official Waterloo LEARN servers (https://learn.uwaterloo.ca) to retrieve your courses and dues. Your credentials and student data never leave your computer.

SUPPORT & SOURCE
WatToDue is open source and built specifically for University of Waterloo students.

**Category** [REQUIRED]
Productivity

**Single Purpose** [REQUIRED]
Aggregates and organizes assignments, quizzes, and grades from Waterloo LEARN into a unified student schedule and dashboard.

**Primary Language** [REQUIRED]
English

---

## Graphics & Assets

| Asset | Dimensions | Status | Filename |
|-------|-----------|--------|----------|
| Store Icon [REQUIRED] | 128×128 PNG | ✅ Ready | `icons/icon-128.png` |
| Small Icon | 16×16 PNG | ✅ Ready | `icons/icon-16.png` |
| Medium Icon | 48×48 PNG | ✅ Ready | `icons/icon-48.png` |
| Screenshot 1 [REQUIRED] | 1280×800 | 🟡 Can capture from Dashboard | |
| Screenshot 2 [RECOMMENDED] | 1280×800 | 🟡 Can capture from Calendar View | |
| Screenshot 3 [RECOMMENDED] | 1280×800 | 🟡 Can capture from Grades Breakdown | |
| Small Promo Tile [RECOMMENDED] | 440×280 | ⬜ Optional | |

---

## Permissions Justification

| Permission | Type | Justification |
|------------|------|---------------|
| `storage` | permissions | Stores cached course enrollments, due dates, user completion checkmarks, and grade items locally on the student's device for instant offline access. |
| `https://learn.uwaterloo.ca/*` | host_permissions | Communicates with the official University of Waterloo LEARN portal to fetch the authenticated student's courses, Dropbox deadlines, quizzes, and grades. |

---

## Privacy & Data Use

### Data Collection
- **Personal Information**: None collected by external servers. Student name and ID are read from Waterloo LEARN session and stored only in browser `chrome.storage.local`.
- **Health / Financial / Location Data**: None collected.
- **Web History**: None collected. WatToDue only accesses `https://learn.uwaterloo.ca/*`.

### Data Transmission & Security
- **Off-device Transmission**: NONE. WatToDue does not communicate with any external backend or analytics service. All requests are sent directly between the user's browser and `https://learn.uwaterloo.ca`.
- **Third-party Sharing**: No user data is shared, sold, or transferred to third parties.

---

## Version History

### 1.0.0 — 2026-11-16
- Initial production release.
- Real-time synchronization of D2L Brightspace dropboxes, quizzes, and grade tables.
- Interactive monthly calendar with multi-card day flyouts.
- Automatic completion matching for submitted dropboxes and attempted quizzes.
- Categorized grade view matching Waterloo LEARN structure with accurate standing calculation.
- Quick toolbar popup with overdue indicators and one-click toggle.
