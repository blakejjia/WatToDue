import test from 'node:test';
import assert from 'node:assert/strict';
import {
  extractNumbers,
  normalizeTitle,
  isGradeCompleted,
  isTitleMatch,
  isDueCompletedByGrade,
} from '../src/services/completion-matcher.js';

test('extractNumbers extracts numeric strings accurately', () => {
  assert.deepEqual(extractNumbers('Lecture #7 Quiz'), ['7']);
  assert.deepEqual(extractNumbers('Assignment 1 Part 2'), ['1', '2']);
  assert.deepEqual(extractNumbers('Midterm Exam'), []);
});

test('normalizeTitle strips dates and punctuation', () => {
  assert.equal(
    normalizeTitle('Lecture #7 Quiz - Due by Sept. 23rd 9:30am'),
    'lecture 7 quiz'
  );
  assert.equal(normalizeTitle('Assignment 1: Drop Box'), 'assignment 1 drop box');
});

test('isGradeCompleted identifies scored and graded entries', () => {
  assert.equal(isGradeCompleted({ score: 10 }), true);
  assert.equal(isGradeCompleted({ score: 0 }), true);
  assert.equal(isGradeCompleted({ PointsNumerator: 8.5 }), true);
  assert.equal(isGradeCompleted({ displayedGrade: '10 / 10' }), true);
  assert.equal(isGradeCompleted({ displayedGrade: 'Completed' }), true);

  // Ungraded entries
  assert.equal(isGradeCompleted({ score: null, displayedGrade: null }), false);
  assert.equal(isGradeCompleted({ score: null, displayedGrade: '-' }), false);
  assert.equal(isGradeCompleted({ score: null, displayedGrade: 'Not Graded' }), false);
  assert.equal(isGradeCompleted(null), false);
});

test('isTitleMatch matches quiz and assignment variants without false positives', () => {
  // Matching titles
  assert.equal(
    isTitleMatch(
      'Lecture #7 Quiz - Due by Sept. 23rd 9:30am',
      'Lecture #7 Quiz'
    ),
    true
  );
  assert.equal(isTitleMatch('Assignment 1', 'Assignment 1'), true);
  assert.equal(isTitleMatch('F26 Practice Quiz 1', 'F26 Practice Quiz 1'), true);
  assert.equal(isTitleMatch('CHEM 494 Declarations', 'CHEM 494 Declarations'), true);

  // Number mismatch should NOT match
  assert.equal(isTitleMatch('Lecture #7 Quiz', 'Lecture #8 Quiz'), false);
  assert.equal(isTitleMatch('Assignment 1', 'Assignment 2'), false);
  assert.equal(isTitleMatch('Quiz 1', 'Quiz 2'), false);
});

test('isDueCompletedByGrade checks course grades array correctly', () => {
  const courseGrades = [
    { name: 'Lecture #7 Quiz', score: 10, maxScore: 10 },
    { name: 'Lecture #8 Quiz', score: 9.5, maxScore: 10 },
    { name: 'Assignment 1', score: null, displayedGrade: '-' }, // unsubmitted
  ];

  const dueCompleted = { title: 'Lecture #7 Quiz - Due by Sept. 23rd 9:30am' };
  assert.equal(isDueCompletedByGrade(dueCompleted, courseGrades), true);

  const dueUncompleted = { title: 'Assignment 1' };
  assert.equal(isDueCompletedByGrade(dueUncompleted, courseGrades), false);

  const dueNotExisting = { title: 'Lecture #9 Quiz' };
  assert.equal(isDueCompletedByGrade(dueNotExisting, courseGrades), false);
});
