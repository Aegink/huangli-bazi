/*
 * 自动化测试入口：node tests/run.js
 *
 * 做法：把 src/ 里 15 个源码文件按构建顺序拼起来，在一个受控沙箱里执行（DOM/localStorage 都是桩，
 * 时钟冻结在 2026-11-18），然后对"历法与天文 / 规则引擎 / 界面渲染 / 工程约束 / 构建同步"五组断言。
 *
 * 为什么不用真实浏览器：这套测试要在 CI 上几秒钟跑完，且不依赖网络、不依赖字体与像素。
 * 视觉正确性仍靠人工截图验收（见交接文档第十节）。
 * 为什么测 src/ 而不是 index.html：index.html 是产物，测源码才能定位到具体文件；产物一致性由 E 组守。
 */

const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { execFileSync } = require('child_process');
const { createEnv } = require('./dom-stub');
const { JS_FILES } = require('../tools/manifest');

const ROOT = path.join(__dirname, '..');
const SRC = path.join(ROOT, 'src');
const HTML_PATH = path.join(ROOT, 'index.html');
const LUNAR_PATH = path.join(ROOT, 'assets', 'lunar.js');
const NOW = '2026-11-18T10:00:00+08:00';

/* ---------- 极简断言 ---------- */
let pass = 0;
const failures = [];
function ok(name, cond, detail) {
  if (cond) { pass++; return true; }
  failures.push(name + (detail ? '  →  ' + detail : ''));
  return false;
}
function eq(name, actual, expected) {
  return ok(name, actual === expected, 'expect ' + JSON.stringify(expected) + ', got ' + JSON.stringify(actual));
}
function near(name, actual, expected, tol) {
  return ok(name, Math.abs(actual - expected) <= tol, 'expect ' + expected + ' ±' + tol + ', got ' + actual);
}
function group(title, fn) {
  console.log('\n' + title);
  try { fn(); } catch (e) { failures.push(title + ' 抛出异常: ' + e.message); }
}

/* ---------- 装载被测脚本 ---------- */
if (!fs.existsSync(LUNAR_PATH)) { console.error('找不到 assets/lunar.js（离线库必须与 index.html 同目录）'); process.exit(1); }
const missing = JS_FILES.filter(f => !fs.existsSync(path.join(SRC, f)));
if (missing.length) { console.error('src/ 缺少源文件：' + missing.join(', ')); process.exit(1); }

const code = JS_FILES.map(f => fs.readFileSync(path.join(SRC, f), 'utf8')).join('\n\n');
const template = fs.readFileSync(path.join(SRC, 'template.html'), 'utf8');
const style = fs.readFileSync(path.join(SRC, 'style.css'), 'utf8');

const lunar = require(LUNAR_PATH);
const env = createEnv(NOW);
const sandbox = Object.assign({ Solar: lunar.Solar, Lunar: lunar.Lunar }, env.sandbox);

/* 测试专用导出：把脚本内部的名字挂到 __T，产品代码本身不受影响 */
const shim = `
;globalThis.__T = {
  KB, DEF_SET, KINDS, ZODIACS, CITIES, BUILTIN_EVENTS,
  solarOf, toTrueSolar, evalDay, parseMatch, matchExpr, normImport, CSV_TPL,
  eventById, allEvents, loadKB, saveKB, applyImport, renderPick, renderChart,
  renderToday, renderKb, renderKbList, hourTable, applyTheme, themeMode,
  takeSnapshot, rollbackSnapshot, snapshotInfo,
  setPending: function (v) { PENDING = v; },
  lastRows: function () { return LAST_ROWS; }
};`;

vm.createContext(sandbox);
try {
  vm.runInContext(code + '\n' + shim, sandbox, { filename: 'index.html' });
} catch (e) {
  console.error('装载失败：脚本执行抛错 → ' + e.message);
  process.exit(1);
}
const T = sandbox.__T;
const el = id => env.sandbox.document.getElementById(id);

/* ---------- A. 历法与天文 ---------- */
group('A. 历法与天文（可严格验证的部分）', () => {
  // A1 日干支 60 天循环：连查 1200 天，干支合法且严格 +1
  const GAN = '甲乙丙丁戊己庚辛壬癸';
  const ZHI = '子丑寅卯辰巳午未申酉戌亥';
  const toIdx = gz => {
    for (let k = 0; k < 60; k++) if (GAN[k % 10] + ZHI[k % 12] === gz) return k;
    return -1;
  };
  let s = T.solarOf(2024, 1, 1);
  let start = null, bad = 0, invalid = 0;
  for (let i = 0; i < 1200; i++) {
    const idx = toIdx(s.getLunar().getDayInGanZhi());
    if (idx < 0) invalid++;
    else if (start === null) start = idx;
    else if ((idx - start + 60) % 60 !== i % 60) bad++;
    s = s.next(1);
  }
  eq('A1 非法干支数', invalid, 0);
  eq('A1 干支推进错乱数', bad, 0);

  // A2 2026 年 24 节气齐全，相邻间隔落在天文合理区间
  const table = T.solarOf(2026, 6, 1).getLunar().getJieQiTable();
  const inYear = Object.keys(table)
    .map(k => ({ k, t: table[k] }))
    .filter(o => o.t.getYear() === 2026)
    .sort((a, b) => a.t.toYmdHms().localeCompare(b.t.toYmdHms()));
  eq('A2 2026 年节气条数', inYear.length, 24);
  const gaps = inYear.slice(1).map((o, i) => o.t.getJulianDay() - inYear[i].t.getJulianDay());
  ok('A2 节气间隔在 14.5–16.0 天', gaps.every(g => g > 14.5 && g < 16.0),
    '最短 ' + Math.min(...gaps).toFixed(2) + ' 最长 ' + Math.max(...gaps).toFixed(2));
  const lichun = inYear.find(o => o.k === '立春');
  eq('A2 2026 立春日期', lichun ? lichun.t.toYmd() : '缺', '2026-02-04');

  // A3 闰月：2025 闰六月、2033 闰十一月（跨到 2034 年初）
  eq('A3 2025-08-01 为闰六月', T.solarOf(2025, 8, 1).getLunar().getMonth(), -6);
  eq('A3 2034-01-15 为闰十一月', T.solarOf(2034, 1, 15).getLunar().getMonth(), -11);

  // A4 均时差：与 NOAA 精确式比对（经度取 120 消除经度差，只看均时差）
  const noaa = n => {
    const g = (2 * Math.PI / 365) * (n - 1);
    return 229.18 * (0.000075 + 0.001868 * Math.cos(g) - 0.032077 * Math.sin(g)
      - 0.014615 * Math.cos(2 * g) - 0.040849 * Math.sin(2 * g));
  };
  const cases = [
    { y: 2026, m: 2, d: 11, n: 42 },
    { y: 2026, m: 5, d: 14, n: 134 },
    { y: 2026, m: 7, d: 26, n: 207 },
    { y: 2026, m: 11, d: 3, n: 307 }
  ];
  let worst = 0;
  cases.forEach(c => {
    const ts = T.toTrueSolar(c.y, c.m, c.d, 12, 0, 120);
    const shift = (ts.h - 12) * 60 + ts.mi;
    const diff = Math.abs(shift - noaa(c.n));
    if (diff > worst) worst = diff;
  });
  ok('A4 均时差与 NOAA 的最大偏差 ≤ 1.5 分钟', worst <= 1.5, '实测 ' + worst.toFixed(2) + ' 分钟');

  // A5 真太阳时校正：北京 116.41，1995-06-15 08:00 → 07:45
  const ts = T.toTrueSolar(1995, 6, 15, 8, 0, 116.41);
  eq('A5 北京经度校正后小时', ts.h, 7);
  ok('A5 校正后分钟在 44–46', ts.mi >= 44 && ts.mi <= 46, '实得 ' + ts.mi);

  // A6 已知四柱样例
  const ec = T.solarOf(ts.y, ts.m, ts.d, ts.h, ts.mi).getLunar().getEightChar();
  eq('A6 四柱 1995-06-15 北京', [ec.getYear(), ec.getMonth(), ec.getDay(), ec.getTime()].join(' '), '乙亥 壬午 丁丑 甲辰');
});

/* ---------- B. 规则引擎 ---------- */
group('B. 规则引擎与数据导入', () => {
  // B1 条件解析
  ok('B1 lun 3-3 解析通过', T.parseMatch('lun', '3-3').ok);
  ok('B1 lun 月-* 解析通过', T.parseMatch('lun', '3-*').ok);
  const badMonth = T.parseMatch('lun', '13-40');
  ok('B1 非法月份被拒', !badMonth.ok, badMonth.err);
  ok('B1 非法月份报错点明 1–12', /1–12|1-12/.test(badMonth.err || ''), badMonth.err);
  const badZx = T.parseMatch('zx', '紫');
  ok('B1 非法建除被拒且列出十二值', !badZx.ok && /建|破/.test(badZx.err || ''), badZx.err);
  ok('B1 干支 甲子 解析通过', T.parseMatch('gz', '甲子').ok);

  // B2 CSV 模板：4 条示例、0 错误
  const tpl = T.normImport(T.CSV_TPL, 'template.csv');
  eq('B2 CSV 模板规则数', tpl.rules.length, 4);
  eq('B2 CSV 模板错误数', tpl.errors.length, 0);

  // B3 坏行必须被拦下，并指出行号
  const bad = 'kind,title,match,scope,score,ban,note,source,on\n'
    + 'lun,坏例子,13-40,,0,0,,,1\n'
    + 'zx,坏建除,紫,,0,0,,,1';
  const rb = T.normImport(bad, 'bad.csv');
  ok('B3 坏行被拦下', rb.errors.length >= 2, 'errors=' + rb.errors.length);
  ok('B3 报错带行号', rb.errors.some(e => /第 2 行/.test(e)), rb.errors.join(' | '));

  // B4 JSON 导入
  const js = JSON.stringify({ v: 2, events: [{ name: '谢土', words: ['修造', '动土'] }], rules: [{ kind: 'gz', title: '甲子日慎动土', match: '甲子', scope: '装修 / 动工', score: -10, src: 'p.9', on: 1 }] });
  const rj = T.normImport(js, 'x.json');
  eq('B4 JSON 规则数', rj.rules.length, 1);
  eq('B4 JSON 事项数', rj.events.length, 1);
  eq('B4 JSON 错误数', rj.errors.length, 0);

  // B5 合并导入去重：同一批导入两次，第二次新增应为 0
  T.setPending(T.normImport(T.CSV_TPL, 't.csv'));
  T.applyImport();
  const after1 = T.KB.rules.length;
  T.setPending(T.normImport(T.CSV_TPL, 't.csv'));
  T.applyImport();
  eq('B5 重复导入不重复入库', T.KB.rules.length, after1);

  // B6 一票否决生效
  T.KB.rules.push({ id: 'b1', on: true, kind: 'sol', m: [{ m: 11, d: 23 }], cat: '禁忌', title: '测试：这天不行', scope: [], score: 0, ban: true, note: '', src: '测试' });
  T.saveKB();
  const banned = T.evalDay(T.solarOf(2026, 11, 23), T.eventById('e4'), '');
  ok('B6 命中 ban 规则的日子被标记', banned.ban === true);

  // B7 节气前一日规则精确命中（off=1 表示"前 1 日"，2026 小雪在 11-22）
  T.KB.rules.push({ id: 'j1', on: true, kind: 'jq', m: [{ v: '小雪', off: 1 }], cat: '民俗', title: '小雪前一日', scope: [], score: -5, ban: false, note: '', src: '测试' });
  T.saveKB();
  const hit = T.evalDay(T.solarOf(2026, 11, 21), T.eventById('e4'), '');
  ok('B7 小雪前一日命中 2026-11-21', hit.hits.some(h => /小雪前一日/.test(h.t)), hit.hits.map(h => h.t).join(' | '));
  const noHit = T.evalDay(T.solarOf(2026, 11, 20), T.eventById('e4'), '');
  ok('B7 前一天不误命中', !noHit.hits.some(h => /小雪前一日/.test(h.t)));
  ok('B7 节气条件不接受负数', !T.parseMatch('jq', '小雪--1').ok);

  // B8 适用事项隔离：只对「结婚 / 领证」生效的规则不影响「搬家 / 移居」
  T.KB.rules.push({ id: 's1', on: true, kind: 'sol', m: [{ m: 3, d: 3 }], cat: '民俗', title: '仅结婚用', scope: ['e4'], score: -8, ban: false, note: '', src: '测试' });
  T.saveKB();
  const d = T.solarOf(2027, 3, 3);
  const forMarry = T.evalDay(d, T.eventById('e4'), '');
  const forMove = T.evalDay(d, T.eventById('e0'), '');
  ok('B8 命中结婚规则', forMarry.hits.some(h => /仅结婚用/.test(h.t)));
  ok('B8 不影响搬家', !forMove.hits.some(h => /仅结婚用/.test(h.t)));

  // B9 分数上限不超过 96
  let maxScore = 0;
  for (let i = 0; i < 120; i++) {
    const r = T.evalDay(T.solarOf(2026, 12, 1).next(i), T.eventById('e4'), '');
    if (!r.ban && r.score > maxScore) maxScore = r.score;
  }
  ok('B9 分数不超过 96', maxScore <= 96, '最高 ' + maxScore);

  // B10 导入前快照 + 撤销
  T.takeSnapshot();
  const snapshotIds = T.KB.rules.map(r => r.id).join(',');
  T.KB.rules.push({ id: 'tmp1', on: true, kind: 'wk', m: [{ v: 1 }], cat: '其他', title: '临时', scope: [], score: 0, ban: false, note: 'x', src: '' });
  T.saveKB();
  T.rollbackSnapshot();
  eq('B10 撤销后规则回到快照状态', T.KB.rules.map(r => r.id).join(','), snapshotIds);
  ok('B10 快照键存在', !!T.snapshotInfo());
});

/* ---------- C. 界面渲染 ---------- */
group('C. 界面渲染（四视图冒烟）', () => {
  el('birthDate').value = '1995-06-15';
  el('birthTime').value = '08:00';
  el('gender').value = '1';
  el('city').value = '0';
  el('event').value = 'e4';
  el('fromDate').value = '2026-11-18';
  el('span').value = '30';

  T.renderPick();
  const pick = el('pickResult').innerHTML;
  ok('C1 择日输出非空', pick.length > 5000, 'len=' + pick.length);
  ok('C1 择日无 undefined/NaN/null', !/undefined|NaN|null,/.test(pick));
  ok('C1 含十二时辰表', /十二个时辰/.test(pick));
  // 时辰表按单日算，避免把整批日子的折叠内容一起数进去
  const ht = T.hourTable(T.solarOf(2026, 11, 18), T.eventById('e4'));
  eq('C1 单日时辰表 12 行', (ht.match(/<tr class=/g) || []).length, 12);
  eq('C1 单日时辰表含 12 个时段', (ht.match(/\d\d:\d\d–\d\d:\d\d/g) || []).length, 12);
  ok('C1 含方位行', /喜神/.test(pick));
  ok('C1 含依据展开入口', /data-row/.test(pick));

  T.renderToday();
  const today = el('todayResult').innerHTML;
  ok('C2 今天页无异常值', !/undefined|NaN|null,/.test(today));
  eq('C2 今日时辰条 12 格', (today.match(/class="hchip/g) || []).length, 12);

  T.renderChart();
  const chart = el('chartResult').innerHTML;
  ok('C3 八字页无异常值', !/undefined|NaN|null,/.test(chart));
  ok('C3 含四柱样例', /乙亥/.test(chart) && /丁丑/.test(chart));
  ok('C3 含近十年流年', /近十年流年/.test(chart));
  ok('C3 流年首年为 2026 丙午', /2026<\/div><div class="gz">丙午<\/div>/.test(chart));
  ok('C3 丁日主见丙为劫财', /丙午<\/div><div class="ss">劫财/.test(chart));

  T.renderKb();
  const kb = el('kbList').innerHTML;
  ok('C4 规则表包在横向滚动容器里', /tscroll/.test(kb));

  T.applyTheme('dark');
  eq('C5 暗色属性', env.sandbox.document.documentElement.getAttribute('data-theme'), 'dark');
  T.applyTheme('light');
  eq('C5 浅色属性', env.sandbox.document.documentElement.getAttribute('data-theme'), 'light');
  eq('C5 主题按钮文案', el('themeBtn').textContent, '浅色');
});

/* ---------- D. 工程约束 ---------- */
group('D. 工程约束（防止以后改坏底线）', () => {
  const html = fs.readFileSync(HTML_PATH, 'utf8');
  ok('D1 有 viewport meta', /<meta name="viewport" content="[^"]*width=device-width/.test(template));
  ok('D1 未禁用缩放', !/maximum-scale|user-scalable=no/.test(template));
  // 除字体样式表外，不允许出现任何外链脚本/样式；字体断网会回落到系统字体，功能不受影响
  const externals = [...template.matchAll(/<(script|link)[^>]*(?:src|href)="(http[^"]*)"/g)].map(m => m[2]);
  ok('D2 无外链脚本', !/<script[^>]+src="http/.test(template));
  ok('D2 外链只允许字体样式表', externals.every(u => /fonts\/css2/.test(u)), externals.join(' | '));
  ok('D2 字体带 display=swap 与系统回退', /fonts\/css2\?[\s\S]*display=swap/.test(template) && /--serif:[^;]*serif/.test(style));
  ok('D3 内联脚本不残留占位符', !/@@SCRIPT@@|@@STYLE@@/.test(html));
  ok('D4 有打印样式', /@media print/.test(style));
  ok('D5 有暗色变量组', /html\[data-theme="dark"\]\{/.test(style));
  ok('D6 不依赖 CDN 库', !/fastly\.jsdelivr|cdnjs|unpkg/.test(html));
  ok('D7 源码里没有 localStorage 明文泄露提示', !/localStorage\.clear\(\)/.test(code));
});

/* ---------- E. 构建产物与源码同步 ---------- */
group('E. 构建产物与源码同步', () => {
  // index.html 是产物：必须由 src/ 拼出来，且与源码逐字节一致
  let checkOk = true, msg = '';
  try {
    execFileSync(process.execPath, [path.join(ROOT, 'tools', 'build.js'), '--check'], { stdio: 'pipe' });
  } catch (e) {
    checkOk = false;
    msg = String(e.stdout || '').trim() + String(e.stderr || '').trim();
  }
  ok('E1 index.html 与 src/ 同步', checkOk, msg);
  const html = fs.readFileSync(HTML_PATH, 'utf8');
  ok('E2 产物内联了历法库引用', /<script src="assets\/lunar\.js"><\/script>/.test(html));
  ok('E3 产物是单个自包含文件（无 src= 指向 src/）', !/src="src\//.test(html));
  ok('E4 产物不含 @file 头以外的空段落标记', html.length > 60000, 'len=' + html.length);
});

/* ---------- 汇总 ---------- */
console.log('\n' + '='.repeat(52));
if (failures.length) {
  console.log('失败 ' + failures.length + ' 项 / 通过 ' + pass + ' 项');
  failures.forEach(f => console.log('  ✗ ' + f));
  process.exit(1);
}
console.log('全部通过：' + pass + ' 项断言');
