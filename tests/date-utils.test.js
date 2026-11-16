import { test } from 'node:test';
import assert from 'node:assert';
import { formatDueRelative, getMonthMatrix, isSameDay } from '../src/utils/date-utils.js';

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
