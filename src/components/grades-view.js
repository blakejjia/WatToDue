import { el, clear } from '../utils/dom.js';
import { getCourseBadge } from './timeline-card.js';

/**
 * Returns letter grade string for University of Waterloo grading scale.
 * @param {number|null} percent
 * @returns {string|null}
 */
export function getLetterGrade(percent) {
  if (percent === null || percent === undefined) return null;
  if (percent >= 90) return 'A+';
  if (percent >= 85) return 'A';
  if (percent >= 80) return 'A-';
  if (percent >= 77) return 'B+';
  if (percent >= 73) return 'B';
  if (percent >= 70) return 'B-';
  if (percent >= 67) return 'C+';
  if (percent >= 63) return 'C';
  if (percent >= 60) return 'C-';
  if (percent >= 50) return 'D';
  return 'F';
}

/**
 * Cleanly formats a raw score/number without ugly long float precision.
 * @param {number|string|null} val
 * @returns {string}
 */
export function formatScore(val) {
  if (val === null || val === undefined) return '--';
  const num = typeof val === 'number' ? val : parseFloat(val);
  if (isNaN(num)) return String(val);
  if (Number.isInteger(num)) return String(num);
  return (Math.round(num * 100) / 100).toFixed(num % 1 === 0 ? 0 : (Math.round(num * 10) / 10 === num ? 1 : 2));
}

/**
 * Returns color category for percentage.
 * @param {number|null} percent
 * @returns {{ bg: string, text: string, bar: string }}
 */
function getGradeColorTokens(percent) {
  if (percent === null || percent === undefined) {
    return { bg: 'var(--border-color)', text: 'var(--text-muted)', bar: '#9ca3af' };
  }
  if (percent >= 80) {
    return { bg: 'rgba(16, 185, 129, 0.12)', text: '#059669', bar: '#10b981' };
  }
  if (percent >= 70) {
    return { bg: 'rgba(59, 130, 246, 0.12)', text: '#2563eb', bar: '#3b82f6' };
  }
  if (percent >= 60) {
    return { bg: 'rgba(245, 158, 11, 0.12)', text: '#d97706', bar: '#f59e0b' };
  }
  return { bg: 'rgba(239, 68, 68, 0.12)', text: '#dc2626', bar: '#ef4444' };
}

export class GradesView {
  /**
   * @param {HTMLElement} container
   * @param {object} options
   * @param {Array<object>} options.courses
   * @param {Record<number, Array<object>>} options.gradesMap
   */
  constructor(container, options = {}) {
    this.container = container;
    this.courses = options.courses || [];
    this.gradesMap = options.gradesMap || {};

    // Filter states
    this.searchQuery = '';
    this.activeFilter = 'all'; // 'all' | 'graded' | 'ungraded'
    this.viewLayout = 'table'; // 'table' | 'cards'

    // Select first course with grades or first course
    const firstCourseWithGrades = this.courses.find(
      (c) => this.gradesMap[c.id] && this.gradesMap[c.id].length > 0
    );
    this.selectedCourseId = firstCourseWithGrades ? firstCourseWithGrades.id : (this.courses[0]?.id || null);

    this.render();
  }

  setData(courses, gradesMap) {
    this.courses = courses || [];
    this.gradesMap = gradesMap || {};
    if (!this.selectedCourseId && this.courses.length > 0) {
      this.selectedCourseId = this.courses[0].id;
    }
    this.render();
  }

  render() {
    clear(this.container);

    if (!this.courses || this.courses.length === 0) {
      this.container.appendChild(
        el(
          'div',
          { className: 'empty-state' },
          el('div', { className: 'empty-state-icon' }, '📊'),
          el('div', { className: 'empty-state-title' }, 'No Courses Found'),
          el('div', { className: 'empty-state-desc' }, 'Sync your Waterloo LEARN courses in Settings to view grades.')
        )
      );
      return;
    }

    const root = el('div', { className: 'grades-container' });

    // 1. Course Tabs Strip (Horizontal scrollable, accessible role="tablist")
    const tabsStrip = el('div', {
      className: 'course-tabs-strip',
      role: 'tablist',
      'aria-label': 'Select Course',
    });

    for (const course of this.courses) {
      const itemsCount = this.gradesMap[course.id]?.length || 0;
      const isActive = this.selectedCourseId === course.id;
      const badge = getCourseBadge(course.displayName || course.name);

      const tabBtn = el(
        'button',
        {
          type: 'button',
          role: 'tab',
          'aria-selected': isActive ? 'true' : 'false',
          className: `course-tab-pill ${isActive ? 'active' : ''}`,
          onClick: (e) => {
            this.selectedCourseId = course.id;
            this.searchQuery = '';
            this.render();
            // Smoothly center the tab into view
            e.currentTarget.scrollIntoView({ inline: 'nearest', block: 'nearest', behavior: 'smooth' });
          },
        },
        el('span', { className: 'tab-course-code' }, `${badge.subj} ${badge.num}`),
        el('span', { className: 'tab-items-badge' }, String(itemsCount))
      );
      tabsStrip.appendChild(tabBtn);
    }
    root.appendChild(tabsStrip);

    // 2. Selected Course Summary Hero
    const selectedCourse = this.courses.find((c) => c.id === this.selectedCourseId) || this.courses[0];
    const gradeItems = this.gradesMap[selectedCourse.id] || [];
    const courseBadge = getCourseBadge(selectedCourse.displayName || selectedCourse.name);

    let totalWeightedScore = 0;
    let totalWeightedMax = 0;
    let hasWeighted = false;

    let totalRawScore = 0;
    let totalRawMax = 0;
    let scoredItemsCount = 0;

    for (const item of gradeItems) {
      if (typeof item.weightedScore === 'number' && typeof item.weightedMax === 'number' && item.weightedMax > 0) {
        totalWeightedScore += item.weightedScore;
        totalWeightedMax += item.weightedMax;
        hasWeighted = true;
      }
      if (typeof item.score === 'number' && typeof item.maxScore === 'number' && item.maxScore > 0) {
        totalRawScore += item.score;
        totalRawMax += item.maxScore;
        scoredItemsCount++;
      }
    }

    let overallPercent = null;
    let scoreLabel = '';

    if (hasWeighted && totalWeightedMax > 0) {
      overallPercent = Math.round((totalWeightedScore / totalWeightedMax) * 1000) / 10;
      scoreLabel = `${formatScore(totalWeightedScore)} / ${formatScore(totalWeightedMax)} weighted pts`;
    } else if (totalRawMax > 0) {
      overallPercent = Math.round((totalRawScore / totalRawMax) * 1000) / 10;
      scoreLabel = `${formatScore(totalRawScore)} / ${formatScore(totalRawMax)} raw pts`;
    }

    const letterGrade = getLetterGrade(overallPercent);
    const colorTokens = getGradeColorTokens(overallPercent);

    const summaryCard = el(
      'div',
      { className: 'grades-hero-card' },
      el(
        'div',
        { className: 'hero-card-top' },
        // Left info
        el(
          'div',
          { className: 'hero-course-group' },
          el(
            'div',
            { className: 'hero-badge-tile' },
            el('span', { className: 'hero-badge-subj' }, courseBadge.subj),
            el('span', { className: 'hero-badge-num' }, courseBadge.num)
          ),
          el(
            'div',
            { className: 'hero-course-details' },
            el('h2', { className: 'hero-course-name' }, selectedCourse.displayName || selectedCourse.name),
            el('div', { className: 'hero-course-code' }, selectedCourse.code || ''),
            el(
              'div',
              { className: 'hero-meta-chips' },
              el('span', { className: 'hero-chip' }, `📝 ${scoredItemsCount} of ${gradeItems.length} graded`),
              scoreLabel ? el('span', { className: 'hero-chip' }, `⚖ ${scoreLabel}`) : null
            )
          )
        ),
        // Right overall grade
        el(
          'div',
          { className: 'hero-grade-score-group' },
          el(
            'div',
            { className: 'hero-grade-row' },
            el(
              'span',
              { className: 'hero-score-val' },
              overallPercent !== null ? `${overallPercent}%` : '--'
            ),
            letterGrade
              ? el(
                  'span',
                  {
                    className: 'hero-letter-badge',
                    style: { backgroundColor: colorTokens.bg, color: colorTokens.text },
                  },
                  letterGrade
                )
              : null
          ),
          el(
            'div',
            { className: 'hero-score-sub' },
            overallPercent !== null
              ? (overallPercent >= 80 ? 'Excellent Standing' : (overallPercent >= 70 ? 'Good Standing' : 'Passing'))
              : 'No graded entries yet'
          )
        )
      ),
      // Progress Bar
      el(
        'div',
        { className: 'hero-progress-track' },
        el('div', {
          className: 'hero-progress-fill',
          style: {
            width: `${Math.min(100, Math.max(0, overallPercent || 0))}%`,
            backgroundColor: colorTokens.bar,
          },
        })
      )
    );
    root.appendChild(summaryCard);

    // 3. Filter & View Mode Bar
    const filterRow = el(
      'div',
      { className: 'grades-filter-bar' },
      el(
        'div',
        { className: 'filter-pills-group' },
        el(
          'button',
          {
            className: `filter-btn ${this.activeFilter === 'all' ? 'active' : ''}`,
            onClick: () => {
              this.activeFilter = 'all';
              this.render();
            },
          },
          `All (${gradeItems.length})`
        ),
        el(
          'button',
          {
            className: `filter-btn ${this.activeFilter === 'graded' ? 'active' : ''}`,
            onClick: () => {
              this.activeFilter = 'graded';
              this.render();
            },
          },
          `Graded (${scoredItemsCount})`
        ),
        el(
          'button',
          {
            className: `filter-btn ${this.activeFilter === 'ungraded' ? 'active' : ''}`,
            onClick: () => {
              this.activeFilter = 'ungraded';
              this.render();
            },
          },
          `Ungraded (${gradeItems.length - scoredItemsCount})`
        )
      ),
      el(
        'div',
        { className: 'grades-filter-right' },
        // Search Input
        el('input', {
          type: 'text',
          placeholder: 'Search assessments...',
          value: this.searchQuery,
          className: 'grades-search-input',
          onInput: (e) => {
            this.searchQuery = e.target.value.toLowerCase();
            this.renderFilteredList(root, gradeItems);
          },
        }),
        // View layout toggles
        el(
          'div',
          { className: 'segmented-control' },
          el(
            'button',
            {
              className: this.viewLayout === 'table' ? 'active' : '',
              title: 'Table View',
              onClick: () => {
                this.viewLayout = 'table';
                this.render();
              },
            },
            'Table'
          ),
          el(
            'button',
            {
              className: this.viewLayout === 'cards' ? 'active' : '',
              title: 'Card Grid View',
              onClick: () => {
                this.viewLayout = 'cards';
                this.render();
              },
            },
            'Cards'
          )
        )
      )
    );
    root.appendChild(filterRow);

    // 4. Grade Items Table / Cards Container
    this.listContainer = el('div', { className: 'grade-items-wrapper' });
    root.appendChild(this.listContainer);
    this.renderFilteredList(root, gradeItems);

    this.container.appendChild(root);
  }

  renderFilteredList(root, allItems) {
    if (!this.listContainer) return;
    clear(this.listContainer);

    let filtered = allItems;

    // Apply status filter
    if (this.activeFilter === 'graded') {
      filtered = filtered.filter((i) => typeof i.score === 'number' || typeof i.percent === 'number');
    } else if (this.activeFilter === 'ungraded') {
      filtered = filtered.filter((i) => i.score === null && i.percent === null);
    }

    // Apply search query
    if (this.searchQuery) {
      filtered = filtered.filter((i) => i.name.toLowerCase().includes(this.searchQuery));
    }

    if (filtered.length === 0) {
      this.listContainer.appendChild(
        el(
          'div',
          { className: 'empty-state', style: { padding: '40px 16px' } },
          el('div', { className: 'empty-state-icon' }, '🔍'),
          el('div', { className: 'empty-state-title' }, 'No Grade Items Found'),
          el(
            'div',
            { className: 'empty-state-desc' },
            this.searchQuery ? `No items matched "${this.searchQuery}".` : 'No grade items in this category.'
          )
        )
      );
      return;
    }

    if (this.viewLayout === 'table') {
      this.listContainer.appendChild(this.renderTable(filtered));
    } else {
      this.listContainer.appendChild(this.renderCardsGrid(filtered));
    }
  }

  renderTable(items) {
    const tableWrapper = el('div', {
      className: 'table-wrapper',
      tabIndex: 0,
      role: 'region',
      'aria-label': 'Course Grades Table',
    });

    const table = el('table', { className: 'grades-data-table' });

    // Table Header
    const thead = el(
      'thead',
      {},
      el(
        'tr',
        {},
        el('th', { style: { minWidth: '220px', textAlign: 'left' } }, 'Assessment'),
        el('th', { style: { width: '100px', textAlign: 'center' } }, 'Weight'),
        el('th', { style: { width: '130px', textAlign: 'right' } }, 'Score'),
        el('th', { style: { width: '160px', textAlign: 'right' } }, 'Grade & Progress'),
        el('th', { style: { width: '180px', textAlign: 'left' } }, 'Feedback')
      )
    );
    table.appendChild(thead);

    const tbody = el('tbody');
    for (const item of items) {
      const hasScore = typeof item.score === 'number' && typeof item.maxScore === 'number';
      const percent = item.percent;
      const colorTokens = getGradeColorTokens(percent);

      const scoreDisplay = hasScore
        ? `${formatScore(item.score)} / ${formatScore(item.maxScore)}`
        : (item.displayedGrade || '--');

      const weightDisplay = typeof item.weightedMax === 'number' && item.weightedMax > 0
        ? `${formatScore(item.weightedMax)}%`
        : '--';

      const tr = el(
        'tr',
        { className: percent === null ? 'is-ungraded' : '' },
        // Col 1: Assessment Title
        el(
          'td',
          { className: 'col-name' },
          el('div', { className: 'table-item-name', title: item.name }, item.name)
        ),
        // Col 2: Weight
        el(
          'td',
          { className: 'col-weight', style: { textAlign: 'center' } },
          weightDisplay !== '--'
            ? el('span', { className: 'table-weight-pill' }, weightDisplay)
            : el('span', { className: 'table-dash' }, '--')
        ),
        // Col 3: Score
        el(
          'td',
          { className: 'col-score', style: { textAlign: 'right' } },
          el('span', { className: hasScore ? 'table-score-bold' : 'table-dash' }, scoreDisplay)
        ),
        // Col 4: Grade & Mini Bar
        el(
          'td',
          { className: 'col-percent', style: { textAlign: 'right' } },
          percent !== null
            ? el(
                'div',
                { className: 'table-percent-box' },
                el(
                  'span',
                  {
                    className: 'table-percent-badge',
                    style: { backgroundColor: colorTokens.bg, color: colorTokens.text },
                  },
                  `${percent}%`
                ),
                el(
                  'div',
                  { className: 'table-mini-bar-track' },
                  el('div', {
                    className: 'table-mini-bar-fill',
                    style: { width: `${Math.min(100, Math.max(0, percent))}%`, backgroundColor: colorTokens.bar },
                  })
                )
              )
            : el('span', { className: 'table-dash' }, '--')
        ),
        // Col 5: Feedback
        el(
          'td',
          { className: 'col-comment' },
          item.comment
            ? el('div', { className: 'table-feedback-text', title: item.comment }, item.comment)
            : el('span', { className: 'table-dash' }, '—')
        )
      );
      tbody.appendChild(tr);
    }
    table.appendChild(tbody);
    tableWrapper.appendChild(table);

    return tableWrapper;
  }

  renderCardsGrid(items) {
    const grid = el('div', { className: 'grades-cards-grid' });

    for (const item of items) {
      const hasScore = typeof item.score === 'number' && typeof item.maxScore === 'number';
      const percent = item.percent;
      const colorTokens = getGradeColorTokens(percent);

      const scoreDisplay = hasScore
        ? `${formatScore(item.score)} / ${formatScore(item.maxScore)}`
        : (item.displayedGrade || '--');

      const weightDisplay = typeof item.weightedMax === 'number' && item.weightedMax > 0
        ? `${formatScore(item.weightedMax)}%`
        : null;

      const card = el(
        'div',
        { className: `grade-card-item ${percent === null ? 'is-ungraded' : ''}` },
        el(
          'div',
          { className: 'grade-card-top' },
          el('div', { className: 'grade-card-title', title: item.name }, item.name),
          percent !== null
            ? el(
                'span',
                {
                  className: 'grade-card-percent-badge',
                  style: { backgroundColor: colorTokens.bg, color: colorTokens.text },
                },
                `${percent}%`
              )
            : el('span', { className: 'grade-card-dash' }, '--')
        ),
        el(
          'div',
          { className: 'grade-card-meta-row' },
          weightDisplay ? el('span', { className: 'table-weight-pill' }, `Weight: ${weightDisplay}`) : null,
          el('span', { className: 'grade-card-score-text' }, scoreDisplay)
        ),
        percent !== null
          ? el(
              'div',
              { className: 'table-mini-bar-track', style: { width: '100%', marginTop: '8px' } },
              el('div', {
                className: 'table-mini-bar-fill',
                style: { width: `${Math.min(100, Math.max(0, percent))}%`, backgroundColor: colorTokens.bar },
              })
            )
          : null,
        item.comment
          ? el('div', { className: 'grade-comment-box', style: { marginTop: '8px' } }, item.comment)
          : null
      );
      grid.appendChild(card);
    }

    return grid;
  }
}
