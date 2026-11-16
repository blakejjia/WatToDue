import { test } from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';

test('manifest.json has required MV3 fields and permissions', () => {
  assert.ok(fs.existsSync('manifest.json'), 'manifest.json must exist');
  const manifest = JSON.parse(fs.readFileSync('manifest.json', 'utf8'));
  assert.strictEqual(manifest.manifest_version, 3);
  assert.strictEqual(manifest.name, 'WatToDue - Waterloo LEARN Dues & Grades');
  assert.ok(manifest.permissions.includes('storage'));
  assert.ok(manifest.host_permissions.includes('https://learn.uwaterloo.ca/*'));
  assert.strictEqual(manifest.action.default_popup, 'popup.html');
  assert.ok(fs.existsSync(manifest.icons['16']), '16px icon must exist');
  assert.ok(fs.existsSync(manifest.icons['48']), '48px icon must exist');
  assert.ok(fs.existsSync(manifest.icons['128']), '128px icon must exist');
});
