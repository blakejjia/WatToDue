import { Endpoints, BASE_URL } from './endpoints.js';

export class SessionExpiredError extends Error {
  constructor(message = 'Session expired or not logged in to Waterloo LEARN.') {
    super(message);
    this.name = 'SessionExpiredError';
  }
}

export class D2LClientError extends Error {
  constructor(message, status) {
    super(message);
    this.name = 'D2LClientError';
    this.status = status;
  }
}

/**
 * Checks if a response indicates a login redirect rather than API JSON.
 * @param {Response} response
 * @param {string} text
 * @returns {boolean}
 */
function isLoginHtml(response, text) {
  if (response.status === 401 || response.status === 403) {
    return true;
  }
  const contentType = (response.headers.get('content-type') || '').toLowerCase();
  if (contentType.includes('text/html')) {
    if (/<title[^>]*>\s*(?:sign\s*in|log\s*in|login)/i.test(text)) {
      return true;
    }
    if (/<form[^>]+(?:action|id|class)=[^>]*(?:login|signin|d2l)/i.test(text)) {
      return true;
    }
  }
  return false;
}

export class D2LClient {
  /**
   * @param {object} [options]
   * @param {typeof fetch} [options.fetchFn]
   * @param {string} [options.lpVersion]
   * @param {string} [options.leVersion]
   */
  constructor(options = {}) {
    this.fetchFn = options.fetchFn || globalThis.fetch.bind(globalThis);
    this.lpVersion = options.lpVersion || null;
    this.leVersion = options.leVersion || null;
  }

  /**
   * Safe fetch with ambient credentials and login detection.
   * @param {string} url
   * @returns {Promise<any>}
   */
  async requestJson(url) {
    const response = await this.fetchFn(url, {
      method: 'GET',
      credentials: 'include',
      headers: {
        Accept: 'application/json, text/plain, */*',
      },
    });

    if (response.status === 401 || response.status === 403) {
      throw new SessionExpiredError();
    }

    const contentType = (response.headers.get('content-type') || '').toLowerCase();
    if (contentType.includes('text/html')) {
      const text = await response.text();
      if (isLoginHtml(response, text)) {
        throw new SessionExpiredError();
      }
      throw new D2LClientError('Expected JSON response but received HTML.', response.status);
    }

    if (!response.ok) {
      throw new D2LClientError(`HTTP error: ${response.status} ${response.statusText}`, response.status);
    }

    try {
      return await response.json();
    } catch (err) {
      throw new D2LClientError('Failed to parse JSON response.', response.status);
    }
  }

  /**
   * Negotiates highest supported 'lp' and 'le' API versions.
   * @returns {Promise<{ lp: string, le: string }>}
   */
  async getVersions() {
    const raw = await this.requestJson(Endpoints.versions());
    if (!Array.isArray(raw)) {
      throw new D2LClientError('Invalid versions payload format');
    }

    let lp = null;
    let le = null;

    for (const item of raw) {
      if (!item || typeof item !== 'object') continue;
      const code = String(item.ProductCode || '').toLowerCase();
      const version = String(item.LatestVersion || '');
      if (code === 'lp' && version) lp = version;
      if (code === 'le' && version) le = version;
    }

    if (!lp || !le) {
      throw new D2LClientError('Failed to resolve both lp and le API versions.');
    }

    this.lpVersion = lp;
    this.leVersion = le;
    return { lp, le };
  }

  /**
   * Verifies session and retrieves current student identity.
   * @returns {Promise<{ identifier: string, firstName: string, lastName: string, uniqueName: string }>}
   */
  async getWhoAmI() {
    if (!this.lpVersion) {
      await this.getVersions();
    }
    const raw = await this.requestJson(Endpoints.whoAmI(this.lpVersion));
    return {
      identifier: raw.Identifier || '',
      firstName: raw.FirstName || '',
      lastName: raw.LastName || '',
      uniqueName: raw.UniqueName || '',
    };
  }

  /**
   * Retrieves all enrollments across pages.
   * @returns {Promise<Array<object>>}
   */
  async getEnrollments() {
    if (!this.lpVersion) {
      await this.getVersions();
    }

    const items = [];
    let bookmark = null;
    const seenBookmarks = new Set();
    const MAX_PAGES = 15;

    for (let page = 0; page < MAX_PAGES; page++) {
      const url = Endpoints.enrollments(this.lpVersion, bookmark);
      const payload = await this.requestJson(url);

      if (payload && Array.isArray(payload.Items)) {
        items.push(...payload.Items);
      }

      const paging = payload?.PagingInfo;
      if (!paging || !paging.HasMoreItems) {
        break;
      }

      const nextBookmark = paging.Bookmark;
      if (!nextBookmark || seenBookmarks.has(nextBookmark)) {
        break;
      }
      seenBookmarks.add(nextBookmark);
      bookmark = nextBookmark;
    }

    return items;
  }

  /**
   * Retrieves dropbox assignment folders for an org unit.
   * @param {number} orgUnitId
   * @returns {Promise<Array<object>>}
   */
  async getDropboxes(orgUnitId) {
    if (!this.leVersion) {
      await this.getVersions();
    }
    const url = Endpoints.dropboxes(this.leVersion, orgUnitId);
    const data = await this.requestJson(url);
    return Array.isArray(data) ? data : [];
  }

  /**
   * Retrieves quizzes for an org unit.
   * @param {number} orgUnitId
   * @returns {Promise<Array<object>>}
   */
  async getQuizzes(orgUnitId) {
    if (!this.leVersion) {
      await this.getVersions();
    }
    const url = Endpoints.quizzes(this.leVersion, orgUnitId);
    const data = await this.requestJson(url);
    if (Array.isArray(data)) return data;
    if (data && Array.isArray(data.Objects)) return data.Objects;
    return [];
  }

  /**
   * Retrieves complete grade items from LEARN HTML (exact same layout and all items).
   * Falls back to REST API myGradeValues if HTML fetch fails.
   * @param {number} orgUnitId
   * @returns {Promise<Array<object>>}
   */
  async getGrades(orgUnitId) {
    try {
      const response = await this.fetchFn(
        `${BASE_URL}/d2l/lms/grades/my_grades/main.d2l?ou=${orgUnitId}`,
        { method: 'GET', credentials: 'include' }
      );
      if (response.ok) {
        const html = await response.text();
        const parsed = this.parseGradesHtml(html);
        if (parsed.length > 0) {
          return parsed;
        }
      }
    } catch (_) {}

    // Fallback to REST API
    try {
      if (!this.leVersion) {
        await this.getVersions();
      }
      const url = Endpoints.grades(this.leVersion, orgUnitId);
      const data = await this.requestJson(url);
      return Array.isArray(data) ? data : [];
    } catch (_) {
      return [];
    }
  }

  /**
   * Parses complete hierarchical grade items from LEARN HTML table.
   * @param {string} html
   * @returns {Array<object>}
   */
  parseGradesHtml(html) {
    const items = [];
    const trMatches = html.match(/<tr[^>]*>[\s\S]*?<\/tr>/gi) || [];
    let currentCategoryId = null;
    let currentCategoryName = null;

    for (const tr of trMatches) {
      if (/class="[^"]*d_gh[^"]*"/i.test(tr)) continue; // Skip header row

      const thMatch = tr.match(/<th[^>]*>([\s\S]*?)<\/th>/i);
      if (!thMatch) continue;

      const cleanName = thMatch[1].replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();
      if (!cleanName || cleanName.toLowerCase() === 'grade item') continue;

      const isCategory = /class="[^"]*d_ggl1[^"]*"/i.test(tr);

      const tdMatches = tr.match(/<td[^>]*>([\s\S]*?)<\/td>/gi) || [];
      const tds = tdMatches.map((td) => td.replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim());

      let pointsStr = '';
      let weightStr = '';
      let gradeStr = '';
      let commentsStr = '';

      if (isCategory) {
        weightStr = tds[1] || '';
        gradeStr = tds[2] || '';
        commentsStr = tds[3] || '';
      } else {
        if (tds.length >= 4 && tds[0] === '') {
          pointsStr = tds[1] || '';
          weightStr = tds[2] || '';
          gradeStr = tds[3] || '';
          commentsStr = tds[4] || '';
        } else {
          pointsStr = tds[0] || '';
          weightStr = tds[1] || '';
          gradeStr = tds[2] || '';
          commentsStr = tds[3] || '';
        }
      }

      const itemId = `grade-${items.length + 1}`;
      if (isCategory) {
        currentCategoryId = itemId;
        currentCategoryName = cleanName;
      }

      const pMatch = pointsStr.match(/([\d.]+)\s*\/\s*([\d.]+)/);
      const score = pMatch ? parseFloat(pMatch[1]) : null;
      const maxScore = pMatch ? parseFloat(pMatch[2]) : null;

      const wMatch = weightStr.match(/([\d.]+)\s*\/\s*([\d.]+)/);
      const weightedScore = wMatch ? parseFloat(wMatch[1]) : (parseFloat(weightStr) || null);
      const weightedMax = wMatch ? parseFloat(wMatch[2]) : null;

      const gMatch = gradeStr.match(/([\d.]+)\s*%/);
      const percentVal = gMatch ? parseFloat(gMatch[1]) : (score !== null && maxScore > 0 ? (score / maxScore) * 100 : null);

      // "if that is 0, mark is as ungraded. There should never be some zero mark as the grade"
      const isZero = (score === 0 || percentVal === 0 || (isCategory && weightedScore === 0));
      const isGraded = !isZero && (score !== null || percentVal !== null || (isCategory && weightedScore > 0));

      // Extract comment / assessment links (e.g. View Quiz Attempts)
      const linkMatch = tr.match(/<a[^>]*href="([^"]+)"[^>]*>[\s\S]*?(?:view quiz attempts|feedback|view submission)[\s\S]*?<\/a>/i) ||
                        tr.match(/<td[^>]*class="[^"]*d2l-table-cell-last[^"]*"[^>]*>[\s\S]*?<a[^>]*href="([^"]+)"/i);
      let commentUrl = linkMatch ? linkMatch[1].replace(/&amp;/g, '&') : null;
      if (commentUrl && !commentUrl.startsWith('http')) {
        commentUrl = `${BASE_URL}${commentUrl}`;
      }

      items.push({
        id: itemId,
        name: cleanName,
        isCategory,
        categoryId: isCategory ? null : currentCategoryId,
        categoryName: isCategory ? null : currentCategoryName,
        score: isGraded ? score : null,
        maxScore,
        percent: isGraded && percentVal !== null ? Math.round(percentVal * 10) / 10 : null,
        weightedScore: isGraded ? weightedScore : 0,
        weightedMax,
        rawPointsStr: pointsStr,
        rawWeightStr: weightStr,
        rawGradeStr: gradeStr,
        isGraded,
        comment: commentsStr || null,
        commentUrl: commentUrl || null,
      });
    }

    return items;
  }

  /**
   * Retrieves submission records for a specific dropbox folder.
   * @param {number} orgUnitId
   * @param {number} folderId
   * @returns {Promise<Array<object>>}
   */
  async getDropboxSubmissions(orgUnitId, folderId) {
    if (!this.leVersion) {
      await this.getVersions();
    }
    const url = Endpoints.dropboxSubmissions(this.leVersion, orgUnitId, folderId);
    try {
      const data = await this.requestJson(url);
      return Array.isArray(data) ? data : [];
    } catch (_) {
      return [];
    }
  }

  /**
   * Retrieves user attempts for a specific quiz.
   * @param {number} orgUnitId
   * @param {number} quizId
   * @returns {Promise<Array<object>>}
   */
  async getQuizAttempts(orgUnitId, quizId) {
    if (!this.leVersion) {
      await this.getVersions();
    }
    const url = Endpoints.quizAttempts(this.leVersion, orgUnitId, quizId);
    try {
      const data = await this.requestJson(url);
      if (Array.isArray(data)) return data;
      if (data && Array.isArray(data.Objects)) return data.Objects;
      return [];
    } catch (_) {
      return [];
    }
  }

  /**
   * Directly extracts submitted dropbox folder IDs from LEARN HTML.
   * @param {number} orgUnitId
   * @returns {Promise<Set<number>>}
   */
  async getSubmittedDropboxFolderIds(orgUnitId) {
    try {
      const response = await this.fetchFn(
        `${BASE_URL}/d2l/lms/dropbox/user/folders_list.d2l?ou=${orgUnitId}`,
        { method: 'GET', credentials: 'include' }
      );
      if (!response.ok) return new Set();
      const html = await response.text();

      const submitted = new Set();
      const trMatches = html.match(/<tr[^>]*>[\s\S]*?<\/tr>/gi) || [];

      for (const tr of trMatches) {
        const plain = tr.replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ');
        const dbMatch = tr.match(/href="[^"]*db=(\d+)[^"]*"/i);
        if (dbMatch) {
          const folderId = Number(dbMatch[1]);
          const isSubmitted =
            /submission/i.test(plain) ||
            /folders_history/i.test(tr) ||
            (/%/i.test(plain) && !/not submitted/i.test(plain));
          if (isSubmitted) {
            submitted.add(folderId);
          }
        }
      }
      return submitted;
    } catch (_) {
      return new Set();
    }
  }

  /**
   * Directly extracts completed quiz IDs from LEARN HTML attempts count.
   * @param {number} orgUnitId
   * @returns {Promise<Set<number>>}
   */
  async getCompletedQuizIds(orgUnitId) {
    try {
      const response = await this.fetchFn(
        `${BASE_URL}/d2l/lms/quizzing/user/quizzes_list.d2l?ou=${orgUnitId}`,
        { method: 'GET', credentials: 'include' }
      );
      if (!response.ok) return new Set();
      const html = await response.text();

      const completed = new Set();
      const trMatches = html.match(/<tr[^>]*>[\s\S]*?<\/tr>/gi) || [];

      for (const tr of trMatches) {
        if (/GoToQuiz/i.test(tr)) {
          const qMatch = tr.match(/GoToQuiz\((\d+)/i);
          if (qMatch) {
            const quizId = Number(qMatch[1]);
            const plain = tr.replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ');
            const attMatch = plain.match(/(\d+)\s*\/\s*(?:\d+|unlimited)/i);
            if (attMatch && Number(attMatch[1]) > 0) {
              completed.add(quizId);
            }
          }
        }
      }
      return completed;
    } catch (_) {
      return new Set();
    }
  }
}
