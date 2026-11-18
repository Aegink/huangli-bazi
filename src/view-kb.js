/* @file view-kb.js — 规则书视图：列表、筛选、规则编辑器、事项编辑器 */

/* ================= 规则书 ================= */
function kbMsg(type, html){
  const box = document.getElementById('kbImportBox');
  if(!box) return;
  box.innerHTML = html ? '<div class="impMsg '+(type||'')+'">'+html+'</div>' : '';
}

function renderKb(){
  renderStats();
  renderBuiltin();
  renderEventsList();
  renderWeights();
  renderKbList();
  renderChips();
}

function renderStats(){
  const total = KB.rules.length;
  const on = KB.rules.filter(r=>r.on!==false).length;
  let size = 0;
  try{ size = JSON.stringify({v:2,set:KB.set,events:KB.events,rules:KB.rules}).length; }catch(e){}
  document.getElementById('kbStats').innerHTML =
      '<div class="stat"><div class="k">自定义规则</div><div class="v">'+total+' <small>条</small></div></div>'
    + '<div class="stat"><div class="k">已启用</div><div class="v">'+on+' <small>条</small></div></div>'
    + '<div class="stat"><div class="k">自定义事项</div><div class="v">'+(KB.events||[]).length+' <small>项</small></div></div>'
    + '<div class="stat"><div class="k">占用</div><div class="v">'+(size/1024).toFixed(1)+' <small>KB</small></div></div>';
}

function renderBuiltin(){
  document.getElementById('kbBuiltin').innerHTML = '<div class="tscroll"><table class="kbTable" style="margin-top:6px">'
    + '<colgroup><col style="width:20%"><col style="width:56%"><col style="width:24%"></colgroup>'
    + '<thead><tr><th>项目</th><th>怎么参与判断</th><th>出处</th></tr></thead><tbody>'
    + BUILTIN_DOC.map(b=>'<tr><td class="t">'+b.t+'</td><td>'+b.d+'</td><td class="src">'+b.src+'</td></tr>').join('')
    + '</tbody></table></div>';
}

function renderEventsList(){
  const box = document.getElementById('evList');
  if(!(KB.events||[]).length){
    box.innerHTML = '<p class="hint sm">还没有自定义事项。常见的地方习俗有：上梁、谢土、开光、过礼、开市前试营业、入宅安神等。</p>';
    return;
  }
  box.innerHTML = '<div class="tscroll"><table class="kbTable">'
    + '<colgroup><col style="width:26%"><col style="width:30%"><col style="width:32%"><col style="width:12%"></colgroup>'
    + '<thead><tr><th>事项</th><th>黄历词</th><th>说明</th><th style="text-align:right">操作</th></tr></thead><tbody>'
    + KB.events.map(e=>'<tr>'
        + '<td class="t">'+esc(e.name)+'</td>'
        + '<td class="cond">'+esc((e.words||[]).join('、')||'—')+'</td>'
        + '<td class="src">'+esc(e.note||'')+'</td>'
        + '<td class="ops"><button class="mini" data-ev-edit="'+e.id+'">改</button> <button class="mini warn" data-ev-del="'+e.id+'">删</button></td>'
      + '</tr>').join('')
    + '</tbody></table></div>';

  box.querySelectorAll('[data-ev-edit]').forEach(b=>b.addEventListener('click',()=>openEvEditor(b.dataset.evEdit)));
  box.querySelectorAll('[data-ev-del]').forEach(b=>b.addEventListener('click',()=>{
    KB.events = KB.events.filter(x=>x.id!==b.dataset.evDel);
    saveKB(); initSelects(); renderEventsList(); renderStats();
  }));
}

function renderWeights(){
  const S = KB.set;
  document.getElementById('wPanel').innerHTML = '<div class="panel"><div class="grid four">'
    + '<div><label>基础分（每天都有的底分）</label><input type="number" id="wBase" value="'+S.base+'" min="0" max="80"></div>'
    + '<div><label>命中「宜」每项加</label><input type="number" id="wYi" value="'+S.yi+'" min="0" max="30"></div>'
    + '<div><label>命中「忌」每项减</label><input type="number" id="wJi" value="'+S.ji+'" min="0" max="40"></div>'
    + '<div><label>冲你生肖减</label><input type="number" id="wChong" value="'+S.chong+'" min="0" max="40"></div>'
    + '<div><label>建除十二值</label><select id="wZx"><option value="1"'+(S.useZx?' selected':'')+'>参与打分</option><option value="0"'+(!S.useZx?' selected':'')+'>不参与</option></select></div>'
    + '<div><label>值日神</label><select id="wTs"><option value="1"'+(S.useTs?' selected':'')+'>参与打分</option><option value="0"'+(!S.useTs?' selected':'')+'>不参与</option></select></div>'
    + '<div><label>二十八宿</label><select id="wXiu"><option value="1"'+(S.useXiu?' selected':'')+'>参与打分</option><option value="0"'+(!S.useXiu?' selected':'')+'>不参与</option></select></div>'
    + '</div><div class="acts"><button class="ghost" id="wSave">保存权重</button><button class="mini" id="wReset">恢复默认</button><span class="sp"></span><span class="hint sm" id="wMsg"></span></div></div>';

  document.getElementById('wSave').addEventListener('click',()=>{
    KB.set = {
      base: +document.getElementById('wBase').value || 0,
      yi: +document.getElementById('wYi').value || 0,
      ji: +document.getElementById('wJi').value || 0,
      chong: +document.getElementById('wChong').value || 0,
      useZx: document.getElementById('wZx').value==='1',
      useTs: document.getElementById('wTs').value==='1',
      useXiu: document.getElementById('wXiu').value==='1'
    };
    saveKB();
    document.getElementById('wMsg').textContent = '已保存，下次择日生效';
    renderPick();
  });
  document.getElementById('wReset').addEventListener('click',()=>{
    KB.set = Object.assign({}, DEF_SET);
    saveKB(); renderWeights(); renderPick();
  });
}

function kbFiltered(){
  const q = KBUI.q.toLowerCase();
  let list = KB.rules.slice();
  if(KBUI.cat) list = list.filter(r=>(r.cat||'')===KBUI.cat);
  if(KBUI.onoff!=='') list = list.filter(r=>(r.on===false?'0':'1')===KBUI.onoff);
  if(q){
    list = list.filter(r=>{
      const scopeTxt = (r.scope||[]).map(id=>{
        const e = eventById(id); return e? (e.k||e.name) : id;
      }).join(' ');
      return ((r.title||'')+' '+(r.src||'')+' '+(r.note||'')+' '+(r.cat||'')+' '+matchText(r)+' '+scopeTxt).toLowerCase().indexOf(q)>=0;
    });
  }
  return list;
}

function renderKbList(){
  const list = kbFiltered();
  const pages = Math.max(1, Math.ceil(list.length/PAGE_SIZE));
  if(KBUI.page >= pages) KBUI.page = pages-1;
  const page = list.slice(KBUI.page*PAGE_SIZE, (KBUI.page+1)*PAGE_SIZE);

  document.getElementById('kbCount').textContent = list.length ? ('筛出 '+list.length+' 条') : '没有符合条件的规则';

  if(!KB.rules.length){
    document.getElementById('kbList').innerHTML = '<p class="hint">还没有自定义规则。你的书里那些"某月某日不宜某某"的条目，点「新增规则」或「导入文件」就能加进来。</p>';
    document.getElementById('kbPager').innerHTML = '';
    return;
  }

  const grp = {};
  KB.rules.forEach(r=>{
    const k = r.kind + '|' + matchExpr(r);
    grp[k] = (grp[k]||0) + 1;
  });

  const rows = page.map(r=>{
    const scopeTxt = (!r.scope||!r.scope.length) ? '<span class="hint sm">全部事项</span>'
      : r.scope.map(id=>{ const e=eventById(id); return esc(e? (e.k||e.name) : id); }).join('、');
    const scoreTxt = r.ban ? '<span class="pill ban"><span class="n">否决</span></span>'
      : ((+r.score>0?'+':'')+(r.score||0));
    const dupN = grp[r.kind+'|'+matchExpr(r)] || 0;
    const dup = dupN>1 ? '<span class="dupmark">同条件 '+dupN+' 条</span>' : '';
    return '<tr class="'+(r.on===false?'off':'')+'">'
      + '<td class="t">'+esc(r.title)+dup+(r.cat?'<div class="src">'+esc(r.cat)+'</div>':'')+'</td>'
      + '<td class="cond">'+matchText(r)+'</td>'
      + '<td>'+scopeTxt+'</td>'
      + '<td>'+scoreTxt+'</td>'
      + '<td class="src">'+esc(r.src||'')+(r.note?'<div style="color:var(--muted)">'+esc(r.note)+'</div>':'')+'</td>'
      + '<td><button class="mini'+(r.on===false?'':' on')+'" data-toggle="'+r.id+'">'+(r.on===false?'停':'开')+'</button></td>'
      + '<td class="ops"><button class="mini" data-edit="'+r.id+'">改</button> <button class="mini warn" data-del="'+r.id+'">删</button></td>'
      + '</tr>';
  }).join('');

  document.getElementById('kbList').innerHTML = '<div class="tscroll"><table class="kbTable">'
    + '<colgroup><col style="width:21%"><col style="width:19%"><col style="width:15%"><col style="width:8%"><col style="width:19%"><col style="width:6%"><col style="width:12%"></colgroup>'
    + '<thead><tr><th>标题</th><th>条件</th><th>适用</th><th>加减</th><th>出处 / 说明</th><th>启用</th><th style="text-align:right">操作</th></tr></thead>'
    + '<tbody>'+rows+'</tbody></table></div>';

  const box = document.getElementById('kbList');
  box.querySelectorAll('[data-toggle]').forEach(b=>b.addEventListener('click',()=>{
    const r = KB.rules.find(x=>x.id===b.dataset.toggle);
    if(!r) return;
    r.on = (r.on===false);
    saveKB(); renderKbList(); renderStats();
  }));
  box.querySelectorAll('[data-edit]').forEach(b=>b.addEventListener('click',()=>{
    const r = KB.rules.find(x=>x.id===b.dataset.edit);
    if(r) openRuleEditor(r);
  }));
  box.querySelectorAll('[data-del]').forEach(b=>b.addEventListener('click',()=>{
    if(!confirm('确定删掉这条规则？删了就没了，建议先导出备份。')) return;
    KB.rules = KB.rules.filter(x=>x.id!==b.dataset.del);
    saveKB(); renderKbList(); renderStats();
  }));

  document.getElementById('kbPager').innerHTML = pages>1
    ? '<span class="pg">第 '+(KBUI.page+1)+' / '+pages+' 页</span>'
      + '<button class="mini" id="pgPrev"'+(KBUI.page===0?' disabled':'')+'>上一页</button>'
      + '<button class="mini" id="pgNext"'+(KBUI.page>=pages-1?' disabled':'')+'>下一页</button>'
    : '';
  const pv = document.getElementById('pgPrev'), nx = document.getElementById('pgNext');
  if(pv) pv.addEventListener('click',()=>{ KBUI.page--; renderKbList(); });
  if(nx) nx.addEventListener('click',()=>{ KBUI.page++; renderKbList(); });
}

/* --- 规则编辑 --- */
let EDIT_ID = null;

function openRuleEditor(rule){
  const r = rule || {id:null, title:'', cat:'民俗', kind:'lun', m:[], scope:[], score:0, ban:false, note:'', src:'', on:true};
  EDIT_ID = r.id;
  const evOpts = allEvents().map(e=>{
    const nm = e.k || e.name;
    const sel = (r.scope||[]).indexOf(e.id)>=0 ? ' selected' : '';
    return '<option value="'+e.id+'"'+sel+'>'+esc(nm)+'</option>';
  }).join('');

  document.getElementById('kbEditor').innerHTML = '<div class="panel">'
    + '<h3 style="margin-bottom:12px">'+(r.id?'修改规则':'新增规则')+'</h3>'
    + '<div class="grid">'
    +   '<div><label>标题（这一条讲什么）</label><input id="fTitle" value="'+esc(r.title)+'" placeholder="例：三娘煞日不宜嫁娶"></div>'
    +   '<div><label>类别</label><select id="fCat">'
    +     ['民俗','禁忌','宜日','门派对法','其他'].map(c=>'<option value="'+c+'"'+(r.cat===c?' selected':'')+'>'+c+'</option>').join('')
    +   '</select></div>'
    +   '<div><label>规则类型</label><select id="fKind">'
    +     KINDS.map(k=>'<option value="'+k.k+'"'+(r.kind===k.k?' selected':'')+'>'+k.label+'</option>').join('')
    +   '</select></div>'
    +   '<div class="full"><label>条件（多个用 | 隔开）</label><input id="fMatch" value="'+esc(matchExpr(r))+'">'
    +     '<div class="hint sm" id="fHint" style="margin-top:4px"></div></div>'
    +   '<div class="full"><label>适用事项（不选＝所有事项都用这条）</label>'
    +     '<select id="fScope" multiple size="5" style="height:auto">'+evOpts+'</select></div>'
    +   '<div><label>加减分（正数加分，负数减分）</label><input type="number" id="fScore" value="'+(r.score||0)+'" max="60" min="-60"></div>'
    +   '<div><label>一票否决</label><select id="fBan"><option value="0"'+(!r.ban?' selected':'')+'>否（按分数加减）</option><option value="1"'+(r.ban?' selected':'')+'>是（这天直接从推荐里剔掉）</option></select></div>'
    +   '<div><label>启用</label><select id="fOn"><option value="1"'+(r.on!==false?' selected':'')+'>启用</option><option value="0"'+(r.on===false?' selected':'')+'>停用</option></select></div>'
    +   '<div class="full"><label>出处（书名 / 页码 / 谁说的）</label><input id="fSrc" value="'+esc(r.src||'')+'" placeholder="例：《玉匣记》p.32 / 奶奶口传 / 本地通书"></div>'
    +   '<div class="full"><label>说明（给自己看的备注）</label><textarea id="fNote" placeholder="这条规矩怎么用、有什么例外">'+esc(r.note||'')+'</textarea></div>'
    + '</div>'
    + '<div class="acts"><button class="ghost" id="fSave">保存</button><button class="mini" id="fCancel">取消</button>'
    +   '<span class="sp"></span><span class="hint sm" id="fErr" style="color:var(--red)"></span></div>'
    + '</div>';

  const kindSel = document.getElementById('fKind');
  const hint = document.getElementById('fHint');
  const setHint = ()=>{ hint.textContent = '写法：' + (KIND_MAP[kindSel.value]||{}).hint; };
  setHint();
  kindSel.addEventListener('change', setHint);

  document.getElementById('fSave').addEventListener('click', saveRule);
  document.getElementById('fCancel').addEventListener('click', ()=>{ EDIT_ID=null; document.getElementById('kbEditor').innerHTML=''; });
  document.getElementById('kbEditor').scrollIntoView({behavior:'smooth',block:'center'});
}

function matchExpr(r){
  return (r.m||[]).map(m=>{
    if(r.kind==='lun'||r.kind==='sol') return m.m+'-'+m.d;
    if(r.kind==='gz') return m.gz || m.gan || m.zhi;
    if(r.kind==='jq') return m.v + (m.off? ('-'+m.off) : '');
    if(r.kind==='wk') return String(m.v);
    return m.v;
  }).join('|');
}

function saveRule(){
  const err = document.getElementById('fErr');
  const title = document.getElementById('fTitle').value.trim();
  const kind = document.getElementById('fKind').value;
  const raw = document.getElementById('fMatch').value.trim();
  const score = +document.getElementById('fScore').value || 0;
  const ban = document.getElementById('fBan').value==='1';
  const cat = document.getElementById('fCat').value;
  const note = document.getElementById('fNote').value.trim();
  const src = document.getElementById('fSrc').value.trim();
  const on = document.getElementById('fOn').value==='1';
  const scope = Array.from(document.getElementById('fScope').selectedOptions).map(o=>o.value);

  if(!title){ err.textContent = '标题不能空'; return; }
  const pm = parseMatch(kind, raw);
  if(!pm.ok){ err.textContent = pm.err; return; }
  if(!ban && score===0 && !note){
    err.textContent = '加减分为 0 又没有说明，这条规则不会产生任何作用';
    return;
  }

  const rule = {id:EDIT_ID||uid('r'), on, kind, m:pm.m, cat, title, scope, score, ban, note, src};
  if(EDIT_ID){
    const i = KB.rules.findIndex(x=>x.id===EDIT_ID);
    if(i>=0) KB.rules[i] = rule; else KB.rules.push(rule);
  }else{
    KB.rules.push(rule);
  }
  EDIT_ID = null;
  saveKB();
  document.getElementById('kbEditor').innerHTML = '';
  renderKbList(); renderStats();
  kbMsg('ok', '规则已保存：'+esc(title)+'。去「择日」选对应事项，就能看到它生效。');
}

/* --- 事项编辑 --- */
let EV_ID = null;
function openEvEditor(id){
  const e = (KB.events||[]).find(x=>x.id===id) || {id:null, name:'', words:[], note:''};
  EV_ID = e.id;
  document.getElementById('evEditor').innerHTML = '<div class="panel">'
    + '<h3 style="margin-bottom:12px">'+(e.id?'修改事项':'新增事项')+'</h3>'
    + '<div class="grid">'
    +   '<div><label>事项名（你自己看得懂的说法）</label><input id="evName" value="'+esc(e.name||'')+'" placeholder="例：上梁 / 谢土 / 开光"></div>'
    +   '<div><label>黄历里对应的词（多个用、隔开）</label><input id="evWords" value="'+esc((e.words||[]).join('、'))+'" placeholder="例：修造、动土"></div>'
    +   '<div><label>说明</label><input id="evNote" value="'+esc(e.note||'')+'"></div>'
    + '</div>'
    + '<div class="acts"><button class="ghost" id="evSave">保存</button><button class="mini" id="evCancel">取消</button>'
    +   '<span class="sp"></span><span class="hint sm" id="evErr" style="color:var(--red)"></span></div></div>';

  document.getElementById('evSave').addEventListener('click',()=>{
    const name = document.getElementById('evName').value.trim();
    const words = document.getElementById('evWords').value.split(/[、,，\s]+/).filter(Boolean);
    const note = document.getElementById('evNote').value.trim();
    const err = document.getElementById('evErr');
    if(!name){ err.textContent='事项名不能空'; return; }
    if(!words.length){ err.textContent='至少填一个黄历词，否则没法匹配'; return; }
    if(EV_ID){
      const e2 = KB.events.find(x=>x.id===EV_ID);
      if(e2){ e2.name=name; e2.words=words; e2.note=note; }
    }else{
      KB.events.push({id:uid('c'), name, words, note});
    }
    EV_ID = null;
    saveKB(); initSelects(); renderEventsList(); renderStats();
    document.getElementById('evEditor').innerHTML='';
  });
  document.getElementById('evCancel').addEventListener('click',()=>{
    EV_ID=null; document.getElementById('evEditor').innerHTML='';
  });
}

