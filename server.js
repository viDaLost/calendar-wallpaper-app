const express = require('express');
const path = require('path');
const sharp = require('sharp');
const { Resvg } = require('@resvg/resvg-js');
const dayjs = require('dayjs');
const utc = require('dayjs/plugin/utc');
const isLeapYear = require('dayjs/plugin/isLeapYear');
const weekOfYear = require('dayjs/plugin/weekOfYear');
const advancedFormat = require('dayjs/plugin/advancedFormat');
const fs = require('fs');
const https = require('https');

dayjs.extend(utc);
dayjs.extend(isLeapYear);
dayjs.extend(weekOfYear);
dayjs.extend(advancedFormat);

const app = express();
const PORT = process.env.PORT || 3000;

// Кеш для оптимизации нагрузки на Vercel
const pngCache = new Map();
const cacheSweepTimer = setInterval(() => pngCache.clear(), 1000 * 60 * 60);
if (cacheSweepTimer.unref) cacheSweepTimer.unref();

const RENDER_VERSION = 'v8-wttr-weather';

const FONTS = {
  inter: { name: 'Inter (Стандарт)', file: 'inter.ttf', family: 'Inter' },
  montserrat: { name: 'Montserrat (Геометрия)', file: 'montserrat.ttf', family: 'Montserrat' },
  roboto_mono: { name: 'Roboto Mono (Код)', file: 'roboto-mono.ttf', family: 'Roboto Mono' },
  playfair: { name: 'Playfair Display (Журнал)', file: 'playfair.ttf', family: 'Playfair Display' },
  comfortaa: { name: 'Comfortaa (Круглый)', file: 'comfortaa.ttf', family: 'Comfortaa' },
  jura: { name: 'Jura (Футуристичный)', file: 'jura.ttf', family: 'Jura' },
  caveat: { name: 'Caveat (Рукописный)', file: 'caveat.ttf', family: 'Caveat' },
  russo_one: { name: 'Russo One (Плакатный)', file: 'russo-one.ttf', family: 'Russo One' },
  lora: { name: 'Lora (Книжный)', file: 'lora.ttf', family: 'Lora' },
  ubuntu: { name: 'Ubuntu (Мягкий)', file: 'ubuntu.ttf', family: 'Ubuntu' }
};

const fontCache = {};
const fontsDir = path.join(__dirname, 'fonts');
if (fs.existsSync(fontsDir)) {
  for (const [key, fontDef] of Object.entries(FONTS)) {
    const fontPath = path.join(fontsDir, fontDef.file);
    if (fs.existsSync(fontPath)) {
      fontCache[key] = fs.readFileSync(fontPath).toString('base64');
    }
  }
}

const PHONE_PRESETS = {
  iphone_se_1: { label: 'iPhone SE (1-е пок.)', width: 640, height: 1136, family: 'SE / Классика' },
  iphone_8: { label: 'iPhone 8 / 7 / 6s', width: 750, height: 1334, family: 'Классика' },
  iphone_8_plus: { label: 'iPhone 8 Plus / 7 Plus', width: 1080, height: 1920, family: 'Классика Плюс' },
  iphone_se_2: { label: 'iPhone SE (2/3-е пок.)', width: 750, height: 1334, family: 'SE' },
  iphone_x: { label: 'iPhone X / XS / 11 Pro', width: 1125, height: 2436, family: 'Face ID 5.8"' },
  iphone_xr: { label: 'iPhone XR / 11', width: 828, height: 1792, family: 'Liquid Retina 6.1"' },
  iphone_xs_max: { label: 'iPhone XS Max / 11 Pro Max', width: 1242, height: 2688, family: 'Max 6.5"' },
  iphone_12_mini: { label: 'iPhone 12/13 mini', width: 1080, height: 2340, family: 'mini' },
  iphone_12: { label: 'iPhone 12/13/14 / Pro', width: 1170, height: 2532, family: '6.1"' },
  iphone_12_pro_max: { label: 'iPhone 12/13 Pro Max / 14 Plus', width: 1284, height: 2778, family: 'Крупный 6.7"' },
  iphone_14_pro: { label: 'iPhone 14 Pro', width: 1179, height: 2556, family: 'Pro 6.1"' },
  iphone_14_pro_max: { label: 'iPhone 14 Pro Max', width: 1290, height: 2796, family: 'Pro Max 6.7"' },
  iphone_15: { label: 'iPhone 15', width: 1179, height: 2556, family: '6.1"' },
  iphone_15_plus: { label: 'iPhone 15 Plus', width: 1290, height: 2796, family: '6.7"' },
  iphone_15_pro: { label: 'iPhone 15 Pro', width: 1179, height: 2556, family: 'Pro 6.1"' },
  iphone_15_pro_max: { label: 'iPhone 15 Pro Max', width: 1290, height: 2796, family: 'Pro Max 6.7"' },
  iphone_16: { label: 'iPhone 16', width: 1179, height: 2556, family: '6.1" новый' },
  iphone_16_plus: { label: 'iPhone 16 Plus', width: 1290, height: 2796, family: '6.7" новый' },
  iphone_16_pro: { label: 'iPhone 16 Pro', width: 1206, height: 2622, family: 'Pro 6.3"' },
  iphone_16_pro_max: { label: 'iPhone 16 Pro Max', width: 1320, height: 2868, family: 'Pro Max 6.9"' },
  iphone_17: { label: 'iPhone 17', width: 1206, height: 2622, family: '6.3"' },
  iphone_air: { label: 'iPhone Air', width: 1260, height: 2736, family: 'Air 6.5"' },
  iphone_17_pro: { label: 'iPhone 17 Pro', width: 1206, height: 2622, family: 'Pro 6.3"' },
  iphone_17_pro_max: { label: 'iPhone 17 Pro Max', width: 1320, height: 2868, family: 'Pro Max 6.9"' },
  custom: { label: 'Свой размер', width: 1179, height: 2556, family: 'Custom' }
};

const THEMES = {
  graphite_orange: { name: 'Графит и Оранж', bg: '#0a0d12', panel: '#131823', text: '#edf2ff', muted: '#8994a7', accent: '#ff8f2d', accent2: '#ffbc6f', weekend: '#ff8f7b' },
  obsidian_blue: { name: 'Обсидиан и Синий', bg: '#07111e', panel: '#0d1726', text: '#eef6ff', muted: '#92abc9', accent: '#5db6ff', accent2: '#a7dcff', weekend: '#86b4ff' },
  frost_light: { name: 'Светлый Иней', bg: '#edf4ff', panel: '#dfe8f7', text: '#1e2d41', muted: '#73839a', accent: '#3b7bff', accent2: '#7ea6ff', weekend: '#5b88ff' },
  violet_night: { name: 'Фиолетовая Ночь', bg: '#110c18', panel: '#1a1325', text: '#f6efff', muted: '#b29fc9', accent: '#9d72ff', accent2: '#ceb8ff', weekend: '#d09cff' },
  olive_linen: { name: 'Оливковый Лен', bg: '#161812', panel: '#202419', text: '#f3f4ea', muted: '#a5aa95', accent: '#b4c86a', accent2: '#dbe8a1', weekend: '#c7ad86' },
  rose_sunset: { name: 'Розовый Закат', bg: '#1b1014', panel: '#291920', text: '#fff0f5', muted: '#c2a4af', accent: '#ff6d96', accent2: '#ffb1c4', weekend: '#ff9f90' },
  oled_gold: { name: 'OLED Золото', bg: '#000000', panel: '#0a0a0a', text: '#fff7df', muted: '#a39063', accent: '#ffc44e', accent2: '#ffe49a', weekend: '#ffd07b' },
  mint_air: { name: 'Мятный Воздух', bg: '#0a1512', panel: '#10211c', text: '#ebfff8', muted: '#8db4a8', accent: '#57d2ab', accent2: '#aef2da', weekend: '#88e0ca' },
  sapphire_ink: { name: 'Сапфировые чернила', bg: '#050814', panel: '#0c1630', text: '#edf3ff', muted: '#8ea5d3', accent: '#6da8ff', accent2: '#a8c7ff', weekend: '#89b0ff' },
  copper_noir: { name: 'Медный нуар', bg: '#0b0908', panel: '#181311', text: '#fff1e8', muted: '#b59a8a', accent: '#d9814f', accent2: '#f0b08b', weekend: '#d7a47d' },
  emerald_smoke: { name: 'Изумрудный дым', bg: '#081311', panel: '#10211e', text: '#ecfff7', muted: '#89b7aa', accent: '#4ec9a2', accent2: '#93edd0', weekend: '#74d7b8' },
  pearl_mist: { name: 'Жемчужный туман', bg: '#f5f4f2', panel: '#ebe8e3', text: '#2a2a2a', muted: '#7a7a7a', accent: '#6d8cff', accent2: '#9fb2ff', weekend: '#8c77ff' },
  ruby_velvet: { name: 'Рубиновый бархат', bg: '#12070b', panel: '#220d15', text: '#ffeef3', muted: '#c8a1ad', accent: '#ff5a7c', accent2: '#ff9db4', weekend: '#ff8d9f' },
  moon_silver: { name: 'Лунное серебро', bg: '#0d1118', panel: '#161c27', text: '#f0f4fb', muted: '#99a4b7', accent: '#c8d2e5', accent2: '#eef3ff', weekend: '#b7c3da' },
  anomaly_zone: { name: 'Зов аномалии', bg: '#1a1c17', panel: '#24261f', text: '#d9d4a8', muted: '#8a8d7a', accent: '#ff7300', accent2: '#e59e5c', weekend: '#ff5050' },
  eden_light: { name: 'Свет Эдема', bg: '#fdfbf7', panel: '#f0ece1', text: '#1b2419', muted: '#72826d', accent: '#d4af37', accent2: '#e6cc80', weekend: '#c74b4b' },
  syndicate: { name: 'Синдикат (Неон)', bg: '#050505', panel: '#121212', text: '#e0e0e0', muted: '#666666', accent: '#fcee0a', accent2: '#00f0ff', weekend: '#ff003c' },
  neon_cyberpunk: { name: 'Неоновый киберпанк', bg: '#090014', panel: '#150030', text: '#00ffcc', muted: '#b300ff', accent: '#ff0055', accent2: '#00ffcc', weekend: '#ff0055' },
  pastel_dream: { name: 'Пастельная мечта', bg: '#fdfbfb', panel: '#f4eff4', text: '#5c5c70', muted: '#a5a5b4', accent: '#ffb3ba', accent2: '#baffc9', weekend: '#ffdfba' },
  vintage_sepia: { name: 'Винтажная сепия', bg: '#e4d5b7', panel: '#d5c4a1', text: '#5c4b37', muted: '#8f7d65', accent: '#a83c09', accent2: '#3f5721', weekend: '#c44512' },
  arctic_aurora: { name: 'Арктическая аврора', bg: '#021019', panel: '#0a1d2e', text: '#e0f7fa', muted: '#6f9da8', accent: '#00e5ff', accent2: '#1de9b6', weekend: '#00b0ff' },
  lava_flow: { name: 'Магмовый поток', bg: '#170404', panel: '#2a0808', text: '#ffddcc', muted: '#a85b4b', accent: '#ff3300', accent2: '#ff8800', weekend: '#ff0033' }
};

const BG_STYLES = {
  mesh_organic: 'Органический Mesh',
  liquid_glass: 'Жидкое стекло (Glass)',
  paper: 'Пергамент / Бумага (Paper)',
  stone: 'Камень / Бетон (Stone)',
  metal: 'Шлифованный металл (Metal)',
  carbon: 'Карбон / Сетка (Carbon)',
  topography: 'Топография (Topography)',
  aurora: 'Аврора (Aurora)',
  spotlight: 'Прожектор (Spotlight)',
  waves: 'Мягкие волны (Waves)',
  noir: 'Нуар (Noir)',
  bloom: 'Сияние (Bloom)',
  diagonal: 'Динамика лучей (Diagonal)',
  orbit: 'Орбиты (Orbit)',
  velvet: 'Бархат (Velvet)',
  static_noise: 'Шум эфира (Noise)',
  hexagons: 'Гексагональная сетка',
  circuit_board: 'Кибер-линии (Circuit)',
  starlight: 'Звездная пыль (Starlight)',
  watercolor: 'Акварельные пятна (Watercolor)',
  matrix: 'Цифровой дождь (Matrix)'
};

function num(v, fallback) { const n = Number(v); return Number.isFinite(n) ? n : fallback; }
function escapeXml(str) { return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;'); }
function clamp(v, min, max) { return Math.max(min, Math.min(max, v)); }
function alpha(hex, opacity) {
  const clean = hex.replace('#', '');
  if (clean.length !== 6) return hex;
  const bigint = parseInt(clean, 16);
  return `rgba(${(bigint >> 16) & 255},${(bigint >> 8) & 255},${bigint & 255},${opacity})`;
}

function normalizeQueryValue(value) {
  if (Array.isArray(value)) return value.map(normalizeQueryValue).filter(Boolean).join(',');
  if (value == null) return '';
  return String(value).trim();
}

function splitCityCandidates(value, key = '') {
  if (Array.isArray(value)) return value.flatMap((item) => splitCityCandidates(item, key));

  const raw = normalizeQueryValue(value);
  if (!raw) return [];

  const trimmed = raw.trim();

  if ((trimmed.startsWith('[') && trimmed.endsWith(']')) || (trimmed.startsWith('{') && trimmed.endsWith('}'))) {
    try {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed)) return parsed.flatMap((item) => splitCityCandidates(item, key));
      if (parsed && typeof parsed === 'object') {
        return Object.values(parsed).flatMap((item) => splitCityCandidates(item, key));
      }
    } catch (_) {}
  }

  const normalizedKey = String(key || '').toLowerCase();
  const shouldSplitComma = /cities|weathercities|weather_cities|citylist|city_list/.test(normalizedKey) || trimmed.includes('|') || trimmed.includes(';') || trimmed.includes('\n');
  const parts = shouldSplitComma ? trimmed.split(/[|;,\n]/) : [trimmed];

  return parts
    .map((item) => item.trim())
    .filter(Boolean);
}

function normalizeCityName(value) {
  const raw = normalizeQueryValue(value);
  if (!raw) return '';

  const cleaned = raw
    .replace(/^\s*(город|city)\s*[:\-]?\s*/i, '')
    .replace(/^\s*\d+\s*[\.)\-:]\s*/, '')
    .replace(/^\s*[—–-]\s*/, '')
    .trim();

  if (!cleaned) return '';

  const commaParts = cleaned.split(',').map((part) => part.trim()).filter(Boolean);
  if (commaParts.length >= 2) {
    const first = commaParts[0];
    const second = commaParts[1];
    const looksLikeCountryTail = /^(russia|russian federation|россия|ru|netherlands|nederland|nl|usa|us|uk|germany|deutschland|france|italy|spain|turkey|georgia|armenia|kazakhstan)$/i.test(second);
    return looksLikeCountryTail ? first : cleaned;
  }

  return cleaned;
}

function collectRequestedCities(query) {
  const keys = ['city1', 'city2', 'city3', 'city', 'city_1', 'city_2', 'city_3', 'weather_city', 'weatherCity', 'cities', 'weather_cities', 'weatherCities', 'cityList', 'city_list'];
  const out = [];
  const pushValue = (value, key = '') => {
    for (const part of splitCityCandidates(value, key)) {
      const city = normalizeCityName(part);
      if (city) out.push(city);
    }
  };

  keys.forEach((key) => {
    if (Object.prototype.hasOwnProperty.call(query, key)) pushValue(query[key], key);
  });

  Object.keys(query || {}).forEach((key) => {
    if (
      /^city\d+$/i.test(key) ||
      /^city_\d+$/i.test(key) ||
      /^city\[\d+\]$/i.test(key) ||
      /^weathercity\d+$/i.test(key) ||
      /^weather_city_\d+$/i.test(key) ||
      /^weathercity_\d+$/i.test(key) ||
      /^weather\[city\d+\]$/i.test(key) ||
      /(?:^|_)(city|cities)(?:$|_)/i.test(key) ||
      /weather.*city/i.test(key)
    ) {
      pushValue(query[key], key);
    }
  });

  const deduped = [];
  const seen = new Set();
  out.forEach((city) => {
    const lowered = city.toLowerCase();
    if (seen.has(lowered)) return;
    seen.add(lowered);
    deduped.push(city);
  });
  return deduped.slice(0, 3);
}

// === НОВАЯ БЕЗОПАСНАЯ ЛОГИКА ПОГОДЫ (Провайдер wttr.in) ===
const weatherCache = new Map();

function fetchJsonViaHttps(url, timeoutMs = 4000) {
  return new Promise((resolve, reject) => {
    const req = https.get(url, {
      headers: { 
        'Accept': 'application/json', 
        // wttr.in отлично работает с юзер-агентом curl, это исключает 99% блокировок
        'User-Agent': 'curl/7.68.0' 
      },
      timeout: timeoutMs,
    }, (res) => {
      let data = '';
      res.setEncoding('utf8');
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        if (res.statusCode < 200 || res.statusCode >= 300) {
          return reject(new Error(`HTTP ${res.statusCode}`));
        }
        try { 
          resolve(JSON.parse(data)); 
        } catch (e) { 
          reject(new Error('INVALID_JSON')); 
        }
      });
    });

    req.on('timeout', () => { 
      req.destroy(); 
      reject(new Error('TIMEOUT')); 
    });
    
    req.on('error', (err) => {
      reject(err);
    });
  });
}

function getWwoIcon(code) {
  const c = Number(code);
  if (c === 113) return '☀️'; // Ясно
  if (c === 116) return '⛅'; // Облачно с прояснениями
  if ([119, 122].includes(c)) return '☁️'; // Пасмурно
  if ([143, 248, 260].includes(c)) return '🌫️'; // Туман
  if ([176, 263, 266, 281, 284, 293, 296, 299, 302, 305, 308, 311, 314, 353, 356, 359].includes(c)) return '🌧️'; // Дождь
  if ([179, 182, 185, 227, 230, 317, 320, 323, 326, 329, 332, 335, 338, 350, 362, 365, 368, 371, 374, 377].includes(c)) return '❄️'; // Снег
  if ([200, 386, 389, 392, 395].includes(c)) return '⛈️'; // Гроза
  return '☀️'; // По умолчанию
}

async function fetchWeatherByCity(city, lang = 'ru') {
  const normalizedCity = String(city || '').split(',')[0].trim();
  if (!normalizedCity) return null;

  const cacheKey = normalizedCity.toLowerCase();
  const cached = weatherCache.get(cacheKey);
  
  if (cached && cached.expiresAt > Date.now()) {
    return cached.data;
  }

  try {
    // Используем wttr.in, который сам геокодирует город по названию
    const url = `https://wttr.in/${encodeURIComponent(normalizedCity)}?format=j1&lang=${lang}`;
    const data = await fetchJsonViaHttps(url, 4000);

    if (!data || !data.current_condition || !data.current_condition[0]) {
      throw new Error('Invalid weather payload from wttr.in');
    }

    const current = data.current_condition[0];
    const temp = Math.round(Number(current.temp_C || 0));
    const icon = getWwoIcon(current.weatherCode);

    let areaName = normalizedCity;
    if (data.nearest_area && data.nearest_area[0] && data.nearest_area[0].areaName && data.nearest_area[0].areaName[0]) {
        areaName = data.nearest_area[0].areaName[0].value;
    }

    let dailyMax = null;
    let dailyMin = null;
    const hourly = [];

    const today = data.weather && data.weather[0] ? data.weather[0] : null;
    if (today) {
        dailyMax = Math.round(Number(today.maxtempC));
        dailyMin = Math.round(Number(today.mintempC));

        if (Array.isArray(today.hourly)) {
            const currentHour = new Date().getUTCHours();
            // wttr.in возвращает данные с шагом в 3 часа (0, 300, 600...)
            let startIndex = today.hourly.findIndex(h => (Number(h.time) / 100) >= currentHour);
            if (startIndex < 0) startIndex = 0;

            for (let i = 0; i < 4; i++) {
                const hData = today.hourly[(startIndex + i) % today.hourly.length];
                if (!hData) continue;
                
                let timeStr = String(hData.time);
                if (timeStr === '0') timeStr = '00:00';
                else if (timeStr.length === 3) timeStr = `0${timeStr[0]}:00`;
                else if (timeStr.length === 4) timeStr = `${timeStr.slice(0, 2)}:00`;

                const hTemp = Math.round(Number(hData.tempC));
                hourly.push({
                    hour: timeStr,
                    temp: hTemp > 0 ? `+${hTemp}` : `${hTemp}`,
                    icon: getWwoIcon(hData.weatherCode)
                });
            }
        }
    }

    const result = {
      temp: temp > 0 ? `+${temp}` : `${temp}`,
      icon,
      cityLabel: areaName,
      timezone: 'auto',
      dailyMax: dailyMax !== null ? (dailyMax > 0 ? `+${dailyMax}` : `${dailyMax}`) : null,
      dailyMin: dailyMin !== null ? (dailyMin > 0 ? `+${dailyMin}` : `${dailyMin}`) : null,
      hourly
    };

    weatherCache.set(cacheKey, { data: result, expiresAt: Date.now() + 1000 * 60 * 30 });
    return result;

  } catch (e) {
    console.error(`Ошибка погоды для ${normalizedCity}: ${e.message}`);
    // Если ошибка сети или города нет — сохраняем негативный результат на 2 минуты,
    // чтобы Vercel не крашился при каждой попытке рендера
    weatherCache.set(cacheKey, { data: null, expiresAt: Date.now() + 1000 * 120 });
    return null;
  }
}

async function resolveWeatherList(cities, lang) {
  if (!Array.isArray(cities) || cities.length === 0) return [];
  const settled = await Promise.allSettled(cities.slice(0, 3).map((city) => fetchWeatherByCity(city, lang)));
  return settled
    .map((item) => item.status === 'fulfilled' ? item.value : null)
    .filter(Boolean);
}

function parseEvents(eventsStr) {
  const map = {};
  if (!eventsStr) return map;
  eventsStr.split(',').forEach(part => {
    const splitIdx = part.indexOf(':');
    if(splitIdx > -1) {
      let date = part.slice(0, splitIdx).trim();
      const name = part.slice(splitIdx + 1).trim();
      const dateParts = date.split('-');
      if (dateParts.length === 2) date = `${dateParts[0].padStart(2, '0')}-${dateParts[1].padStart(2, '0')}`;
      if (date && name) map[date] = name;
    }
  });
  return map;
}

function getLabels(lang) {
  return lang === 'ru'
    ? { months: ['Январь','Февраль','Март','Апрель','Май','Июнь','Июль','Август','Сентябрь','Октябрь','Ноябрь','Декабрь'], monthsGenitive: ['января','февраля','марта','апреля','мая','июня','июля','августа','сентября','октября','ноября','декабря'], monthsShort: ['Янв','Фев','Мар','Апр','Май','Июн','Июл','Авг','Сен','Окт','Ноя','Дек'], monthsMedium: ['Январь','Февраль','Март','Апрель','Май','Июнь','Июль','Август','Сент.','Октябрь','Ноябрь','Декабрь'], weekdays: ['Пн','Вт','Ср','Чт','Пт','Сб','Вс'], weekdaysFull: ['понедельник','вторник','среда','четверг','пятница','суббота','воскресенье'], today: 'Сегодня', year: 'год', daysLeft: 'дн. осталось', passed: 'пройдено', week: 'Неделя' }
    : { months: ['January','February','March','April','May','June','July','August','September','October','November','December'], monthsGenitive: ['January','February','March','April','May','June','July','August','September','October','November','December'], monthsShort: ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'], monthsMedium: ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sept','Oct','Nov','Dec'], weekdays: ['Mo','Tu','We','Th','Fr','Sa','Su'], weekdaysFull: ['monday','tuesday','wednesday','thursday','friday','saturday','sunday'], today: 'Today', year: 'year', daysLeft: 'days left', passed: 'passed', week: 'Week' };
}

function getConfig(query) {
  const preset = PHONE_PRESETS[query.model] || PHONE_PRESETS.iphone_15;
  let themeObj;
  if (query.theme === 'custom_palette') {
    themeObj = {
      name: 'Custom',
      bg: query.c_bg || '#0a0d12', panel: query.c_panel || '#131823',
      text: query.c_text || '#edf2ff', muted: query.c_muted || '#8994a7',
      accent: query.c_accent || '#ff8f2d', accent2: query.c_accent2 || '#ffbc6f', weekend: query.c_weekend || '#ff8f7b'
    };
  } else {
    themeObj = THEMES[query.theme] || THEMES.graphite_orange;
  }
  let rawBg = query.bg_style || 'mesh_organic';
  if(rawBg === 'glass') rawBg = 'liquid_glass'; if(rawBg === 'mesh') rawBg = 'carbon'; if(rawBg === 'grain_light') rawBg = 'paper';

  const rawCities = collectRequestedCities(query);

  return {
    model: query.model || 'iphone_15',
    width: query.model === 'custom' ? clamp(num(query.width, preset.width), 320, 4000) : preset.width,
    height: query.model === 'custom' ? clamp(num(query.height, preset.height), 568, 5000) : preset.height,
    font: FONTS[query.font] ? query.font : 'inter',
    style: query.style || 'numbers',
    monthLayout: query.month_layout || 'grid_3x4',
    weekendMode: query.weekend_mode || 'weekends_only',
    themeObj: themeObj,
    bgStyle: BG_STYLES[rawBg] ? rawBg : 'mesh_organic',
    lang: query.lang === 'en' ? 'en' : 'ru',
    timezone: clamp(num(query.timezone, 3), -12, 14),
    footer: query.footer || 'year_summary', note: (query.note || '').slice(0, 120),
    events: query.events || '', 
    citiesToFetch: rawCities,
    eventColor: query.c_event || themeObj.accent,
    showWeekdays: String(query.show_weekdays || '1') === '1', accentToday: String(query.accent_today || '1') === '1',
    showProgressRing: String(query.show_progress_ring || '1') === '1', showWeekNumbers: String(query.show_week_numbers || '0') === '1',
    quarterDividers: String(query.quarter_dividers || '1') === '1', monthBadges: String(query.month_badges || '1') === '1',
    focusCurrentMonth: String(query.focus_current_month || '1') === '1', lockscreenSafe: String(query.lockscreen_safe || '1') === '1',
    showHeaderMeta: String(query.show_header_meta || '1') === '1', strongWeekendTint: String(query.strong_weekend_tint || '1') === '1',
    glassPanels: String(query.glass_panels || '1') === '1', pngSafeFont: query.__target === 'png'
  };
}

function yearStats(now) {
  const daysInYear = now.isLeapYear() ? 366 : 365;
  const dayOfYear = now.diff(dayjs(`${now.year()}-01-01`), 'day') + 1;
  return { dayOfYear, daysInYear, daysLeft: daysInYear - dayOfYear, percentPassed: Math.round((dayOfYear / daysInYear) * 100) };
}

function findNearestEvent(cfg, now, labels) {
  if (!cfg.eventsMap) return null;
  let best = null;
  for (const [mmdd, title] of Object.entries(cfg.eventsMap)) {
    const [m, d] = mmdd.split('-').map(Number);
    let candidate = now.year(now.year()).month(m - 1).date(d).hour(12).minute(0).second(0);
    if (candidate.isBefore(now, 'day')) candidate = candidate.add(1, 'year');
    const diff = candidate.startOf('day').diff(now.startOf('day'), 'day');
    if (!best || diff < best.diff) best = { title, diff, date: candidate, label: `${d} ${labels.monthsGenitive[m - 1]}` };
  }
  return best;
}

function getSeasonLabel(lang, monthIndex) {
  if (lang === 'ru') {
    if ([11,0,1].includes(monthIndex)) return 'Зима'; if ([2,3,4].includes(monthIndex)) return 'Весна';
    if ([5,6,7].includes(monthIndex)) return 'Лето'; return 'Осень';
  }
  if ([11,0,1].includes(monthIndex)) return 'Winter'; if ([2,3,4].includes(monthIndex)) return 'Spring';
  if ([5,6,7].includes(monthIndex)) return 'Summer'; return 'Autumn';
}

function weatherSummary(cfg, lang) {
  const wd = (cfg.weatherDataList && cfg.weatherDataList[0]) ? cfg.weatherDataList[0] : null;
  if (!wd) return lang === 'ru' ? 'Погода не выбрана' : 'No city weather';
  const city = String(wd.cityLabel || '').trim();
  const hiLo = wd.dailyMax && wd.dailyMin ? ` · ${wd.dailyMax} / ${wd.dailyMin}` : '';
  return `${wd.icon} ${wd.temp}°C${hiLo}${city ? ` · ${city}` : ''}`.trim();
}

function renderStaticNoiseBackground(theme, width, height) {
  return `<defs><filter id="noise_heavy" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency="0.75" numOctaves="3" stitchTiles="stitch"/><feColorMatrix type="matrix" values="1 0 0 0 0, 0 1 0 0 0, 0 0 1 0 0, 0 0 0 0.06 0" /></filter><linearGradient id="sn_base" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="${theme.bg}"/><stop offset="100%" stop-color="${alpha(theme.panel, 0.95)}"/></linearGradient><radialGradient id="sn_glow" cx="50%" cy="0%" r="80%"><stop offset="0%" stop-color="${alpha(theme.accent, 0.15)}"/><stop offset="100%" stop-color="${alpha(theme.bg, 0)}"/></radialGradient></defs><rect width="100%" height="100%" fill="url(#sn_base)"/><rect width="100%" height="100%" fill="url(#sn_glow)"/><rect width="100%" height="100%" filter="url(#noise_heavy)"/>`;
}

function renderBackground(cfg, theme, width, height) {
  const bgType = cfg.bgStyle;
  const proceduralFilters = `
    <filter id="tex_paper" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency="0.008" numOctaves="5" result="noise"/><feColorMatrix type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  1 0 0 0 0" in="noise"/><feComponentTransfer><feFuncA type="linear" slope="0.12"/></feComponentTransfer></filter>
    <filter id="tex_stone" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency="0.02" numOctaves="6" result="noise"/><feColorMatrix type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  1 0 0 0 0" in="noise"/><feComponentTransfer><feFuncA type="linear" slope="0.25"/></feComponentTransfer></filter>
    <filter id="tex_metal" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency="0.001 0.4" numOctaves="3" result="noise"/><feColorMatrix type="matrix" values="0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  1 0 0 0 0" in="noise"/><feComponentTransfer><feFuncA type="linear" slope="0.15"/></feComponentTransfer></filter>
    <filter id="tex_static" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency="0.8" numOctaves="2" result="noise"/><feColorMatrix type="matrix" values="0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  1 0 0 0 0" in="noise"/><feComponentTransfer><feFuncA type="linear" slope="0.06"/></feComponentTransfer></filter>
  `;

  if (bgType === 'mesh_organic') return `<defs><radialGradient id="mo1" cx="20%" cy="10%" r="65%"><stop offset="0%" stop-color="${alpha(theme.accent, 0.45)}"/><stop offset="100%" stop-color="${alpha(theme.bg, 0)}"/></radialGradient><radialGradient id="mo2" cx="80%" cy="75%" r="75%"><stop offset="0%" stop-color="${alpha(theme.accent2, 0.4)}"/><stop offset="100%" stop-color="${alpha(theme.bg, 0)}"/></radialGradient><radialGradient id="mo3" cx="65%" cy="25%" r="60%"><stop offset="0%" stop-color="${alpha(theme.panel, 0.95)}"/><stop offset="100%" stop-color="${alpha(theme.bg, 0)}"/></radialGradient><radialGradient id="mo4" cx="15%" cy="85%" r="70%"><stop offset="0%" stop-color="${alpha(theme.accent, 0.25)}"/><stop offset="100%" stop-color="${alpha(theme.bg, 0)}"/></radialGradient></defs><rect width="100%" height="100%" fill="${theme.bg}"/><rect width="100%" height="100%" fill="url(#mo1)"/><rect width="100%" height="100%" fill="url(#mo2)"/><rect width="100%" height="100%" fill="url(#mo3)"/><rect width="100%" height="100%" fill="url(#mo4)"/><rect width="100%" height="100%" fill="${alpha(theme.bg, 0.1)}" opacity="0.5"/>`;
  if (bgType === 'paper') return `<defs>${proceduralFilters}<linearGradient id="p_grad" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="${theme.bg}"/><stop offset="100%" stop-color="${alpha(theme.panel, 0.8)}"/></linearGradient><radialGradient id="p_vignette" cx="50%" cy="50%" r="75%"><stop offset="60%" stop-color="#000000" stop-opacity="0"/><stop offset="100%" stop-color="#000000" stop-opacity="0.25"/></radialGradient></defs><rect width="100%" height="100%" fill="url(#p_grad)"/><rect width="100%" height="100%" filter="url(#tex_paper)"/><rect width="100%" height="100%" fill="url(#p_vignette)"/>`;
  if (bgType === 'stone') return `<defs>${proceduralFilters}<radialGradient id="s_vignette" cx="50%" cy="50%" r="80%"><stop offset="40%" stop-color="#000000" stop-opacity="0"/><stop offset="100%" stop-color="#000000" stop-opacity="0.4"/></radialGradient><radialGradient id="s_spot1" cx="20%" cy="10%" r="50%"><stop offset="0%" stop-color="${alpha(theme.panel, 0.6)}"/><stop offset="100%" stop-color="${alpha(theme.panel, 0)}"/></radialGradient><radialGradient id="s_spot2" cx="80%" cy="80%" r="60%"><stop offset="0%" stop-color="${alpha(theme.accent, 0.1)}"/><stop offset="100%" stop-color="${alpha(theme.accent, 0)}"/></radialGradient></defs><rect width="100%" height="100%" fill="${theme.bg}"/><rect width="100%" height="100%" fill="url(#s_spot1)"/><rect width="100%" height="100%" fill="url(#s_spot2)"/><rect width="100%" height="100%" filter="url(#tex_stone)"/><rect width="100%" height="100%" fill="url(#s_vignette)"/>`;
  if (bgType === 'metal') return `<defs>${proceduralFilters}<linearGradient id="m_base" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="${theme.panel}"/><stop offset="30%" stop-color="${theme.bg}"/><stop offset="50%" stop-color="${theme.panel}"/><stop offset="70%" stop-color="${theme.bg}"/><stop offset="100%" stop-color="${theme.panel}"/></linearGradient><linearGradient id="m_shade" x1="0%" y1="0%" x2="100%" y2="0%"><stop offset="0%" stop-color="#000000" stop-opacity="0.3"/><stop offset="20%" stop-color="#000000" stop-opacity="0"/><stop offset="80%" stop-color="#000000" stop-opacity="0"/><stop offset="100%" stop-color="#000000" stop-opacity="0.3"/></linearGradient></defs><rect width="100%" height="100%" fill="url(#m_base)"/><rect width="100%" height="100%" filter="url(#tex_metal)"/><polygon points="0,${height*0.1} ${width},${height*0.55} ${width},${height*0.7} 0,${height*0.25}" fill="${alpha('#ffffff', 0.05)}"/><rect width="100%" height="100%" fill="url(#m_shade)"/>`;
  if (bgType === 'carbon') { const cs = Math.max(16, Math.round(width * 0.015)); return `<defs><pattern id="carbon_mesh" width="${cs}" height="${cs}" patternUnits="userSpaceOnUse"><rect x="0" y="0" width="${cs/2}" height="${cs/2}" fill="${alpha(theme.panel, 0.7)}"/><rect x="${cs/2}" y="${cs/2}" width="${cs/2}" height="${cs/2}" fill="${alpha(theme.panel, 0.4)}"/><rect x="0" y="${cs/2}" width="${cs/2}" height="${cs/2}" fill="${alpha('#000000', 0.3)}"/><rect x="${cs/2}" y="0" width="${cs/2}" height="${cs/2}" fill="${alpha('#000000', 0.5)}"/></pattern><radialGradient id="c_glow" cx="50%" cy="10%" r="80%"><stop offset="0%" stop-color="${alpha(theme.accent, 0.15)}"/><stop offset="100%" stop-color="${alpha(theme.bg, 0)}"/></radialGradient><radialGradient id="c_shade" cx="50%" cy="50%" r="80%"><stop offset="40%" stop-color="#000000" stop-opacity="0"/><stop offset="100%" stop-color="#000000" stop-opacity="0.5"/></radialGradient></defs><rect width="100%" height="100%" fill="${theme.bg}"/><rect width="100%" height="100%" fill="url(#carbon_mesh)"/><rect width="100%" height="100%" fill="url(#c_glow)"/><rect width="100%" height="100%" fill="url(#c_shade)"/>`; }
  if (bgType === 'liquid_glass') return `<defs>${proceduralFilters}<radialGradient id="g_blob1" cx="15%" cy="15%" r="60%"><stop offset="0%" stop-color="${alpha(theme.accent, 0.35)}"/><stop offset="100%" stop-color="${alpha(theme.accent, 0)}"/></radialGradient><radialGradient id="g_blob2" cx="85%" cy="85%" r="70%"><stop offset="0%" stop-color="${alpha(theme.accent2, 0.25)}"/><stop offset="100%" stop-color="${alpha(theme.accent2, 0)}"/></radialGradient><radialGradient id="g_blob3" cx="60%" cy="30%" r="45%"><stop offset="0%" stop-color="${alpha(theme.panel, 0.9)}"/><stop offset="100%" stop-color="${alpha(theme.panel, 0)}"/></radialGradient><linearGradient id="g_sheen" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="${alpha('#ffffff', 0.1)}"/><stop offset="35%" stop-color="${alpha('#ffffff', 0)}"/><stop offset="65%" stop-color="${alpha('#ffffff', 0)}"/><stop offset="100%" stop-color="${alpha('#000000', 0.25)}"/></linearGradient></defs><rect width="100%" height="100%" fill="${theme.bg}"/><rect width="100%" height="100%" fill="url(#g_blob1)"/><rect width="100%" height="100%" fill="url(#g_blob2)"/><rect width="100%" height="100%" fill="url(#g_blob3)"/><rect width="100%" height="100%" fill="url(#g_sheen)"/><rect width="100%" height="100%" filter="url(#tex_static)" opacity="0.6"/>`;
  if (bgType === 'spotlight') return `<defs><radialGradient id="spot1" cx="50%" cy="0%" r="90%"><stop offset="0%" stop-color="${alpha(theme.accent2, 0.22)}"/><stop offset="25%" stop-color="${alpha(theme.accent, 0.15)}"/><stop offset="60%" stop-color="${theme.bg}"/></radialGradient></defs><rect width="100%" height="100%" fill="${theme.bg}"/><rect width="100%" height="100%" fill="url(#spot1)"/>`;
  if (bgType === 'waves') return `<defs>${proceduralFilters}</defs><rect width="100%" height="100%" fill="${theme.bg}"/><path d="M0,${height*0.25} C${width*0.4},${height*0.05} ${width*0.6},${height*0.45} ${width},${height*0.2} L${width},0 L0,0 Z" fill="${alpha(theme.panel, 0.8)}"/><path d="M0,${height*0.27} C${width*0.4},${height*0.07} ${width*0.6},${height*0.47} ${width},${height*0.22}" fill="none" stroke="${theme.accent}" stroke-width="2" opacity="0.6"/><path d="M0,${height*0.75} C${width*0.3},${height*0.95} ${width*0.7},${height*0.6} ${width},${height*0.8} L${width},${height} L0,${height} Z" fill="${alpha(theme.panel, 0.6)}"/><path d="M0,${height*0.73} C${width*0.3},${height*0.93} ${width*0.7},${height*0.58} ${width},${height*0.78}" fill="none" stroke="${theme.accent2}" stroke-width="1.5" opacity="0.5"/><rect width="100%" height="100%" filter="url(#tex_static)" opacity="0.3"/>`;
  if (bgType === 'topography') return `<defs>${proceduralFilters}</defs><rect width="100%" height="100%" fill="${theme.bg}"/><g stroke="${alpha(theme.accent, 0.18)}" fill="none" stroke-width="1.5"><path d="M -${width*0.2} ${height*0.1} Q ${width*0.4} ${height*0.3}, ${width*1.2} -${height*0.1}"/><path d="M -${width*0.2} ${height*0.14} Q ${width*0.4} ${height*0.34}, ${width*1.2} -${height*0.06}"/><path d="M -${width*0.2} ${height*0.18} Q ${width*0.4} ${height*0.38}, ${width*1.2} -${height*0.02}"/></g><g stroke="${alpha(theme.accent2, 0.12)}" fill="none" stroke-width="1"><path d="M -${width*0.2} ${height*0.8} Q ${width*0.6} ${height*0.6}, ${width*1.2} ${height*1.1}"/><path d="M -${width*0.2} ${height*0.84} Q ${width*0.6} ${height*0.64}, ${width*1.2} ${height*1.14}"/><path d="M -${width*0.2} ${height*0.88} Q ${width*0.6} ${height*0.68}, ${width*1.2} ${height*1.18}"/></g><circle cx="${width*0.85}" cy="${height*0.15}" r="${width*0.25}" fill="none" stroke="${alpha(theme.panel, 0.6)}" stroke-width="15"/><circle cx="${width*0.85}" cy="${height*0.15}" r="${width*0.32}" fill="none" stroke="${alpha(theme.panel, 0.3)}" stroke-width="1"/><rect width="100%" height="100%" filter="url(#tex_static)" opacity="0.4"/>`;
  if (bgType === 'bloom') return `<defs><radialGradient id="b1" cx="10%" cy="40%" r="70%"><stop offset="0%" stop-color="${alpha(theme.accent2, 0.22)}"/><stop offset="100%" stop-color="${alpha(theme.bg, 0)}"/></radialGradient><radialGradient id="b2" cx="90%" cy="90%" r="80%"><stop offset="0%" stop-color="${alpha(theme.accent, 0.18)}"/><stop offset="100%" stop-color="${alpha(theme.bg, 0)}"/></radialGradient></defs><rect width="100%" height="100%" fill="${theme.bg}"/><rect width="100%" height="100%" fill="url(#b1)"/><rect width="100%" height="100%" fill="url(#b2)"/>`;
  if (bgType === 'diagonal') return `<rect width="100%" height="100%" fill="${theme.bg}"/><path d="M0,0 L${width*0.7},0 L0,${height*0.4} Z" fill="${alpha(theme.accent, 0.08)}"/><path d="M${width},${height} L${width*0.3},${height} L${width},${height*0.6} Z" fill="${alpha(theme.accent2, 0.06)}"/><line x1="0" y1="${height*0.3}" x2="${width}" y2="${height*0.8}" stroke="${alpha(theme.accent, 0.12)}" stroke-width="2"/><line x1="0" y1="${height*0.32}" x2="${width}" y2="${height*0.82}" stroke="${alpha(theme.accent, 0.05)}" stroke-width="1"/>`;
  if (bgType === 'orbit') return `<rect width="100%" height="100%" fill="${theme.bg}"/><circle cx="50%" cy="35%" r="${width*0.45}" fill="none" stroke="${alpha(theme.accent, 0.1)}" stroke-width="${Math.max(1, width*0.003)}" stroke-dasharray="8 12"/><circle cx="50%" cy="35%" r="${width*0.65}" fill="none" stroke="${alpha(theme.accent2, 0.06)}" stroke-width="${Math.max(1, width*0.002)}"/><circle cx="50%" cy="35%" r="${width*0.85}" fill="none" stroke="${alpha(theme.accent, 0.04)}" stroke-width="${Math.max(2, width*0.005)}"/>`;
  if (bgType === 'velvet') return `<defs>${proceduralFilters}<linearGradient id="v_grad" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="${theme.bg}"/><stop offset="40%" stop-color="${alpha(theme.panel, 0.9)}"/><stop offset="60%" stop-color="${theme.bg}"/><stop offset="85%" stop-color="${alpha(theme.panel, 0.9)}"/><stop offset="100%" stop-color="${theme.bg}"/></linearGradient></defs><rect width="100%" height="100%" fill="url(#v_grad)"/><rect width="100%" height="100%" filter="url(#tex_paper)" opacity="0.6"/>`;
  if (bgType === 'noir') return `<defs><radialGradient id="vignette" cx="50%" cy="40%" r="95%"><stop offset="15%" stop-color="${alpha(theme.accent, 0.1)}"/><stop offset="50%" stop-color="${theme.bg}"/><stop offset="100%" stop-color="#000000"/></radialGradient></defs><rect width="100%" height="100%" fill="url(#vignette)"/>`;
  if (bgType === 'static_noise') return renderStaticNoiseBackground(theme, width, height);
  if (bgType === 'hexagons') return `<defs><pattern id="hex" width="40" height="69.28" patternUnits="userSpaceOnUse"><path d="M20 0 L40 11.55 L40 34.64 L20 46.19 L0 34.64 L0 11.55 Z" fill="none" stroke="${alpha(theme.accent, 0.12)}" stroke-width="1.5"/><path d="M20 69.28 L40 57.74 L40 34.64 L20 46.19 L0 34.64 L0 57.74 Z" fill="none" stroke="${alpha(theme.accent2, 0.08)}" stroke-width="1"/></pattern><radialGradient id="h_glow" cx="50%" cy="30%" r="80%"><stop offset="0%" stop-color="${alpha(theme.accent, 0.15)}"/><stop offset="100%" stop-color="${alpha(theme.bg, 0)}"/></radialGradient></defs><rect width="100%" height="100%" fill="${theme.bg}"/><rect width="100%" height="100%" fill="url(#hex)"/><rect width="100%" height="100%" fill="url(#h_glow)"/>`;
  if (bgType === 'circuit_board') return `<defs><pattern id="circuit" width="80" height="80" patternUnits="userSpaceOnUse"><path d="M0,40 H30 L40,30 V0 M40,50 V80 M50,40 L60,30 H80 M15,15 A2,2 0 1,1 15,15.01 M65,65 A2,2 0 1,1 65,65.01" fill="none" stroke="${alpha(theme.accent2, 0.2)}" stroke-width="1.5"/></pattern><radialGradient id="cb_glow" cx="80%" cy="20%" r="70%"><stop offset="0%" stop-color="${alpha(theme.accent, 0.2)}"/><stop offset="100%" stop-color="${alpha(theme.bg, 0)}"/></radialGradient></defs><rect width="100%" height="100%" fill="${theme.bg}"/><rect width="100%" height="100%" fill="url(#circuit)"/><rect width="100%" height="100%" fill="url(#cb_glow)"/>`;
  if (bgType === 'starlight') return `<defs><pattern id="stars" width="120" height="120" patternUnits="userSpaceOnUse"><circle cx="20" cy="20" r="1.5" fill="${theme.text}" opacity="0.8"/><circle cx="90" cy="80" r="1" fill="${theme.accent}" opacity="0.6"/><circle cx="60" cy="40" r="2" fill="${theme.accent2}" opacity="0.4"/><circle cx="30" cy="100" r="0.8" fill="${theme.text}" opacity="0.5"/><circle cx="100" cy="30" r="1.2" fill="${theme.text}" opacity="0.7"/></pattern><radialGradient id="star_nebula" cx="40%" cy="20%" r="80%"><stop offset="0%" stop-color="${alpha(theme.accent, 0.25)}"/><stop offset="100%" stop-color="${alpha(theme.bg, 0)}"/></radialGradient></defs><rect width="100%" height="100%" fill="${theme.bg}"/><rect width="100%" height="100%" fill="url(#star_nebula)"/><rect width="100%" height="100%" fill="url(#stars)"/>`;
  if (bgType === 'watercolor') return `<defs><radialGradient id="wc1" cx="20%" cy="30%" r="60%"><stop offset="0%" stop-color="${theme.accent}" stop-opacity="0.35"/><stop offset="100%" stop-color="${theme.bg}" stop-opacity="0"/></radialGradient><radialGradient id="wc2" cx="80%" cy="70%" r="60%"><stop offset="0%" stop-color="${theme.accent2}" stop-opacity="0.3"/><stop offset="100%" stop-color="${theme.bg}" stop-opacity="0"/></radialGradient><radialGradient id="wc3" cx="50%" cy="100%" r="70%"><stop offset="0%" stop-color="${theme.panel}" stop-opacity="0.8"/><stop offset="100%" stop-color="${theme.bg}" stop-opacity="0"/></radialGradient></defs><rect width="100%" height="100%" fill="${theme.bg}"/><rect width="100%" height="100%" fill="url(#wc1)"/><rect width="100%" height="100%" fill="url(#wc2)"/><rect width="100%" height="100%" fill="url(#wc3)"/>`;
  if (bgType === 'matrix') return `<defs><pattern id="mtrx" width="60" height="120" patternUnits="userSpaceOnUse"><rect x="15" y="0" width="3" height="50" fill="${alpha(theme.accent, 0.3)}"/><rect x="45" y="60" width="2" height="40" fill="${alpha(theme.accent2, 0.25)}"/></pattern><linearGradient id="m_fade" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="${theme.bg}"/><stop offset="50%" stop-color="${alpha(theme.bg, 0.4)}"/><stop offset="100%" stop-color="${theme.bg}"/></linearGradient></defs><rect width="100%" height="100%" fill="${theme.bg}"/><rect width="100%" height="100%" fill="url(#mtrx)"/><rect width="100%" height="100%" fill="url(#m_fade)"/>`;

  return `<defs><radialGradient id="au1" cx="20%" cy="-10%" r="85%"><stop offset="0%" stop-color="${alpha(theme.accent, 0.35)}"/><stop offset="100%" stop-color="${alpha(theme.bg, 0)}"/></radialGradient><radialGradient id="au2" cx="110%" cy="40%" r="75%"><stop offset="0%" stop-color="${alpha(theme.accent2, 0.25)}"/><stop offset="100%" stop-color="${alpha(theme.bg, 0)}"/></radialGradient><radialGradient id="au3" cx="-10%" cy="110%" r="80%"><stop offset="0%" stop-color="${alpha(theme.panel, 0.9)}"/><stop offset="100%" stop-color="${alpha(theme.bg, 0)}"/></radialGradient></defs><rect width="100%" height="100%" fill="${theme.bg}"/><rect width="100%" height="100%" fill="url(#au1)"/><rect width="100%" height="100%" fill="url(#au2)"/><rect width="100%" height="100%" fill="url(#au3)"/>`;
}

function isListLayout(layout) { return ['list_1x12','list_1x12_compact','list_2x6'].includes(layout); }
function isCompactGridLayout(layout) { return ['grid_3x4_compact','grid_2x6','grid_6x2','single_month_focus','grid_4x3_compact'].includes(layout); }

function getLayoutMetrics(cfg, width, height, contentH, sidePadding) {
  const presets = {
    grid_3x4: { cols: 3, rows: 4, gap: Math.round(width * 0.02), mode: 'grid' },
    grid_4x3: { cols: 4, rows: 3, gap: Math.round(width * 0.018), mode: 'grid' },
    grid_2x6: { cols: 2, rows: 6, gap: Math.round(width * 0.018), mode: 'grid' },
    grid_6x2: { cols: 6, rows: 2, gap: Math.round(width * 0.010), mode: 'grid_6x2' },
    grid_3x4_compact: { cols: 3, rows: 4, gap: Math.round(width * 0.014), mode: 'grid_compact' },
    list_1x12: { cols: 1, rows: 12, gap: Math.round(width * 0.012), mode: 'list' },
    list_1x12_compact: { cols: 1, rows: 12, gap: Math.round(width * 0.010), mode: 'list_compact' },
    single_month_focus: { cols: 1, rows: 1, gap: Math.round(width * 0.016), mode: 'focus' },
    current_month_only: { cols: 1, rows: 1, gap: 0, mode: 'focus_single' },
    grid_4x3_compact: { cols: 4, rows: 3, gap: Math.round(width * 0.012), mode: 'grid_compact' },
    list_2x6: { cols: 2, rows: 6, gap: Math.round(width * 0.016), mode: 'list' },
    grid_3x4_spaced: { cols: 3, rows: 4, gap: Math.round(width * 0.04), mode: 'grid' },
    current_plus_next_two: { cols: 1, rows: 3, gap: Math.round(width * 0.025), mode: 'current_three' }
  };
  const spec = presets[cfg.monthLayout] || presets.grid_3x4;
  if (spec.mode === 'focus' || spec.mode === 'focus_single') return { ...spec };
  const monthW = (width - sidePadding * 2 - spec.gap * (spec.cols - 1)) / spec.cols;
  const monthH = (contentH - spec.gap * (spec.rows - 1)) / spec.rows;
  return { ...spec, monthW, monthH, skinnyCols: spec.mode === 'grid_6x2' ? 6 : undefined };
}

function getSafeFontStack(selectedFontFamily, pngSafeFont) {
  return `'${selectedFontFamily}','DejaVu Sans','Noto Sans','Liberation Sans',Arial,sans-serif`;
}

function pickMonthLabel(labels, monthIndex, width, mode = 'grid') {
  const full = labels.months[monthIndex];
  const medium = (labels.monthsMedium || labels.months)[monthIndex];
  const short = (labels.monthsShort || labels.months)[monthIndex];
  if (mode === 'list') return width < 420 ? short : width < 560 ? medium : full;
  if (mode === 'focus' || mode === 'focus_single') return width < 520 ? medium : full;
  if (mode === 'skinny') return short;
  if (width < 180) return short;
  if (width < 240) return medium;
  return full;
}

function getMonthCardOptions(cfg, w, h) {
  const sixWide = cfg.monthLayout === 'grid_6x2';
  const tiny = sixWide || w < 180;
  const compactGrid = cfg.monthLayout === 'grid_3x4_compact' || cfg.monthLayout === 'grid_4x3_compact';
  return {
    tiny, skinny: sixWide && w < 190, sixWide, compactGrid,
    showWeekdays: cfg.showWeekdays && (!tiny || cfg.monthLayout === 'single_month_focus' || cfg.monthLayout === 'current_month_only'),
    showBadge: cfg.monthBadges && !sixWide && w >= 185,
    padRatio: sixWide ? 0.028 : tiny ? 0.04 : compactGrid ? 0.045 : 0.055,
    radius: Math.max(14, Math.round(Math.min(w, h) * (sixWide ? 0.09 : 0.1))),
  };
}

function renderHeader(cfg, theme, labels, now, stats, width, padding, topY, FONT) {
  const subtitleSize = Math.round(width * 0.033);
  const chipWidth = Math.round(width * 0.23);
  const chipHeight = Math.round(width * 0.07);
  const ringR = Math.round(width * 0.035);
  const yearSize = Math.round(width * 0.075);
  const yearY = topY + yearSize;
  
  const dateText = cfg.lang === 'ru' ? `${labels.today}: ${now.date()} ${labels.monthsGenitive[now.month()]}` : `${labels.today}: ${labels.months[now.month()]} ${now.date()}`;
  
  const yearSvg = `<text x="${width / 2}" y="${yearY}" text-anchor="middle" fill="${theme.text}" font-size="${yearSize}" font-family="${FONT}" font-weight="900" letter-spacing="-0.03em">${now.year()}</text>`;
  const todaySvg = cfg.showHeaderMeta === false ? '' : `<text x="${padding}" y="${yearY - yearSize * 0.45}" fill="${theme.muted}" font-size="${subtitleSize}" font-family="${FONT}">${escapeXml(dateText)}</text>`;
  const badgeSvg = cfg.showHeaderMeta === false ? '' : `<rect x="${padding}" y="${yearY - yearSize * 0.15}" width="${chipWidth}" height="${chipHeight}" rx="${chipHeight / 2}" fill="${alpha(theme.panel, 0.92)}" stroke="${alpha(theme.accent2, 0.22)}"/><text x="${padding + chipWidth / 2}" y="${yearY - yearSize * 0.15 + chipHeight * 0.66}" text-anchor="middle" fill="${theme.accent2}" font-size="${Math.round(width * 0.024)}" font-family="${FONT}" font-weight="700">${labels.week} ${now.week()}</text>`;

  let rightSvg = '';
  
  if (cfg.weatherDataList && cfg.weatherDataList.length > 0) {
    const weatherX = width - padding;
    const isMulti = cfg.weatherDataList.length > 1;
    const wTitleSize = Math.round(subtitleSize * (isMulti ? 1.05 : 1.42));
    const wSubSize = Math.round(subtitleSize * (isMulti ? 0.75 : 0.9));
    const stepY = isMulti ? Math.round(wTitleSize * 1.8) : Math.round(subtitleSize * 2);
    
    let currentY = yearY - yearSize * 0.45;
    if (isMulti) currentY -= wTitleSize * 0.3;

    cfg.weatherDataList.slice(0, 3).forEach((wd) => {
      const cityLabel = String(wd.cityLabel || '').split(',')[0].trim();
      rightSvg += `<text x="${weatherX}" y="${currentY}" text-anchor="end" fill="${theme.text}" font-size="${wTitleSize}" font-family="${FONT}" font-weight="700">${wd.temp}°C ${wd.icon}</text>`;
      if (cityLabel) {
        rightSvg += `<text x="${weatherX}" y="${currentY + wTitleSize * 0.95}" text-anchor="end" fill="${theme.muted}" font-size="${wSubSize}" font-family="${FONT}" font-weight="600">${escapeXml(cityLabel.length > 18 ? cityLabel.slice(0,17)+'…' : cityLabel)}</text>`;
      }
      currentY += stepY;
    });
  } else if (cfg.showProgressRing && stats) {
    const ringCx = width - padding - ringR;
    const ringCy = yearY - yearSize * 0.25;
    const dash = (Math.PI * 2 * ringR) * (stats.percentPassed / 100);
    rightSvg += `<circle cx="${ringCx}" cy="${ringCy}" r="${ringR}" fill="none" stroke="${alpha(theme.panel, 0.92)}" stroke-width="${ringR * 0.28}" /><circle cx="${ringCx}" cy="${ringCy}" r="${ringR}" fill="none" stroke="${theme.accent}" stroke-width="${ringR * 0.28}" stroke-linecap="round" stroke-dasharray="${dash} ${Math.PI * 2 * ringR}" transform="rotate(-90 ${ringCx} ${ringCy})" /><text x="${ringCx}" y="${ringCy + width * 0.008}" text-anchor="middle" fill="${theme.text}" font-size="${Math.round(width * 0.02)}" font-family="${FONT}" font-weight="800">${stats.percentPassed}%</text>`;
  }
  return yearSvg + todaySvg + badgeSvg + rightSvg;
}

function isRestDayFactory(cfg, year) {
  const holidays = new Set([`${year}-01-01`,`${year}-01-02`,`${year}-01-03`,`${year}-01-04`,`${year}-01-05`,`${year}-01-06`,`${year}-01-07`,`${year}-01-08`,`${year}-02-23`,`${year}-03-08`,`${year}-05-01`,`${year}-05-09`,`${year}-06-12`,`${year}-11-04`]);
  return (date) => {
    if (cfg.weekendMode === 'none') return false;
    const weekend = date.day() === 0 || date.day() === 6;
    if (cfg.weekendMode === 'production') return weekend || holidays.has(date.format('YYYY-MM-DD'));
    return weekend;
  };
}

function renderMonthGrid({ monthIndex, year, x, y, w, h, cfg, theme, labels, now, FONT }) {
  const first = dayjs(`${year}-${String(monthIndex + 1).padStart(2, '0')}-01`);
  const daysInMonth = first.daysInMonth();
  const firstWeekday = (first.day() + 6) % 7;
  const isCurrent = now.month() === monthIndex;
  const dense = isCompactGridLayout(cfg.monthLayout);
  const opts = getMonthCardOptions(cfg, w, h);
  const focusHero = cfg.monthLayout === 'single_month_focus' || cfg.monthLayout === 'current_month_only';
  const emphasis = cfg.focusCurrentMonth && isCurrent ? (dense ? 1.03 : 1.06) : 1;
  const radius = opts.radius;
  const pad = Math.round(w * (focusHero ? 0.04 : opts.padRatio));
  const cellW = (w - pad * 2) / (7 + (cfg.showWeekNumbers && !opts.tiny && !focusHero ? 1 : 0));
  const titleLabel = pickMonthLabel(labels, monthIndex, w, focusHero ? 'focus' : (opts.skinny ? 'skinny' : 'grid'));
  const titleSize = Math.min(Math.round(h * (focusHero ? 0.11 : opts.sixWide ? 0.09 : dense ? 0.10 : 0.12)), Math.round(w * (focusHero ? 0.13 : opts.sixWide ? 0.11 : dense ? 0.14 : 0.16))) * emphasis;
  const topBand = opts.showWeekdays ? h * (focusHero ? 0.35 : opts.sixWide ? 0.20 : dense ? 0.245 : 0.285) : h * (focusHero ? 0.18 : opts.sixWide ? 0.14 : dense ? 0.17 : 0.20);
  const cellHReal = Math.max(8, (h - topBand - h * (focusHero ? 0.06 : opts.sixWide ? 0.06 : dense ? 0.06 : 0.075)) / 6);
  const numSize = Math.min(Math.round(cellW * (focusHero ? 0.5 : opts.sixWide ? 0.34 : dense ? 0.52 : 0.6)), Math.round(cellHReal * (focusHero ? 0.56 : opts.sixWide ? 0.42 : dense ? 0.54 : 0.6))) * emphasis;
  const cardFill = isCurrent ? alpha(theme.panel, focusHero ? 0.98 : 0.98) : alpha(theme.panel, opts.sixWide ? 0.78 : 0.65);
  
  let out = `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${radius}" fill="${cardFill}" stroke="${isCurrent ? alpha(theme.accent2, cfg.glassPanels===false?0.26:0.42) : alpha('#ffffff', cfg.glassPanels===false?0.05:0.09)}" />`;
  if (cfg.glassPanels !== false) out += `<rect x="${x + 1.5}" y="${y + 1.5}" width="${Math.max(0, w - 3)}" height="${Math.max(0, h - 3)}" rx="${Math.max(0, radius - 1.5)}" fill="none" stroke="${alpha(theme.accent2, isCurrent ? 0.10 : 0.04)}" />`;
  out += `<text x="${x + pad}" y="${focusHero ? (y + pad + titleSize * 0.80) : (y + pad + titleSize * 0.75)}" fill="${theme.text}" font-size="${titleSize}" font-family="${FONT}" font-weight="800">${titleLabel}</text>`;
  
  if (opts.showBadge || focusHero) {
    const badgeW = Math.round(w * (opts.sixWide ? 0.14 : focusHero ? 0.12 : 0.19));
    const badgeH = Math.round(h * (opts.sixWide ? 0.10 : focusHero ? 0.10 : 0.11));
    out += `<rect x="${x + w - pad - badgeW}" y="${y + pad * (focusHero ? 0.9 : 0.55)}" width="${badgeW}" height="${badgeH}" rx="${badgeH / 2}" fill="${isCurrent ? alpha(theme.accent, 0.18) : alpha('#ffffff', 0.05)}" /><text x="${x + w - pad - badgeW / 2}" y="${y + pad * (focusHero ? 0.9 : 0.55) + badgeH * 0.65}" text-anchor="middle" fill="${isCurrent ? theme.accent2 : theme.muted}" font-size="${Math.round(badgeH * (focusHero ? 0.50 : 0.56))}" font-family="${FONT}" font-weight="700">${daysInMonth}${cfg.lang === 'ru' ? 'д' : 'd'}</text>`;
  }

  const startX = x + pad + (cfg.showWeekNumbers && !opts.tiny && !focusHero ? cellW : 0);
  if (cfg.strongWeekendTint) {
    [5, 6].forEach((weekendCol, idx) => {
      out += `<rect x="${startX + weekendCol * cellW + cellW * 0.08}" y="${y + topBand - cellHReal * 0.16}" width="${cellW * 0.84}" height="${cellHReal * 5.2}" rx="${cellW * 0.22}" fill="${alpha(theme.weekend, idx === 0 ? 0.07 : 0.10)}" />`;
    });
  }

  if (opts.showWeekdays) {
    const weekdayY = focusHero ? (y + pad + titleSize + h * 0.065) : (y + (opts.sixWide ? h * 0.18 : h * 0.23));
    const weekdaySize = Math.min(Math.round(cellW * (focusHero ? 0.34 : opts.sixWide ? 0.30 : dense ? 0.4 : 0.5)), Math.round(h * (focusHero ? 0.044 : opts.sixWide ? 0.032 : dense ? 0.048 : 0.058)));
    if (cfg.showWeekNumbers && !opts.tiny && !focusHero) out += `<text x="${x + pad + cellW / 2}" y="${weekdayY}" text-anchor="middle" fill="${theme.muted}" font-size="${weekdaySize}" font-family="${FONT}">#</text>`;
    labels.weekdays.forEach((wd, i) => out += `<text x="${startX + i * cellW + cellW / 2}" y="${weekdayY}" text-anchor="middle" fill="${i >= 5 ? alpha(theme.weekend, 0.95) : theme.muted}" font-size="${weekdaySize}" font-family="${FONT}" font-weight="700">${wd}</text>`);
  }

  const isRestDay = isRestDayFactory(cfg, year);
  const usedWeekRows = new Set();
  for (let day = 1; day <= daysInMonth; day++) {
    const row = Math.floor((firstWeekday + day - 1) / 7);
    usedWeekRows.add(row);
    const date = dayjs(`${year}-${String(monthIndex + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`);
    const cx = startX + ((firstWeekday + day - 1) % 7) * cellW + cellW / 2;
    const cy = y + topBand + row * cellHReal + cellHReal * 0.68;
    const isToday = cfg.accentToday && date.isSame(now, 'day');
    
    const isCustomEvent = cfg.eventsMap && cfg.eventsMap[`${String(monthIndex + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`];
    let textColor = isToday ? theme.text : isRestDay(date) ? theme.weekend : (date.isBefore(now, 'day') && now.month() === monthIndex) ? alpha(theme.text, 0.6) : theme.text;
    if (isCustomEvent && !isToday) textColor = cfg.eventColor;

    if (isCustomEvent) out += `<rect x="${cx - cellW * 0.35}" y="${cy - cellHReal * 0.6}" width="${cellW * 0.7}" height="${cellHReal * 0.75}" rx="${Math.min(cellW, cellHReal) * 0.2}" fill="${alpha(cfg.eventColor, 0.18)}" stroke="${alpha(cfg.eventColor, 0.34)}"/>`;

    // --- СТИЛИ ИНДИКАЦИИ ДНЕЙ ---
    if (cfg.style === 'slash') {
      if (isToday) out += `<line x1="${cx - cellW * 0.35}" y1="${cy + cellHReal * 0.15}" x2="${cx + cellW * 0.35}" y2="${cy - cellHReal * 0.5}" stroke="${alpha(theme.accent, 0.8)}" stroke-width="${Math.max(2, w * 0.005)}"/>`;
      out += `<text x="${cx}" y="${cy}" text-anchor="middle" fill="${textColor}" font-size="${numSize}" font-family="${FONT}" font-weight="${isToday ? 800 : 600}">${day}</text>`;
    } else if (cfg.style === 'underline') {
      if (isToday) out += `<line x1="${cx - cellW * 0.3}" y1="${cy + cellHReal * 0.15}" x2="${cx + cellW * 0.3}" y2="${cy + cellHReal * 0.15}" stroke="${theme.accent}" stroke-width="${Math.max(2, w * 0.006)}" stroke-linecap="round"/>`;
      out += `<text x="${cx}" y="${cy}" text-anchor="middle" fill="${textColor}" font-size="${numSize}" font-family="${FONT}" font-weight="${isToday ? 800 : 600}">${day}</text>`;
    } else if (cfg.style === 'bracket') {
      if (isToday) out += `<text x="${cx}" y="${cy}" text-anchor="middle" fill="${alpha(theme.accent, 0.6)}" font-size="${Math.round(numSize*1.1)}" font-family="${FONT}" font-weight="800">[   ]</text>`;
      out += `<text x="${cx}" y="${cy}" text-anchor="middle" fill="${textColor}" font-size="${numSize}" font-family="${FONT}" font-weight="${isToday ? 800 : 600}">${day}</text>`;
    } else if (cfg.style === 'block') {
      if (isToday || isRestDay(date)) out += `<rect x="${cx - cellW * 0.4}" y="${cy - cellHReal * 0.55}" width="${cellW * 0.8}" height="${cellHReal * 0.7}" rx="${cellHReal * 0.15}" fill="${isToday ? theme.accent : alpha(theme.weekend, 0.15)}"/>`;
      out += `<text x="${cx}" y="${cy}" text-anchor="middle" fill="${isToday ? theme.bg : textColor}" font-size="${numSize}" font-family="${FONT}" font-weight="${isToday ? 800 : 600}">${day}</text>`;
    } else if (cfg.style === 'marker') {
      if (isToday) out += `<rect x="${cx - cellW * 0.45}" y="${cy - cellHReal * 0.2}" width="${cellW * 0.9}" height="${cellHReal * 0.35}" fill="${alpha(theme.accent, 0.5)}"/>`;
      out += `<text x="${cx}" y="${cy}" text-anchor="middle" fill="${textColor}" font-size="${numSize}" font-family="${FONT}" font-weight="${isToday ? 800 : 600}">${day}</text>`;
    } else if (cfg.style === 'dots' || cfg.style === 'micro') {
      out += `<circle cx="${cx}" cy="${cy - cellHReal * (cfg.style === 'dots' ? 0.2 : 0.18)}" r="${Math.max(1.1, Math.min(cellW, cellHReal) * (cfg.style === 'dots' ? (isToday ? 0.18 : 0.12) : 0.08))}" fill="${isToday ? theme.accent : isRestDay(date) ? theme.weekend : alpha(theme.text, 0.24)}"/><text x="${cx}" y="${cy + cellHReal * (cfg.style === 'dots' ? 0.3 : 0.24)}" text-anchor="middle" fill="${textColor}" font-size="${Math.round(numSize * (cfg.style === 'dots' ? 0.82 : 0.72))}" font-family="${FONT}" font-weight="700">${day}</text>`;
    } else if (cfg.style === 'focus') {
      out += `<text x="${cx}" y="${cy}" text-anchor="middle" fill="${textColor}" font-size="${Math.round(numSize * (isToday ? 1.05 : 1))}" font-family="${FONT}" font-weight="${isToday || isCurrent ? 800 : 600}">${day}</text>`;
      if (isCurrent && !isToday && !opts.tiny) out += `<line x1="${cx - cellW * 0.15}" y1="${cy + cellHReal * 0.15}" x2="${cx + cellW * 0.15}" y2="${cy + cellHReal * 0.15}" stroke="${alpha(theme.accent2, 0.35)}" stroke-linecap="round" stroke-width="2"/>`;
    } else if (cfg.style === 'capsule') {
      if (isToday || isRestDay(date)) out += `<rect x="${cx - cellW * 0.38}" y="${cy - cellHReal * 0.48}" width="${cellW * 0.76}" height="${cellHReal * 0.56}" rx="${cellHReal * 0.28}" fill="${isToday ? alpha(theme.accent, 0.25) : alpha(theme.weekend, 0.12)}"/>`;
      out += `<text x="${cx}" y="${cy}" text-anchor="middle" fill="${textColor}" font-size="${numSize}" font-family="${FONT}" font-weight="${isToday ? 800 : 600}">${day}</text>`;
    } else if (cfg.style === 'ring') {
      if (isToday) out += `<circle cx="${cx}" cy="${cy - cellHReal * 0.2}" r="${Math.min(cellW, cellHReal) * 0.28}" fill="none" stroke="${theme.accent}" stroke-width="${Math.max(1.2, w * 0.004)}"/>`;
      out += `<text x="${cx}" y="${cy}" text-anchor="middle" fill="${textColor}" font-size="${numSize}" font-family="${FONT}" font-weight="${isToday ? 800 : 600}">${day}</text>`;
    } else {
      if (isToday) {
        const rect = `<rect x="${cx - cellW * 0.45}" y="${cy - cellHReal * 0.6}" width="${cellW * 0.9}" height="${cellHReal * 0.8}" rx="${Math.min(cellW, cellHReal) * 0.2}"`;
        out += cfg.style === 'outline' ? `${rect} fill="none" stroke="${theme.accent}" stroke-width="${Math.max(1.2, w * 0.004)}"/>` : `${rect} fill="${alpha(theme.accent, cfg.style === 'numbers' ? 0.24 : 0.18)}" stroke="${alpha(theme.accent2, 0.34)}"/>`;
      }
      out += `<text x="${cx}" y="${cy}" text-anchor="middle" fill="${textColor}" font-size="${numSize}" font-family="${FONT}" font-weight="${isToday ? 800 : 600}">${day}</text>`;
    }
  }
  if (cfg.showWeekNumbers && !opts.tiny && !focusHero) {
    [...usedWeekRows].forEach((row) => out += `<text x="${x + pad + cellW / 2}" y="${y + topBand + row * cellHReal + cellHReal * 0.68}" text-anchor="middle" fill="${alpha(theme.muted, 0.7)}" font-size="${Math.round(numSize * 0.68)}" font-family="${FONT}">${first.add(row * 7 - firstWeekday, 'day').week()}</text>`);
  }
  return out;
}

function renderMonthListRow({ monthIndex, year, x, y, w, h, cfg, theme, labels, now, FONT }) {
  const first = dayjs(`${year}-${String(monthIndex + 1).padStart(2, '0')}-01`);
  const isCurrent = now.month() === monthIndex;
  const compact = cfg.monthLayout === 'list_1x12_compact' || cfg.monthLayout === 'list_2x6';
  const radius = Math.max(14, Math.round(h * (compact ? 0.24 : 0.28)));
  const padX = Math.round(w * (compact ? 0.024 : 0.03));
  const nameW = Math.round(w * (compact ? 0.16 : 0.18));
  const badgeW = cfg.monthBadges ? Math.round(w * 0.08) : 0;
  const innerX = x + padX + nameW;
  const innerW = Math.max(80, w - padX * 2 - nameW - badgeW);
  const cellW = innerW / 7;
  const cellH = Math.max(8, (h - (cfg.showWeekdays ? h * (compact ? 0.22 : 0.24) : h * (compact ? 0.14 : 0.16)) - h * (compact ? 0.08 : 0.10)) / 6);
  
  let out = `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${radius}" fill="${isCurrent ? alpha(theme.panel, 0.95) : alpha(theme.panel, 0.72)}" stroke="${isCurrent ? alpha(theme.accent2, cfg.glassPanels===false?0.24:0.38) : alpha('#ffffff', cfg.glassPanels===false?0.05:0.08)}"/>`;
  if (cfg.glassPanels !== false) out += `<rect x="${x + 1.5}" y="${y + 1.5}" width="${Math.max(0, w - 3)}" height="${Math.max(0, h - 3)}" rx="${Math.max(0, radius - 1.5)}" fill="none" stroke="${alpha(theme.accent2, isCurrent ? 0.09 : 0.04)}"/>`;
  out += `<text x="${x + padX}" y="${y + h * 0.28}" fill="${theme.text}" font-size="${Math.max(12, Math.round(Math.min(h * (compact ? 0.16 : 0.19), nameW * 0.22)))}" font-family="${FONT}" font-weight="800">${pickMonthLabel(labels, monthIndex, nameW, 'list')}</text>`;
  
  if (cfg.monthBadges) out += `<rect x="${x + w - padX - badgeW}" y="${y + h * 0.17}" width="${badgeW}" height="${h * 0.20}" rx="${h * 0.10}" fill="${isCurrent ? alpha(theme.accent, 0.18) : alpha('#ffffff', 0.05)}"/><text x="${x + w - padX - badgeW / 2}" y="${y + h * 0.30}" text-anchor="middle" fill="${isCurrent ? theme.accent2 : theme.muted}" font-size="${Math.round(h * 0.10)}" font-family="${FONT}" font-weight="700">${first.daysInMonth()}${cfg.lang === 'ru' ? 'д' : 'd'}</text>`;

  const gridTop = y + (cfg.showWeekdays ? h * (compact ? 0.22 : 0.24) : h * (compact ? 0.14 : 0.16)) + (cfg.showWeekdays ? h * (compact ? 0.04 : 0.05) : 0);
  if (cfg.showWeekdays) labels.weekdays.forEach((wd, i) => out += `<text x="${innerX + i * cellW + cellW / 2}" y="${y + h * 0.24}" text-anchor="middle" fill="${i >= 5 ? alpha(theme.weekend, 0.95) : theme.muted}" font-size="${Math.max(8, Math.round(Math.min(h * (compact ? 0.078 : 0.088), cellW * 0.24)))}" font-family="${FONT}" font-weight="700">${wd}</text>`);
  
  if (cfg.strongWeekendTint) [5, 6].forEach((wCol, idx) => out += `<rect x="${innerX + wCol * cellW + cellW * 0.08}" y="${gridTop - cellH * 0.18}" width="${cellW * 0.84}" height="${cellH * 5.2}" rx="${cellW * 0.22}" fill="${alpha(theme.weekend, idx === 0 ? 0.06 : 0.09)}"/>`);

  const isRestDay = isRestDayFactory(cfg, year);
  const firstWeekday = (first.day() + 6) % 7;
  for (let day = 1; day <= first.daysInMonth(); day++) {
    const cx = innerX + ((firstWeekday + day - 1) % 7) * cellW + cellW / 2;
    const cy = gridTop + Math.floor((firstWeekday + day - 1) / 7) * cellH + cellH * 0.72;
    const date = dayjs(`${year}-${String(monthIndex + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`);
    const isToday = cfg.accentToday && date.isSame(now, 'day');
    const isCustomEvent = cfg.eventsMap && cfg.eventsMap[`${String(monthIndex + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`];
    let textColor = isToday ? theme.text : isRestDay(date) ? theme.weekend : (date.isBefore(now, 'day') && now.month() === monthIndex) ? alpha(theme.text, 0.64) : theme.text;
    if (isCustomEvent && !isToday) textColor = cfg.eventColor;

    if (isCustomEvent) out += `<rect x="${cx - cellW * 0.35}" y="${cy - cellH * 0.65}" width="${cellW * 0.7}" height="${cellH * 0.75}" rx="${Math.min(cellW, cellH) * 0.2}" fill="${alpha(cfg.eventColor, 0.18)}" stroke="${alpha(cfg.eventColor, 0.34)}"/>`;
    if (isToday) out += `<rect x="${cx - cellW * 0.34}" y="${cy - cellH * 0.58}" width="${cellW * 0.68}" height="${cellH * 0.72}" rx="${Math.min(cellW, cellH) * 0.22}" fill="${alpha(theme.accent, 0.24)}" stroke="${alpha(theme.accent2, 0.28)}"/>`;
    if (cfg.style === 'dots' || cfg.style === 'micro') out += `<circle cx="${cx}" cy="${cy - cellH * 0.24}" r="${Math.max(1.1, Math.min(cellW, cellH) * 0.08)}" fill="${isToday ? theme.accent : isRestDay(date) ? theme.weekend : alpha(theme.text, 0.22)}"/>`;
    out += `<text x="${cx}" y="${cy + (cfg.style === 'dots' || cfg.style === 'micro' ? cellH * 0.18 : 0)}" text-anchor="middle" fill="${textColor}" font-size="${Math.max(8, Math.round(Math.min(cellW, cellH) * (compact ? 0.40 : 0.44)))}" font-family="${FONT}" font-weight="${isToday ? 800 : 600}">${day}</text>`;
  }
  return out;
}

function renderFooter(cfg, theme, labels, now, stats, width, footerBox, FONT) {
  const { x, y, w, h } = footerBox;
  let base = `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${Math.round(w * 0.05)}" fill="${alpha(theme.panel, 0.82)}" stroke="${alpha('#ffffff', cfg.glassPanels===false?0.06:0.08)}"/>`;
  if (cfg.glassPanels !== false) base += `<rect x="${x + 1.5}" y="${y + 1.5}" width="${Math.max(0, w - 3)}" height="${Math.max(0, h - 3)}" rx="${Math.max(0, Math.round(w * 0.05) - 1.5)}" fill="none" stroke="${alpha(theme.accent2, 0.05)}"/>`; 
  
  const pad = Math.round(w * 0.04);
  const textSize = Math.round(h * 0.22);
  const subSize = Math.round(h * 0.15);
  
  if (cfg.footer === 'quote') {
    const arr = cfg.lang === 'ru' ? ['Маленькие шаги собирают большой год.', 'Спокойный ритм сильнее хаоса.'] : ['Small steps shape a big year.', 'Consistency beats intensity.'];
    return base + (cfg.note || arr[now.year() % 2]).split('\n').map((line, i) => `<text x="${x + w / 2}" y="${y + h * 0.38 + i * subSize * 1.45}" text-anchor="middle" fill="${theme.text}" font-size="${subSize}" font-family="${FONT}" font-weight="700">${escapeXml(line)}</text>`).join('');
  }
  if (cfg.footer === 'progress_bar') return base + `<text x="${x + pad}" y="${y + h * 0.32}" fill="${theme.text}" font-size="${textSize}" font-family="${FONT}" font-weight="800">${stats.percentPassed}% ${labels.passed}</text><rect x="${x + pad}" y="${y + h * 0.55}" width="${w - pad * 2}" height="${h * 0.12}" rx="${h * 0.06}" fill="${alpha(theme.bg, 0.7)}" /><rect x="${x + pad}" y="${y + h * 0.55}" width="${(w - pad * 2) * stats.percentPassed / 100}" height="${h * 0.12}" rx="${h * 0.06}" fill="${theme.accent}" />`;
  if (cfg.footer === 'today_card') return base + `<text x="${x + pad}" y="${y + h * 0.34}" fill="${theme.accent2}" font-size="${subSize}" font-family="${FONT}" font-weight="700">${labels.today}</text><text x="${x + pad}" y="${y + h * 0.68}" fill="${theme.text}" font-size="${textSize}" font-family="${FONT}" font-weight="800">${escapeXml(cfg.lang === 'ru' ? `${labels.weekdaysFull[(now.day() + 6) % 7]}, ${now.date()} ${labels.monthsGenitive[now.month()]}` : `${labels.weekdaysFull[(now.day() + 6) % 7]}, ${labels.months[now.month()]} ${now.date()}`)}</text>`;
  
  if (cfg.footer === 'next_event') {
    const n = findNearestEvent(cfg, now, labels);
    return base + `<text x="${x + pad}" y="${y + h * 0.32}" fill="${theme.accent2}" font-size="${subSize}" font-family="${FONT}" font-weight="700">${cfg.lang === 'ru' ? 'Ближайший ориентир' : 'Next marker'}</text><text x="${x + pad}" y="${y + h * 0.62}" fill="${theme.text}" font-size="${textSize}" font-family="${FONT}" font-weight="800">${escapeXml(n ? n.title : (cfg.lang === 'ru' ? 'Событий нет' : 'No events'))}</text><text x="${x + pad}" y="${y + h * 0.82}" fill="${theme.muted}" font-size="${subSize}" font-family="${FONT}" font-weight="600">${escapeXml(n ? (cfg.lang === 'ru' ? `Через ${n.diff} дн. · ${n.label}` : `In ${n.diff} days · ${n.label}`) : weatherSummary(cfg, cfg.lang))}</text>`;
  }
  if (cfg.footer === 'seasonal_focus') return base + `<text x="${x + pad}" y="${y + h * 0.26}" fill="${theme.accent2}" font-size="${subSize}" font-family="${FONT}" font-weight="700">${cfg.lang === 'ru' ? 'Сезонный режим' : 'Season mode'}</text><text x="${x + pad}" y="${y + h * 0.5}" fill="${theme.text}" font-size="${textSize}" font-family="${FONT}" font-weight="800">${escapeXml(cfg.lang === 'ru' ? `${getSeasonLabel('ru', now.month())} · ${stats.daysLeft} дн. до конца года` : `${getSeasonLabel('en', now.month())} · ${stats.daysLeft} days left`)}</text><text x="${x + pad}" y="${y + h * 0.72}" fill="${theme.muted}" font-size="${subSize}" font-family="${FONT}" font-weight="600">${escapeXml((cfg.note || (cfg.lang === 'ru' ? 'Спокойный темп, ясный фокус.' : 'Calm pace, clear focus.')).slice(0, 48))}</text>`;
  
  if (cfg.footer === 'weather_strip') {
    if (cfg.weatherDataList && cfg.weatherDataList.length > 1) {
      const numCities = cfg.weatherDataList.length;
      const slotW = (w - pad * 2) / numCities;
      let out = base + `<text x="${x + pad}" y="${y + h * 0.28}" fill="${theme.accent2}" font-size="${subSize}" font-family="${FONT}" font-weight="700">${cfg.lang === 'ru' ? 'Сводка среды' : 'Ambient summary'}</text>`;
      cfg.weatherDataList.forEach((wd, i) => {
        const cx = x + pad + i * slotW;
        out += `<text x="${cx}" y="${y + h * 0.65}" fill="${theme.text}" font-size="${textSize*0.8}" font-family="${FONT}" font-weight="800">${escapeXml(wd.temp + '°C ' + wd.icon)}</text>`;
        out += `<text x="${cx}" y="${y + h * 0.88}" fill="${theme.muted}" font-size="${subSize*0.85}" font-family="${FONT}" font-weight="600">${escapeXml(wd.cityLabel.length > 12 ? wd.cityLabel.slice(0,11)+'…' : wd.cityLabel)}</text>`;
      });
      return out;
    }
    return base + `<text x="${x + pad}" y="${y + h * 0.34}" fill="${theme.accent2}" font-size="${subSize}" font-family="${FONT}" font-weight="700">${cfg.lang === 'ru' ? 'Сводка среды' : 'Ambient summary'}</text><text x="${x + pad}" y="${y + h * 0.62}" fill="${theme.text}" font-size="${textSize}" font-family="${FONT}" font-weight="800">${escapeXml(weatherSummary(cfg, cfg.lang))}</text><text x="${x + pad}" y="${y + h * 0.82}" fill="${theme.muted}" font-size="${subSize}" font-family="${FONT}" font-weight="600">UTC${cfg.timezone >= 0 ? '+'+cfg.timezone : cfg.timezone} · ${labels.months[now.month()]} ${now.date()}</text>`;
  }
  
  if (cfg.footer === 'day_weather') {
    const title = cfg.lang === 'ru' ? 'Прогноз на день' : 'Day forecast';
    const boxX = x - w * 0.015;
    const boxW = w + w * 0.03;
    const titleX = boxX + boxW * 0.07;
    const titleY = y + h * 0.11;
    let panel = `<rect x="${boxX}" y="${y}" width="${boxW}" height="${h}" rx="${Math.round(boxW * 0.05)}" fill="${alpha(theme.panel, 0.82)}" stroke="${alpha('#ffffff', cfg.glassPanels===false?0.06:0.08)}"/>`;
    if (cfg.glassPanels !== false) panel += `<rect x="${boxX + 1.5}" y="${y + 1.5}" width="${Math.max(0, boxW - 3)}" height="${Math.max(0, h - 3)}" rx="${Math.max(0, Math.round(boxW * 0.05) - 1.5)}" fill="none" stroke="${alpha(theme.accent2, 0.05)}"/>`;
    panel += `<text x="${titleX}" y="${titleY}" fill="${theme.accent2}" font-size="${subSize}" font-family="${FONT}" font-weight="700">${title}</text>`;

    if (!cfg.weatherDataList || cfg.weatherDataList.length === 0) {
      return panel + `<text x="${titleX}" y="${y + h * 0.52}" fill="${theme.text}" font-size="${textSize * 0.8}" font-family="${FONT}" font-weight="700">${cfg.lang === 'ru' ? 'Добавь город для погоды' : 'Add city for forecast'}</text>`;
    }

    const outerPad = Math.round(boxW * 0.065);
    const gap = Math.max(18, Math.round(boxW * 0.03));
    const contentTop = y + h * 0.25;
    const contentBottom = y + h * 0.90;
    const contentH = contentBottom - contentTop;

    if (cfg.weatherDataList.length === 1) {
      const wd = cfg.weatherDataList[0];
      const city = String(wd.cityLabel || '').split(',')[0].trim();
      const items = (wd.hourly || []).slice(0, 4);
      const citySize = subSize * 0.95;
      const rowH = contentH / Math.max(4.2, items.length + 0.4);
      const rowX = boxX + outerPad;
      const rowW = boxW - outerPad * 2;
      let out = panel;
      if (city) out += `<text x="${boxX + boxW / 2}" y="${contentTop + citySize * 0.15}" text-anchor="middle" fill="${theme.text}" font-size="${citySize}" font-family="${FONT}" font-weight="700">${escapeXml(city)}</text>`;
      items.forEach((item, idx) => {
        const ry = contentTop + citySize * 0.55 + idx * rowH;
        out += `<line x1="${rowX + rowW * 0.18}" y1="${ry + rowH * 0.78}" x2="${rowX + rowW}" y2="${ry + rowH * 0.78}" stroke="${alpha(theme.accent, 0.14)}"/>`;
        out += `<rect x="${rowX}" y="${ry + rowH * 0.10}" width="${rowW * 0.18}" height="${rowH * 0.62}" rx="${rowH * 0.31}" fill="${alpha(theme.bg, 0.16)}" stroke="${alpha(theme.accent, 0.22)}"/>`;
        out += `<text x="${rowX + rowW * 0.09}" y="${ry + rowH * 0.54}" text-anchor="middle" fill="${theme.accent2}" font-size="${subSize * 0.72}" font-family="${FONT}" font-weight="700">${escapeXml(item.hour)}</text>`;
        out += `<text x="${rowX + rowW * 0.24}" y="${ry + rowH * 0.56}" fill="${theme.text}" font-size="${subSize * 0.9}" font-family="${FONT}">${item.icon}</text>`;
        out += `<text x="${rowX + rowW}" y="${ry + rowH * 0.56}" text-anchor="end" fill="${theme.text}" font-size="${subSize * 0.86}" font-family="${FONT}" font-weight="800">${escapeXml(item.temp)}°</text>`;
      });
      return out;
    }

    let out = panel;
    const numCities = cfg.weatherDataList.length;
    const slotW = (boxW - outerPad * 2 - gap * (numCities - 1)) / numCities;
    cfg.weatherDataList.forEach((wd, i) => {
      const city = String(wd.cityLabel || '').split(',')[0].trim();
      const items = (wd.hourly || []).slice(0, 4);
      const colX = boxX + outerPad + i * (slotW + gap);
      const citySize = Math.min(subSize * 0.92, slotW * 0.14);
      const cityLabel = city.length > 14 ? city.slice(0, 13) + '…' : city;
      const rowTop = contentTop + citySize * 0.55;
      const rowH = (contentBottom - rowTop) / Math.max(4.15, items.length + 0.15);
      out += `<text x="${colX + slotW / 2}" y="${contentTop + citySize * 0.1}" text-anchor="middle" fill="${theme.text}" font-size="${citySize}" font-family="${FONT}" font-weight="700">${escapeXml(cityLabel)}</text>`;
      out += `<line x1="${colX + slotW * 0.08}" y1="${contentTop + citySize * 0.32}" x2="${colX + slotW * 0.92}" y2="${contentTop + citySize * 0.32}" stroke="${alpha(theme.accent, 0.14)}"/>`;
      items.forEach((item, idx) => {
        const ry = rowTop + idx * rowH;
        out += `<line x1="${colX + slotW * 0.18}" y1="${ry + rowH * 0.78}" x2="${colX + slotW * 0.92}" y2="${ry + rowH * 0.78}" stroke="${alpha(theme.accent, 0.14)}"/>`;
        out += `<rect x="${colX + slotW * 0.02}" y="${ry + rowH * 0.10}" width="${slotW * 0.30}" height="${rowH * 0.62}" rx="${rowH * 0.31}" fill="${alpha(theme.bg, 0.16)}" stroke="${alpha(theme.accent, 0.22)}"/>`;
        out += `<text x="${colX + slotW * 0.17}" y="${ry + rowH * 0.54}" text-anchor="middle" fill="${theme.accent2}" font-size="${subSize * 0.70}" font-family="${FONT}" font-weight="700">${escapeXml(item.hour)}</text>`;
        out += `<text x="${colX + slotW * 0.40}" y="${ry + rowH * 0.56}" fill="${theme.text}" font-size="${subSize * 0.88}" font-family="${FONT}">${item.icon}</text>`;
        out += `<text x="${colX + slotW * 0.92}" y="${ry + rowH * 0.56}" text-anchor="end" fill="${theme.text}" font-size="${subSize * 0.84}" font-family="${FONT}" font-weight="800">${escapeXml(item.temp)}°</text>`;
      });
    });
    return out;
  }
  
  if (cfg.footer === 'custom_note' && cfg.note) return base + (cfg.note).split('\n').map((line, i) => `<text x="${x + pad}" y="${y + h * 0.38 + i * subSize * 1.6}" fill="${theme.text}" font-size="${subSize}" font-family="${FONT}" font-weight="700">${escapeXml(line)}</text>`).join('');
  
  return base + `<text x="${x + pad}" y="${y + h * 0.36}" fill="${theme.text}" font-size="${textSize}" font-family="${FONT}" font-weight="800">${stats.daysLeft} ${labels.daysLeft}</text><text x="${x + pad}" y="${y + h * 0.66}" fill="${theme.muted}" font-size="${subSize}" font-family="${FONT}">${stats.percentPassed}% ${labels.passed}</text>`;
}

function renderSvg(cfg) {
  const theme = cfg.themeObj;
  const labels = getLabels(cfg.lang);
  const now = dayjs.utc().add(cfg.timezone, 'hour');
  const stats = yearStats(now);
  cfg.eventsMap = parseEvents(cfg.events);

  const { width, height } = cfg;
  const sidePadding = Math.round(width * 0.035);
  const innerTop = cfg.lockscreenSafe ? Math.round(height * 0.24 + width * 0.04) : sidePadding;
  const innerBottom = height - (cfg.lockscreenSafe ? Math.round(height * 0.105 + width * 0.03) : sidePadding);

  const selectedFontDef = FONTS[cfg.font] || FONTS.inter;
  const b64Font = fontCache[cfg.font];
  const FONT_FAMILY = getSafeFontStack(selectedFontDef.family, cfg.pngSafeFont);
  
  const fontDefs = b64Font ? `<style>@font-face { font-family: '${selectedFontDef.family}'; src: url(data:font/truetype;base64,${b64Font}) format('truetype'); font-weight: 100 900; font-style: normal; } text, tspan { font-family: ${FONT_FAMILY}; text-rendering: geometricPrecision; }</style>` : '';

  const listLike = isListLayout(cfg.monthLayout);
  const compactLike = isCompactGridLayout(cfg.monthLayout) || listLike;
  const headerHeight = Math.round(height * (listLike ? 0.088 : compactLike ? 0.09 : 0.095));
  const footerHeight = Math.round(height * (listLike ? 0.072 : compactLike ? 0.076 : 0.08));
  const contentTop = innerTop + headerHeight + Math.round(height * 0.012);
  const contentBottom = innerBottom - footerHeight - Math.round(height * 0.014);
  const contentH = contentBottom - contentTop;

  const layout = getLayoutMetrics(cfg, width, height, contentH, sidePadding);

  let monthsSvg = '';
  if (layout.mode === 'focus') {
    const heroGap = Math.round(width * 0.014);
    const heroH = Math.round(contentH * 0.40);
    monthsSvg += renderMonthGrid({ monthIndex: now.month(), year: now.year(), x: sidePadding, y: contentTop, w: width - sidePadding * 2, h: heroH, cfg: { ...cfg, monthLayout: 'single_month_focus', monthBadges: true, showWeekNumbers: true }, theme, labels, now, FONT: FONT_FAMILY });
    const miniTop = contentTop + heroH + heroGap;
    const miniH = (contentBottom - miniTop - heroGap * 2) / 3, miniW = (width - sidePadding * 2 - heroGap * 3) / 4;
    Array.from({ length: 12 }, (_, i) => i).filter(i => i !== now.month()).forEach((monthIndex, i) => {
      monthsSvg += renderMonthGrid({ monthIndex, year: now.year(), x: sidePadding + (i % 4) * (miniW + heroGap), y: miniTop + Math.floor(i / 4) * (miniH + heroGap), w: miniW, h: miniH, cfg: { ...cfg, monthLayout: 'grid_3x4_compact', focusCurrentMonth: false, monthBadges: false, showWeekNumbers: false, showWeekdays: true }, theme, labels, now, FONT: FONT_FAMILY });
    });
  } else if (layout.mode === 'focus_single') {
    const heroH = Math.round(contentH * 0.65); 
    const heroY = contentTop + (contentH - heroH) / 2;
    monthsSvg += renderMonthGrid({ monthIndex: now.month(), year: now.year(), x: sidePadding, y: heroY, w: width - sidePadding * 2, h: heroH, cfg: { ...cfg, monthLayout: 'current_month_only', monthBadges: true, showWeekNumbers: true }, theme, labels, now, FONT: FONT_FAMILY });
  } else if (layout.mode === 'current_three') {
    for (let i = 0; i < 3; i++) {
        const targetDate = now.add(i, 'month');
        const h = layout.monthH;
        const y = contentTop + i * (h + layout.gap);
        monthsSvg += renderMonthGrid({ monthIndex: targetDate.month(), year: targetDate.year(), x: sidePadding, y, w: layout.monthW, h, cfg: { ...cfg, monthLayout: 'single_month_focus', monthBadges: true }, theme, labels, now, FONT: FONT_FAMILY });
    }
  } else {
    for (let i = 0; i < 12; i++) {
      const x = sidePadding + (i % layout.cols) * (layout.monthW + layout.gap), y = contentTop + Math.floor(i / layout.cols) * (layout.monthH + layout.gap);
      monthsSvg += isListLayout(cfg.monthLayout) ? renderMonthListRow({ monthIndex: i, year: now.year(), x, y, w: layout.monthW, h: layout.monthH, cfg, theme, labels, now, FONT: FONT_FAMILY }) : renderMonthGrid({ monthIndex: i, year: now.year(), x, y, w: layout.monthW, h: layout.monthH, cfg, theme, labels, now, FONT: FONT_FAMILY });
    }
  }

  let quarterLines = '';
  if (cfg.quarterDividers && layout.mode !== 'focus' && layout.mode !== 'focus_single' && layout.mode !== 'current_three') {
    if (isListLayout(cfg.monthLayout) && layout.rows === 12) { [3, 6, 9].forEach((idx) => quarterLines += `<line x1="${sidePadding}" y1="${contentTop + idx * layout.monthH + (idx - 0.5) * layout.gap}" x2="${width - sidePadding}" y2="${contentTop + idx * layout.monthH + (idx - 0.5) * layout.gap}" stroke="${alpha(theme.accent2, 0.12)}" stroke-dasharray="12 12" />`); } 
    else if (layout.cols === 3 && layout.rows === 4) { for (let r = 1; r < layout.rows; r++) quarterLines += `<line x1="${sidePadding}" y1="${contentTop + r * layout.monthH + (r - 0.5) * layout.gap}" x2="${width - sidePadding}" y2="${contentTop + r * layout.monthH + (r - 0.5) * layout.gap}" stroke="${alpha(theme.accent2, 0.12)}" stroke-dasharray="10 12" />`; } 
    else if (layout.cols === 4 && layout.rows === 3) { for (let r = 1; r < layout.rows; r++) quarterLines += `<line x1="${sidePadding}" y1="${contentTop + r * layout.monthH + (r - 0.5) * layout.gap}" x2="${width - sidePadding}" y2="${contentTop + r * layout.monthH + (r - 0.5) * layout.gap}" stroke="${alpha(theme.accent2, 0.12)}" stroke-dasharray="10 12" />`; }
    else if (layout.cols === 2 && layout.rows === 6) { [2, 4].forEach((r) => quarterLines += `<line x1="${sidePadding}" y1="${contentTop + r * layout.monthH + (r - 0.5) * layout.gap}" x2="${width - sidePadding}" y2="${contentTop + r * layout.monthH + (r - 0.5) * layout.gap}" stroke="${alpha(theme.accent2, 0.10)}" stroke-dasharray="10 12" />`); } 
    else if (layout.cols === 6 && layout.rows === 2) {
      quarterLines += `<line x1="${sidePadding}" y1="${contentTop + layout.monthH + layout.gap / 2}" x2="${width - sidePadding}" y2="${contentTop + layout.monthH + layout.gap / 2}" stroke="${alpha(theme.accent2, 0.10)}" stroke-dasharray="10 12" />`;
      [3].forEach((c) => quarterLines += `<line x1="${sidePadding + c * layout.monthW + (c - 0.5) * layout.gap}" y1="${contentTop}" x2="${sidePadding + c * layout.monthW + (c - 0.5) * layout.gap}" y2="${contentBottom}" stroke="${alpha(theme.accent2, 0.08)}" stroke-dasharray="8 10" />`);
    }
  }

  return `<?xml version="1.0" encoding="UTF-8"?><svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}"><defs>${fontDefs}</defs>${renderBackground(cfg, theme, width, height)}${renderHeader(cfg, theme, labels, now, stats, width, sidePadding, innerTop, FONT_FAMILY)}${quarterLines}${monthsSvg}${renderFooter(cfg, theme, labels, now, stats, width, { x: sidePadding, y: innerBottom - footerHeight, w: width - sidePadding * 2, h: Math.round(footerHeight * 0.92) }, FONT_FAMILY)}</svg>`;
}

app.use(express.static(path.join(__dirname, 'public')));
app.get('/api/options', (req, res) => {
  res.json({ presets: PHONE_PRESETS, themes: THEMES, bgStyles: BG_STYLES, fonts: Object.fromEntries(Object.entries(FONTS).map(([k, v]) => [k, v.name])) });
});

app.get('/api/weather', async (req, res) => {
  const city = String(req.query.city || '').trim();
  const lang = String(req.query.lang || 'ru').trim();
  if (!city) return res.status(400).json({ ok: false, error: 'CITY_REQUIRED' });
  const data = await fetchWeatherByCity(city, lang);
  if (!data) return res.status(404).json({ ok: false, error: 'WEATHER_NOT_FOUND', city });
  return res.json({ ok: true, city, data });
});

app.get('/api/debug-weather', async (req, res) => {
  const cfg = getConfig(req.query || {});
  const resolved = await resolveWeatherList(cfg.citiesToFetch, cfg.lang);
  res.json({
    ok: true,
    requestedCities: cfg.citiesToFetch,
    resolvedCount: resolved.length,
    resolved
  });
});

app.get('/wallpaper.svg', async (req, res) => {
  const cfg = getConfig(req.query);
  cfg.weatherDataList = await resolveWeatherList(cfg.citiesToFetch, cfg.lang);
  res.setHeader('X-Weather-Requested', String(cfg.citiesToFetch.length));
  res.setHeader('X-Weather-Resolved', String(cfg.weatherDataList.length));
  res.setHeader('X-Weather-Cities', encodeURIComponent(cfg.citiesToFetch.join(' | ')));
  res.type('image/svg+xml').send(renderSvg(cfg));
});

app.get('/wallpaper.png', async (req, res) => {
  try {
    const cacheKey = `${RENDER_VERSION}:${req.originalUrl}:${dayjs().format('YYYY-MM-DD-HH')}`;
    if (pngCache.has(cacheKey)) {
      res.setHeader('Content-Type', 'image/png');
      res.setHeader('X-Cache', 'HIT');
      return res.send(pngCache.get(cacheKey));
    }

    const cfg = getConfig(req.query);
    // Теперь, даже если погода вернёт ошибку, функция не упадёт, 
    // а просто продолжит генерацию картинки с пустым массивом погоды
    cfg.weatherDataList = await resolveWeatherList(cfg.citiesToFetch, cfg.lang);
    const svg = renderSvg(cfg);

    let png;
    try {
      const fontFiles = Object.values(FONTS)
        .map((f) => path.join(fontsDir, f.file))
        .filter((f) => fs.existsSync(f));
      const selected = FONTS[cfg.font] || FONTS.inter;
      const resvg = new Resvg(svg, {
        fitTo: { mode: 'original' },
        font: {
          fontFiles,
          loadSystemFonts: true,
          defaultFontFamily: selected.family,
          sansSerifFamily: selected.family,
          serifFamily: selected.family,
          monospaceFamily: selected.family,
        },
      });
      png = Buffer.from(resvg.render().asPng());
    } catch (renderErr) {
      console.error('Resvg render failed, fallback to sharp:', renderErr);
      png = await sharp(Buffer.from(svg), { density: 300 }).png().toBuffer();
    }

    if (pngCache.size < 1000) pngCache.set(cacheKey, png);
    res.setHeader('Content-Type', 'image/png');
    res.setHeader('Cache-Control', 'public, max-age=3600');
    res.setHeader('X-Cache', 'MISS');
    res.setHeader('X-Weather-Requested', String(cfg.citiesToFetch.length));
    res.setHeader('X-Weather-Resolved', String(cfg.weatherDataList.length));
    res.send(png);
  } catch (err) {
    console.error('CRITICAL PNG ERROR:', err);
    res.status(500).send('SERVER ERROR');
  }
});

if (require.main === module) {
  app.listen(PORT, () => console.log(`Сервер запущен на порту ${PORT}`));
}
module.exports = app;
