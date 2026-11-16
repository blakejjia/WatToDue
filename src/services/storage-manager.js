/**
 * Persistent Storage Manager using chrome.storage.local with Node/in-memory fallback.
 */

class StorageManager {
  constructor() {
    this.memoryFallback = new Map();
  }

  isExtension() {
    return typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local;
  }

  /**
   * Retrieves a value by key.
   * @param {string} key
   * @param {any} [defaultValue=null]
   * @returns {Promise<any>}
   */
  async get(key, defaultValue = null) {
    if (this.isExtension()) {
      return new Promise((resolve) => {
        chrome.storage.local.get([key], (result) => {
          resolve(result[key] !== undefined ? result[key] : defaultValue);
        });
      });
    }

    // Fallback: localStorage or memory
    if (typeof localStorage !== 'undefined') {
      const raw = localStorage.getItem(`wattodue_${key}`);
      if (raw !== null) {
        try {
          return JSON.parse(raw);
        } catch (_) {
          return raw;
        }
      }
    }

    return this.memoryFallback.has(key) ? this.memoryFallback.get(key) : defaultValue;
  }

  /**
   * Sets a value by key.
   * @param {string} key
   * @param {any} value
   * @returns {Promise<void>}
   */
  async set(key, value) {
    if (this.isExtension()) {
      return new Promise((resolve) => {
        chrome.storage.local.set({ [key]: value }, resolve);
      });
    }

    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(`wattodue_${key}`, JSON.stringify(value));
    }
    this.memoryFallback.set(key, value);
  }

  /**
   * Toggles completion status for a specific due ID, persisting to both
   * completedDueIds list and in-storage dues cache.
   * @param {string} dueId - e.g. "dropbox-101" or "quiz-202"
   * @returns {Promise<boolean>} New completion state
   */
  async toggleCompleted(dueId) {
    const list = (await this.get('completedDueIds', [])) || [];
    const set = new Set(list);
    let newState = false;
    if (set.has(dueId)) {
      set.delete(dueId);
      newState = false;
    } else {
      set.add(dueId);
      newState = true;
    }
    await this.set('completedDueIds', Array.from(set));

    // Also update in-storage dues array so next cache load carries correct state
    const dues = (await this.get('dues', [])) || [];
    let updated = false;
    for (const d of dues) {
      if (d && d.id === dueId) {
        d.completed = newState;
        updated = true;
      }
    }
    if (updated) {
      await this.set('dues', dues);
    }

    return newState;
  }

  /**
   * Checks if an item is completed.
   * @param {string} dueId
   * @returns {Promise<boolean>}
   */
  async isCompleted(dueId) {
    const list = (await this.get('completedDueIds', [])) || [];
    return list.includes(dueId);
  }

  /**
   * Gets enabled course IDs partitioned by academic term.
   * @param {string} termCode
   * @returns {Promise<number[]|null>}
   */
  async getEnabledCoursesForTerm(termCode) {
    if (!termCode) return null;
    const termMap = (await this.get('enabledCourseIdsByTerm', {})) || {};
    return termMap[termCode] !== undefined ? termMap[termCode] : null;
  }

  /**
   * Sets enabled course IDs for a specific academic term.
   * @param {string} termCode
   * @param {number[]} courseIds
   */
  async setEnabledCoursesForTerm(termCode, courseIds) {
    if (!termCode) return;
    const termMap = (await this.get('enabledCourseIdsByTerm', {})) || {};
    termMap[termCode] = courseIds;
    await this.set('enabledCourseIdsByTerm', termMap);
  }

  /**
   * Returns current user settings.
   * @returns {Promise<{ activeTerm: string|null, cacheTtlMinutes: number }>}
   */
  async getSettings() {
    return {
      activeTerm: await this.get('selectedTerm', null),
      cacheTtlMinutes: await this.get('cacheTtlMinutes', 30),
    };
  }
}

export const storageManager = new StorageManager();
