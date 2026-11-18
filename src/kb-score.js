/* @file kb-score.js — 择日评分：evalDay，把当日黄历与规则合成分数与依据 */

/* ================= 择日评分 ================= */
function evalDay(solar, ev, zodiac){
  const lunar = solar.getLunar();
  const yi = lunar.getDayYi();
  const ji = lunar.getDayJi();
  const zx = lunar.getZhiXing();
  const tsName = lunar.getDayTianShen();
  const tsLuck = lunar.getDayTianShenLuck();
  const chongZ = lunar.getDayChongShengXiao();
  const xiu = lunar.getXiu();
  const xiuLuck = lunar.getXiuLuck();
  const S = KB.set;

  let s = +S.base;
  const hits = [];
  const reasons = [];
  let ban = false;

  const hitYi = ev.words.filter(w=>yi.indexOf(w)>=0);
  hitYi.forEach(()=>{ s += +S.yi; });
  if(hitYi.length){
    hits.push({t:'黄历宜「'+hitYi.join('、')+'」', d:'+'+((+S.yi)*hitYi.length), src:'通书宜忌', ok:true});
    reasons.push('宜'+hitYi.join('、'));
  }

  const hitJi = ev.words.filter(w=>ji.indexOf(w)>=0);
  hitJi.forEach(()=>{ s -= +S.ji; });
  if(hitJi.length){
    hits.push({t:'黄历忌「'+hitJi.join('、')+'」', d:'-'+((+S.ji)*hitJi.length), src:'通书宜忌', ok:false});
    reasons.push('忌'+hitJi.join('、'));
  }

  if(S.useZx){
    const zs = ZHIXING_SCORE[zx] || 0;
    if(zs){
      s += zs;
      hits.push({t:'建除值「'+zx+'」：'+ZHIXING_MEAN[zx], d:(zs>0?'+':'')+zs, src:'《协纪辨方书》建除十二神', ok:zs>0});
      if(zs<0) reasons.push(zx+'日');
    }
  }

  if(S.useTs){
    const d = (tsLuck==='吉') ? 6 : -12;
    s += d;
    hits.push({t:'值日神「'+tsName+'」为'+tsLuck, d:(d>0?'+':'')+d, src:'《协纪辨方书》黄黑道日', ok:d>0});
  }

  if(S.useXiu){
    const d = (xiuLuck==='吉') ? 5 : -5;
    s += d;
    hits.push({t:'值日宿「'+xiu+'」为'+xiuLuck+'宿', d:(d>0?'+':'')+d, src:'通书二十八宿', ok:d>0});
  }

  const jqNext = solar.next(1).getLunar().getJieQi();
  if(jqNext){
    if(SIJUE.indexOf(jqNext)>=0){
      s -= 10;
      hits.push({t:'明日'+jqNext+'，今天是四绝日', d:'-10', src:'《协纪辨方书》四离四绝', ok:false});
      reasons.push('四绝日');
    }else if(SILI.indexOf(jqNext)>=0){
      s -= 10;
      hits.push({t:'明日'+jqNext+'，今天是四离日', d:'-10', src:'《协纪辨方书》四离四绝', ok:false});
      reasons.push('四离日');
    }
  }

  if(zodiac && chongZ===zodiac){
    s -= +S.chong;
    hits.unshift({t:'冲你的生肖（'+zodiac+'）', d:'-'+S.chong, src:'通书冲煞', ok:false});
    reasons.unshift('冲'+zodiac);
  }

  const seen = {};
  dayRuleKeys(solar, lunar).forEach(k=>{
    const arr = IDX.get(k);
    if(!arr) return;
    arr.forEach(r=>{
      if(seen[r.id]) return;
      seen[r.id] = 1;
      if(!ruleApplies(r, ev)) return;
      if(r.ban){
        ban = true;
        hits.push({t:'你的规则「'+esc(r.title)+'」：一票否决', d:'不可用', src:r.src||'', ok:false, ban:true});
        reasons.push('触犯'+r.title);
      }else{
        const d = +r.score || 0;
        s += d;
        if(d){
          hits.push({t:'你的规则「'+esc(r.title)+'」', d:(d>0?'+':'')+d, src:r.src||'', ok:d>0});
          if(d<0) reasons.push(r.title);
        }
      }
    });
  });

  return {
    solar, lunar, yi, ji, zx, tsName, tsLuck, xiu, xiuLuck, chongZ,
    hits, reasons, ban,
    score: ban ? 5 : Math.round(clamp(s, 5, 96))
  };
}

