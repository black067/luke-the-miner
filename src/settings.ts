/* ============================================================
   SETTINGS.TS — Settings screen
   ============================================================ */

import { UI, SFX } from './audio.js';
import { GS, dispatch, SAVE_KEY, addToWarehouse } from './state.js';
import { showScreen, showToast } from './screens.js';
import { DATA } from './data.js';
import { updateDesktopIcons, renderAreaList } from './desktop.js';
import type { WarehouseItem } from './types.js';

export function showSettings(from: string): void {
    UI.click();
    dispatch({ type: 'SET_SETTINGS_RETURN', from });
    showScreen('settings-screen');
    applyUIScale();
    // Reset tabs to first tab
    document.querySelectorAll('#settings-screen [role=tab]').forEach((t, i) => t.setAttribute('aria-selected', i === 0 ? 'true' : 'false'));
    document.getElementById('settings-tab-game')!.style.display = 'block';
    document.getElementById('settings-tab-control')!.style.display = 'none';
    document.getElementById('settings-tab-debug')!.style.display = 'none';
    // Sync clippy agent dropdown
    const sel = document.getElementById('clippy-agent-select');
    if (sel)
        (sel as HTMLSelectElement).value = GS.settings.clippyAgent || 'Merlin';
    // Sync shake intensity slider
    const shakeSlider = document.querySelector('#settings-screen input[data-action="set-shake-intensity"]') as HTMLInputElement;
    if (shakeSlider) {
        shakeSlider.value = String(GS.settings.shakeIntensity ?? 100);
        const label = document.getElementById('shake-intensity-val');
        if (label) label.textContent = (GS.settings.shakeIntensity ?? 100) + '%';
    }
}
export function closeSettings(): void {
    UI.click();
    if (GS.settingsReturn === 'desktop-screen')
        showScreen('desktop-screen');
    else if (GS.settingsReturn === 'combat-pause') {
        // Return to pause overlay (dynamic import to break circular dep)
        showScreen('combat-screen');
        import('./combat.js').then(m => m.showPauseMenu());
    }
    else
        showScreen('main-menu');
}
export function switchSettingsTab(tab: string): void {
    UI.click();
    document.querySelectorAll('#settings-screen [role=tab]').forEach(t => {
        t.setAttribute('aria-selected', (t as HTMLElement).dataset.tab === tab ? 'true' : 'false');
    });
    document.getElementById('settings-tab-game')!.style.display = (tab === 'game') ? 'block' : 'none';
    document.getElementById('settings-tab-control')!.style.display = (tab === 'control') ? 'block' : 'none';
    document.getElementById('settings-tab-debug')!.style.display = (tab === 'debug') ? 'block' : 'none';
}
export function setVolume(type: string, val: string): void {
    const vol = parseInt(val) || 0;
    if (type === 'sfx') {
        SFX.setVolume(vol);
        dispatch({ type: 'SET_SFX_VOLUME', volume: vol });
    }
    else if (type === 'master') {
        dispatch({ type: 'SET_MASTER_VOLUME', volume: vol });
    }
}
export function syncCombatCanvasZoom(): void {
    // Stub - combat canvas zoom sync is handled by combat module
    // This function is called from settings UI, combat module will hook into it
}

export function setUIScale(val: string): void {
    const scale = parseInt(val) || 100;
    dispatch({ type: 'SET_UI_SCALE', scale });
    const content = document.getElementById('crt-content');
    if (content) {
        content.style.zoom = `${scale}%`;
    }
    // Keep combat canvas zoom in sync (so mouse coords stay correct mid-combat)
    if (typeof syncCombatCanvasZoom === 'function')
        syncCombatCanvasZoom();
    const label = document.getElementById('ui-scale-val');
    if (label)
        label.textContent = scale + '%';
}
export function setShakeIntensity(val: string): void {
    const intensity = parseInt(val) || 100;
    dispatch({ type: 'SET_SHAKE_INTENSITY', value: intensity });
    const label = document.getElementById('shake-intensity-val');
    if (label)
        label.textContent = intensity + '%';
}
export function adjustUIScale(delta: number): void {
    const current = GS.settings.uiScale || 100;
    const next = Math.max(50, Math.min(200, current + delta));
    setUIScale(String(next));
}
export function applyUIScale(): void {
    const scale = GS.settings.uiScale || 100;
    const content = document.getElementById('crt-content');
    if (content) {
        content.style.zoom = `${scale}%`;
    }
    // Keep combat canvas zoom in sync (so mouse coords stay correct mid-combat)
    if (typeof syncCombatCanvasZoom === 'function')
        syncCombatCanvasZoom();
    const label = document.getElementById('ui-scale-val');
    if (label)
        label.textContent = scale + '%';
}
// ============================================================
// DEBUG TAB
// ============================================================
export function unlockAllFeatures(): void {
    UI.click();
    dispatch({ type: 'UNLOCK_RADIO' });
    dispatch({ type: 'UNLOCK_UNDERGROUND' });
    dispatch({ type: 'UNLOCK_AREA', areaId: 'ocean' });
    dispatch({ type: 'UNLOCK_AREA', areaId: 'moon' });
    // Refresh desktop icon & area states immediately (DOM exists even when hidden)
    updateDesktopIcons();
    renderAreaList();
    showToast('🔓 已解锁全部功能（收音机/黑市/所有区域）');
}
export function giveRandomItem(): void {
    UI.click();
    const pool = [
        ...(DATA.ITEMS || []),
        ...(DATA.WEAPONS || []),
        ...(DATA.BALLS || []),
        ...(DATA.STORAGES || []),
        ...(DATA.ACCESSORY_POOL || []),
        ...(DATA.MATERIALS || []),
    ];
    if (pool.length === 0) {
        showToast('⚠️ 没有可用的物品');
        return;
    }
    const rand = pool[Math.floor(Math.random() * pool.length)];
    import('./inventory.js').then(_inv => {
        addToWarehouse(rand as WarehouseItem);
        showToast('🎁 获得：' + rand.icon + ' ' + rand.name);
    });
}
export function clearCacheAndReset(): void {
    UI.click();
    // Clear localStorage
    try {
        localStorage.removeItem(SAVE_KEY);
    }
    catch (e) { /* ignore */ }
    // Reset GS to defaults
    dispatch({ type: 'RESET_GAME' });
    // Go to main menu
    showScreen('main-menu');
}
