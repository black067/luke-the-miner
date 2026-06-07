// 星环矿工 · Luke The Miner — 太空背景音乐
// Space ambient + chiptune + 飞船旅行感

setcps(0.7)

// 稀疏鼓点 — 太空脉冲（用 noise 替代 tr808 采样）
$: s("[white ~ ~ ~, ~ ~ white ~, ~ ~ white [white white]]")
  .gain(.18)
  .dec(.08)
  .room(.4)

// 引擎低音 — 深沉脉冲推进
$: note("<c2 ~ eb2 ~, f2 ~ ab2 ~, g2 ~ bb2 ~, c2 ~ eb2 ~>")
  .sound("square")
  .gain(.25)
  .lpf(450)
  .dec(.35)
  .room(.3)

// 星环轨道琶音 — 上行飞行感
$: note("<[c4 eb4 g4 c5] [f4 ab4 c5 f5] [g4 bb4 d5 g5] [c5 eb5 g5 c6]>")
  .sound("triangle")
  .gain(.12)
  .dec(.5)
  .room(.55)
  .delay(.25)

// 星空闪烁高音 — 随机左右飘移
$: note("<c6 ~ eb6 ~, g5 ~ c6 ~, d6 ~ ~ ~, eb6 ~ c6 ~>")
  .sound("sine")
  .gain(.06)
  .dec(.35)
  .room(.85)
  .pan(rand)

// 深空氛围垫 — 缓慢和声变化
$: note("<[c3 g3 c4] [f3 c4 f4] [g3 d4 g4] [c3 g3 c4]>/4")
  .sound("sawtooth")
  .gain(.05)
  .lpf(200)
  .dec(.95)
  .room(.95)