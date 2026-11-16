import { el, clear } from '../utils/dom.js';
import { groupDuesByDate } from '../utils/date-utils.js';
import { createTimelineCard } from './timeline-card.js';

export class PopupDueList {
  /**
   * @param {HTMLElement} container
   * @param {object} options
   * @param {Array<object>} options.dues
   * @param {(dueId: string, completed: boolean) => Promise<void>} options.onToggleCompleted
   */
  constructor(container, options = {}) {
    this.container = container;
    this.dues = options.dues || [];
    this.onToggleCompleted = options.onToggleCompleted || (async () => {});
    this.showCompleted = false;

    this.render();
  }

  setDues(dues) {
    this.dues = dues || [];
    this.render();
  }

  render() {
    clear(this.container);

    const root = el('div', { className: 'timeline-view' });

    if (!this.dues || this.dues.length === 0) {
      root.appendChild(
        el(
          'div',
          { className: 'timeline-empty-state' },
          el('div', { className: 'timeline-empty-icon' }, '🎉'),
          el('div', { className: 'timeline-empty-title' }, 'No upcoming dues!'),
          el(
            'div',
            { className: 'timeline-empty-desc' },
            'You are all caught up for your active courses in Waterloo LEARN.'
          )
        )
      );
      this.container.appendChild(root);
      return;
    }

    const { overdue, dateGroups, completed } = groupDuesByDate(this.dues);
    const now = new Date();

    const timelineContainer = el('div', { className: 'timeline-container' });

    // Continuous timeline spine line
    const spine = el('div', { className: 'timeline-spine' });
    timelineContainer.appendChild(spine);

    const handleToggle = async (dueId, isChecked) => {
      await this.onToggleCompleted(dueId, isChecked);
      const item = this.dues.find((d) => d.id === dueId);
      if (item) item.completed = isChecked;
      this.render();
    };

    // 1. Overdue Section (if any uncompleted past items exist)
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

      const cardsContainer = el('div', { className: 'timeline-cards' });
      for (const item of overdue) {
        cardsContainer.appendChild(createTimelineCard(item, now, handleToggle));
      }
      overdueGroup.appendChild(cardsContainer);
      timelineContainer.appendChild(overdueGroup);
    }

    // 2. Chronological Upcoming Date Groups
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

      const cardsContainer = el('div', { className: 'timeline-cards' });
      for (const item of group.items) {
        cardsContainer.appendChild(createTimelineCard(item, now, handleToggle));
      }
      groupEl.appendChild(cardsContainer);
      timelineContainer.appendChild(groupEl);
    }

    // 3. Completed Section (Collapsible)
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
        const cardsContainer = el('div', { className: 'timeline-cards' });
        for (const item of completed) {
          cardsContainer.appendChild(createTimelineCard(item, now, handleToggle));
        }
        completedGroup.appendChild(cardsContainer);
      }
      timelineContainer.appendChild(completedGroup);
    }

    root.appendChild(timelineContainer);
    this.container.appendChild(root);
  }
}
