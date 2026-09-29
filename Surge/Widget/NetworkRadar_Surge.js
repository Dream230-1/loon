/**
 * Network Radar - Surge Information Panel port
 * Reference: lylywayr/NetWork-Module Egern 网络诊断雷达
 * Surge adaptation: text-card dashboard split into overview/media/ai panels.
 */

function parseArgs(raw) {
  const out = {};
  String(raw || '').split('&').forEach(function (pair) {
    if (!pair) return;
    const i = pair.indexOf('=');
    const k = i >= 0 ? pair.slice(0, i) : pair;
    const v = i >= 0 ? pair.slice(i + 1) : '';
    try { out[decodeURIComponent(k)] = decodeURIComponent(v.replace(/\+/g, '%20')); }
    catch (_) { out[k] = v; }
  });
  return out;
}

function clean(v) { return String(v == null ? '' : v).trim(); }
function clamp(n, a, b) { return Math.max(a, Math.min(b, n)); }
function pad2(n) { return String(n).padStart(2, '0'); }
function nowText() { const d = new Date(); return pad2(d.getHours()) + ':' + pad2(d.getMinutes()); }
function statusMark(ok) { return ok ? '✓' : '×'; }

function maskIP(ip) {
  const s = clean(ip);
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(s)) {
    const p = s.split('.');
    return p[0] + '.' + p[1] + '.*.*';
  }
  if (s.indexOf(':') >= 0) {
    const p = s.split(':').filter(Boolean);
    return p.slice(0, 2).join(':') + ':*:*';
  }
  return s;
}

function flag(code) {
  const c = clean(code).toUpperCase();
  if (!/^[A-Z]{2}$/.test(c)) return '🌐';
  return String.fromCodePoint(c.charCodeAt(0) + 127397, c.charCodeAt(1) + 127397);
}

function hashString(s) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0).toString(36);
}

function http(method, url, opt) {
  return new Promise(function (resolve) {
    const options = Object.assign({ url: url, timeout: 5, headers: {
      'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148',
      'Accept': 'application/json,text/plain,text/html,*/*',
      'Cache-Control': 'no-cache'
    }}, opt || {});
    $httpClient[method](options, function (error, response, data) {
      const status = Number(response && response.status) || 0;
      resolve({
        ok: !error && status >= 200 && status < 500,
        success: !error && status >= 200 && status < 400,
        error: error || '',
        status: status,
        data: data == null ? '' : data
      });
    });
  });
}

function jsonParse(s) { try { return JSON.parse(s); } catch (_) { return null; } }
function policyOpt(name, extra) {
  const o = Object.assign({}, extra || {});
  if (clean(name)) o.policy = clean(name);
  return o;
}

async function firstJSON(urls, policy) {
  for (let i = 0; i < urls.length; i++) {
    const r = await http('get', urls[i], policyOpt(policy));
    if (r.success) {
      const j = jsonParse(r.data);
      if (j) return j;
    }
  }
  return null;
}

function parseGeo(data) {
  if (!data || typeof data !== 'object') return {};
  const loc = data.location || {};
  const conn = data.connection || {};
  const asn = data.asn || {};
  const company = data.company || {};
  return {
    ip: clean(data.ip || data.query || data.ip_address || loc.ip),
    country: clean(data.country || data.country_name || loc.country),
    countryCode: clean(data.country_code || data.countryCode || loc.country_code).toUpperCase(),
    region: clean(data.region || data.regionName || loc.state || loc.region),
    city: clean(data.city || loc.city),
    isp: clean(conn.isp || data.isp || company.name || data.org || asn.org),
    org: clean(conn.org || data.org || company.name || asn.org),
    asn: clean(data.as || asn.asn || data.asn),
    type: clean(conn.type || company.type || data.type),
    isProxy: Boolean(data.is_proxy || data.proxy),
    isVpn: Boolean(data.is_vpn || data.vpn),
    isTor: Boolean(data.is_tor || data.tor),
    isAbuser: Boolean(data.is_abuser || data.abuser),
    isDatacenter: Boolean(data.is_datacenter || data.is_hosting || data.hosting || data.datacenter),
    risk: Number(data.risk || data.risk_score || 0) || 0
  };
}

function mergeGeo(a, b) {
  a = a || {}; b = b || {};
  return {
    ip: a.ip || b.ip || '', country: a.country || b.country || '', countryCode: a.countryCode || b.countryCode || '',
    region: a.region || b.region || '', city: a.city || b.city || '', isp: a.isp || b.isp || '', org: a.org || b.org || '',
    asn: a.asn || b.asn || '', type: a.type || b.type || '',
    isProxy: Boolean(a.isProxy || b.isProxy), isVpn: Boolean(a.isVpn || b.isVpn), isTor: Boolean(a.isTor || b.isTor),
    isAbuser: Boolean(a.isAbuser || b.isAbuser), isDatacenter: Boolean(a.isDatacenter || b.isDatacenter),
    risk: Math.max(Number(a.risk || 0), Number(b.risk || 0))
  };
}

async function getExit(policy) {
  const t = Date.now();
  const [a, b] = await Promise.all([
    firstJSON(['https://ipwho.is/?lang=zh-CN&_=' + t], policy),
    firstJSON(['https://api.ipapi.is/?_=' + t], policy)
  ]);
  let out = mergeGeo(parseGeo(a), parseGeo(b));
  if (!out.ip) {
    const c = await firstJSON(['http://ip-api.com/json/?lang=zh-CN&fields=status,message,query,country,countryCode,regionName,city,isp,org,as&_=' + t], policy);
    out = mergeGeo(out, parseGeo(c));
  }
  if (out.ip) {
    const pc = await firstJSON(['https://proxycheck.io/v2/' + encodeURIComponent(out.ip) + '?vpn=1&asn=1&risk=1&time=1&_=' + t], policy);
    if (pc && pc[out.ip]) {
      const x = pc[out.ip];
      out.isProxy = out.isProxy || String(x.proxy || '').toLowerCase() === 'yes';
      out.isVpn = out.isVpn || /vpn/i.test(String(x.type || ''));
      out.risk = Math.max(out.risk, Number(x.risk || 0) || 0);
      out.isp = out.isp || clean(x.provider || x.organisation);
      out.org = out.org || clean(x.organisation || x.provider);
      out.type = out.type || clean(x.type);
    }
  }
  return out;
}

async function getDirectExit() {
  const t = Date.now();
  const j = await firstJSON([
    'http://ip-api.com/json/?lang=zh-CN&fields=status,message,query,country,countryCode,regionName,city,isp,org,as&_=' + t,
    'https://ipwho.is/?lang=zh-CN&_=' + t
  ], 'DIRECT');
  return parseGeo(j);
}

async function latencyOne(url, policy) {
  const start = Date.now();
  const r = await http('get', url + (url.indexOf('?') >= 0 ? '&' : '?') + '_=' + start, policyOpt(policy, {timeout: 4}));
  return { ok: r.success, ms: Math.max(1, Date.now() - start) };
}

async function bestLatency(urls, policy) {
  const rs = await Promise.all(urls.map(function (u) { return latencyOne(u, policy); }));
  const ok = rs.filter(function (x) { return x.ok; }).sort(function (a,b) { return a.ms-b.ms; });
  return ok.length ? ok[0] : {ok:false, ms:0};
}

async function getQuic(policy) {
  const r = await http('get', 'https://cloudflare.com/cdn-cgi/trace?_=' + Date.now(), policyOpt(policy, {timeout:5}));
  if (!r.success) return {value:'×/×', ok:false};
  const m = String(r.data).match(/(?:^|\n)http=([^\n]+)/i);
  const proto = m ? clean(m[1]).toLowerCase() : '';
  if (proto.indexOf('h3') >= 0 || proto.indexOf('http/3') >= 0) return {value:'✓/✓', ok:true};
  return {value:'×/✓', ok:true};
}

function parseIPv4(ip) {
  const p = clean(ip).split('.'); if (p.length !== 4) return null;
  const n = p.map(Number); return n.every(function(v){return Number.isInteger(v)&&v>=0&&v<=255;}) ? n : null;
}
function private4(ip) { const p=parseIPv4(ip); return !!p && (p[0]===10 || (p[0]===172&&p[1]>=16&&p[1]<=31) || (p[0]===192&&p[1]===168)); }
function cgnat4(ip) { const p=parseIPv4(ip); return !!p && p[0]===100 && p[1]>=64 && p[1]<=127; }
function public4(ip) { const p=parseIPv4(ip); return !!p && !private4(ip) && !cgnat4(ip) && p[0]!==0 && p[0]!==127 && p[0]<224 && !(p[0]===169&&p[1]===254); }
function natLabel(localIP, exitIP) {
  if (cgnat4(localIP)) return 'CGNAT';
  if (private4(localIP) && public4(exitIP)) return 'Open';
  if (public4(localIP)) return 'Open';
  if (private4(localIP)) return 'NAT';
  return '未知';
}

function dnsName(dns) {
  const list = Array.isArray(dns) ? dns.map(clean) : [];
  const table = [
    ['Cloudflare','1.1.1.1','1.0.0.1','2606:4700:4700::1111'],
    ['Google','8.8.8.8','8.8.4.4','2001:4860:4860::8888'],
    ['Quad9','9.9.9.9','149.112.112.112'],
    ['AliDNS','223.5.5.5','223.6.6.6','2400:3200::1'],
    ['DNSPod','119.29.29.29','119.28.28.28','2402:4e00::'],
    ['114DNS','114.114.114.114','114.114.115.115'],
    ['AdGuard','94.140.14.14','94.140.15.15']
  ];
  for (let i=0;i<table.length;i++) {
    for (let j=0;j<list.length;j++) {
      if (table[i].slice(1).some(function(x){return list[j]===x || list[j].indexOf(x)===0;})) return table[i][0];
    }
  }
  return list.length ? list[0] : '系统';
}

function classify(exit) {
  const t = (clean(exit.type) + ' ' + clean(exit.isp) + ' ' + clean(exit.org)).toLowerCase();
  if (/mobile|cellular|wireless|cmcc|cmi|移动/.test(t)) return '移动网络';
  if (exit.isDatacenter || /hosting|datacenter|cloud|server|vps|amazon|google cloud|azure|oracle/.test(t)) return '商业机房';
  if (/residential|broadband|cable|telecom|unicom|chinanet|宽带|电信|联通/.test(t)) return '住宅 IP';
  return '普通网络';
}

function purity(exit) {
  const kind = classify(exit);
  let score = kind === '住宅 IP' || kind === '移动网络' ? 92 : kind === '商业机房' ? 76 : 84;
  if (exit.isProxy) score -= 14;
  if (exit.isVpn) score -= 12;
  if (exit.isTor) score -= 35;
  if (exit.isAbuser) score -= 18;
  score -= Math.round(clamp(Number(exit.risk || 0),0,100) * 0.18);
  score = clamp(score, 5, 99);
  const risk = score >= 80 && Number(exit.risk||0) < 30 && !exit.isProxy && !exit.isVpn && !exit.isTor ? '低风险' :
               score >= 55 && Number(exit.risk||0) < 65 && !exit.isTor ? '中风险' : '高风险';
  return {score:score, risk:risk, kind:kind};
}

async function serviceCheck(name, url, policy, cc) {
  const start = Date.now();
  const r = await http('get', url + (url.indexOf('?')>=0?'&':'?') + '_=' + start, policyOpt(policy, {timeout:5}));
  return {name:name, ok:r.ok, status:r.status, ms:Date.now()-start, countryCode:cc || ''};
}

async function buildData(args) {
  const policy = clean(args.POLICY);
  const mediaPolicy = policy || clean(args.LMT);
  const aiPolicy = policy || clean(args.AI);
  const xy = clean(args.XY) || '未指定';
  const n = typeof $network === 'object' && $network ? $network : {};
  const wifi = n.wifi || {};
  const v4 = n.v4 || {};
  const v6 = n.v6 || {};
  const cell = n['cellular-data'] || {};
  const localIP = clean(v4.primaryAddress) || '未获取';
  const gateway = clean(v4.primaryRouter) || '未获取';
  const networkName = clean(wifi.ssid) || clean(cell.carrier) || '移动数据';
  const dns = dnsName(n.dns || []);

  const [exit, directExit, proxyLatency, localLatency, quic] = await Promise.all([
    getExit(policy),
    getDirectExit(),
    bestLatency(['https://cp.cloudflare.com/generate_204','https://www.gstatic.com/generate_204','https://www.cloudflare.com/favicon.ico'], policy),
    bestLatency(['http://connect.rom.miui.com/generate_204','http://wifi.vivo.com.cn/generate_204','https://www.baidu.com/favicon.ico'], 'DIRECT'),
    getQuic(policy)
  ]);

  let mediaExit = exit, aiExit = exit;
  if (mediaPolicy && mediaPolicy !== policy) mediaExit = await getExit(mediaPolicy);
  if (aiPolicy && aiPolicy !== policy && aiPolicy !== mediaPolicy) aiExit = await getExit(aiPolicy);
  else if (aiPolicy && aiPolicy === mediaPolicy) aiExit = mediaExit;

  const mediaDefs = [
    ['Netflix','https://www.netflix.com/title/81215567'], ['Disney+','https://www.disneyplus.com/'],
    ['Spotify','https://open.spotify.com/'], ['TikTok','https://www.tiktok.com/'],
    ['YouTube','https://www.youtube.com/'], ['Prime','https://www.primevideo.com/']
  ];
  const aiDefs = [
    ['ChatGPT','https://chatgpt.com/'], ['Claude','https://claude.ai/'], ['Gemini','https://gemini.google.com/'],
    ['DeepSeek','https://chat.deepseek.com/'], ['Grok','https://grok.com/'], ['Perplexity','https://www.perplexity.ai/']
  ];
  const [media, ai] = await Promise.all([
    Promise.all(mediaDefs.map(function(d){return serviceCheck(d[0],d[1],mediaPolicy,mediaExit.countryCode);})),
    Promise.all(aiDefs.map(function(d){return serviceCheck(d[0],d[1],aiPolicy,aiExit.countryCode);})),
  ]);
  const p = purity(exit);
  return {
    ts:Date.now(), networkName:networkName, localIP:localIP, gateway:gateway,
    hasV4:!!clean(v4.primaryAddress), hasV6:!!clean(v6.primaryAddress), dns:dns,
    directExit:directExit, exit:exit, proxyLatency:proxyLatency, localLatency:localLatency, quic:quic,
    nat:natLabel(localIP, exit.ip), purity:p, protocol:xy, policy:policy || '默认规则',
    mediaPolicy:mediaPolicy || '默认规则', aiPolicy:aiPolicy || '默认规则', media:media, ai:ai
  };
}

function serviceLines(items) {
  return items.map(function(x){
    const reg = x.countryCode ? flag(x.countryCode) + ' ' + x.countryCode : '🌐';
    return (x.ok ? '●' : '○') + ' ' + x.name + '  ' + reg + '  ' + (x.ok ? 'OK' : '失败');
  }).join('\n');
}

function render(data, args) {
  const view = clean(args.view || 'overview').toLowerCase();
  const mask = clean(args.YS) === '1';
  const ip = mask ? maskIP(data.exit.ip) : data.exit.ip;
  const lip = mask ? maskIP(data.localIP) : data.localIP;
  const city = clean(data.exit.city) || clean(data.exit.country) || '未知地区';
  const localArea = clean(data.directExit.city) || clean(data.directExit.region) || clean(data.directExit.country) || '中国大陆';
  const kind = data.purity.kind;

  if (view === 'media') {
    const passed = data.media.filter(function(x){return x.ok;}).length;
    return {
      title:'流媒体解锁  ' + passed + '/' + data.media.length,
      content:'策略：' + data.mediaPolicy + '\n' + serviceLines(data.media) + '\n────────────\n更新：' + nowText(),
      icon:'play.rectangle.fill', 'icon-color': passed === data.media.length ? '#34C759' : '#FF9500'
    };
  }
  if (view === 'ai') {
    const passed = data.ai.filter(function(x){return x.ok;}).length;
    return {
      title:'AI 解锁检测  ' + passed + '/' + data.ai.length,
      content:'策略：' + data.aiPolicy + '\n' + serviceLines(data.ai) + '\n────────────\n更新：' + nowText(),
      icon:'sparkles', 'icon-color': passed === data.ai.length ? '#34C759' : '#AF52DE'
    };
  }

  const lines = [
    '📶 本地网络  ' + data.networkName,
    'IP ' + lip + '  ·  ' + flag(data.directExit.countryCode || 'CN') + ' ' + localArea,
    '网关 ' + data.gateway + '  ·  直连 ' + (data.localLatency.ok ? data.localLatency.ms + 'ms' : '失败'),
    'IPv4/IPv6 ' + statusMark(data.hasV4) + '/' + statusMark(data.hasV6) + '  ·  DNS ' + data.dns,
    '────────────',
    '🛰 当前代理  ' + flag(data.exit.countryCode) + ' ' + city,
    (ip || '未识别') + '  ·  ' + (data.exit.isp || data.exit.org || '未知 ISP'),
    kind + '  ·  ' + (data.proxyLatency.ok ? '连接正常 ' + data.proxyLatency.ms + 'ms' : '检测失败'),
    'NAT ' + data.nat + '  ·  UDP/QUIC ' + data.quic.value + '  ·  协议 ' + data.protocol,
    '纯净 ' + data.purity.score + '分  ·  ' + data.purity.risk,
    '────────────',
    '策略：' + data.policy + '  ·  更新：' + nowText()
  ];
  const color = data.purity.risk === '低风险' ? '#34C759' : data.purity.risk === '中风险' ? '#FF9500' : '#FF453A';
  return { title:'网络诊断雷达', content:lines.join('\n'), icon:'dot.radiowaves.left.and.right', 'icon-color':color };
}

(async function(){
  const args = parseArgs(typeof $argument === 'undefined' ? '' : $argument);
  const cacheMinutes = Math.max(0, Number(args.CACHE_MINUTES || 2) || 2);
  const key = 'network_radar_' + hashString([args.POLICY,args.LMT,args.AI,args.XY,args.YS].join('|'));
  let data = null;
  try {
    const s = $persistentStore.read(key);
    if (s) {
      const c = JSON.parse(s);
      if (c && c.ts && (Date.now() - c.ts) <= cacheMinutes * 60000) data = c;
    }
  } catch (_) {}

  try {
    if (!data) {
      data = await buildData(args);
      try { $persistentStore.write(JSON.stringify(data), key); } catch (_) {}
    }
    $done(render(data, args));
  } catch (e) {
    $done({
      title:'网络诊断雷达',
      content:'诊断失败\n' + (e && e.message ? e.message : String(e)) + '\n\n请检查网络后手动刷新。',
      style:'error'
    });
  }
})();
