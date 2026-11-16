import { el, clear } from '../utils/dom.js';
import { formatDueRelative, getMonthMatrix, isSameDay, groupDuesByDate } from '../utils/date-utils.js';
import { createTimelineCard } from './timeline-card.js';
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
    this.showCompleted = false; // Collapsible completed section
    const now = new Date();
    this.currentYear = now.getFullYear();
    this.currentMonth = now.getMonth(); // 0-indexed
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

    const activeCount = this.dues.filter((d) => !d.completed).length;
    const completedCount = this.dues.filter((d) => d.completed).length;

    // Mode Toggle Bar (Agenda vs Month)
    const toggleBar = el(
      'div',
      { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' } },
      el(
        'div',
        { style: { display: 'flex', flexDirection: 'column' } },
        el(
          'span',
          { style: { fontSize: '14px', fontWeight: '800', color: 'var(--text-primary)' } },
          `${activeCount} Pending Due${activeCount === 1 ? '' : 's'}`
        ),
        completedCount > 0
          ? el(
              'span',
              { style: { fontSize: '12px', color: 'var(--text-secondary)' } },
              `${completedCount} completed items`
            )
          : null
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
    if (!this.dues || this.dues.length === 0) {
      return el(
        'div',
        { className: 'empty-state' },
        el('div', { className: 'empty-state-icon' }, '🎉'),
        el('div', { className: 'empty-state-title' }, 'No upcoming dues!'),
        el('div', { className: 'empty-state-desc' }, 'All assignments and quizzes for your active courses are cleared.')
      );
    }

    const { overdue, dateGroups, completed } = groupDuesByDate(this.dues);
    const now = new Date();

    const timelineContainer = el('div', { className: 'timeline-container fullpage-timeline' });

    // Vertical spine line
    const spine = el('div', { className: 'timeline-spine' });
    timelineContainer.appendChild(spine);

    const onToggle = async (dueId, completedVal) => {
      await storageManager.toggleCompleted(dueId);
      const targetDue = this.dues.find((d) => d.id === dueId);
      if (targetDue) targetDue.completed = completedVal;
      this.render();
      if (this.onRefresh) this.onRefresh();
    };

    // 1. Overdue section (if any)
    if (overdue.length > 0) {
      const overdueGroup = el('div', { className: 'timeline-group overdue' });
      const nodeHeader = el(
        'div',
        { className: 'timeline-node-header' },
        el('div', { className: 'timeline-dot overdue-dot' }),
        el(
          'div',
          { className: 'timeline-date-label' },
          el('strong', { className: 'timeline-date-bold overdue-text' }, 'Overdue'),
          el('span', { className: 'timeline-weekday overdue-text' }, `${overdue.length} items require attention`)
        )
      );
      overdueGroup.appendChild(nodeHeader);

      const grid = el('div', { className: 'timeline-cards-grid' });
      for (const item of overdue) {
        grid.appendChild(createTimelineCard(item, now, onToggle));
      }
      overdueGroup.appendChild(grid);
      timelineContainer.appendChild(overdueGroup);
    }

    // 2. Upcoming date groups (chronological, e.g. Nov 24, Nov 27, Dec 4)
    for (const group of dateGroups) {
      const comp = group.components || { bold: group.header, subtitle: '' };
      const groupEl = el('div', { className: `timeline-group ${comp.isToday ? 'is-today' : ''}` });

      const nodeHeader = el(
        'div',
        { className: 'timeline-node-header' },
        el('div', { className: `timeline-dot ${comp.isToday ? 'today-dot' : ''}` }),
        el(
          'div',
          { className: 'timeline-date-label' },
          el('strong', { className: 'timeline-date-bold' }, comp.bold),
          comp.subtitle ? el('span', { className: 'timeline-weekday' }, comp.subtitle) : null
        )
      );
      groupEl.appendChild(nodeHeader);

      const grid = el('div', { className: 'timeline-cards-grid' });
      for (const item of group.items) {
        grid.appendChild(createTimelineCard(item, now, onToggle));
      }
      groupEl.appendChild(grid);
      timelineContainer.appendChild(groupEl);
    }

    // 3. Completed section (collapsible)
    if (completed.length > 0) {
      const completedGroup = el('div', { className: 'timeline-group completed' });
      const nodeHeader = el(
        'div',
        {
          className: 'timeline-node-header completed-toggle',
          onClick: () => {
            this.showCompleted = !this.showCompleted;
            this.render();
          },
        },
        el('div', { className: 'timeline-dot completed-dot' }),
        el(
          'div',
          { className: 'timeline-date-label' },
          el('strong', { className: 'timeline-date-bold' }, 'Completed'),
          el('span', { className: 'timeline-weekday' }, `${completed.length} cleared`)
        ),
        el(
          'span',
          { className: 'timeline-toggle-pill' },
          this.showCompleted ? 'Hide ▲' : 'Show ▼'
        )
      );
      completedGroup.appendChild(nodeHeader);

      if (this.showCompleted) {
        const grid = el('div', { className: 'timeline-cards-grid' });
        for (const item of completed) {
          grid.appendChild(createTimelineCard(item, now, onToggle));
        }
        completedGroup.appendChild(grid);
      }
      timelineContainer.appendChild(completedGroup);
    }

    return timelineContainer;
  }

  createDueCard(due, now) {
    return createTimelineCard(due, now, async (dueId, completed) => {
      due.completed = completed;
      await storageManager.toggleCompleted(due.id);
      this.render();
      if (this.onRefresh) this.onRefresh();
    });
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

      const flyoutGrid = el('div', { className: 'timeline-cards-grid', style: { paddingLeft: '0' } });
      for (const item of this.selectedDayDues) {
        flyoutGrid.appendChild(this.createDueCard(item, now));
      }
      flyout.appendChild(flyoutGrid);
      container.appendChild(flyout);
    }

    return container;
  }
}
