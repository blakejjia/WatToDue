import { el, clear } from '../utils/dom.js';

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

    // Course Tabs Strip
    const tabsStrip = el('div', { className: 'course-tabs-strip' });
    for (const course of this.courses) {
      const itemsCount = this.gradesMap[course.id]?.length || 0;
      const isActive = this.selectedCourseId === course.id;

      const tabBtn = el(
        'button',
        {
          className: `course-tab-pill ${isActive ? 'active' : ''}`,
          onClick: () => {
            this.selectedCourseId = course.id;
            this.render();
          },
        },
        `${course.displayName || course.name} (${itemsCount})`
      );
      tabsStrip.appendChild(tabBtn);
    }
    root.appendChild(tabsStrip);

    // Selected Course Details
    const selectedCourse = this.courses.find((c) => c.id === this.selectedCourseId) || this.courses[0];
    const gradeItems = this.gradesMap[selectedCourse.id] || [];

    // Summary Card: prefers weighted calculation if available
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
      scoreLabel = `${totalWeightedScore.toFixed(1)} / ${totalWeightedMax.toFixed(1)} weighted pts (${overallPercent}%)`;
    } else if (totalRawMax > 0) {
      overallPercent = Math.round((totalRawScore / totalRawMax) * 1000) / 10;
      scoreLabel = `${totalRawScore} / ${totalRawMax} raw pts (${overallPercent}%)`;
    }

    const summaryCard = el(
      'div',
      { className: 'course-summary-card' },
      el(
        'div',
        { className: 'course-summary-info' },
        el('div', { className: 'course-summary-title' }, selectedCourse.displayName || selectedCourse.name),
        el('div', { className: 'course-summary-code' }, selectedCourse.code || '')
      ),
      el(
        'div',
        { className: 'course-summary-stats' },
        el(
          'div',
          { className: 'course-summary-score' },
          overallPercent !== null ? `${overallPercent}%` : '--'
        ),
        el(
          'div',
          { className: 'course-summary-items-count' },
          scoreLabel ? scoreLabel : `${scoredItemsCount} of ${gradeItems.length} graded`
        )
      )
    );
    root.appendChild(summaryCard);

    // Grade Items List
    if (gradeItems.length === 0) {
      root.appendChild(
        el(
          'div',
          { className: 'empty-state' },
          el('div', { className: 'empty-state-icon' }, '📝'),
          el('div', { className: 'empty-state-title' }, 'No Grade Items'),
          el('div', { className: 'empty-state-desc' }, 'The instructor has not published grade items for this course on LEARN yet.')
        )
      );
    } else {
      const itemsList = el('div', { className: 'grade-items-list' });

      for (const item of gradeItems) {
        const itemCard = el('div', { className: 'grade-item-card' });

        // Header
        const header = el(
          'div',
          { className: 'grade-item-header' },
          el('div', { className: 'grade-item-name' }, item.name),
          el(
            'div',
            { className: 'grade-score-group' },
            el(
              'div',
              { className: 'grade-score-primary' },
              item.score !== null && item.maxScore !== null
                ? `${item.score} / ${item.maxScore}`
                : (item.displayedGrade || '--')
            ),
            item.percent !== null
              ? el('div', { className: 'grade-score-percent' }, `${item.percent}%`)
              : null
          )
        );
        itemCard.appendChild(header);

        // Meta (Weights & Type)
        const meta = el('div', { className: 'grade-item-meta' });
        if (typeof item.weightedMax === 'number' && item.weightedMax > 0) {
          meta.appendChild(
            el('span', { className: 'grade-weight-badge' }, `Weight: ${item.weightedMax}%`)
          );
        }
        if (item.type) {
          meta.appendChild(el('span', {}, item.type));
        }
        itemCard.appendChild(meta);

        // Feedback / Comments
        if (item.comment) {
          itemCard.appendChild(
            el('div', { className: 'grade-comment-box' }, `Feedback: ${item.comment}`)
          );
        }

        itemsList.appendChild(itemCard);
      }
      root.appendChild(itemsList);
    }

    this.container.appendChild(root);
  }
}
