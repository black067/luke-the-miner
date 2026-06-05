/* ============================================================
   INTRO.TS — SMS-style intro cutscene
   ============================================================ */

import { UI } from './audio.js';
import { showScreen } from './screens.js';
import { dispatch } from './state.js';

export function showIntro(): void {
    UI.click();
    showScreen('intro-screen');
    dispatch({ type: 'SET_IS_NEW_GAME', value: true });
    const s1 = document.getElementById('sms1')!;
    const s2 = document.getElementById('sms2')!;
    // Reset and animate
    s1.style.opacity = '0';
    s1.style.transform = 'translateY(20px)';
    s2.style.opacity = '0';
    s2.style.transform = 'translateY(20px)';
    s1.style.transition = 'all 0.3s ease';
    s2.style.transition = 'all 0.3s ease';
    setTimeout(() => {
        s1.style.opacity = '1';
        s1.style.transform = 'translateY(0)';
    }, 400);
    setTimeout(() => {
        s2.style.opacity = '1';
        s2.style.transform = 'translateY(0)';
    }, 1200);
}
