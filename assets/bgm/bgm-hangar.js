// 星环矿工 · Luke The Miner — 机库桌面
// 舒缓 · 轻松 · 90s复古 · Win98桌面氛围

setcps(0.5)

// 小沙锤轻摇（用 noise 替代采样）
$: s("[white ~ ~ ~]")
  .gain(.06)
  .dec(.05)
  .room(.35)

// 温暖和弦垫 — FM电钢质感
$: note("<[f3 a3 c4] [d3 f3 a3] [bb2 d3 f3] [c3 e3 g3]>/2")
  .sound("triangle")
  .gain(.1)
  .dec(.7)
  .lpf(900)
  .room(.5)

// 低音 — 圆润深沉
$: note("<f2 ~ ~ ~, d2 ~ ~ ~, bb1 ~ ~ ~, c2 ~ ~ ~>")
  .sound("triangle")
  .gain(.16)
  .dec(.4)
  .lpf(350)
  .room(.3)

// 主旋律 — 轻松悠扬
$: note("<~ [a4 c5 a4] ~ [f4 a4 d4] ~ [bb4 d5 bb4] ~ [g4 c5 e5]>")
  .sound("sine")
  .gain(.1)
  .dec(.5)
  .room(.45)
  .delay(.3)

// 深空氛围 — 极轻铺底
$: note("<f2 a2 c3 f3>/8")
  .sound("sawtooth")
  .gain(.03)
  .lpf(200)
  .dec(.95)
  .room(.95)