/* @file kb-parse.js — 条件解析与索引：9 种条件写法、规则键、当日命中键 */

const KINDS = [
  {k:'lun', label:'农历月日', hint:'3-3 = 农历三月初三；3-* = 三月的每一天；*-15 = 每月十五'},
  {k:'sol', label:'公历月日', hint:'1-1 = 一月一日；12-25 = 十二月二十五'},
  {k:'gz',  label:'日干支',  hint:'甲子 = 甲子日；甲 = 天干为甲的日子；子 = 地支为子的日子'},
  {k:'zx',  label:'建除十二值', hint:'破 = 破日；成 = 成日'},
  {k:'ts',  label:'值日神',  hint:'白虎 = 值日神为白虎的日子'},
  {k:'jq',  label:'节气',    hint:'立春 = 立春当天；立春-1 = 立春前一天'},
  {k:'xx',  label:'二十八宿', hint:'角 = 值日宿为角'},
  {k:'wk',  label:'星期',    hint:'0 是周日，1 是周一 … 6 是周六'},
  {k:'zc',  label:'冲某个生肖', hint:'羊 = 当天冲羊'}
];
const KIND_MAP = {}; KINDS.forEach(x=>KIND_MAP[x.k]=x);

function numOrStar(s){
  s = String(s).trim();
  if(s==='*') return '*';
  if(/^\d+$/.test(s)) return +s;
  return null;
}
function parseOne(kind, s){
  s = String(s).trim();
  if(kind==='lun' || kind==='sol'){
    const p = s.split('-');
    if(p.length!==2) return {err:'要写成 月-日，例如 3-3'};
    const m = numOrStar(p[0]), d = numOrStar(p[1]);
    if(m===null || d===null) return {err:'月和日只能填数字或 *'};
    if(m!=='*' && (m<1||m>12)) return {err:'月份要在 1–12 之间'};
    if(d!=='*' && (d<1||d>31)) return {err:'日期要在 1–31 之间'};
    return {m:{m,d}};
  }
  if(kind==='gz'){
    if(s.length===2 && GAN_WX[s[0]] && ZHI_WX[s[1]]) return {m:{gz:s}};
    if(s.length===1 && GAN_WX[s]) return {m:{gan:s}};
    if(s.length===1 && ZHI_WX[s]) return {m:{zhi:s}};
    return {err:'要写成 甲子（干支）、甲（天干）或 子（地支）'};
  }
  if(kind==='zx'){
    if(ZHIXING_LIST.indexOf(s)>=0) return {m:{v:s}};
    return {err:'只能填 '+ZHIXING_LIST.join('、')+' 其中之一'};
  }
  if(kind==='ts'){
    if(TIANSHEN_ALL.indexOf(s)>=0) return {m:{v:s}};
    return {err:'只能填 '+TIANSHEN_ALL.join('、')+' 其中之一'};
  }
  if(kind==='xx'){
    if(XIU_LIST.indexOf(s)>=0) return {m:{v:s}};
    return {err:'只能填 '+XIU_LIST.join('')+' 其中之一'};
  }
  if(kind==='zc'){
    if(ZODIACS.indexOf(s)>=0) return {m:{v:s}};
    return {err:'生肖只能填 '+ZODIACS.join('、')};
  }
  if(kind==='jq'){
    const p = s.split('-');
    const name = (p[0]||'').trim();
    if(JIEQI_LIST.indexOf(name)<0) return {err:'节气名要写全，例如 立春、惊蛰、清明'};
    if(p.length>2 || (p.length===2 && String(p[1]).trim()==='')) {
      return {err:'节气后面只能跟一个 -1 到 -3（表示前几天），例如 立春-1'};
    }
    const off = p.length>1 ? +p[1] : 0;
    if(p.length>1 && (isNaN(off) || off<0 || off>3)) return {err:'节气后面只能跟 -1 到 -3，表示前几天'};
    return {m:{v:name, off:off}};
  }
  if(kind==='wk'){
    const v = +s;
    if(!(v>=0 && v<=6)) return {err:'星期要填 0–6，0 是周日'};
    return {m:{v:v}};
  }
  return {err:'未知的规则类型'};
}
function parseMatch(kind, str){
  const parts = String(str||'').split('|').map(t=>t.trim()).filter(Boolean);
  if(!parts.length) return {ok:false, err:'条件不能留空'};
  const ms = [];
  for(let i=0;i<parts.length;i++){
    const r = parseOne(kind, parts[i]);
    if(r.err) return {ok:false, err:'「'+parts[i]+'」'+r.err};
    ms.push(r.m);
  }
  return {ok:true, m:ms};
}
function matchText(rule){
  const names = {'lun':'农历','sol':'公历','gz':'日干支','zx':'建除','ts':'值日神','jq':'节气','xx':'宿','wk':'星期','zc':'冲'};
  const parts = (rule.m||[]).map(m=>{
    if(rule.kind==='lun') return (m.m==='*'?'每月':m.m+'月')+(m.d==='*'?'每天':m.d+'日');
    if(rule.kind==='sol') return m.m+'月'+m.d+'日';
    if(rule.kind==='gz') return m.gz || ('天干'+m.gan) || ('地支'+m.zhi);
    if(rule.kind==='jq') return m.v + (m.off? (' 前'+m.off+'日') : ' 当天');
    if(rule.kind==='wk') return ['周日','周一','周二','周三','周四','周五','周六'][m.v];
    if(rule.kind==='zc') return '冲'+m.v;
    return m.v;
  });
  return (names[rule.kind]||'') + '：' + parts.join(' / ');
}

/* --- 索引 --- */
function ruleKeys(r){
  const keys = [];
  (r.m||[]).forEach(m=>{
    if(r.kind==='lun') keys.push('lun:'+m.m+'-'+m.d);
    else if(r.kind==='sol') keys.push('sol:'+m.m+'-'+m.d);
    else if(r.kind==='gz'){
      if(m.gz) keys.push('gz:'+m.gz);
      if(m.gan) keys.push('gzG:'+m.gan);
      if(m.zhi) keys.push('gzZ:'+m.zhi);
    }
    else if(r.kind==='zx') keys.push('zx:'+m.v);
    else if(r.kind==='ts') keys.push('ts:'+m.v);
    else if(r.kind==='xx') keys.push('xx:'+m.v);
    else if(r.kind==='zc') keys.push('zc:'+m.v);
    else if(r.kind==='wk') keys.push('wk:'+m.v);
    else if(r.kind==='jq') keys.push('jq:'+m.v+'-'+(m.off||0));
  });
  return keys;
}
function rebuildIndex(){
  IDX = new Map();
  HAS_JQ_OFF = false;
  KB.rules.forEach(r=>{
    if(r.on===false) return;
    if(r.kind==='jq' && (r.m||[]).some(m=>m.off>0)) HAS_JQ_OFF = true;
    ruleKeys(r).forEach(k=>{
      let a = IDX.get(k);
      if(!a){ a = []; IDX.set(k, a); }
      a.push(r);
    });
  });
}
function dayRuleKeys(solar, lunar){
  const keys = [];
  const lm = Math.abs(lunar.getMonth()), ld = lunar.getDay();
  keys.push('lun:'+lm+'-'+ld, 'lun:'+lm+'-*', 'lun:*-'+ld);
  keys.push('sol:'+solar.getMonth()+'-'+solar.getDay());
  const gz = lunar.getDayInGanZhi();
  keys.push('gz:'+gz, 'gzG:'+gz.charAt(0), 'gzZ:'+gz.charAt(1));
  keys.push('zx:'+lunar.getZhiXing(), 'ts:'+lunar.getDayTianShen(), 'xx:'+lunar.getXiu());
  keys.push('zc:'+lunar.getDayChongShengXiao());
  keys.push('wk:'+solar.getWeek());
  const jq = lunar.getJieQi();
  if(jq) keys.push('jq:'+jq+'-0');
  if(HAS_JQ_OFF){
    for(let n=1;n<=3;n++){
      const jqN = solar.next(n).getLunar().getJieQi();
      if(jqN) keys.push('jq:'+jqN+'-'+n);
    }
  }
  return keys;
}
function ruleApplies(r, ev){
  if(!r.scope || !r.scope.length) return true;
  return r.scope.indexOf(ev.id)>=0 || r.scope.indexOf(ev.k)>=0;
}

