import { el } from './dom.js';

const CUSTOM_ICONS = {
  github: [
    ['path', { d: 'M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4' }],
    ['path', { d: 'M9 18c-4.51 2-5-2-7-2' }],
  ],
  chrome: [
    ['circle', { cx: '12', cy: '12', r: '10' }],
    ['circle', { cx: '12', cy: '12', r: '4' }],
    ['line', { x1: '21.17', y1: '8', x2: '12', y2: '8' }],
    ['line', { x1: '3.95', y1: '6.06', x2: '8.54', y2: '14' }],
    ['line', { x1: '10.88', y1: '21.94', x2: '15.46', y2: '14' }],
  ],
};

function renderSvg(name, children, attrs = {}) {
  if (typeof document === 'undefined') return null;
  const size = attrs.size || 16;
  const strokeWidth = attrs.strokeWidth || 2;
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
  svg.setAttribute('width', String(size));
  svg.setAttribute('height', String(size));
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('fill', 'none');
  svg.setAttribute('stroke', 'currentColor');
  svg.setAttribute('stroke-width', String(strokeWidth));
  svg.setAttribute('stroke-linecap', 'round');
  svg.setAttribute('stroke-linejoin', 'round');
  svg.setAttribute('class', ['lucide', `lucide-${name}`, attrs.className || attrs.class || ''].filter(Boolean).join(' '));

  for (const [tag, props] of children) {
    const child = document.createElementNS('http://www.w3.org/2000/svg', tag);
    for (const [k, v] of Object.entries(props)) {
      child.setAttribute(k, String(v));
    }
    svg.appendChild(child);
  }

  if (attrs.style) {
    Object.assign(svg.style, attrs.style);
  }
  return svg;
}

/**
 * Creates a Lucide icon element as an SVG element.
 * @param {string} name e.g. 'calendar', 'github', 'chrome', 'shield-check', 'trash-2', etc.
 * @param {object} [attrs={}]
 * @returns {HTMLElement|SVGElement}
 */
export function createIcon(name, attrs = {}) {
  if (CUSTOM_ICONS[name]) {
    return renderSvg(name, CUSTOM_ICONS[name], attrs);
  }

  const pascal = name
    .split('-')
    .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
    .join('');

  if (typeof window !== 'undefined' && window.lucide) {
    const iconDef = window.lucide[pascal] || window.lucide.icons?.[pascal];
    if (iconDef) {
      if (typeof window.lucide.createElement === 'function') {
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
      return renderSvg(name, iconDef, attrs);
    }
  }

  // Fallback element
  return el('i', {
    'data-lucide': name,
    className: `lucide lucide-${name} ${attrs.className || attrs.class || ''}`.trim(),
    style: attrs.style,
  });
}
