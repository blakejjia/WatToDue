import { PopupDueList } from './src/components/popup-due-list.js';
import { syncService } from './src/services/sync-service.js';
import { storageManager } from './src/services/storage-manager.js';
import { el, clear } from './src/utils/dom.js';

class PopupController {
  constructor() {
    this.dues = [];
    this.user = null;
    this.dueList = null;

    this.popupBodyEl = document.getElementById('popup-body');
    this.countBadgeEl = document.getElementById('popup-count-badge');
    this.syncBtn = document.getElementById('sync-quick-btn');
    this.openFullBtn = document.getElementById('open-full-btn');
    this.bannerContainerEl = document.getElementById('banner-container');

    this.init();
  }

  async init() {
    // Open full dashboard in a new tab
    if (this.openFullBtn) {
      this.openFullBtn.addEventListener('click', () => {
        if (typeof chrome !== 'undefined' && chrome.tabs) {
          chrome.tabs.create({ url: chrome.runtime.getURL('index.html') });
        } else {
          window.open('index.html', '_blank');
        }
      });
    }

    // Refresh sync button
    if (this.syncBtn) {
      this.syncBtn.addEventListener('click', () => this.triggerSync(true));
    }

    // Cross-tab live sync via chrome.storage.onChanged
    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.onChanged) {
      chrome.storage.onChanged.addListener(async (changes, area) => {
        if (area === 'local') {
          await this.loadCache();
          this.renderList();
        }
      });
    }

    // 1. Instant 0ms cache render
    await this.loadCache();
    this.renderList();

    // 2. Background fresh sync check
    this.triggerSync(false);
  }

  async loadCache() {
    this.user = await storageManager.get('user', null);
    const completedIds = new Set((await storageManager.get('completedDueIds', [])) || []);
    const rawDues = (await storageManager.get('dues', [])) || [];

    this.dues = rawDues.map((d) => ({
      ...d,
      completed: completedIds.has(d.id) || Boolean(d.completed),
    }));

    this.updateBadge();
  }

  updateBadge() {
    if (!this.countBadgeEl) return;
    const activeCount = this.dues.filter((d) => !d.completed).length;
    this.countBadgeEl.textContent = `${activeCount} Due`;
    if (activeCount === 0) {
      this.countBadgeEl.style.backgroundColor = 'var(--success-color)';
      this.countBadgeEl.style.color = '#fff';
    } else {
      this.countBadgeEl.style.backgroundColor = 'var(--uw-gold)';
      this.countBadgeEl.style.color = '#000';
    }
  }

  renderList() {
    if (!this.dueList) {
      this.dueList = new PopupDueList(this.popupBodyEl, {
        dues: this.dues,
        onToggleCompleted: async (dueId, completed) => {
          await storageManager.toggleCompleted(dueId);
          await this.loadCache();
          this.updateBadge();
        },
      });
    } else {
      this.dueList.setDues(this.dues);
    }
    this.updateBadge();
  }

  async triggerSync(force = false) {
    if (this.syncBtn) {
      this.syncBtn.disabled = true;
      this.syncBtn.textContent = '...';
    }

    try {
      const result = await syncService.sync({ force });
      if (!result.fresh || force) {
        await this.loadCache();
        this.renderList();
      }
      this.clearBanner();
    } catch (err) {
      console.warn('Sync warning or session expired:', err);
      if (err.name === 'SessionExpiredError' || !this.user) {
        this.showLoginBanner();
      }
    } finally {
      if (this.syncBtn) {
        this.syncBtn.disabled = false;
        this.syncBtn.textContent = '↻';
      }
    }
  }

  showLoginBanner() {
    clear(this.bannerContainerEl);
    const banner = el(
      'div',
      { className: 'banner banner-warning', style: { margin: '8px 12px 0 12px' } },
      el('span', {}, '🔑 Please log in to Waterloo LEARN.'),
      el(
        'a',
        {
          className: 'btn btn-primary btn-sm',
          href: 'https://learn.uwaterloo.ca',
          target: '_blank',
          rel: 'noopener noreferrer',
          onClick: (e) => {
            if (typeof chrome !== 'undefined' && chrome.tabs) {
              e.preventDefault();
              chrome.tabs.create({ url: 'https://learn.uwaterloo.ca' });
            }
          },
        },
        'Sign In'
      )
    );
    this.bannerContainerEl.appendChild(banner);
  }

  clearBanner() {
    clear(this.bannerContainerEl);
  }
}

// Bootstrap once DOM ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => new PopupController());
} else {
  new PopupController();
}
