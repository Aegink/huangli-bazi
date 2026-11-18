/* @file boot.js — 启动：加载规则书、绑定事件、首屏渲染 */

/* ================= 启动 ================= */
(function boot(){
  if(typeof Solar === 'undefined'){
    document.body.innerHTML = '<div class="wrap" style="padding:60px 0"><h2>计算库没加载出来</h2>'
      + '<p class="hint">请确认 assets 文件夹里的 lunar.js 和这个 html 放在一起，没有单独移动。</p></div>';
    return;
  }
  loadKB();
  loadProfiles();
  initSelects();
  applyTheme(themeMode());
  if(window.matchMedia){
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    if(mq.addEventListener) mq.addEventListener('change', ()=>{ if(themeMode()==='auto') applyTheme('auto'); });
  }
  document.getElementById('themeBtn').addEventListener('click', cycleTheme);

  try{
    const saved = JSON.parse(localStorage.getItem('mybazi')||'null');
    if(saved && saved.bd){
      document.getElementById('birthDate').value = saved.bd;
      document.getElementById('birthTime').value = saved.bt;
      document.getElementById('gender').value = saved.gender;
      document.getElementById('city').value = saved.cityIdx;
    }
  }catch(e){}

  document.getElementById('runPick').addEventListener('click', renderPick);
  document.getElementById('runChart').addEventListener('click', renderChart);
  document.getElementById('profSave').addEventListener('click', saveCurrentProfile);
  document.getElementById('pickExport').addEventListener('click', pickToCsv);
  document.getElementById('pickCopy').addEventListener('click', e=>{
    if(!LAST_ROWS.length){ e.target.textContent='先择一次日'; setTimeout(()=>{e.target.textContent='复制结论';},1400); return; }
    copyText(pickText(), e.target);
  });
  document.getElementById('stRun').addEventListener('click', runSelfTest);
  document.getElementById('kbRollback').addEventListener('click', rollbackSnapshot);
  document.getElementById('pickPrint').addEventListener('click', ()=>window.print());
  document.getElementById('evNew').addEventListener('click', ()=>openEvEditor(null));

  document.getElementById('kbNew').addEventListener('click', ()=>openRuleEditor(null));
  document.getElementById('kbImport').addEventListener('click', ()=>document.getElementById('kbFile').click());
  document.getElementById('kbFile').addEventListener('change', e=>{
    const f = e.target.files && e.target.files[0];
    if(f) doImportFile(f);
    e.target.value = '';
  });
  document.getElementById('kbExportJson').addEventListener('click', ()=>{
    downloadText('规则书备份-'+new Date().toISOString().slice(0,10)+'.json',
      JSON.stringify({v:2, set:KB.set, events:KB.events, rules:KB.rules}, null, 2), 'application/json');
  });
  document.getElementById('kbExportCsv').addEventListener('click', ()=>{
    downloadText('规则书-'+new Date().toISOString().slice(0,10)+'.csv', '\ufeff'+rulesToCsv(), 'text/csv');
  });
  document.getElementById('kbTpl').addEventListener('click', ()=>{
    downloadText('规则导入模板.csv', '\ufeff'+CSV_TPL, 'text/csv');
  });
  document.getElementById('kbSearch').addEventListener('input', e=>{
    KBUI.q = e.target.value.trim(); KBUI.page = 0; renderKbList();
  });
  document.getElementById('kbFilter').addEventListener('change', e=>{
    KBUI.cat = e.target.value; KBUI.page = 0; renderKbList();
  });
  document.getElementById('kbOnOff').addEventListener('change', e=>{
    KBUI.onoff = e.target.value; KBUI.page = 0; renderKbList();
  });

  renderChips();
  syncRollbackBtn();
  renderToday();
  renderPick();
  renderChart();
})();
