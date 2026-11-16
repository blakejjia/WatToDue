import { el } from './dom.js';

/**
 * Creates a Lucide icon element.
 * If lucide is loaded globally, renders SVG directly via lucide.createElement.
 * Otherwise creates <i data-lucide="..."> which can be resolved via lucide.createIcons().
 * @param {string} name e.g. 'calendar', 'graduation-cap', 'settings', 'folder', 'check', 'refresh-cw', 'external-link'
 * @param {object} [attrs={}]
 * @returns {HTMLElement|SVGElement}
 */
export function createIcon(name, attrs = {}) {
  const pascal = name
    .split('-')
    .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
    .join('');

  if (typeof window !== 'undefined' && window.lucide) {
    const iconDef = window.lucide[pascal] || window.lucide.icons?.[pascal];
    if (iconDef && typeof window.lucide.createElement === 'function') {
      const size = attrs.size || 16;
      const strokeWidth = attrs.strokeWidth || 2;
      const className = ['lucide', `lucide-${name}`, attrs.className || attrs.class || ''].filter(Boolean).join(' ');

      const svg = window.lucide.createElement(iconDef, {
        width: String(size),
        height: String(size),
        'stroke-width': String(strokeWidth),
        class: className,
      });

      if (attrs.style) {
        Object.assign(svg.style, attrs.style);
      }
      return svg;
    }
  }

  // Fallback element
  return el('i', {
    'data-lucide': name,
    className: `lucide lucide-${name} ${attrs.className || attrs.class || ''}`.trim(),
    style: attrs.style,
  });
}
