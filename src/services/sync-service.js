import { D2LClient } from '../api/d2l-client.js';
import { Endpoints } from '../api/endpoints.js';
import { parseCourseOffering, groupCoursesByTerm } from './course-manager.js';
import { storageManager } from './storage-manager.js';
import { isDueCompletedByGrade } from './completion-matcher.js';

/**
 * Normalizes assignments and quizzes into unified DueItem array.
 * @param {Array<object>} courses
 * @param {Record<number, Array<object>>} dropboxesMap
 * @param {Record<number, Array<object>>} quizzesMap
 * @param {Set<string>|Array<string>} completedIds
 * @param {Record<number, Array<object>>} [gradesMap={}]
 * @param {Record<number, Set<number>>} [submittedDropboxesMap={}]
 * @param {Record<number, Set<number>>} [completedQuizzesMap={}]
 * @returns {Array<object>}
 */
export function normalizeDues(
  courses,
  dropboxesMap = {},
  quizzesMap = {},
  completedIds = new Set(),
  gradesMap = {},
  submittedDropboxesMap = {},
  completedQuizzesMap = {}
) {
  const completedSet = completedIds instanceof Set ? completedIds : new Set(completedIds || []);
  const dues = [];

  const courseLookup = new Map();
  for (const c of courses || []) {
    if (c && c.id) {
      courseLookup.set(c.id, c);
    }
  }

  // Process Dropboxes (Assignments)
  for (const [courseIdStr, items] of Object.entries(dropboxesMap || {})) {
    const courseId = Number(courseIdStr);
    const course = courseLookup.get(courseId);
    if (!Array.isArray(items)) continue;
    const courseGrades = gradesMap[courseId] || [];
    const submittedSet = submittedDropboxesMap[courseId] || new Set();

    for (const item of items) {
      if (!item || !item.DueDate) continue; // Skip undated items
      const id = `dropbox-${item.Id}`;
      const title = item.Name || 'Assignment';
      const gradeCompleted = isDueCompletedByGrade({ title }, courseGrades);
      const isSubmitted = submittedSet.has(item.Id);
      const isCompleted = completedSet.has(id) || gradeCompleted || Boolean(isSubmitted);

      dues.push({
        id,
        rawId: item.Id,
        type: 'assignment',
        title,
        courseId,
        courseName: course?.displayName || course?.name || `Course ${courseId}`,
        courseCode: course?.code || '',
        termCode: course?.termCode || '',
        dueDate: item.DueDate,
        customInstructions: item.CustomInstructions?.Text || null,
        url: Endpoints.dropboxSubmissionUrl(courseId, item.Id),
        completed: isCompleted,
        autoCompleted: gradeCompleted || isSubmitted,
      });
    }
  }

  // Process Quizzes
  for (const [courseIdStr, items] of Object.entries(quizzesMap || {})) {
    const courseId = Number(courseIdStr);
    const course = courseLookup.get(courseId);
    if (!Array.isArray(items)) continue;
    const courseGrades = gradesMap[courseId] || [];
    const completedQuizSet = completedQuizzesMap[courseId] || new Set();

    for (const item of items) {
      if (!item || !item.DueDate) continue; // Skip undated quizzes
      const id = `quiz-${item.QuizId}`;
      const title = item.Name || 'Quiz';
      const gradeCompleted = isDueCompletedByGrade({ title }, courseGrades);
      const isAttempted = completedQuizSet.has(item.QuizId);
      const isCompleted = completedSet.has(id) || gradeCompleted || Boolean(isAttempted);

      dues.push({
        id,
        rawId: item.QuizId,
        type: 'quiz',
        title,
        courseId,
        courseName: course?.displayName || course?.name || `Course ${courseId}`,
        courseCode: course?.code || '',
        termCode: course?.termCode || '',
        dueDate: item.DueDate,
        startDate: item.StartDate || null,
        endDate: item.EndDate || null,
        url: Endpoints.quizSummaryUrl(courseId, item.QuizId),
        completed: isCompleted,
        autoCompleted: gradeCompleted || isAttempted,
      });
    }
  }

  // Sort ascending by due date
  return dues.sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());
}

/**
 * Normalizes raw grade values into formatted GradeItem array.
 * @param {Array<object>} rawGrades
 * @returns {Array<object>}
 */
export function normalizeGrades(rawGrades) {
  if (!Array.isArray(rawGrades)) {
    return [];
  }

  let currentCategoryId = null;
  let currentCategoryName = null;

  return rawGrades.map((item) => {
    // If already structured from LEARN HTML table parser
    if (item.rawPointsStr !== undefined || item.rawWeightStr !== undefined) {
      return item;
    }

    const isCategory = item.GradeObjectType === 9 || item.GradeObjectTypeName === 'Category' || item.type === 9 || item.type === 'Category';
    const itemId = String(item.GradeObjectIdentifier || item.Id || Math.random());
    const itemName = item.GradeObjectName || item.name || 'Grade Item';

    if (isCategory) {
      currentCategoryId = itemId;
      currentCategoryName = itemName;
    }

    const score = typeof item.PointsNumerator === 'number' ? item.PointsNumerator : (typeof item.score === 'number' ? item.score : null);
    const maxScore = typeof item.PointsDenominator === 'number' ? item.PointsDenominator : (typeof item.maxScore === 'number' ? item.maxScore : null);
    const percent = score !== null && maxScore !== null && maxScore > 0
      ? Math.round((score / maxScore) * 1000) / 10
      : (typeof item.percent === 'number' ? item.percent : null);

    const weightedScore = typeof item.WeightedNumerator === 'number' ? item.WeightedNumerator : (typeof item.weightedScore === 'number' ? item.weightedScore : null);
    const weightedMax = typeof item.WeightedDenominator === 'number' ? item.WeightedDenominator : (typeof item.weightedMax === 'number' ? item.weightedMax : null);

    let comment = null;
    if (item.Comments?.Text) {
      comment = item.Comments.Text;
    } else if (typeof item.Comments === 'string') {
      comment = item.Comments;
    } else if (typeof item.comment === 'string') {
      comment = item.comment;
    }

    // "if that is 0, mark is as ungraded. There should never be some zero mark as the grade, rather, if that is a 0, that is not marked"
    const isZero = (score === 0 || percent === 0 || (isCategory && weightedScore === 0));
    const isGraded = !isZero && (score !== null || percent !== null || (isCategory && weightedScore > 0));

    return {
      id: itemId,
      name: itemName,
      type: item.GradeObjectType || (isCategory ? 'Category' : 'Numeric'),
      isCategory,
      categoryId: isCategory ? null : currentCategoryId,
      categoryName: isCategory ? null : currentCategoryName,
      score: isGraded ? score : null,
      maxScore,
      percent: isGraded ? percent : null,
      weightedScore: isGraded ? weightedScore : 0,
      weightedMax,
      displayedGrade: item.DisplayedGrade || item.displayedGrade || null,
      rawPointsStr: score !== null && maxScore !== null ? `${score} / ${maxScore}` : '',
      rawWeightStr: weightedScore !== null && weightedMax !== null ? `${weightedScore} / ${weightedMax}` : '',
      isGraded,
      comment,
      commentUrl: item.commentUrl || null,
    };
  });
}

export class SyncService {
  /**
   * @param {D2LClient} [client]
   */
  constructor(client = null) {
    this.client = client || new D2LClient();
  }

  /**
   * Orchestrates complete sync of Waterloo LEARN data.
   * @param {object} [options]
   * @param {boolean} [options.force=false]
   * @returns {Promise<object>}
   */
  async sync(options = {}) {
    const { force = false } = options;

    const lastSync = await storageManager.get('lastSync', null);
    const ttlMinutes = await storageManager.get('cacheTtlMinutes', 2);
    const ttlMs = ttlMinutes * 60 * 1000;

    if (!force && lastSync && Date.now() - new Date(lastSync).getTime() < ttlMs) {
      // Data is fresh
      return {
        fresh: true,
        user: await storageManager.get('user'),
        dues: await storageManager.get('dues', []),
        grades: await storageManager.get('grades', {}),
        lastSync,
      };
    }

    // Fetch user and enrollments
    const user = await this.client.getWhoAmI();
    await storageManager.set('user', user);

    const rawEnrollments = await this.client.getEnrollments();
    const parsedCourses = rawEnrollments
      .map(parseCourseOffering)
      .filter((c) => c !== null);

    const termsGrouped = groupCoursesByTerm(parsedCourses);
    await storageManager.set('terms', termsGrouped);

    // Selected term defaults to the latest discovered term
    let selectedTerm = await storageManager.get('selectedTerm', null);
    if (!selectedTerm && termsGrouped.length > 0) {
      selectedTerm = termsGrouped[0].termCode;
      await storageManager.set('selectedTerm', selectedTerm);
    }

    // Courses for the active term
    const activeTermGroup = termsGrouped.find((t) => t.termCode === selectedTerm);
    const activeCourses = activeTermGroup ? activeTermGroup.courses : [];
    await storageManager.set('courses', activeCourses);

    // Enabled courses partitioned by term
    const enabledCourseIds = await storageManager.getEnabledCoursesForTerm(selectedTerm);
    const targetCourses = enabledCourseIds !== null
      ? activeCourses.filter((c) => enabledCourseIds.includes(c.id))
      : activeCourses.filter((c) => c.defaultEnabled);

    // Concurrent fetch for dropboxes, quizzes, and grades
    const dropboxesMap = {};
    const quizzesMap = {};
    const gradesMap = {};
    const submittedDropboxesMap = {};
    const completedQuizzesMap = {};

    await Promise.all(
      targetCourses.map(async (course) => {
        try {
          const [db, qz, gr, subDb, compQz] = await Promise.all([
            this.client.getDropboxes(course.id).catch(() => []),
            this.client.getQuizzes(course.id).catch(() => []),
            this.client.getGrades(course.id).catch(() => []),
            this.client.getSubmittedDropboxFolderIds(course.id).catch(() => new Set()),
            this.client.getCompletedQuizIds(course.id).catch(() => new Set()),
          ]);
          dropboxesMap[course.id] = db;
          quizzesMap[course.id] = qz;
          gradesMap[course.id] = normalizeGrades(gr);
          submittedDropboxesMap[course.id] = subDb;
          completedQuizzesMap[course.id] = compQz;
        } catch (_) {
          dropboxesMap[course.id] = [];
          quizzesMap[course.id] = [];
          gradesMap[course.id] = [];
          submittedDropboxesMap[course.id] = new Set();
          completedQuizzesMap[course.id] = new Set();
        }
      })
    );

    const completedIds = await storageManager.get('completedDueIds', []);
    const dues = normalizeDues(
      targetCourses,
      dropboxesMap,
      quizzesMap,
      completedIds,
      gradesMap,
      submittedDropboxesMap,
      completedQuizzesMap
    );

    // Persist all completed IDs to storage
    const updatedCompletedIds = new Set(completedIds);
    for (const d of dues) {
      if (d.completed) {
        updatedCompletedIds.add(d.id);
      }
    }

    const nowIso = new Date().toISOString();
    await storageManager.set('completedDueIds', Array.from(updatedCompletedIds));
    await storageManager.set('dues', dues);
    await storageManager.set('grades', gradesMap);
    await storageManager.set('lastSync', nowIso);

    return {
      fresh: false,
      user,
      dues,
      grades: gradesMap,
      lastSync: nowIso,
    };
  }
}

export const syncService = new SyncService();
