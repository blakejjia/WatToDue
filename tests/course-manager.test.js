import { test } from 'node:test';
import assert from 'node:assert';
import { parseCourseOffering, groupCoursesByTerm, determineCourseComponent } from '../src/services/course-manager.js';

test('parseCourseOffering accurately classifies Waterloo laboratory courses (CHEM 220L)', () => {
  const labItem = {
    OrgUnit: {
      Id: 1291911,
      Name: 'CHEM 220L - Fall 2026',
      Code: 'CHEM220L_sblavery_1269',
      Type: { Code: 'Course Offering' }
    },
    Access: { IsActive: true }
  };
  const course = parseCourseOffering(labItem);
  assert.ok(course);
  assert.strictEqual(course.subject, 'CHEM');
  assert.strictEqual(course.catalogNumber, '220L');
  assert.strictEqual(course.component, 'LAB');
  assert.strictEqual(course.defaultEnabled, true);
  assert.strictEqual(course.termCode, '1269');
});

test('parseCourseOffering classifies Waterloo lecture courses (CHEM 220)', () => {
  const lecItem = {
    OrgUnit: {
      Id: 1291906,
      Name: 'CHEM 220 - Fall 2026',
      Code: 'CHEM220_sblavery_1269',
      Type: { Code: 'Course Offering' }
    },
    Access: { IsActive: true }
  };
  const course = parseCourseOffering(lecItem);
  assert.ok(course);
  assert.strictEqual(course.subject, 'CHEM');
  assert.strictEqual(course.catalogNumber, '220');
  assert.strictEqual(course.component, 'LEC');
  assert.strictEqual(course.defaultEnabled, true);
});

test('determineCourseComponent handles suffixes and explicit keywords', () => {
  assert.strictEqual(determineCourseComponent({ catalogNumber: '220L' }), 'LAB');
  assert.strictEqual(determineCourseComponent({ catalogNumber: '240L' }), 'LAB');
  assert.strictEqual(determineCourseComponent({ catalogNumber: '135L' }), 'LAB');
  assert.strictEqual(determineCourseComponent({ catalogNumber: '101R' }), 'TUT');
  assert.strictEqual(determineCourseComponent({ name: 'MATH 135 TUT - Fall 2026' }), 'TUT');
  assert.strictEqual(determineCourseComponent({ name: 'CS 135 TST - Fall 2026' }), 'TST');
  assert.strictEqual(determineCourseComponent({ catalogNumber: '439' }), 'LEC');
  assert.strictEqual(determineCourseComponent({ explicitComponent: 'LAB' }), 'LAB');
});

test('parseCourseOffering parses course details and components', () => {
  const item = {
    OrgUnit: {
      Id: 1265323,
      Name: '1265-CHEM.233.001.1.LEC',
      Code: '1265-CHEM.233.001.1.LEC',
      Type: { Code: 'Course Offering' }
    },
    Access: { IsActive: true }
  };
  const course = parseCourseOffering(item);
  assert.ok(course);
  assert.strictEqual(course.id, 1265323);
  assert.strictEqual(course.termCode, '1265');
  assert.strictEqual(course.termLabel, 'Spring 2026');
  assert.strictEqual(course.subject, 'CHEM');
  assert.strictEqual(course.catalogNumber, '233');
  assert.strictEqual(course.component, 'LEC');
  assert.strictEqual(course.displayName, 'CHEM 233 (LEC)');
  assert.strictEqual(course.defaultEnabled, true);
});

test('parseCourseOffering marks TUT and TST disabled by default', () => {
  const tutItem = {
    OrgUnit: {
      Id: 1265325,
      Name: '1265-CHEM.233.101.1.TUT',
      Code: '1265-CHEM.233.101.1.TUT',
      Type: { Code: 'Course Offering' }
    },
    Access: { IsActive: true }
  };
  const tut = parseCourseOffering(tutItem);
  assert.ok(tut);
  assert.strictEqual(tut.component, 'TUT');
  assert.strictEqual(tut.defaultEnabled, false);
});

test('parseCourseOffering rejects non-course offerings', () => {
  assert.strictEqual(parseCourseOffering({ OrgUnit: { Id: 946201, Name: 'Group 67' } }), null);
  assert.strictEqual(parseCourseOffering({ OrgUnit: { Id: 154950, Name: 'SciSpace', Type: { Code: 'Department' } } }), null);
});

test('groupCoursesByTerm groups and sorts courses by term chronologically', () => {
  const courses = [
    { id: 1, termCode: '1241', termLabel: 'Winter 2024', name: 'Course 1' },
    { id: 2, termCode: '1265', termLabel: 'Spring 2026', name: 'Course 2' },
    { id: 3, termCode: '1265', termLabel: 'Spring 2026', name: 'Course 3' },
  ];
  const grouped = groupCoursesByTerm(courses);
  assert.strictEqual(grouped.length, 2);
  // Latest term first
  assert.strictEqual(grouped[0].termCode, '1265');
  assert.strictEqual(grouped[0].courses.length, 2);
  assert.strictEqual(grouped[1].termCode, '1241');
  assert.strictEqual(grouped[1].courses.length, 1);
});
