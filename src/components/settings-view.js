import { el, clear } from '../utils/dom.js';
import { storageManager } from '../services/storage-manager.js';
import { syncService } from '../services/sync-service.js';

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

    this.loadStateAndRender();
  }

  async loadStateAndRender() {
    this.enabledCourseIds = await storageManager.get('enabledCourseIds', null);
    this.render();
  }

  setData({ user, terms, selectedTerm, courses, lastSync }) {
    if (user !== undefined) this.user = user;
    if (terms !== undefined) this.terms = terms;
    if (selectedTerm !== undefined) this.selectedTerm = selectedTerm;
    if (courses !== undefined) this.courses = courses;
    if (lastSync !== undefined) this.lastSync = lastSync;
    this.render();
  }

  render() {
    clear(this.container);

    const root = el('div', { style: { display: 'flex', flexDirection: 'column', gap: '16px' } });

    // 1. User & Authentication Status
    const sessionCard = el(
      'div',
      {
        style: {
          backgroundColor: 'var(--bg-surface)',
          border: '1px solid var(--border-color)',
          borderRadius: 'var(--border-radius-md)',
          padding: '14px',
          boxShadow: 'var(--shadow-sm)',
        },
      },
      el('div', { style: { fontSize: '11px', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase' } },
        'Account & Connection'
      ),
      el(
        'div',
        { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '6px' } },
        el(
          'div',
          {},
          el('div', { style: { fontSize: '14px', fontWeight: '700', color: 'var(--text-primary)' } },
            this.user ? `${this.user.firstName} ${this.user.lastName}` : 'Not Connected'
          ),
          el('div', { style: { fontSize: '11px', color: 'var(--text-secondary)' } },
            this.user ? `ID: ${this.user.identifier || this.user.uniqueName} · Waterloo LEARN` : 'Session cookie not detected'
          )
        ),
        el(
          'a',
          {
            className: 'btn btn-secondary btn-sm',
            href: 'https://learn.uwaterloo.ca',
            target: '_blank',
            rel: 'noopener noreferrer',
          },
          this.user ? 'Open LEARN ↗' : 'Log in to LEARN'
        )
      )
    );
    root.appendChild(sessionCard);

    // 2. Academic Term Selection
    const termCard = el(
      'div',
      {
        style: {
          backgroundColor: 'var(--bg-surface)',
          border: '1px solid var(--border-color)',
          borderRadius: 'var(--border-radius-md)',
          padding: '14px',
          boxShadow: 'var(--shadow-sm)',
        },
      },
      el('div', { style: { fontSize: '11px', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '8px' } },
        'Active Academic Term'
      ),
      el('div', { style: { display: 'flex', gap: '8px', alignItems: 'center' } },
        this.renderTermSelect(),
        el('span', { style: { fontSize: '11px', color: 'var(--text-muted)' } },
          'Controls which courses are synced for calendar & grades'
        )
      )
    );
    root.appendChild(termCard);

    // 3. Course Inspector & Inclusion Toggles
    const courseCard = el(
      'div',
      {
        style: {
          backgroundColor: 'var(--bg-surface)',
          border: '1px solid var(--border-color)',
          borderRadius: 'var(--border-radius-md)',
          padding: '14px',
          boxShadow: 'var(--shadow-sm)',
        },
      },
      el(
        'div',
        { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' } },
        el('div', { style: { fontSize: '11px', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase' } },
          `Courses in Term (${this.courses.length})`
        ),
        el('span', { style: { fontSize: '11px', color: 'var(--text-muted)' } },
          'Check to include in Dues & Grades'
        )
      ),
      this.renderCoursesList()
    );
    root.appendChild(courseCard);

    // 4. Synchronization & Cache Controls
    const lastSyncFormatted = this.lastSync
      ? new Date(this.lastSync).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', month: 'short', day: 'numeric' })
      : 'Never';

    const syncCard = el(
      'div',
      {
        style: {
          backgroundColor: 'var(--bg-surface)',
          border: '1px solid var(--border-color)',
          borderRadius: 'var(--border-radius-md)',
          padding: '14px',
          boxShadow: 'var(--shadow-sm)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        },
      },
      el(
        'div',
        {},
        el('div', { style: { fontSize: '13px', fontWeight: '600', color: 'var(--text-primary)' } }, 'Data Sync'),
        el('div', { style: { fontSize: '11px', color: 'var(--text-secondary)' } }, `Last updated: ${lastSyncFormatted}`)
      ),
      el(
        'button',
        {
          className: 'btn btn-primary',
          disabled: this.isSyncing,
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
        this.isSyncing ? el('span', { className: 'spinner' }) : '↻',
        this.isSyncing ? 'Syncing...' : 'Sync Now'
      )
    );
    root.appendChild(syncCard);

    // 5. Version & Info
    const infoFooter = el(
      'div',
      { style: { textAlign: 'center', fontSize: '11px', color: 'var(--text-muted)', marginTop: '8px' } },
      'WatToDue v1.0.0 · Made for UWaterloo Warriors · Open Source'
    );
    root.appendChild(infoFooter);

    this.container.appendChild(root);
  }

  renderTermSelect() {
    const select = el('select', {
      className: 'select-input',
      onChange: async (e) => {
        const newTerm = e.target.value;
        this.selectedTerm = newTerm;
        await storageManager.set('selectedTerm', newTerm);
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

  renderCoursesList() {
    if (!this.courses || this.courses.length === 0) {
      return el(
        'div',
        { style: { fontSize: '12px', color: 'var(--text-muted)', padding: '10px 0' } },
        'No courses discovered for this term.'
      );
    }

    const list = el('div', { style: { display: 'flex', flexDirection: 'column', gap: '8px' } });

    for (const course of this.courses) {
      const isEnabled = this.enabledCourseIds !== null
        ? this.enabledCourseIds.includes(course.id)
        : Boolean(course.defaultEnabled);

      const checkbox = el('input', {
        type: 'checkbox',
        className: 'due-checkbox',
        checked: isEnabled,
        onChange: async (e) => {
          const checked = e.target.checked;
          const currentEnabled = this.enabledCourseIds !== null
            ? new Set(this.enabledCourseIds)
            : new Set(this.courses.filter((c) => c.defaultEnabled).map((c) => c.id));

          if (checked) {
            currentEnabled.add(course.id);
          } else {
            currentEnabled.delete(course.id);
          }

          this.enabledCourseIds = Array.from(currentEnabled);
          await storageManager.set('enabledCourseIds', this.enabledCourseIds);
        },
      });

      const componentBadgeClass = course.component === 'LEC'
        ? 'badge-assignment'
        : (course.component === 'LAB' ? 'badge-quiz' : 'badge-overdue');

      const itemRow = el(
        'label',
        {
          style: {
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '8px 10px',
            backgroundColor: 'var(--bg-app)',
            borderRadius: 'var(--border-radius-sm)',
            cursor: 'pointer',
          },
        },
        el(
          'div',
          { style: { display: 'flex', alignItems: 'center', gap: '10px' } },
          checkbox,
          el(
            'div',
            {},
            el('div', { style: { fontSize: '12px', fontWeight: '600', color: 'var(--text-primary)' } },
              course.displayName || course.name
            ),
            el('div', { style: { fontSize: '10px', color: 'var(--text-muted)' } }, course.code)
          )
        ),
        el('span', { className: `badge ${componentBadgeClass}` }, course.component || 'OFFERING')
      );

      list.appendChild(itemRow);
    }

    return list;
  }
}
