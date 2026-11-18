/* @file lib-bazi.js — 八字与黄历部件：十神换算、流年、时辰吉凶表、方位 */

/* ================= 十神换算（日主 vs 流年干） ================= */
const GAN_LIST = '甲乙丙丁戊己庚辛壬癸';
const ZHI_LIST = '子丑寅卯辰巳午未申酉戌亥';
const GAN_YIN = {乙:1,丁:1,己:1,辛:1,癸:1};
const WX_SHENG = {木:'火',火:'土',土:'金',金:'水',水:'木'};
const WX_KE = {木:'土',土:'水',水:'火',火:'金',金:'木'};
const SS_PAIRS = {same:['比肩','劫财'], out:['食神','伤官'], wealth:['偏财','正财'], kill:['七杀','正官'], into:['偏印','正印']};

function shiShenOf(dayGan, gan){
  const dw = GAN_WX[dayGan], tw = GAN_WX[gan];
  const sameP = (!!GAN_YIN[dayGan]) === (!!GAN_YIN[gan]);
  let rel = 'into';
  if(dw===tw) rel = 'same';
  else if(WX_SHENG[dw]===tw) rel = 'out';
  else if(WX_KE[dw]===tw) rel = 'wealth';
  else if(WX_KE[tw]===dw) rel = 'kill';
  const p = SS_PAIRS[rel];
  return sameP ? p[0] : p[1];
}
function yearGanZhi(y){
  const i = ((y-1984)%60+60)%60;
  return GAN_LIST.charAt(i%10) + ZHI_LIST.charAt(i%12);
}
function liuNianHtml(dayGan, startY, n){
  const nowY = new Date().getFullYear();
  let h = '';
  for(let y=startY; y<startY+n; y++){
    const gz = yearGanZhi(y);
    h += '<div class="lnyItem'+(y===nowY?' now':'')+'">'
      + '<div class="y">'+y+'</div>'
      + '<div class="gz">'+gz+'</div>'
      + '<div class="ss">'+shiShenOf(dayGan, gz.charAt(0))+'</div>'
      + '</div>';
  }
  return '<div class="lny">'+h+'</div>';
}

/* ================= 时辰与方位 ================= */
function hourTable(solar, ev){
  const times = solar.getLunar().getTimes().slice(0,12);
  const rows = times.map(t=>{
    const yi = t.getYi()||[], ji = t.getJi()||[];
    const luck = t.getTianShenLuck();
    const hitYi = ev ? ev.words.filter(w=>yi.indexOf(w)>=0) : [];
    const hitJi = ev ? ev.words.filter(w=>ji.indexOf(w)>=0) : [];
    let fit = '—';
    if(ev){
      if(hitYi.length) fit = '<span class="tag g">宜'+hitYi.join('、')+'</span>';
      else if(hitJi.length) fit = '<span class="tag b">忌'+hitJi.join('、')+'</span>';
    }else{
      fit = yi.slice(0,3).join(' ') || '—';
    }
    return '<tr class="'+(luck==='吉'?'g':'b')+(hitYi.length?' fit':'')+'">'
      + '<td class="hz">'+t.getZhi()+'</td>'
      + '<td>'+t.getMinHm()+'–'+t.getMaxHm()+'</td>'
      + '<td class="hz">'+t.getGanZhi()+'</td>'
      + '<td><span class="tag '+(luck==='吉'?'g':'b')+'">'+t.getTianShen()+' '+luck+'</span></td>'
      + '<td>冲'+t.getChongShengXiao()+'</td>'
      + '<td>'+fit+'</td>'
      + '</tr>';
  }).join('');
  return '<div class="hours"><table>'
    + '<thead><tr><th>时辰</th><th>时段</th><th>时干支</th><th>值神</th><th>冲</th><th>与本事项</th></tr></thead>'
    + '<tbody>'+rows+'</tbody></table></div>';
}
function hourChips(lunar){
  return lunar.getTimes().slice(0,12).map(t=>
    '<span class="hchip '+(t.getTianShenLuck()==='吉'?'g':'b')+'"><span class="z">'+t.getZhi()+'</span> '+t.getTianShen()+'</span>'
  ).join('');
}
function posRow(lunar){
  return '<div class="posRow">'
    + '<span><i>喜神</i> <b>'+lunar.getDayPositionXiDesc()+'</b></span>'
    + '<span><i>财神</i> <b>'+lunar.getDayPositionCaiDesc()+'</b></span>'
    + '<span><i>福神</i> <b>'+lunar.getDayPositionFuDesc()+'</b></span>'
    + '<span><i>阳贵</i> <b>'+lunar.getDayPositionYangGuiDesc()+'</b></span>'
    + '<span><i>阴贵</i> <b>'+lunar.getDayPositionYinGuiDesc()+'</b></span>'
    + '<span><i>胎神</i> <b>'+lunar.getDayPositionTai()+'</b></span>'
    + '</div>';
}

