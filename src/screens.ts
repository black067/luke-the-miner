/* ============================================================
   SCREENS.TS — Screen navigation, toast, window management
   ============================================================ */

import { UI } from './audio.js';
import { GS, dispatch } from './state.js';
import { DATA } from './data.js';
import { div, button } from './dom.js';
import type { BaseModule } from './types.js';

let _ugAnimId: number | null = null;

export function showScreen(id: string): void {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    const el = document.getElementById(id);
    if (el)
        el.classList.add('active');
    dispatch({ type: 'SET_SCREEN', screen: id });
    // Show/hide combat canvas
    const canvas = document.getElementById('combat-canvas');
    if (canvas) {
        canvas.style.display = (id === 'combat-screen') ? 'block' : 'none';
    }
    if (id === 'desktop-screen') {
        updateTaskbar();
        updateClock();
    }
    // Notify external modules about screen change (e.g. clippy agent in main.ts)
    const hook = (window as any).__onScreenChange;
    if (typeof hook === 'function') {
        hook(id);
    }
}
export function showToast(msg: string): void {
    UI.notify();
    const existing = document.querySelector('.toast');
    if (existing)
        existing.remove();
    const t = document.createElement('div');
    t.className = 'toast';
    t.textContent = msg;
    document.getElementById('app')!.appendChild(t);
    setTimeout(() => t.remove(), 2500);
}

// ============================================================
// GAME CONFIRMATION DIALOG (replaces browser confirm())
// ============================================================
export function showConfirm(message: string): Promise<boolean> {
    return new Promise((resolve) => {
        const overlay = document.createElement('div');
        overlay.className = 'window-overlay';
        overlay.id = 'confirm-overlay';
        overlay.style.zIndex = '1000';
        const dialog = div({ className: 'window confirm-dialog', style: 'max-width:320px;' },
            div({ className: 'title-bar' },
                div({ className: 'title-bar-text', textContent: '⚠ 确认' })
            ),
            div({ className: 'window-body', style: 'padding:12px;text-align:center;' },
                div({ style: 'margin-bottom:12px;white-space:pre-line;', textContent: message }),
                div({ style: 'display:flex;gap:8px;justify-content:center;' },
                    button({ id: 'confirm-yes', textContent: '确定' }),
                    button({ id: 'confirm-no', textContent: '取消' })
                )
            )
        );
        overlay.appendChild(dialog);
        const crtContent = document.getElementById('crt-content');
        if (!crtContent) { resolve(false); return; }
        crtContent.appendChild(overlay);
        const yesBtn = overlay.querySelector('#confirm-yes');
        const noBtn = overlay.querySelector('#confirm-no');
        const cleanup = (result: boolean) => {
            overlay.remove();
            resolve(result);
        };
        if (yesBtn) yesBtn.addEventListener('click', () => cleanup(true));
        if (noBtn) noBtn.addEventListener('click', () => cleanup(false));
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) cleanup(false);
        });
    });
}

// ============================================================
// MODAL WINDOW MANAGEMENT
// ============================================================
export let currentWindowType: string | null = null;

export function closeAllWindows(): void {
    if (currentWindowType)
        UI.close();
    const ov = document.getElementById('window-overlay');
    if (ov)
        ov.remove();
    currentWindowType = null;
    // Clean up URL hash
    if (location.hash) location.hash = '';
    // Clean up upgrade canvas RAF
    if (typeof _ugAnimId !== 'undefined' && _ugAnimId) {
        cancelAnimationFrame(_ugAnimId);
        _ugAnimId = null;
    }
}
export function openWindow(type: string): void {
    closeAllWindows();
    UI.open();
    currentWindowType = type;
    const overlay = document.createElement('div');
    overlay.className = 'window-overlay';
    overlay.id = 'window-overlay';
    overlay.onclick = function (e: MouseEvent) {
        if (e.target === overlay)
            closeAllWindows();
    };
    let title = '', body = '', winClass = '';
    // Dynamic imports to break circular dependencies
    switch (type) {
        case 'warehouse': {
            import('./inventory.js').then(inv => {
                inv.whSetFilter('all');
            });
            title = '📦 仓库 & 整备';
            import('./inventory.js').then(inv => {
                body = inv.getInventoryBody();
                finishWindow(overlay, title, body, winClass, type);
            });
            return;
        }
        case 'upgrade': {
            title = '🔧 飞船升级';
            import('./upgrade.js').then(ug => {
                body = ug.getUpgradeBody();
                winClass = ' window-upgrade';
                finishWindow(overlay, title, body, winClass, type);
            });
            return;
        }
        case 'mail': {
            title = '📧 邮件';
            import('./mail.js').then(m => {
                body = m.getMailBody();
                finishWindow(overlay, title, body, winClass, type);
            });
            return;
        }
        case 'radio': {
            title = '📻 收音机';
            import('./radio.js').then(r => {
                body = r.getRadioBody();
                winClass = ' window-radio';
                finishWindow(overlay, title, body, winClass, type);
            });
            return;
        }
        case 'Okayzon': {
            title = '🛒 Okayzon';
            import('./shop.js').then(s => {
                body = s.getOkayzonBody();
                winClass = ' window-inv';
                finishWindow(overlay, title, body, winClass, type);
            });
            return;
        }
        case 'underground': {
            title = '🏴 黑市';
            import('./shop.js').then(s => {
                body = s.getUndergroundBody();
                winClass = ' window-inv';
                finishWindow(overlay, title, body, winClass, type);
            });
            return;
        }
        default: return;
    }
}

/** Helper: render the window overlay after async body resolution */
function finishWindow(overlay: HTMLDivElement, title: string, body: string, winClass: string, type: string): void {
    const windowEl = div({ className: `window${winClass}` },
        div({ className: 'title-bar' },
            div({ className: 'title-bar-text', textContent: title }),
            div({ className: 'title-bar-controls' },
                button({ 'aria-label': 'Minimize', disabled: '' }),
                button({ 'aria-label': 'Close', 'data-action': 'close-all-windows' })
            )
        ),
        div({ className: 'window-body' })
    );
    const bodyEl = windowEl.querySelector('.window-body')!;
    bodyEl.insertAdjacentHTML('beforeend', body);
    overlay.appendChild(windowEl);
    const crtContent = document.getElementById('crt-content');
    if (crtContent) crtContent.appendChild(overlay);
    // Post-open hooks
    if (type === 'upgrade') {
        setTimeout(() => {
            const c = document.getElementById('upgrade-canvas');
            if (c) {
                import('./upgrade.js').then(ug => ug.initUpgradeCanvas(c as HTMLCanvasElement));
            }
        }, 10);
    }
    if (type === 'underground') {
        setTimeout(() => {
            import('./shop.js').then(s => s.refreshUgUI());
        }, 10);
    }
}

export function refreshWindowBody(type: string): void {
    const wb = document.querySelector('#window-overlay .window-body');
    if (!wb)
        return;
    switch (type) {
        case 'mail':
            import('./mail.js').then(m => { wb.innerHTML = m.getMailBody(); });
            return;
        case 'upgrade':
            import('./upgrade.js').then(ug => {
                wb.innerHTML = ug.getUpgradeBody();
                setTimeout(() => {
                    const c = document.getElementById('upgrade-canvas');
                    if (c) ug.initUpgradeCanvas(c as HTMLCanvasElement);
                }, 10);
            });
            return;
        case 'underground':
            import('./shop.js').then(s => {
                wb.innerHTML = s.getUndergroundBody();
                setTimeout(() => s.refreshUgUI(), 10);
            });
            return;
        default: return;
    }
}
// ============================================================
// TASKBAR
// ============================================================
export function updateTaskbar(): void {
    const elDebt = document.getElementById('tb-debt');
    const elBtc = document.getElementById('tb-btc');
    const elCash = document.getElementById('tb-cash');
    if (elDebt)
        elDebt.textContent = '债务: $' + GS.debt.toLocaleString();
    if (elBtc)
        elBtc.textContent = '₿ ' + GS.bitcoin.toLocaleString();
    if (elCash)
        elCash.textContent = '$ ' + GS.cash.toLocaleString();
    // Unlock radio icon after first combat
    if (!GS.firstCombat && !GS.unlocks.radioRepaired) {
        GS.unlocks.radioRepaired = true;
        const radioIcon = document.getElementById('radio-icon');
        if (radioIcon)
            radioIcon.classList.remove('locked');
    }
    // Unlock underground after achieving certain progress
    if (GS.debt < 100000 && !GS.unlocks.undergroundVisible) {
        dispatch({ type: 'UNLOCK_UNDERGROUND' });
        const ugIcon = document.getElementById('underground-icon');
        if (ugIcon)
            ugIcon.classList.remove('hidden');
    }
}
export function updateClock(): void {
    const now = new Date();
    const el = document.getElementById('desktop-clock');
    if (el)
        el.textContent =
            String(now.getHours()).padStart(2, '0') + ':' + String(now.getMinutes()).padStart(2, '0');
}
// ============================================================
// QUALITY HELPERS
// ============================================================
export function qualityDotClass(quality: string): string {
    return 'quality-' + quality;
}
export function qualityClass(quality: string): string {
    return 'q-' + quality;
}
export function qualityName(quality: string): string {
    const q = (DATA.QUALITY as Record<string, { name: string }>)[quality];
    return q ? q.name : quality;
}
export function qualityBadge(quality: string): string {
    const q = (DATA.QUALITY as Record<string, { name: string }>)[quality];
    if (!q)
        return '';
    return `<span class="detail-quality q-${quality}">${q.name}</span>`;
}
export function typeLabel(type: string): string {
    const map: Record<string, string> = { weapon: '武器', ball: '弹珠', storage: '仓储模块', accessory: '饰品', consumable: '道具', material: '材料', ore: '矿石', equip: '模块', item: '道具', mat: '材料' };
    return map[type] || type || '';
}
export function detailNameHtml(item: BaseModule, _showQuality: boolean = true): string {
    const qCls = qualityClass(item.quality || 'common');
    return `<div class="detail-name ${qCls}">${item.name}</div>`;
}
export function cellQtyBadge(item: BaseModule, cls: string): string {
    if (!item.qty || item.qty <= 1)
        return '';
    return `<div class="${cls}">${item.qty}</div>`;
}
