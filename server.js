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
  moon_silver: { name: 'Лунное серебро', bg: '#0d1118', panel: '#161c27', text: '#f0f4fb', muted: '#99a4b7', accent: '#c8d2e5', accent2: '#eef3ff', weekend: '#b7c3da' }
};

const BG_STYLES = {
  aurora: 'Аврора',
  glass: 'Стекло',
  paper: 'Бумага',
  spotlight: 'Прожектор',
  waves: 'Мягкие волны',
  noir: 'Нуар',
  mesh: 'Глубокая сетка',
  bloom: 'Сияние',
  diagonal: 'Диагональные лучи',
  orbit: 'Орбиты',
  velvet: 'Бархат',
  grain_light: 'Светлое зерно'
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
function clamp(v, min, max) { return Math.max(min, Math.min(max, v)); }
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
        monthsShort: ['Янв', 'Фев', 'Мар', 'Апр', 'Май', 'Июн', 'Июл', 'Авг', 'Сен', 'Окт', 'Ноя', 'Дек'],
        monthsMedium: ['Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь', 'Июль', 'Август', 'Сент.', 'Октябрь', 'Ноябрь', 'Декабрь'],
        weekdays: ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'],
        weekdaysFull: ['понедельник', 'вторник', 'среда', 'четверг', 'пятница', 'суббота', 'воскресенье'],
        today: 'Сегодня', year: 'год', daysLeft: 'дн. осталось', passed: 'пройдено', week: 'Неделя',
      }
    : {
        months: ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'],
        monthsShort: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
        monthsMedium: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sept', 'Oct', 'Nov', 'Dec'],
        weekdays: ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'],
        weekdaysFull: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'],
        today: 'Today', year: 'year', daysLeft: 'days left', passed: 'passed', week: 'Week',
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
    lockscreenSafe: String(query.lockscreen_safe || '1') === '1',
    pngSafeFont: query.__target === 'png'
  };
}
function zonedNow(offsetHours) { return dayjs.utc().add(offsetHours, 'hour'); }
function yearStats(now) {
  const daysInYear = now.isLeapYear() ? 366 : 365;
  const dayOfYear = now.diff(dayjs(`${now.year()}-01-01`), 'day') + 1;
  const daysLeft = daysInYear - dayOfYear;
  return { dayOfYear, daysInYear, daysLeft, percentPassed: Math.round((dayOfYear / daysInYear) * 100) };
}

function getSafeInsets(cfg, width, height) {
  const baseSide = Math.round(width * 0.035);
  if (!cfg.lockscreenSafe) {
    return { top: baseSide, bottom: baseSide, side: baseSide };
  }
  const top = Math.round(height * 0.165 + width * 0.04);
  const bottom = Math.round(height * 0.105 + width * 0.03);
  return { top, bottom, side: baseSide };
}

function randomQuote(lang, year) { const arr = QUOTES[lang] || QUOTES.ru; return arr[year % arr.length]; }
function wrap(text, maxLen) {
  const words = String(text).split(/\s+/);
  const lines = [];
  let line = '';
  for (const word of words) {
    if ((line + ' ' + word).trim().length <= maxLen) line = (line + ' ' + word).trim();
    else { if (line) lines.push(line); line = word; }
  }
  if (line) lines.push(line);
  return lines;
}
function formatDateLine(now, labels, lang) {
  return lang === 'ru'
    ? `${labels.today}: ${now.date()} ${labels.months[now.month()].toLowerCase()}`
    : `${labels.today}: ${labels.months[now.month()]} ${now.date()}`;
}
function formatLongToday(now, labels, lang) {
  const wd = labels.weekdaysFull[(now.day() + 6) % 7];
  return lang === 'ru'
    ? `${wd}, ${now.date()} ${labels.months[now.month()].toLowerCase()}`
    : `${wd}, ${labels.months[now.month()]} ${now.date()}`;
}

function renderBackground(cfg, theme, width, height) {
  const overlayOpacity = cfg.opacity / 100;
  const accents = `
    <circle cx="${width * 0.83}" cy="${height * 0.18}" r="${width * 0.16}" fill="${alpha(theme.accent, 0.10)}"/>
    <circle cx="${width * 0.22}" cy="${height * 0.78}" r="${width * 0.20}" fill="${alpha(theme.accent2, 0.07)}"/>`;
  if (cfg.bgStyle === 'paper' || cfg.bgStyle === 'grain_light') {
    const bgA = cfg.bgStyle === 'grain_light' ? '#f3f0ea' : theme.bg;
    const bgB = cfg.bgStyle === 'grain_light' ? '#e7e1d8' : theme.panel;
    return `
      <defs>
        <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="${bgA}" />
          <stop offset="100%" stop-color="${bgB}" />
        </linearGradient>
        <filter id="noise"><feTurbulence type="fractalNoise" baseFrequency="0.8" numOctaves="2" stitchTiles="stitch"/><feColorMatrix type="saturate" values="0"/><feComponentTransfer><feFuncA type="table" tableValues="0 0 .02 .05"/></feComponentTransfer></filter>
      </defs>
      <rect width="100%" height="100%" fill="url(#bg)"/>
      <rect width="100%" height="100%" filter="url(#noise)" opacity="0.65"/>`;
  }
  if (cfg.bgStyle === 'glass') {
    return `
      <defs><radialGradient id="bg" cx="25%" cy="15%" r="85%"><stop offset="0%" stop-color="${alpha(theme.accent, 0.42)}"/><stop offset="35%" stop-color="${alpha(theme.bg, 0.95)}"/><stop offset="100%" stop-color="${theme.bg}"/></radialGradient></defs>
      <rect width="100%" height="100%" fill="url(#bg)"/>
      ${accents}`;
  }
  if (cfg.bgStyle === 'spotlight') {
    return `
      <defs><radialGradient id="bg" cx="50%" cy="20%" r="85%"><stop offset="0%" stop-color="${alpha(theme.accent2, 0.32)}"/><stop offset="20%" stop-color="${alpha(theme.accent, 0.15)}"/><stop offset="55%" stop-color="${alpha(theme.bg, 0.97)}"/><stop offset="100%" stop-color="${theme.bg}"/></radialGradient></defs>
      <rect width="100%" height="100%" fill="url(#bg)"/>`;
  }
  if (cfg.bgStyle === 'waves') {
    return `
      <defs><linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="${theme.bg}"/><stop offset="100%" stop-color="${theme.panel}"/></linearGradient></defs>
      <rect width="100%" height="100%" fill="url(#bg)"/>
      <path d="M 0 ${height * 0.22} C ${width * 0.12} ${height * 0.18}, ${width * 0.28} ${height * 0.28}, ${width * 0.42} ${height * 0.24} S ${width * 0.74} ${height * 0.14}, ${width} ${height * 0.22}" fill="none" stroke="${alpha(theme.accent2, 0.16)}" stroke-width="${width * 0.01}"/>
      <path d="M 0 ${height * 0.62} C ${width * 0.18} ${height * 0.56}, ${width * 0.34} ${height * 0.69}, ${width * 0.56} ${height * 0.64} S ${width * 0.82} ${height * 0.58}, ${width} ${height * 0.65}" fill="none" stroke="${alpha(theme.accent, 0.14)}" stroke-width="${width * 0.013}"/>`;
  }
  if (cfg.bgStyle === 'mesh') {
    let lines='';
    const step = Math.max(44, Math.round(width * 0.065));
    for (let x = -height; x < width + height; x += step) lines += `<line x1="${x}" y1="0" x2="${x + height}" y2="${height}" stroke="${alpha(theme.accent2, 0.05)}"/>`;
    for (let x = 0; x < width + height; x += step) lines += `<line x1="${x}" y1="0" x2="${x - height}" y2="${height}" stroke="${alpha(theme.accent, 0.035)}"/>`;
    return `<rect width="100%" height="100%" fill="${theme.bg}"/>${lines}${accents}`;
  }
  if (cfg.bgStyle === 'bloom') {
    return `
      <defs>
        <radialGradient id="b1" cx="20%" cy="18%" r="55%"><stop offset="0%" stop-color="${alpha(theme.accent2, 0.33)}"/><stop offset="100%" stop-color="${alpha(theme.bg, 0)}"/></radialGradient>
        <radialGradient id="b2" cx="80%" cy="72%" r="50%"><stop offset="0%" stop-color="${alpha(theme.accent, 0.26)}"/><stop offset="100%" stop-color="${alpha(theme.bg, 0)}"/></radialGradient>
      </defs>
      <rect width="100%" height="100%" fill="${theme.bg}"/>
      <rect width="100%" height="100%" fill="url(#b1)"/>
      <rect width="100%" height="100%" fill="url(#b2)"/>`;
  }
  if (cfg.bgStyle === 'diagonal') {
    let rays='';
    const step = Math.max(26, Math.round(width * 0.03));
    for (let i = -height; i < width; i += step) rays += `<line x1="${i}" y1="0" x2="${i + height * 0.5}" y2="${height}" stroke="${alpha(theme.accent, 0.03)}" stroke-width="${Math.max(1, width * 0.002)}"/>`;
    return `<rect width="100%" height="100%" fill="${theme.bg}"/>${rays}${accents}`;
  }
  if (cfg.bgStyle === 'orbit') {
    return `
      <rect width="100%" height="100%" fill="${theme.bg}"/>
      <ellipse cx="${width * 0.72}" cy="${height * 0.22}" rx="${width * 0.28}" ry="${width * 0.14}" fill="none" stroke="${alpha(theme.accent2, 0.08)}" stroke-width="${width * 0.008}"/>
      <ellipse cx="${width * 0.3}" cy="${height * 0.74}" rx="${width * 0.26}" ry="${width * 0.1}" fill="none" stroke="${alpha(theme.accent, 0.06)}" stroke-width="${width * 0.012}"/>
      ${accents}`;
  }
  if (cfg.bgStyle === 'velvet') {
    return `
      <defs><linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="${theme.bg}"/><stop offset="55%" stop-color="${alpha(theme.panel, 0.95)}"/><stop offset="100%" stop-color="${theme.bg}"/></linearGradient></defs>
      <rect width="100%" height="100%" fill="url(#bg)"/>${accents}`;
  }
  if (cfg.bgStyle === 'noir') {
    return `
      <defs><radialGradient id="bg" cx="50%" cy="-10%" r="120%"><stop offset="0%" stop-color="${alpha(theme.accent, 0.22)}"/><stop offset="35%" stop-color="${alpha(theme.bg, 0.95)}"/><stop offset="100%" stop-color="${theme.bg}"/></radialGradient></defs>
      <rect width="100%" height="100%" fill="url(#bg)"/>${accents}`;
  }
  return `
    <defs><radialGradient id="bg" cx="15%" cy="10%" r="120%"><stop offset="0%" stop-color="${alpha(theme.accent2, 0.26)}"/><stop offset="20%" stop-color="${alpha(theme.accent, 0.18)}"/><stop offset="60%" stop-color="${alpha(theme.bg, 0.96)}"/><stop offset="100%" stop-color="${theme.bg}"/></radialGradient></defs>
    <rect width="100%" height="100%" fill="url(#bg)"/>${accents}`;
}


function isListLayout(layout) {
  return ['list_1x12','list_1x12_compact'].includes(layout);
}
function isCompactGridLayout(layout) {
  return ['grid_3x4_compact','grid_2x6','grid_6x2','single_month_focus'].includes(layout);
}
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
  };
  const spec = presets[cfg.monthLayout] || presets.grid_3x4;
  if (spec.mode === 'focus') return { ...spec };
  if (spec.mode === 'grid_6x2') {
    const monthW = (width - sidePadding * 2 - spec.gap * (spec.cols - 1)) / spec.cols;
    const monthH = (contentH - spec.gap * (spec.rows - 1)) / spec.rows;
    return {
      ...spec,
      monthW,
      monthH,
      skinnyCols: 6,
    };
  }
  return {
    ...spec,
    monthW: (width - sidePadding * 2 - spec.gap * (spec.cols - 1)) / spec.cols,
    monthH: (contentH - spec.gap * (spec.rows - 1)) / spec.rows,
  };
}

function getSafeFontStack(selectedFontFamily, pngSafeFont) {
  const safe = `'DejaVu Sans','Noto Sans','Liberation Sans',Arial,sans-serif`;
  return pngSafeFont ? safe : `'${selectedFontFamily}','DejaVu Sans','Noto Sans','Liberation Sans',Arial,sans-serif`;
}

function pickMonthLabel(labels, monthIndex, width, mode = 'grid') {
  const full = labels.months[monthIndex];
  const medium = (labels.monthsMedium || labels.months)[monthIndex];
  const short = (labels.monthsShort || labels.months)[monthIndex];
  if (mode === 'list') return width < 420 ? short : width < 560 ? medium : full;
  if (mode === 'focus') return width < 520 ? medium : full;
  if (mode === 'skinny') return short;
  if (width < 180) return short;
  if (width < 240) return medium;
  return full;
}

function getMonthCardOptions(cfg, w, h) {
  const sixWide = cfg.monthLayout === 'grid_6x2';
  const twoWide = cfg.monthLayout === 'grid_2x6';
  const compactGrid = cfg.monthLayout === 'grid_3x4_compact';
  const skinny = sixWide && w < 190;
  const tiny = sixWide || w < 180;
  return {
    tiny,
    skinny,
    sixWide,
    twoWide,
    compactGrid,
    showWeekdays: cfg.showWeekdays && (!tiny || cfg.monthLayout === 'single_month_focus'),
    showBadge: cfg.monthBadges && !sixWide && w >= 185,
    padRatio: sixWide ? 0.028 : tiny ? 0.04 : compactGrid ? 0.045 : 0.055,
    radius: Math.max(14, Math.round(Math.min(w, h) * (sixWide ? 0.09 : 0.1))),
  };
}

function renderHeader(cfg, theme, labels, now, stats, width, padding, topY, FONT) {
  const compact = isListLayout(cfg.monthLayout) || isCompactGridLayout(cfg.monthLayout) || cfg.monthLayout === 'single_month_focus';
  const titleSize = Math.round(width * (compact ? 0.053 : 0.065));
  const subtitleSize = Math.round(width * (compact ? 0.028 : 0.033));
  const chipWidth = Math.round(width * (compact ? 0.2 : 0.24));
  const chipHeight = Math.round(width * (compact ? 0.07 : 0.076));
  const ringR = Math.round(width * (compact ? 0.03 : 0.04));
  const ringCx = width - padding - ringR * 1.2;
  const ringCy = topY + titleSize * 1.2;
  const circumference = Math.PI * 2 * ringR;
  const dash = circumference * (stats.percentPassed / 100);
  const dateText = formatDateLine(now, labels, cfg.lang);
  return `
    <text x="${padding}" y="${topY + titleSize}" fill="${theme.text}" font-size="${titleSize}" font-family="${FONT}" font-weight="900" letter-spacing="-0.03em">${now.year()}</text>
    <text x="${padding}" y="${topY + titleSize + subtitleSize * 1.8}" fill="${theme.muted}" font-size="${subtitleSize}" font-family="${FONT}">${escapeXml(dateText)}</text>
    <rect x="${padding}" y="${topY + titleSize + subtitleSize * 2.55}" width="${chipWidth}" height="${chipHeight}" rx="${chipHeight / 2}" fill="${alpha(theme.panel, 0.92)}" stroke="${alpha(theme.accent2, 0.22)}"/>
    <text x="${padding + chipWidth / 2}" y="${topY + titleSize + subtitleSize * 2.55 + chipHeight * 0.66}" text-anchor="middle" fill="${theme.accent2}" font-size="${Math.round(width * (compact ? 0.024 : 0.026))}" font-family="${FONT}" font-weight="700">${labels.week} ${now.week()}</text>
    ${cfg.showProgressRing ? `
      <circle cx="${ringCx}" cy="${ringCy}" r="${ringR}" fill="none" stroke="${alpha(theme.panel, 0.92)}" stroke-width="${ringR * 0.28}" />
      <circle cx="${ringCx}" cy="${ringCy}" r="${ringR}" fill="none" stroke="${theme.accent}" stroke-width="${ringR * 0.28}" stroke-linecap="round" stroke-dasharray="${dash} ${circumference}" transform="rotate(-90 ${ringCx} ${ringCy})" />
      <text x="${ringCx}" y="${ringCy + width * 0.01}" text-anchor="middle" fill="${theme.text}" font-size="${Math.round(width * 0.022)}" font-family="${FONT}" font-weight="800">${stats.percentPassed}%</text>` : ''}
  `;
}

function isRestDayFactory(cfg, year) {
  const productionHolidays = new Set([
    `${year}-01-01`, `${year}-01-02`, `${year}-01-03`, `${year}-01-04`, `${year}-01-05`, `${year}-01-06`, `${year}-01-07`, `${year}-01-08`,
    `${year}-02-23`, `${year}-03-08`, `${year}-05-01`, `${year}-05-09`, `${year}-06-12`, `${year}-11-04`
  ]);
  return (date) => {
    if (cfg.weekendMode === 'none') return false;
    const weekend = date.day() === 0 || date.day() === 6;
    if (cfg.weekendMode === 'production') return weekend || productionHolidays.has(date.format('YYYY-MM-DD'));
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
  const focusHero = cfg.monthLayout === 'single_month_focus';
  const emphasis = cfg.focusCurrentMonth && isCurrent ? (dense ? 1.03 : 1.06) : 1;
  const radius = opts.radius;
  const pad = Math.round(w * (focusHero ? 0.04 : opts.padRatio));
  const cols = 7;
  const weekNumberCol = cfg.showWeekNumbers && !opts.tiny && !focusHero ? 1 : 0;
  const innerW = w - pad * 2;
  const cellW = innerW / (cols + weekNumberCol);
  const rows = 6;
  const weekdayVisible = opts.showWeekdays;
  const titleLabel = pickMonthLabel(labels, monthIndex, w, focusHero ? 'focus' : (opts.skinny ? 'skinny' : 'grid'));
  const showInlineTitle = focusHero;
  const titleSize = Math.min(Math.round(h * (focusHero ? 0.11 : opts.sixWide ? 0.09 : dense ? 0.10 : 0.12)), Math.round(w * (focusHero ? 0.13 : opts.sixWide ? 0.11 : dense ? 0.14 : 0.16))) * emphasis;
  const titleY = showInlineTitle ? (y + pad + titleSize * 0.80) : (y + pad + titleSize * 0.75);
  const weekdaySize = Math.min(Math.round(cellW * (focusHero ? 0.34 : opts.sixWide ? 0.30 : dense ? 0.4 : 0.5)), Math.round(h * (focusHero ? 0.044 : opts.sixWide ? 0.032 : dense ? 0.048 : 0.058)));
  const numberSize = Math.min(Math.round(cellW * (focusHero ? 0.5 : opts.sixWide ? 0.34 : dense ? 0.52 : 0.6)), Math.round(cellH = 0));
  const topBand = weekdayVisible
    ? h * (focusHero ? 0.40 : opts.sixWide ? 0.20 : dense ? 0.245 : 0.285)
    : h * (focusHero ? 0.18 : opts.sixWide ? 0.14 : dense ? 0.17 : 0.20);
  const bottomPad = h * (focusHero ? 0.06 : opts.sixWide ? 0.06 : dense ? 0.06 : 0.075);
  const cellHReal = Math.max(8, (h - topBand - bottomPad) / rows);
  const numSize = Math.min(Math.round(cellW * (focusHero ? 0.5 : opts.sixWide ? 0.34 : dense ? 0.52 : 0.6)), Math.round(cellHReal * (focusHero ? 0.56 : opts.sixWide ? 0.42 : dense ? 0.54 : 0.6))) * emphasis;
  const badgeW = Math.round(w * (opts.sixWide ? 0.14 : focusHero ? 0.12 : 0.19));
  const badgeH = Math.round(h * (opts.sixWide ? 0.10 : focusHero ? 0.10 : 0.11));
  const cardFill = isCurrent ? alpha(theme.panel, focusHero ? 0.98 : 0.98) : alpha(theme.panel, opts.sixWide ? 0.78 : 0.65);
  let out = `
    <rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${radius}" fill="${cardFill}" stroke="${isCurrent ? alpha(theme.accent2, 0.36) : alpha('#ffffff', 0.06)}" />`;
  if (showInlineTitle) {
    out += `<text x="${x + pad}" y="${titleY}" fill="${theme.text}" font-size="${titleSize}" font-family="${FONT}" font-weight="800">${titleLabel}</text>`;
  } else {
    out += `<text x="${x + pad}" y="${y + pad + titleSize * 0.75}" fill="${theme.text}" font-size="${titleSize}" font-family="${FONT}" font-weight="800">${titleLabel}</text>`;
  }
  if (opts.showBadge || focusHero) {
    out += `
      <rect x="${x + w - pad - badgeW}" y="${y + pad * (focusHero ? 0.9 : 0.55)}" width="${badgeW}" height="${badgeH}" rx="${badgeH / 2}" fill="${isCurrent ? alpha(theme.accent, 0.18) : alpha('#ffffff', 0.05)}" />
      <text x="${x + w - pad - badgeW / 2}" y="${y + pad * (focusHero ? 0.9 : 0.55) + badgeH * 0.65}" text-anchor="middle" fill="${isCurrent ? theme.accent2 : theme.muted}" font-size="${Math.round(badgeH * (focusHero ? 0.50 : 0.56))}" font-family="${FONT}" font-weight="700">${daysInMonth}${cfg.lang === 'ru' ? 'д' : 'd'}</text>`;
  }
  const weekdayY = focusHero ? (y + pad + titleSize + h * 0.065) : (y + (opts.sixWide ? h * 0.18 : h * 0.23));
  const gridTop = y + topBand;
  const startX = x + pad + (weekNumberCol ? cellW : 0);
  if (weekdayVisible) {
    if (weekNumberCol) out += `<text x="${x + pad + cellW / 2}" y="${weekdayY}" text-anchor="middle" fill="${theme.muted}" font-size="${weekdaySize}" font-family="${FONT}">#</text>`;
    labels.weekdays.forEach((wd, i) => {
      const weekend = i >= 5;
      out += `<text x="${startX + i * cellW + cellW / 2}" y="${weekdayY}" text-anchor="middle" fill="${weekend ? alpha(theme.weekend, 0.95) : theme.muted}" font-size="${weekdaySize}" font-family="${FONT}" font-weight="700">${wd}</text>`;
    });
  }
  const isRestDay = isRestDayFactory(cfg, year);
  const usedWeekRows = new Set();
  for (let day = 1; day <= daysInMonth; day++) {
    const index = firstWeekday + day - 1;
    const col = index % 7;
    const row = Math.floor(index / 7);
    usedWeekRows.add(row);
    const date = dayjs(`${year}-${String(monthIndex + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`);
    const cx = startX + col * cellW + cellW / 2;
    const cy = gridTop + row * cellHReal + cellHReal * 0.68;
    const isToday = cfg.accentToday && date.isSame(now, 'day');
    const isWeekend = isRestDay(date);
    const isPast = date.isBefore(now, 'day') && now.month() === monthIndex;
    const textColor = isToday ? theme.text : isWeekend ? theme.weekend : isPast ? alpha(theme.text, 0.6) : theme.text;
    if (isToday) {
      const rect = `<rect x="${cx - cellW * 0.45}" y="${cy - cellHReal * 0.6}" width="${cellW * 0.9}" height="${cellHReal * 0.8}" rx="${Math.min(cellW, cellHReal) * 0.2}"`;
      out += cfg.style === 'outline'
        ? `${rect} fill="none" stroke="${theme.accent}" stroke-width="${Math.max(1.2, w * 0.004)}"/>`
        : `${rect} fill="${alpha(theme.accent, cfg.style === 'numbers' ? 0.24 : 0.18)}" stroke="${alpha(theme.accent2, 0.34)}"/>`;
    }
    if (cfg.style === 'dots') {
      const r = Math.min(cellW, cellHReal) * (isToday ? 0.18 : 0.12);
      out += `<circle cx="${cx}" cy="${cy - cellHReal * 0.2}" r="${r}" fill="${isToday ? theme.accent : isPast ? theme.accent2 : isWeekend ? alpha(theme.weekend, 0.9) : alpha(theme.text, 0.26)}"/>`;
      out += `<text x="${cx}" y="${cy + cellHReal * 0.3}" text-anchor="middle" fill="${textColor}" font-size="${Math.round(numSize * 0.82)}" font-family="${FONT}" font-weight="700">${day}</text>`;
    } else if (cfg.style === 'focus') {
      out += `<text x="${cx}" y="${cy}" text-anchor="middle" fill="${textColor}" font-size="${Math.round(numSize * (isToday ? 1.05 : 1))}" font-family="${FONT}" font-weight="${isToday || isCurrent ? 800 : 600}">${day}</text>`;
      if (isCurrent && !isToday && !opts.tiny) out += `<line x1="${cx - cellW * 0.15}" y1="${cy + cellHReal * 0.15}" x2="${cx + cellW * 0.15}" y2="${cy + cellHReal * 0.15}" stroke="${alpha(theme.accent2, 0.35)}" stroke-linecap="round" stroke-width="2"/>`;
    } else if (cfg.style === 'capsule') {
      if (isToday || isWeekend) out += `<rect x="${cx - cellW * 0.38}" y="${cy - cellHReal * 0.48}" width="${cellW * 0.76}" height="${cellHReal * 0.56}" rx="${cellHReal * 0.28}" fill="${isToday ? alpha(theme.accent, 0.25) : alpha(theme.weekend, 0.12)}"/>`;
      out += `<text x="${cx}" y="${cy}" text-anchor="middle" fill="${textColor}" font-size="${numSize}" font-family="${FONT}" font-weight="${isToday ? 800 : 600}">${day}</text>`;
    } else if (cfg.style === 'ring') {
      if (isToday) out += `<circle cx="${cx}" cy="${cy - cellHReal * 0.2}" r="${Math.min(cellW, cellHReal) * 0.28}" fill="none" stroke="${theme.accent}" stroke-width="${Math.max(1.2, w * 0.004)}"/>`;
      out += `<text x="${cx}" y="${cy}" text-anchor="middle" fill="${textColor}" font-size="${numSize}" font-family="${FONT}" font-weight="${isToday ? 800 : 600}">${day}</text>`;
    } else if (cfg.style === 'micro') {
      out += `<circle cx="${cx}" cy="${cy - cellHReal * 0.18}" r="${Math.max(1.1, Math.min(cellW, cellHReal) * 0.08)}" fill="${isToday ? theme.accent : isWeekend ? theme.weekend : alpha(theme.text, 0.24)}"/>`;
      out += `<text x="${cx}" y="${cy + cellHReal * 0.24}" text-anchor="middle" fill="${textColor}" font-size="${Math.round(numSize * 0.72)}" font-family="${FONT}" font-weight="700">${day}</text>`;
    } else {
      out += `<text x="${cx}" y="${cy}" text-anchor="middle" fill="${textColor}" font-size="${numSize}" font-family="${FONT}" font-weight="${isToday ? 800 : 600}">${day}</text>`;
    }
  }
  if (weekNumberCol) {
    [...usedWeekRows].forEach((row) => {
      const date = first.add(row * 7 - firstWeekday, 'day');
      const wx = x + pad + cellW / 2;
      const wy = gridTop + row * cellHReal + cellHReal * 0.68;
      out += `<text x="${wx}" y="${wy}" text-anchor="middle" fill="${alpha(theme.muted, 0.7)}" font-size="${Math.round(numSize * 0.68)}" font-family="${FONT}">${dayjs(date).week()}</text>`;
    });
  }
  return out;
}

function renderMonthListRow({ monthIndex, year, x, y, w, h, cfg, theme, labels, now, FONT }) {
  const first = dayjs(`${year}-${String(monthIndex + 1).padStart(2, '0')}-01`);
  const daysInMonth = first.daysInMonth();
  const firstWeekday = (first.day() + 6) % 7;
  const isCurrent = now.month() === monthIndex;
  const isRestDay = isRestDayFactory(cfg, year);
  const compact = cfg.monthLayout === 'list_1x12_compact';
  const premiumCompact = true;
  const radius = Math.max(14, Math.round(h * (compact ? 0.24 : 0.28)));
  const padX = Math.round(w * (compact ? 0.024 : 0.03));
  const nameW = Math.round(w * (compact ? 0.16 : 0.18));
  const badgeW = cfg.monthBadges ? Math.round(w * (compact ? 0.08 : 0.08)) : 0;
  const weekdayVisible = cfg.showWeekdays;
  const innerX = x + padX + nameW;
  const innerW = Math.max(80, w - padX * 2 - nameW - badgeW);
  const cols = 7;
  const rows = 6;
  const topPad = weekdayVisible ? h * (compact ? 0.22 : 0.24) : h * (compact ? 0.14 : 0.16);
  const cellW = innerW / cols;
  const cellH = Math.max(8, (h - topPad - h * (compact ? 0.08 : 0.10)) / rows);
  const monthTitleSize = Math.max(12, Math.round(Math.min(h * (compact ? 0.16 : 0.19), nameW * 0.22)));
  const weekdaySize = Math.max(8, Math.round(Math.min(h * (compact ? 0.078 : 0.088), cellW * 0.24)));
  const numberSize = Math.max(8, Math.round(Math.min(cellW, cellH) * (compact ? 0.40 : 0.44)));
  const gridTop = y + topPad + (weekdayVisible ? h * (compact ? 0.04 : 0.05) : 0);
  const monthLabel = pickMonthLabel(labels, monthIndex, nameW, 'list');
  let out = `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${radius}" fill="${isCurrent ? alpha(theme.panel, 0.95) : alpha(theme.panel, premiumCompact ? 0.76 : 0.72)}" stroke="${isCurrent ? alpha(theme.accent2, 0.34) : alpha('#ffffff', 0.05)}"/>`;
  out += `<text x="${x + padX}" y="${y + h * 0.28}" fill="${theme.text}" font-size="${monthTitleSize}" font-family="${FONT}" font-weight="800">${monthLabel}</text>`;
  if (cfg.monthBadges) {
    out += `<rect x="${x + w - padX - badgeW}" y="${y + h * 0.17}" width="${badgeW}" height="${h * 0.20}" rx="${h * 0.10}" fill="${isCurrent ? alpha(theme.accent, 0.18) : alpha('#ffffff', 0.05)}"/>`;
    out += `<text x="${x + w - padX - badgeW / 2}" y="${y + h * 0.30}" text-anchor="middle" fill="${isCurrent ? theme.accent2 : theme.muted}" font-size="${Math.round(h * 0.10)}" font-family="${FONT}" font-weight="700">${daysInMonth}${cfg.lang === 'ru' ? 'д' : 'd'}</text>`;
  }
  if (weekdayVisible) {
    labels.weekdays.forEach((wd, i) => {
      const tx = innerX + i * cellW + cellW / 2;
      out += `<text x="${tx}" y="${y + h * 0.24}" text-anchor="middle" fill="${i >= 5 ? alpha(theme.weekend, 0.95) : theme.muted}" font-size="${weekdaySize}" font-family="${FONT}" font-weight="700">${wd}</text>`;
    });
  }
  for (let day = 1; day <= daysInMonth; day++) {
    const index = firstWeekday + day - 1;
    const col = index % 7;
    const row = Math.floor(index / 7);
    const date = dayjs(`${year}-${String(monthIndex + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`);
    const cx = innerX + col * cellW + cellW / 2;
    const cy = gridTop + row * cellH + cellH * 0.72;
    const isToday = cfg.accentToday && date.isSame(now, 'day');
    const isWeekend = isRestDay(date);
    const isPast = date.isBefore(now, 'day') && now.month() === monthIndex;
    const textColor = isToday ? theme.text : isWeekend ? theme.weekend : isPast ? alpha(theme.text, 0.64) : theme.text;
    if (isToday) out += `<rect x="${cx - cellW * 0.34}" y="${cy - cellH * 0.58}" width="${cellW * 0.68}" height="${cellH * 0.72}" rx="${Math.min(cellW, cellH) * 0.22}" fill="${alpha(theme.accent, 0.24)}" stroke="${alpha(theme.accent2, 0.28)}"/>`;
    if (cfg.style === 'dots' || cfg.style === 'micro') out += `<circle cx="${cx}" cy="${cy - cellH * 0.24}" r="${Math.max(1.1, Math.min(cellW, cellH) * 0.08)}" fill="${isToday ? theme.accent : isWeekend ? theme.weekend : alpha(theme.text, 0.22)}"/>`;
    out += `<text x="${cx}" y="${cy + (cfg.style === 'dots' || cfg.style === 'micro' ? cellH * 0.18 : 0)}" text-anchor="middle" fill="${textColor}" font-size="${numberSize}" font-family="${FONT}" font-weight="${isToday ? 800 : 600}">${day}</text>`;
  }
  return out;
}

function renderFooter(cfg, theme, labels, now, stats, width, footerBox, FONT) {
  const { x, y, w, h } = footerBox;
  const pad = Math.round(w * 0.04);
  const base = `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${Math.round(w * 0.05)}" fill="${alpha(theme.panel, 0.82)}" stroke="${alpha('#ffffff', 0.06)}"/>`;
  const textSize = Math.round(h * 0.22);
  const subSize = Math.round(h * 0.15);
  if (cfg.footer === 'quote') {
    const lines = wrap(cfg.note || randomQuote(cfg.lang, now.year()), 34);
    return base + lines.map((line, i) => `<text x="${x + w / 2}" y="${y + h * 0.38 + i * subSize * 1.45}" text-anchor="middle" fill="${theme.text}" font-size="${subSize}" font-family="${FONT}" font-weight="700">${escapeXml(line)}</text>`).join('');
  }
  if (cfg.footer === 'progress_bar') {
    const barX = x + pad; const barY = y + h * 0.55; const barW = w - pad * 2; const barH = h * 0.12;
    return base + `
      <text x="${x + pad}" y="${y + h * 0.32}" fill="${theme.text}" font-size="${textSize}" font-family="${FONT}" font-weight="800">${stats.percentPassed}% ${labels.passed}</text>
      <rect x="${barX}" y="${barY}" width="${barW}" height="${barH}" rx="${barH / 2}" fill="${alpha(theme.bg, 0.7)}" />
      <rect x="${barX}" y="${barY}" width="${barW * stats.percentPassed / 100}" height="${barH}" rx="${barH / 2}" fill="${theme.accent}" />`;
  }
  if (cfg.footer === 'today_card') {
    const dateLabel = formatLongToday(now, labels, cfg.lang);
    return base + `
      <text x="${x + pad}" y="${y + h * 0.34}" fill="${theme.accent2}" font-size="${subSize}" font-family="${FONT}" font-weight="700">${labels.today}</text>
      <text x="${x + pad}" y="${y + h * 0.68}" fill="${theme.text}" font-size="${textSize}" font-family="${FONT}" font-weight="800">${escapeXml(dateLabel)}</text>`;
  }
  if (cfg.footer === 'custom_note' && cfg.note) {
    const lines = wrap(cfg.note, 36).slice(0, 2);
    return base + lines.map((line, i) => `<text x="${x + pad}" y="${y + h * 0.38 + i * subSize * 1.6}" fill="${theme.text}" font-size="${subSize}" font-family="${FONT}" font-weight="700">${escapeXml(line)}</text>`).join('');
  }
  return base + `
    <text x="${x + pad}" y="${y + h * 0.36}" fill="${theme.text}" font-size="${textSize}" font-family="${FONT}" font-weight="800">${stats.daysLeft} ${labels.daysLeft}</text>
    <text x="${x + pad}" y="${y + h * 0.66}" fill="${theme.muted}" font-size="${subSize}" font-family="${FONT}">${stats.percentPassed}% ${labels.passed}</text>`;
}

function renderSvg(cfg) {
  const theme = THEMES[cfg.theme];
  const labels = getLabels(cfg.lang);
  const now = zonedNow(cfg.timezone);
  const stats = yearStats(now);
  const { width, height } = cfg;
  const safe = getSafeInsets(cfg, width, height);
  const sidePadding = safe.side;
  const innerTop = safe.top;
  const innerBottom = height - safe.bottom;

  const listLike = isListLayout(cfg.monthLayout);
  const compactLike = isCompactGridLayout(cfg.monthLayout) || listLike;
  const headerHeight = Math.round(height * (listLike ? 0.088 : compactLike ? 0.09 : 0.095));
  const footerHeight = Math.round(height * (listLike ? 0.072 : compactLike ? 0.076 : 0.08));
  const contentTop = innerTop + headerHeight + Math.round(height * 0.012);
  const contentBottom = innerBottom - footerHeight - Math.round(height * 0.014);
  const contentH = contentBottom - contentTop;

  const selectedFontDef = FONTS[cfg.font] || FONTS.inter;
  const b64Font = fontCache[cfg.font];
  const FONT_FAMILY = getSafeFontStack(selectedFontDef.family, cfg.pngSafeFont);
  const fontDefs = b64Font && !cfg.pngSafeFont ? `<style>@font-face { font-family: '${selectedFontDef.family}'; src: url(data:font/truetype;base64,${b64Font}) format('truetype'); }</style>` : '';

  const layout = getLayoutMetrics(cfg, width, height, contentH, sidePadding);

  let monthsSvg = '';
  if (layout.mode === 'focus') {
    const heroGap = Math.round(width * 0.014);
    const heroH = Math.round(contentH * 0.40);
    monthsSvg += renderMonthGrid({ monthIndex: now.month(), year: now.year(), x: sidePadding, y: contentTop, w: width - sidePadding * 2, h: heroH, cfg: { ...cfg, monthLayout: 'single_month_focus', monthBadges: true, showWeekNumbers: true }, theme, labels, now, FONT: FONT_FAMILY });

    const miniTop = contentTop + heroH + heroGap;
    const miniRows = 3, miniCols = 4;
    const miniH = (contentBottom - miniTop - heroGap * (miniRows - 1)) / miniRows;
    const miniW = (width - sidePadding * 2 - heroGap * (miniCols - 1)) / miniCols;
    const otherMonths = Array.from({ length: 12 }, (_, i) => i).filter(i => i !== now.month());
    otherMonths.forEach((monthIndex, i) => {
      const col = i % miniCols;
      const row = Math.floor(i / miniCols);
      const x = sidePadding + col * (miniW + heroGap);
      const y = miniTop + row * (miniH + heroGap);
      monthsSvg += renderMonthGrid({
        monthIndex,
        year: now.year(),
        x, y, w: miniW, h: miniH,
        cfg: { ...cfg, monthLayout: 'grid_3x4_compact', focusCurrentMonth: false, monthBadges: false, showWeekNumbers: false, showWeekdays: true },
        theme, labels, now, FONT: FONT_FAMILY
      });
    });
  } else {
    for (let i = 0; i < 12; i++) {
      const col = i % layout.cols;
      const row = Math.floor(i / layout.cols);
      const x = sidePadding + col * (layout.monthW + layout.gap);
      const y = contentTop + row * (layout.monthH + layout.gap);
      monthsSvg += isListLayout(cfg.monthLayout)
        ? renderMonthListRow({ monthIndex: i, year: now.year(), x, y, w: layout.monthW, h: layout.monthH, cfg, theme, labels, now, FONT: FONT_FAMILY })
        : renderMonthGrid({ monthIndex: i, year: now.year(), x, y, w: layout.monthW, h: layout.monthH, cfg, theme, labels, now, FONT: FONT_FAMILY });
    }
  }

  let quarterLines = '';
  if (cfg.quarterDividers && layout.mode !== 'focus') {
    if (isListLayout(cfg.monthLayout)) {
      [3, 6, 9].forEach((idx) => {
        const ly = contentTop + idx * layout.monthH + (idx - 0.5) * layout.gap;
        quarterLines += `<line x1="${sidePadding}" y1="${ly}" x2="${width - sidePadding}" y2="${ly}" stroke="${alpha(theme.accent2, 0.12)}" stroke-dasharray="12 12" />`;
      });
    } else if (layout.cols === 3 && layout.rows === 4) {
      for (let r = 1; r < layout.rows; r++) {
        const ly = contentTop + r * layout.monthH + (r - 0.5) * layout.gap;
        quarterLines += `<line x1="${sidePadding}" y1="${ly}" x2="${width - sidePadding}" y2="${ly}" stroke="${alpha(theme.accent2, 0.12)}" stroke-dasharray="10 12" />`;
      }
    } else if (layout.cols === 2 && layout.rows === 6) {
      [2, 4].forEach((r) => {
        const ly = contentTop + r * layout.monthH + (r - 0.5) * layout.gap;
        quarterLines += `<line x1="${sidePadding}" y1="${ly}" x2="${width - sidePadding}" y2="${ly}" stroke="${alpha(theme.accent2, 0.10)}" stroke-dasharray="10 12" />`;
      });
    } else if (layout.cols === 6 && layout.rows === 2) {
      const lineY = contentTop + layout.monthH + layout.gap / 2;
      quarterLines += `<line x1="${sidePadding}" y1="${lineY}" x2="${width - sidePadding}" y2="${lineY}" stroke="${alpha(theme.accent2, 0.10)}" stroke-dasharray="10 12" />`;
      [3].forEach((c) => {
        const lx = sidePadding + c * layout.monthW + (c - 0.5) * layout.gap;
        quarterLines += `<line x1="${lx}" y1="${contentTop}" x2="${lx}" y2="${contentBottom}" stroke="${alpha(theme.accent2, 0.08)}" stroke-dasharray="8 10" />`;
      });
    }
  }

  const footerBox = { x: sidePadding, y: innerBottom - footerHeight, w: width - sidePadding * 2, h: Math.round(footerHeight * 0.92) };
  return `<?xml version="1.0" encoding="UTF-8"?>
  <svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
    <defs>${fontDefs}</defs>
    ${renderBackground(cfg, theme, width, height)}
    ${renderHeader(cfg, theme, labels, now, stats, width, sidePadding, innerTop, FONT_FAMILY)}
    ${quarterLines}
    ${monthsSvg}
    ${renderFooter(cfg, theme, labels, now, stats, width, footerBox, FONT_FAMILY)}
  </svg>`;
}

app.use(express.static(path.join(__dirname, 'public')));
app.get('/api/options', (req, res) => {
  res.json({ presets: PHONE_PRESETS, themes: THEMES, bgStyles: BG_STYLES, fonts: Object.fromEntries(Object.entries(FONTS).map(([k, v]) => [k, v.name])) });
});
app.get('/wallpaper.svg', (req, res) => {
  const cfg = getConfig(req.query);
  res.type('image/svg+xml').send(renderSvg(cfg));
});
app.get('/wallpaper.png', async (req, res) => {
  try {
    const cfg = getConfig({ ...req.query, __target: 'png' });
    const svg = renderSvg(cfg);
    const png = await sharp(Buffer.from(svg)).png().toBuffer();
    res.setHeader('Content-Type', 'image/png');
    res.send(png);
  } catch (err) {
    res.status(500).json({ error: 'ОШИБКА ГЕНЕРАЦИИ ОБОЕВ', details: err.message });
  }
});
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));
app.listen(PORT, () => console.log(`Сервер запущен на http://localhost:${PORT}`));
