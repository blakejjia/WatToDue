import { el, clear } from '../utils/dom.js';
import { storageManager } from '../services/storage-manager.js';
import { createIcon } from '../utils/icons.js';

export class SettingsView {
  /**
   * @param {HTMLElement} container
   * @param {object} options
   * @param {object|null} options.user
   * @param {Array<object>} options.terms
   * @param {string|null} options.selectedTerm
   * @param {Array<object>} options.courses
   * @param {string|null} options.lastSync
   * @param {() => Promise<void>} options.onSyncTriggered
   * @param {(newTerm: string) => Promise<void>} options.onTermChanged
   */
  constructor(container, options = {}) {
    this.container = container;
    this.user = options.user || null;
    this.terms = options.terms || [];
    this.selectedTerm = options.selectedTerm || null;
    this.courses = options.courses || [];
    this.lastSync = options.lastSync || null;
    this.onSyncTriggered = options.onSyncTriggered || (async () => {});
    this.onTermChanged = options.onTermChanged || (async () => {});

    this.isSyncing = false;
    this.enabledCourseIds = null;
    this.showDeleteModal = false;
    this.toastMessage = null;

    this.loadStateAndRender();
  }

  async loadStateAndRender() {
    this.enabledCourseIds = await storageManager.getEnabledCoursesForTerm(this.selectedTerm);
    this.render();
  }

  setData({ user, terms, selectedTerm, courses, lastSync }) {
    if (user !== undefined) this.user = user;
    if (terms !== undefined) this.terms = terms;
    if (selectedTerm !== undefined) this.selectedTerm = selectedTerm;
    if (courses !== undefined) this.courses = courses;
    if (lastSync !== undefined) this.lastSync = lastSync;
    this.loadStateAndRender();
  }

  showToast(message) {
    this.toastMessage = message;
    this.render();
    setTimeout(() => {
      this.toastMessage = null;
      this.render();
    }, 3500);
  }

  render() {
    clear(this.container);

    const root = el('div', { className: 'settings-container' });

    // Toast alert banner if active
    if (this.toastMessage) {
      root.appendChild(
        el(
          'div',
          { className: 'banner banner-warning', style: { marginBottom: '6px' } },
          createIcon('sparkles', { size: 14, style: { marginRight: '6px' } }),
          el('span', {}, this.toastMessage)
        )
      );
    }

    // 1. User Account & Connection Profile Card (Top-level, Clean Name Only)
    root.appendChild(this.renderAccountCard());

    // 2. Privacy & Security Guarantee Card (Zero Server, 100% Client-Side, Open Source)
    root.appendChild(this.renderPrivacyCard());

    // 3. Course Selection (Material Design Filter Chip Badges)
    root.appendChild(this.renderCourseChipsCard());

    // 4. Term & Appearance Preferences
    root.appendChild(this.renderPreferencesCard());

    // 5. Data Sync Card
    root.appendChild(this.renderSyncCard());

    // 6. Danger Zone (Delete Local User Data)
    root.appendChild(this.renderDangerZoneCard());

    // 7. Footer
    root.appendChild(
      el(
        'div',
        { style: { textAlign: 'center', fontSize: '12px', color: 'var(--text-muted)', margin: '14px 0 24px 0' } },
        'WatToDue v1.0.1 · Free, Secure & 100% Client-Side for Waterloo Warriors'
      )
    );

    // 8. Delete Confirmation Modal (if active)
    if (this.showDeleteModal) {
      root.appendChild(this.renderDeleteConfirmationModal());
    }

    this.container.appendChild(root);
  }

  renderAccountCard() {
    const fullName = this.user
      ? `${this.user.firstName || ''} ${this.user.lastName || ''}`.trim() || 'Waterloo Warrior'
      : 'Waterloo Student';

    const initial = this.user?.firstName ? this.user.firstName[0].toUpperCase() : 'W';

    return el(
      'div',
      { className: 'settings-card' },
      el(
        'div',
        { className: 'settings-profile-header' },
        el(
          'div',
          { className: 'settings-avatar-group' },
          el('div', { className: 'settings-avatar' }, initial),
          el(
            'div',
            { className: 'settings-profile-info' },
            el('div', { className: 'settings-profile-name' }, fullName),
            el(
              'div',
              { className: 'settings-profile-status' },
              el('span', { className: 'status-dot-active' }),
              'Connected to Waterloo LEARN'
            )
          )
        ),
        el(
          'a',
          {
            className: 'btn btn-secondary',
            href: 'https://learn.uwaterloo.ca',
            target: '_blank',
            rel: 'noopener noreferrer',
            style: { display: 'inline-flex', alignItems: 'center', gap: '6px' },
          },
          el('span', {}, 'Open LEARN'),
          createIcon('external-link', { size: 12 })
        )
      )
    );
  }

  renderPrivacyCard() {
    return el(
      'div',
      { className: 'settings-card privacy-shield-card' },
      el(
        'div',
        { className: 'privacy-banner-header' },
        el(
          'div',
          { style: { display: 'flex', alignItems: 'center', gap: '8px' } },
          createIcon('shield-check', { size: 18, style: { color: 'var(--uw-gold-dark)' } }),
          el(
            'span',
            { style: { fontSize: '14px', fontWeight: '800', color: 'var(--text-primary)' } },
            '100% Client-Side & Private'
          )
        ),
        el(
          'div',
          { className: 'privacy-badge-pill' },
          createIcon('check', { size: 12, strokeWidth: 2.5 }),
          el('span', {}, 'Zero Data Collection')
        )
      ),
      el(
        'p',
        { style: { fontSize: '12px', color: 'var(--text-secondary)', lineHeight: '1.5', marginBottom: '14px' } },
        'WatToDue is strictly serverless. Your grades, assignments, and account details never leave your computer. We believe student data belongs solely to the student.'
      ),
      el(
        'div',
        { className: 'privacy-points-grid' },
        el(
          'div',
          { className: 'privacy-point' },
          el('div', { className: 'privacy-point-icon' }, createIcon('cloud-off', { size: 16 })),
          el(
            'div',
            {},
            el('div', { className: 'privacy-point-title' }, 'No External Servers'),
            el(
              'div',
              { className: 'privacy-point-desc' },
              'WatToDue has no backend servers, cloud databases, or tracking infrastructure. Nothing is ever sent to us.'
            )
          )
        ),
        el(
          'div',
          { className: 'privacy-point' },
          el('div', { className: 'privacy-point-icon' }, createIcon('lock', { size: 16 })),
          el(
            'div',
            {},
            el('div', { className: 'privacy-point-title' }, 'Direct Connection Only'),
            el(
              'div',
              { className: 'privacy-point-desc' },
              'All requests communicate directly between your browser and official learn.uwaterloo.ca over your secure session.'
            )
          )
        ),
        el(
          'div',
          { className: 'privacy-point' },
          el('div', { className: 'privacy-point-icon' }, createIcon('eye-off', { size: 16 })),
          el(
            'div',
            {},
            el('div', { className: 'privacy-point-title' }, 'Zero Developer Access'),
            el(
              'div',
              { className: 'privacy-point-desc' },
              'Neither the developer nor any third party can ever see, read, or track your grades, quiz scores, or coursework.'
            )
          )
        ),
        el(
          'div',
          { className: 'privacy-point' },
          el('div', { className: 'privacy-point-icon' }, createIcon('scale', { size: 16 })),
          el(
            'div',
            {},
            el('div', { className: 'privacy-point-title' }, 'Free & Open Source Forever'),
            el(
              'div',
              { className: 'privacy-point-desc' },
              'The complete source code is public and auditable on GitHub under the MIT License. Free forever with zero ads or monetization.'
            )
          )
        )
      ),
      el(
        'div',
        { className: 'privacy-actions-row' },
        el(
          'a',
          {
            className: 'btn btn-secondary btn-sm',
            href: 'https://github.com/blakejjia/WatToDue',
            target: '_blank',
            rel: 'noopener noreferrer',
            title: 'WatToDue on GitHub (Source Code & Audit)',
            style: { display: 'inline-flex', alignItems: 'center', gap: '6px' },
          },
          createIcon('github', { size: 15 }),
          el('span', {}, 'GitHub')
        ),
        el(
          'a',
          {
            className: 'btn btn-secondary btn-sm',
            href: 'https://chromewebstore.google.com/detail/wattodue-waterloo-learn-d/bpigocbcnijjmncfgdloeillfmifcemn',
            target: '_blank',
            rel: 'noopener noreferrer',
            title: 'WatToDue on Chrome Web Store',
            style: { display: 'inline-flex', alignItems: 'center', gap: '6px' },
          },
          createIcon('chrome', { size: 15 }),
          el('span', {}, 'Chrome Web Store')
        )
      )
    );
  }

  renderCourseChipsCard() {
    const totalCourses = this.courses.length;

    const selectAllBtn = el(
      'button',
      {
        className: 'btn btn-secondary btn-sm',
        style: { fontSize: '11px', padding: '2px 8px' },
        onClick: async () => {
          this.enabledCourseIds = this.courses.map((c) => c.id);
          await storageManager.setEnabledCoursesForTerm(this.selectedTerm, this.enabledCourseIds);
          this.render();
          await this.onSyncTriggered();
        },
      },
      'Select All'
    );

    const deselectAllBtn = el(
      'button',
      {
        className: 'btn btn-secondary btn-sm',
        style: { fontSize: '11px', padding: '2px 8px' },
        onClick: async () => {
          this.enabledCourseIds = [];
          await storageManager.setEnabledCoursesForTerm(this.selectedTerm, this.enabledCourseIds);
          this.render();
          await this.onSyncTriggered();
        },
      },
      'Deselect All'
    );

    return el(
      'div',
      { className: 'settings-card' },
      el(
        'div',
        { className: 'settings-section-title' },
        el('span', {}, `COURSES IN TERM (${totalCourses})`),
        el('div', { style: { display: 'flex', gap: '6px' } }, selectAllBtn, deselectAllBtn)
      ),
      el(
        'div',
        { style: { fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '8px' } },
        'Click course badges to toggle their inclusion in your Dues calendar and Grades calculations:'
      ),
      this.renderCourseChips()
    );
  }

  renderCourseChips() {
    if (!this.courses || this.courses.length === 0) {
      return el(
        'div',
        { style: { fontSize: '12px', color: 'var(--text-muted)', padding: '10px 0' } },
        'No courses discovered for this term.'
      );
    }

    const grid = el('div', { className: 'filter-chips-grid' });

    for (const course of this.courses) {
      const isEnabled = this.enabledCourseIds !== null
        ? this.enabledCourseIds.includes(course.id)
        : Boolean(course.defaultEnabled);

      const chip = el(
        'div',
        {
          className: `course-chip ${isEnabled ? 'is-active' : 'is-inactive'}`,
          title: `Click to ${isEnabled ? 'disable' : 'enable'} ${course.displayName || course.name}`,
          role: 'checkbox',
          'aria-checked': isEnabled ? 'true' : 'false',
          onClick: async () => {
            const currentEnabled = this.enabledCourseIds !== null
              ? new Set(this.enabledCourseIds)
              : new Set(this.courses.filter((c) => c.defaultEnabled).map((c) => c.id));

            if (isEnabled) {
              currentEnabled.delete(course.id);
            } else {
              currentEnabled.add(course.id);
            }

            this.enabledCourseIds = Array.from(currentEnabled);
            await storageManager.setEnabledCoursesForTerm(this.selectedTerm, this.enabledCourseIds);
            this.render();
            await this.onSyncTriggered();
          },
        },
        el(
          'span',
          { className: 'course-chip-icon', style: { display: 'inline-flex', alignItems: 'center' } },
          isEnabled
            ? createIcon('check', { size: 12, strokeWidth: 2.5 })
            : createIcon('circle', { size: 12, strokeWidth: 1.5 })
        ),
        el('span', {}, course.displayName || course.name)
      );

      grid.appendChild(chip);
    }

    return grid;
  }

  renderPreferencesCard() {
    const currentTheme = (typeof document !== 'undefined' && document.documentElement.getAttribute('data-theme')) || 'auto';

    return el(
      'div',
      { className: 'settings-card' },
      el(
        'div',
        { className: 'settings-section-title' },
        el('span', {}, 'PREFERENCES')
      ),
      el(
        'div',
        {
          style: {
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
            gap: '16px',
            alignItems: 'center',
          },
        },
        el(
          'div',
          {},
          el('div', { style: { fontSize: '12px', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '4px' } }, 'Active Term'),
          this.renderTermSelect()
        ),
        el(
          'div',
          {},
          el('div', { style: { fontSize: '12px', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '4px' } }, 'Theme & Appearance'),
          this.renderThemeSelect(currentTheme)
        )
      )
    );
  }

  renderThemeSelect(currentTheme) {
    const select = el('select', {
      className: 'select-input',
      style: { width: '100%' },
      onChange: async (e) => {
        const theme = e.target.value;
        if (theme === 'auto') {
          document.documentElement.removeAttribute('data-theme');
        } else {
          document.documentElement.setAttribute('data-theme', theme);
        }
        await storageManager.set('theme', theme);
      },
    });

    const options = [
      { value: 'auto', label: 'System Default' },
      { value: 'light', label: 'Light Mode' },
      { value: 'dark', label: 'Dark Mode' },
    ];

    for (const opt of options) {
      const optionEl = el('option', { value: opt.value, selected: opt.value === currentTheme }, opt.label);
      select.appendChild(optionEl);
    }
    return select;
  }

  renderTermSelect() {
    const select = el('select', {
      className: 'select-input',
      style: { width: '100%' },
      onChange: async (e) => {
        const newTerm = e.target.value;
        this.selectedTerm = newTerm;
        await storageManager.set('selectedTerm', newTerm);
        this.enabledCourseIds = await storageManager.getEnabledCoursesForTerm(newTerm);
        await this.onTermChanged(newTerm);
      },
    });

    if (!this.terms || this.terms.length === 0) {
      select.appendChild(el('option', { value: '' }, 'No terms found'));
      return select;
    }

    for (const term of this.terms) {
      const option = el(
        'option',
        { value: term.termCode, selected: term.termCode === this.selectedTerm },
        `${term.termLabel} (${term.termCode})`
      );
      select.appendChild(option);
    }

    return select;
  }

  renderSyncCard() {
    const lastSyncFormatted = this.lastSync
      ? new Date(this.lastSync).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', month: 'short', day: 'numeric' })
      : 'Never';

    return el(
      'div',
      {
        className: 'settings-card',
        style: {
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: '14px',
        },
      },
      el(
        'div',
        {},
        el('div', { style: { fontSize: '13px', fontWeight: '700', color: 'var(--text-primary)' } }, 'Data Sync'),
        el('div', { style: { fontSize: '11px', color: 'var(--text-secondary)' } }, `Last updated: ${lastSyncFormatted}`)
      ),
      el(
        'button',
        {
          className: 'btn btn-primary',
          disabled: this.isSyncing,
          style: { display: 'inline-flex', alignItems: 'center', gap: '6px' },
          onClick: async () => {
            this.isSyncing = true;
            this.render();
            try {
              await this.onSyncTriggered();
            } finally {
              this.isSyncing = false;
              this.render();
            }
          },
        },
        this.isSyncing
          ? el('span', { className: 'spinner' })
          : createIcon('refresh-cw', { size: 13, strokeWidth: 2 }),
        el('span', {}, this.isSyncing ? 'Syncing...' : 'Sync Now')
      )
    );
  }

  renderDangerZoneCard() {
    return el(
      'div',
      { className: 'settings-card settings-danger-card' },
      el(
        'div',
        {
          style: {
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '16px',
            flexWrap: 'wrap',
          },
        },
        el(
          'div',
          { style: { maxWidth: '580px' } },
          el(
            'div',
            { style: { fontSize: '13px', fontWeight: '700', color: '#DC2626', marginBottom: '2px' } },
            'Delete Local User Data'
          ),
          el(
            'div',
            { style: { fontSize: '11px', color: 'var(--text-secondary)', lineHeight: '1.45' } },
            'Permanently resets all manual completion checkmarks (including completed & overdue tasks), course selections, and local cache. Your Waterloo LEARN records remain completely untouched.'
          )
        ),
        el(
          'button',
          {
            className: 'btn btn-danger',
            style: { display: 'inline-flex', alignItems: 'center', gap: '6px' },
            onClick: () => {
              this.showDeleteModal = true;
              this.render();
            },
          },
          createIcon('trash-2', { size: 14 }),
          el('span', {}, 'Delete User Data')
        )
      )
    );
  }

  renderDeleteConfirmationModal() {
    const backdrop = el('div', {
      className: 'modal-backdrop',
      onClick: (e) => {
        if (e.target === backdrop) {
          this.showDeleteModal = false;
          this.render();
        }
      },
    });

    const dialog = el(
      'div',
      { className: 'modal-dialog' },
      el(
        'div',
        { className: 'modal-header' },
        el('div', { className: 'modal-header-icon' }, createIcon('triangle-alert', { size: 20 })),
        el('div', { className: 'modal-title' }, 'Delete Local User Data?')
      ),
      el(
        'div',
        { className: 'modal-body' },
        'Are you sure you want to delete all local user data? This will clear all manual completed checkmarks (including overdue tasks), custom course visibility filters, and cached dues from this browser.\n\nYour actual Waterloo LEARN account, submissions, and grades will not be affected.'
      ),
      el(
        'div',
        { className: 'modal-actions' },
        el(
          'button',
          {
            className: 'btn btn-secondary',
            onClick: () => {
              this.showDeleteModal = false;
              this.render();
            },
          },
          'Cancel'
        ),
        el(
          'button',
          {
            className: 'btn btn-danger',
            style: { display: 'inline-flex', alignItems: 'center', gap: '6px' },
            onClick: async () => {
              this.showDeleteModal = false;
              await storageManager.clearAll();
              this.enabledCourseIds = null;
              this.showToast('Local data deleted successfully. Re-syncing...');
              await this.onSyncTriggered();
            },
          },
          createIcon('trash-2', { size: 13 }),
          el('span', {}, 'Yes, Delete Everything')
        )
      )
    );

    backdrop.appendChild(dialog);
    return backdrop;
  }
}
