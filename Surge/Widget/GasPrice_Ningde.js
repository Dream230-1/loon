/**
 * 宁德今日油价 - Surge Information Panel
 * Data: Sinopec Sales public oil-price endpoint
 * Reference logic: jnlaoshu/MySelf Egern GasPrice.js
 *
 * Default region: 福建(35) / 宁德
 * Surge: type=generic + [Panel]
 */

const BASE = "https://cx.sinopecsales.com/yjkqiantai";
const PREDICTION_BASE = "http://m.qiyoujiage.com";

const PROVINCES = {
  "11":"北京","12":"天津","13":"河北","14":"山西","15":"内蒙古",
  "21":"辽宁","22":"吉林","23":"黑龙江","31":"上海","32":"江苏",
  "33":"浙江","34":"安徽","35":"福建","36":"江西","37":"山东",
  "41":"河南","42":"湖北","43":"湖南","44":"广东","45":"广西",
  "46":"海南","50":"重庆","51":"四川","52":"贵州","53":"云南",
  "54":"西藏","61":"陕西","62":"甘肃","63":"青海","64":"宁夏","65":"新疆"
};

const PREDICTION_SLUGS = {
  "11":"beijing","12":"tianjin","13":"hebei","14":"shanxi","15":"neimenggu",
  "21":"liaoning","22":"jilin","23":"heilongjiang","31":"shanghai","32":"jiangsu",
  "33":"zhejiang","34":"anhui","35":"fujian","36":"jiangxi","37":"shandong",
  "41":"henan","42":"hubei","43":"hunan","44":"guangdong","45":"guangxi",
  "46":"hainan","50":"chongqing","51":"sichuan","52":"guizhou","53":"yunnan",
  "54":"xizang","61":"shanxi-3","62":"gansu","63":"qinghai","64":"ningxia","65":"xinjiang"
};

const FUEL_DEFS = [
  { rawKey: "GAS_92", label: "92# 汽油", key: "GAS_92" },
  { rawKey: "GAS_95", label: "95# 汽油", key: "GAS_95" },
  { rawKey: "GAS_98", label: "98# 汽油", key: "GAS_98", fallbackRawKey: "AIPAO98", fallbackKey: "AIPAO_GAS_98" },
  { rawKey: "CHAI_0", label: "0# 柴油", key: "CHECHAI_0" }
];

const ADJUST_CALENDARS = {
  2026: [
    [1,12],[1,23],[2,9],[2,23],[3,9],[3,23],[4,7],[4,21],[5,8],[5,22],
    [6,5],[6,19],[7,3],[7,17],[7,31],[8,14],[8,28],[9,11],[9,24],
    [10,14],[10,28],[11,11],[11,25],[12,9],[12,23]
  ]
};

const DEFAULT_ICON = "fuelpump.circle.fill";
const DEFAULT_COLOR = "#F5A623";

function parseArgs(raw) {
  const out = {};
  String(raw || "").split("&").forEach(pair => {
    if (!pair) return;
    const idx = pair.indexOf("=");
    const k = idx >= 0 ? pair.slice(0, idx) : pair;
    const v = idx >= 0 ? pair.slice(idx + 1) : "";
    try {
      out[decodeURIComponent(k)] = decodeURIComponent(v.replace(/\+/g, "%20"));
    } catch (_) {
      out[k] = v;
    }
  });
  return out;
}

function normalizeProvince(value) {
  const raw = String(value || "").trim();
  if (!raw) return "35";
  if (PROVINCES[raw]) return raw;
  const cleaned = raw.replace(/省|市|壮族自治区|回族自治区|维吾尔自治区|自治区/g, "");
  const hit = Object.keys(PROVINCES).find(code => {
    const name = PROVINCES[code];
    return name === cleaned || name.includes(cleaned) || cleaned.includes(name);
  });
  return hit || raw;
}

function normalizeRegionName(value) {
  return String(value || "")
    .replace(/\s+/g, "")
    .replace(/特别行政区|自治州|自治县|地区|盟|市|县|区$/g, "")
    .trim();
}

function areaDisplayName(area) {
  const c = (area && area.areaCheck) || {};
  return c.AREA_NAME || c.CITY_NAME || area?.areaName || c.PROVINCE_NAME || "";
}

function findArea(data, cityName) {
  const areas = (data && data.area) || [];
  if (!areas.length || !cityName) return null;

  const target = normalizeRegionName(cityName);
  let idx = areas.findIndex(a => normalizeRegionName(areaDisplayName(a)) === target);

  if (idx < 0) {
    idx = areas.findIndex(a => {
      const n = normalizeRegionName(areaDisplayName(a));
      return n && target && (n.includes(target) || target.includes(n));
    });
  }

  if (idx < 0) return null;
  return { index: idx, name: areaDisplayName(areas[idx]), item: areas[idx] };
}

function http(method, options) {
  return new Promise((resolve, reject) => {
    $httpClient[method](options, (error, response, data) => {
      if (error) return reject(new Error(error));
      const status = Number(response && response.status);
      if (status && (status < 200 || status >= 400)) {
        return reject(new Error("HTTP " + status));
      }
      resolve({ response: response || {}, data: String(data || "") });
    });
  });
}

function parseJSON(text, label) {
  try {
    return JSON.parse(text);
  } catch (_) {
    throw new Error((label || "接口") + "返回非 JSON 数据");
  }
}

async function loadOilData(provinceCode) {
  const commonHeaders = {
    "Accept": "application/json, text/plain, */*",
    "User-Agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148",
    "Referer": BASE + "/index.html",
    "Origin": "https://cx.sinopecsales.com"
  };

  const init = await http("get", {
    url: BASE + "/data/initMainData",
    headers: commonHeaders,
    timeout: 10,
    "auto-cookie": true
  });
  const initJSON = parseJSON(init.data, "中石化初始化接口");

  const switched = await http("post", {
    url: BASE + "/data/switchProvince",
    headers: Object.assign({}, commonHeaders, { "Content-Type": "application/json;charset=UTF-8" }),
    body: JSON.stringify({ provinceId: String(provinceCode) }),
    timeout: 10,
    "auto-cookie": true
  });
  const switchedJSON = parseJSON(switched.data, "中石化省份接口");

  const history = await http("get", {
    url: BASE + "/data/initOilPrice",
    headers: commonHeaders,
    timeout: 10,
    "auto-cookie": true
  });
  const historyJSON = parseJSON(history.data, "中石化历史油价接口");

  const switchedData = (switchedJSON && switchedJSON.data) || {};
  const current = (switchedData.area || switchedData.provinceData || switchedData.provinceCheck)
    ? switchedJSON
    : initJSON;

  return { current, history: historyJSON };
}

function selectCurrentRegion(currentJSON, provinceCode, cityName) {
  const data = (currentJSON && currentJSON.data) || currentJSON || {};
  const areaMatch = findArea(data, cityName);

  if (areaMatch) {
    return {
      matchedCity: true,
      index: areaMatch.index,
      regionName: areaMatch.name || cityName,
      provinceName: areaMatch.item?.areaCheck?.PROVINCE_NAME || PROVINCES[provinceCode] || String(provinceCode),
      check: areaMatch.item?.areaCheck || {},
      values: areaMatch.item?.areaData || {}
    };
  }

  return {
    matchedCity: false,
    index: -1,
    regionName: PROVINCES[provinceCode] || String(provinceCode),
    provinceName: (data.provinceCheck && data.provinceCheck.PROVINCE_NAME) || PROVINCES[provinceCode] || String(provinceCode),
    check: data.provinceCheck || {},
    values: data.provinceData || {}
  };
}

function selectHistorySeries(historyJSON, currentRegion, cityName) {
  const data = (historyJSON && historyJSON.data) || historyJSON || {};
  if (currentRegion.matchedCity && Array.isArray(data.area)) {
    const target = normalizeRegionName(currentRegion.regionName || cityName);
    let match = data.area.find(a => normalizeRegionName(areaDisplayName(a)) === target);
    if (!match) {
      match = data.area.find(a => {
        const n = normalizeRegionName(areaDisplayName(a));
        return n && target && (n.includes(target) || target.includes(n));
      });
    }
    if (!match && currentRegion.index >= 0 && data.area[currentRegion.index]) {
      match = data.area[currentRegion.index];
    }
    if (match && Array.isArray(match.areaData)) return match.areaData;
  }
  return Array.isArray(data.provinceData) ? data.provinceData : [];
}

function enabled(check, rawKey) {
  if (!check || typeof check !== "object") return true;
  if (check[rawKey] == null) return true;
  return String(check[rawKey]).toUpperCase() === "Y";
}

function buildFuelItem(def, check, values, historyRows) {
  let rawKey = def.rawKey;
  let key = def.key;

  if ((!enabled(check, rawKey) || values?.[key] == null) && def.fallbackRawKey) {
    rawKey = def.fallbackRawKey;
    key = def.fallbackKey;
  }

  if (!enabled(check, rawKey)) return { label: def.label, price: null, offset: null, series: [] };

  const priceNum = Number(values?.[key]);
  const offsetNum = Number(values?.[key + "_STATUS"]);
  const series = (historyRows || [])
    .map(row => Number(row && row[key]))
    .filter(Number.isFinite)
    .reverse();

  return {
    label: def.label,
    price: Number.isFinite(priceNum) ? priceNum : null,
    offset: Number.isFinite(offsetNum) ? offsetNum : null,
    series
  };
}

function pad2(n) {
  return String(n).padStart(2, "0");
}

function nextAdjustment(now) {
  const year = now.getFullYear();
  const calendar = ADJUST_CALENDARS[year];
  if (!calendar) {
    return { known: false, dateText: "待更新", countdownText: "", urgent: false };
  }

  const next = calendar.find(([m, d]) => new Date(year, m - 1, d, 23, 59, 59).getTime() > now.getTime());
  if (!next) {
    return { known: false, dateText: "待更新", countdownText: "", urgent: false };
  }

  const target = new Date(year, next[0] - 1, next[1], 23, 59, 59);
  const minutes = Math.max(0, Math.floor((target.getTime() - now.getTime()) / 60000));
  const days = Math.floor(minutes / 1440);
  const hours = Math.floor((minutes % 1440) / 60);
  const mins = minutes % 60;
  const countdownText = days > 0 ? `${days}天${hours}小时后` : `${hours}小时${mins}分钟后`;

  return {
    known: true,
    target,
    dateText: `${pad2(next[0])}.${pad2(next[1])} 24:00`,
    countdownText,
    urgent: minutes <= 72 * 60,
    minutes
  };
}

async function loadPrediction(provinceCode) {
  const slug = PREDICTION_SLUGS[provinceCode];
  if (!slug) return null;

  const result = await http("get", {
    url: `${PREDICTION_BASE}/${slug}.shtml`,
    headers: {
      "Accept": "text/html,application/xhtml+xml,*/*",
      "User-Agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148"
    },
    timeout: 8
  });

  const html = result.data || "";
  if (/预计(?:油价)?(?:搁浅|不作?调整|停滞)/.test(html)) return { flat: true };

  let m = html.match(/预计(上调|下调|上涨|下跌)(?:油价)?[\d.]+元\/吨\((\d+(?:\.\d+)?)元\/升(?:[-~至](\d+(?:\.\d+)?)元\/升)?\)/);
  if (!m) m = html.match(/(上涨|上调|下调|下跌)(?:油价)?(\d+(?:\.\d+)?)元\/升(?:[-~至](\d+(?:\.\d+)?)元\/升)?/);
  if (!m) return null;

  const min = Number(m[2]);
  const max = m[3] ? Number(m[3]) : min;
  if (!Number.isFinite(min) || !Number.isFinite(max)) return null;

  return {
    flat: false,
    up: m[1] === "上调" || m[1] === "上涨",
    min,
    max
  };
}

function formatDelta(offset) {
  if (!Number.isFinite(offset)) return "—";
  if (offset > 0) return `↑${offset.toFixed(2)}`;
  if (offset < 0) return `↓${Math.abs(offset).toFixed(2)}`;
  return "→0.00";
}

function formatPrice(price) {
  return Number.isFinite(price) ? `¥${price.toFixed(2)}/L` : "--";
}

function buildTrend(items) {
  const vals = items.map(x => x.offset).filter(v => Number.isFinite(v) && v !== 0);
  if (!vals.length) return null;

  const sum = vals.reduce((a, b) => a + b, 0);
  const up = sum >= 0;
  const abs = vals.map(Math.abs);
  const min = Math.min.apply(null, abs);
  const max = Math.max.apply(null, abs);
  const range = Math.abs(min - max) < 0.0001 ? min.toFixed(2) : `${min.toFixed(2)}-${max.toFixed(2)}`;

  return `${up ? "↑" : "↓"} ${range} 元/L`;
}

function timestamp(now) {
  return `${pad2(now.getMonth() + 1)}.${pad2(now.getDate())} ${pad2(now.getHours())}:${pad2(now.getMinutes())}`;
}

(async () => {
  const args = parseArgs(typeof $argument !== "undefined" ? $argument : "");
  const provinceCode = normalizeProvince(args.province || "35");
  const cityName = String(args.city || "宁德").trim();
  const customTitle = String(args.title || "").trim();
  const icon = String(args.icon || DEFAULT_ICON).trim() || DEFAULT_ICON;
  const color = String(args.color || DEFAULT_COLOR).trim() || DEFAULT_COLOR;
  const predictDays = Math.max(0, Number(args.predict_days || 3) || 3);
  const now = new Date();
  const next = nextAdjustment(now);

  try {
    const { current, history } = await loadOilData(provinceCode);
    const region = selectCurrentRegion(current, provinceCode, cityName);
    const historyRows = selectHistorySeries(history, region, cityName);
    const fuels = FUEL_DEFS.map(def => buildFuelItem(def, region.check, region.values, historyRows));

    let title;
    if (customTitle) {
      title = customTitle;
    } else if (region.matchedCity) {
      title = `${region.regionName || cityName}今日油价`;
    } else {
      title = `${region.provinceName || PROVINCES[provinceCode] || "今日"}油价`;
    }

    const lines = [];
    if (!region.matchedCity && cityName) {
      lines.push(`⚠️ 未匹配到“${cityName}”，当前显示${region.provinceName || "省级"}数据`);
      lines.push("");
    }

    fuels.forEach(item => {
      lines.push(`${item.label}  ${formatPrice(item.price)}  ${formatDelta(item.offset)}`);
    });

    let trendLabel = "较上次调整";
    let trendText = buildTrend(fuels);

    const urgentWindow = next.known && next.minutes <= predictDays * 1440;
    if (urgentWindow) {
      try {
        const prediction = await loadPrediction(provinceCode);
        if (prediction) {
          trendLabel = "下轮预测";
          if (prediction.flat) {
            trendText = "搁浅 / 暂不调整";
          } else {
            const range = Math.abs(prediction.min - prediction.max) < 0.0001
              ? prediction.min.toFixed(2)
              : `${prediction.min.toFixed(2)}-${prediction.max.toFixed(2)}`;
            trendText = `${prediction.up ? "↑" : "↓"} ${range} 元/L`;
          }
        }
      } catch (e) {
        console.log("调价预测获取失败: " + (e && e.message ? e.message : e));
      }
    }

    lines.push("");
    if (trendText) lines.push(`${trendLabel}：${trendText}`);
    lines.push(`下轮调价：${next.dateText}${next.countdownText ? `（${next.countdownText}）` : ""}`);
    lines.push(`更新：${timestamp(now)}  ·  数据：中石化`);

    $done({
      title,
      content: lines.join("\n"),
      icon,
      "icon-color": color
    });
  } catch (e) {
    const msg = e && e.message ? e.message : String(e);
    console.log("宁德今日油价加载失败: " + msg);
    $done({
      title: customTitle || "宁德今日油价",
      content: `油价数据加载失败\n${msg}\n\n请检查网络后在面板中手动刷新。`,
      style: "error"
    });
  }
})();
