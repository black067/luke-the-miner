/* ============================================================
   MAIL.TS — Mail system
   ============================================================ */

import { DATA } from './data.js';
import { GS, dispatch } from './state.js';

export let mailSelected: number | null = null;

/** Setter for mailSelected — exposed to window for HTML onclick handlers */
export function setMailSelected(v: number | null): void { mailSelected = v; }

export function getMailBody(): string {
    if (mailSelected !== null) {
        const m = DATA.MAILS[mailSelected];
        if (!m) {
            mailSelected = null;
            return getMailBody();
        }
        // Mark as read
        dispatch({ type: 'MARK_MAIL_READ', mailId: m.id });
        return `<div class="mail-detail">
      <button onclick="setMailSelected(null);refreshWindowBody('mail')">返回</button>
      <div style="font-size:12px;color:#555;margin-bottom:4px;">${m.from}</div>
      <div style="font-size:15px;color:#222;font-weight:bold;margin-bottom:10px;">${m.subject}</div>
      <div class="mail-full sunken-panel">${m.body}</div>
    </div>`;
    }
    return DATA.MAILS.map((m, i) => {
        const isUnread = !GS.mailsRead[m.id];
        const unreadStyle = isUnread ? ' style="font-weight:bold"' : '';
        return `<div class="mail-item"${unreadStyle} onclick="setMailSelected(${i});refreshWindowBody('mail')">
      <div class="mail-from">${m.from}</div>
      <div>${m.subject}</div>
      <div class="mail-preview">${m.body.split('\n')[0]}…</div>
    </div>`;
    }).join('');
}
