/* ============================================================
   DATA/WORLD.TS — AREAS, MAILS
   ============================================================ */

import type { AreaDef, MailDef } from '../types.js';

export const AREAS: AreaDef[] = [
    { id: 'mine', name: '⛏️ 矿区', difficulty: '★☆☆☆☆', difficultyStars: 1, locked: false, specialResource: '铁矿石', resourceGoal: 30, waves: 7, desc: '星环内1环A区，新手矿工的第一站。' },
    { id: 'insect', name: '🐝 昆虫区', difficulty: '★★☆☆☆', difficultyStars: 2, locked: false, specialResource: '几丁质外壳', resourceGoal: 40, waves: 7, desc: '被变异昆虫占据的矿区。' },
    { id: 'ocean', name: '🐙 海洋生物区', difficulty: '★★★☆☆', difficultyStars: 3, locked: true, specialResource: '深海珍珠', resourceGoal: 50, waves: 8, desc: '曾经的海洋，如今漂浮在星环中。' },
    { id: 'moon', name: '🌑 破碎之月', difficulty: '★★★★☆', difficultyStars: 4, locked: true, specialResource: '月岩碎片', resourceGoal: 60, waves: 9, desc: '月球碎片形成的危险区域。' },
];

export const MAILS: MailDef[] = [
    { id: 'mail1', from: '星环矿业 HR', subject: '🎉 欢迎新矿工入职！', body: '亲爱的矿工，欢迎加入星环矿业大家庭！\n\n您已被分配至内1环A区矿区。请仔细阅读以下注意事项：\n\n1. 矿工在工作期间必须全程佩戴安全头盔\n2. 陨石碎片属于公司财产，严禁私藏\n3. 每月15号为还款日，逾期将产生额外利息\n4. 如遇紧急情况，请使用随身通讯器联系矿场调度中心\n\n祝您工作顺利，早日还清债务！\n\n—— 星环矿业人力资源部', read: false },
    { id: 'mail2', from: '特没谱金融', subject: '⚠️ 还款提醒', body: '尊敬的客户：\n\n您的学生贷款账户（编号：SG-2847-A）本月还款尚未足额到账。\n\n当前欠款总额：¥128,000\n本月应还：¥4,200\n已还：¥0\n逾期天数：187天\n\n根据合同条款第7条第3款，我们已自动将您推荐至星环矿工计划。您的工资收入的50%将直接划转至还款账户。\n\n如有疑问，请联系AI客服（24小时在线）。\n\n—— 特没谱金融服务集团', read: false },
    { id: 'mail3', from: '内1环矿工工会', subject: '📢 关于近期矿区安全事件的通知', body: '各位工友：\n\n近期A区矿区陨石活动异常频繁，已有三名矿工在工作中受伤。工会已向公司提出以下要求：\n\n1. 增派安全巡逻艇\n2. 提高危险作业补贴\n3. 为所有矿工配备升级版防护模块\n\n公司方面尚未给出明确答复。工会建议各位工友在工作时格外小心，遇到危险及时撤离，安全第一。\n\n团结就是力量！\n\n—— 内1环矿工工会', read: false },
];
