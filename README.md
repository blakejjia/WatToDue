<div align="center">

  <img src="icons/icon-128.png" alt="WatToDue Logo" width="80" height="80">

  # WatToDue

  ### Never miss a Waterloo deadline again.

  [![Add to Chrome](https://img.shields.io/badge/Chrome_Web_Store-Add_to_Chrome-4285F4?style=for-the-badge&logo=googlechrome&logoColor=white)](https://chromewebstore.google.com/detail/wattodue-waterloo-learn-d/bpigocbcnijjmncfgdloeillfmifcemn)
  [![View on Google Play](https://img.shields.io/badge/Google_Play-View_on_Google_Play-00875A?style=for-the-badge&logo=googleplay&logoColor=white)](https://jia-yx.com/projects/wattodue/)
  [![Live Showcase](https://img.shields.io/badge/Live_Showcase-jia--yx.com-f59e0b?style=for-the-badge&logo=safari&logoColor=white)](https://jia-yx.com/projects/wattodue/)
  [![Manifest V3](https://img.shields.io/badge/Chrome_MV3-Official_Store-10b981?style=for-the-badge)](https://chromewebstore.google.com/detail/wattodue-waterloo-learn-d/bpigocbcnijjmncfgdloeillfmifcemn)
  [![Tests](https://img.shields.io/badge/Tests-32_Passing-success?style=for-the-badge)](tests/)

  <p align="center">
    <b>Consolidates assignment dropboxes, quizzes, and grade trees across all your Waterloo LEARN courses into one clean, high-performance dashboard.</b>
  </p>

  [**⚡ Install from Chrome Web Store**](https://chromewebstore.google.com/detail/wattodue-waterloo-learn-d/bpigocbcnijjmncfgdloeillfmifcemn) • [**📱 View on Google Play Store**](https://jia-yx.com/projects/wattodue/) • [**🌐 Live Web Showcase**](https://jia-yx.com/projects/wattodue/) • [**📦 Download ZIP**](https://github.com/blakejjia/WatToDue/releases/latest)

</div>

<br>

<div align="center">
  <img src="docs/assets/screenshot-dues.png" alt="WatToDue Dues Calendar" width="820" style="border-radius: 12px; box-shadow: 0 4px 20px rgba(0,0,0,0.15);">
  <p><sub><i>📅 Unified Dues Timeline across all Waterloo LEARN courses</i></sub></p>
  <br>
  <img src="docs/assets/screenshot-grades.png" alt="WatToDue Grades Breakdown" width="820" style="border-radius: 12px; box-shadow: 0 4px 20px rgba(0,0,0,0.15);">
  <p><sub><i>📊 Accurate Hierarchical Grades Breakdown & Category Weighting</i></sub></p>
</div>

<br>

---

### 💡 Why WatToDue?

| Pain Point in LEARN 😫 | With WatToDue 🚀 |
| :--- | :--- |
| Clicking through 5 separate course shells every morning | **Unified Chronological Timeline** across all enrolled courses |
| Mystery `0 / 10` placeholders tanking your average | **True Standing**: Unmarked items displayed as *Ungraded* (`—`) |
| Wondering if your dropbox submission went through | **Auto-detects submitted files & finished quiz attempts** |
| Opening a heavy tab just to see what's due tonight | **1-Click Toolbar Popup** with instant countdowns |
| Confusing lab and lecture sections | **Smart Classification**: Auto-tags `LEC`, `LAB` (e.g. `CHEM 220L`), `TUT`, `TST` |
| Eye-straining bright white screens at 2 AM | **Dual Themes**: System Auto, Pure Dark Mode & Crisp Light Mode |

---

### ✨ Core Capabilities

- 📅 **Dual Visualizations**: Switch seamlessly between a chronological Luma-style **Agenda Timeline** and an interactive **Monthly Calendar Matrix**.
- 📊 **Real Gradebook Hierarchy**: Matches Waterloo LEARN's exact category weights and folder structures. Unmarked future assignments never drag down your standing.
- 🌓 **Theme Engine**: Complete dual Light & Dark mode support that adapts to your OS preference with 1-click manual overrides in Settings.
- 🔒 **Privacy-First Architecture**: 100% client-side. Zero analytics, zero telemetry, and zero credentials stored. Everything stays strictly inside your browser.

---

### 🚀 1-Click Install & Live Demo

1. **Chrome Web Store**: Open the [**WatToDue page on Chrome Web Store**](https://chromewebstore.google.com/detail/wattodue-waterloo-learn-d/bpigocbcnijjmncfgdloeillfmifcemn) and click **Add to Chrome**. *(Note: If Chrome shows a standard "Proceed with caution" prompt for new developer accounts, simply click **Continue to install**)*.
2. **Google Play Store**: [**View on Google Play Store**](https://jia-yx.com/projects/wattodue/) for mobile availability and updates.
3. **Live Showcase**: Visit our self-hosted demo at [**jia-yx.com/projects/wattodue/**](https://jia-yx.com/projects/wattodue/).
4. Pin WatToDue to your browser toolbar and visit [Waterloo LEARN](https://learn.uwaterloo.ca)!

> **Manual Developer Install**: You can also download the standalone [`WatToDue-v1.0.1.zip`](https://github.com/blakejjia/WatToDue/releases/latest) and load unpacked in `chrome://extensions`.

---

### 🛠️ Development & Testing

WatToDue is built with pure Vanilla JavaScript (ES Modules) and Chrome Manifest V3. No bundling or heavyweight framework overhead.

```bash
# Run the complete test suite (32 tests)
npm test

# Build production zip package in dist/
npm run pack
```

---

<div align="center">
  <sub>Built with 💛 by Waterloo students for Waterloo students. Not officially affiliated with Desire2Learn or the University of Waterloo.</sub>
</div>
