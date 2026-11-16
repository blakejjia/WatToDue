import { el, clear } from '../utils/dom.js';
import { groupDuesByDate, formatDueRelative } from '../utils/date-utils.js';

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
        cardsContainer.appendChild(this.createTimelineCard(item, now));
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
        cardsContainer.appendChild(this.createTimelineCard(item, now));
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
          cardsContainer.appendChild(this.createTimelineCard(item, now));
        }
        completedGroup.appendChild(cardsContainer);
      }
      timelineContainer.appendChild(completedGroup);
    }

    root.appendChild(timelineContainer);
    this.container.appendChild(root);
  }

  /**
   * Generates a 2-3 letter subject abbreviation & number badge.
   * @param {string} courseName
   */
  getCourseBadge(courseName = '') {
    const clean = courseName.toUpperCase();
    const match = clean.match(/([A-Z]{2,6})\s*(\d{2,3}[A-Z]?)/);
    if (match) {
      return { subj: match[1], num: match[2] };
    }
    const words = clean.split(/[\s-]+/).filter((w) => w.length > 0);
    return {
      subj: words[0]?.slice(0, 4) || 'UW',
      num: words[1]?.slice(0, 3) || '',
    };
  }

  createTimelineCard(due, now) {
    const rel = formatDueRelative(due.dueDate, now);
    const isQuiz = due.type === 'quiz';
    const badgeData = this.getCourseBadge(due.courseName);

    const checkbox = el('input', {
      type: 'checkbox',
      className: 'timeline-checkbox',
      checked: Boolean(due.completed),
      title: due.completed ? 'Mark uncompleted' : 'Mark completed',
      onChange: async (e) => {
        const checked = e.target.checked;
        due.completed = checked;
        await this.onToggleCompleted(due.id, checked);
        this.render();
      },
    });

    // Left info section
    const timeEl = el('div', { className: 'timeline-card-time' }, rel.timeStr);
    const titleEl = el('div', { className: 'timeline-card-title', title: due.title }, due.title);

    const courseLine = el(
      'div',
      { className: 'timeline-card-meta' },
      el('span', { className: 'meta-icon' }, '📚'),
      el('span', { className: 'meta-text' }, due.courseName)
    );

    const locationLine = el(
      'div',
      { className: 'timeline-card-meta location' },
      el('span', { className: 'meta-icon' }, '📍'),
      el('span', { className: 'meta-text' }, isQuiz ? 'Waterloo LEARN Quiz' : 'LEARN Drop Box')
    );

    const pillsRow = el(
      'div',
      { className: 'timeline-card-pills' },
      el(
        'span',
        { className: `status-pill ${isQuiz ? 'pill-quiz' : 'pill-dropbox'}` },
        isQuiz ? 'Quiz' : 'Dropbox'
      ),
      rel.status === 'today'
        ? el('span', { className: 'status-pill pill-today' }, 'Due Today')
        : (rel.status === 'tomorrow' ? el('span', { className: 'status-pill pill-tomorrow' }, 'Tomorrow') : null),
      due.completed
        ? el('span', { className: 'status-pill pill-completed' }, '✓ Completed')
        : null
    );

    const infoContainer = el(
      'div',
      { className: 'timeline-card-left' },
      el('div', { className: 'timeline-card-top-row' }, timeEl, el('label', { className: 'timeline-checkbox-label' }, checkbox)),
      titleEl,
      courseLine,
      locationLine,
      pillsRow
    );

    // Right visual thumbnail
    const thumbEl = el(
      'a',
      {
        href: due.url,
        target: '_blank',
        rel: 'noopener noreferrer',
        className: `timeline-card-thumb ${isQuiz ? 'thumb-quiz' : 'thumb-dropbox'}`,
        title: 'Open in Waterloo LEARN ↗',
        onClick: (e) => {
          if (typeof chrome !== 'undefined' && chrome.tabs) {
            e.preventDefault();
            chrome.tabs.create({ url: due.url });
          }
        },
      },
      el('div', { className: 'thumb-subj' }, badgeData.subj),
      el('div', { className: 'thumb-num' }, badgeData.num),
      el('span', { className: 'thumb-icon' }, '↗')
    );

    const card = el(
      'div',
      { className: `timeline-card ${due.completed ? 'is-completed' : ''}` },
      infoContainer,
      thumbEl
    );

    return card;
  }
}
