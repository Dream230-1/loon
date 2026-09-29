/**
 * 岁时黄历 - Surge Information Panel
 * Reference: jnlaoshu/MySelf Egern/Widget/Almanac.js
 * UI adapted to Surge panel limitations while preserving the original information hierarchy.
 */

function parseArgs(raw){const o={};String(raw||'').split('&').forEach(p=>{if(!p)return;const i=p.indexOf('=');const k=i>=0?p.slice(0,i):p;const v=i>=0?p.slice(i+1):'';try{o[decodeURIComponent(k)]=decodeURIComponent(v.replace(/\+/g,'%20'));}catch(_){o[k]=v;}});return o;}
function pad2(n){return String(n).padStart(2,'0');}
function httpGet(url){return new Promise(resolve=>{$httpClient.get({url,timeout:10,headers:{'User-Agent':'Mozilla/5.0','Cache-Control':'no-cache'}},(e,r,d)=>resolve({ok:!e&&r&&r.status>=200&&r.status<400,data:d||''}));});}
function truncate(s,n){s=String(s||'').replace(/\s+/g,' ').trim();return s.length>n?s.slice(0,n-1)+'…':s;}

const Lunar={
info:[0x04bd8,0x04ae0,0x0a570,0x054d5,0x0d260,0x0d950,0x16554,0x056a0,0x09ad0,0x055d2,0x04ae0,0x0a5b6,0x0a4d0,0x0d250,0x1d255,0x0b540,0x0d6a0,0x0ada2,0x095b0,0x14977,0x04970,0x0a4b0,0x0b4b5,0x06a50,0x06d40,0x1ab54,0x02b60,0x09570,0x052f2,0x04970,0x06566,0x0d4a0,0x0ea50,0x06e95,0x05ad0,0x02b60,0x186e3,0x092e0,0x1c8d7,0x0c950,0x0d4a0,0x1d8a6,0x0b550,0x056a0,0x1a5b4,0x025d0,0x092d0,0x0d2b2,0x0a950,0x0b557,0x06ca0,0x0b550,0x15355,0x04da0,0x0a5b0,0x14573,0x052b0,0x0a9a8,0x0e950,0x06aa0,0x0aea6,0x0ab50,0x04b60,0x0aae4,0x0a570,0x05260,0x0f263,0x0d950,0x05b57,0x056a0,0x096d0,0x04dd5,0x04ad0,0x0a4d0,0x0d4d4,0x0d250,0x0d558,0x0b540,0x0b6a0,0x195a6,0x095b0,0x049b0,0x0a974,0x0a4b0,0x0b27a,0x06a50,0x06d40,0x0af46,0x0ab60,0x09570,0x04af5,0x04970,0x064b0,0x074a3,0x0ea50,0x06b58,0x05ac0,0x0ab60,0x096d5,0x092e0,0x0c960,0x0d954,0x0d4a0,0x0da50,0x07552,0x056a0,0x0abb7,0x025d0,0x092d0,0x0cab5,0x0a950,0x0b4a0,0x0baa4,0x0ad50,0x055d9,0x04ba0,0x0a5b0,0x15176,0x052b0,0x0a930,0x07954,0x06aa0,0x0ad50,0x05b52,0x04b60,0x0a6e6,0x0a4e0,0x0d260,0x0ea65,0x0d530,0x05aa0,0x076a3,0x096d0,0x04afb,0x04ad0,0x0a4d0,0x1d0b6,0x0d250,0x0d520,0x0dd45,0x0b5a0,0x056d0,0x055b2,0x049b0,0x0a577,0x0a4b0,0x0aa50,0x1b255,0x06d20,0x0ada0,0x14b63,0x09370,0x049f8,0x04970,0x064b0,0x168a6,0x0ea50,0x06b20,0x1a6c4,0x0aae0,0x092e0,0x0d2e3,0x0c960,0x0d557,0x0d4a0,0x0da50,0x05d55,0x056a0,0x0a6d0,0x055d4,0x052d0,0x0a9b8,0x0a950,0x0b4a0,0x0b6a6,0x0ad50,0x055a0,0x0aba4,0x0a5b0,0x052b0,0x0b273,0x06930,0x07337,0x06aa0,0x0ad50,0x14b55,0x04b60,0x0a570,0x054e4,0x0d160,0x0e968,0x0d520,0x0daa0,0x16aa6,0x056d0,0x04ae0,0x0a9d4,0x0a2d0,0x0d150,0x0f252,0x0d520],
termNames:['小寒','大寒','立春','雨水','惊蛰','春分','清明','谷雨','立夏','小满','芒种','夏至','小暑','大暑','立秋','处暑','白露','秋分','寒露','霜降','立冬','小雪','大雪','冬至'],
getTerm(y,n){const t=new Date((31556925974.7*(y-1900))+[0,21208,42467,63836,85337,107014,128867,150921,173149,195551,218072,240693,263343,285989,308563,331033,353350,375494,397447,419210,440795,462224,483532,504758][n-1]*60000+Date.UTC(1900,0,6,2,5));return t.getUTCDate();},
parse(y,m,d){let offset=Math.round((Date.UTC(y,m-1,d)-Date.UTC(1900,0,31))/86400000),i,temp=0;for(i=1900;i<2101&&offset>0;i++){temp=348;for(let j=0x8000;j>0x8;j>>=1)temp+=(this.info[i-1900]&j)?1:0;temp+=(this.info[i-1900]&0xf)?((this.info[i-1900]&0x10000)?30:29):0;offset-=temp;}if(offset<0){offset+=temp;i--;}const lYear=i,leap=this.info[lYear-1900]&0xf;let isLeap=false;for(i=1;i<13&&offset>0;i++){if(leap>0&&i===leap+1&&!isLeap){--i;isLeap=true;temp=(this.info[lYear-1900]&0x10000)?30:29;}else temp=(this.info[lYear-1900]&(0x10000>>i))?30:29;if(isLeap&&i===leap+1)isLeap=false;offset-=temp;}if(offset===0&&leap>0&&i===leap+1){isLeap=!isLeap?true:(isLeap=false,--i,false);}if(offset<0){offset+=temp;i--;}const lD=offset+1;const term1=this.getTerm(y,m*2-1),term2=this.getTerm(y,m*2);const term=d===term1?this.termNames[m*2-2]:d===term2?this.termNames[m*2-1]:'';const gz='甲乙丙丁戊己庚辛壬癸'[(lYear-4)%10]+'子丑寅卯辰巳午未申酉戌亥'[(lYear-4)%12];const ani='鼠牛虎兔龙蛇马羊猴鸡狗猪'[(lYear-4)%12];const cnMonth=(isLeap?'闰':'')+'正二三四五六七八九十冬腊'[i-1]+'月';const cnDay=lD===10?'初十':lD===20?'二十':lD===30?'三十':['初','十','廿','卅'][Math.floor(lD/10)]+['日','一','二','三','四','五','六','七','八','九','十'][lD%10];const astro='摩羯水瓶双鱼白羊金牛双子巨蟹狮子处女天秤天蝎射手摩羯'.substr(m*2-(d<[20,19,21,21,21,22,23,23,23,23,22,22][m-1]?2:0),2)+'座';return{gz,ani,cn:cnMonth+cnDay,term,astro};}
};

function weekInfo(y,m,d){const x=new Date(Date.UTC(y,m-1,d));const day=x.getUTCDay()||7;x.setUTCDate(x.getUTCDate()+4-day);const ys=new Date(Date.UTC(x.getUTCFullYear(),0,1));const w=Math.ceil(((x-ys)/86400000+1)/7);const doy=Math.round((Date.UTC(y,m-1,d)-Date.UTC(y,0,0))/86400000);return '本年第'+w+'周 · 第'+doy+'天';}
function teachingWeek(y,m,d,start){if(!start)return'';const p=start.replace(/-/g,'/');const s=new Date(p);if(isNaN(s.getTime()))return'';const diff=Math.floor((Date.UTC(y,m-1,d)-Date.UTC(s.getFullYear(),s.getMonth(),s.getDate()))/86400000);return diff>=0?'教学第'+(Math.floor(diff/7)+1)+'周':'未开学';}
function upcomingTerms(y,m,d){const today=Date.UTC(y,m-1,d),all=[];[-1,0,1].forEach(off=>{for(let i=1;i<=24;i++)all.push({name:Lunar.termNames[i-1],date:Date.UTC(y+off,Math.floor((i-1)/2),Lunar.getTerm(y+off,i))});});all.sort((a,b)=>a.date-b.date);return all.filter(x=>x.date>today).slice(0,4).map(x=>x.name+' '+Math.round((x.date-today)/86400000)+'天');}

async function fetchAlmanac(y,m,d){const url='https://raw.githubusercontent.com/zqzess/openApiData/main/calendar_new/'+y+'/'+y+pad2(m)+'.json';const r=await httpGet(url);if(!r.ok)return{};let json;try{json=JSON.parse(r.data);}catch(_){return{};}const pats=[`${y}-${pad2(m)}-${pad2(d)}`,`${y}-${m}-${d}`,`${y}/${pad2(m)}/${pad2(d)}`,`${y}/${m}/${d}`,`${y}${pad2(m)}${pad2(d)}`];const seen=new Set();function walk(x,depth){if(!x||typeof x!=='object'||depth>8||seen.has(x))return null;seen.add(x);for(const k in x){const v=x[k];if(!v)continue;if(pats.some(p=>String(k).includes(p)))return v;if(typeof v==='object'){const ds=String(v.date||v.day||v.gregorian||v.oDate||'');if(pats.some(p=>ds.includes(p)))return v;if(Number(v.day)===d&&(Number(v.month)===m||(!v.month&&!v.year)))return v;const q=walk(v,depth+1);if(q)return q;}}return null;}return walk(json,0)||{};}
function getVal(data,keys){for(let i=0;i<keys.length;i++){const v=data[keys[i]];if(v!=null&&v!=='')return String(v);}return'';}

(async function(){
  const args=parseArgs(typeof $argument==='undefined'?'':$argument);
  const bj=new Date(Date.now()+8*3600000);const Y=bj.getUTCFullYear(),M=bj.getUTCMonth()+1,D=bj.getUTCDate(),H=bj.getUTCHours();
  const WEEK='日一二三四五六'[bj.getUTCDay()];
  const obj=Lunar.parse(Y,M,D);const shichen='子丑寅卯辰巳午未申酉戌亥'[Math.floor(((H+1)%24)/2)]+'时';
  const mode=String(args.ASTRO_OR_WEEK||'星座').trim();const top=/周次|week/i.test(mode)?weekInfo(Y,M,D):obj.astro;
  const tw=String(args.SHOW_TEACHING_WEEK||'true').toLowerCase()==='false'?'':teachingWeek(Y,M,D,String(args.TEACHING_WEEK_START||''));
  const terms=upcomingTerms(Y,M,D);
  let api={};try{api=await fetchAlmanac(Y,M,D);}catch(_){}
  const rawYi=getVal(api,['yi','Yi','suit','appropriate']).replace(/[.。]/g,' ').trim();
  const rawJi=getVal(api,['ji','Ji','avoid','taboo']).replace(/[.。]/g,' ').trim();
  let chong=getVal(api,['chongsha','ChongSha','chong']);
  if(!chong||chong==='无'){const cycle=(Math.round((Date.UTC(Y,M-1,D)-Date.UTC(1900,0,31))/86400000)+40)%60;chong='冲'+'鼠牛虎兔龙蛇马羊猴鸡狗猪'[(cycle%12+6)%12]+'('+'甲乙丙丁戊己庚辛壬癸'[(cycle+6)%10]+'子丑寅卯辰巳午未申酉戌亥'[(cycle+6)%12]+')煞'+'南东北西'[cycle%4];}
  const score=parseInt(getVal(api,['score','Score','pingfen','star']),10)||4;const stars='⭐'.repeat(Math.max(1,Math.min(5,score)));
  const headerMeta=[tw,top].filter(Boolean).join(' · ');
  const lines=[
    obj.gz+'('+obj.ani+')年 '+obj.cn+' '+shichen+(obj.term?' · 今日'+obj.term:''),
    headerMeta?'✨ '+headerMeta:'',
    '────────────',
    '宜  '+(rawYi?truncate(rawYi,72):'数据暂缺'),
    '忌  '+(rawJi?truncate(rawJi,72):'数据暂缺'),
    '冲煞  '+chong+'  ·  运势 '+stars,
    '节气  '+terms.join(' · '),
    '────────────',
    '更新 '+pad2(bj.getUTCHours())+':'+pad2(bj.getUTCMinutes())+' · UTC+8'
  ].filter(Boolean);
  $done({title:`${Y}年${M}月${D}日 星期${WEEK}`,content:lines.join('\n'),icon:'calendar','icon-color':obj.term?'#73A491':'#B58A28'});
})().catch(e=>$done({title:'岁时黄历',content:'加载失败\n'+(e&&e.message?e.message:String(e)),style:'error'}));
