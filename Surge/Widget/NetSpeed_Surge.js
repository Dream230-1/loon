/**
 * NetSpeed - Surge Information Panel
 * Reference: IBL3ND/module NetSpeed_Widget.JS
 * Downloads a Cloudflare sample and renders a text progress bar close to the Egern widget.
 */
function parseArgs(raw){const o={};String(raw||'').split('&').forEach(p=>{if(!p)return;const i=p.indexOf('=');const k=i>=0?p.slice(0,i):p;const v=i>=0?p.slice(i+1):'';try{o[decodeURIComponent(k)]=decodeURIComponent(v.replace(/\+/g,'%20'));}catch(_){o[k]=v;}});return o;}
function clean(v){return String(v==null?'':v).trim();}
function pad2(n){return String(n).padStart(2,'0');}
function bar(mbps){let n=2;if(mbps>=80)n=12;else if(mbps>=50)n=9;else if(mbps>=20)n=7;else if(mbps>=10)n=4;return '━'.repeat(n)+'╸'+'─'.repeat(Math.max(0,12-n));}
function theme(mbps){if(mbps>=50)return{icon:'bolt.fill',color:'#34C759',label:'高速'};if(mbps>=10)return{icon:'hare.fill',color:'#007AFF',label:'良好'};return{icon:'tortoise.fill',color:'#FF9500',label:'较慢'};}
function loadCache(){try{const x=$persistentStore.read('netspeed_surge_cache');return x?JSON.parse(x):null;}catch(_){return null;}}
function saveCache(x){try{$persistentStore.write(JSON.stringify(x),'netspeed_surge_cache');}catch(_){}}
function test(mb,policy){return new Promise(resolve=>{const bytes=Math.max(1,mb)*1024*1024;const start=Date.now();const opt={url:'https://speed.cloudflare.com/__down?bytes='+bytes+'&_='+start,timeout:35,'binary-mode':true,headers:{'Cache-Control':'no-cache','User-Agent':'Mozilla/5.0'}};if(policy)opt.policy=policy;$httpClient.get(opt,(e,r,d)=>{const sec=Math.max(0.001,(Date.now()-start)/1000);if(e||!r||r.status<200||r.status>=400)return resolve(null);const mBs=mb/sec,mbps=mBs*8;resolve({mbps:Number(mbps.toFixed(1)),mBs:Number(mBs.toFixed(2)),duration:Number(sec.toFixed(2)),timestamp:Date.now(),mb:mb,policy:policy||'默认规则'});});});}
function render(x,cached){const t=theme(Number(x.mbps||0)),d=new Date(x.timestamp||Date.now());const lines=[bar(x.mbps)+'  '+t.label,'',`下载速率  ${x.mBs} MB/s`,`测试耗时  ${x.duration}s`,`样本大小  ${x.mb} MB · Cloudflare`,`策略      ${x.policy||'默认规则'}`,'────────────',`${cached?'缓存结果':'实测结果'} · ${pad2(d.getHours())}:${pad2(d.getMinutes())}`];return{title:`NetSpeed  ${x.mbps} Mbps`,content:lines.join('\n'),icon:t.icon,'icon-color':t.color};}
(async function(){const a=parseArgs(typeof $argument==='undefined'?'':$argument);const mb=Math.max(1,Math.min(20,Number(a.MB||3)||3));const policy=clean(a.POLICY);const minRetest=Math.max(0,Number(a.MIN_RETEST_SECONDS||60)||60);let cache=loadCache();const force=typeof $trigger!=='undefined'&&$trigger==='button';if(!force&&cache&&Date.now()-cache.timestamp<minRetest*1000){return $done(render(cache,true));}const x=await test(mb,policy);if(x){saveCache(x);return $done(render(x,false));}if(cache)return $done(render(cache,true));$done({title:'NetSpeed',content:'测速失败\n请检查网络连接后手动刷新。',style:'error'});})().catch(e=>$done({title:'NetSpeed',content:'测速失败\n'+(e&&e.message?e.message:String(e)),style:'error'}));
