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

// Импортируем наше ядро
const Engine = require('./public/engine.js');

const app = express();
const PORT = process.env.PORT || 3000;

// Кеширование в памяти для PNG (аналог Redis)
const pngCache = new Map();
// Очищаем кеш каждый час
setInterval(() => pngCache.clear(), 1000 * 60 * 60);

const FONTS = {
  inter: { name: 'Inter', file: 'inter.ttf', family: 'Inter' },
  montserrat: { name: 'Montserrat', file: 'montserrat.ttf', family: 'Montserrat' }
  // Добавь свои шрифты сюда, если нужно
};

const fontCache = {};
const fontsDir = path.join(__dirname, 'fonts');
if (fs.existsSync(fontsDir)) {
  for (const [key, fontDef] of Object.entries(FONTS)) {
    const fp = path.join(fontsDir, fontDef.file);
    if (fs.existsSync(fp)) fontCache[key] = fs.readFileSync(fp).toString('base64');
  }
}

// Запрос погоды через бесплатный Open-Meteo API
async function fetchWeather(lat, lon) {
  if (!lat || !lon) return null;
  try {
    const res = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,weather_code`);
    const data = await res.json();
    const temp = Math.round(data.current.temperature_2m);
    const code = data.current.weather_code;
    let icon = '☀️';
    if(code >= 1 && code <= 3) icon = '⛅';
    if(code >= 45 && code <= 48) icon = '🌫️';
    if(code >= 51 && code <= 67) icon = '🌧️';
    if(code >= 71 && code <= 77) icon = '❄️';
    if(code >= 80 && code <= 82) icon = '🌦️';
    if(code >= 95) icon = '⛈️';
    return { temp: temp > 0 ? `+${temp}` : temp, icon };
  } catch (e) {
    console.error('Weather Fetch Error', e);
    return null;
  }
}

app.use(express.static(path.join(__dirname, 'public')));

app.get('/api/fonts', (req, res) => {
  res.json({ b64: fontCache, list: Object.fromEntries(Object.entries(FONTS).map(([k, v]) => [k, v.name])) });
});

app.get('/api/options', (req, res) => {
  res.json({ themes: Engine.THEMES, bgStyles: Engine.BG_STYLES });
});

app.get('/wallpaper.png', async (req, res) => {
  try {
    // Ключ кеша зависит от всех параметров и от ТЕКУЩЕЙ ДАТЫ (чтобы ночью кеш инвалидировался)
    const cacheKey = req.originalUrl + dayjs().format('YYYY-MM-DD');
    if (pngCache.has(cacheKey)) {
      res.setHeader('Content-Type', 'image/png');
      res.setHeader('X-Cache', 'HIT');
      return res.send(pngCache.get(cacheKey));
    }

    // Собираем конфиг из URL параметров
    const cfg = {
      width: Number(req.query.width) || 1179,
      height: Number(req.query.height) || 2556,
      themeObj: Engine.THEMES[req.query.theme] || Engine.THEMES.graphite_orange,
      bgStyle: req.query.bg_style || 'mesh_organic',
      lang: req.query.lang || 'ru',
      timezone: Number(req.query.timezone) || 3,
      events: req.query.events || '', // "04-20: Релиз, 12-31: НГ"
      fontFamily: (FONTS[req.query.font] || FONTS.inter).family,
      weekendMode: req.query.weekend_mode || 'weekends_only',
      lockscreenSafe: true,
      accentToday: true
    };

    // Подменяем кастомные цвета, если выбрана custom_palette
    if (req.query.theme === 'custom_palette') {
      cfg.themeObj = {
        name: 'Custom',
        bg: req.query.c_bg || '#0a0d12', panel: req.query.c_panel || '#131823',
        text: req.query.c_text || '#edf2ff', muted: req.query.c_muted || '#8994a7',
        accent: req.query.c_accent || '#ff8f2d', accent2: req.query.c_accent2 || '#ffbc6f',
        weekend: req.query.c_weekend || '#ff8f7b'
      };
    }

    // Запрашиваем погоду, если есть координаты
    cfg.weatherData = await fetchWeather(req.query.lat, req.query.lon);

    // Генерируем SVG с помощью ядра
    const svg = Engine.renderSvg(cfg, dayjs, fontCache[req.query.font || 'inter']);
    
    let png;
    try {
      const resvg = new Resvg(svg, { fitTo: { mode: 'original' } });
      png = resvg.render().asPng();
    } catch (renderErr) {
      // Фолбэк на sharp, если resvg недоступен
      png = await sharp(Buffer.from(svg), { density: 300 }).png().toBuffer();
    }

    // Записываем в кеш (максимум 1000 комбинаций в памяти)
    if (pngCache.size < 1000) pngCache.set(cacheKey, png);

    res.setHeader('Content-Type', 'image/png');
    res.setHeader('Cache-Control', 'public, max-age=3600');
    res.setHeader('X-Cache', 'MISS');
    res.send(png);

  } catch (err) {
    res.status(500).json({ error: 'RENDER_ERROR', details: err.message });
  }
});

app.listen(PORT, () => console.log(`Сервер запущен на http://localhost:${PORT}`));
