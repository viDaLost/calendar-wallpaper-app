const express = require('express');
const path = require('path');
const sharp = require('sharp');
const { Resvg } = require('@resvg/resvg-js');
const dayjs = require('dayjs');
const utc = require('dayjs/plugin/utc');
const isLeapYear = require('dayjs/plugin/isLeapYear');
const weekOfYear = require('dayjs/plugin/weekOfYear');
const fs = require('fs');

dayjs.extend(utc);
dayjs.extend(isLeapYear);
dayjs.extend(weekOfYear);

// Импортируем ядро
const Engine = require('./public/engine.js');

const app = express();
const PORT = process.env.PORT || 3000;

// In-memory Кеш PNG картинок (Очистка каждый час)
const pngCache = new Map();
const cacheSweepTimer = setInterval(() => pngCache.clear(), 1000 * 60 * 60);
if (cacheSweepTimer.unref) cacheSweepTimer.unref();

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

const PHONE_PRESETS = {
  iphone_se_1: { label: 'iPhone SE (1-е пок.)', width: 640, height: 1136 },
  iphone_8: { label: 'iPhone 8 / 7 / 6s', width: 750, height: 1334 },
  iphone_8_plus: { label: 'iPhone 8 Plus / 7 Plus', width: 1080, height: 1920 },
  iphone_se_2: { label: 'iPhone SE (2/3-е пок.)', width: 750, height: 1334 },
  iphone_x: { label: 'iPhone X / XS / 11 Pro', width: 1125, height: 2436 },
  iphone_xr: { label: 'iPhone XR / 11', width: 828, height: 1792 },
  iphone_xs_max: { label: 'iPhone XS Max / 11 Pro Max', width: 1242, height: 2688 },
  iphone_12_mini: { label: 'iPhone 12/13 mini', width: 1080, height: 2340 },
  iphone_12: { label: 'iPhone 12/13/14 / Pro', width: 1170, height: 2532 },
  iphone_12_pro_max: { label: 'iPhone 12/13 Pro Max / 14 Plus', width: 1284, height: 2778 },
  iphone_14_pro: { label: 'iPhone 14 Pro', width: 1179, height: 2556 },
  iphone_14_pro_max: { label: 'iPhone 14 Pro Max', width: 1290, height: 2796 },
  iphone_15: { label: 'iPhone 15', width: 1179, height: 2556 },
  iphone_15_plus: { label: 'iPhone 15 Plus', width: 1290, height: 2796 },
  iphone_15_pro: { label: 'iPhone 15 Pro', width: 1179, height: 2556 },
  iphone_15_pro_max: { label: 'iPhone 15 Pro Max', width: 1290, height: 2796 },
  iphone_16: { label: 'iPhone 16', width: 1179, height: 2556 },
  iphone_16_plus: { label: 'iPhone 16 Plus', width: 1290, height: 2796 },
  iphone_16_pro: { label: 'iPhone 16 Pro', width: 1206, height: 2622 },
  iphone_16_pro_max: { label: 'iPhone 16 Pro Max', width: 1320, height: 2868 },
  iphone_17: { label: 'iPhone 17', width: 1206, height: 2622 },
  iphone_air: { label: 'iPhone Air', width: 1260, height: 2736 },
  iphone_17_pro: { label: 'iPhone 17 Pro', width: 1206, height: 2622 },
  iphone_17_pro_max: { label: 'iPhone 17 Pro Max', width: 1320, height: 2868 },
  custom: { label: 'Свой размер', width: 1179, height: 2556 }
};

const fontCache = {};
const fontsDir = path.join(__dirname, 'fonts');
if (fs.existsSync(fontsDir)) {
  for (const [key, fontDef] of Object.entries(FONTS)) {
    const fp = path.join(fontsDir, fontDef.file);
    if (fs.existsSync(fp)) fontCache[key] = fs.readFileSync(fp).toString('base64');
  }
}

// Локальный буфер шрифта по умолчанию: без внешних запросов, чтобы серверless не падал
const defaultFontBuffer = fontCache.inter ? Buffer.from(fontCache.inter, 'base64') : null;

async function fetchJsonWithTimeout(url, timeoutMs = 2200) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const resp = await fetch(url, { signal: controller.signal, headers: { 'accept': 'application/json' } });
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    return await resp.json();
  } finally {
    clearTimeout(timer);
  }
}

// Получение погоды по названию города (Open-Meteo Geocoding)
function weatherIconFromCode(code) {
  let icon = '☀️';
  if (code >= 1 && code <= 3) icon = '⛅';
  if (code >= 45 && code <= 48) icon = '🌫️';
  if (code >= 51 && code <= 67) icon = '🌧️';
  if (code >= 71 && code <= 77) icon = '❄️';
  if (code >= 80 && code <= 82) icon = '🌦️';
  if (code >= 95) icon = '⛈️';
  return icon;
}

async function fetchWeatherByCity(city) {
  const normalizedCity = String(city || '').split(',')[0].trim();
  if (!normalizedCity) return null;
  try {
    const geoData = await fetchJsonWithTimeout(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(normalizedCity)}&count=1&language=ru`, 1800);
    if (!geoData.results || geoData.results.length === 0) return null;

    const place = geoData.results[0];
    const { latitude, longitude, timezone } = place;
    const data = await fetchJsonWithTimeout(`https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,weather_code&hourly=temperature_2m,weather_code&forecast_days=1&timezone=${encodeURIComponent(timezone || 'auto')}`, 2200);
    if (!data.current || typeof data.current.temperature_2m !== 'number') return null;

    const temp = Math.round(data.current.temperature_2m);
    const code = data.current.weather_code;
    const cityLabel = String(place.name || normalizedCity).trim();

    const preferredHours = [6, 9, 12, 15, 18, 21];
    const hourly = [];
    if (data.hourly && Array.isArray(data.hourly.time) && Array.isArray(data.hourly.temperature_2m)) {
      for (const targetHour of preferredHours) {
        const idx = data.hourly.time.findIndex((t) => Number(String(t).slice(11, 13)) === targetHour);
        if (idx >= 0) {
          const t = Math.round(data.hourly.temperature_2m[idx]);
          const hourlyCode = Array.isArray(data.hourly.weather_code) ? data.hourly.weather_code[idx] : code;
          hourly.push({ hour: `${String(targetHour).padStart(2, '0')}:00`, temp: t > 0 ? `+${t}` : `${t}`, icon: weatherIconFromCode(hourlyCode) });
        }
      }
    }

    return { temp: temp > 0 ? `+${temp}` : `${temp}`, icon: weatherIconFromCode(code), cityLabel, hourly };
  } catch (e) {
    return null;
  }
}

app.use(express.static(path.join(__dirname, 'public')));

app.get('/api/options', (req, res) => {
  res.json({ 
    presets: PHONE_PRESETS, themes: Engine.THEMES, bgStyles: Engine.BG_STYLES, 
    fonts: Object.fromEntries(Object.entries(FONTS).map(([k, v]) => [k, v.name])),
    fontFamilies: Object.fromEntries(Object.entries(FONTS).map(([k, v]) => [k, v.family]))
  });
});

app.get('/api/fonts', (req, res) => {
  res.json(fontCache);
});

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
    themeObj = Engine.THEMES[query.theme] || Engine.THEMES.graphite_orange;
  }
  let rawBg = query.bg_style || 'mesh_organic';
  if(rawBg === 'glass') rawBg = 'liquid_glass'; if(rawBg === 'mesh') rawBg = 'carbon'; if(rawBg === 'grain_light') rawBg = 'paper';

  return {
    model: query.model || 'iphone_15',
    width: query.model === 'custom' ? Math.max(320, Number(query.width)) : preset.width,
    height: query.model === 'custom' ? Math.max(568, Number(query.height)) : preset.height,
    fontFamily: (FONTS[query.font] || FONTS.inter).family,
    style: query.style || 'numbers',
    monthLayout: query.month_layout || 'grid_3x4',
    weekendMode: query.weekend_mode || 'weekends_only',
    themeObj: themeObj,
    bgStyle: Engine.BG_STYLES[rawBg] ? rawBg : 'mesh_organic',
    lang: query.lang === 'en' ? 'en' : 'ru',
    timezone: Number(query.timezone) || 3,
    footer: query.footer || 'year_summary', note: (query.note || '').slice(0, 120),
    events: query.events || '',
    city: String(query.city || '').split(',')[0].trim(),
    eventColor: query.c_event || themeObj.accent,
    showWeekdays: String(query.show_weekdays || '1') === '1', accentToday: String(query.accent_today || '1') === '1',
    showProgressRing: String(query.show_progress_ring || '1') === '1', showWeekNumbers: String(query.show_week_numbers || '0') === '1',
    quarterDividers: String(query.quarter_dividers || '1') === '1', monthBadges: String(query.month_badges || '1') === '1',
    focusCurrentMonth: String(query.focus_current_month || '1') === '1', lockscreenSafe: String(query.lockscreen_safe || '1') === '1',
    showHeaderMeta: String(query.show_header_meta || '1') === '1',
    strongWeekendTint: String(query.strong_weekend_tint || '1') === '1',
    glassPanels: String(query.glass_panels || '1') === '1'
  };
}

app.get('/wallpaper.svg', async (req, res) => {
  const cfg = getConfig(req.query);
  try {
    if (cfg.city) cfg.weatherData = await fetchWeatherByCity(cfg.city);
  } catch (_) {}
  res.type('image/svg+xml').send(Engine.renderSvg(cfg, dayjs, fontCache[req.query.font || 'inter']));
});

app.get('/wallpaper.png', async (req, res) => {
  try {
    const cacheKey = req.originalUrl + dayjs().format('YYYY-MM-DD');
    if (pngCache.has(cacheKey)) {
      res.setHeader('Content-Type', 'image/png');
      res.setHeader('X-Cache', 'HIT');
      return res.send(pngCache.get(cacheKey));
    }

    const cfg = getConfig(req.query);
    
    // Запрашиваем погоду по городу (если указан)
    cfg.weatherData = await fetchWeatherByCity(cfg.city);

    const b64Font = fontCache[req.query.font || 'inter'];
    const svg = Engine.renderSvg(cfg, dayjs, b64Font);

    // Только локальные шрифты: никаких внешних запросов во время рендера
    const fontBuffers = [];
    if (b64Font) fontBuffers.push(Buffer.from(b64Font, 'base64'));
    if (defaultFontBuffer) fontBuffers.push(defaultFontBuffer);

    const allFontBuffers = fontBuffers.length ? fontBuffers : (defaultFontBuffer ? [defaultFontBuffer] : []);

    let png;
    try {
      png = await sharp(Buffer.from(svg), { density: 320 }).png().toBuffer();
    } catch (sharpErr) {
      console.error('Sharp SVG render error, falling back to Resvg:', sharpErr);
      const resvg = new Resvg(svg, {
        fitTo: { mode: 'original' },
        font: {
          fontBuffers: allFontBuffers,
          loadSystemFonts: true,
          defaultFontFamily: 'Arial',
        }
      });
      png = resvg.render().asPng();
    }

    if (pngCache.size < 1000) pngCache.set(cacheKey, png);
    res.setHeader('Content-Type', 'image/png');
    res.setHeader('Cache-Control', 'public, max-age=3600');
    res.setHeader('X-Cache', 'MISS');
    res.send(png);
  } catch (err) {
    console.error('WALLPAPER_PNG_ERROR', err);
    res.status(500).json({ error: 'RENDER_ERROR', details: err.message });
  }
});

app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));

if (require.main === module) {
  app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
}

module.exports = app;
