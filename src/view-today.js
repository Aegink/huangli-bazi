/* @file view-today.js — 今天视图：当日黄历全息 + 命中规则 */

/* ================= 今天 ================= */
function todayRuleHits(solar){
  const lunar = solar.getLunar();
  const out = [];
  const seen = {};
  dayRuleKeys(solar, lunar).forEach(k=>{
    const arr = IDX.get(k);
    if(!arr) return;
    arr.forEach(r=>{
      if(seen[r.id]) return;
      seen[r.id]=1;
      out.push(r);
    });
  });
  return out;
}

function renderToday(){
  const box = document.getElementById('todayResult');
  const now = new Date();
  const y = now.getFullYear(), m = now.getMonth()+1, d = now.getDate();
  const solar = solarOf(y,m,d);
  const lunar = solar.getLunar();

  const yi = lunar.getDayYi();
  const ji = lunar.getDayJi();
  const jq = lunar.getJieQi();
  const nextJq = lunar.getNextJieQi();
  const prevJq = lunar.getPrevJieQi();

  const words = arr => arr.length
    ? arr.map(w=>'<span class="word">'+w+'</span>').join('')
    : '<span class="hint sm">无</span>';

  const myRules = todayRuleHits(solar);
  const ruleBlock = myRules.length
    ? '<div class="yiji" style="margin-top:16px"><h4>今天命中你录入的规矩</h4>'
      + myRules.map(r=>'<div style="font-size:12.5px;color:var(--ink-2);padding:3px 0;border-bottom:1px dotted var(--line)">'
          + '<span style="font-family:var(--serif)">'+esc(r.title)+'</span>'
          + (r.ban? ' <span class="pill ban"><span class="n">禁</span></span>' : (r.score? ' <span class="hint sm">'+(r.score>0?'+':'')+r.score+' 分</span>':''))
          + (r.src? '<span class="src" style="color:var(--faint);font-size:11px;margin-left:8px">'+esc(r.src)+'</span>':'')
          + (r.note? '<div class="hint sm">'+esc(r.note)+'</div>':'')
          + '</div>').join('')
      + '</div>'
    : '';

  box.innerHTML = ''
    + '<div class="todayHead">'
    +   '<div>'
    +     '<div class="num">'+pad(d)+'</div>'
    +     '<div class="meta">'+y+' 年 '+pad(m)+' 月 · 星期'+solar.getWeekInChinese()+'<br>'
    +       '农历 '+lunar.getYearInGanZhi()+'年（'+lunar.getYearShengXiao()+'） '+lunar.getMonthInChinese()+'月'+lunar.getDayInChinese()
    +     '</div>'
    +   '</div>'
    +   '<div class="right">'
    +     '<div class="k">今日干支</div><div class="v">'+lunar.getDayInGanZhi()+'日 · '+lunar.getZhiXing()+'日 · 值神'+lunar.getDayTianShen()+'（'+lunar.getDayTianShenLuck()+'）</div>'
    +     '<div class="k" style="margin-top:12px">节气</div><div class="v">'
    +       (jq? '今天 '+jq : '上一节气 '+prevJq.getName()+'（'+prevJq.getSolar().getMonth()+'/'+prevJq.getSolar().getDay()+'） · 下一节气 '+nextJq.getName()+'（'+nextJq.getSolar().getMonth()+'/'+nextJq.getSolar().getDay()+'）')
    +     '</div>'
    +   '</div>'
    + '</div>'
    + '<div class="todayBody">'
    +   '<div class="yiji"><h4 class="y">宜</h4><div class="words">'+words(yi)+'</div></div>'
    +   '<div class="yiji"><h4 class="j">忌</h4><div class="words">'+words(ji)+'</div></div>'
    +   '<div class="yiji"><h4>冲煞</h4><p class="hint" style="margin:0">冲'+lunar.getDayChongShengXiao()+'（'+lunar.getDayChongGan()+lunar.getDayChong()+'） · 煞'+lunar.getDaySha()
    +     '<br>如果今天"冲"的正好是你的生肖，传统上会建议这天少办大事。</p></div>'
    +   '<div class="yiji"><h4>吉神 / 凶煞</h4><p class="hint" style="margin:0">吉神：'+(lunar.getDayJiShen().join(' ')||'—')
    +     '<br>凶煞：'+(lunar.getDayXiongSha().join(' ')||'—')
    +     '<br>值宿：'+lunar.getXiu()+'（'+lunar.getXiuLuck()+'）</p></div>'
    + '</div>'
    + ruleBlock
    + '<div class="yiji" style="margin-top:16px"><h4>十二时辰</h4>'
    +   '<p class="hint sm" style="margin:0 0 8px">青色为吉时，赭色为凶时。一天里"好日"也要挑个好时辰。</p>'
    +   '<div class="hourChips">'+hourChips(lunar)+'</div>'
    +   posRow(lunar)
    + '</div>'
    + '<div class="yiji" style="margin-top:16px"><h4>彭祖百忌</h4><p class="hint" style="margin:0">'
    +   lunar.getPengZuGan()+'<br>'+lunar.getPengZuZhi()+'</p></div>'
    + '<div class="lex">'
    +   '<h3>今天这几个词是什么意思</h3>'
    +   '<dl>'
    +     '<dt>干支</dt><dd>用"天干+地支"给每一天编号，六十年一个循环。</dd>'
    +     '<dt>建除十二值</dt><dd>把日子分成建、除、满、平、定、执、破、危、成、收、开、闭十二类，传统上"破"日最忌办事。</dd>'
    +     '<dt>值神</dt><dd>当天轮值的"天神"，分黄道吉神与黑道凶神两类，是黄历吉凶判断里最常用的一层。</dd>'
    +     '<dt>冲煞</dt><dd>"冲"指当天与某个生肖相冲，"煞"指不利的方位。</dd>'
    +     '<dt>二十八宿</dt><dd>把天空划成二十八个区域，每天轮到一宿值班，通书据此分吉凶。</dd>'
    +     '<dt>彭祖百忌</dt><dd>按当天干支传下来的一句口诀，提醒这天不宜做什么，属传统提示。</dd>'
    +   '</dl>'
    + '</div>';
}

