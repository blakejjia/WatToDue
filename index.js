import { NavRail } from './src/components/nav-rail.js';
import { CalendarView } from './src/components/calendar-view.js';
import { GradesView } from './src/components/grades-view.js';
import { SettingsView } from './src/components/settings-view.js';
import { syncService } from './src/services/sync-service.js';
import { storageManager } from './src/services/storage-manager.js';
import { el, clear } from './src/utils/dom.js';

class DashboardController {
  constructor() {
    this.currentTab = 'dues';
    this.user = null;
    this.terms = [];
    this.selectedTerm = null;
    this.courses = [];
    this.dues = [];
    this.grades = {};
    this.lastSync = null;

    this.navRailEl = document.getElementById('nav-rail');
    this.viewTitleEl = document.getElementById('view-title');
    this.viewBodyEl = document.getElementById('view-body');
    this.bannerContainerEl = document.getElementById('banner-container');
    this.syncQuickBtn = document.getElementById('sync-quick-btn');

    this.init();
  }

  async init() {
    this.navRail = new NavRail(this.navRailEl, {
      activeTab: this.currentTab,
      isPopup: false,
      onTabChange: (tab) => this.switchTab(tab),
    });

    if (this.syncQuickBtn) {
      this.syncQuickBtn.addEventListener('click', () => this.triggerSync(true));
    }

    // 1. Instant render from local storage
    await this.loadCache();
    this.renderCurrentView();

    // 2. Background fresh sync
    this.triggerSync(false);
  }

  async loadCache() {
    this.user = await storageManager.get('user', null);
    this.terms = await storageManager.get('terms', []);
    this.selectedTerm = await storageManager.get('selectedTerm', null);
    this.courses = await storageManager.get('courses', []);
    this.dues = await storageManager.get('dues', []);
    this.grades = await storageManager.get('grades', {});
    this.lastSync = await storageManager.get('lastSync', null);
  }

  async triggerSync(force = false) {
    if (this.syncQuickBtn) {
      this.syncQuickBtn.disabled = true;
      this.syncQuickBtn.querySelector('span:first-child').classList.add('spinner');
    }

    try {
      const result = await syncService.sync({ force });
      if (!result.fresh || force) {
        await this.loadCache();
        this.renderCurrentView();
      }
      this.clearBanner();
    } catch (err) {
      console.warn('Sync warning or session expired:', err);
      if (err.name === 'SessionExpiredError' || !this.user) {
        this.showLoginBanner();
      }
    } finally {
      if (this.syncQuickBtn) {
        this.syncQuickBtn.disabled = false;
        this.syncQuickBtn.querySelector('span:first-child').classList.remove('spinner');
      }
    }
  }

  showLoginBanner() {
    clear(this.bannerContainerEl);
    const banner = el(
      'div',
      { className: 'banner banner-warning' },
      el('span', {}, '🔑 Please sign in to Waterloo LEARN in your browser to sync deadlines & grades.'),
      el(
        'a',
        {
          className: 'btn btn-primary btn-sm',
          href: 'https://learn.uwaterloo.ca',
          target: '_blank',
          rel: 'noopener noreferrer',
        },
        'Sign In to LEARN'
      )
    );
    this.bannerContainerEl.appendChild(banner);
  }

  clearBanner() {
    clear(this.bannerContainerEl);
  }

  switchTab(tab) {
    this.currentTab = tab;
    const titles = { dues: 'Dues Calendar', grades: 'Grades Breakdown', settings: 'Settings & Courses' };
    this.viewTitleEl.textContent = titles[tab] || 'WatToDue';
    this.renderCurrentView();
  }

  renderCurrentView() {
    clear(this.viewBodyEl);

    if (this.currentTab === 'dues') {
      this.calendarView = new CalendarView(this.viewBodyEl, {
        dues: this.dues,
        onRefresh: () => this.triggerSync(true),
      });
    } else if (this.currentTab === 'grades') {
      this.gradesView = new GradesView(this.viewBodyEl, {
        courses: this.courses,
        gradesMap: this.grades,
      });
    } else if (this.currentTab === 'settings') {
      this.settingsView = new SettingsView(this.viewBodyEl, {
        user: this.user,
        terms: this.terms,
        selectedTerm: this.selectedTerm,
        courses: this.courses,
        lastSync: this.lastSync,
        onSyncTriggered: async () => this.triggerSync(true),
        onTermChanged: async (newTerm) => {
          this.selectedTerm = newTerm;
          await this.triggerSync(true);
        },
      });
    }
  }
}

document.addEventListener('DOMContentLoaded', () => {
  new DashboardController();
});
