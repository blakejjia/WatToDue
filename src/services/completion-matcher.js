/**
 * Intelligent completion matcher for D2L Brightspace.
 * Cross-references Dues against Gradebook items and submission records.
 */

/**
 * Extracts all numeric sequences from a string (e.g. "Lecture #7 Quiz" -> ["7"]).
 * @param {string} str
 * @returns {Array<string>}
 */
export function extractNumbers(str) {
  if (!str) return [];
  const matches = String(str).match(/\d+/g);
  return matches || [];
}

/**
 * Strips deadline noise and punctuation from title.
 * @param {string} str
 * @returns {string}
 */
export function normalizeTitle(str) {
  if (!str) return '';
  return String(str)
    .toLowerCase()
    // Remove "Due by Sept 23rd..." or "Due: ..." suffix
    .replace(/\s*-\s*due\b.*$/i, '')
    .replace(/\bdue\b.*$/i, '')
    .replace(/[^a-z0-9]/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Evaluates whether a grade item represents a completed/scored activity.
 * @param {object} gradeItem
 * @returns {boolean}
 */
export function isGradeCompleted(gradeItem) {
  if (!gradeItem) return false;
  if (typeof gradeItem.score === 'number') return true;
  if (typeof gradeItem.PointsNumerator === 'number') return true;

  const displayed = String(gradeItem.displayedGrade || gradeItem.DisplayedGrade || '').trim();
  if (displayed && displayed !== '-' && displayed !== 'Not Graded' && displayed !== 'N/A') {
    return true;
  }
  return false;
}

/**
 * Determines whether a Due item matches a Gradebook item.
 * @param {string} dueTitle
 * @param {string} gradeName
 * @returns {boolean}
 */
export function isTitleMatch(dueTitle, gradeName) {
  if (!dueTitle || !gradeName) return false;

  const cleanDue = normalizeTitle(dueTitle);
  const cleanGrade = normalizeTitle(gradeName);

  if (cleanDue === cleanGrade) return true;

  // Verify number alignment (e.g. Quiz 7 should NOT match Quiz 8)
  const dueNums = extractNumbers(cleanDue);
  const gradeNums = extractNumbers(cleanGrade);

  if (dueNums.length > 0 || gradeNums.length > 0) {
    if (dueNums.length !== gradeNums.length) {
      // If one has numbers and the other doesn't, or different count
      const dueNumsSet = new Set(dueNums);
      const gradeNumsSet = new Set(gradeNums);
      // Require at least 1 overlapping number if both have numbers
      if (dueNums.length > 0 && gradeNums.length > 0) {
        const hasOverlap = dueNums.some((n) => gradeNumsSet.has(n));
        if (!hasOverlap) return false;
      }
    } else {
      // Exactly same number count: all must match in set
      for (let i = 0; i < dueNums.length; i++) {
        if (dueNums[i] !== gradeNums[i]) return false;
      }
    }
  }

  // Token inclusion check
  const dueTokens = cleanDue.split(' ').filter((w) => w.length > 1);
  const gradeTokens = cleanGrade.split(' ').filter((w) => w.length > 1);

  if (dueTokens.length === 0 || gradeTokens.length === 0) return false;

  const dueTokenSet = new Set(dueTokens);
  const gradeTokenSet = new Set(gradeTokens);

  // If grade tokens are subset of due tokens (e.g. "Lecture 7 Quiz" inside "Lecture 7 Quiz Due Sept 23")
  const gradeInDue = gradeTokens.every((t) => dueTokenSet.has(t));
  if (gradeInDue) return true;

  // Or if due tokens are subset of grade tokens
  const dueInGrade = dueTokens.every((t) => gradeTokenSet.has(t));
  if (dueInGrade) return true;

  return false;
}

/**
 * Checks if a Due item has a corresponding completed grade item.
 * @param {object} due
 * @param {Array<object>} courseGrades
 * @returns {boolean}
 */
export function isDueCompletedByGrade(due, courseGrades) {
  if (!due || !Array.isArray(courseGrades) || courseGrades.length === 0) {
    return false;
  }

  for (const grade of courseGrades) {
    if (grade.isCategory) continue; // Skip category header items
    const gradeName = grade.name || grade.GradeObjectName;
    if (isTitleMatch(due.title, gradeName) && isGradeCompleted(grade)) {
      return true;
    }
  }

  return false;
}
