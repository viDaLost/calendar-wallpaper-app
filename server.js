const express = require('express');
const path = require('path');
const sharp = require('sharp');
const dayjs = require('dayjs');
const utc = require('dayjs/plugin/utc');
const isLeapYear = require('dayjs/plugin/isLeapYear');
const weekOfYear = require('dayjs/plugin/weekOfYear');
const advancedFormat = require('dayjs/plugin/advancedFormat');
const fs = require('fs');

dayjs.extend(utc);
dayjs.extend(isLeapYear);
dayjs.extend(weekOfYear);
dayjs.extend(advancedFormat);

const app = express();
const PORT = process.env.PORT || 3000;

// --- ШРИФТЫ ---
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
      console.log(`✅ Шрифт загружен: ${fontDef.file}`);
    } else {
      console.warn(`⚠️ Файл не найден: fonts/${fontDef.file}`);
    }
  }
} else {
  console.warn('⚠️ Папка "fonts" не найдена. Создайте её и добавьте .ttf файлы для шрифтов.');
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
  iphone_15: { label: 'iPhone 15 / 16 / Pro', width: 1179, height: 2556, family: '6.1" новый' },
  iphone_15_plus: { label: 'iPhone 15/16 Plus', width: 1290, height: 2796, family: '6.7" новый' },
  iphone_16_pro: { label: 'iPhone 16 Pro', width: 1206, height: 2622, family: 'Pro 6.3"' },
  iphone_16_pro_max: { label: 'iPhone 16 Pro Max', width: 1320, height: 2868, family: 'Pro Max 6.9"' },
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
  mint_air: { name: 'Мятный Воздух', bg: '#0a1512', panel: '#10211c', text: '#ebfff8', muted: '#8db4a8', accent: '#57d2ab', accent2: '#aef2da', weekend: '#88e0ca' }
};

const BG_STYLES = {
  aurora: 'Аврора (Градиент)',
  glass: 'Стекло (Блики)',
  paper: 'Бумага (Шум)',
  spotlight: 'Прожектор',
  waves: 'Мягкие волны',
  noir: 'Нуар (Глубокий темный)'
};

const QUOTES = {
  ru: [
    'Маленькие шаги собирают большой год.',
    'Сегодня — часть твоего будущего.',
    'Спокойный ритм сильнее хаоса.',
    'Лучший день для движения — сегодняшний.'
  ],
  en: [
    'Small steps shape a big year.',
    'Today is part of your future.',
    'Consistency beats intensity.',
    'The best day to move is today.'
  ]
};

function num(v, fallback) {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

function escapeXml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function clamp(v, min, max) {
  return Math.max(min, Math.min(max, v));
}

function alpha(hex, opacity) {
  const clean = hex.replace('#', '');
  const bigint = parseInt(clean, 16);
  const r = (bigint >> 16) & 255;
  const g = (bigint >> 8) & 255;
  const b = bigint & 255;
  return `rgba(${r},${g},${b},${opacity})`;
}

function getLabels(lang) {
  return lang === 'ru'
    ? {
        months: ['Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь', 'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'],
        weekdays: ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'],
        today: 'Сегодня',
        year: 'год',
        daysLeft: 'дн. осталось',
        passed: 'пройдено',
        week: 'Неделя',
      }
    : {
        months: ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'],
        weekdays: ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'],
        today: 'Today',
        year: 'year',
        daysLeft: 'days left',
        passed: 'passed',
        week: 'Week',
      };
}

function getConfig(query) {
  const preset = PHONE_PRESETS[query.model] || PHONE_PRESETS.iphone_15;
  return {
    model: query.model || 'iphone_15',
    width: query.model === 'custom' ? clamp(num(query.width, preset.width), 320, 4000) : preset.width,
    height: query.model === 'custom' ? clamp(num(query.height, preset.height), 568, 5000) : preset.height,
    font: FONTS[query.font] ? query.font : 'inter',
    style: query.style || 'numbers',
    calendarSize: query.calendar_size || 'balanced',
    monthLayout: query.month_layout || 'grid_3x4',
    weekendMode: query.weekend_mode || 'weekends_only',
    opacity: clamp(num(query.opacity, 8), 0, 60),
    theme: THEMES[query.theme] ? query.theme : 'graphite_orange',
    bgStyle: BG_STYLES[query.bg_style] ? query.bg_style : 'aurora',
    lang: query.lang === 'en' ? 'en' : 'ru',
    timezone: clamp(num(query.timezone, 3), -12, 14),
    footer: query.footer || 'year_summary',
    note: (query.note || '').slice(0, 80),
    showWeekdays: String(query.show_weekdays || '1') === '1',
    accentToday: String(query.accent_today || '1') === '1',
    showProgressRing: String(query.show_progress_ring || '1') === '1',
    showWeekNumbers: String(query.show_week_numbers || '0') === '1',
    quarterDividers: String(query.quarter_dividers || '1') === '1',
    monthBadges: String(query.month_badges || '1') === '1',
    focusCurrentMonth: String(query.focus_current_month || '1') === '1',
    lockscreenSafe: String(query.lockscreen_safe || '1') === '1'
  };
}

function zonedNow(offsetHours) {
  return dayjs.utc().add(offsetHours, 'hour');
}

function yearStats(now) {
  const daysInYear = now.isLeapYear() ? 366 : 365;
  const dayOfYear = now.diff(dayjs(`${now.year()}-01-01`), 'day') + 1;
  const daysLeft = daysInYear - dayOfYear;
  return {
    dayOfYear,
    daysInYear,
    daysLeft,
    percentPassed: Math.round((dayOfYear / daysInYear) * 100)
  };
}


function getSafeInsets(cfg, width, height) {
  if (!cfg.lockscreenSafe) {
    const base = Math.round(width * 0.05);
    return { top: base, bottom: base };
  }

  const top = Math.round(height * 0.16 + width * 0.06);
  const bottom = Math.round(height * 0.11 + width * 0.035);
  return { top, bottom };
}

function randomQuote(lang, year) {
  const arr = QUOTES[lang] || QUOTES.ru;
  return arr[year % arr.length];
}

function renderBackground(cfg, theme, width, height) {
  const overlayOpacity = cfg.opacity / 100;
  let bgCode = '';
  if (cfg.bgStyle === 'paper') {
    bgCode = `
      <defs>
        <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="${theme.bg}" />
          <stop offset="100%" stop-color="${theme.panel}" />
        </linearGradient>
        <filter id="noise">
          <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" stitchTiles="stitch" />
          <feColorMatrix type="saturate" values="0" />
          <feComponentTransfer><feFuncA type="table" tableValues="0 0 .035 .05"/></feComponentTransfer>
        </filter>
      </defs>
      <rect width="100%" height="100%" fill="url(#bg)"/>
      <rect width="100%" height="100%" filter="url(#noise)" opacity="0.55"/>`;
  } else if (cfg.bgStyle === 'glass') {
    bgCode = `
      <defs>
        <radialGradient id="bg" cx="25%" cy="15%" r="85%">
          <stop offset="0%" stop-color="${alpha(theme.accent, 0.42)}" />
          <stop offset="35%" stop-color="${alpha(theme.bg, 0.95)}" />
          <stop offset="100%" stop-color="${theme.bg}" />
        </radialGradient>
      </defs>
      <rect width="100%" height="100%" fill="url(#bg)"/>
      <circle cx="${width * 0.18}" cy="${height * 0.14}" r="${width * 0.22}" fill="${alpha(theme.accent2, 0.18)}"/>
      <circle cx="${width * 0.83}" cy="${height * 0.18}" r="${width * 0.2}" fill="${alpha(theme.accent, 0.12)}"/>
      <circle cx="${width * 0.58}" cy="${height * 0.82}" r="${width * 0.3}" fill="${alpha(theme.accent2, 0.08)}"/>`;
  } else if (cfg.bgStyle === 'spotlight') {
    bgCode = `
      <defs>
        <radialGradient id="bg" cx="50%" cy="12%" r="90%">
          <stop offset="0%" stop-color="${alpha(theme.accent2, 0.3)}" />
          <stop offset="18%" stop-color="${alpha(theme.accent, 0.18)}" />
          <stop offset="55%" stop-color="${alpha(theme.bg, 0.97)}" />
          <stop offset="100%" stop-color="${theme.bg}" />
        </radialGradient>
      </defs>
      <rect width="100%" height="100%" fill="url(#bg)"/>`;
  } else if (cfg.bgStyle === 'waves') {
    bgCode = `
      <defs>
        <linearGradient id="bg" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="${theme.bg}" />
          <stop offset="100%" stop-color="${theme.panel}" />
        </linearGradient>
      </defs>
      <rect width="100%" height="100%" fill="url(#bg)"/>
      <path d="M 0 ${height * 0.22} C ${width * 0.12} ${height * 0.18}, ${width * 0.28} ${height * 0.28}, ${width * 0.42} ${height * 0.24} S ${width * 0.74} ${height * 0.14}, ${width} ${height * 0.22}" fill="none" stroke="${alpha(theme.accent2, 0.16)}" stroke-width="${width * 0.01}"/>
      <path d="M 0 ${height * 0.62} C ${width * 0.18} ${height * 0.56}, ${width * 0.34} ${height * 0.69}, ${width * 0.56} ${height * 0.64} S ${width * 0.82} ${height * 0.58}, ${width} ${height * 0.65}" fill="none" stroke="${alpha(theme.accent, 0.14)}" stroke-width="${width * 0.013}"/>`;
  } else if (cfg.bgStyle === 'noir') {
    bgCode = `
      <defs>
        <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="#020202" />
          <stop offset="100%" stop-color="#0c1017" />
        </linearGradient>
      </defs>
      <rect width="100%" height="100%" fill="url(#bg)"/>
      <circle cx="${width * 0.84}" cy="${height * 0.12}" r="${width * 0.16}" fill="${alpha(theme.accent, 0.12)}"/>
      <circle cx="${width * 0.24}" cy="${height * 0.76}" r="${width * 0.2}" fill="${alpha(theme.accent2, 0.08)}"/>`;
  } else {
    bgCode = `
      <defs>
        <radialGradient id="bg1" cx="18%" cy="10%" r="80%">
          <stop offset="0%" stop-color="${alpha(theme.accent, 0.36)}"/>
          <stop offset="35%" stop-color="${alpha(theme.bg, 0.94)}"/>
          <stop offset="100%" stop-color="${theme.bg}"/>
        </radialGradient>
        <radialGradient id="bg2" cx="82%" cy="78%" r="78%">
          <stop offset="0%" stop-color="${alpha(theme.accent2, 0.14)}"/>
          <stop offset="100%" stop-color="${alpha(theme.panel, 0)}"/>
        </radialGradient>
      </defs>
      <rect width="100%" height="100%" fill="url(#bg1)"/>
      <rect width="100%" height="100%" fill="url(#bg2)"/>`;
  }
  return bgCode + `<rect width="100%" height="100%" fill="${alpha('#ffffff', overlayOpacity)}"/>`;
}

function wrap(text, max) {
  const words = String(text).split(/\s+/);
  const lines = [];
  let line = '';
  for (const word of words) {
    const attempt = line ? `${line} ${word}` : word;
    if (attempt.length > max && line) {
      lines.push(line);
      line = word;
    } else {
      line = attempt;
    }
  }
  if (line) lines.push(line);
  return lines;
}

function renderHeader(cfg, theme, labels, now, stats, width, padding, topY, headerHeight, FONT) {
  const dateText = cfg.lang === 'ru'
    ? `${labels.today}: ${now.format('D MMMM')}`
    : `${labels.today}: ${now.format('MMM D')}`;

  const chipHeight = Math.round(headerHeight * 0.42);
  const chipPadX = Math.round(width * 0.02);
  const weekChipW = Math.round(width * 0.26);
  const dateChipW = Math.round(width * 0.38);
  const ringR = Math.round(Math.min(width, headerHeight) * 0.18);
  const ringCx = width - padding - ringR - 2;
  const ringCy = topY + headerHeight * 0.34;
  const circumference = 2 * Math.PI * ringR;
  const dash = circumference * (stats.percentPassed / 100);
  const labelSize = Math.round(headerHeight * 0.22);
  const smallSize = Math.round(headerHeight * 0.2);
  const rowY = topY + headerHeight * 0.12;

  let out = `
    <text x="${padding}" y="${topY + labelSize * 0.95}" fill="${theme.muted}" font-size="${labelSize}" font-family="${FONT}" font-weight="700">${now.year()}</text>
    <rect x="${padding}" y="${rowY + labelSize * 0.55}" width="${dateChipW}" height="${chipHeight}" rx="${chipHeight / 2}" fill="${alpha(theme.panel, 0.92)}" stroke="${alpha(theme.accent2, 0.18)}" />
    <text x="${padding + chipPadX}" y="${rowY + labelSize * 0.55 + chipHeight * 0.64}" fill="${theme.text}" font-size="${smallSize}" font-family="${FONT}" font-weight="700">${escapeXml(dateText)}</text>
    <rect x="${padding}" y="${rowY + labelSize * 0.55 + chipHeight + Math.round(headerHeight * 0.08)}" width="${weekChipW}" height="${chipHeight}" rx="${chipHeight / 2}" fill="${alpha(theme.panel, 0.92)}" stroke="${alpha(theme.accent2, 0.18)}" />
    <text x="${padding + weekChipW / 2}" y="${rowY + labelSize * 0.55 + chipHeight + Math.round(headerHeight * 0.08) + chipHeight * 0.64}" text-anchor="middle" fill="${theme.accent2}" font-size="${smallSize}" font-family="${FONT}" font-weight="700">${labels.week} ${now.week()}</text>
  `;

  if (cfg.showProgressRing) {
    out += `
      <circle cx="${ringCx}" cy="${ringCy}" r="${ringR}" fill="none" stroke="${alpha(theme.panel, 0.92)}" stroke-width="${ringR * 0.24}" />
      <circle cx="${ringCx}" cy="${ringCy}" r="${ringR}" fill="none" stroke="${theme.accent}" stroke-width="${ringR * 0.24}" stroke-linecap="round" stroke-dasharray="${dash} ${circumference}" transform="rotate(-90 ${ringCx} ${ringCy})" />
      <text x="${ringCx}" y="${ringCy + smallSize * 0.35}" text-anchor="middle" fill="${theme.text}" font-size="${smallSize}" font-family="${FONT}" font-weight="800">${stats.percentPassed}%</text>
    `;
  }

  return out;
}

function renderMonth({ monthIndex, year, x, y, w, h, cfg, theme, labels, now, FONT }) {
  const first = dayjs(`${year}-${String(monthIndex + 1).padStart(2, '0')}-01`);
  const daysInMonth = first.daysInMonth();
  const firstWeekday = (first.day() + 6) % 7;
  const isCurrent = now.month() === monthIndex;
  const emphasis = cfg.focusCurrentMonth && isCurrent ? 1.08 : 1;
  const radius = Math.max(16, Math.round(w * 0.07));
  const pad = Math.round(w * 0.055);
  
  const cols = 7;
  const weekNumberCol = cfg.showWeekNumbers ? 1 : 0;
  const innerW = w - pad * 2;
  const cellW = innerW / (cols + weekNumberCol);
  const rows = 6;
  const gridTopOffset = cfg.showWeekdays ? h * 0.28 : h * 0.2;
  const cellH = (h - gridTopOffset - h * 0.055) / rows;

  const titleSize = Math.min(Math.round(h * 0.105), Math.round(w * 0.13)) * emphasis;
  const weekdaySize = Math.min(Math.round(cellW * 0.42), Math.round(h * 0.048));
  const numberSize = Math.min(Math.round(cellW * 0.5), Math.round(cellH * 0.52)) * emphasis;
  
  const badgeW = Math.round(w * 0.2);
  const badgeH = Math.round(h * 0.11);
  const cardFill = isCurrent ? alpha(theme.panel, 0.98) : alpha(theme.panel, 0.65);
  
  let out = `
    <rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${radius}" fill="${cardFill}" stroke="${isCurrent ? alpha(theme.accent2, 0.36) : alpha('#ffffff', 0.06)}" />
    <text x="${x + pad}" y="${y + pad + titleSize * 0.75}" fill="${theme.text}" font-size="${titleSize}" font-family="${FONT}" font-weight="800">${labels.months[monthIndex]}</text>
  `;

  if (cfg.monthBadges) {
    out += `
      <rect x="${x + w - pad - badgeW}" y="${y + pad * 0.6}" width="${badgeW}" height="${badgeH}" rx="${badgeH / 2}" fill="${isCurrent ? alpha(theme.accent, 0.18) : alpha('#ffffff', 0.05)}" />
      <text x="${x + w - pad - badgeW / 2}" y="${y + pad * 0.6 + badgeH * 0.65}" text-anchor="middle" fill="${isCurrent ? theme.accent2 : theme.muted}" font-size="${Math.round(badgeH * 0.6)}" font-family="${FONT}" font-weight="700">${daysInMonth}</text>
    `;
  }

  const weekdayY = y + h * 0.24;
  const gridTop = y + gridTopOffset;
  const startX = x + pad + (cfg.showWeekNumbers ? cellW : 0);

  if (cfg.showWeekdays) {
    if (cfg.showWeekNumbers) {
      out += `<text x="${x + pad + cellW / 2}" y="${weekdayY}" text-anchor="middle" fill="${theme.muted}" font-size="${weekdaySize}" font-family="${FONT}">#</text>`;
    }
    labels.weekdays.forEach((wd, i) => {
      const weekend = i >= 5;
      out += `<text x="${startX + i * cellW + cellW / 2}" y="${weekdayY}" text-anchor="middle" fill="${weekend ? alpha(theme.weekend, 0.95) : theme.muted}" font-size="${weekdaySize}" font-family="${FONT}" font-weight="700">${wd}</text>`;
    });
  }

  const productionHolidays = new Set([
    `${year}-01-01`, `${year}-01-02`, `${year}-01-03`, `${year}-01-04`, `${year}-01-05`, `${year}-01-06`, `${year}-01-07`, `${year}-01-08`,
    `${year}-02-23`, `${year}-03-08`, `${year}-05-01`, `${year}-05-09`, `${year}-06-12`, `${year}-11-04`
  ]);

  const isRestDay = (date) => {
    if (cfg.weekendMode === 'none') return false;
    const weekend = date.day() === 0 || date.day() === 6;
    if (cfg.weekendMode === 'production') return weekend || productionHolidays.has(date.format('YYYY-MM-DD'));
    return weekend;
  };

  const usedWeekRows = new Set();
  for (let day = 1; day <= daysInMonth; day++) {
    const index = firstWeekday + day - 1;
    const col = index % 7;
    const row = Math.floor(index / 7);
    usedWeekRows.add(row);
    const date = dayjs(`${year}-${String(monthIndex + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`);
    const cx = startX + col * cellW + cellW / 2;
    const cy = gridTop + row * cellH + cellH * 0.68;
    const isToday = cfg.accentToday && date.isSame(now, 'day');
    const isWeekend = isRestDay(date);
    const isPast = date.isBefore(now, 'day') && now.month() === monthIndex;
    const textColor = isToday ? theme.text : isWeekend ? theme.weekend : isPast ? alpha(theme.text, 0.6) : theme.text;

    if (isToday) {
      if (cfg.style === 'outline') {
        out += `<rect x="${cx - cellW * 0.45}" y="${cy - cellH * 0.6}" width="${cellW * 0.9}" height="${cellH * 0.8}" rx="${Math.min(cellW, cellH) * 0.2}" fill="none" stroke="${theme.accent}" stroke-width="${Math.max(1.5, w * 0.005)}"/>`;
      } else {
        out += `<rect x="${cx - cellW * 0.45}" y="${cy - cellH * 0.6}" width="${cellW * 0.9}" height="${cellH * 0.8}" rx="${Math.min(cellW, cellH) * 0.2}" fill="${alpha(theme.accent, cfg.style === 'numbers' ? 0.24 : 0.18)}" stroke="${alpha(theme.accent2, 0.34)}"/>`;
      }
    }

    if (cfg.style === 'dots') {
      const r = Math.min(cellW, cellH) * (isToday ? 0.18 : 0.12);
      out += `<circle cx="${cx}" cy="${cy - cellH * 0.2}" r="${r}" fill="${isToday ? theme.accent : isPast ? theme.accent2 : isWeekend ? alpha(theme.weekend, 0.9) : alpha(theme.text, 0.26)}"/>`;
      out += `<text x="${cx}" y="${cy + cellH * 0.3}" text-anchor="middle" fill="${textColor}" font-size="${Math.round(numberSize * 0.85)}" font-family="${FONT}" font-weight="700">${day}</text>`;
    } else if (cfg.style === 'focus') {
      out += `<text x="${cx}" y="${cy}" text-anchor="middle" fill="${textColor}" font-size="${Math.round(numberSize * (isToday ? 1.05 : 1))}" font-family="${FONT}" font-weight="${isToday || isCurrent ? 800 : 600}">${day}</text>`;
      if (isCurrent && !isToday) {
        out += `<line x1="${cx - cellW * 0.15}" y1="${cy + cellH * 0.15}" x2="${cx + cellW * 0.15}" y2="${cy + cellH * 0.15}" stroke="${alpha(theme.accent2, 0.35)}" stroke-linecap="round" stroke-width="2"/>`;
      }
    } else {
      out += `<text x="${cx}" y="${cy}" text-anchor="middle" fill="${textColor}" font-size="${numberSize}" font-family="${FONT}" font-weight="${isToday ? 800 : 600}">${day}</text>`;
    }
  }

  if (cfg.showWeekNumbers) {
    [...usedWeekRows].forEach((row) => {
      const date = first.add(row * 7 - firstWeekday, 'day');
      const wx = x + pad + cellW / 2;
      const wy = gridTop + row * cellH + cellH * 0.68;
      out += `<text x="${wx}" y="${wy}" text-anchor="middle" fill="${alpha(theme.muted, 0.7)}" font-size="${Math.round(numberSize * 0.7)}" font-family="${FONT}">${dayjs(date).week()}</text>`;
    });
  }

  return out;
}

function renderFooter(cfg, theme, labels, now, stats, width, footerBox, FONT) {
  const { x, y, w, h } = footerBox;
  const pad = Math.round(w * 0.04);
  const base = `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${Math.round(w * 0.05)}" fill="${alpha(theme.panel, 0.82)}" stroke="${alpha('#ffffff', 0.06)}"/>`;
  const textSize = Math.round(h * 0.2);
  const subSize = Math.round(h * 0.14);

  if (cfg.footer === 'quote') {
    const lines = wrap(cfg.note || randomQuote(cfg.lang, now.year()), 34);
    return base + lines.map((line, i) => `<text x="${x + w / 2}" y="${y + h * 0.38 + i * subSize * 1.45}" text-anchor="middle" fill="${theme.text}" font-size="${subSize}" font-family="${FONT}" font-weight="700">${escapeXml(line)}</text>`).join('');
  }
  if (cfg.footer === 'progress_bar') {
    const barX = x + pad;
    const barY = y + h * 0.55;
    const barW = w - pad * 2;
    const barH = h * 0.12;
    return base + `
      <text x="${x + pad}" y="${y + h * 0.32}" fill="${theme.text}" font-size="${textSize}" font-family="${FONT}" font-weight="800">${stats.percentPassed}% ${labels.passed}</text>
      <rect x="${barX}" y="${barY}" width="${barW}" height="${barH}" rx="${barH / 2}" fill="${alpha(theme.bg, 0.7)}" />
      <rect x="${barX}" y="${barY}" width="${barW * stats.percentPassed / 100}" height="${barH}" rx="${barH / 2}" fill="${theme.accent}" />
    `;
  }
  if (cfg.footer === 'today_card') {
    const dateLabel = cfg.lang === 'ru' ? now.format('dddd, D MMMM') : now.format('dddd, MMMM D');
    return base + `
      <text x="${x + pad}" y="${y + h * 0.34}" fill="${theme.accent2}" font-size="${subSize}" font-family="${FONT}" font-weight="700">${labels.today}</text>
      <text x="${x + pad}" y="${y + h * 0.68}" fill="${theme.text}" font-size="${textSize}" font-family="${FONT}" font-weight="800">${escapeXml(dateLabel)}</text>
    `;
  }
  if (cfg.footer === 'custom_note' && cfg.note) {
    const lines = wrap(cfg.note, 36).slice(0, 2);
    return base + lines.map((line, i) => `<text x="${x + pad}" y="${y + h * 0.38 + i * subSize * 1.6}" fill="${theme.text}" font-size="${subSize}" font-family="${FONT}" font-weight="700">${escapeXml(line)}</text>`).join('');
  }
  return base + `
    <text x="${x + pad}" y="${y + h * 0.36}" fill="${theme.text}" font-size="${textSize}" font-family="${FONT}" font-weight="800">${stats.daysLeft} ${labels.daysLeft}</text>
    <text x="${x + pad}" y="${y + h * 0.66}" fill="${theme.muted}" font-size="${subSize}" font-family="${FONT}">${stats.percentPassed}% ${labels.passed}</text>
  `;
}

function renderSvg(cfg) {
  const theme = THEMES[cfg.theme];
  const labels = getLabels(cfg.lang);
  const now = zonedNow(cfg.timezone);
  const stats = yearStats(now);
  const { width, height } = cfg;
  const sidePadding = Math.round(width * 0.03);
  const safe = getSafeInsets(cfg, width, height);
  const innerTop = safe.top;
  const innerBottom = height - safe.bottom;
  const headerHeight = Math.round(height * 0.095);
  const footerHeight = Math.round(height * 0.08);
  const contentTop = innerTop + headerHeight + Math.round(height * 0.012);
  const contentBottom = innerBottom - footerHeight - Math.round(height * 0.014);
  const contentH = contentBottom - contentTop;

  // --- ЛОГИКА ВСТАВКИ ШРИФТА ---
  const selectedFontDef = FONTS[cfg.font] || FONTS.inter;
  const b64Font = fontCache[cfg.font];
  const FONT_FAMILY = b64Font ? `'${selectedFontDef.family}', sans-serif` : `${selectedFontDef.family}, system-ui, sans-serif`;
  const fontDefs = b64Font ? `
    <style>
      @font-face {
        font-family: '${selectedFontDef.family}';
        src: url(data:font/truetype;base64,${b64Font}) format('truetype');
      }
    </style>
  ` : '';

  let cols = 3, rows = 4;
  if (cfg.monthLayout === 'grid_4x3') { cols = 4; rows = 3; }
  if (cfg.monthLayout === 'list_1x12') { cols = 1; rows = 12; }

  const gap = Math.round(width * (cfg.monthLayout === 'list_1x12' ? 0.026 : 0.018));
  const monthW = (width - sidePadding * 2 - gap * (cols - 1)) / cols;
  const monthH = (contentH - gap * (rows - 1)) / rows;

  let monthsSvg = '';
  for (let i = 0; i < 12; i++) {
    const col = i % cols;
    const row = Math.floor(i / cols);
    const x = sidePadding + col * (monthW + gap);
    const y = contentTop + row * (monthH + gap);
    monthsSvg += renderMonth({ monthIndex: i, year: now.year(), x, y, w: monthW, h: monthH, cfg, theme, labels, now, FONT: FONT_FAMILY });
  }

  let quarterLines = '';
  if (cfg.quarterDividers && cfg.monthLayout !== 'list_1x12') {
    if (cols === 3 && rows === 4) {
      for (let r = 1; r < rows; r++) {
        const ly = contentTop + r * monthH + (r - 0.5) * gap;
        quarterLines += `<line x1="${sidePadding}" y1="${ly}" x2="${width - sidePadding}" y2="${ly}" stroke="${alpha(theme.accent2, 0.12)}" stroke-dasharray="10 12" />`;
      }
    }
  }

  const footerBox = { x: sidePadding, y: innerBottom - footerHeight, w: width - sidePadding * 2, h: footerHeight };

  return `<?xml version="1.0" encoding="UTF-8"?>
  <svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
    <defs>${fontDefs}</defs>
    ${renderBackground(cfg, theme, width, height)}
    ${renderHeader(cfg, theme, labels, now, stats, width, sidePadding, innerTop, headerHeight, FONT_FAMILY)}
    ${quarterLines}
    ${monthsSvg}
    ${renderFooter(cfg, theme, labels, now, stats, width, footerBox, FONT_FAMILY)}
  </svg>`;
}

app.use(express.static(path.join(__dirname, 'public')));

app.get('/api/options', (req, res) => {
  res.json({ 
    presets: PHONE_PRESETS, 
    themes: THEMES, 
    bgStyles: BG_STYLES, 
    fonts: Object.fromEntries(Object.entries(FONTS).map(([k,v]) => [k, v.name])) 
  });
});

app.get('/wallpaper.svg', (req, res) => {
  const cfg = getConfig(req.query);
  res.type('image/svg+xml').send(renderSvg(cfg));
});

app.get('/wallpaper.png', async (req, res) => {
  try {
    const cfg = getConfig(req.query);
    const svg = renderSvg(cfg);
    const png = await sharp(Buffer.from(svg)).png().toBuffer();
    res.setHeader('Content-Type', 'image/png');
    res.send(png);
  } catch (err) {
    res.status(500).json({ error: 'ОШИБКА ГЕНЕРАЦИИ ОБОЕВ', details: err.message });
  }
});

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Сервер запущен на http://localhost:${PORT}`);
});
