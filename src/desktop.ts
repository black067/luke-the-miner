/* ============================================================
   DESKTOP.TS — Hangar desktop view
   ============================================================ */

import { UI } from './audio.js';
import { GS, dispatch } from './state.js';
import { closeAllWindows, showScreen, showToast, updateTaskbar, updateClock } from './screens.js';
import { DATA } from './data.js';

export function showDesktop(): void {
    closeAllWindows();
    UI.open();
    showScreen('desktop-screen');
    renderAreaList();
    updateTaskbar();
    updateClock();
    closeStartMenu();
    // Update radio icon state
    const radioIcon = document.getElementById('radio-icon');
    if (radioIcon) {
        if (GS.unlocks.radioRepaired)
            radioIcon.classList.remove('hidden');
        else
            radioIcon.classList.add('hidden');
    }
    // Update underground icon state
    const ugIcon = document.getElementById('underground-icon');
    if (ugIcon) {
        if (GS.unlocks.undergroundVisible)
            ugIcon.classList.remove('hidden');
        else
            ugIcon.classList.add('hidden');
    }
    // Update go-work button state
    updateGoWorkBtn();
}
export function renderAreaList(): void {
    const list = document.getElementById('area-list');
    if (!list)
        return;
    list.innerHTML = DATA.AREAS.map(area => {
        const locked = area.locked && !GS.unlocks.areas[area.id];
        const selected = GS.selectedArea === area.id && !locked;
        const cls = [
            'work-area-item',
            selected ? 'selected' : '',
            locked ? 'locked' : '',
        ].filter(Boolean).join(' ');
        return `<div class="${cls}" data-area="${area.id}" data-action="select-area" title="${locked ? '尚未解锁' : area.desc}">
      <span>${area.name}</span>
      <span class="difficulty">${area.difficulty}</span>
    </div>`;
    }).join('');
}
export function selectArea(el: HTMLElement): void {
    if (el.classList.contains('locked'))
        return;
    UI.click();
    document.querySelectorAll('.work-area-item').forEach(i => i.classList.remove('selected'));
    el.classList.add('selected');
    dispatch({ type: 'SET_SELECTED_AREA', area: el.dataset.area || 'mine' });
    updateGoWorkBtn();
}
export function updateGoWorkBtn(): void {
    const btn = document.getElementById('go-work-btn');
    if (!btn)
        return;
    const area = DATA.AREAS.find(a => a.id === GS.selectedArea);
    const locked = area && area.locked && !GS.unlocks.areas[GS.selectedArea];
    if (!GS.selectedArea || locked) {
        (btn as HTMLButtonElement).disabled = true;
    }
    else {
        (btn as HTMLButtonElement).disabled = false;
    }
}
export function goToWork(): void {
    UI.action();
    const area = DATA.AREAS.find(a => a.id === GS.selectedArea);
    const locked = area && area.locked && !GS.unlocks.areas[GS.selectedArea];
    if (!GS.selectedArea || locked) {
        showToast('未选择战场');
        return;
    }
    closeAllWindows();
    showScreen('combat-screen');
    // Dynamic import of combat to avoid circular dependency at module level
    import('./combat.js').then(m => m.startCombat(GS.selectedArea));
}
export function powerOff(): void {
    UI.shutdown();
    const crt = document.getElementById('app')!;
    crt.style.transition = 'all 0.5s cubic-bezier(0.8,0,1,0.8)';
    crt.style.transform = 'scaleY(0.01)';
    crt.style.opacity = '0';
    crt.style.filter = 'brightness(3)';
    setTimeout(() => { crt!.style.filter = 'brightness(0)'; }, 100);
    setTimeout(() => {
        crt!.style.transition = 'all 0.3s ease';
        crt!.style.transform = 'scaleY(1)';
        crt!.style.opacity = '1';
        crt!.style.filter = '';
        showScreen('main-menu');
        setTimeout(() => { crt!.style.transition = ''; }, 350);
    }, 700);
}
export function toggleStartMenu(): void {
    UI.click();
    const menu = document.getElementById('start-menu');
    const backdrop = document.getElementById('start-menu-backdrop');
    if (!menu || !backdrop)
        return;
    const isOpen = menu.style.display !== 'none';
    if (isOpen) {
        closeStartMenu();
    }
    else {
        menu.style.display = 'flex';
        backdrop.style.display = 'block';
    }
}
export function closeStartMenu(): void {
    const menu = document.getElementById('start-menu');
    const backdrop = document.getElementById('start-menu-backdrop');
    if (menu)
        menu.style.display = 'none';
    if (backdrop)
        backdrop.style.display = 'none';
}
export function updateDesktopIcons(): void {
    const radioIcon = document.getElementById('radio-icon');
    if (radioIcon) {
        if (GS.unlocks.radioRepaired)
            radioIcon.classList.remove('hidden');
        else
            radioIcon.classList.add('hidden');
    }
    const ugIcon = document.getElementById('underground-icon');
    if (ugIcon) {
        if (GS.unlocks.undergroundVisible)
            ugIcon.classList.remove('hidden');
        else
            ugIcon.classList.add('hidden');
    }
}
