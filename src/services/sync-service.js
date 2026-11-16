import { D2LClient } from '../api/d2l-client.js';
import { Endpoints } from '../api/endpoints.js';
import { parseCourseOffering, groupCoursesByTerm } from './course-manager.js';
import { storageManager } from './storage-manager.js';

/**
 * Normalizes assignments and quizzes into unified DueItem array.
 * @param {Array<object>} courses
 * @param {Record<number, Array<object>>} dropboxesMap
 * @param {Record<number, Array<object>>} quizzesMap
 * @param {Set<string>|Array<string>} completedIds
 * @returns {Array<object>}
 */
export function normalizeDues(courses, dropboxesMap = {}, quizzesMap = {}, completedIds = new Set()) {
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

    for (const item of items) {
      if (!item || !item.DueDate) continue; // Skip undated items
      const id = `dropbox-${item.Id}`;
      dues.push({
        id,
        rawId: item.Id,
        type: 'assignment',
        title: item.Name || 'Assignment',
        courseId,
        courseName: course?.displayName || course?.name || `Course ${courseId}`,
        courseCode: course?.code || '',
        termCode: course?.termCode || '',
        dueDate: item.DueDate,
        customInstructions: item.CustomInstructions?.Text || null,
        url: Endpoints.dropboxSubmissionUrl(courseId, item.Id),
        completed: completedSet.has(id),
      });
    }
  }

  // Process Quizzes
  for (const [courseIdStr, items] of Object.entries(quizzesMap || {})) {
    const courseId = Number(courseIdStr);
    const course = courseLookup.get(courseId);
    if (!Array.isArray(items)) continue;

    for (const item of items) {
      if (!item || !item.DueDate) continue; // Skip undated quizzes
      const id = `quiz-${item.QuizId}`;
      dues.push({
        id,
        rawId: item.QuizId,
        type: 'quiz',
        title: item.Name || 'Quiz',
        courseId,
        courseName: course?.displayName || course?.name || `Course ${courseId}`,
        courseCode: course?.code || '',
        termCode: course?.termCode || '',
        dueDate: item.DueDate,
        startDate: item.StartDate || null,
        endDate: item.EndDate || null,
        url: Endpoints.quizSummaryUrl(courseId, item.QuizId),
        completed: completedSet.has(id),
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

  return rawGrades.map((item) => {
    const score = typeof item.PointsNumerator === 'number' ? item.PointsNumerator : null;
    const maxScore = typeof item.PointsDenominator === 'number' ? item.PointsDenominator : null;
    const percent = score !== null && maxScore !== null && maxScore > 0
      ? Math.round((score / maxScore) * 1000) / 10
      : null;

    const weightedScore = typeof item.WeightedNumerator === 'number' ? item.WeightedNumerator : null;
    const weightedMax = typeof item.WeightedDenominator === 'number' ? item.WeightedDenominator : null;

    let comment = null;
    if (item.Comments?.Text) {
      comment = item.Comments.Text;
    } else if (typeof item.Comments === 'string') {
      comment = item.Comments;
    }

    return {
      id: String(item.GradeObjectIdentifier || item.Id || Math.random()),
      name: item.GradeObjectName || 'Grade Item',
      type: item.GradeObjectType || 'Numeric',
      score,
      maxScore,
      percent,
      weightedScore,
      weightedMax,
      displayedGrade: item.DisplayedGrade || null,
      comment,
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
    const ttlMinutes = await storageManager.get('cacheTtlMinutes', 30);
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

    await Promise.all(
      targetCourses.map(async (course) => {
        try {
          const [db, qz, gr] = await Promise.all([
            this.client.getDropboxes(course.id).catch(() => []),
            this.client.getQuizzes(course.id).catch(() => []),
            this.client.getGrades(course.id).catch(() => []),
          ]);
          dropboxesMap[course.id] = db;
          quizzesMap[course.id] = qz;
          gradesMap[course.id] = normalizeGrades(gr);
        } catch (_) {
          dropboxesMap[course.id] = [];
          quizzesMap[course.id] = [];
          gradesMap[course.id] = [];
        }
      })
    );

    const completedIds = await storageManager.get('completedDueIds', []);
    const dues = normalizeDues(targetCourses, dropboxesMap, quizzesMap, completedIds);

    const nowIso = new Date().toISOString();
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
