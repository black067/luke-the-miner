/* ============================================================
   MAIN.TS — Application entry point (ES module bootstrap)
   ============================================================ */

import { DATA } from './data.js';
import { GS, dispatch, saveGame, loadGame, initNewGame, switchClippyAgent, SAVE_KEY } from './state.js';
import { SFX, UI } from './audio.js';
import { showScreen, showToast, closeAllWindows, openWindow, refreshWindowBody, updateTaskbar, updateClock, showConfirm, currentWindowType } from './screens.js';
import { showIntro } from './intro.js';
import {
  showSettings, closeSettings, switchSettingsTab, setVolume,
  setUIScale, adjustUIScale, applyUIScale, unlockAllFeatures,
  giveRandomItem, clearCacheAndReset, syncCombatCanvasZoom, setShakeIntensity, toggleCrtFilter, applyCrtFilter,
} from './settings.js';
import {
  showDesktop, renderAreaList, selectArea, goToWork, powerOff,
  toggleStartMenu, closeStartMenu,
  updateDesktopIcons, updateGoWorkBtn
} from './desktop.js';
import { getMailBody, setMailSelected } from './mail.js';
import { getRadioBody } from './radio.js';
import { filterByCategory, renderFilterBar, renderPagination, clampPage } from './shared-browser.js';
import {
  getInventoryBody, refreshWhUI, whSetFilter, whGoPage,
  whSelectItem, whSelectQuickBar, whSelectEquipSlot, whBatchSellCommon,
  whEquipItem, whUnequipSlot, whSetQuickBar, whRemoveFromQuickBar,
  whRemoveItemFromQuickBar, whSellItem, whClearQuickSlot
} from './inventory.js';
import {
  getOkayzonBody, getUndergroundBody, refreshShopUI, refreshUgUI,
  shopSetFilter, shopGoPage, shopSelectItem, buyShopItem,
  ugSetFilter, ugGoPage, ugSelectShopItem, ugBuyItem,
  ugSelectOrder, ugFulfillOrder, ugSwitchTab
} from './shop.js';
import { getUpgradeBody, initUpgradeCanvas, ugAnimId, ugDoUpgrade } from './upgrade.js';
import {
  C, CombatCargo, combatCanvas, combatCtx, combatRafId,
  startCombat, stopCombat, togglePause, showPauseMenu,
  tryEvacuate, openCombatInventory, closeCombatInventory,
  resumeFromPause, showSettingsFromPause, exitCombatToMenu,
  selectCargoItem, discardSelectedCargoItem,
  closeEarlyEvacConfirm, confirmEarlyEvac
} from './combat.js';
// Combat render functions are imported dynamically in combat.ts; not needed at top level
// import { drawStarfield, ... } from './combat-render.js';
import { showSettlement, returnToHangar } from './settlement.js';

// Expose functions & variables to window for HTML onclick handlers
// (ES modules don't leak to global scope, unlike the old <script> tags)
Object.assign(window, {
  // state
  DATA, GS, dispatch, saveGame, loadGame, initNewGame,
  // audio
  SFX, UI,
  // screens
  showScreen, showToast, closeAllWindows, openWindow, refreshWindowBody,
  showConfirm,
  // intro
  showIntro,
  // settings
  showSettings, closeSettings, switchSettingsTab, setVolume,
  setUIScale, adjustUIScale, applyUIScale, unlockAllFeatures,
  giveRandomItem, clearCacheAndReset, syncCombatCanvasZoom, setShakeIntensity, toggleCrtFilter,
  // desktop
  showDesktop, renderAreaList, selectArea, goToWork, powerOff,
  toggleStartMenu, closeStartMenu, updateTaskbar, updateClock,
  updateDesktopIcons, updateGoWorkBtn,
  // mail & radio
  getMailBody, getRadioBody,
  // shared-browser
  filterByCategory, renderFilterBar, renderPagination, clampPage,
  // inventory / warehouse
  getInventoryBody, refreshWhUI, whSetFilter, whGoPage,
  whSelectItem, whSelectQuickBar, whSelectEquipSlot, whBatchSellCommon,
  whEquipItem, whUnequipSlot, whSetQuickBar, whRemoveFromQuickBar,
  whRemoveItemFromQuickBar, whSellItem, whClearQuickSlot,
  // shop / Okayzon
  getOkayzonBody, getUndergroundBody, refreshShopUI, refreshUgUI,
  shopSetFilter, shopGoPage, shopSelectItem, buyShopItem,
  // underground shop
  ugSetFilter, ugGoPage, ugSelectShopItem, ugBuyItem,
  ugSelectOrder, ugFulfillOrder, ugSwitchTab,
  // upgrade
  getUpgradeBody, initUpgradeCanvas, ugAnimId, ugDoUpgrade,
  // combat
  C, CombatCargo, combatCanvas, combatCtx, combatRafId,
  startCombat, stopCombat, togglePause, showPauseMenu,
  tryEvacuate, openCombatInventory, closeCombatInventory,
  resumeFromPause, showSettingsFromPause, exitCombatToMenu,
  selectCargoItem, discardSelectedCargoItem,
  closeEarlyEvacConfirm, confirmEarlyEvac,
  // settlement
  showSettlement, returnToHangar,
  // mail setter
  setMailSelected,
});

// ============================================================
// EVENT DELEGATION — centralized click/change handler on #crt-content
// ============================================================

function handleBrowserFilter(filter: string): void {
    switch (currentWindowType) {
        case 'warehouse': whSetFilter(filter); break;
        case 'Okayzon': shopSetFilter(filter); break;
        case 'underground': ugSetFilter(filter); break;
    }
}

function initEventDelegation(): void {
  const container = document.getElementById('crt-content');
  if (!container) return;

  // Click delegation
  container.addEventListener('click', (e: Event) => {
    const target = (e.target as HTMLElement).closest('[data-action]') as HTMLElement | null;
    if (!target) return;
    const action = target.getAttribute('data-action');
    const arg = target.getAttribute('data-action-arg');

    switch (action) {
      case 'new-game':
        localStorage.removeItem(SAVE_KEY);
        dispatch({ type: 'RESET_GAME' });
        showIntro();
        break;
      case 'continue': showDesktop(); break;
      case 'settings': showSettings(arg || 'main-menu'); break;
      case 'exit': UI.click(); document.body.innerHTML = '<div style="display:flex;align-items:center;justify-content:center;height:100vh;color:#5a5;font-family:\'Fusion Pixel\',monospace;font-size:14px;">SYSTEM OFFLINE</div>'; break;
      case 'intro-link': if (arg) showToast(arg); break;
      case 'intro-accept':
        import('./combat.js').then(m => {
            showScreen('combat-screen');
            m.startCombat(GS.selectedArea);
        });
        break;
      case 'intro-skip':
        import('./combat.js').then(m => {
            showScreen('combat-screen');
            m.startCombat(GS.selectedArea);
        });
        break;
      case 'open-window': if (arg) openWindow(arg); break;
      case 'go-to-work': goToWork(); break;
      case 'toggle-start-menu': toggleStartMenu(); break;
      case 'start-settings': showSettings('desktop-screen'); toggleStartMenu(); break;
      case 'power-off': powerOff(); toggleStartMenu(); break;
      case 'try-evacuate': tryEvacuate(); break;
      case 'toggle-pause': togglePause(); break;
      case 'open-combat-inv': openCombatInventory(); break;
      case 'close-combat-inv': closeCombatInventory(); break;
      case 'select-cargo': if (arg) selectCargoItem(parseInt(arg, 10)); break;
      case 'discard-cargo': discardSelectedCargoItem(); break;
      case 'resume-pause': resumeFromPause(); break;
      case 'settings-pause': showSettingsFromPause(); break;
      case 'exit-to-menu': exitCombatToMenu(); break;
      case 'close-early-evac': closeEarlyEvacConfirm(); break;
      case 'confirm-early-evac': confirmEarlyEvac(); break;
      case 'return-to-hangar': returnToHangar(); break;
      case 'switch-settings-tab': if (arg) switchSettingsTab(arg); break;
      case 'browser-filter': if (arg) handleBrowserFilter(arg); break;
      case 'adjust-ui-scale': if (arg) adjustUIScale(parseInt(arg, 10)); break;
      case 'unlock-all': unlockAllFeatures(); break;
      case 'give-random-item': giveRandomItem(); break;
      case 'clear-reset': clearCacheAndReset(); break;
      case 'close-settings': closeSettings(); break;
      case 'close-all-windows': closeAllWindows(); break;
      case 'select-area': selectArea(target); break;
    }
  });

  // Change delegation
  container.addEventListener('change', (e: Event) => {
    const target = (e.target as HTMLElement).closest('[data-action]') as HTMLElement | null;
    if (!target) return;
    const action = target.getAttribute('data-action');
    const arg = target.getAttribute('data-action-arg');

    switch (action) {
      case 'set-volume':
        if (arg) setVolume(arg, (e.target as HTMLInputElement).value);
        break;
      case 'set-shake-intensity':
        setShakeIntensity((e.target as HTMLInputElement).value);
        break;
      case 'toggle-crt-filter':
        toggleCrtFilter((e.target as HTMLInputElement).checked);
        break;
      case 'switch-clippy':
        switchClippyAgent((e.target as HTMLSelectElement).value);
        break;
    }
  });
}

// ============================================================
// APPLICATION BOOTSTRAP
// ============================================================

const App = {
  showScreen, showIntro, showDesktop,
  showSettings, closeSettings, switchSettingsTab,
  setVolume, setUIScale, adjustUIScale,
  unlockAllFeatures, giveRandomItem, clearCacheAndReset,
  openWindow, closeAllWindows,
  selectArea, goToWork, powerOff,
  toggleStartMenu, closeStartMenu, updateTaskbar,
  returnToHangar,
  exitGame() {
    UI.click();
    document.body.innerHTML = '<div style="display:flex;align-items:center;justify-content:center;height:100vh;color:#5a5;font-family:\'Fusion Pixel\',monospace;font-size:14px;">SYSTEM OFFLINE</div>';
  },
  showToast,
  init() {
    SFX.init();
    initEventDelegation();
    const hasSave = loadGame();
    applyUIScale();
    applyCrtFilter();
    if (!hasSave) {
      initNewGame();
    }
    showScreen('main-menu');
    setTimeout(() => UI.startup(), 300);
    _initMenuStars();
    // Hover sounds
    document.addEventListener('mouseover', (e: MouseEvent) => {
      const target = (e.target as Element).closest('button, .desktop-icon, .start-menu-item, [role=tab]');
      if (target) UI.hover();
    });
    // Keyboard shortcuts
    document.addEventListener('keydown', (e: KeyboardEvent) => {
      if (e.key === 'Escape' && GS.screen === 'settings-screen') { closeSettings(); return; }
      if (GS.screen !== 'desktop-screen') return;
      if (e.key === 'Escape') closeAllWindows();
      if (e.key === 'i' || e.key === 'I') { openWindow('warehouse'); e.preventDefault(); }
      if (e.key === 'u' || e.key === 'U') { openWindow('upgrade'); e.preventDefault(); }
      if (e.key === 'm' || e.key === 'M') { openWindow('mail'); e.preventDefault(); }
      if (e.key === 'o' || e.key === 'O') { openWindow('Okayzon'); e.preventDefault(); }
    });
  },
  _initMenuStars,
};

// Menu starfield
let _menuStarsCanvas: HTMLCanvasElement | null = null;

function _initMenuStars(): void {
  _menuStarsCanvas = document.querySelector('#main-menu .menu-stars') as HTMLCanvasElement | null;
  if (!_menuStarsCanvas) return;
  const ctx = _menuStarsCanvas.getContext('2d');
  if (!ctx) return;
  _menuStarsCanvas.width = 640;
  _menuStarsCanvas.height = 360;
  const stars: Array<{ x: number; y: number; r: number; speed: number }> = [];
  for (let i = 0; i < 80; i++) {
    stars.push({
      x: Math.random() * 640,
      y: Math.random() * 360,
      r: Math.random() * 1.5 + 0.5,
      speed: Math.random() * 20 + 10,
    });
  }
  function draw(): void {
    if (!ctx || !_menuStarsCanvas) return;
    ctx.fillStyle = 'rgba(0,0,0,0.15)';
    ctx.fillRect(0, 0, 640, 360);
    for (const s of stars) {
      ctx.fillStyle = `rgba(200,220,255,${0.5 + s.r / 3})`;
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
      ctx.fill();
      s.y -= s.speed * 0.016;
      if (s.y < -5) { s.y = 365; s.x = Math.random() * 640; }
    }
    requestAnimationFrame(draw);
  }
  draw();
}

// Clippy integration state
let _clippyLoaded = false;
let _clippyAgent: any = null;
let _clippyAgentName: string | null = null; // Track currently loaded agent name
let _clippyLoading: string | null = null; // Track in-flight agent name to avoid double-load

function _loadClippyAgent(agentName: string, callback?: () => void): void {
  const clippy = (window as any).clippy;
  if (!clippy) return;

  // If already loading the same agent, skip
  if (_clippyLoading === agentName) return;
  _clippyLoading = agentName;

  if (_clippyAgent) {
    _clippyAgent.hide();
    _clippyAgent = null;
    _clippyAgentName = null;
  }
  const old = document.querySelector('.clippy');
  if (old) old.remove();
  const oldBalloon = document.querySelector('.clippy-balloon');
  if (oldBalloon) oldBalloon.remove();

  clippy.load(agentName, (agent: any) => {
    // Discard stale callback if a newer load request has been made
    if (_clippyLoading !== agentName) return;
    _clippyAgent = agent;
    _clippyAgentName = agentName;
    _clippyLoading = null;
    if (GS.screen === 'desktop-screen') {
      agent.show();
    }
    if (callback) callback();
  });
}

// Expose for state.ts switchClippyAgent
(window as any).__loadClippyAgent = _loadClippyAgent;

// Hook: called by screens.ts showScreen() whenever screen changes.
// This properly intercepts ALL screen changes, not just HTML onclick handlers.
(window as any).__onScreenChange = function(id: string): void {
  if (id === 'desktop-screen') {
    if (!_clippyLoaded) {
      _clippyLoaded = true;
      _loadClippyAgent(GS.settings.clippyAgent || 'Merlin');
    } else {
      // Reload if agent changed (e.g. via settings)
      if (_clippyAgentName !== null && _clippyAgentName !== GS.settings.clippyAgent) {
        _loadClippyAgent(GS.settings.clippyAgent || 'Merlin');
      } else if (_clippyAgent) {
        _clippyAgent.show();
      } else {
        _loadClippyAgent(GS.settings.clippyAgent || 'Merlin');
      }
    }
  } else {
    if (_clippyAgent) _clippyAgent.hide();
  }
};

// Set BASE_PATH fix
if ((window as any).clippy) {
  (window as any).clippy.BASE_PATH = 'https://cdn.jsdelivr.net/gh/smore-inc/clippy.js/agents/';
}

// Auto-start
document.addEventListener('DOMContentLoaded', () => {
  App.init();
});
