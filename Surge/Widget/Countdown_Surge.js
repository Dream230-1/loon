/**
 * 时光倒数 - Surge Information Panel
 * Reference: jnlaoshu/MySelf Egern/Widget/Countdown.js
 * Preserves holiday/lunar/custom-date logic and adapts the grouped UI to Surge text panels.
 */
function parseArgs(raw){const o={};String(raw||'').split('&').forEach(p=>{if(!p)return;const i=p.indexOf('=');const k=i>=0?p.slice(0,i):p;const v=i>=0?p.slice(i+1):'';try{o[decodeURIComponent(k)]=decodeURIComponent(v.replace(/\+/g,'%20'));}catch(_){o[k]=v;}});return o;}
function b(v,d=true){if(v==null||String(v).trim()==='')return d;return String(v).trim().toLowerCase()!=='false';}
function num(v,d){const n=parseInt(String(v||''),10);return isNaN(n)?d:n;}
function str(v,d=''){return String(v==null?d:v).trim();}
function pad2(n){return String(n).padStart(2,'0');}

const Lunar={info:[0x04bd8,0x04ae0,0x0a570,0x054d5,0x0d260,0x0d950,0x16554,0x056a0,0x09ad0,0x055d2,0x04ae0,0x0a5b6,0x0a4d0,0x0d250,0x1d255,0x0b540,0x0d6a0,0x0ada2,0x095b0,0x14977,0x04970,0x0a4b0,0x0b4b5,0x06a50,0x06d40,0x1ab54,0x02b60,0x09570,0x052f2,0x04970,0x06566,0x0d4a0,0x0ea50,0x06e95,0x05ad0,0x02b60,0x186e3,0x092e0,0x1c8d7,0x0c950,0x0d4a0,0x1d8a6,0x0b550,0x056a0,0x1a5b4,0x025d0,0x092d0,0x0d2b2,0x0a950,0x0b557,0x06ca0,0x0b550,0x15355,0x04da0,0x0a5b0,0x14573,0x052b0,0x0a9a8,0x0e950,0x06aa0,0x0aea6,0x0ab50,0x04b60,0x0aae4,0x0a570,0x05260,0x0f263,0x0d950,0x05b57,0x056a0,0x096d0,0x04dd5,0x04ad0,0x0a4d0,0x0d4d4,0x0d250,0x0d558,0x0b540,0x0b6a0,0x195a6,0x095b0,0x049b0,0x0a974,0x0a4b0,0x0b27a,0x06a50,0x06d40,0x0af46,0x0ab60,0x09570,0x04af5,0x04970,0x064b0,0x074a3,0x0ea50,0x06b58,0x05ac0,0x0ab60,0x096d5,0x092e0,0x0c960,0x0d954,0x0d4a0,0x0da50,0x07552,0x056a0,0x0abb7,0x025d0,0x092d0,0x0cab5,0x0a950,0x0b4a0,0x0baa4,0x0ad50,0x055d9,0x04ba0,0x0a5b0,0x15176,0x052b0,0x0a930,0x07954,0x06aa0,0x0ad50,0x05b52,0x04b60,0x0a6e6,0x0a4e0,0x0d260,0x0ea65,0x0d530,0x05aa0,0x076a3,0x096d0,0x04afb,0x04ad0,0x0a4d0,0x1d0b6,0x0d250,0x0d520,0x0dd45,0x0b5a0,0x056d0,0x055b2,0x049b0,0x0a577,0x0a4b0,0x0aa50,0x1b255,0x06d20,0x0ada0,0x14b63,0x09370,0x049f8,0x04970,0x064b0,0x168a6,0x0ea50,0x06b20,0x1a6c4,0x0aae0,0x092e0,0x0d2e3,0x0c960,0x0d557,0x0d4a0,0x0da50,0x05d55,0x056a0,0x0a6d0,0x055d4,0x052d0,0x0a9b8,0x0a950,0x0b4a0,0x0b6a6,0x0ad50,0x055a0,0x0aba4,0x0a5b0,0x052b0,0x0b273,0x06930,0x07337,0x06aa0,0x0ad50,0x14b55,0x04b60,0x0a570,0x054e4,0x0d160,0x0e968,0x0d520,0x0daa0,0x16aa6,0x056d0,0x04ae0,0x0a9d4,0x0a2d0,0x0d150,0x0f252,0x0d520],
term(y,n){return new Date((31556925974.7*(y-1900))+[0,21208,42467,63836,85337,107014,128867,150921,173149,195551,218072,240693,263343,285989,308563,331033,353350,375494,397447,419210,440795,462224,483532,504758][n-1]*60000+Date.UTC(1900,0,6,2,5));},
lDays(y){const i=y-1900;if(i<0||i>=this.info.length)return 365;let s=348;for(let x=0x8000;x>0x8;x>>=1)s+=(this.info[i]&x)?1:0;return s+((this.info[i]&0xf)?((this.info[i]&0x10000)?30:29):0);},
mDays(y,m){const i=y-1900;if(i<0||i>=this.info.length)return 30;return(this.info[i]&(0x10000>>m))?30:29;}}

let lunarCache=null;
function ensureLunar(maxYear){if(!lunarCache)lunarCache={maxYear:1900,off:new Map([[1900,0]])};let y=lunarCache.maxYear;while(y<maxYear){if(y-1900>=Lunar.info.length)break;const cur=lunarCache.off.get(y);lunarCache.off.set(y+1,cur+Lunar.lDays(y));lunarCache.maxYear=y+1;y++;}}
function l2s(y,m,d){ensureLunar(y+1);let off=lunarCache.off.get(y)||0;const lp=Lunar.info[y-1900]&0xf;for(let i=1;i<m;i++){off+=Lunar.mDays(y,i);if(lp>0&&i===lp)off+=(Lunar.info[y-1900]&0x10000)?30:29;}const date=new Date(Date.UTC(1900,0,31)+(off+d-1)*86400000);return ymd(date.getUTCFullYear(),date.getUTCMonth()+1,date.getUTCDate());}
function ymd(y,m,d){return y+'/'+pad2(m)+'/'+pad2(d);}
function validDate(y,m,d){const x=new Date(Date.UTC(y,m-1,d));return x.getUTCMonth()+1===m&&x.getUTCDate()===d;}
function customDate(y,s,fallback){if(!s||typeof s!=='string')return fallback?fallback():null;const p=s.split('/'),m=Number(p[0]),d=Number(p[1]);if(p.length!==2||!m||!d||!validDate(y,m,d))return fallback?fallback():null;return ymd(y,m,d);}
function weekDayDate(y,m,n,w){const f=new Date(Date.UTC(y,m-1,1)),x=w-f.getUTCDay();return ymd(y,m,1+(x<0?x+7:x)+(n-1)*7);}
function financeDate(y,monthIndex,nth,dow){const first=new Date(Date.UTC(y,monthIndex,1)).getUTCDay();let x=dow-first;if(x<0)x+=7;return Date.UTC(y,monthIndex,1+x+(nth-1)*7);}

(function(){
  const a=parseArgs(typeof $argument==='undefined'?'':$argument);
  const bj=new Date(Date.now()+8*3600000);const Y=bj.getUTCFullYear(),M=bj.getUTCMonth()+1,D=bj.getUTCDate(),hour=bj.getUTCHours(),dow=bj.getUTCDay(),today=Date.UTC(Y,M-1,D);
  const showSchool=b(a.SHOW_SCHOOL_HOLIDAYS,true),showFinance=b(a.SHOW_FINANCE_DATES,true),prioritySort=b(a.ENABLE_PRIORITY_SORT,true),exclusiveWeight=b(a.ENABLE_EXCLUSIVE_WEIGHT,true),weekendTheme=b(a.ENABLE_WEEKEND_THEME,true);
  const pinMaxDays=num(a.PINNED_MAX_DAYS,90),pinMaxShow=num(a.PINNED_MAX_SHOW,2),maxPer=num(a.MAX_PER_GROUP,4),exclusiveMax=num(a.EXCLUSIVE_MAX_SHOW,6);
  const spring=str(a.SPRING_BREAK_DATE),autumn=str(a.AUTUMN_BREAK_DATE),qingming=str(a.QINGMING_DATE,'4/4');
  const pinned=str(a.PINNED_HOLIDAY).split(/[|,，]/).map(s=>s.trim()).filter(Boolean);
  const custom=[];for(let i=1;i<=6;i++){const name=str(a['EXCLUSIVE_NAME_'+i],i===1?str(a.EXCLUSIVE_NAME,'生日'):'');const date=str(a['EXCLUSIVE_DATE_'+i],i===1?str(a.EXCLUSIVE_DATE,'11/10'):'');if(name&&/^\d{1,2}\/\d{1,2}$/.test(date))custom.push({name,date});}
  const baseP={legal:3,folk:2,intl:1,exclusive:2},special={春节:10,国庆节:9,交割:8,行权:8,元旦:7,清明节:7,端午节:7,中秋节:7,春假:6,秋假:6,除夕:6};
  function prio(name,cat,kind){if(!prioritySort)return 1;if(kind==='custom')return exclusiveWeight?9:(baseP[cat]||1);return special[name]!==undefined?special[name]:(baseP[cat]||1);}
  function fests(y){const term=n=>{const t=Lunar.term(y,n),z=new Date(t.getTime()+8*3600000);return ymd(z.getUTCFullYear(),z.getUTCMonth()+1,z.getUTCDate());};const qm=customDate(y,qingming,()=>term(7));const legal=[['元旦',ymd(y,1,1),1],['春节',l2s(y,1,1),3],['清明节',qm,1],['劳动节',ymd(y,5,1),1],['端午节',l2s(y,5,5),1],['中秋节',l2s(y,8,15),1],['国庆节',ymd(y,10,1),3]];if(showSchool){const sp=customDate(y,spring,()=>{const q=qm.split('/').map(Number),x=new Date(Date.UTC(q[0],q[1]-1,q[2]-3));return ymd(x.getUTCFullYear(),x.getUTCMonth()+1,x.getUTCDate());});if(sp)legal.push(['春假',sp,3]);const au=customDate(y,autumn,()=>{const nov=new Date(Date.UTC(y,10,1));return ymd(y,11,1+((3-nov.getUTCDay()+7)%7)+7);});if(au)legal.push(['秋假',au,3]);}
    return{legal,folk:[['元宵节',l2s(y,1,15),1],['龙抬头',l2s(y,2,2),1],['七夕节',l2s(y,7,7),1],['中元节',l2s(y,7,15),1],['重阳节',l2s(y,9,9),1],['寒衣节',l2s(y,10,1),1],['腊八节',l2s(y,12,8),1],['小年',l2s(y,12,23),1],['除夕',l2s(y,12,Lunar.mDays(y,12)),1]],intl:[['情人节',ymd(y,2,14),1],['妇女节',ymd(y,3,8),1],['母亲节',weekDayDate(y,5,2,0),1],['儿童节',ymd(y,6,1),1],['父亲节',weekDayDate(y,6,3,0),1],['万圣节',ymd(y,10,31),1],['感恩节',weekDayDate(y,11,4,4),1],['平安夜',ymd(y,12,24),1],['圣诞节',ymd(y,12,25),1]],exclusive:custom.map(x=>[x.name,customDate(y,x.date),1,'custom'])};}
  const result={legal:new Map(),folk:new Map(),intl:new Map(),exclusive:new Map()},todayFest=new Set(),todayFinance=new Set(),pinMap=new Map();
  [Y,Y+1].forEach(y=>{const f=fests(y);Object.keys(result).forEach(cat=>{f[cat].forEach(item=>{const name=item[0],ds=item[1],dur=item[2]||1,kind=item[3]||'';if(!ds)return;const q=ds.split('/').map(Number),diff=Math.floor((Date.UTC(q[0],q[1]-1,q[2])-today)/86400000);if(diff<=0){if(diff>-dur)todayFest.add(name);return;}if(pinned.includes(name)&&diff<=pinMaxDays){if(!pinMap.has(name)||diff<pinMap.get(name))pinMap.set(name,diff);}if(!result[cat].has(name))result[cat].set(name,{name,diff,priority:prio(name,cat,kind),cat});});});});
  if(showFinance){function addFinance(name,nth,day){let ms=financeDate(Y,M-1,nth,day);if(today>ms){const nm=M===12?0:M,ny=M===12?Y+1:Y;ms=financeDate(ny,nm,nth,day);}const x=new Date(ms),diff=Math.floor((Date.UTC(x.getUTCFullYear(),x.getUTCMonth(),x.getUTCDate())-today)/86400000);if(diff===0&&hour<15)todayFinance.add(name);else if(diff>0)result.exclusive.set(name,{name,diff,priority:prio(name,'exclusive'),cat:'exclusive'});}addFinance('交割',3,5);addFinance('行权',4,3);}
  Object.keys(result).forEach(cat=>{result[cat]=Array.from(result[cat].values()).filter(x=>!pinMap.has(x.name)).sort((x,y)=>x.diff!==y.diff?x.diff-y.diff:(prioritySort?y.priority-x.priority:0));});
  function format(cat,limit){return result[cat].slice(0,limit).map(x=>x.name+' '+x.diff+'天').join(' · ');}
  const todayNames=Array.from(new Set([...todayFest,...todayFinance]));const pinEntries=Array.from(pinMap.entries()).sort((a,b)=>a[1]-b[1]).slice(0,pinMaxShow).map(x=>x[0]+' '+x[1]+'天');
  const lines=[];if(todayNames.length)lines.push('🔔 今日 '+todayNames.join(' · '));if(pinEntries.length)lines.push('🔝 '+pinEntries.join(' · '));if(todayNames.length||pinEntries.length)lines.push('────────────');
  const groups=[['法定','🏛',format('legal',maxPer)],['民俗','🌙',format('folk',maxPer)],['国际','🌐',format('intl',maxPer)],['专属','🎁',format('exclusive',exclusiveMax)]];groups.forEach(g=>{if(g[2])lines.push(g[1]+' '+g[0]+'  '+g[2]);});if(!lines.length)lines.push('近期暂无倒计时');lines.push('────────────');lines.push('更新 '+pad2(M)+'.'+pad2(D)+' '+pad2(hour)+':'+pad2(bj.getUTCMinutes())+' · UTC+8');
  let color='#3A5F85';if(todayNames.length)color='#CA3B32';else if(weekendTheme&&(dow===0||dow===6))color='#5E8EB8';
  $done({title:'时光倒数',content:lines.join('\n'),icon:'hourglass.circle.fill','icon-color':color});
})();
