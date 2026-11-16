import { Endpoints } from './endpoints.js';

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
   * Retrieves grade values for the current user in an org unit.
   * @param {number} orgUnitId
   * @returns {Promise<Array<object>>}
   */
  async getGrades(orgUnitId) {
    if (!this.leVersion) {
      await this.getVersions();
    }
    const url = Endpoints.grades(this.leVersion, orgUnitId);
    const data = await this.requestJson(url);
    return Array.isArray(data) ? data : [];
  }
}
