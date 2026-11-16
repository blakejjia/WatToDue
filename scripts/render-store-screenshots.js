import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';

const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const outputDir = path.resolve('store_assets');
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

// -------------------------------------------------------------
// 1. Store Icon (128 x 128) & High-Res (512 x 512)
// -------------------------------------------------------------
const iconHtml = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { width: 128px; height: 128px; overflow: hidden; background: transparent; display: flex; align-items: center; justify-content: center; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; }
    .squircle {
      width: 120px;
      height: 120px;
      border-radius: 28px;
      background: linear-gradient(145deg, #FFE066 0%, #F59E0B 75%, #D97706 100%);
      box-shadow: 0 8px 20px rgba(245, 158, 11, 0.4);
      display: flex;
      align-items: center;
      justify-content: center;
      position: relative;
      border: 2px solid rgba(255, 255, 255, 0.5);
    }
    .w {
      font-size: 78px;
      font-weight: 900;
      color: #11141B;
      letter-spacing: -4px;
      margin-left: -3px;
      margin-top: -4px;
      user-select: none;
    }
    .badge {
      position: absolute;
      bottom: 6px;
      right: 6px;
      width: 36px;
      height: 36px;
      border-radius: 11px;
      background: #11141B;
      border: 2px solid #FFFFFF;
      box-shadow: 0 4px 10px rgba(0, 0, 0, 0.35);
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .check {
      width: 20px;
      height: 20px;
      stroke: #FDD54F;
      stroke-width: 4;
      fill: none;
      stroke-linecap: round;
      stroke-linejoin: round;
    }
  </style>
</head>
<body>
  <div class="squircle">
    <span class="w">W</span>
    <div class="badge">
      <svg class="check" viewBox="0 0 24 24">
        <polyline points="20 6 9 17 4 12"></polyline>
      </svg>
    </div>
  </div>
</body>
</html>`;

fs.writeFileSync(path.join(outputDir, 'icon_temp.html'), iconHtml, 'utf8');
console.log('Rendering Store Icon (128x128)...');
execSync(`"${chromePath}" --headless --disable-gpu --force-device-scale-factor=1 --window-size=128,128 --screenshot="${path.join(outputDir, 'icon-128.png')}" "file:///${path.join(outputDir, 'icon_temp.html').replace(/\\\\/g, '/')}"`);
fs.unlinkSync(path.join(outputDir, 'icon_temp.html'));

// Also copy to icons/icon-128.png
fs.copyFileSync(path.join(outputDir, 'icon-128.png'), path.resolve('icons/icon-128.png'));

// -------------------------------------------------------------
// 2. Screenshot 1: 1,280 x 800 - Agenda Timeline & Dues
// -------------------------------------------------------------
const screenshot1Html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <script src="https://unpkg.com/lucide@latest"></script>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      width: 1280px;
      height: 800px;
      overflow: hidden;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      background: #0F1117;
      color: #F3F4F6;
      display: flex;
    }

    /* Rail */
    .rail {
      width: 64px;
      background: #111319;
      border-right: 1px solid #1F2433;
      display: flex;
      flex-direction: column;
      align-items: center;
      padding: 18px 0;
      gap: 20px;
    }
    .rail-brand {
      width: 38px;
      height: 38px;
      border-radius: 12px;
      background: linear-gradient(145deg, #FFE066, #F59E0B);
      color: #111;
      font-weight: 900;
      font-size: 22px;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 4px 12px rgba(245, 158, 11, 0.4);
    }
    .rail-item {
      width: 48px;
      height: 48px;
      border-radius: 12px;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 3px;
      color: #94A3B8;
      font-size: 10px;
      font-weight: 700;
      cursor: pointer;
    }
    .rail-item.active {
      background: #FDD54F;
      color: #111;
      box-shadow: 0 4px 12px rgba(253, 213, 79, 0.35);
    }

    /* Main Container */
    .main {
      flex: 1;
      display: flex;
      flex-direction: column;
      height: 100%;
    }

    /* Header */
    .header {
      height: 64px;
      border-bottom: 1px solid #1F2433;
      padding: 0 28px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      background: #141722;
    }
    .header-left {
      display: flex;
      align-items: center;
      gap: 14px;
    }
    .header-title {
      font-size: 20px;
      font-weight: 900;
      color: #FFF;
      letter-spacing: -0.3px;
    }
    .header-badge {
      font-size: 11px;
      font-weight: 800;
      padding: 3px 10px;
      border-radius: 9999px;
      background: rgba(253, 213, 79, 0.15);
      color: #FDD54F;
      border: 1px solid rgba(253, 213, 79, 0.3);
    }
    .header-right {
      display: flex;
      align-items: center;
      gap: 12px;
    }
    .term-badge {
      font-size: 12px;
      font-weight: 700;
      padding: 6px 14px;
      border-radius: 10px;
      background: #1C2230;
      border: 1px solid #283144;
      color: #CBD5E1;
    }
    .sync-btn {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 12px;
      font-weight: 800;
      background: #FDD54F;
      color: #111;
      border: none;
      padding: 7px 16px;
      border-radius: 10px;
      box-shadow: 0 2px 8px rgba(253, 213, 79, 0.3);
    }

    /* Content Area */
    .content {
      flex: 1;
      padding: 24px 36px;
      overflow-y: hidden;
      display: flex;
      gap: 28px;
    }

    /* Timeline list */
    .timeline-col {
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 20px;
    }

    .date-heading {
      display: flex;
      align-items: baseline;
      gap: 10px;
      margin-bottom: 8px;
    }
    .date-bold {
      font-size: 18px;
      font-weight: 900;
      color: #FFF;
    }
    .date-sub {
      font-size: 13px;
      font-weight: 600;
      color: #94A3B8;
    }

    /* Cards */
    .task-card {
      background: #181C26;
      border: 1px solid #262D3D;
      border-radius: 14px;
      padding: 16px 20px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 18px;
      margin-bottom: 12px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.25);
    }
    .task-card.submitted {
      opacity: 0.75;
      background: #151821;
    }
    .task-left {
      display: flex;
      align-items: center;
      gap: 16px;
    }
    .chk-box {
      width: 22px;
      height: 22px;
      border-radius: 6px;
      border: 2px solid #4B5563;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .chk-box.checked {
      background: #10B981;
      border-color: #10B981;
    }
    .task-meta {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 4px;
    }
    .course-pill {
      font-size: 11px;
      font-weight: 800;
      padding: 2px 8px;
      border-radius: 6px;
    }
    .cs-pill { background: rgba(59, 130, 246, 0.2); color: #93C5FD; border: 1px solid rgba(59, 130, 246, 0.35); }
    .chem-pill { background: rgba(16, 185, 129, 0.2); color: #6EE7B7; border: 1px solid rgba(16, 185, 129, 0.35); }
    .math-pill { background: rgba(168, 85, 247, 0.2); color: #D8B4FE; border: 1px solid rgba(168, 85, 247, 0.35); }
    
    .badge-lec { font-size: 10px; font-weight: 800; padding: 2px 6px; border-radius: 4px; background: rgba(59, 130, 246, 0.15); color: #60A5FA; }
    .badge-lab { font-size: 10px; font-weight: 800; padding: 2px 6px; border-radius: 4px; background: rgba(16, 185, 129, 0.2); color: #34D399; }
    
    .due-time { font-size: 12px; font-weight: 600; color: #94A3B8; }
    .task-title { font-size: 15px; font-weight: 800; color: #FFF; }
    .task-desc { font-size: 12px; color: #64748B; margin-top: 2px; }

    .status-tag {
      font-size: 11px;
      font-weight: 800;
      padding: 5px 12px;
      border-radius: 8px;
      white-space: nowrap;
    }
    .tag-urgent { background: rgba(245, 158, 11, 0.2); color: #FCD34D; border: 1px solid rgba(245, 158, 11, 0.4); }
    .tag-submitted { background: rgba(16, 185, 129, 0.2); color: #6EE7B7; border: 1px solid rgba(16, 185, 129, 0.4); }
    .tag-upcoming { background: rgba(100, 116, 139, 0.2); color: #94A3B8; border: 1px solid rgba(100, 116, 139, 0.4); }

    /* Side Overview (Right) */
    .side-col {
      width: 320px;
      display: flex;
      flex-direction: column;
      gap: 16px;
    }
    .side-box {
      background: #141722;
      border: 1px solid #232938;
      border-radius: 16px;
      padding: 18px;
    }
    .side-heading {
      font-size: 13px;
      font-weight: 800;
      color: #94A3B8;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-bottom: 12px;
      display: flex;
      align-items: center;
      justify-content: space-between;
    }
    .stat-row {
      display: flex;
      justify-content: space-between;
      padding: 8px 0;
      border-bottom: 1px solid #1F2433;
      font-size: 13px;
    }
    .stat-label { color: #94A3B8; font-weight: 600; }
    .stat-val { color: #FFF; font-weight: 800; }
  </style>
</head>
<body>
  <!-- Nav Rail -->
  <div class="rail">
    <div class="rail-brand">W</div>
    <div class="rail-item active">
      <i data-lucide="check-square" style="width:20px;height:20px;"></i>
      <span>Dues</span>
    </div>
    <div class="rail-item">
      <i data-lucide="calendar" style="width:20px;height:20px;"></i>
      <span>Month</span>
    </div>
    <div class="rail-item">
      <i data-lucide="graduation-cap" style="width:20px;height:20px;"></i>
      <span>Grades</span>
    </div>
    <div class="rail-item" style="margin-top:auto;">
      <i data-lucide="settings" style="width:20px;height:20px;"></i>
      <span>Settings</span>
    </div>
  </div>

  <!-- Main View -->
  <div class="main">
    <div class="header">
      <div class="header-left">
        <span class="header-title">Timeline Agenda</span>
        <span class="header-badge">4 Active Deadlines</span>
      </div>
      <div class="header-right">
        <span class="term-badge">Fall 2026 (1269)</span>
        <button class="sync-btn">
          <i data-lucide="refresh-cw" style="width:14px;height:14px;"></i>
          <span>Sync Now</span>
        </button>
      </div>
    </div>

    <div class="content">
      <!-- Left Timeline Cards -->
      <div class="timeline-col">
        <!-- Group 1 -->
        <div>
          <div class="date-heading">
            <span class="date-bold">Today</span>
            <span class="date-sub">Friday, November 20</span>
          </div>

          <!-- Card 1 -->
          <div class="task-card">
            <div class="task-left">
              <div class="chk-box"></div>
              <div>
                <div class="task-meta">
                  <span class="course-pill cs-pill">CS 135</span>
                  <span class="badge-lec">LEC</span>
                  <span class="due-time">11:59 PM (in 6 hours)</span>
                </div>
                <div class="task-title">Assignment 4 — Binary Search Trees & Recursion</div>
                <div class="task-desc">Dropbox submission • Maximum 3 file attachments</div>
              </div>
            </div>
            <span class="status-tag tag-urgent">Due Soon</span>
          </div>

          <!-- Card 2 (LAB) -->
          <div class="task-card">
            <div class="task-left">
              <div class="chk-box"></div>
              <div>
                <div class="task-meta">
                  <span class="course-pill chem-pill">CHEM 120L</span>
                  <span class="badge-lab">LAB</span>
                  <span class="due-time">11:59 PM</span>
                </div>
                <div class="task-title">Lab Report 3 — Titration Curves & Buffer Capacity</div>
                <div class="task-desc">Submit Excel calculations spreadsheet and PDF report</div>
              </div>
            </div>
            <span class="status-tag tag-urgent">Due Soon</span>
          </div>
        </div>

        <!-- Group 2 -->
        <div>
          <div class="date-heading">
            <span class="date-bold">Tuesday</span>
            <span class="date-sub">November 24</span>
          </div>

          <!-- Card 3 -->
          <div class="task-card submitted">
            <div class="task-left">
              <div class="chk-box checked">
                <i data-lucide="check" style="width:14px;height:14px;stroke:#FFF;stroke-width:3.5;"></i>
              </div>
              <div>
                <div class="task-meta">
                  <span class="course-pill math-pill">MATH 135</span>
                  <span class="badge-lec">LEC</span>
                  <span class="due-time">5:00 PM</span>
                </div>
                <div class="task-title" style="text-decoration: line-through; color:#94A3B8;">Problem Set 4 — Modular Inverses & CRT</div>
                <div class="task-desc">Crowdmark submission • Submitted 1 day early</div>
              </div>
            </div>
            <span class="status-tag tag-submitted">Submitted</span>
          </div>

          <!-- Card 4 -->
          <div class="task-card">
            <div class="task-left">
              <div class="chk-box"></div>
              <div>
                <div class="task-meta">
                  <span class="course-pill chem-pill">CHEM 120</span>
                  <span class="badge-lec">LEC</span>
                  <span class="due-time">8:00 PM</span>
                </div>
                <div class="task-title">Quiz 4 — Acid-Base Equilibrium & Buffers</div>
                <div class="task-desc">Online Quiz • 45 minutes timed attempt</div>
              </div>
            </div>
            <span class="status-tag tag-upcoming">Upcoming</span>
          </div>
        </div>
      </div>

      <!-- Right Overview Column -->
      <div class="side-col">
        <div class="side-box">
          <div class="side-heading">
            <span>Enrolled Courses</span>
            <span>Fall 2026</span>
          </div>
          <div class="stat-row"><span class="stat-label">CS 135</span><span class="stat-val">Designing Programs</span></div>
          <div class="stat-row"><span class="stat-label">MATH 135</span><span class="stat-val">Honours Algebra</span></div>
          <div class="stat-row"><span class="stat-label">CHEM 120</span><span class="stat-val">General Chemistry 1</span></div>
          <div class="stat-row"><span class="stat-label">CHEM 120L</span><span class="stat-val" style="color:#34D399;">Chemistry Lab</span></div>
          <div class="stat-row" style="border:none;"><span class="stat-label">ENGL 109</span><span class="stat-val">Academic Writing</span></div>
        </div>

        <div class="side-box" style="background: linear-gradient(135deg, #1C2333 0%, #151A26 100%); border-color:#2E374D;">
          <div class="side-heading" style="color:#FDD54F;">Summary</div>
          <div class="stat-row"><span class="stat-label">Pending Dues</span><span class="stat-val" style="color:#FDD54F;">3</span></div>
          <div class="stat-row"><span class="stat-label">Completed</span><span class="stat-val" style="color:#34D399;">1</span></div>
          <div class="stat-row" style="border:none;"><span class="stat-label">Calculated Standing</span><span class="stat-val" style="color:#38BDF8;">89.2% (A+)</span></div>
        </div>
      </div>
    </div>
  </div>

  <script>lucide.createIcons();</script>
</body>
</html>`;

fs.writeFileSync(path.join(outputDir, 's1_temp.html'), screenshot1Html, 'utf8');
console.log('Rendering Screenshot 1 (1280x800 - Agenda Timeline)...');
execSync(`"${chromePath}" --headless --disable-gpu --force-device-scale-factor=1 --window-size=1280,800 --screenshot="${path.join(outputDir, 'screenshot-1-agenda-1280x800.png')}" "file:///${path.join(outputDir, 's1_temp.html').replace(/\\\\/g, '/')}"`);
fs.unlinkSync(path.join(outputDir, 's1_temp.html'));

// -------------------------------------------------------------
// 3. Screenshot 2: 1,280 x 800 - Gradebook & Standings
// -------------------------------------------------------------
const screenshot2Html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <script src="https://unpkg.com/lucide@latest"></script>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      width: 1280px;
      height: 800px;
      overflow: hidden;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      background: #0F1117;
      color: #F3F4F6;
      display: flex;
    }

    .rail {
      width: 64px;
      background: #111319;
      border-right: 1px solid #1F2433;
      display: flex;
      flex-direction: column;
      align-items: center;
      padding: 18px 0;
      gap: 20px;
    }
    .rail-brand {
      width: 38px;
      height: 38px;
      border-radius: 12px;
      background: linear-gradient(145deg, #FFE066, #F59E0B);
      color: #111;
      font-weight: 900;
      font-size: 22px;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .rail-item {
      width: 48px;
      height: 48px;
      border-radius: 12px;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 3px;
      color: #94A3B8;
      font-size: 10px;
      font-weight: 700;
    }
    .rail-item.active {
      background: #FDD54F;
      color: #111;
      box-shadow: 0 4px 12px rgba(253, 213, 79, 0.35);
    }

    .main {
      flex: 1;
      display: flex;
      flex-direction: column;
      height: 100%;
    }
    .header {
      height: 64px;
      border-bottom: 1px solid #1F2433;
      padding: 0 28px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      background: #141722;
    }
    .header-left { display: flex; align-items: center; gap: 14px; }
    .header-title { font-size: 20px; font-weight: 900; color: #FFF; }
    
    .course-tabs {
      display: flex;
      gap: 8px;
      padding: 16px 28px 0 28px;
      background: #141722;
      border-bottom: 1px solid #1F2433;
    }
    .course-tab {
      padding: 8px 16px;
      border-radius: 8px 8px 0 0;
      font-size: 13px;
      font-weight: 700;
      color: #94A3B8;
      border: 1px solid transparent;
      border-bottom: none;
      cursor: pointer;
    }
    .course-tab.active {
      background: #0F1117;
      color: #FDD54F;
      border-color: #232A3B;
      border-bottom: 2px solid #FDD54F;
    }

    .content {
      flex: 1;
      padding: 24px 28px;
      display: flex;
      gap: 24px;
      overflow: hidden;
    }

    .table-container {
      flex: 1;
      background: #141722;
      border: 1px solid #232A3B;
      border-radius: 14px;
      overflow: hidden;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      text-align: left;
      font-size: 13px;
    }
    th {
      background: #181C26;
      color: #94A3B8;
      font-weight: 700;
      padding: 12px 18px;
      border-bottom: 1px solid #232A3B;
    }
    td {
      padding: 14px 18px;
      border-bottom: 1px solid #1D2330;
      color: #CBD5E1;
    }
    .cat-row {
      background: #191E2A;
      font-weight: 800;
      color: #FFF;
    }
    .sub-item {
      padding-left: 36px;
      color: #E2E8F0;
    }

    /* Score Badge */
    .score-high { color: #34D399; font-weight: 800; }
    .score-mid { color: #60A5FA; font-weight: 800; }
    .score-ungraded { color: #64748B; font-weight: 600; }

    /* Summary Card */
    .summary-card {
      width: 320px;
      background: #141722;
      border: 1px solid #232A3B;
      border-radius: 14px;
      padding: 20px;
      display: flex;
      flex-direction: column;
      gap: 16px;
    }
    .grade-circle {
      width: 110px;
      height: 110px;
      border-radius: 50%;
      background: radial-gradient(circle, rgba(52, 211, 153, 0.2) 0%, transparent 70%);
      border: 4px solid #10B981;
      margin: 8px auto;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
    }
    .grade-val { font-size: 26px; font-weight: 900; color: #FFF; }
    .grade-letter { font-size: 12px; font-weight: 800; color: #34D399; }
  </style>
</head>
<body>
  <div class="rail">
    <div class="rail-brand">W</div>
    <div class="rail-item">
      <i data-lucide="check-square" style="width:20px;height:20px;"></i>
      <span>Dues</span>
    </div>
    <div class="rail-item">
      <i data-lucide="calendar" style="width:20px;height:20px;"></i>
      <span>Month</span>
    </div>
    <div class="rail-item active">
      <i data-lucide="graduation-cap" style="width:20px;height:20px;"></i>
      <span>Grades</span>
    </div>
    <div class="rail-item" style="margin-top:auto;">
      <i data-lucide="settings" style="width:20px;height:20px;"></i>
      <span>Settings</span>
    </div>
  </div>

  <div class="main">
    <div class="header">
      <div class="header-left">
        <span class="header-title">Gradebook Breakdown</span>
      </div>
      <div style="font-size:12px; font-weight:700; color:#34D399; background:rgba(16, 185, 129, 0.15); padding:6px 14px; border-radius:8px; border:1px solid rgba(16, 185, 129, 0.3);">
        0% Placeholders Masked as Ungraded
      </div>
    </div>

    <div class="course-tabs">
      <div class="course-tab active">CS 135 (Functional Programs)</div>
      <div class="course-tab">MATH 135 (Algebra)</div>
      <div class="course-tab">CHEM 120 (General Chemistry)</div>
      <div class="course-tab">CHEM 120L (Lab)</div>
      <div class="course-tab">ENGL 109</div>
    </div>

    <div class="content">
      <div class="table-container">
        <table>
          <thead>
            <tr>
              <th>Assessment Item</th>
              <th style="text-align:center;">Score</th>
              <th style="text-align:center;">Weight</th>
              <th style="text-align:right;">Feedback</th>
            </tr>
          </thead>
          <tbody>
            <tr class="cat-row">
              <td>📁 Assignments Category</td>
              <td style="text-align:center;" class="score-high">92.5%</td>
              <td style="text-align:center;">20.00%</td>
              <td style="text-align:right; color:#64748B;">—</td>
            </tr>
            <tr>
              <td class="sub-item">Assignment 1 — Fundamentals</td>
              <td style="text-align:center;">48 / 50 (96.0%)</td>
              <td style="text-align:center; color:#94A3B8;">4.00%</td>
              <td style="text-align:right; color:#FDD54F; font-weight:700;">View Rubric</td>
            </tr>
            <tr>
              <td class="sub-item">Assignment 2 — Lists & Structs</td>
              <td style="text-align:center;">44 / 50 (88.0%)</td>
              <td style="text-align:center; color:#94A3B8;">4.00%</td>
              <td style="text-align:right; color:#FDD54F; font-weight:700;">View Rubric</td>
            </tr>
            <tr>
              <td class="sub-item">Assignment 3 — Trees & HOF</td>
              <td style="text-align:center;">47 / 50 (94.0%)</td>
              <td style="text-align:center; color:#94A3B8;">4.00%</td>
              <td style="text-align:right; color:#FDD54F; font-weight:700;">View Rubric</td>
            </tr>

            <tr class="cat-row">
              <td>📁 Midterm Examination</td>
              <td style="text-align:center;" class="score-mid">86.0%</td>
              <td style="text-align:center;">25.00%</td>
              <td style="text-align:right; color:#64748B;">—</td>
            </tr>
            <tr>
              <td class="sub-item">Midterm Exam (In-Person PAC)</td>
              <td style="text-align:center;">86 / 100 (86.0%)</td>
              <td style="text-align:center; color:#94A3B8;">25.00%</td>
              <td style="text-align:right; color:#94A3B8;">Crowdmark</td>
            </tr>

            <tr class="cat-row">
              <td>📁 Final Examination</td>
              <td style="text-align:center;" class="score-ungraded">— (Ungraded)</td>
              <td style="text-align:center;">40.00%</td>
              <td style="text-align:right; color:#64748B;">—</td>
            </tr>
            <tr style="opacity:0.6;">
              <td class="sub-item">Final Exam — December 2026</td>
              <td style="text-align:center;" class="score-ungraded">— (Not yet graded)</td>
              <td style="text-align:center; color:#94A3B8;">40.00%</td>
              <td style="text-align:right; color:#64748B;">—</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div class="summary-card">
        <div style="font-size:14px; font-weight:800; color:#FFF; text-align:center;">Current Standing</div>
        <div class="grade-circle">
          <span class="grade-val">89.2%</span>
          <span class="grade-letter">Grade: A+</span>
        </div>
        <div style="font-size:12px; color:#94A3B8; text-align:center; line-height:1.5;">
          Calculated accurately based on graded items. Future 0% assignments are ignored so your real GPA is protected.
        </div>
        <div style="margin-top:auto; padding:12px; background:#1C2230; border-radius:10px; font-size:11px; color:#CBD5E1; text-align:center;">
          Direct links to Waterloo LEARN attempt submissions & rubrics
        </div>
      </div>
    </div>
  </div>

  <script>lucide.createIcons();</script>
</body>
</html>`;

fs.writeFileSync(path.join(outputDir, 's2_temp.html'), screenshot2Html, 'utf8');
console.log('Rendering Screenshot 2 (1280x800 - Gradebook)...');
execSync(`"${chromePath}" --headless --disable-gpu --force-device-scale-factor=1 --window-size=1280,800 --screenshot="${path.join(outputDir, 'screenshot-2-grades-1280x800.png')}" "file:///${path.join(outputDir, 's2_temp.html').replace(/\\\\/g, '/')}"`);
fs.unlinkSync(path.join(outputDir, 's2_temp.html'));

console.log('All Store Assets Rendered Successfully in store_assets/ !');
