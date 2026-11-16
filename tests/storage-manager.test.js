import { test } from 'node:test';
import assert from 'node:assert';
import { storageManager } from '../src/services/storage-manager.js';

test('storageManager persists completedDueIds and updates dues cache', async () => {
  const initialDues = [
    { id: 'dropbox-1', title: 'A1', completed: false },
    { id: 'quiz-2', title: 'Q1', completed: false }
  ];
  await storageManager.set('dues', initialDues);

  // Toggle dropbox-1 to completed
  const state1 = await storageManager.toggleCompleted('dropbox-1');
  assert.strictEqual(state1, true);

  const completedList = await storageManager.get('completedDueIds');
  assert.ok(completedList.includes('dropbox-1'));

  const updatedDues = await storageManager.get('dues');
  const d1 = updatedDues.find(d => d.id === 'dropbox-1');
  assert.strictEqual(d1.completed, true);

  // Toggle again to uncomplete
  const state2 = await storageManager.toggleCompleted('dropbox-1');
  assert.strictEqual(state2, false);

  const updatedDues2 = await storageManager.get('dues');
  const d1Again = updatedDues2.find(d => d.id === 'dropbox-1');
  assert.strictEqual(d1Again.completed, false);
});
