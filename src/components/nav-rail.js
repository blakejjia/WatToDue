import { el, clear } from '../utils/dom.js';

/**
 * Navigation Rail Component.
 */
export class NavRail {
  /**
   * @param {HTMLElement} container
   * @param {object} options
   * @param {string} [options.activeTab='dues']
   * @param {boolean} [options.isPopup=false]
   * @param {(tabName: string) => void} options.onTabChange
   * @param {() => void} [options.onExpand]
   */
  constructor(container, options) {
    this.container = container;
    this.activeTab = options.activeTab || 'dues';
    this.isPopup = Boolean(options.isPopup);
    this.onTabChange = options.onTabChange || (() => {});
    this.onExpand = options.onExpand || (() => {});

    this.render();
  }

  setTab(tabName) {
    this.activeTab = tabName;
    this.render();
  }

  render() {
    clear(this.container);

    // Brand icon
    const brand = el(
      'div',
      { className: 'rail-brand', title: 'WatToDue' },
      el('img', { src: 'icons/icon-48.png', alt: 'WatToDue' })
    );

    // Navigation items
    const itemsContainer = el('div', { className: 'rail-items' });

    const tabs = [
      { id: 'dues', label: 'Dues', icon: '📅' },
      { id: 'grades', label: 'Grades', icon: '📊' },
      { id: 'settings', label: 'Settings', icon: '⚙️' },
    ];

    for (const tab of tabs) {
      const isActive = this.activeTab === tab.id;
      const btn = el(
        'button',
        {
          className: `rail-item ${isActive ? 'active' : ''}`,
          title: tab.label,
          onClick: () => {
            if (this.activeTab !== tab.id) {
              this.activeTab = tab.id;
              this.render();
              this.onTabChange(tab.id);
            }
          },
        },
        el('span', { className: 'rail-item-icon' }, tab.icon),
        el('span', { className: 'rail-item-label' }, tab.label)
      );
      itemsContainer.appendChild(btn);
    }

    // Rail Footer
    const footer = el('div', { className: 'rail-footer' });

    if (this.isPopup) {
      const expandBtn = el(
        'button',
        {
          className: 'rail-footer-btn',
          title: 'Open in Full Tab',
          onClick: () => this.onExpand(),
        },
        '⤢'
      );
      footer.appendChild(expandBtn);
    }

    this.container.appendChild(brand);
    this.container.appendChild(itemsContainer);
    this.container.appendChild(footer);
  }
}
