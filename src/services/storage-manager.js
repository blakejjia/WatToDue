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
   * Toggles completion status for a specific due ID.
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
   * Returns current user settings.
   * @returns {Promise<{ activeTerm: string|null, enabledCourseIds: number[]|null, cacheTtlMinutes: number }>}
   */
  async getSettings() {
    return {
      activeTerm: await this.get('selectedTerm', null),
      enabledCourseIds: await this.get('enabledCourseIds', null),
      cacheTtlMinutes: await this.get('cacheTtlMinutes', 30),
    };
  }
}

export const storageManager = new StorageManager();
