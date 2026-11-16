# Design Document: WatToDue Chrome Extension

**Date:** 2026-11-16  
**Status:** Approved  
**Project:** WatToDue (Waterloo LEARN Dues & Grades Browser Extension)  
**Platform:** Google Chrome (Manifest V3)  

---

## 1. Intent & Context

University of Waterloo students manage multiple courses each term on Waterloo LEARN (D2L Brightspace). Deadlines for assignments (Dropbox folders) and quizzes are currently scattered across individual course pages, making it easy to miss due dates or lose track of grading feedback.

Prior work (`agent2learn`) implemented a standalone Python CLI tool that aggregated dues and grades into local vaults. However, because it ran outside the browser, it required an elaborate authentication subsystem: launching Chrome via Chrome DevTools Protocol (CDP) on a remote debugging port, monitoring user 2FA (WatIAM + Duo), and extracting cookies into local storage.

**WatToDue** replaces that complexity by running natively as a Chrome Extension (Manifest V3). Operating directly within the student's browser context with `host_permissions: ["https://learn.uwaterloo.ca/*"]`, the extension automatically inherits the user's active LEARN session cookies using standard `fetch(..., { credentials: "include" })`.

---

## 2. Goals, Non-Goals & Anti-Goals

### Goals
1. **Zero-Friction Authentication**: Query D2L Brightspace APIs seamlessly using ambient browser session cookies. If the student is not logged in, gracefully display a prompt with a direct button to open LEARN.
2. **Consolidated Dues Calendar**:
   - Monthly and Agenda (list) views aggregating all assignment (Dropbox) and quiz deadlines.
   - Color-coded badges: Blue for Assignments (Dropboxes), Amber for Quizzes.
   - Status indicators: Overdue, Due Today, Due Tomorrow, Upcoming.
   - Interactive completion tracking: Instant client-side checkbox to strike through completed tasks (persisted in `chrome.storage.local`), plus automatic completion detection when grades are published.
   - Direct deep-links to the respective Dropbox submission folder or Quiz page on LEARN.
3. **Comprehensive Grades View**:
   - Course-by-course grade breakdown displaying score numerators, denominators, weighted grades, and instructor comments/feedback.
4. **Settings & Term/Course Management**:
   - Automatic classification of Waterloo term codes (`1265` -> Spring 2026, `1261` -> Winter 2026, `1259` -> Fall 2025, `1255` -> Spring 2025, `1251` -> Winter 2025, etc.).
   - Course inspection list: displays all discovered courses grouped by term.
   - Course toggles: checkboxes enabling users to choose exactly which courses to include/exclude (e.g. selectively mute a tutorial `TUT` or test slot `TST` while keeping lecture `LEC`).
   - Manual "Sync Now" button to refresh cached data on demand, plus configurable auto-cache TTL.
5. **Dual-Mode Experience**:
   - **Popup Mode (`popup.html`)**: Compact popover (approx. 380px × 560px) accessible from the Chrome toolbar for quick daily glance.
   - **Full-Page Dashboard (`index.html`)**: Full-screen tab opened via an "Expand" button for comfortable calendar planning and detailed grade review.
   - Both modes share a unified **Navigation Rail** (Dues, Grades, Settings).
6. **Instant, Zero-Build Architecture**:
   - Pure Vanilla Modern ES Modules (`<script type="module">`), modern CSS (Flexbox/Grid, CSS custom properties), and zero compilation or bundling required. Load unpacked directly into Chrome.

### Non-Goals
1. **Course Announcements / News Feeds**: Explicitly deferred to future iterations per user request.
2. **Content / Syllabus File Downloads**: Extension focuses strictly on scheduling (Dues) and performance tracking (Grades).
3. **In-extension Assignment Submissions**: Submissions should happen on LEARN's official interface; extension provides direct deep-links.

### Anti-Goals
1. **Complex Bundler Pipelines**: No Webpack, Vite, or Babel. Code is directly readable and editable in the workspace.
2. **Aggressive API Polling / Request Spamming**: Sync runs on targeted active courses (~12–18 HTTP calls total per sync) using local caching (`chrome.storage.local`). No background request flooding.

---

## 3. Architecture & Data Model

### 3.1 Course Code & Term Taxonomy (Waterloo Specific)
Based on live LEARN payload inspection, Waterloo course offerings follow a structured naming pattern:
`{Term}-{Subject}.{CatalogNumber}.{Section}.{Campus}.{Component}`
- Example: `1265-CHEM.233.001.1.LEC`
  - Term: `1265` (1 = 2000s, 26 = 2026, 5 = Spring -> Spring 2026)
  - Subject: `CHEM`
  - Catalog Number: `233`
  - Component: `LEC` (Lecture), `LAB` (Laboratory), `TUT` (Tutorial), `TST` (Test slot)
- Filtering rules:
  - Exclude raw groups (`Group 67`, `TA Group`, etc.) and non-course administrative spaces (`SciSpace`, etc.) by checking for the 4-digit term prefix or `OrgUnit.Type.Code === "Course Offering"`.
  - Default selection: Latest academic term (e.g. `1265`).
  - By default, include `LEC` and `LAB` components; allow student to toggle `TUT` and `TST` in Settings.

### 3.2 D2L API Pipeline & Endpoints

1. **Version Discovery & Verification**:
   - `GET https://learn.uwaterloo.ca/d2l/api/versions/`
   - Extracts `lp` version (e.g. `1.45`) and `le` version (e.g. `1.74`).
   - `GET https://learn.uwaterloo.ca/d2l/api/lp/{lp}/users/whoami` -> verifies login and retrieves student name (`FirstName`, `LastName`).
2. **Course Enrollment Discovery**:
   - `GET https://learn.uwaterloo.ca/d2l/api/lp/{lp}/enrollments/myenrollments/?bookmark=...`
   - Extracts enrolled courses, parses term codes, and builds the Course Directory.
3. **Dues Extraction (Per Enabled Course in Selected Term)**:
   - **Dropbox Assignments**: `GET https://learn.uwaterloo.ca/d2l/api/le/{le}/{orgUnitId}/dropbox/folders/`
     - Extracts: `Id`, `Name`, `DueDate`, `CustomInstructions`.
     - Direct link: `https://learn.uwaterloo.ca/d2l/lms/dropbox/user/folder_submit_files.d2l?db={id}&ou={orgUnitId}`
   - **Quizzes**: `GET https://learn.uwaterloo.ca/d2l/api/le/{le}/{orgUnitId}/quizzes/`
     - Extracts: `QuizId`, `Name`, `DueDate`, `StartDate`, `EndDate`, `IsActive`.
     - Direct link: `https://learn.uwaterloo.ca/d2l/lms/quizzing/user/quiz_summary.d2l?qi={quizId}&ou={orgUnitId}`
4. **Grades Extraction (Per Enabled Course in Selected Term)**:
   - `GET https://learn.uwaterloo.ca/d2l/api/le/{le}/{orgUnitId}/grades/values/myGradeValues/`
   - Extracts: `GradeObjectName`, `PointsNumerator`, `PointsDenominator`, `WeightedNumerator`, `WeightedDenominator`, `Comments`.

### 3.3 Project File Layout

```
WatToDue/
├── manifest.json                  # Manifest V3 configuration
├── popup.html                     # Extension toolbar popup entrypoint
├── popup.js                       # Popup controller
├── index.html                     # Full-page tab dashboard entrypoint
├── index.js                       # Full-page dashboard controller
├── icons/                         # Extension icons (16x16, 48x48, 128x128 PNGs)
│   ├── icon-16.png
│   ├── icon-48.png
│   └── icon-128.png
├── src/
│   ├── api/
│   │   ├── d2l-client.js          # D2L Brightspace API wrapper (versions, whoami, enrollments, dropboxes, quizzes, grades)
│   │   └── endpoints.js           # API route builders and query formats
│   ├── services/
│   │   ├── term-parser.js         # Waterloo term code extractor & human labeler
│   │   ├── course-manager.js      # Enrolled course filtering, term grouping & enable/disable state
│   │   ├── storage-manager.js     # chrome.storage.local cache manager with TTL & manual completed items
│   │   └── sync-service.js        # Orchestrates fetching courses, dues, and grades with concurrency limits
│   ├── components/
│   │   ├── nav-rail.js            # Shared Navigation Rail controller across popup and full-tab views
│   │   ├── calendar-view.js       # Month grid & agenda due date renderer with completion checkboxes
│   │   ├── grades-view.js         # Course grade breakdown renderer with percentages & comments
│   │   └── settings-view.js       # Term selector, course toggle checkboxes, sync settings & user status
│   └── utils/
│       ├── date-utils.js          # Date formatting, relative days ("Today", "Tomorrow", "In 3 days")
│       └── dom.js                 # Safe DOM helpers and element builders
└── styles/
    ├── variables.css              # Color palette, spacing, typography tokens (supports dark/light mode)
    ├── layout.css                 # Navigation rail and dual-mode responsive layout
    ├── calendar.css               # Calendar grid & agenda cards
    ├── grades.css                 # Grade cards, badges, and progress indicators
    └── components.css             # Buttons, pills, empty states, modals/popovers
```

---

## 4. UI / UX Design Specifications

### 4.1 Navigation Rail
Vertical rail on the left (or compact bottom bar if window is narrow):
- **Logo / Brand**: WatToDue icon with tooltip.
- **Nav Buttons**:
  - 📅 **Dues**: Calendar icon + label.
  - 📊 **Grades**: Chart/Grades icon + label.
  - ⚙️ **Settings**: Gear icon + label.
- **Bottom Action**:
  - In `popup.html`: "Open in Full Tab" icon button (`chrome.tabs.create({ url: "index.html" })`).
  - In `index.html`: Quick sync button and last synced timestamp indicator.

### 4.2 View 1: Dues (Calendar & Agenda)
- **Header**:
  - Term switcher pill (e.g. `[ Spring 2026 ▼ ]`).
  - View toggle: `[ Month Grid | Agenda List ]`.
- **Month Grid View**:
  - Clean monthly calendar matrix.
  - Cells display date number and colored badges for dues (Blue for Assignments, Amber for Quizzes).
  - Hover or click on a date shows an interactive flyout listing all items due on that day.
- **Agenda View**:
  - Chronological grouped list:
    - 🔴 **Overdue** (due date past and not marked complete)
    - 🟡 **Today**
    - 🟢 **Tomorrow**
    - ⚪ **Upcoming (Next 7 Days / Rest of Term)**
    - ⚪ **Completed** (collapsed section for finished tasks)
  - Each item card shows:
    - [ ] Checkbox to mark as completed (strikes through and moves to completed section).
    - Course tag (e.g. `CHEM 233`).
    - Type badge (`Assignment` or `Quiz`).
    - Title.
    - Due Time (e.g. `11:59 PM EDT`).
    - Direct "Open in LEARN" action button.

### 4.3 View 2: Grades
- Course selector tab or card accordion.
- Top summary per course: Current estimated standing or points earned.
- Detailed table/card list of graded items:
  - Item name (e.g. `Midterm Exam`, `Lab 1`, `Assignment 1`).
  - Score (e.g. `88 / 100` or `15 / 15`).
  - Weight (e.g. `15%`).
  - Feedback/Comments (expandable badge if instructor left notes).

### 4.4 View 3: Settings & Course Inspector
- **Active Term Selection**: Choose which term is actively displayed and synced.
- **Course Visibility & Sync Toggles**:
  - Groups courses under the active term.
  - Toggle switch next to each course offering (`[x] CHEM 233 LEC`, `[x] CHEM 265 LEC`, `[ ] CHEM 233 TUT`).
  - Shows how many dues and grade items were found for each course.
- **Sync Options**:
  - "Sync Now" button with spinner.
  - Auto-sync interval selector (15 mins, 30 mins, 1 hour, manual only).
- **Session Info**: Shows logged-in user name (`yingxuan Jia`) and connection status (Connected / Needs Login).
- **About / Links**: Version info and link to LEARN.

---

## 5. Verification & Testing Plan

1. **Unpacked Extension Loading**: Load into Chrome via `chrome://extensions` Developer Mode.
2. **Authentication Check**:
   - When user is logged in to LEARN: ensure user info and courses load cleanly.
   - When user is logged out or session expired: ensure friendly login prompt appears with a link to `learn.uwaterloo.ca`.
3. **Data Accuracy**:
   - Compare returned assignment dues against actual LEARN dropbox dates.
   - Verify quiz due dates match quiz list.
   - Verify grade values match the student's official gradebook.
4. **Dual-Mode Responsiveness**:
   - Verify popup renders neatly at 380px width without horizontal overflow.
   - Verify full-page dashboard utilizes wide layout smoothly.
