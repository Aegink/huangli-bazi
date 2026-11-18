/* @file view-pick.js — 择日视图：批量排分、依据展开、导出 CSV */

/* ================= 择日 ================= */
let LAST_ROWS = [];
let LAST_EV = null;
let LAST_SPAN = 0;

function renderPick(){
  const evId = document.getElementById('event').value;
  const ev = eventById(evId);
  const startStr = document.getElementById('fromDate').value;
  const span = +document.getElementById('span').value || 30;
  const zodiac = document.getElementById('zodiac').value;
  const box = document.getElementById('pickResult');

  if(!ev){ box.innerHTML = '<p class="hint">事项下拉是空的，去「规则书」里检查一下。</p>'; return; }
  if(!startStr){ box.innerHTML = '<p class="hint">先选一个开始日期。</p>'; return; }
  showEvNote();
  const [y,m,d] = startStr.split('-').map(Number);

  const rows = [];
  for(let off=0; off<span; off++){
    rows.push(evalDay(solarOf(y,m,d).next(off), ev, zodiac));
  }
  rows.sort((a,b)=>((a.ban?1:0)-(b.ban?1:0)) || (b.score-a.score));

  LAST_ROWS = rows; LAST_EV = ev; LAST_SPAN = span;

  const usable = rows.filter(r=>!r.ban);
  const top = usable.slice(0,3);
  const rest = rows.slice(0, 33);
  const banCount = rows.length - usable.length;

  const card = (r,idx)=>{
    const s = r.solar;
    return '<div class="bestCard'+(r.ban?' ban':'')+'">'
      + '<div class="rank">NO.'+(idx+1)+'</div>'
      + '<div class="date">'+pad(s.getMonth())+'/'+pad(s.getDay())+'</div>'
      + '<div class="week">'+s.getYear()+'年 星期'+s.getWeekInChinese()+'</div>'
      + '<div class="lunarDay">'+r.lunar.getMonthInChinese()+'月'+r.lunar.getDayInChinese()+'</div>'
      + '<div class="gz">'+r.lunar.getDayInGanZhi()+'日 · '+r.zx+'日</div>'
      + '<div class="score"><b>'+r.score+'</b><span>分</span></div>'
      + '<div class="why">'+(r.reasons.length ? esc(r.reasons.slice(0,4).join('；')) : '当天没有特别的宜忌，主要看建除与值神')+'</div>'
      + '<button class="mini" data-top="'+idx+'" style="margin-top:9px">看依据</button>'
      + '</div>';
  };

  const rowHtml = r=>{
    const s = r.solar;
    const cls = r.ban ? 'ban' : (r.score>=75?'good':(r.score>=60?'mid':'bad'));
    return '<div class="dayWrap">'
      + '<div class="listDay">'
      +   '<div class="d">'+pad(s.getMonth())+'/'+pad(s.getDay())+'<small>'+s.getYear()+' 星期'+s.getWeekInChinese()+'</small></div>'
      +   '<div class="mid"><em>'+r.lunar.getDayInGanZhi()+' · '+r.zx+'日'+(r.chongZ===zodiac?' · 冲你生肖':'')+'</em>宜 '+ (r.yi.slice(0,5).join(' ')||'—') +'</div>'
      +   '<div class="tagz"><span class="pill '+cls+'">'+(r.ban?'<span class="n">禁</span>':'<span class="n">'+r.score+'</span>')+'</span></div>'
      +   '<div class="tagz"><button class="mini no-print" data-row="1">依据</button></div>'
      + '</div>'
      + '<div class="evi" style="display:none">'+detailHtml(r)+'</div>'
      + '</div>';
  };

  box.innerHTML = '<div class="hint" style="margin-bottom:14px">'
    + '「'+esc(ev.k || ev.name)+'」从 '+startStr+' 起 '+span+' 天，按分数排。'
    + (banCount? '其中 <strong>'+banCount+'</strong> 天被你录入的规则一票否决，排在最后。' : '')
    + '</div>'
    + (top.length
        ? '<div class="best">'+top.map(card).join('')+'</div><div id="topDetail"></div>'
        : '<p class="hint">这段时间里没有可用日子，可能规则筛得太紧了。</p>')
    + '<h2 style="margin-top:6px;font-size:16px">逐日排序</h2>'
    + '<p class="hint sm" style="margin-bottom:10px">分数只代表"这一天适不适合办这件事"，不代表吉凶。点「依据」能看到每一分的来处。</p>'
    + rest.map(rowHtml).join('')
    + (rows.filter(r=>r.ban).length
        ? '<h2 style="margin-top:26px;font-size:16px">被你录入的规则否掉的日子</h2>'
          + '<p class="hint sm" style="margin-bottom:10px">这些天触发了你设的「一票否决」，所以不进推荐。如果判断不对，去「规则书」把那条规则停用或删掉。</p>'
          + rows.filter(r=>r.ban).map(rowHtml).join('')
        : '');

  bindPick();

  document.getElementById('pickTools').style.display = '';
  document.getElementById('pickSummary').textContent = '共 ' + rows.length + ' 天，可用 ' + usable.length + ' 天';
}

function detailHtml(r, ev){
  ev = ev || LAST_EV;
  const lines = r.hits.length
    ? r.hits.map(h=>'<div class="ln"><span>'+h.t+(h.src?'<span class="src">'+h.src+'</span>':'')+'</span>'
        + '<span class="d '+(h.ok?'pos':'neg')+'">'+h.d+'</span></div>').join('')
    : '<div class="ln"><span>当天没有命中任何加减分条目</span><span class="d">0</span></div>';

  let l = r.lunar;
  return '<div class="hd">这一天的每一条分数</div>' + lines
    + '<div class="cols">'
    +   '<div class="box">黄历宜：'+(r.yi.join(' ')||'—')+'<br>黄历忌：'+(r.ji.join(' ')||'—')+'</div>'
    +   '<div class="box">建除：'+r.zx+'日（'+ZHIXING_MEAN[r.zx]+'）<br>值神：'+r.tsName+'（'+r.tsLuck+'） · 值宿：'+r.xiu+'（'+r.xiuLuck+'）<br>冲'+r.chongZ+' · 煞'+l.getDaySha()+'<br>彭祖百忌：'+l.getPengZuGan()+'；'+l.getPengZuZhi()+'</div>'
    + '</div>'
    + '<div class="hd" style="margin-top:12px">这一天的十二个时辰</div>'
    + '<p class="hint sm" style="margin-bottom:6px">'
    +   (ev ? '红线标出的是当天宜办「'+esc(ev.k||ev.name)+'」的时辰。' : '青龙、明堂、金匮、天德、玉堂、司命为吉时，其余为凶时。')
    + '</p>'
    + hourTable(r.solar, ev)
    + '<div class="hd" style="margin-top:12px">方位</div>'
    + '<p class="hint sm" style="margin:0 0 4px">传统上办事、出行朝这些方位比较讲得通；胎神所在当日不宜动土。</p>'
    + posRow(l);
}

function bindPick(){
  document.querySelectorAll('#pickResult [data-row]').forEach(btn=>{
    btn.addEventListener('click',()=>{
      const box = btn.closest('.dayWrap').querySelector('.evi');
      box.style.display = (box.style.display==='none') ? 'block' : 'none';
    });
  });
  document.querySelectorAll('#pickResult [data-top]').forEach(btn=>{
    btn.addEventListener('click',()=>{
      const i = +btn.dataset.top;
      const usable = LAST_ROWS.filter(r=>!r.ban);
      const r = usable[i];
      const target = document.getElementById('topDetail');
      if(!r) return;
      if(btn.classList.contains('on')){
        btn.classList.remove('on'); target.innerHTML = ''; return;
      }
      document.querySelectorAll('#pickResult [data-top]').forEach(b=>b.classList.remove('on'));
      btn.classList.add('on');
      target.innerHTML = '<div class="evi" style="margin-bottom:22px">'+detailHtml(r)
        + '<div class="hd" style="margin-top:10px">'+r.solar.toYmd()+'</div></div>';
    });
  });
}

function pickToCsv(){
  if(!LAST_ROWS.length) return;
  const ev = LAST_EV || {};
  const head = ['日期','星期','农历','日干支','建除','值神','值宿','冲','分数','状态','主要依据'];
  const lines = [head.join(',')];
  LAST_ROWS.forEach(r=>{
    const s = r.solar, l = r.lunar;
    const row = [
      s.toYmd(),
      '星期'+s.getWeekInChinese(),
      l.getMonthInChinese()+'月'+l.getDayInChinese(),
      l.getDayInGanZhi(),
      r.zx,
      r.tsName+'('+r.tsLuck+')',
      r.xiu+'('+r.xiuLuck+')',
      '冲'+r.chongZ,
      r.score,
      r.ban?'规则否决':(r.score>=75?'宜':'谨慎'),
      (r.reasons.join('；')||'').replace(/,/g,'，')
    ];
    lines.push(row.join(','));
  });
  downloadText('择日-'+(ev.k||ev.name||'结果')+'-'+new Date().toISOString().slice(0,10)+'.csv',
    '\ufeff'+lines.join('\r\n'), 'text/csv');
}

