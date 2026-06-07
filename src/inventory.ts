/* ============================================================
   INVENTORY.TS — Warehouse browsing, equipment, quick bar
   ============================================================ */

import { GS, dispatch, addToWarehouse, getAccessorySlotCount } from './state.js';
import { DATA } from './data.js';
import { filterByCategory, clampPage, renderFilterBar, renderPagination } from './shared-browser.js';
import { showToast, updateTaskbar, qualityClass, qualityDotClass, cellQtyBadge, detailNameHtml, typeLabel, qualityBadge, currentWindowType, showConfirm } from './screens.js';
import type { WarehouseItem, WhSelection, BaseModule, WeaponModule, BallModule, StorageModule, AccessoryModule } from './types.js';

export const WH_COLS = 6;
export const WH_PAGE_SIZE = WH_COLS * 6;
export let whFilter = 'all';
export let whPage = 0;
export let whSelected: WhSelection | null = null;
export function whFilteredList(): BaseModule[] {
    return filterByCategory(GS.warehouse as BaseModule[], whFilter);
}
export function renderWhFilterBar(): string {
    let extra = '';
    if (GS.warehouse.some(w => w.quality === 'common')) {
        extra = `<button class="inv-batch-sell" onclick="whBatchSellCommon()">出售所有普通物品</button>`;
    }
    return renderFilterBar(whFilter, extra);
}
export function renderWhGrid(): string {
    const list = whFilteredList();
    const totalPages = Math.ceil(list.length / WH_PAGE_SIZE) || 1;
    whPage = clampPage(whPage, totalPages);
    const start = whPage * WH_PAGE_SIZE;
    const items = list.slice(start, start + WH_PAGE_SIZE);
    let h = '';
    for (let i = 0; i < WH_PAGE_SIZE; i++) {
        const gidx = start + i, item = items[i];
        if (item) {
            const isSel = whSelected && whSelected.source === 'warehouse' && whSelected.index === gidx;
            const sel = isSel ? ' selected' : '';
            const qCls = qualityClass(item.quality || 'common');
            const icon = item.icon || (item.type === 'weapon' ? '🔫' : item.type === 'ball' ? '⚪' : item.type === 'storage' ? '📦' : item.type === 'accessory' ? '💍' : '📦');
            h += `<div class="cargo-cell${sel}" onclick="whSelectItem(${gidx})">
        <div class="cell-quality-dot ${qualityDotClass(item.quality || 'common')}"></div>
        <div class="cell-icon">${icon}</div>
        <div class="cell-name ${qCls}">${item.name}</div>
        ${cellQtyBadge(item, 'cell-qty')}
      </div>`;
        }
        else {
            h += '<div class="cargo-cell empty"></div>';
        }
    }
    return h;
}
export function renderWhPagination(): string {
    return renderPagination(whFilteredList().length, whPage, WH_PAGE_SIZE, 'whGoPage');
}
export function whSetFilter(f: string): void { whFilter = f; whPage = 0; whSelected = null; refreshWhUI(); }
export function whGoPage(p: number): void { whPage = Math.max(0, p); whSelected = null; refreshWhUI(); }
export function whSelectItem(idx: number): void {
    if (whSelected && whSelected.source === 'warehouse' && whSelected.index === idx) {
        whSelected = null;
    }
    else {
        whSelected = { source: 'warehouse', index: idx };
    }
    refreshWhUI();
}
export function whSelectQuickBar(idx: number): void {
    if (whSelected && whSelected.source === 'quickbar' && whSelected.slot === idx) {
        whSelected = null;
    }
    else {
        whSelected = { source: 'quickbar', slot: idx };
    }
    refreshWhUI();
}
export function whSelectEquipSlot(slotKey: string): void {
    if (whSelected && whSelected.source === 'equip' && whSelected.slotKey === slotKey) {
        whSelected = null;
    }
    else {
        whSelected = { source: 'equip', slotKey };
    }
    refreshWhUI();
}
export function whBatchSellCommon(): void {
    const commons = GS.warehouse.filter(w => w.quality === 'common');
    if (commons.length === 0) {
        showToast('没有可出售的普通品质物品');
        return;
    }
    let totalBtc = 0;
    for (const item of commons) {
        totalBtc += (item.priceBtc || 5) * (item.qty || 1);
    }
    const msg = `确定出售所有普通品质物品（${commons.length} 种）吗？\n预计获得 ₿${totalBtc.toLocaleString()}`;
    showConfirm(msg).then(confirmed => {
        if (!confirmed) return;
        dispatch({ type: 'ADD_BITCOIN', amount: totalBtc });
        dispatch({ type: 'SET_WAREHOUSE', warehouse: GS.warehouse.filter(w => w.quality !== 'common') });
        whSelected = null;
        refreshWhUI();
        updateTaskbar();
        showToast(`已出售，获得 ₿${totalBtc.toLocaleString()}`);
    });
}
export function whGetSelectedItem(): WarehouseItem | null {
    if (!whSelected)
        return null;
    if (whSelected.source === 'warehouse') {
        const list = whFilteredList();
        const item = list[whSelected.index!] || null;
        return item as WarehouseItem | null;
    }
    if (whSelected.source === 'quickbar') {
        const slot = GS.quickBar[whSelected.slot!];
        if (!slot || !slot.itemId)
            return null;
        const itemDef = DATA.ITEMS.find(it => it.id === slot.itemId);
        if (!itemDef)
            return null;
        return { ...itemDef, qty: slot.qty, _quickSlot: whSelected.slot } as WarehouseItem;
    }
    if (whSelected.source === 'equip') {
        return whGetEquippedItem(whSelected.slotKey!);
    }
    return null;
}
/** Get the equipped item (or null) for a given slot key */
export function whGetEquippedItem(slotKey: string): WarehouseItem | null {
    if (slotKey === 'weapon')
        return GS.equipment.weapon as WarehouseItem | null;
    if (slotKey === 'ball')
        return GS.equipment.ball as WarehouseItem | null;
    if (slotKey === 'storage')
        return GS.equipment.storage as WarehouseItem | null;
    if (slotKey.startsWith('acc')) {
        const idx = parseInt(slotKey[3]);
        return (GS.equipment.accessories[idx] || null) as WarehouseItem | null;
    }
    return null;
}
export function whSellItem(): void {
    if (!whSelected || whSelected.source !== 'warehouse')
        return;
    const list = whFilteredList();
    const item = list[whSelected.index!] as WarehouseItem | undefined;
    if (!item)
        return;
    if (isItemEquipped(item)) {
        showToast('已嵌入的模块无法出售');
        return;
    }
    const price = item.priceBtc || 5;
    if (item.qty > 1) {
        showConfirm(`出售 ${item.name} ×${item.qty} 吗？\n获得 ₿${(price * item.qty).toLocaleString()}`).then(confirmed => {
            if (!confirmed) return;
            doSell();
        });
        return;
    }
    doSell();

    function doSell(): void {
        dispatch({ type: 'ADD_BITCOIN', amount: price * ((item as WarehouseItem).qty || 1) });
        const idx = GS.warehouse.indexOf(item as WarehouseItem);
        if (idx >= 0) {
            const next = [...GS.warehouse];
            next.splice(idx, 1);
            dispatch({ type: 'SET_WAREHOUSE', warehouse: next });
        }
        whSelected = null;
        refreshWhUI();
        updateTaskbar();
        showToast(`已出售 ${item!.name}，₿+${(price * ((item as WarehouseItem).qty || 1)).toLocaleString()}`);
    }
}
export function isItemEquipped(item: WarehouseItem): boolean {
    const eq = GS.equipment;
    if (eq.weapon && eq.weapon.id === item.id)
        return true;
    if (eq.ball && eq.ball.id === item.id)
        return true;
    if (eq.storage && eq.storage.id === item.id)
        return true;
    if (eq.accessories.some(a => a && a.id === item.id))
        return true;
    return false;
}
export function isItemInQuickBar(item: WarehouseItem): boolean {
    return GS.quickBar.some(s => s.itemId === item.id);
}
/** Remove a specific item ID from its quick bar slot */
export function whRemoveItemFromQuickBar(itemId: string): void {
    const slotIdx = GS.quickBar.findIndex(s => s.itemId === itemId);
    if (slotIdx < 0)
        return;
    GS.quickBar[slotIdx] = { itemId: null, qty: 0 };
    dispatch({ type: 'SET_QUICKBAR', quickBar: [...GS.quickBar] });
    whSelected = null;
    refreshWhUI();
    const itemDef = DATA.ITEMS.find(it => it.id === itemId);
    showToast(`已从随身栏取出 ${itemDef?.name || '道具'}`);
}
// ============================================================
// EQUIPMENT SLOTS
// ============================================================
export function whEquipItem(): void {
    if (!whSelected || whSelected.source !== 'warehouse')
        return;
    const list = whFilteredList();
    const item = list[whSelected.index!] as WarehouseItem | undefined;
    if (!item)
        return;
    let slot: string | null = null;
    if (item.type === 'weapon' || item.slot === 'weapon')
        slot = 'weapon';
    else if (item.type === 'ball' || item.slot === 'ball')
        slot = 'ball';
    else if (item.type === 'storage' || item.slot === 'storage')
        slot = 'storage';
    else if (item.type === 'accessory' || item.slot === 'acc') {
        const accCount = getAccessorySlotCount();
        if (GS.equipment.accessories.filter(Boolean).length >= accCount) {
            // Find an occupied slot to replace, or show full
            for (let i = 0; i < accCount; i++) {
                if (!GS.equipment.accessories[i]) {
                    slot = 'acc' + i;
                    break;
                }
            }
            if (!slot) {
                showToast('饰品槽位已满');
                return;
            }
        }
        else {
            for (let i = 0; i < 3; i++) {
                if (!GS.equipment.accessories[i]) {
                    slot = 'acc' + i;
                    break;
                }
            }
        }
    }
    if (!slot) {
        showToast('这件物品无法嵌入');
        return;
    }
    // Unequip current if occupied
    if (slot === 'weapon' && GS.equipment.weapon)
        addToWarehouse(GS.equipment.weapon as WarehouseItem);
    else if (slot === 'ball' && GS.equipment.ball)
        addToWarehouse(GS.equipment.ball as WarehouseItem);
    else if (slot === 'storage' && GS.equipment.storage)
        addToWarehouse(GS.equipment.storage as WarehouseItem);
    else if (slot.startsWith('acc')) {
        const idx = parseInt(slot[3]);
        if (GS.equipment.accessories[idx])
            addToWarehouse(GS.equipment.accessories[idx] as WarehouseItem);
    }
    // Remove from warehouse
    const whIdx = GS.warehouse.indexOf(item);
    if (whIdx >= 0) {
        const nextWh = [...GS.warehouse];
        nextWh.splice(whIdx, 1);
        dispatch({ type: 'SET_WAREHOUSE', warehouse: nextWh });
    }
    // Equip
    const cleanItem = { ...item, qty: 1 };
    const nextEq = { ...GS.equipment, accessories: [...GS.equipment.accessories] };
    if (slot === 'weapon')
        nextEq.weapon = cleanItem as WeaponModule;
    else if (slot === 'ball')
        nextEq.ball = cleanItem as BallModule;
    else if (slot === 'storage')
        nextEq.storage = cleanItem as StorageModule;
    else if (slot.startsWith('acc'))
        nextEq.accessories[parseInt(slot[3])] = cleanItem as AccessoryModule;
    dispatch({ type: 'SET_EQUIPMENT', equipment: nextEq });
    whSelected = null;
    refreshWhUI();
    showToast(`已嵌入 ${item.name}`);
}
export function whUnequipSlot(slot: string): void {
    const nextEq = { ...GS.equipment, accessories: [...GS.equipment.accessories] };
    let unequipped: WarehouseItem | null = null;
    if (slot === 'weapon') {
        unequipped = nextEq.weapon as WarehouseItem | null;
        nextEq.weapon = null;
    }
    else if (slot === 'ball') {
        unequipped = nextEq.ball as WarehouseItem | null;
        nextEq.ball = null;
    }
    else if (slot === 'storage') {
        unequipped = nextEq.storage as WarehouseItem | null;
        nextEq.storage = null;
    }
    else if (slot.startsWith('acc')) {
        const idx = parseInt(slot[3]);
        unequipped = nextEq.accessories[idx] as WarehouseItem | null;
        nextEq.accessories[idx] = null;
    }
    if (unequipped) {
        addToWarehouse(unequipped);
    }
    dispatch({ type: 'SET_EQUIPMENT', equipment: nextEq });
    // Clear selection if the unequipped slot was selected
    if (whSelected && whSelected.source === 'equip' && whSelected.slotKey === slot) {
        whSelected = null;
    }
    refreshWhUI();
    if (unequipped)
        showToast(`已卸下 ${unequipped.name}`);
}
export function whSetQuickBar(): void {
    if (!whSelected || whSelected.source !== 'warehouse')
        return;
    const list = whFilteredList();
    const item = list[whSelected.index!];
    if (!item)
        return;
    if (item.type !== 'consumable' && item.type !== 'item') {
        showToast('只有道具可以放入随身道具栏');
        return;
    }
    let slotIdx = -1;
    for (let i = 0; i < GS.quickBar.length; i++) {
        if (!GS.quickBar[i].itemId || GS.quickBar[i].itemId === item.id) {
            slotIdx = i;
            break;
        }
    }
    if (slotIdx < 0 && GS.quickBar.length > 0)
        slotIdx = 0;
    if (slotIdx < 0) {
        showToast('随身道具栏已满');
        return;
    }
    GS.quickBar[slotIdx].itemId = item.id;
    GS.quickBar[slotIdx].qty = Math.min(item.qty || 0, item.carryMax || 3);
    dispatch({ type: 'SET_QUICKBAR', quickBar: [...GS.quickBar] });
    refreshWhUI();
    showToast(`${item.name} 已放入随身道具栏`);
}
/** Remove item from quick bar (called from detail panel action) */
export function whRemoveFromQuickBar(): void {
    if (!whSelected || whSelected.source !== 'quickbar')
        return;
    const idx = whSelected.slot!;
    const slot = GS.quickBar[idx];
    if (!slot || !slot.itemId)
        return;
    const itemDef = DATA.ITEMS.find(it => it.id === slot.itemId);
    GS.quickBar[idx] = { itemId: null, qty: 0 };
    dispatch({ type: 'SET_QUICKBAR', quickBar: [...GS.quickBar] });
    whSelected = null;
    refreshWhUI();
    showToast(`已从随身栏卸下 ${itemDef?.name || '道具'}`);
}
// ============================================================
// RENDER EQUIP PROPS (shared with shop)
// ============================================================
export function renderEquipProps(item: BaseModule): string {
    let html = '';
    if (item.atk !== undefined)
        html += `<div style="margin:4px 0"><div style="margin-bottom:1px">基础攻击力</div><div style="padding-left:8px">${item.atk}</div></div>`;
    if (item.magazine !== undefined)
        html += `<div style="margin:4px 0"><div style="margin-bottom:1px">弹仓上限</div><div style="padding-left:8px">${item.magazine}</div></div>`;
    if (item.dmgMult !== undefined)
        html += `<div style="margin:4px 0"><div style="margin-bottom:1px">伤害倍率</div><div style="padding-left:8px">${Math.round(item.dmgMult * 100)}%</div></div>`;
    if (item.durability !== undefined)
        html += `<div style="margin:4px 0"><div style="margin-bottom:1px">弹珠耐久</div><div style="padding-left:8px">${item.durability}</div></div>`;
    if (item.extraSlots !== undefined)
        html += `<div style="margin:4px 0"><div style="margin-bottom:1px">货舱加成</div><div style="padding-left:8px">+${item.extraSlots} 格</div></div>`;
    if (item.scatterAngle !== undefined)
        html += `<div style="margin:4px 0"><div style="margin-bottom:1px">散射角度</div><div style="padding-left:8px">${item.scatterAngle}°</div></div>`;
    if (item.fireInterval !== undefined)
        html += `<div style="margin:4px 0"><div style="margin-bottom:1px">射速间隔</div><div style="padding-left:8px">${(item.fireInterval * 1000).toFixed(0)}ms</div></div>`;
    if (item.mechanic) {
        const mech = DATA.MECHANICS[item.mechanic];
        if (mech)
            html += `<div class="detail-special"><div class="special-label">⚡ 机制词条</div><div>${mech.name}：${mech.desc}</div></div>`;
    }
    if (item.desc && !item.atk && !item.magazine)
        html += `<p>${item.desc}</p>`;
    return html;
}
// ============================================================
// RENDER COMPARE (equipped vs selected)
// ============================================================
export function renderEquipCompare(item: BaseModule): string {
    let eq = null;
    if (item.type === 'weapon' || item.slot === 'weapon')
        eq = GS.equipment.weapon;
    else if (item.type === 'ball' || item.slot === 'ball')
        eq = GS.equipment.ball;
    else if (item.type === 'storage' || item.slot === 'storage')
        eq = GS.equipment.storage;
    else if (item.type === 'accessory' || item.slot === 'acc') {
        // Compare with first accessory slot
        eq = GS.equipment.accessories.find(Boolean) || null;
    }
    if (!eq)
        return '';
    let html = '<div class="sunken-panel" style="margin:6px 0;padding:4px 6px"><div style="margin-bottom:2px">📊 与当前模块对比</div>';
    const pairs = [];
    if (item.atk !== undefined)
        pairs.push(['攻击力', item.atk, eq.atk]);
    if (item.magazine !== undefined)
        pairs.push(['弹仓', item.magazine, eq.magazine]);
    if (item.dmgMult !== undefined)
        pairs.push(['倍率', Math.round(item.dmgMult * 100) + '%', Math.round((eq.dmgMult || 1) * 100) + '%']);
    if (item.durability !== undefined)
        pairs.push(['耐久', item.durability, eq.durability]);
    if (item.extraSlots !== undefined)
        pairs.push(['货舱', item.extraSlots, eq.extraSlots]);
    if (item.scatterAngle !== undefined)
        pairs.push(['散射', item.scatterAngle + '°', (eq.scatterAngle || 5) + '°']);
    if (item.fireInterval !== undefined)
        pairs.push(['射速', (item.fireInterval * 1000).toFixed(0) + 'ms', ((eq.fireInterval || 0.16) * 1000).toFixed(0) + 'ms']);
    for (const [label, nv, ov] of pairs) {
        let cls = 'cmp-same';
        if (typeof nv === 'number' && typeof ov === 'number') {
            // Lower scatter/fireInterval is better, higher others
            if (label === '散射' || label === '射速')
                cls = nv < ov ? 'cmp-better' : nv > ov ? 'cmp-worse' : 'cmp-same';
            else
                cls = nv > ov ? 'cmp-better' : nv < ov ? 'cmp-worse' : 'cmp-same';
        }
        html += `<div class="field-row" style="padding:1px 0"><label>${label}</label><span class="${cls}">${ov} → ${nv}</span></div>`;
    }
    if (item.mechanic && !eq.mechanic) {
        html += `<div class="field-row" style="padding:1px 0"><label>机制</label><span style="color:#5a5">无 → ${DATA.MECHANICS[item.mechanic]?.name || item.mechanic}</span></div>`;
    }
    html += '</div>';
    return html;
}
// ============================================================
// MAIN BODY
// ============================================================
export function getInventoryBody(): string {
    const accCount = getAccessorySlotCount();
    return `
    <div class="inv-layout">
      <div class="inv-left">
        <div class="inv-section-title">⚙️ 模块槽位</div>
        <div class="equip-slots">
          <div class="equip-slot${GS.equipment.weapon ? ' equipped' : ''}${whSelected && whSelected.source === 'equip' && whSelected.slotKey === 'weapon' ? ' selected' : ''}" onclick="whSelectEquipSlot('weapon')" title="${GS.equipment.weapon ? GS.equipment.weapon.name : '武器槽'}">
            <div class="slot-icon">🔫</div>
            <div class="slot-label">武器</div>
            ${GS.equipment.weapon ? `<div class="slot-name">${GS.equipment.weapon.name}</div><div class="quality-dot ${qualityDotClass(GS.equipment.weapon.quality || 'common')}"></div>` : ''}
          </div>
          <div class="equip-slot${GS.equipment.ball ? ' equipped' : ''}${whSelected && whSelected.source === 'equip' && whSelected.slotKey === 'ball' ? ' selected' : ''}" onclick="whSelectEquipSlot('ball')" title="${GS.equipment.ball ? GS.equipment.ball.name : '弹珠槽'}">
            <div class="slot-icon">⚪</div>
            <div class="slot-label">弹珠</div>
            ${GS.equipment.ball ? `<div class="slot-name">${GS.equipment.ball.name}</div><div class="quality-dot ${qualityDotClass(GS.equipment.ball.quality || 'common')}"></div>` : ''}
          </div>
          <div class="equip-slot${GS.equipment.storage ? ' equipped' : ''}${whSelected && whSelected.source === 'equip' && whSelected.slotKey === 'storage' ? ' selected' : ''}" onclick="whSelectEquipSlot('storage')" title="${GS.equipment.storage ? GS.equipment.storage.name : '仓储槽'}">
            <div class="slot-icon">📦</div>
            <div class="slot-label">仓储</div>
            ${GS.equipment.storage ? `<div class="slot-name">${GS.equipment.storage.name}</div><div class="quality-dot ${qualityDotClass(GS.equipment.storage.quality || 'common')}"></div>` : ''}
          </div>
          ${[0, 1, 2].map(i => {
        const acc = GS.equipment.accessories[i];
        const locked = i >= accCount;
        const cls = locked ? 'equip-slot locked-slot' : `equip-slot${acc ? ' equipped' : ''}${whSelected && whSelected.source === 'equip' && whSelected.slotKey === 'acc' + i ? ' selected' : ''}`;
        const onclick = locked ? '' : `whSelectEquipSlot('acc${i}')`;
        return `<div class="${cls}" onclick="${onclick}" title="${locked ? '未解锁' : (acc ? acc.name : '饰品槽' + (i + 1))}">
              <div class="slot-icon">💍</div>
              <div class="slot-label">饰品${i + 1}${locked ? ' 🔒' : ''}</div>
              ${acc ? `<div class="slot-name">${acc.name}</div><div class="quality-dot ${qualityDotClass(acc.quality || 'common')}"></div>` : ''}
            </div>`;
    }).join('')}
        </div>

        <div class="inv-section-title">🎒 随身道具</div>
        <div class="quick-bar">
          ${GS.quickBar.map((slot, i) => {
        const itemDef = DATA.ITEMS.find(it => it.id === slot.itemId);
        const isSel = whSelected && whSelected.source === 'quickbar' && whSelected.slot === i;
        if (!slot.itemId || !itemDef) {
            return `<div class="quick-slot empty"><div class="qk-icon">—</div><div class="qk-name">空</div></div>`;
        }
        return `<div class="quick-slot${isSel ? ' selected' : ''}" title="${itemDef.desc}" onclick="whSelectQuickBar(${i})">
              <div class="qk-icon">${itemDef.icon}</div>
              <div class="qk-name">${itemDef.name}</div>
              <div class="qk-qty">${slot.qty}</div>
            </div>`;
    }).join('')}
        </div>
        ${renderWhFilterBar()}
        <div class="inv-grid-wrap">
          <div class="cargo-grid" id="wh-grid">${renderWhGrid()}</div>
          ${renderWhPagination()}
        </div>
      </div>
      <div class="inv-right">
        <fieldset class="ws-detail-box"><legend>详情</legend>
          <div id="ws-detail">${renderWhDetailContent()}</div>
          <div id="ws-actions" class="detail-actions">${renderWhDetailActions()}</div>
        </fieldset>
      </div>
    </div>
  `;
}
/** Backward compat: clear quick slot directly (used by combat HUD etc.) */
export function whClearQuickSlot(idx: number): void {
    GS.quickBar[idx] = { itemId: null, qty: 0 };
    refreshWhUI();
    showToast('已清空随身道具栏');
}
export function renderWhDetailContent(): string {
    if (!whSelected)
        return '<div class="iv-detail empty">从左侧选择一个物品查看详情</div>';
    // === Quick Bar item detail ===
    if (whSelected.source === 'quickbar') {
        const slot = GS.quickBar[whSelected.slot!];
        if (!slot || !slot.itemId)
            return '';
        const itemDef = DATA.ITEMS.find(it => it.id === slot.itemId);
        if (!itemDef)
            return '';
        const item = { ...itemDef, qty: slot.qty };
        const carryMaxStr = item.carryMax ? item.carryMax : '—';
        return `
      <div class="detail-header">
        <div class="detail-icon">${item.icon || '📦'}</div>
        <div class="detail-info">
          ${detailNameHtml(item, true)}
          <span class="detail-type">🧪 道具</span>
          ${qualityBadge(item.quality || 'common')}
        </div>
      </div>
      ${item.desc ? `<p>${item.desc}</p>` : ''}
      <div class="detail-stat-list">
        <div class="field-row"><label>携带上限</label><span>${carryMaxStr}</span></div>
      </div>`;
    }
    // === Equipment slot detail ===
    if (whSelected.source === 'equip') {
        const item = whGetEquippedItem(whSelected.slotKey!);
        const slotLabels: Record<string, string> = { weapon: '武器槽', ball: '弹珠槽', storage: '仓储槽', acc0: '饰品槽1', acc1: '饰品槽2', acc2: '饰品槽3' };
        const slotLabel = slotLabels[whSelected.slotKey!] || '模块槽';
        if (!item) {
            return `
        <div class="detail-header">
          <div class="detail-icon">🔲</div>
          <div class="detail-info">
            <div class="detail-name">${slotLabel}</div>
            <span class="detail-type">空槽位</span>
          </div>
        </div>`;
        }
        let propsHtml = renderEquipProps(item);
        return `
      <div class="detail-header">
        <div class="detail-icon">${item.icon || '📦'}</div>
        <div class="detail-info">
          ${detailNameHtml(item, true)}
          <span class="detail-type">${typeLabel(item.type)} · ${slotLabel}</span>
          ${qualityBadge(item.quality || 'common')}
        </div>
      </div>
      ${propsHtml}
      ${item.desc ? `<p>${item.desc}</p>` : ''}`;
    }
    // === Warehouse item detail ===
    const list = whFilteredList();
    const item = list[whSelected.index!] as WarehouseItem | undefined;
    if (!item)
        return '';
    let propsHtml = renderEquipProps(item);
    let compareHtml = renderEquipCompare(item);
    let extraStats = '';
    if ((item.type === 'consumable' || item.type === 'item') && item.carryMax) {
        extraStats = `<div class="detail-stat-list"><div class="field-row"><label>携带上限</label><span>${item.carryMax}</span></div></div>`;
    }
    return `
    <div class="detail-header">
      <div class="detail-icon">${item.icon || '📦'}</div>
      <div class="detail-info">
        ${detailNameHtml(item, false)}
        <span class="detail-type">${typeLabel(item.type)}</span>
        ${qualityBadge(item.quality || 'common')}
      </div>
    </div>
    ${propsHtml}
    ${extraStats}
    ${compareHtml}`;
}

export function renderWhDetailActions(): string {
    if (!whSelected)
        return '';
    // === Quick Bar item detail ===
    if (whSelected.source === 'quickbar') {
        const slot = GS.quickBar[whSelected.slot!];
        if (!slot || !slot.itemId)
            return '';
        return '<button onclick="whRemoveFromQuickBar()">🔓 从随身栏卸下</button>';
    }
    // === Equipment slot detail ===
    if (whSelected.source === 'equip') {
        const item = whGetEquippedItem(whSelected.slotKey!);
        if (!item)
            return '';
        return `<button onclick="whUnequipSlot('${whSelected.slotKey}')">🔓 卸下模块</button>`;
    }
    // === Warehouse item detail ===
    const list = whFilteredList();
    const item = list[whSelected.index!] as WarehouseItem | undefined;
    if (!item)
        return '';
    const isEquipped = isItemEquipped(item);
    let actionsHtml = '';
    if (item.type === 'weapon' || item.type === 'ball' || item.type === 'storage' || item.type === 'accessory' || item.type === 'equip') {
        actionsHtml += `<button onclick="whEquipItem()" ${isEquipped ? 'disabled' : ''}>${isEquipped ? '已嵌入' : '⚡ 嵌入'}</button>`;
    }
    if (item.type === 'consumable' || item.type === 'item') {
        const inQuickBar = isItemInQuickBar(item);
        if (inQuickBar) {
            actionsHtml += `<button onclick="whRemoveItemFromQuickBar('${item.id}')">🔓 从随身栏取出</button>`;
        } else {
            actionsHtml += `<button onclick="whSetQuickBar()">🎒 随身携带</button>`;
        }
    }
    actionsHtml += `<button class="detail-btn danger" onclick="whSellItem()" ${isEquipped ? 'disabled' : ''}>💰 出售</button>`;
    return actionsHtml;
}
export function refreshWhUI(): void {
    const grid = document.getElementById('wh-grid');
    if (grid)
        grid.innerHTML = renderWhGrid();
    const pag = document.querySelector('#window-overlay .inv-pagination');
    if (pag)
        pag.outerHTML = renderWhPagination();
    const filter = document.querySelector('#window-overlay .inv-filter-bar');
    if (filter)
        filter.outerHTML = renderWhFilterBar();
    const btcEl = document.getElementById('wh-btc');
    if (btcEl)
        btcEl.textContent = GS.bitcoin.toLocaleString();
    const cashEl = document.getElementById('wh-cash');
    if (cashEl)
        cashEl.textContent = GS.cash.toLocaleString();
    const detailEl = document.getElementById('ws-detail');
    if (detailEl)
        detailEl.innerHTML = renderWhDetailContent();
    const actionsEl = document.getElementById('ws-actions');
    if (actionsEl)
        actionsEl.innerHTML = renderWhDetailActions();
    // Refresh equipment section
    // Rebuild entire inventory body since equipment might have changed
    const wb = document.querySelector('#window-overlay .window-body');
    if (wb && currentWindowType === 'warehouse') {
        wb.innerHTML = getInventoryBody();
    }
}
