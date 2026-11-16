/**
 * Safe DOM creation and manipulation utilities.
 */

/**
 * Creates an HTML element with attributes and child nodes.
 * @param {string} tag
 * @param {object} [attrs={}]
 * @param {...(Node|string|null|undefined)} children
 * @returns {HTMLElement}
 */
export function el(tag, attrs = {}, ...children) {
  const element = document.createElement(tag);

  for (const [key, value] of Object.entries(attrs || {})) {
    if (value === null || value === undefined) continue;

    if (key.startsWith('on') && typeof value === 'function') {
      const eventName = key.slice(2).toLowerCase();
      element.addEventListener(eventName, value);
    } else if (key === 'className') {
      element.className = value;
    } else if (key === 'style' && typeof value === 'object') {
      Object.assign(element.style, value);
    } else if (key === 'checked' || key === 'disabled' || key === 'selected') {
      element[key] = Boolean(value);
    } else {
      element.setAttribute(key, String(value));
    }
  }

  for (const child of children) {
    if (child === null || child === undefined) continue;
    if (child instanceof Node) {
      element.appendChild(child);
    } else {
      element.appendChild(document.createTextNode(String(child)));
    }
  }

  return element;
}

/**
 * Clears all children from an element.
 * @param {HTMLElement} parent
 */
export function clear(parent) {
  if (parent) {
    while (parent.firstChild) {
      parent.removeChild(parent.firstChild);
    }
  }
}
