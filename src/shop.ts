/* ============================================================
   SHOP.TS — 0mazon (BTC shop) & Black Market (cash shop + orders)
   ============================================================ */

import { DATA } from './data.js';
import { GS, dispatch } from './state.js';
import { addToWarehouse, countInWarehouse, removeFromWarehouse } from './state.js';
import { filterByCategory, clampPage, renderFilterBar, renderPagination } from './shared-browser.js';
import { showToast, updateTaskbar, qualityClass, qualityDotClass, typeLabel, qualityBadge, detailNameHtml, currentWindowType } from './screens.js';
import { renderEquipProps } from './inventory.js';
import type { ShopRef, BaseModule } from './types.js';

// ============================================================
// 0MAZON SHOP
// ============================================================
export const SHOP_COLS = 6;
export const SHOP_PAGE_SIZE = SHOP_COLS * 6;
export let shopFilter = 'modules';
export let shopPage = 0;
export let shopSelected: number | null = null;
export function resolveShopRef(ref: ShopRef): BaseModule | null {
    const rtype = ref.type;
    if (rtype === 'weapon') {
        const m = DATA.WEAPONS.find(w => w.id === ref.ref);
        return m ? { ...m, type: 'weapon', slotType: 'weapon' } : null;
    }
    if (rtype === 'ball') {
        const m = DATA.BALLS.find(b => b.id === ref.ref);
        return m ? { ...m, type: 'ball', slotType: 'ball' } : null;
    }
    if (rtype === 'storage') {
        const m = DATA.STORAGES.find(s => s.id === ref.ref);
        return m ? { ...m, type: 'storage', slotType: 'storage' } : null;
    }
    if (rtype === 'accessory') {
        const m = DATA.ACCESSORY_POOL.find(a => a.id === ref.ref);
        return m ? { ...m, type: 'accessory', slotType: 'acc' } : null;
    }
    if (rtype === 'item') {
        const m = DATA.ITEMS.find(i => i.id === ref.ref);
        return m ? { ...m, type: 'consumable', slotType: null } : null;
    }
    if (rtype === 'material') {
        const m = DATA.MATERIALS.find(m => m.id === ref.ref);
        return m ? { ...m, type: 'material', slotType: null } : null;
    }
    return null;
}
export function shopFilteredList(): BaseModule[] {
    return filterByCategory(DATA.SHOP_ITEMS.map(resolveShopRef).filter(Boolean) as BaseModule[], shopFilter);
}
export function renderShopFilterBar(): string {
    return renderFilterBar(shopFilter);
}
export function renderShopGrid(): string {
    const list = shopFilteredList();
    const totalPages = Math.ceil(list.length / SHOP_PAGE_SIZE) || 1;
    shopPage = clampPage(shopPage, totalPages);
    const start = shopPage * SHOP_PAGE_SIZE;
    const items = list.slice(start, start + SHOP_PAGE_SIZE);
    let h = '';
    for (let i = 0; i < SHOP_PAGE_SIZE; i++) {
        const gidx = start + i, item = items[i];
        if (item) {
            const sel = (shopSelected !== null && shopSelected === gidx) ? ' selected' : '';
            const price = item.priceBtc || 50;
            h += `<div class="shop-cell${sel}" onclick="shopSelectItem(${gidx})">
        <div class="cell-quality-dot ${qualityDotClass(item.quality || 'common')}"></div>
        <div class="cell-icon">${item.icon || '📦'}</div>
        <div class="cell-name ${qualityClass(item.quality || 'common')}">${item.name}</div>
        <div class="cell-price">₿${price.toLocaleString()}</div>
      </div>`;
        }
        else {
            h += '<div class="shop-cell empty"></div>';
        }
    }
    return h;
}
export function renderShopPagination(): string {
    return renderPagination(shopFilteredList().length, shopPage, SHOP_PAGE_SIZE, 'shopGoPage');
}
export function shopSetFilter(f: string): void { shopFilter = f; shopPage = 0; shopSelected = null; refreshShopUI(); }
export function shopGoPage(p: number): void { shopPage = Math.max(0, p); shopSelected = null; refreshShopUI(); }
export function shopSelectItem(idx: number): void {
    shopSelected = (shopSelected === idx) ? null : idx;
    refreshShopUI();
}
export function buyShopItem(): void {
    if (shopSelected === null)
        return;
    const list = shopFilteredList();
    const item = list[shopSelected];
    if (!item)
        return;
    const price = item.priceBtc || 50;
    if (GS.bitcoin < price) {
        showToast('比特币不足！');
        return;
    }
    dispatch({ type: 'ADD_BITCOIN', amount: -price });
    addToWarehouse({ ...item, qty: 1 });
    updateTaskbar();
    refreshShopUI();
    showToast(`购买成功！${item.name}  ₿-${price.toLocaleString()}`);
}
export function refreshShopUI(): void {
    const grid = document.getElementById('shop-grid');
    if (grid)
        grid.innerHTML = renderShopGrid();
    const pag = document.getElementById('shop-pagination');
    if (pag)
        pag.innerHTML = renderShopPagination();
    const filter = document.querySelector('#window-overlay .inv-filter-bar');
    if (filter && currentWindowType === 'omazon')
        filter.outerHTML = renderShopFilterBar();
    const btcEl = document.getElementById('shop-btc');
    if (btcEl)
        btcEl.textContent = GS.bitcoin.toLocaleString();
    const panel = document.getElementById('shop-detail-panel');
    if (!panel)
        return;
    if (shopSelected === null) {
        panel.innerHTML = '';
        return;
    }
    const list = shopFilteredList();
    const item = list[shopSelected];
    if (!item) {
        panel.innerHTML = '';
        return;
    }
    const price = item.priceBtc || 50;
    panel.innerHTML = `
    <div class="detail-header">
      <div class="detail-icon">${item.icon || '📦'}</div>
      <div class="detail-info">
        ${detailNameHtml(item, false)}
        <span class="detail-type">${typeLabel(item.type)}</span>
        ${qualityBadge(item.quality || 'common')}
      </div>
    </div>
    ${renderEquipProps(item)}
    ${item.carryMax ? `<div class="detail-stat-list"><div class="field-row"><label>携带上限</label><span>${item.carryMax}</span></div></div>` : ''}
    <div class="detail-spacer"></div>
    <div class="detail-actions">
      <button class="detail-btn primary" onclick="buyShopItem()">💰 购买  ₿${price.toLocaleString()}</button>
    </div>`;
}
export function getOmazonBody(): string {
    shopFilter = 'modules';
    shopPage = 0;
    shopSelected = null;
    return `
    <div class="inv-layout">
      <div class="inv-left">
        <div class="inv-currency">
          <div class="cur-item"><span class="cur-label">₿ 比特币</span><span class="cur-val" id="shop-btc">${GS.bitcoin.toLocaleString()}</span></div>
        </div>
        ${renderShopFilterBar()}
        <div role="tabpanel" class="window">
          <div class="shop-grid" id="shop-grid">${renderShopGrid()}</div>
          <div class="inv-pagination" id="shop-pagination">${renderShopPagination()}</div>
        </div>
      </div>
      <div class="inv-right" id="shop-detail-panel"></div>
    </div>
  `;
}
// ============================================================
// BLACK MARKET (Underground)
// ============================================================
export const UG_COLS = 6;
export const UG_PAGE_SIZE = UG_COLS * 6;
export let ugTab = 'shop';
export let ugShopFilter = 'modules';
export let ugShopPage = 0;
export let ugShopSelected: number | null = null;
export let ugOrderSelected: number | null = null;
export function resolveUgRef(ref: ShopRef): BaseModule | null {
    return resolveShopRef(ref); // Same resolution logic
}
export function ugShopFilteredList(): BaseModule[] {
    return filterByCategory(DATA.UG_SHOP_ITEMS.map(resolveUgRef).filter(Boolean) as BaseModule[], ugShopFilter);
}
export function renderUgShopFilterBar(): string {
    return renderFilterBar(ugShopFilter);
}
export function renderUgShopGrid(): string {
    const list = ugShopFilteredList();
    const totalPages = Math.ceil(list.length / UG_PAGE_SIZE) || 1;
    ugShopPage = clampPage(ugShopPage, totalPages);
    const start = ugShopPage * UG_PAGE_SIZE;
    const items = list.slice(start, start + UG_PAGE_SIZE);
    let h = '';
    for (let i = 0; i < UG_PAGE_SIZE; i++) {
        const gidx = start + i, item = items[i];
        if (item) {
            const sel = (ugShopSelected !== null && ugShopSelected === gidx) ? ' selected' : '';
            const price = item.priceBtc ? Math.floor(item.priceBtc * 3) : 500; // Cash prices are higher
            h += `<div class="shop-cell${sel}" onclick="ugSelectShopItem(${gidx})">
        <div class="cell-quality-dot ${qualityDotClass(item.quality || 'common')}"></div>
        <div class="cell-icon">${item.icon || '📦'}</div>
        <div class="cell-name ${qualityClass(item.quality || 'common')}">${item.name}</div>
        <div class="cell-price" style="color:#0f0;">💵${price.toLocaleString()}</div>
      </div>`;
        }
        else {
            h += '<div class="shop-cell empty"></div>';
        }
    }
    return h;
}
export function renderUgPagination(): string {
    return renderPagination(ugShopFilteredList().length, ugShopPage, UG_PAGE_SIZE, 'ugGoPage');
}
export function ugSetFilter(f: string): void { ugShopFilter = f; ugShopPage = 0; ugShopSelected = null; refreshUgUI(); }
export function ugGoPage(p: number): void { ugShopPage = Math.max(0, p); ugShopSelected = null; refreshUgUI(); }
export function ugSelectShopItem(idx: number): void { ugShopSelected = (ugShopSelected === idx) ? null : idx; refreshUgUI(); }
export function ugBuyItem(): void {
    if (ugShopSelected === null)
        return;
    const list = ugShopFilteredList();
    const item = list[ugShopSelected];
    if (!item)
        return;
    const price = item.priceBtc ? Math.floor(item.priceBtc * 3) : 500;
    if (GS.cash < price) {
        showToast('现金不足！');
        return;
    }
    dispatch({ type: 'ADD_CASH', amount: -price });
    addToWarehouse({ ...item, qty: 1 });
    updateTaskbar();
    refreshUgUI();
    showToast(`购买成功！${item.name}  💵-${price.toLocaleString()}`);
}
export function ugSelectOrder(idx: number): void { ugOrderSelected = (ugOrderSelected === idx) ? null : idx; refreshUgUI(); }
export function ugFulfillOrder(): void {
    if (ugOrderSelected === null)
        return;
    const order = DATA.UG_ORDERS[ugOrderSelected];
    if (!order)
        return;
    const have = countInWarehouse(order.wantMatId);
    if (have < order.wantQty) {
        showToast('仓库中该物品不足！');
        return;
    }
    removeFromWarehouse(order.wantMatId, order.wantQty);
    dispatch({ type: 'ADD_CASH', amount: order.rewardCash });
    updateTaskbar();
    refreshUgUI();
    showToast(`订单完成！${order.want} ×${order.wantQty}  💵+${order.rewardCash.toLocaleString()}`);
}
export function ugSwitchTab(tab: string): void { ugTab = tab; ugShopSelected = null; ugOrderSelected = null; refreshUgUI(); }
export function ugUpdateTabSelection(): void {
    document.querySelectorAll('#window-overlay [role=tab]').forEach(t => {
        t.setAttribute('aria-selected', (t as HTMLElement).dataset.tab === ugTab ? 'true' : 'false');
    });
}
export function refreshUgUI(): void {
    const left = document.getElementById('ug-left');
    const right = document.getElementById('ug-detail-panel');
    if (!left || !right)
        return;
    // Update tabs
    ugUpdateTabSelection();
    if (ugTab === 'shop') {
        left.innerHTML = `
      <div class="inv-currency">
        <div class="cur-item"><span class="cur-label">💵 现金</span><span class="cur-val" id="ug-cash">${GS.cash.toLocaleString()}</span></div>
      </div>
      ${renderUgShopFilterBar()}
      <div class="shop-grid" id="ug-shop-grid">${renderUgShopGrid()}</div>
      <div class="inv-pagination" id="ug-pagination">${renderUgPagination()}</div>`;
        if (ugShopSelected === null) {
            right.innerHTML = '';
            return;
        }
        const list = ugShopFilteredList();
        const item = list[ugShopSelected];
        if (!item) {
            right.innerHTML = '';
            return;
        }
        const price = item.priceBtc ? Math.floor(item.priceBtc * 3) : 500;
        right.innerHTML = `
      <div class="detail-header">
        <div class="detail-icon">${item.icon || '📦'}</div>
        <div class="detail-info">
          ${detailNameHtml(item, false)}
          <span class="detail-type">${typeLabel(item.type)}</span>
          ${qualityBadge(item.quality || 'common')}
        </div>
      </div>
      ${renderEquipProps(item)}
      <div class="detail-spacer"></div>
      <div class="detail-actions">
        <button class="detail-btn primary" onclick="ugBuyItem()" ${GS.cash < price ? 'disabled' : ''}>💰 购买  💵${price.toLocaleString()}</button>
      </div>`;
    }
    else {
        // Orders tab
        let ordersHtml = `<div class="inv-currency"><div class="cur-item"><span class="cur-label">💵 现金</span><span class="cur-val">${GS.cash.toLocaleString()}</span></div></div>`;
        ordersHtml += '<div class="ug-orders-list">';
        DATA.UG_ORDERS.forEach((o, i) => {
            const have = countInWarehouse(o.wantMatId);
            const canFulfill = have >= o.wantQty;
            const sel = ugOrderSelected === i ? ' selected' : '';
            ordersHtml += `<div class="ug-order-cell${sel}" onclick="ugSelectOrder(${i})">
        <span class="ug-order-name">${o.want} <span class="ug-order-qty">×${o.wantQty}</span></span>
        <span class="ug-order-reward">💵+${o.rewardCash.toLocaleString()}</span>
        <span class="ug-order-status ${canFulfill ? 'can-fulfill' : 'cannot-fulfill'}">${canFulfill ? '可交付' : '库存不足'}</span>
      </div>`;
        });
        ordersHtml += '</div>';
        left.innerHTML = ordersHtml;
        if (ugOrderSelected === null) {
            right.innerHTML = '';
            return;
        }
        const order = DATA.UG_ORDERS[ugOrderSelected];
        const have = countInWarehouse(order.wantMatId);
        const canFulfill = have >= order.wantQty;
        right.innerHTML = `
      <div class="detail-header">
        <div class="detail-icon">📋</div>
        <div class="detail-info">
          <div class="detail-name">${order.want} ×${order.wantQty}</div>
          <span class="detail-type">收购订单</span>
        </div>
      </div>
      <p>${order.desc}</p>
      <div class="detail-stat-list">
        <div class="field-row"><label>仓库持有</label><span style="color:${canFulfill ? '#0f0' : '#f55'}">${have}</span></div>
        <div class="field-row"><label>需要数量</label><span>${order.wantQty}</span></div>
        <div class="field-row"><label>报酬</label><span style="color:#0f0;">💵 +${order.rewardCash.toLocaleString()}</span></div>
      </div>
      <div class="detail-spacer"></div>
      <div class="detail-actions">
        <button class="detail-btn primary" onclick="ugFulfillOrder()" ${!canFulfill ? 'disabled' : ''}>📤 交付订单</button>
      </div>`;
    }
}
export function getUndergroundBody(): string {
    ugTab = 'shop';
    ugShopFilter = 'modules';
    ugShopPage = 0;
    ugShopSelected = null;
    ugOrderSelected = null;
    return `
    <menu role="tablist">
      <li role="tab" aria-selected="true" data-tab="shop" onclick="ugSwitchTab('shop')"><a href="#ug">🛒 商品</a></li>
      <li role="tab" data-tab="orders" onclick="ugSwitchTab('orders')"><a href="#ug">📋 收购</a></li>
    </menu>
    <div class="window">
      <div role="tabpanel" class="inv-layout">
        <div class="inv-left" id="ug-left">
          <div class="inv-currency">
            <div class="cur-item"><span class="cur-label">💵 现金</span><span class="cur-val" id="ug-cash">${GS.cash.toLocaleString()}</span></div>
          </div>
          ${renderUgShopFilterBar()}
          <div class="shop-grid" id="ug-shop-grid">${renderUgShopGrid()}</div>
          <div class="inv-pagination" id="ug-pagination">${renderUgPagination()}</div>
        </div>
        <div class="inv-right" id="ug-detail-panel"></div>
      </div>
    </div>
  `;
}
