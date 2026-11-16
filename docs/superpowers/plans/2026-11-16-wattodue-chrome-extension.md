# WatToDue Chrome Extension Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a zero-build Manifest V3 Chrome Extension ("WatToDue") that provides University of Waterloo students with a unified Dues calendar, course grades breakdown, and course settings via an ambient-authenticated D2L Brightspace client.

**Architecture:** Pure Vanilla Modern ES Modules (`<script type="module">`) with no bundler. A modular service and component layer (`src/api`, `src/services`, `src/components`) powers dual-mode presentation: a compact toolbar popup (`popup.html`) and an expansive dashboard (`index.html`), sharing a unified Navigation Rail and responsive CSS.

**Tech Stack:** JavaScript (ES2022+ Native Modules), HTML5, Modern CSS (Variables, Flexbox, Grid), Chrome Extension APIs (Manifest V3, `chrome.storage.local`, `chrome.tabs`), Node.js built-in test runner (`node:test`, `node:assert`) for pure logic unit testing.

**Spec:** `docs/superpowers/specs/2026-11-16-wattodue-chrome-extension-design.md`

## Global Constraints

- Manifest Version: 3 (No `eval`, no inline scripts, no remote CDN scripts).
- Zero build tools required: can be loaded directly from workspace directory via Chrome `Load unpacked`.
- Platform: Google Chrome on Windows/macOS/Linux.
- Waterloo Term Code Formula: Year = 1900 + code // 10, Season = `{1: "Winter", 5: "Spring", 9: "Fall"}[code % 10]`.
- Network host permissions restricted to `https://learn.uwaterloo.ca/*`.

## Review Focus

1. **Unauthenticated / Expired Session**: When LEARN cookies expire or user is logged out, requests return 401/403 or redirect to an HTML login page. The extension must detect this, not crash on JSON parse, and show a clear "Sign in to LEARN" prompt.
2. **Missing or Null Due Dates**: Some dropbox folders or quizzes have no `DueDate` (open-ended). The calendar and agenda must not crash on null/invalid date values and should categorize them cleanly or omit them from the date grid.
3. **Course Offering Code Parsing Variations**: Edge cases in Waterloo offering names (e.g. non-standard sections, courses without tutorials, multi-campus codes) must not break the course directory or drop valid courses.
4. **Local Task Completion Persistence**: Checking off an item in the popup must immediately update local storage so it reflects in the full tab and persists across browser restarts.
5. **Popup Viewport Overflow**: The popup must have fixed bounds (max 380px × 600px) with internal scrolling and zero horizontal scrollbar under all display scaling settings.

---

### Task 1: Project Scaffolding, Manifest V3 & Icon Generation

**Files:**
- Create: `manifest.json`
- Create: `icons/generate-icons.js` (generates real PNG icons using pure Node / canvas or PNG binary)
- Create: `icons/icon-16.png`, `icons/icon-48.png`, `icons/icon-128.png`
- Create: `package.json` (for `npm test` script with `node --test`)
- Test: `tests/manifest.test.js`

**Interfaces:**
- Produces: Valid Chrome extension manifest file and PNG icon assets required by Chrome loader.

- [ ] **Step 1: Write manifest validation test**

Create `tests/manifest.test.js`:
```javascript
import { test } from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';

test('manifest.json has required MV3 fields and permissions', () => {
  const manifest = JSON.parse(fs.readFileSync('manifest.json', 'utf8'));
  assert.strictEqual(manifest.manifest_version, 3);
  assert.strictEqual(manifest.name, 'WatToDue - Waterloo LEARN Dues & Grades');
  assert.ok(manifest.permissions.includes('storage'));
  assert.ok(manifest.host_permissions.includes('https://learn.uwaterloo.ca/*'));
  assert.strictEqual(manifest.action.default_popup, 'popup.html');
  assert.ok(fs.existsSync(manifest.icons['16']));
  assert.ok(fs.existsSync(manifest.icons['48']));
  assert.ok(fs.existsSync(manifest.icons['128']));
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test tests/manifest.test.js`
Expected: FAIL (file not found)

- [ ] **Step 3: Create package.json and icon generator script**

Create `package.json` with `"type": "module"`, `"scripts": { "test": "node --test tests/**/*.test.js" }`.
Create `icons/generate-icons.js` that outputs valid 16x16, 48x48, and 128x128 PNG files. Run it to generate `icon-16.png`, `icon-48.png`, `icon-128.png`.

- [ ] **Step 4: Create `manifest.json`**

Write standard MV3 manifest specifying `popup.html`, permissions `["storage"]`, `host_permissions: ["https://learn.uwaterloo.ca/*"]`, and icon mappings.

- [ ] **Step 5: Run test to verify it passes**

Run: `node --test tests/manifest.test.js`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add manifest.json package.json icons/ tests/manifest.test.js
git commit -m "feat: scaffold MV3 extension manifest and icons"
```

---

### Task 2: Waterloo Term Code & Course Offering Parsers

**Files:**
- Create: `src/services/term-parser.js`
- Create: `src/services/course-manager.js`
- Test: `tests/term-parser.test.js`
- Test: `tests/course-manager.test.js`

**Interfaces:**
- Produces:
  - `parseTermCode(code: string): { termCode: string, season: string, year: number, label: string } | null`
  - `extractTermFromOffering(offeringCode: string): string | null`
  - `parseCourseOffering(rawItem: object): CourseOffering | null`
  - `groupCoursesByTerm(courses: CourseOffering[]): Map<string, CourseOffering[]>`

- [ ] **Step 1: Write failing tests for term parser**

Create `tests/term-parser.test.js`:
```javascript
import { test } from 'node:test';
import assert from 'node:assert';
import { parseTermCode, extractTermFromOffering } from '../src/services/term-parser.js';

test('parseTermCode correctly translates Waterloo 4-digit codes', () => {
  assert.deepStrictEqual(parseTermCode('1251'), { termCode: '1251', season: 'Winter', year: 2025, label: 'Winter 2025' });
  assert.deepStrictEqual(parseTermCode('1255'), { termCode: '1255', season: 'Spring', year: 2025, label: 'Spring 2025' });
  assert.deepStrictEqual(parseTermCode('1259'), { termCode: '1259', season: 'Fall', year: 2025, label: 'Fall 2025' });
  assert.deepStrictEqual(parseTermCode('1261'), { termCode: '1261', season: 'Winter', year: 2026, label: 'Winter 2026' });
  assert.deepStrictEqual(parseTermCode('1265'), { termCode: '1265', season: 'Spring', year: 2026, label: 'Spring 2026' });
  assert.strictEqual(parseTermCode('invalid'), null);
});

test('extractTermFromOffering finds last 4-digit Waterloo term', () => {
  assert.strictEqual(extractTermFromOffering('1265-CHEM.233.001.1.LEC'), '1265');
  assert.strictEqual(extractTermFromOffering('1241-SCBUS.122.002.1.LEC'), '1241');
  assert.strictEqual(extractTermFromOffering('SciSpace'), null);
  assert.strictEqual(extractTermFromOffering('Group 67'), null);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test tests/term-parser.test.js`
Expected: FAIL

- [ ] **Step 3: Implement `src/services/term-parser.js`**

Implement `parseTermCode` and `extractTermFromOffering` using Waterloo's 1000-1999 year logic (`year = 1900 + Math.floor(code / 10)`, season map: `1: Winter`, `5: Spring`, `9: Fall`).

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test tests/term-parser.test.js`
Expected: PASS

- [ ] **Step 5: Write failing tests for course manager**

Create `tests/course-manager.test.js`:
```javascript
import { test } from 'node:test';
import assert from 'node:assert';
import { parseCourseOffering, groupCoursesByTerm } from '../src/services/course-manager.js';

test('parseCourseOffering parses course details and components', () => {
  const item = {
    OrgUnit: { Id: 1265323, Name: '1265-CHEM.233.001.1.LEC', Code: '1265-CHEM.233.001.1.LEC', Type: { Code: 'Course Offering' } },
    Access: { IsActive: true }
  };
  const course = parseCourseOffering(item);
  assert.ok(course);
  assert.strictEqual(course.id, 1265323);
  assert.strictEqual(course.termCode, '1265');
  assert.strictEqual(course.subject, 'CHEM');
  assert.strictEqual(course.catalogNumber, '233');
  assert.strictEqual(course.component, 'LEC');
  assert.strictEqual(course.displayName, 'CHEM 233 (LEC)');
  assert.strictEqual(course.defaultEnabled, true);
});

test('parseCourseOffering rejects non-course offerings', () => {
  assert.strictEqual(parseCourseOffering({ OrgUnit: { Id: 946201, Name: 'Group 67' } }), null);
  assert.strictEqual(parseCourseOffering({ OrgUnit: { Id: 154950, Name: 'SciSpace', Type: { Code: 'Department' } } }), null);
});
```

- [ ] **Step 6: Implement `src/services/course-manager.js`**

Implement `parseCourseOffering` (regex on `{Term}-{Subject}.{CatalogNumber}.{Section}.{Campus}.{Component}`, extracting component, subject, catalog number, marking `LEC`/`LAB` enabled by default and `TUT`/`TST` disabled by default) and `groupCoursesByTerm`.

- [ ] **Step 7: Run tests to verify they pass**

Run: `node --test tests/course-manager.test.js`
Expected: PASS

- [ ] **Step 8: Commit**

```bash
git add src/services/ tests/
git commit -m "feat: implement Waterloo term and course offering parsers"
```

---

### Task 3: D2L Brightspace API Client

**Files:**
- Create: `src/api/endpoints.js`
- Create: `src/api/d2l-client.js`
- Test: `tests/d2l-client.test.js`

**Interfaces:**
- Consumes: `https://learn.uwaterloo.ca`
- Produces:
  - `class D2LClient(fetchFn = fetch)`
  - `client.getVersions(): Promise<{ lp: string, le: string }>`
  - `client.getWhoAmI(lpVersion: string): Promise<{ identifier: string, firstName: string, lastName: string }>`
  - `client.getEnrollments(lpVersion: string): Promise<CourseOffering[]>`
  - `client.getDropboxes(leVersion: string, orgUnitId: number): Promise<DropboxItem[]>`
  - `client.getQuizzes(leVersion: string, orgUnitId: number): Promise<QuizItem[]>`
  - `client.getGrades(leVersion: string, orgUnitId: number): Promise<GradeItem[]>`

- [ ] **Step 1: Write failing tests for D2L client**

Create `tests/d2l-client.test.js`:
```javascript
import { test } from 'node:test';
import assert from 'node:assert';
import { D2LClient } from '../src/api/d2l-client.js';

test('D2LClient negotiates lp and le versions correctly', async () => {
  const mockFetch = async (url) => {
    if (url.endsWith('/d2l/api/versions/')) {
      return {
        ok: true,
        json: async () => [
          { ProductCode: 'lp', LatestVersion: '1.45' },
          { ProductCode: 'le', LatestVersion: '1.74' }
        ]
      };
    }
  };
  const client = new D2LClient(mockFetch);
  const versions = await client.getVersions();
  assert.deepStrictEqual(versions, { lp: '1.45', le: '1.74' });
});

test('D2LClient throws SessionExpiredError on HTML login redirect', async () => {
  const mockFetch = async () => ({
    ok: true,
    headers: { get: () => 'text/html' },
    text: async () => '<html><title>Log In</title></html>'
  });
  const client = new D2LClient(mockFetch);
  await assert.rejects(async () => client.getWhoAmI('1.45'), /session expired|login/i);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test tests/d2l-client.test.js`
Expected: FAIL

- [ ] **Step 3: Implement `src/api/endpoints.js` and `src/api/d2l-client.js`**

Implement endpoint helpers and `D2LClient` with `credentials: "include"`, HTML login page detection (`_isLoginResponse`), pagination handling for `myenrollments/`, and methods for `getVersions`, `getWhoAmI`, `getEnrollments`, `getDropboxes`, `getQuizzes`, and `getGrades`.

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test tests/d2l-client.test.js`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/api/ tests/d2l-client.test.js
git commit -m "feat: implement D2L Brightspace API client"
```

---

### Task 4: Storage Manager & Sync Service

**Files:**
- Create: `src/services/storage-manager.js`
- Create: `src/services/sync-service.js`
- Test: `tests/sync-service.test.js`

**Interfaces:**
- Consumes: `src/api/d2l-client.js`, `src/services/course-manager.js`
- Produces:
  - `storageManager`: `get(key)`, `set(key, val)`, `getSettings()`, `toggleCompleted(dueId)`
  - `syncService`: `sync(options?: { force?: boolean }): Promise<SyncResult>`
  - `normalizeDues(courses, dropboxesMap, quizzesMap, completedSet)`: returns unified `DueItem[]`

- [ ] **Step 1: Write failing tests for sync & normalization**

Create `tests/sync-service.test.js`:
```javascript
import { test } from 'node:test';
import assert from 'node:assert';
import { normalizeDues } from '../src/services/sync-service.js';

test('normalizeDues combines assignments and quizzes and marks status', () => {
  const course = { id: 100, displayName: 'CHEM 233', termCode: '1265' };
  const dropboxes = [
    { Id: 1, Name: 'Assignment 1', DueDate: '2026-03-20T23:59:00.000Z' }
  ];
  const quizzes = [
    { QuizId: 2, Name: 'Quiz 1', DueDate: '2026-03-22T23:59:00.000Z' }
  ];
  const completedIds = new Set(['dropbox-1']);

  const dues = normalizeDues([course], { 100: dropboxes }, { 100: quizzes }, completedIds);
  assert.strictEqual(dues.length, 2);
  const a1 = dues.find(d => d.id === 'dropbox-1');
  assert.strictEqual(a1.type, 'assignment');
  assert.strictEqual(a1.completed, true);
  const q1 = dues.find(d => d.id === 'quiz-2');
  assert.strictEqual(q1.type, 'quiz');
  assert.strictEqual(q1.completed, false);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test tests/sync-service.test.js`
Expected: FAIL

- [ ] **Step 3: Implement `src/services/storage-manager.js`**

Implement thin wrapper over `chrome.storage.local` with in-memory fallback for unit testing, storing `user`, `terms`, `selectedTerm`, `courses`, `dues`, `grades`, `completedDueIds`, `lastSync`.

- [ ] **Step 4: Implement `src/services/sync-service.js`**

Implement `syncService` with concurrency throttle (fetching enabled courses for the active term), compiling Dues and Grades, updating local storage, and returning sync statistics.

- [ ] **Step 5: Run test to verify it passes**

Run: `node --test tests/sync-service.test.js`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add src/services/storage-manager.js src/services/sync-service.js tests/sync-service.test.js
git commit -m "feat: implement storage manager and dues synchronization service"
```

---

### Task 5: Design Tokens, Modern CSS & Navigation Rail Component

**Files:**
- Create: `styles/variables.css`
- Create: `styles/layout.css`
- Create: `styles/components.css`
- Create: `src/components/nav-rail.js`
- Create: `src/utils/dom.js`

**Interfaces:**
- Produces:
  - Design tokens (UWaterloo Gold `#FDD54F` / Charcoal `#1E1E1E` accents, modern card styles, light/dark responsive)
  - Layout: Navigation Rail (left vertical bar) + main view container
  - `NavRail` component: manages active tab state (`dues`, `grades`, `settings`) and dispatches tab switch events

- [ ] **Step 1: Create design tokens and layout stylesheets**

Create `styles/variables.css` defining CSS custom properties for fonts, colors (Waterloo gold accent, semantic badges for assignment/quiz/overdue), surface backgrounds, borders, and shadows.
Create `styles/layout.css` for the Navigation Rail and view switcher.
Create `styles/components.css` for buttons, pills, cards, loading spinners, and empty states.

- [ ] **Step 2: Implement `src/utils/dom.js`**

Safe DOM helper functions (`el(tag, attrs, ...children)`, `clear(node)`).

- [ ] **Step 3: Implement `src/components/nav-rail.js`**

Navigation Rail controller supporting tabs: `dues`, `grades`, `settings`, plus the bottom "Open in Full Tab" action button for popup mode.

- [ ] **Step 4: Commit**

```bash
git add styles/ src/components/nav-rail.js src/utils/dom.js
git commit -m "feat: add design tokens, layout styles, and navigation rail component"
```

---

### Task 6: Dues View (Calendar Grid & Agenda List)

**Files:**
- Create: `styles/calendar.css`
- Create: `src/utils/date-utils.js`
- Create: `src/components/calendar-view.js`
- Test: `tests/date-utils.test.js`

**Interfaces:**
- Consumes: `DueItem[]`, `storageManager`
- Produces:
  - `CalendarView(container)`: renders month matrix and agenda list with live completion toggles and deep-links to LEARN.

- [ ] **Step 1: Write date utilities unit tests**

Create `tests/date-utils.test.js`:
```javascript
import { test } from 'node:test';
import assert from 'node:assert';
import { formatDueRelative, getMonthMatrix } from '../src/utils/date-utils.js';

test('formatDueRelative handles today, tomorrow, and past dates', () => {
  const now = new Date('2026-03-20T12:00:00Z');
  const todayDue = new Date('2026-03-20T23:59:00Z');
  const tomorrowDue = new Date('2026-03-21T23:59:00Z');
  const pastDue = new Date('2026-03-18T23:59:00Z');

  assert.strictEqual(formatDueRelative(todayDue, now).status, 'today');
  assert.strictEqual(formatDueRelative(tomorrowDue, now).status, 'tomorrow');
  assert.strictEqual(formatDueRelative(pastDue, now).status, 'overdue');
});

test('getMonthMatrix returns 35 or 42 grid cells for month', () => {
  const cells = getMonthMatrix(2026, 2); // March 2026
  assert.ok(cells.length === 35 || cells.length === 42);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test tests/date-utils.test.js`
Expected: FAIL

- [ ] **Step 3: Implement `src/utils/date-utils.js`**

Implement calendar matrix generator, date formatting, and relative deadline calculation (`overdue`, `today`, `tomorrow`, `upcoming`).

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test tests/date-utils.test.js`
Expected: PASS

- [ ] **Step 5: Implement `styles/calendar.css` and `src/components/calendar-view.js`**

Build:
- View mode switcher: `[ Month Calendar | Agenda List ]`
- Month Calendar Grid: displays day numbers, colored dots/chips for assignments (blue) and quizzes (amber), and day popup flyout on click.
- Agenda List: categorized sections (Overdue, Today, Tomorrow, Upcoming, Completed).
- Interactive checkbox: toggling updates `completedDueIds` in `storageManager` instantly.
- "Open in LEARN" action button linking directly to submission folder or quiz summary.

- [ ] **Step 6: Commit**

```bash
git add styles/calendar.css src/utils/date-utils.js src/components/calendar-view.js tests/date-utils.test.js
git commit -m "feat: implement Dues calendar grid and agenda views"
```

---

### Task 7: Grades View

**Files:**
- Create: `styles/grades.css`
- Create: `src/components/grades-view.js`

**Interfaces:**
- Consumes: `gradesMap` from `storageManager`
- Produces:
  - `GradesView(container)`: displays course grade cards, score ratios (`numerator / denominator`), weighted percentages, and expandable teacher comments.

- [ ] **Step 1: Implement `styles/grades.css`**

Create styles for grade cards, score progress bars, weighted percent badges, and comment callout boxes.

- [ ] **Step 2: Implement `src/components/grades-view.js`**

Render:
- Course selector / accordion tabs.
- Course grade summary banner (estimated standing or points total).
- Graded item breakdown: Item name, Score, Denominator, Percentage, Weight, and comments badge if feedback was provided.
- Empty state: "No grades published yet for this course."

- [ ] **Step 3: Commit**

```bash
git add styles/grades.css src/components/grades-view.js
git commit -m "feat: implement course grades and feedback view"
```

---

### Task 8: Settings View & Course Inspector

**Files:**
- Create: `src/components/settings-view.js`

**Interfaces:**
- Consumes: `storageManager`, `syncService`
- Produces:
  - `SettingsView(container)`: allows selecting active term, toggles course visibility/sync, triggers "Sync Now", and displays login status.

- [ ] **Step 1: Implement `src/components/settings-view.js`**

Render:
- **Account & Status**: Displays student name (`yingxuan Jia`) and session connectivity badge. If session expired, show "Open LEARN to Log In" button.
- **Term Selector**: Dropdown showing available Waterloo terms (`Spring 2026`, `Winter 2026`, `Winter 2025`, etc.). Changing term updates selected term and refreshes view.
- **Course Inspector & Toggles**: Displays all discovered courses for the selected term. Checkbox next to each course offering (`[x] CHEM 233 LEC`, `[x] CHEM 265 LEC`, `[ ] CHEM 233 TUT`) allowing users to mute or unmute specific course sections.
- **Sync Controls**: "Sync Now" button with spinner + last synced relative time display ("Synced 5 mins ago").
- **Links & Version**: Extension version and direct link to Waterloo LEARN.

- [ ] **Step 2: Commit**

```bash
git add src/components/settings-view.js
git commit -m "feat: implement settings view and course inspector"
```

---

### Task 9: Popup (`popup.html`) & Full-Page Dashboard (`index.html`) Integration

**Files:**
- Create: `popup.html`
- Create: `popup.js`
- Create: `index.html`
- Create: `index.js`

**Interfaces:**
- Wires all components together into the dual-mode entrypoints.

- [ ] **Step 1: Implement `popup.html` & `popup.js`**

Compact container (380px wide × 580px high). Mounts `NavRail`, `CalendarView`, `GradesView`, and `SettingsView`. Includes "Open in Full Tab" button calling `chrome.tabs.create({ url: chrome.runtime.getURL('index.html') })`. Performs lazy sync check on open.

- [ ] **Step 2: Implement `index.html` & `index.js`**

Full-page dashboard utilizing wide desktop layout. Mounts the exact same modular views with spacious presentation.

- [ ] **Step 3: Run all unit tests**

Run: `npm test`
Expected: All tests pass.

- [ ] **Step 4: Commit**

```bash
git add popup.html popup.js index.html index.js
git commit -m "feat: wire popup and full-page dashboard entrypoints"
```

---

### Task 10: Manual End-to-End Verification & Documentation

**Files:**
- Create: `README.md`
- Test: Verification in Chrome via Developer Mode (`chrome://extensions`)

- [ ] **Step 1: Write `README.md` with installation and feature guide**

Create clear documentation on how to load unpacked in Chrome, how authentication works, and available features.

- [ ] **Step 2: Run verification checks**

Run full test suite: `npm test`.
Verify file layout, manifest syntax, and module imports.

- [ ] **Step 3: Commit**

```bash
git add README.md
git commit -m "docs: add comprehensive readme and installation instructions"
```

---

### Task 11: Showcase Landing Website & Installation Guide

**Files:**
- Create: `website/index.html`
- Create: `website/styles.css`
- Create: `website/app.js`

**Interfaces:**
- Produces: Standalone static showcase website (compatible with GitHub Pages) presenting WatToDue, feature preview mockups, Waterloo LEARN privacy guarantee, and interactive step-by-step Chrome installation guide.

- [ ] **Step 1: Build `website/index.html` and `website/styles.css`**

Create clean, modern product landing page with:
- Hero banner with Waterloo gold & charcoal branding, tagline, and "Get Extension / Load Unpacked" CTA.
- Visual feature showcase: Dues Calendar, Gradebook Viewer, Course Filter & Privacy.
- Interactive installation steps: Download/Clone repo -> Open `chrome://extensions` -> Toggle Developer Mode -> Click "Load Unpacked" -> Pin extension.
- FAQ on privacy & data security (zero tracking, ambient local cookies, 100% open source).

- [ ] **Step 2: Commit**

```bash
git add website/
git commit -m "feat: add showcase landing page and installation guide website"
```

- [ ] **Step 3: Push commits to remote origin**

```bash
git push -u origin main
```

