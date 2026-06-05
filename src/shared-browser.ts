/* ============================================================
   SHARED-BROWSER.TS — Shared item browsing list utilities
   Eliminates DRY violations between warehouse, 0mazon, and
   black market shop (filter bar + grid + pagination pattern).
   ============================================================ */

import type { BaseModule } from './types.js';

export const BROWSER_CATEGORIES = [
    { id: 'all', label: '全部' },
    { id: 'modules', label: '⚔️ 模块' },
    { id: 'items', label: '🧪 道具' },
    { id: 'materials', label: '🔩 材料' },
];
/**
 * Filter a list of items by the given category id.
 * Returns the full list if filter === 'all'.
 */
export function filterByCategory(items: BaseModule[], filter: string): BaseModule[] {
    if (filter === 'all')
        return items;
    if (filter === 'modules')
        return items.filter(i => i.type === 'weapon' || i.type === 'ball' || i.type === 'storage' ||
            i.type === 'accessory' || i.type === 'equip');
    if (filter === 'items')
        return items.filter(i => i.type === 'consumable' || i.type === 'item');
    if (filter === 'materials')
        return items.filter(i => i.type === 'material' || i.type === 'mat');
    return items;
}
/**
 * Render the category filter bar (tablist).
 * Uses the project-standard data-action delegation pattern (not inline onclick).
 * @param {string} currentFilter — active category id
 * @param {string} [extraHtml] — optional extra content after the tablist (e.g. batch sell button)
 * @returns {string} HTML
 */
export function renderFilterBar(currentFilter: string, extraHtml: string = ''): string {
    return `<div class="inv-filter-bar">
    <menu role="tablist">
      ${BROWSER_CATEGORIES.map(c => `<li role="tab"${currentFilter === c.id ? ' aria-selected="true"' : ''} data-tab="${c.id}" data-action="browser-filter" data-action-arg="${c.id}"><a href="#inv">${c.label}</a></li>`).join('')}
    </menu>
    ${extraHtml || ''}
  </div>`;
}
/**
 * Render pagination controls.
 * @param {number} totalItems — total items in the (filtered) list
 * @param {number} page — current page index (0-based)
 * @param {number} pageSize — items per page
 * @param {string} goPageFn — global onclick handler name, e.g. 'whGoPage'
 * @returns {string} HTML
 */
export function renderPagination(totalItems: number, page: number, pageSize: number, goPageFn: string): string {
    const total = Math.ceil(totalItems / pageSize) || 1;
    return `<div class="inv-pagination">
    <button class="page-btn" onclick="${goPageFn}(${page - 1})" ${page <= 0 ? 'disabled' : ''}>◀</button>
    <span style="padding:0 4px">${page + 1}/${total}</span>
    <button class="page-btn" onclick="${goPageFn}(${page + 1})" ${page >= total - 1 ? 'disabled' : ''}>▶</button>
  </div>`;
}
/**
 * Clamp page index within valid range and return the clamped value.
 * @param {number} page — current page index (0-based)
 * @param {number} totalPages — total pages count
 * @returns {number} clamped page index
 */
export function clampPage(page: number, totalPages: number): number {
    if (totalPages < 1)
        totalPages = 1;
    if (page >= totalPages)
        return totalPages - 1;
    if (page < 0)
        return 0;
    return page;
}
