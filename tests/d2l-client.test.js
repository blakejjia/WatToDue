import { test } from 'node:test';
import assert from 'node:assert';
import { D2LClient, SessionExpiredError } from '../src/api/d2l-client.js';

test('D2LClient negotiates lp and le versions correctly', async () => {
  const mockFetch = async (url) => {
    if (url.endsWith('/d2l/api/versions/')) {
      return {
        ok: true,
        headers: { get: () => 'application/json' },
        json: async () => [
          { ProductCode: 'lp', LatestVersion: '1.45' },
          { ProductCode: 'le', LatestVersion: '1.74' }
        ]
      };
    }
    throw new Error(`Unexpected url: ${url}`);
  };

  const client = new D2LClient({ fetchFn: mockFetch });
  const versions = await client.getVersions();
  assert.deepStrictEqual(versions, { lp: '1.45', le: '1.74' });
  assert.strictEqual(client.lpVersion, '1.45');
  assert.strictEqual(client.leVersion, '1.74');
});

test('D2LClient throws SessionExpiredError on HTML login response or 401/403', async () => {
  const mockFetchHtml = async () => ({
    ok: true,
    headers: { get: (h) => (h.toLowerCase() === 'content-type' ? 'text/html; charset=utf-8' : null) },
    text: async () => '<html><title>Sign In</title><body>Please log in</body></html>'
  });

  const client = new D2LClient({ fetchFn: mockFetchHtml, lpVersion: '1.45' });
  await assert.rejects(
    async () => client.getWhoAmI(),
    (err) => err instanceof SessionExpiredError
  );
});

test('D2LClient retrieves whoami data', async () => {
  const mockFetch = async (url) => {
    if (url.includes('/users/whoami')) {
      return {
        ok: true,
        headers: { get: () => 'application/json' },
        json: async () => ({
          Identifier: '12345',
          FirstName: 'yingxuan',
          LastName: 'Jia',
          UniqueName: 'yjia'
        })
      };
    }
  };

  const client = new D2LClient({ fetchFn: mockFetch, lpVersion: '1.45' });
  const whoami = await client.getWhoAmI();
  assert.strictEqual(whoami.firstName, 'yingxuan');
  assert.strictEqual(whoami.lastName, 'Jia');
});

test('D2LClient handles course dropboxes and quizzes', async () => {
  const mockFetch = async (url) => {
    if (url.includes('/dropbox/folders/')) {
      return {
        ok: true,
        headers: { get: () => 'application/json' },
        json: async () => [
          { Id: 101, Name: 'Assignment 1', DueDate: '2026-03-25T23:59:00Z' }
        ]
      };
    }
    if (url.includes('/quizzes/')) {
      return {
        ok: true,
        headers: { get: () => 'application/json' },
        json: async () => ({
          Objects: [
            { QuizId: 202, Name: 'Quiz 1', DueDate: '2026-03-28T23:59:00Z' }
          ]
        })
      };
    }
  };

  const client = new D2LClient({ fetchFn: mockFetch, leVersion: '1.74' });
  const dropboxes = await client.getDropboxes(1234);
  assert.strictEqual(dropboxes.length, 1);
  assert.strictEqual(dropboxes[0].Name, 'Assignment 1');

  const quizzes = await client.getQuizzes(1234);
  assert.strictEqual(quizzes.length, 1);
  assert.strictEqual(quizzes[0].Name, 'Quiz 1');
});
