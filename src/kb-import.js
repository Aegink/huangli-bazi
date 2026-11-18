/* @file kb-import.js — 导入导出：CSV/JSON 解析校验、导入、快照撤销 */

/* --- 导入导出 --- */
const CSV_HEAD = ['kind','title','match','scope','score','ban','note','source','on'];
const CSV_HEAD_CN = {'类型':'kind','标题':'title','条件':'match','事项':'scope','加减分':'score','分值':'score','否决':'ban','说明':'note','出处':'source','启用':'on'};

function parseCsv(text){
  const rows = [];
  let cur = '', row = [], q = false;
  for(let i=0;i<text.length;i++){
    const c = text.charAt(i);
    if(q){
      if(c==='"'){
        if(text.charAt(i+1)==='"'){ cur+='"'; i++; } else q = false;
      }else cur += c;
    }
    else if(c==='"') q = true;
    else if(c===','){ row.push(cur); cur=''; }
    else if(c==='\n'){ row.push(cur); cur=''; if(row.join('').trim()) rows.push(row); row=[]; }
    else if(c==='\r'){ }
    else cur += c;
  }
  if(cur!=='' || row.length){ row.push(cur); if(row.join('').trim()) rows.push(row); }
  return rows;
}

function buildRule(o, where, errors){
  const kind = String(o.kind||'').trim();
  if(!KIND_MAP[kind]){ errors.push(where+'：类型「'+kind+'」不认识，只能是 '+KINDS.map(k=>k.k).join('/')); return null; }
  const title = String(o.title||'').trim();
  if(!title){ errors.push(where+'：标题是空的'); return null; }
  let m = null;
  if(Array.isArray(o.m) && o.m.length){ m = o.m; }
  else{
    const pm = parseMatch(kind, o.match);
    if(!pm.ok){ errors.push(where+'：'+pm.err); return null; }
    m = pm.m;
  }
  let scope = o.scope;
  if(typeof scope === 'string') scope = scope.split(/[|、;；]+/).filter(Boolean);
  if(!Array.isArray(scope)) scope = [];
  scope = scope.map(s=>{
    const e = allEvents().find(x=>(x.k||x.name)===s || x.id===s);
    return e? e.id : s;
  });
  const score = +(o.score||0);
  const ban = (o.ban===true || o.ban==='1' || o.ban===1 || o.ban==='是');
  const on = !(o.on===false || o.on==='0' || o.on===0 || o.on==='否');
  return {id:uid('r'), on, kind, m, cat:String(o.cat||o['类别']||'民俗'), title,
    scope, score, ban, note:String(o.note||''), src:String(o.src||o.source||'')};
}

function normImport(text, filename){
  text = String(text).replace(/^\uFEFF/,'').trim();
  const errors = [];
  const out = {rules:[], events:[]};
  const isJson = /\.json$/i.test(filename||'') || text.charAt(0)==='{' || text.charAt(0)==='[';

  if(isJson){
    let o;
    try{ o = JSON.parse(text); }
    catch(e){ errors.push('JSON 格式有问题：'+e.message); return {rules:[], events:[], errors}; }
    let rules = [], events = [];
    if(Array.isArray(o)) rules = o;
    else if(o && typeof o==='object'){ rules = o.rules||[]; events = o.events||[]; }
    else { errors.push('文件内容不是规则数组，也不是带 rules 的对象'); return {rules:[], events:[], errors}; }

    rules.forEach((r,i)=>{
      const built = buildRule(r, '第 '+(i+1)+' 条', errors);
      if(built) out.rules.push(built);
    });
    events.forEach((e,i)=>{
      const nm = String(e.name||e.k||'').trim();
      const words = e.words||[];
      if(!nm || !words.length){ errors.push('第 '+(i+1)+' 个事项缺名字或黄历词'); return; }
      out.events.push({id:uid('c'), name:nm, words:words, note:String(e.note||'')});
    });
    return {rules:out.rules, events:out.events, errors};
  }

  /* CSV */
  const rows = parseCsv(text);
  if(!rows.length){ errors.push('文件是空的'); return {rules:[], events:[], errors}; }
  const head = rows[0].map(h=>{
    const t = String(h).trim().toLowerCase();
    return CSV_HEAD_CN[t] || t;
  });
  const col = name => head.indexOf(name);
  if(col('kind')<0 || col('match')<0){ errors.push('表头里要有 kind 和 match 两列（可以直接下载模板照着填）'); return {rules:[], events:[], errors}; }

  for(let i=1;i<rows.length;i++){
    const r = rows[i];
    if(!r.join('').trim()) continue;
    const obj = {
      kind:r[col('kind')], title:r[col('title')], match:r[col('match')],
      scope:col('scope')>=0? r[col('scope')] : '',
      score:col('score')>=0? r[col('score')] : 0,
      ban:col('ban')>=0? r[col('ban')] : 0,
      note:col('note')>=0? r[col('note')] : '',
      src:col('source')>=0? r[col('source')] : '',
      on:col('on')>=0? r[col('on')] : 1
    };
    const built = buildRule(obj, '第 '+(i+1)+' 行', errors);
    if(built) out.rules.push(built);
  }
  return {rules:out.rules, events:[], errors};
}

let PENDING = null;

function doImportFile(file){
  const rd = new FileReader();
  rd.onload = ()=>{
    const res = normImport(rd.result, file.name);
    PENDING = res;
    const errTxt = res.errors.length
      ? '<div style="margin-top:8px">有 '+res.errors.length+' 行没通过检查：<br>'+res.errors.slice(0,8).map(e=>'· '+esc(e)).join('<br>')
        + (res.errors.length>8? '<br>…还有 '+(res.errors.length-8)+' 条' : '') + '</div>'
      : '';
    const okTxt = '读到 <strong>'+(res.rules.length)+'</strong> 条规则'
      + (res.events.length? '、<strong>'+res.events.length+'</strong> 个事项' : '')
      + '。' + (res.rules.length? '确认后可以追加到现有规则里，不会覆盖你已经录好的。' : '');
    kbMsg(res.rules.length?'ok':'err', okTxt + errTxt
      + (res.rules.length? '<div style="margin-top:10px"><button class="ghost" id="impOk">确认导入</button> <button class="mini" id="impCancel">取消</button></div>' : ''));
    const b1 = document.getElementById('impOk');
    if(b1) b1.addEventListener('click', applyImport);
    const b2 = document.getElementById('impCancel');
    if(b2) b2.addEventListener('click', ()=>{ PENDING=null; kbMsg('',''); });
  };
  rd.readAsText(file, 'utf-8');
}

/* ================= 导入前快照 / 撤销 ================= */
const SNAP_KEY = 'mybazi.kb.snapshot';
function takeSnapshot(){
  try{
    localStorage.setItem(SNAP_KEY, JSON.stringify({v:2, set:KB.set, events:KB.events, rules:KB.rules, t:Date.now()}));
  }catch(e){}
}
function snapshotInfo(){
  try{
    const raw = localStorage.getItem(SNAP_KEY);
    return raw ? JSON.parse(raw) : null;
  }catch(e){ return null; }
}
function syncRollbackBtn(){
  const b = document.getElementById('kbRollback');
  if(!b) return;
  const s = snapshotInfo();
  b.disabled = !s;
  b.textContent = s ? ('撤销上次导入（'+(s.rules||[]).length+' 条）') : '撤销上次导入';
}
function rollbackSnapshot(){
  const s = snapshotInfo();
  if(!s) return;
  if(!confirm('把规则书恢复到上一次导入之前的状态？这次导入新加的规则会消失，手动改的不会被影响。')) return;
  KB.set = s.set || Object.assign({}, DEF_SET);
  KB.events = s.events || [];
  KB.rules = s.rules || [];
  saveKB(); initSelects(); renderKb(); syncRollbackBtn();
  kbMsg('ok', '已恢复到上一次导入之前的规则书。');
}
