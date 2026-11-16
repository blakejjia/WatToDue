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
 * Cleanly formats a raw score/number without long ugly floating-point precision.
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
 * Returns color category tokens for percentage.
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

/**
 * Groups a sequence of grade items into hierarchical categories and standalone items.
 * @param {Array<object>} items
 * @returns {{ categories: Array<{ category: object, items: Array<object> }>, standalone: Array<object> }}
 */
export function groupGradesByCategory(items) {
  const categories = [];
  const standalone = [];
  let currentGroup = null;

  for (const item of items || []) {
    if (item.isCategory) {
      currentGroup = {
        category: item,
        items: [],
      };
      categories.push(currentGroup);
    } else if (currentGroup && item.categoryId === currentGroup.category.id) {
      currentGroup.items.push(item);
    } else {
      standalone.push(item);
    }
  }

  return { categories, standalone };
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

    // Filter and view states
    this.searchQuery = '';
    this.activeFilter = 'all'; // 'all' | 'graded' | 'ungraded'
    this.viewLayout = 'table'; // 'table' | 'cards'
    this.collapsedCategories = new Set(); // Category IDs that are collapsed

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
            e.currentTarget.scrollIntoView({ inline: 'nearest', block: 'nearest', behavior: 'smooth' });
          },
        },
        el('span', { className: 'tab-course-code' }, `${badge.subj} ${badge.num}`),
        el('span', { className: 'tab-items-badge' }, String(itemsCount))
      );
      tabsStrip.appendChild(tabBtn);
    }
    root.appendChild(tabsStrip);

    // 2. Selected Course Calculation (Strictly distinguishes Category totals vs Sub-items!)
    const selectedCourse = this.courses.find((c) => c.id === this.selectedCourseId) || this.courses[0];
    const gradeItems = this.gradesMap[selectedCourse.id] || [];
    const courseBadge = getCourseBadge(selectedCourse.displayName || selectedCourse.name);

    const hasCategories = gradeItems.some((i) => i.isCategory);

    let totalWeightedScore = 0;
    let totalWeightedMax = 0;
    let totalCourseWeight = 0;
    let scoredItemsCount = 0;
    let totalSubItemsCount = 0;

    if (hasCategories) {
      // ONLY accumulate Category rows for the overall course weighted score
      for (const item of gradeItems) {
        if (item.isCategory) {
          if (typeof item.weightedMax === 'number' && item.weightedMax > 0) {
            totalCourseWeight += item.weightedMax;
            if (typeof item.weightedScore === 'number') {
              totalWeightedScore += item.weightedScore;
              totalWeightedMax += item.weightedMax;
            }
          }
        } else {
          totalSubItemsCount++;
          if (typeof item.score === 'number' && item.score !== null) {
            scoredItemsCount++;
          }
        }
      }
    } else {
      // Standalone flat course items
      for (const item of gradeItems) {
        totalSubItemsCount++;
        if (typeof item.weightedScore === 'number' && typeof item.weightedMax === 'number' && item.weightedMax > 0) {
          totalWeightedScore += item.weightedScore;
          totalWeightedMax += item.weightedMax;
          totalCourseWeight += item.weightedMax;
        }
        if (typeof item.score === 'number' && item.score !== null) {
          scoredItemsCount++;
        }
      }
    }

    let overallPercent = null;
    let scoreLabel = '';

    if (totalWeightedMax > 0) {
      overallPercent = Math.round((totalWeightedScore / totalWeightedMax) * 1000) / 10;
      scoreLabel = `${formatScore(totalWeightedScore)} / ${formatScore(totalWeightedMax)} weighted pts (${formatScore(totalWeightedScore)}% of final mark earned)`;
    }

    const letterGrade = getLetterGrade(overallPercent);
    const colorTokens = getGradeColorTokens(overallPercent);

    // Hero Summary Card
    const summaryCard = el(
      'div',
      { className: 'grades-hero-card' },
      el(
        'div',
        { className: 'hero-card-top' },
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
              el('span', { className: 'hero-chip' }, `📝 ${scoredItemsCount} of ${totalSubItemsCount || gradeItems.length} graded`),
              scoreLabel ? el('span', { className: 'hero-chip' }, `⚖ ${scoreLabel}`) : null
            )
          )
        ),
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

    // 3. Filter & View Mode Toolbar
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

    // 4. Content Area
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
      filtered = filtered.filter((i) => typeof i.score === 'number' || typeof i.percent === 'number' || (i.isCategory && typeof i.weightedScore === 'number'));
    } else if (this.activeFilter === 'ungraded') {
      filtered = filtered.filter((i) => !i.isCategory && i.score === null && i.percent === null);
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

    // Header matches LEARN: Grade Item | Points | Weight Achieved | Grade | Comments
    const thead = el(
      'thead',
      {},
      el(
        'tr',
        {},
        el('th', { style: { minWidth: '260px', textAlign: 'left' } }, 'Grade Item'),
        el('th', { style: { width: '130px', textAlign: 'right' } }, 'Points'),
        el('th', { style: { width: '150px', textAlign: 'right' } }, 'Weight Achieved'),
        el('th', { style: { width: '160px', textAlign: 'right' } }, 'Grade'),
        el('th', { style: { width: '180px', textAlign: 'left' } }, 'Comments & Feedback')
      )
    );
    table.appendChild(thead);

    const tbody = el('tbody');
    const { categories, standalone } = groupGradesByCategory(items);

    // 1. Render Categories with Indented Children
    for (const group of categories) {
      const cat = group.category;
      const isCollapsed = this.collapsedCategories.has(cat.id);
      const colorTokens = getGradeColorTokens(cat.percent);

      const catWeightDisplay = typeof cat.weightedMax === 'number' && cat.weightedMax > 0
        ? `${formatScore(cat.weightedScore)} / ${formatScore(cat.weightedMax)}`
        : '--';

      // Category Header / 总分 Row
      const catRow = el(
        'tr',
        {
          className: 'table-category-row',
          onClick: () => {
            if (this.collapsedCategories.has(cat.id)) {
              this.collapsedCategories.delete(cat.id);
            } else {
              this.collapsedCategories.add(cat.id);
            }
            this.renderFilteredList(null, items);
          },
        },
        // Col 1: Category Name with Expand Toggle
        el(
          'td',
          { className: 'col-name' },
          el(
            'div',
            { className: 'category-row-label' },
            el('span', { className: 'category-toggle-icon' }, isCollapsed ? '▶' : '▼'),
            el('span', { className: 'category-icon' }, '📁'),
            el('strong', { className: 'category-title' }, cat.name),
            el('span', { className: 'category-pill' }, 'Category Total')
          )
        ),
        // Col 2: Points (Categories in LEARN do not have direct points)
        el(
          'td',
          { className: 'col-points', style: { textAlign: 'right' } },
          el('span', { className: 'table-dash' }, '—')
        ),
        // Col 3: Weight Achieved
        el(
          'td',
          { className: 'col-weight', style: { textAlign: 'right' } },
          el('span', { className: 'category-weight-bold' }, catWeightDisplay)
        ),
        // Col 4: Grade
        el(
          'td',
          { className: 'col-grade', style: { textAlign: 'right' } },
          cat.percent !== null
            ? el(
                'div',
                { className: 'table-percent-box' },
                el(
                  'span',
                  {
                    className: 'table-percent-badge category-percent-badge',
                    style: { backgroundColor: colorTokens.bg, color: colorTokens.text },
                  },
                  `${cat.percent}%`
                ),
                el(
                  'div',
                  { className: 'table-mini-bar-track' },
                  el('div', {
                    className: 'table-mini-bar-fill',
                    style: { width: `${Math.min(100, Math.max(0, cat.percent))}%`, backgroundColor: colorTokens.bar },
                  })
                )
              )
            : el('span', { className: 'table-dash' }, '--')
        ),
        // Col 5: Comments
        el('td', { className: 'col-comment' }, el('span', { className: 'table-dash' }, '—'))
      );
      tbody.appendChild(catRow);

      // Render Indented Child Items if Not Collapsed
      if (!isCollapsed) {
        for (const item of group.items) {
          tbody.appendChild(this.createChildItemRow(item));
        }
      }
    }

    // 2. Render Standalone Items (if course has items without a category)
    if (standalone.length > 0) {
      if (categories.length > 0) {
        const standaloneHeader = el(
          'tr',
          { className: 'table-category-row' },
          el('td', { colSpan: 5, className: 'col-name' },
            el('strong', { className: 'category-title', style: { paddingLeft: '8px' } }, '📋 Other Assessments')
          )
        );
        tbody.appendChild(standaloneHeader);
      }
      for (const item of standalone) {
        tbody.appendChild(this.createChildItemRow(item, false));
      }
    }

    table.appendChild(tbody);
    tableWrapper.appendChild(table);

    return tableWrapper;
  }

  createChildItemRow(item, isIndented = true) {
    const hasScore = typeof item.score === 'number' && typeof item.maxScore === 'number';
    const percent = item.percent;
    const colorTokens = getGradeColorTokens(percent);

    const pointsDisplay = hasScore
      ? `${formatScore(item.score)} / ${formatScore(item.maxScore)}`
      : (item.displayedGrade || '--');

    const weightDisplay = typeof item.weightedMax === 'number' && item.weightedMax > 0
      ? `${formatScore(item.weightedScore)} / ${formatScore(item.weightedMax)}`
      : '--';

    return el(
      'tr',
      { className: `table-child-row ${isIndented ? 'is-indented' : ''} ${percent === null ? 'is-ungraded' : ''}` },
      // Col 1: Name (indented)
      el(
        'td',
        { className: 'col-name' },
        el(
          'div',
          { className: 'child-item-name-group' },
          isIndented ? el('span', { className: 'tree-connector' }, '↳') : null,
          el('span', { className: 'table-item-name', title: item.name }, item.name)
        )
      ),
      // Col 2: Points
      el(
        'td',
        { className: 'col-points', style: { textAlign: 'right' } },
        el('span', { className: hasScore ? 'table-score-bold' : 'table-dash' }, pointsDisplay)
      ),
      // Col 3: Weight Achieved
      el(
        'td',
        { className: 'col-weight', style: { textAlign: 'right' } },
        weightDisplay !== '--'
          ? el('span', { className: 'table-weight-pill' }, weightDisplay)
          : el('span', { className: 'table-dash' }, '--')
      ),
      // Col 4: Grade
      el(
        'td',
        { className: 'col-grade', style: { textAlign: 'right' } },
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
      // Col 5: Comments
      el(
        'td',
        { className: 'col-comment' },
        item.comment
          ? el('div', { className: 'table-feedback-text', title: item.comment }, item.comment)
          : el('span', { className: 'table-dash' }, '—')
      )
    );
  }

  renderCardsGrid(items) {
    const grid = el('div', { className: 'grades-cards-grid' });
    const { categories, standalone } = groupGradesByCategory(items);

    for (const group of categories) {
      const cat = group.category;
      const colorTokens = getGradeColorTokens(cat.percent);

      const catCard = el(
        'div',
        { className: 'grade-card-item is-category-card' },
        el(
          'div',
          { className: 'grade-card-top' },
          el(
            'div',
            { style: { display: 'flex', alignItems: 'center', gap: '6px' } },
            el('span', {}, '📁'),
            el('div', { className: 'grade-card-title', style: { fontWeight: '800' } }, cat.name)
          ),
          cat.percent !== null
            ? el(
                'span',
                {
                  className: 'grade-card-percent-badge',
                  style: { backgroundColor: colorTokens.bg, color: colorTokens.text },
                },
                `${cat.percent}%`
              )
            : el('span', { className: 'grade-card-dash' }, '--')
        ),
        el(
          'div',
          { className: 'grade-card-meta-row' },
          el('span', { className: 'table-weight-pill' }, `Total Weight: ${formatScore(cat.weightedMax)}%`),
          el('span', { className: 'grade-card-score-text' }, `Achieved: ${formatScore(cat.weightedScore)} / ${formatScore(cat.weightedMax)}`)
        ),
        el(
          'div',
          { style: { fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' } },
          `${group.items.length} sub-items in this category`
        )
      );
      grid.appendChild(catCard);

      for (const item of group.items) {
        grid.appendChild(this.createChildCard(item));
      }
    }

    for (const item of standalone) {
      grid.appendChild(this.createChildCard(item));
    }

    return grid;
  }

  createChildCard(item) {
    const hasScore = typeof item.score === 'number' && typeof item.maxScore === 'number';
    const percent = item.percent;
    const colorTokens = getGradeColorTokens(percent);

    const pointsDisplay = hasScore
      ? `${formatScore(item.score)} / ${formatScore(item.maxScore)}`
      : (item.displayedGrade || '--');

    const weightDisplay = typeof item.weightedMax === 'number' && item.weightedMax > 0
      ? `${formatScore(item.weightedScore)} / ${formatScore(item.weightedMax)}`
      : null;

    return el(
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
        el('span', { className: 'grade-card-score-text' }, pointsDisplay)
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
  }
}
