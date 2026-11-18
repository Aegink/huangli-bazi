/* @file view-chart.js — 八字视图：四柱、大运、流年、档案切换 */

/* ================= 八字 ================= */
function renderChart(){
  const bd = document.getElementById('birthDate').value;
  const bt = document.getElementById('birthTime').value || '12:00';
  const gender = +document.getElementById('gender').value;
  const cityIdx = +document.getElementById('city').value;
  const box = document.getElementById('chartResult');

  if(!bd){ box.innerHTML='<p class="hint">先填出生日期。</p>'; return; }
  const [y,m,d] = bd.split('-').map(Number);
  const [hh,mi] = bt.split(':').map(Number);
  const [cityName,lng] = CITIES[cityIdx]||CITIES[0];

  const ts = toTrueSolar(y,m,d,hh,mi,lng);
  const real = solarOf(ts.y,ts.m,ts.d,ts.h,ts.mi);
  const lunar = real.getLunar();
  const ec = lunar.getEightChar();

  const P = [
    {name:'年柱', gz:ec.getYear(), gan:ec.getYearGan(), zhi:ec.getYearZhi(),
     ssGan:ec.getYearShiShenGan(), ssZhi:ec.getYearShiShenZhi(), hide:ec.getYearHideGan(),
     nayin:ec.getYearNaYin(), dishi:ec.getYearDiShi(), kong:ec.getYearXunKong()},
    {name:'月柱', gz:ec.getMonth(), gan:ec.getMonthGan(), zhi:ec.getMonthZhi(),
     ssGan:ec.getMonthShiShenGan(), ssZhi:ec.getMonthShiShenZhi(), hide:ec.getMonthHideGan(),
     nayin:ec.getMonthNaYin(), dishi:ec.getMonthDiShi(), kong:ec.getMonthXunKong()},
    {name:'日柱', gz:ec.getDay(), gan:ec.getDayGan(), zhi:ec.getDayZhi(),
     ssGan:ec.getDayShiShenGan(), ssZhi:ec.getDayShiShenZhi(), hide:ec.getDayHideGan(),
     nayin:ec.getDayNaYin(), dishi:ec.getDayDiShi(), kong:ec.getDayXunKong()},
    {name:'时柱', gz:ec.getTime(), gan:ec.getTimeGan(), zhi:ec.getTimeZhi(),
     ssGan:ec.getTimeShiShenGan(), ssZhi:ec.getTimeShiShenZhi(), hide:ec.getTimeHideGan(),
     nayin:ec.getTimeNaYin(), dishi:ec.getTimeDiShi(), kong:ec.getTimeXunKong()}
  ];

  const dayGan = ec.getDayGan();
  const dayWx = GAN_WX[dayGan];

  const cnt = {木:0,火:0,土:0,金:0,水:0};
  [P[0].gan,P[0].zhi,P[1].gan,P[1].zhi,P[2].gan,P[2].zhi,P[3].gan,P[3].zhi].forEach(g=>{
    const w = GAN_WX[g]||ZHI_WX[g]; if(w) cnt[w]++;
  });

  const ssCnt = {};
  [P[1].ssGan,P[3].ssGan].forEach(s=>{ if(s&&s!=='日主') ssCnt[s]=(ssCnt[s]||0)+1; });
  [P[0].ssZhi,P[1].ssZhi,P[2].ssZhi,P[3].ssZhi].forEach(arr=>{
    (arr||[]).forEach(s=>{ if(s&&s!=='日主') ssCnt[s]=(ssCnt[s]||0)+1; });
  });

  const yun = ec.getYun(gender);
  const dyAll = yun.getDaYun(10).filter(x=>x.getGanZhi());
  const startY = y+yun.getStartYear();
  const curAge = ageNow(y,m,d);
  const cur = dyAll.find(x=>curAge>=x.getStartAge() && curAge<=x.getEndAge());

  const head = '<div class="hint" style="margin-bottom:12px">'
    + '按真太阳时排盘：'+cityName+'（东经 '+lng.toFixed(2)+'°），'
    + '把 '+pad(hh)+':'+pad(mi)+' 校正为 '+pad(ts.h)+':'+pad(ts.mi)
    + '（'+(ts.offsetMin>=0?'+':'')+ts.offsetMin.toFixed(0)+' 分钟）。'
    + (ts.d!==d||ts.m!==m ? ' <strong>注意：校正后跨日了。</strong>' : '')
    + '</div>';

  const tbl = '<div class="chart"><table>'
    + '<colgroup><col><col><col><col></colgroup>'
    + '<thead><tr>' + P.map(p=>'<th>'+p.name+'</th>').join('') + '</tr></thead><tbody>'
    + '<tr><td colspan="4" style="text-align:left;padding:10px 12px" class="hint">'
      + '公历 '+y+'-'+pad(m)+'-'+pad(d)+' · 农历 '+lunar.getYearInGanZhi()+'年（'+lunar.getYearShengXiao()+'）'
      + lunar.getMonthInChinese()+'月'+lunar.getDayInChinese()+'</td></tr>'
    + '<tr class="gzRow">'+P.map(p=>'<td><div class="glyph">'+p.gz+'</div></td>').join('')+'</tr>'
    + '<tr><td colspan="4" class="rowLabel" style="text-align:left">十神（天干）</td></tr>'
    + '<tr>'+P.map(p=>'<td class="sub">'+(p.ssGan||'—')+'</td>').join('')+'</tr>'
    + '<tr><td colspan="4" class="rowLabel" style="text-align:left">藏干</td></tr>'
    + '<tr>'+P.map(p=>'<td class="sub">'+((p.hide||[]).join(' ')||'—')+'</td>').join('')+'</tr>'
    + '<tr><td colspan="4" class="rowLabel" style="text-align:left">地支十神</td></tr>'
    + '<tr>'+P.map(p=>'<td class="sub">'+((p.ssZhi||[]).join(' ')||'—')+'</td>').join('')+'</tr>'
    + '<tr><td colspan="4" class="rowLabel" style="text-align:left">纳音</td></tr>'
    + '<tr>'+P.map(p=>'<td class="sub">'+p.nayin+'</td>').join('')+'</tr>'
    + '<tr><td colspan="4" class="rowLabel" style="text-align:left">地势</td></tr>'
    + '<tr>'+P.map(p=>'<td class="sub">'+p.dishi+'</td>').join('')+'</tr>'
    + '<tr><td colspan="4" class="rowLabel" style="text-align:left">空亡</td></tr>'
    + '<tr>'+P.map(p=>'<td class="sub">'+p.kong+'</td>').join('')+'</tr>'
    + '</tbody></table></div>';

  const wxBars = WX_ORDER.map(k=>{
    const c = cnt[k];
    return '<div class="wxItem '+WX_CLASS[k]+'">'
      + '<div class="k">'+k+'</div>'
      + '<div class="v">'+c+'</div>'
      + '<div class="bar"><i style="width:'+(c/8*100)+'%"></i></div>'
      + '</div>';
  }).join('');

  const maxCnt = Math.max.apply(null, WX_ORDER.map(k=>cnt[k]));
  const maxList = WX_ORDER.filter(k=>cnt[k]===maxCnt);
  const zeroWx = WX_ORDER.filter(k=>cnt[k]===0);
  const topSs = Object.keys(ssCnt).sort((a,b)=>ssCnt[b]-ssCnt[a]).slice(0,3);

  const reading = '<div class="reading">'
    + '<p class="lead2">① 你的日主是「'+dayGan+dayWx+'」</p>'
    + '<p>日柱的天干（'+dayGan+'）代表"你"这个主体，叫日主。传统上把'+dayGan+'比作「'+GAN_IMAGE[dayGan]+'」——这只是这个符号的意象，不是性格定论。</p>'
    + '<p class="lead2">② 月令在「'+P[1].zhi+'」</p>'
    + '<p>月柱的地支是'+P[1].zhi+'（'+ZHI_WX[P[1].zhi]+'），传统上把它看作你出生那个月最主要的一股"气候"。判断一个盘的强弱，通常从这里入手，而不是先数五行个数。</p>'
    + '<p class="lead2">③ 八个字的五行分布</p>'
    + '<p>木 '+cnt['木']+' · 火 '+cnt['火']+' · 土 '+cnt['土']+' · 金 '+cnt['金']+' · 水 '+cnt['水']+'。'
    + (maxList.length===1
        ? '其中「'+maxList[0]+'」出现最多（'+maxCnt+' 个）。'
        : '其中「'+maxList.join('、')+'」并列最多（各 '+maxCnt+' 个）。')
    + (zeroWx.length? '「'+zeroWx.join('、')+'」一个都没有出现，传统会把这种情况叫"缺'+zeroWx.join('缺')+'"。' : '五个五行都出现了。')
    + ' 注意：这里只数了八个字的本气，没算藏干，也不等于"缺什么就要补什么"——那是一个流传很广但很粗糙的说法。</p>'
    + '<p class="lead2">④ 出现最多的十神</p>'
    + '<p>'+(topSs.length? topSs.map(s=>'「'+s+'」'+ssCnt[s]+' 次（'+SHISHEN_NOTE[s]+'）').join('；') : '十神分布比较平均。')+'</p>'
    + '</div>';

  const yunInfo = '<p class="hint" style="margin:14px 0 10px">'
    + '出生后 '+yun.getStartYear()+' 年 '+yun.getStartMonth()+' 个月起运（约 '+startY+' 年），之后每十年换一步大运。'
    + (cur? ' 你现在 '+curAge+' 岁，走的是「'+cur.getGanZhi()+'」运（'+cur.getStartAge()+'–'+cur.getEndAge()+' 岁）。' : '')
    + '</p>';

  const dyRow = dyAll.map(x=>{
    const isNow = cur && x.getIndex()===cur.getIndex();
    return '<div class="dy'+(isNow?' now':'')+'">'
      + '<div class="age">'+x.getStartAge()+'–'+x.getEndAge()+' 岁</div>'
      + '<div class="gz">'+x.getGanZhi()+'</div>'
      + '<div class="yr">'+x.getStartYear()+'</div>'
      + (isNow?'<div class="mark">当前</div>':'')
      + '</div>';
  }).join('');

  box.innerHTML = head + tbl
    + '<div style="margin-top:18px"><h2 style="font-size:15px;margin-bottom:8px">五行分布（本气）</h2><div class="wx">'+wxBars+'</div></div>'
    + '<div style="margin-top:22px">'+reading+'</div>'
    + '<div style="margin-top:22px"><h2 style="font-size:15px;margin-bottom:6px">大运</h2>'+yunInfo+'<div class="dayun">'+dyRow+'</div></div>'
    + '<div style="margin-top:22px"><h2 style="font-size:15px;margin-bottom:6px">近十年流年</h2>'
    +   '<p class="hint sm" style="margin:0 0 2px">流年干支下面那两个字，是这个年份的干支克到「'+dayGan+'」日主时对应的十神，和四柱表里的算法一样。</p>'
    +   liuNianHtml(dayGan, new Date().getFullYear(), 10)
    + '</div>'
    + '<p class="hint sm" style="margin-top:18px">以上是把命盘里的术语翻成白话，帮你认识这张盘的结构，不构成任何对运势的判断。</p>';

  try{
    localStorage.setItem('mybazi', JSON.stringify({bd,bt,gender,cityIdx}));
  }catch(e){}
}

/* ---- 档案 ---- */
function renderChips(){
  const bar = document.getElementById('profChips');
  if(!bar) return;
  bar.innerHTML = (PROFILES.length
    ? PROFILES.map(p=>'<span class="chip'+(p.id===CUR_PROF?' on':'')+'" data-prof="'+p.id+'">'
        + esc(p.name||'未命名') + '<span class="x" data-del="'+p.id+'">×</span></span>').join('')
    : '<span class="hint sm">还没有存过档案。填好下面的出生信息，点「存为档案」，以后一键切换。</span>');

  bar.querySelectorAll('[data-prof]').forEach(el=>{
    el.addEventListener('click',e=>{
      if(e.target.dataset.del) return;
      loadProfile(el.dataset.prof);
    });
  });
  bar.querySelectorAll('[data-del]').forEach(el=>{
    el.addEventListener('click',e=>{
      e.stopPropagation();
      const id = el.dataset.del;
      PROFILES = PROFILES.filter(p=>p.id!==id);
      if(CUR_PROF===id) CUR_PROF='';
      saveProfiles(); renderChips();
    });
  });
}
function loadProfile(id){
  const p = PROFILES.find(x=>x.id===id);
  if(!p) return;
  CUR_PROF = id;
  document.getElementById('birthDate').value = p.bd;
  document.getElementById('birthTime').value = p.bt;
  document.getElementById('gender').value = p.gender;
  document.getElementById('city').value = p.city;
  renderChips();
  renderChart();
}
function saveCurrentProfile(){
  const nm = document.getElementById('profName').value.trim();
  const bd = document.getElementById('birthDate').value;
  if(!bd){ alert('先填出生日期'); return; }
  if(!nm){ alert('给档案起个名字，比如“我”'); return; }
  const data = {
    bd, bt:document.getElementById('birthTime').value,
    gender:document.getElementById('gender').value,
    city:document.getElementById('city').value
  };
  if(CUR_PROF){
    const p = PROFILES.find(x=>x.id===CUR_PROF);
    if(p){ Object.assign(p, data, {name:nm}); }
  }else{
    PROFILES.push(Object.assign({id:uid('p'), name:nm}, data));
    CUR_PROF = PROFILES[PROFILES.length-1].id;
  }
  saveProfiles();
  document.getElementById('profName').value = '';
  renderChips();
}

