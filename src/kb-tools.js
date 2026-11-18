/* @file kb-tools.js — 规则自测、复制结论、导出 CSV、CSV 模板 */


/* ================= 规则自测 ================= */
function runSelfTest(){
  const out = document.getElementById('stOut');
  if(!out) return;
  const ds = document.getElementById('stDate').value;
  const ev = eventById(document.getElementById('stEvent').value);
  const z = document.getElementById('stZodiac').value;
  if(!ds){ out.innerHTML = '<p class="hint">先选一个日期。</p>'; return; }
  if(!ev){ out.innerHTML = '<p class="hint">没有可用事项，先去下面加一个自定义事项。</p>'; return; }
  const p = ds.split('-').map(Number);
  const r = evalDay(solarOf(p[0],p[1],p[2]), ev, z);
  out.innerHTML = '<div class="stResult">'
    + '<div class="top"><span class="big">'+r.score+'</span>'
    + '<span class="hint sm">分'+(r.ban?' · 已被一条规则一票否决':'')+'</span></div>'
    + detailHtml(r, ev) + '</div>';
}

/* ================= 复制结论 ================= */
function pickText(){
  const ev = LAST_EV || {};
  const ok = LAST_ROWS.filter(r=>!r.ban).slice(0,3);
  let t = '「'+(ev.k || ev.name || '择日')+'」择日结果（'+(LAST_SPAN||0)+' 天内）\n';
  ok.forEach((r,i)=>{
    const s = r.solar;
    t += (i+1)+'. '+s.toYmd()+' 星期'+s.getWeekInChinese()
      + ' 农历'+r.lunar.getMonthInChinese()+'月'+r.lunar.getDayInChinese()
      + ' '+r.lunar.getDayInGanZhi()+'日 '+r.zx+'日 '+r.score+'分\n';
    t += '   '+(r.reasons.length ? r.reasons.slice(0,3).join('；') : '无特别宜忌')+'\n';
  });
  const banN = LAST_ROWS.filter(r=>r.ban).length;
  if(banN) t += '另有 '+banN+' 天被你录的规则否决。\n';
  return t;
}
function copyText(txt, btn){
  const done = ()=>{
    if(!btn) return;
    const old = btn.textContent;
    btn.textContent = '已复制';
    setTimeout(()=>{ btn.textContent = old; }, 1400);
  };
  if(navigator.clipboard && navigator.clipboard.writeText){
    navigator.clipboard.writeText(txt).then(done, ()=>fallbackCopy(txt, done));
  }else{
    fallbackCopy(txt, done);
  }
}
function fallbackCopy(txt, done){
  try{
    const ta = document.createElement('textarea');
    ta.value = txt;
    ta.style.position = 'fixed'; ta.style.left = '-9999px';
    document.body.appendChild(ta);
    ta.focus(); ta.select();
    document.execCommand('copy');
    document.body.removeChild(ta);
    done();
  }catch(e){}
}

function applyImport(){
  if(!PENDING) return;
  takeSnapshot();
  const key = r => r.kind+'|'+matchExpr(r)+'|'+r.title;
  const exist = {};
  KB.rules.forEach(r=>{ exist[key(r)] = 1; });
  let added = 0, dup = 0;
  PENDING.rules.forEach(r=>{
    if(exist[key(r)]){ dup++; return; }
    exist[key(r)] = 1;
    KB.rules.push(r);
    added++;
  });
  PENDING.events.forEach(e=>{ KB.events.push(e); });
  const evAdded = PENDING.events.length;
  PENDING = null;
  saveKB(); initSelects(); renderKb(); syncRollbackBtn();
  kbMsg('ok', '导入完成：新增 '+added+' 条规则'+(evAdded? '、'+evAdded+' 个事项':'')+(dup? '，跳过 '+dup+' 条重复的':'')+'. 若要反悔，点「撤销上次导入」。');
}

function rulesToCsv(){
  const q = v => '"'+String(v==null?'':v).replace(/"/g,'""')+'"';
  const lines = [CSV_HEAD.join(',')];
  KB.rules.forEach(r=>{
    lines.push([
      r.kind, q(r.title), q(matchExpr(r)), q((r.scope||[]).join('|')),
      r.ban?0:(r.score||0), r.ban?1:0, q(r.note||''), q(r.src||''), r.on===false?0:1
    ].join(','));
  });
  return lines.join('\r\n');
}

const CSV_TPL = [
  'kind,title,match,scope,score,ban,note,source,on',
  'lun,示例：某书说三月初三不宜嫁娶（请按你的书核对）,3-3,结婚 / 领证,-6,0,书上原文摘一句,某书 p.12,1',
  'zx,示例：破日不签合同,破,签合同 / 谈合作,-8,0,破日主耗损,某书 p.40,1',
  'jq,示例：四立前一日不搬家,立春-1|立夏-1|立秋-1|立冬-1,搬家 / 移居,-5,0,四绝日传统不搬家,某书 p.56,1',
  'gz,示例：甲子日忌动土,甲子,装修 / 动工,-10,0,,某书 p.88,1'
].join('\r\n');

