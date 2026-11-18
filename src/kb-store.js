/* @file kb-store.js — 规则书存储：localStorage 读写、默认权重 */

/* ================= 知识库 ================= */
const KB_KEY = 'mybazi.kb.v2';
const DEF_SET = {base:48, yi:9, ji:14, chong:12, useZx:true, useTs:true, useXiu:true};
let KB = {v:2, set:Object.assign({},DEF_SET), events:[], rules:[]};
let IDX = null;
let HAS_JQ_OFF = false;
const PAGE_SIZE = 40;
const KBUI = {q:'', cat:'', onoff:'', page:0};

function loadKB(){
  try{
    const raw = localStorage.getItem(KB_KEY);
    if(raw){
      const o = JSON.parse(raw);
      if(o && o.v===2){
        KB.set = Object.assign({}, DEF_SET, o.set||{});
        KB.events = Array.isArray(o.events)? o.events : [];
        KB.rules  = Array.isArray(o.rules)? o.rules : [];
      }
    }
  }catch(e){}
  rebuildIndex();
}
function saveKB(){
  let ok = true;
  try{
    const s = JSON.stringify({v:2, set:KB.set, events:KB.events, rules:KB.rules});
    localStorage.setItem(KB_KEY, s);
  }catch(e){ ok = false; }
  rebuildIndex();
  if(!ok) kbMsg('err', '保存失败了：浏览器本地存储可能已经满。先去「导出 JSON」备份一份，再删掉一些不用的规则。');
  return ok;
}

/* --- 规则类型与条件解析 --- */
