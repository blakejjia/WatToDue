import { test } from 'node:test';
import assert from 'node:assert';
import { parseTermCode, extractTermFromOffering } from '../src/services/term-parser.js';

test('parseTermCode correctly translates Waterloo 4-digit codes', () => {
  assert.deepStrictEqual(parseTermCode('1251'), { termCode: '1251', season: 'Winter', year: 2025, label: 'Winter 2025' });
  assert.deepStrictEqual(parseTermCode('1255'), { termCode: '1255', season: 'Spring', year: 2025, label: 'Spring 2025' });
  assert.deepStrictEqual(parseTermCode('1259'), { termCode: '1259', season: 'Fall', year: 2025, label: 'Fall 2025' });
  assert.deepStrictEqual(parseTermCode('1261'), { termCode: '1261', season: 'Winter', year: 2026, label: 'Winter 2026' });
  assert.deepStrictEqual(parseTermCode('1265'), { termCode: '1265', season: 'Spring', year: 2026, label: 'Spring 2026' });
  assert.strictEqual(parseTermCode('invalid'), null);
  assert.strictEqual(parseTermCode('999'), null);
  assert.strictEqual(parseTermCode('2000'), null);
});

test('extractTermFromOffering finds last 4-digit Waterloo term', () => {
  assert.strictEqual(extractTermFromOffering('1265-CHEM.233.001.1.LEC'), '1265');
  assert.strictEqual(extractTermFromOffering('1241-SCBUS.122.002.1.LEC'), '1241');
  assert.strictEqual(extractTermFromOffering('SciSpace'), null);
  assert.strictEqual(extractTermFromOffering('Group 67'), null);
});
