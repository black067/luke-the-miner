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
      <button onclick="setMailSelected(null);refreshWindowBody('mail')" style="margin-bottom: 8px;">返回</button>
      <div class="field-row"><label>来自</label><span class="field-border" style="flex: 1">${m.from}</span></div>
      <div class="field-row"><label>标题</label><span class="field-border" style="flex: 1">${m.subject}</span></div>
      <div class="mail-full sunken-panel">${m.body}</div>
    </div>`;
    }
    return DATA.MAILS.map((m, i) => {
        const isUnread = !GS.mailsRead[m.id];
        const unreadStyle = isUnread ? '' : ''; // TODO: DO NOT USE STYLE FOR THIS, ADD A RED DOT OR SOMETHING
        return `<div class="mail-item"${unreadStyle} onclick="setMailSelected(${i});refreshWindowBody('mail')">
      <div class="mail-from">${m.from}</div>
      <div>${m.subject}</div>
      <div class="mail-preview">${m.body.split('\n')[0]}…</div>
    </div>`;
    }).join('');
}
