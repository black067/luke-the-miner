/* ============================================================
   RADIO.TS — Radio (locked until first combat complete)
   ============================================================ */

import { GS } from './state.js';

export function getRadioBody(): string {
    if (!GS.unlocks.radioRepaired) {
        return `<div style="text-align:center;padding:24px;color:#666;">
      <div style="font-size:48px;margin-bottom:16px;">📻</div>
      <div>收音机已损坏</div>
      <div style="font-size:11px;color:#555;margin-top:8px;">无法接收信号</div>
    </div>`;
    }
    return `
    <div class="radio-deck">
      <!-- LCD frequency display -->
      <div class="radio-lcd">
        <div class="radio-lcd-label">MHz</div>
        <div class="radio-lcd-value">107.8</div>
      </div>
      <!-- Stereo level meters -->
      <div class="radio-meters">
        <div class="radio-meter">
          <span class="radio-meter-label">L</span>
          <div class="radio-meter-bar"><div class="radio-meter-fill" style="width:60%"></div></div>
        </div>
        <div class="radio-meter">
          <span class="radio-meter-label">R</span>
          <div class="radio-meter-bar"><div class="radio-meter-fill" style="width:45%"></div></div>
        </div>
        <div class="radio-meter-db">
          <span>-10</span><span>-5</span><span>0</span><span>+3</span><span>+10</span>
        </div>
      </div>
      <!-- Transport controls -->
      <div class="radio-controls">
        <button disabled>⏮</button>
        <button disabled>⏪</button>
        <button disabled class="radio-btn-rec">●</button>
        <button disabled>▶</button>
        <button disabled>⏸</button>
        <button disabled>⏭</button>
      </div>
      <!-- Broadcast text -->
      <div class="radio-broadcast">
        <div class="radio-station">火星自由之声</div>
        <p>"……帝国的谎言正在崩塌。他们说星环是机会，实际上是债务奴隶制的新包装。</p>
        <p>每一个矿工都在用生命偿还他们从未欠下的债……</p>
        <p>这里是火星自由之声，来自人类第二共和国的问候。</p>
        <p>如果你听到这段广播，说明你已经走出了帝国的信息茧房。</p>
        <p>记住，你并不孤单。"</p>
      </div>
    </div>`;
}
