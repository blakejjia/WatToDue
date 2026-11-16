import { test } from 'node:test';
import assert from 'node:assert';
import {
  formatDueRelative,
  getMonthMatrix,
  isSameDay,
  getTimelineDateComponents,
  groupDuesByDate,
} from '../src/utils/date-utils.js';

test('formatDueRelative handles today, tomorrow, and past dates', () => {
  const now = new Date(2026, 2, 20, 12, 0, 0);
  const todayDue = new Date(2026, 2, 20, 23, 59, 0);
  const tomorrowDue = new Date(2026, 2, 21, 23, 59, 0);
  const pastDue = new Date(2026, 2, 18, 23, 59, 0);
  const futureDue = new Date(2026, 2, 28, 23, 59, 0);

  assert.strictEqual(formatDueRelative(todayDue, now).status, 'today');
  assert.strictEqual(formatDueRelative(tomorrowDue, now).status, 'tomorrow');
  assert.strictEqual(formatDueRelative(pastDue, now).status, 'overdue');
  assert.strictEqual(formatDueRelative(futureDue, now).status, 'upcoming');
});

test('isSameDay correctly identifies same local calendar day', () => {
  const d1 = new Date(2026, 2, 20, 1, 0, 0);
  const d2 = new Date(2026, 2, 20, 23, 30, 0);
  const d3 = new Date(2026, 2, 21, 1, 0, 0);
  assert.strictEqual(isSameDay(d1, d2), true);
  assert.strictEqual(isSameDay(d1, d3), false);
});

test('getMonthMatrix returns standard 7-column matrix cells in local dates', () => {
  const cells = getMonthMatrix(2026, 2); // March 2026
  assert.ok(cells.length === 35 || cells.length === 42);
  const currentMonthDays = cells.filter(c => c.isCurrentMonth);
  assert.strictEqual(currentMonthDays.length, 31);
});

test('getTimelineDateComponents formats bold date and subtitle matching reference style', () => {
  const ref = new Date(2026, 10, 16, 12, 0, 0); // Nov 16, 2026 (Monday)

  const today = getTimelineDateComponents(new Date(2026, 10, 16, 18, 0, 0), ref);
  assert.strictEqual(today.bold, 'Today');
  assert.ok(today.subtitle.includes('Nov 16'));

  const tomorrow = getTimelineDateComponents(new Date(2026, 10, 17, 9, 30, 0), ref);
  assert.strictEqual(tomorrow.bold, 'Tomorrow');

  const future = getTimelineDateComponents(new Date(2026, 10, 19, 18, 0, 0), ref);
  assert.strictEqual(future.bold, 'Nov 19');
  assert.strictEqual(future.subtitle, 'Thursday');
});

test('groupDuesByDate buckets dues by date and separates completed & overdue', () => {
  const ref = new Date(2026, 10, 16, 12, 0, 0); // Nov 16, 2026
  const dues = [
    { id: '1', dueDate: '2026-11-16T18:00:00Z', title: 'Due Today', completed: false },
    { id: '2', dueDate: '2026-11-19T23:59:00Z', title: 'Due Nov 19', completed: false },
    { id: '3', dueDate: '2026-11-10T23:59:00Z', title: 'Overdue Task', completed: false },
    { id: '4', dueDate: '2026-11-16T20:00:00Z', title: 'Done Task', completed: true },
  ];

  const grouped = groupDuesByDate(dues, ref);

  assert.strictEqual(grouped.overdue.length, 1);
  assert.strictEqual(grouped.overdue[0].id, '3');

  assert.strictEqual(grouped.completed.length, 1);
  assert.strictEqual(grouped.completed[0].id, '4');

  assert.strictEqual(grouped.dateGroups.length, 2);
  assert.strictEqual(grouped.dateGroups[0].items[0].id, '1');
  assert.strictEqual(grouped.dateGroups[1].items[0].id, '2');
});
