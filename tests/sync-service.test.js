import { test } from 'node:test';
import assert from 'node:assert';
import { normalizeDues, normalizeGrades } from '../src/services/sync-service.js';

test('normalizeDues combines assignments and quizzes and sets completion status', () => {
  const courses = [
    { id: 100, displayName: 'CHEM 233', code: '1265-CHEM.233.001.1.LEC', termCode: '1265' }
  ];
  const dropboxesMap = {
    100: [
      { Id: 1, Name: 'Assignment 1', DueDate: '2026-03-20T23:59:00.000Z' },
      { Id: 2, Name: 'Undated Assignment', DueDate: null }
    ]
  };
  const quizzesMap = {
    100: [
      { QuizId: 10, Name: 'Quiz 1', DueDate: '2026-03-15T23:59:00.000Z' }
    ]
  };
  const completedIds = new Set(['dropbox-1']);

  const dues = normalizeDues(courses, dropboxesMap, quizzesMap, completedIds);

  // Undated assignment omitted from dues timeline
  assert.strictEqual(dues.length, 2);

  // Chronologically sorted: Quiz 1 (March 15) before Assignment 1 (March 20)
  assert.strictEqual(dues[0].id, 'quiz-10');
  assert.strictEqual(dues[0].type, 'quiz');
  assert.strictEqual(dues[0].completed, false);
  assert.strictEqual(dues[0].courseName, 'CHEM 233');
  assert.ok(dues[0].url.includes('quizzing'));

  assert.strictEqual(dues[1].id, 'dropbox-1');
  assert.strictEqual(dues[1].type, 'assignment');
  assert.strictEqual(dues[1].completed, true);
  assert.ok(dues[1].url.includes('dropbox'));
});

test('normalizeGrades structures grade items and calculates weighted scores', () => {
  const rawGrades = [
    {
      GradeObjectIdentifier: '1',
      GradeObjectName: 'Midterm',
      GradeObjectType: 'Numeric',
      PointsNumerator: 42,
      PointsDenominator: 50,
      WeightedNumerator: 21,
      WeightedDenominator: 25,
      Comments: { Text: 'Great work!' }
    },
    {
      GradeObjectIdentifier: '2',
      GradeObjectName: 'Final Project',
      GradeObjectType: 'Numeric',
      PointsNumerator: null,
      PointsDenominator: 100,
      WeightedNumerator: null,
      WeightedDenominator: 30,
      Comments: null
    }
  ];

  const grades = normalizeGrades(rawGrades);
  assert.strictEqual(grades.length, 2);
  assert.strictEqual(grades[0].name, 'Midterm');
  assert.strictEqual(grades[0].score, 42);
  assert.strictEqual(grades[0].maxScore, 50);
  assert.strictEqual(grades[0].percent, 84);
  assert.strictEqual(grades[0].comment, 'Great work!');

  assert.strictEqual(grades[1].score, null);
  assert.strictEqual(grades[1].percent, null);
});

test('normalizeDues automatically completes items matching scored grades', () => {
  const courses = [
    { id: 200, displayName: 'CHEM 220', code: '1269-CHEM.220.001.1.LEC', termCode: '1269' }
  ];
  const dropboxesMap = {};
  const quizzesMap = {
    200: [
      { QuizId: 101, Name: 'Lecture #7 Quiz - Due by Sept. 23rd 9:30am', DueDate: '2026-09-23T09:30:00.000Z' },
      { QuizId: 102, Name: 'Lecture #9 Quiz', DueDate: '2026-10-01T09:30:00.000Z' }
    ]
  };
  const gradesMap = {
    200: [
      { name: 'Lecture #7 Quiz', score: 10, maxScore: 10 },
      { name: 'Lecture #9 Quiz', score: null, displayedGrade: '-' }
    ]
  };

  const dues = normalizeDues(courses, dropboxesMap, quizzesMap, new Set(), gradesMap);

  assert.strictEqual(dues.length, 2);
  const quiz7 = dues.find((d) => d.rawId === 101);
  const quiz9 = dues.find((d) => d.rawId === 102);

  // Quiz 7 was graded with score 10 -> automatically completed!
  assert.strictEqual(quiz7.completed, true);
  assert.strictEqual(quiz7.autoCompleted, true);

  // Quiz 9 is ungraded -> remains uncompleted
  assert.strictEqual(quiz9.completed, false);
});

test('normalizeDues marks dropboxes and quizzes completed from submission and attempt sets', () => {
  const courses = [
    { id: 300, displayName: 'BIOL 266', code: '1269-BIOL.266.001.1.LEC', termCode: '1269' }
  ];
  const dropboxesMap = {
    300: [
      { Id: 501, Name: 'Assignment 1', DueDate: '2026-09-26T03:59:59.000Z' },
      { Id: 502, Name: 'Assignment 7', DueDate: '2026-11-27T03:59:59.000Z' }
    ]
  };
  const quizzesMap = {
    300: [
      { QuizId: 601, Name: 'CHEM 494 Declarations', DueDate: '2026-10-02T03:59:59.000Z' }
    ]
  };

  const submittedDbMap = { 300: new Set([501]) };
  const completedQzMap = { 300: new Set([601]) };

  const dues = normalizeDues(
    courses,
    dropboxesMap,
    quizzesMap,
    new Set(),
    {},
    submittedDbMap,
    completedQzMap
  );

  const a1 = dues.find((d) => d.rawId === 501);
  const a7 = dues.find((d) => d.rawId === 502);
  const qDecl = dues.find((d) => d.rawId === 601);

  assert.strictEqual(a1.completed, true);
  assert.strictEqual(a1.autoCompleted, true);

  assert.strictEqual(a7.completed, false);

  assert.strictEqual(qDecl.completed, true);
  assert.strictEqual(qDecl.autoCompleted, true);
});
