import { test } from 'node:test';
import assert from 'node:assert';
import { formatDueRelative, getMonthMatrix, isSameDay } from '../src/utils/date-utils.js';

test('formatDueRelative handles today, tomorrow, and past dates', () => {
  const now = new Date('2026-03-20T12:00:00Z');
  const todayDue = new Date('2026-03-20T23:59:00Z');
  const tomorrowDue = new Date('2026-03-21T23:59:00Z');
  const pastDue = new Date('2026-03-18T23:59:00Z');
  const futureDue = new Date('2026-03-28T23:59:00Z');

  assert.strictEqual(formatDueRelative(todayDue, now).status, 'today');
  assert.strictEqual(formatDueRelative(tomorrowDue, now).status, 'tomorrow');
  assert.strictEqual(formatDueRelative(pastDue, now).status, 'overdue');
  assert.strictEqual(formatDueRelative(futureDue, now).status, 'upcoming');
});

test('isSameDay correctly identifies same calendar day', () => {
  const d1 = new Date('2026-03-20T01:00:00Z');
  const d2 = new Date('2026-03-20T23:00:00Z');
  const d3 = new Date('2026-03-21T01:00:00Z');
  assert.strictEqual(isSameDay(d1, d2), true);
  assert.strictEqual(isSameDay(d1, d3), false);
});

test('getMonthMatrix returns standard 7-column matrix cells', () => {
  const cells = getMonthMatrix(2026, 2); // March 2026
  assert.ok(cells.length === 35 || cells.length === 42);
  const currentMonthDays = cells.filter(c => c.isCurrentMonth);
  assert.strictEqual(currentMonthDays.length, 31);
});
