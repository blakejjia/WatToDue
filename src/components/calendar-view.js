import { el, clear } from '../utils/dom.js';
import { formatDueRelative, getMonthMatrix, isSameDay } from '../utils/date-utils.js';
import { storageManager } from '../services/storage-manager.js';

export class CalendarView {
  /**
   * @param {HTMLElement} container
   * @param {object} options
   * @param {Array<object>} options.dues
   * @param {() => void} [options.onRefresh]
   */
  constructor(container, options = {}) {
    this.container = container;
    this.dues = options.dues || [];
    this.onRefresh = options.onRefresh || (() => {});

    this.viewMode = 'agenda'; // 'agenda' | 'month'
    const now = new Date();
    this.currentYear = now.getUTCFullYear();
    this.currentMonth = now.getUTCMonth(); // 0-indexed
    this.selectedDayDues = null;
    this.selectedDayStr = null;

    this.render();
  }

  setDues(dues) {
    this.dues = dues || [];
    this.render();
  }

  render() {
    clear(this.container);

    const root = el('div', { className: 'dues-container' });

    // Mode Toggle Bar (Agenda vs Month)
    const toggleBar = el(
      'div',
      { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' } },
      el('span', { style: { fontSize: '12px', fontWeight: '600', color: 'var(--text-secondary)' } },
        `${this.dues.length} Deadlines Total`
      ),
      el(
        'div',
        { className: 'segmented-control' },
        el(
          'button',
          {
            className: this.viewMode === 'agenda' ? 'active' : '',
            onClick: () => {
              this.viewMode = 'agenda';
              this.render();
            },
          },
          'Agenda'
        ),
        el(
          'button',
          {
            className: this.viewMode === 'month' ? 'active' : '',
            onClick: () => {
              this.viewMode = 'month';
              this.render();
            },
          },
          'Calendar'
        )
      )
    );
    root.appendChild(toggleBar);

    if (this.viewMode === 'agenda') {
      root.appendChild(this.renderAgenda());
    } else {
      root.appendChild(this.renderMonthCalendar());
    }

    this.container.appendChild(root);
  }

  renderAgenda() {
    const listContainer = el('div', { className: 'agenda-list' });

    if (!this.dues || this.dues.length === 0) {
      return el(
        'div',
        { className: 'empty-state' },
        el('div', { className: 'empty-state-icon' }, '🎉'),
        el('div', { className: 'empty-state-title' }, 'No upcoming dues!'),
        el('div', { className: 'empty-state-desc' }, 'All assignments and quizzes for your active courses are cleared.')
      );
    }

    const now = new Date();

    const sections = {
      overdue: [],
      today: [],
      tomorrow: [],
      upcoming: [],
      completed: [],
    };

    for (const due of this.dues) {
      if (due.completed) {
        sections.completed.push(due);
        continue;
      }
      const rel = formatDueRelative(due.dueDate, now);
      if (rel.status === 'overdue') sections.overdue.push(due);
      else if (rel.status === 'today') sections.today.push(due);
      else if (rel.status === 'tomorrow') sections.tomorrow.push(due);
      else sections.upcoming.push(due);
    }

    const sectionMeta = [
      { key: 'overdue', label: '🔴 Overdue', className: 'overdue' },
      { key: 'today', label: '🟡 Due Today', className: 'today' },
      { key: 'tomorrow', label: '🟢 Due Tomorrow', className: '' },
      { key: 'upcoming', label: '⚪ Upcoming', className: '' },
      { key: 'completed', label: '✔ Completed', className: '' },
    ];

    for (const sec of sectionMeta) {
      const items = sections[sec.key];
      if (items.length === 0) continue;

      const secEl = el(
        'div',
        { className: 'agenda-section' },
        el('div', { className: `agenda-section-title ${sec.className}` },
          `${sec.label} (${items.length})`
        )
      );

      for (const item of items) {
        secEl.appendChild(this.createDueCard(item, now));
      }
      listContainer.appendChild(secEl);
    }

    return listContainer;
  }

  createDueCard(due, now) {
    const rel = formatDueRelative(due.dueDate, now);

    const checkbox = el('input', {
      type: 'checkbox',
      className: 'due-checkbox',
      checked: Boolean(due.completed),
      onChange: async (e) => {
        const checked = e.target.checked;
        due.completed = checked;
        await storageManager.toggleCompleted(due.id);
        this.render();
      },
    });

    const typeBadge = el(
      'span',
      { className: `badge ${due.type === 'assignment' ? 'badge-assignment' : 'badge-quiz'}` },
      due.type === 'assignment' ? 'Dropbox' : 'Quiz'
    );

    const timingClass = due.completed ? '' : (rel.status === 'overdue' ? 'overdue' : (rel.status === 'today' ? 'today' : ''));

    const card = el(
      'div',
      { className: `due-card ${due.completed ? 'completed' : ''}` },
      el('label', { className: 'due-checkbox-label' }, checkbox),
      el(
        'div',
        { className: 'due-info' },
        el(
          'div',
          { className: 'due-meta' },
          el('span', { className: 'due-course-tag' }, due.courseName),
          typeBadge
        ),
        el('div', { className: 'due-title', title: due.title }, due.title),
        el('div', { className: `due-timing ${timingClass}` },
          due.completed ? `Completed · Due was ${rel.dateStr}` : rel.text
        )
      ),
      el(
        'a',
        {
          className: 'btn btn-secondary btn-sm due-link-btn',
          href: due.url,
          target: '_blank',
          rel: 'noopener noreferrer',
          title: 'Open in LEARN',
        },
        'Open ↗'
      )
    );

    return card;
  }

  renderMonthCalendar() {
    const container = el('div', { className: 'calendar-matrix-container' });

    const monthNames = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December',
    ];

    // Calendar Navigation Header
    const header = el(
      'div',
      { className: 'calendar-header' },
      el('button', {
        className: 'calendar-nav-btn',
        title: 'Previous Month',
        onClick: () => {
          if (this.currentMonth === 0) {
            this.currentMonth = 11;
            this.currentYear--;
          } else {
            this.currentMonth--;
          }
          this.render();
        },
      }, '‹'),
      el('div', { className: 'calendar-month-title' },
        `${monthNames[this.currentMonth]} ${this.currentYear}`
      ),
      el('button', {
        className: 'calendar-nav-btn',
        title: 'Next Month',
        onClick: () => {
          if (this.currentMonth === 11) {
            this.currentMonth = 0;
            this.currentYear++;
          } else {
            this.currentMonth++;
          }
          this.render();
        },
      }, '›')
    );
    container.appendChild(header);

    // Weekday names
    const weekdaysRow = el('div', { className: 'calendar-weekdays-row' });
    for (const day of ['S', 'M', 'T', 'W', 'T', 'F', 'S']) {
      weekdaysRow.appendChild(el('div', {}, day));
    }
    container.appendChild(weekdaysRow);

    // Calendar Matrix Cells
    const grid = el('div', { className: 'calendar-grid' });
    const cells = getMonthMatrix(this.currentYear, this.currentMonth);
    const now = new Date();

    for (const cell of cells) {
      const cellDues = this.dues.filter((d) => isSameDay(d.dueDate, cell.date));
      const hasDues = cellDues.length > 0;
      const isToday = isSameDay(cell.date, now);

      const cellEl = el(
        'div',
        {
          className: `calendar-cell ${cell.isCurrentMonth ? '' : 'other-month'} ${isToday ? 'is-today' : ''} ${hasDues ? 'has-dues' : ''}`,
          onClick: () => {
            if (hasDues) {
              this.selectedDayDues = cellDues;
              this.selectedDayStr = cell.date.toLocaleDateString([], { month: 'short', day: 'numeric', weekday: 'short' });
              this.render();
            }
          },
        },
        el('span', { className: 'cell-day-num' }, String(cell.dayNum))
      );

      if (hasDues) {
        const chipsContainer = el('div', { className: 'cell-chips' });
        for (const item of cellDues) {
          chipsContainer.appendChild(
            el('span', { className: `cell-dot ${item.type === 'assignment' ? 'assignment' : 'quiz'}` })
          );
        }
        cellEl.appendChild(chipsContainer);
      }

      grid.appendChild(cellEl);
    }
    container.appendChild(grid);

    // Day Dues Flyout
    if (this.selectedDayDues && this.selectedDayDues.length > 0) {
      const flyout = el('div', { className: 'day-dues-flyout' });
      const flyoutTitle = el(
        'div',
        { className: 'flyout-title' },
        el('span', {}, `Dues on ${this.selectedDayStr} (${this.selectedDayDues.length})`),
        el('button', {
          className: 'btn btn-secondary btn-sm',
          onClick: () => {
            this.selectedDayDues = null;
            this.render();
          },
        }, '✕')
      );
      flyout.appendChild(flyoutTitle);

      for (const item of this.selectedDayDues) {
        flyout.appendChild(this.createDueCard(item, now));
      }
      container.appendChild(flyout);
    }

    return container;
  }
}
