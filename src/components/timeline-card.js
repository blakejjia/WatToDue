import { el } from '../utils/dom.js';
import { formatDueRelative } from '../utils/date-utils.js';
import { createIcon } from '../utils/icons.js';

/**
 * Extracts 2-4 letter subject abbreviation & course number.
 * @param {string} courseName
 * @returns {{ subj: string, num: string }}
 */
export function getCourseBadge(courseName = '') {
  const clean = String(courseName || '').toUpperCase();
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

/**
 * Creates a standalone Luma-style timeline card element.
 * @param {object} due
 * @param {Date} now
 * @param {(dueId: string, completed: boolean) => Promise<void> | void} [onToggleCompleted]
 * @returns {HTMLElement}
 */
export function createTimelineCard(due, now = new Date(), onToggleCompleted = () => {}) {
  const rel = formatDueRelative(due.dueDate, now);
  const isQuiz = due.type === 'quiz';
  const badgeData = getCourseBadge(due.courseName);

  const checkbox = el('input', {
    type: 'checkbox',
    className: 'timeline-checkbox',
    checked: Boolean(due.completed),
    title: due.completed ? 'Mark uncompleted' : 'Mark completed',
    onChange: async (e) => {
      const checked = e.target.checked;
      due.completed = checked;
      await onToggleCompleted(due.id, checked);
    },
  });

  // Left column information
  const timeEl = el('div', { className: 'timeline-card-time' }, rel.timeStr);
  const titleEl = el('div', { className: 'timeline-card-title', title: due.title }, due.title);

  const courseLine = el(
    'div',
    { className: 'timeline-card-meta' },
    el('span', { className: 'meta-icon' }, createIcon('book-open', { size: 13 })),
    el('span', { className: 'meta-text' }, due.courseName)
  );

  const locationLine = el(
    'div',
    { className: 'timeline-card-meta location' },
    el('span', { className: 'meta-icon' }, createIcon('map-pin', { size: 13 })),
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
      ? el('span', { className: 'status-pill pill-completed', style: { display: 'inline-flex', alignItems: 'center', gap: '3px' } }, createIcon('check', { size: 11 }), el('span', {}, 'Completed'))
      : null
  );

  const infoContainer = el(
    'div',
    { className: 'timeline-card-left' },
    el(
      'div',
      { className: 'timeline-card-top-row' },
      timeEl,
      el('label', { className: 'timeline-checkbox-label' }, checkbox)
    ),
    titleEl,
    courseLine,
    locationLine,
    pillsRow
  );

  // Right column visual tile
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
    el('span', { className: 'thumb-icon' }, createIcon('external-link', { size: 12 }))
  );

  const card = el(
    'div',
    { className: `timeline-card ${due.completed ? 'is-completed' : ''}` },
    infoContainer,
    thumbEl
  );

  return card;
}
