const express = require('express');
const path = require('path');
const sharp = require('sharp');
const dayjs = require('dayjs');
const utc = require('dayjs/plugin/utc');
const isLeapYear = require('dayjs/plugin/isLeapYear');
const weekOfYear = require('dayjs/plugin/weekOfYear');
const advancedFormat = require('dayjs/plugin/advancedFormat');

dayjs.extend(utc);
dayjs.extend(isLeapYear);
dayjs.extend(weekOfYear);
dayjs.extend(advancedFormat);

const app = express();
const PORT = process.env.PORT || 3000;

const PHONE_PRESETS = {
  iphone_se_1: { label: 'iPhone SE (1st gen)', width: 640, height: 1136, family: 'SE / Classic' },
  iphone_8: { label: 'iPhone 8 / 7 / 6s / 6', width: 750, height: 1334, family: 'Classic' },
  iphone_8_plus: { label: 'iPhone 8 Plus / 7 Plus / 6s Plus / 6 Plus', width: 1080, height: 1920, family: 'Classic Plus' },
  iphone_se_2: { label: 'iPhone SE (2nd / 3rd gen)', width: 750, height: 1334, family: 'SE' },
  iphone_x: { label: 'iPhone X / XS / 11 Pro', width: 1125, height: 2436, family: 'Face ID 5.8"' },
  iphone_xr: { label: 'iPhone XR / 11', width: 828, height: 1792, family: 'Liquid Retina 6.1"' },
  iphone_xs_max: { label: 'iPhone XS Max / 11 Pro Max', width: 1242, height: 2688, family: 'Max 6.5"' },
  iphone_12_mini: { label: 'iPhone 12 mini / 13 mini', width: 1080, height: 2340, family: 'mini' },
  iphone_12: { label: 'iPhone 12 / 12 Pro / 13 / 13 Pro / 14', width: 1170, height: 2532, family: '6.1"' },
  iphone_12_pro_max: { label: 'iPhone 12 Pro Max / 13 Pro Max / 14 Plus', width: 1284, height: 2778, family: 'Large 6.7"' },
  iphone_14_pro: { label: 'iPhone 14 Pro', width: 1179, height: 2556, family: 'Pro 6.1"' },
  iphone_14_pro_max: { label: 'iPhone 14 Pro Max', width: 1290, height: 2796, family: 'Pro Max 6.7"' },
  iphone_15: { label: 'iPhone 15 / 15 Pro / 16', width: 1179, height: 2556, family: '6.1" modern' },
  iphone_15_plus: { label: 'iPhone 15 Plus / 16 Plus', width: 1290, height: 2796, family: '6.7" modern' },
  iphone_16_pro: { label: 'iPhone 16 Pro', width: 1206, height: 2622, family: 'Pro 6.3"' },
  iphone_16_pro_max: { label: 'iPhone 16 Pro Max', width: 1320, height: 2868, family: 'Pro Max 6.9"' },
  custom: { label: 'Custom size', width: 1179, height: 2556, family: 'Custom' }
};

const THEMES = {
  graphite_orange: { name: 'Graphite Orange', bg: '#0a0d12', panel: '#131823', text: '#edf2ff', muted: '#8994a7', accent: '#ff8f2d', accent2: '#ffbc6f', weekend: '#ff8f7b' },
  obsidian_blue: { name: 'Obsidian Blue', bg: '#07111e', panel: '#0d1726', text: '#eef6ff', muted: '#92abc9', accent: '#5db6ff', accent2: '#a7dcff', weekend: '#86b4ff' },
  frost_light: { name: 'Frost Light', bg: '#edf4ff', panel: '#dfe8f7', text: '#1e2d41', muted: '#73839a', accent: '#3b7bff', accent2: '#7ea6ff', weekend: '#5b88ff' },
  violet_night: { name: 'Violet Night', bg: '#110c18', panel: '#1a1325', text: '#f6efff', muted: '#b29fc9', accent: '#9d72ff', accent2: '#ceb8ff', weekend: '#d09cff' },
  olive_linen: { name: 'Olive Linen', bg: '#161812', panel: '#202419', text: '#f3f4ea', muted: '#a5aa95', accent: '#b4c86a', accent2: '#dbe8a1', weekend: '#c7ad86' },
  rose_sunset: { name: 'Rose Sunset', bg: '#1b1014', panel: '#291920', text: '#fff0f5', muted: '#c2a4af', accent: '#ff6d96', accent2: '#ffb1c4', weekend: '#ff9f90' },
  oled_gold: { name: 'OLED Gold', bg: '#000000', panel: '#0a0a0a', text: '#fff7df', muted: '#a39063', accent: '#ffc44e', accent2: '#ffe49a', weekend: '#ffd07b' },
  mint_air: { name: 'Mint Air', bg: '#0a1512', panel: '#10211c', text: '#ebfff8', muted: '#8db4a8', accent: '#57d2ab', accent2: '#aef2da', weekend: '#88e0ca' }
};

const BG_STYLES = {
  aurora: 'Aurora',
  glass: 'Glass',
  paper: 'Paper',
  spotlight: 'Spotlight',
  waves: 'Soft waves',
  noir: 'Noir'
};

const QUOTES = {
  ru: [
    'Маленькие шаги собирают большой год.',
    'Сегодня тоже часть твоего будущего.',
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
        months: ['Янв', 'Фев', 'Мар', 'Апр', 'Май', 'Июн', 'Июл', 'Авг', 'Сен', 'Окт', 'Ноя', 'Дек'],
        weekdays: ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'],
        today: 'Сегодня',
        year: 'год',
        daysLeft: 'дн. осталось',
        passed: 'пройдено',
        week: 'Неделя',
        setupTitle: 'Как установить на экран блокировки iPhone',
        setupSteps: [
          '1. Нажми «Скачать PNG».',
          '2. Сохрани изображение в Фото.',
          '3. На iPhone удерживай экран блокировки.',
          '4. Нажми «+» → Фото → выбери обои.',
          '5. При необходимости кадрируй и нажми «Готово».'
        ]
      }
    : {
        months: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
        weekdays: ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'],
        today: 'Today',
        year: 'year',
        daysLeft: 'days left',
        passed: 'passed',
        week: 'Week',
        setupTitle: 'How to set it on iPhone Lock Screen',
        setupSteps: [
          '1. Tap “Download PNG”.',
          '2. Save the image to Photos.',
          '3. Long-press the Lock Screen on iPhone.',
          '4. Tap “+” → Photos → choose the wallpaper.',
          '5. Adjust the crop if needed and tap “Done”.'
        ]
      };
}

function getConfig(query) {
  const preset = PHONE_PRESETS[query.model] || PHONE_PRESETS.iphone_15;
  return {
    model: query.model || 'iphone_15',
    width: query.model === 'custom' ? clamp(num(query.width, preset.width), 320, 4000) : preset.width,
    height: query.model === 'custom' ? clamp(num(query.height, preset.height), 568, 5000) : preset.height,
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
    focusCurrentMonth: String(query.focus_current_month || '1') === '1'
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

function randomQuote(lang, year) {
  const arr = QUOTES[lang] || QUOTES.ru;
  return arr[year % arr.length];
}

function renderBackground(cfg, theme, width, height) {
  const overlayOpacity = cfg.opacity / 100;
  if (cfg.bgStyle === 'paper') {
    return `
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
      <rect width="100%" height="100%" filter="url(#noise)" opacity="0.55"/>
      <rect width="100%" height="100%" fill="${alpha('#ffffff', overlayOpacity)}"/>
    `;
  }
  if (cfg.bgStyle === 'glass') {
    return `
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
      <circle cx="${width * 0.58}" cy="${height * 0.82}" r="${width * 0.3}" fill="${alpha(theme.accent2, 0.08)}"/>
      <rect width="100%" height="100%" fill="${alpha('#ffffff', overlayOpacity)}"/>
    `;
  }
  if (cfg.bgStyle === 'spotlight') {
    return `
      <defs>
        <radialGradient id="bg" cx="50%" cy="12%" r="90%">
          <stop offset="0%" stop-color="${alpha(theme.accent2, 0.3)}" />
          <stop offset="18%" stop-color="${alpha(theme.accent, 0.18)}" />
          <stop offset="55%" stop-color="${alpha(theme.bg, 0.97)}" />
          <stop offset="100%" stop-color="${theme.bg}" />
        </radialGradient>
      </defs>
      <rect width="100%" height="100%" fill="url(#bg)"/>
      <rect width="100%" height="100%" fill="${alpha('#ffffff', overlayOpacity)}"/>
    `;
  }
  if (cfg.bgStyle === 'waves') {
    return `
      <defs>
        <linearGradient id="bg" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="${theme.bg}" />
          <stop offset="100%" stop-color="${theme.panel}" />
        </linearGradient>
      </defs>
      <rect width="100%" height="100%" fill="url(#bg)"/>
      <path d="M 0 ${height * 0.22} C ${width * 0.12} ${height * 0.18}, ${width * 0.28} ${height * 0.28}, ${width * 0.42} ${height * 0.24} S ${width * 0.74} ${height * 0.14}, ${width} ${height * 0.22}" fill="none" stroke="${alpha(theme.accent2, 0.16)}" stroke-width="${width * 0.01}"/>
      <path d="M 0 ${height * 0.62} C ${width * 0.18} ${height * 0.56}, ${width * 0.34} ${height * 0.69}, ${width * 0.56} ${height * 0.64} S ${width * 0.82} ${height * 0.58}, ${width} ${height * 0.65}" fill="none" stroke="${alpha(theme.accent, 0.14)}" stroke-width="${width * 0.013}"/>
      <rect width="100%" height="100%" fill="${alpha('#ffffff', overlayOpacity)}"/>
    `;
  }
  if (cfg.bgStyle === 'noir') {
    return `
      <defs>
        <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="#020202" />
          <stop offset="100%" stop-color="#0c1017" />
        </linearGradient>
      </defs>
      <rect width="100%" height="100%" fill="url(#bg)"/>
      <circle cx="${width * 0.84}" cy="${height * 0.12}" r="${width * 0.16}" fill="${alpha(theme.accent, 0.12)}"/>
      <circle cx="${width * 0.24}" cy="${height * 0.76}" r="${width * 0.2}" fill="${alpha(theme.accent2, 0.08)}"/>
      <rect width="100%" height="100%" fill="${alpha('#ffffff', overlayOpacity)}"/>
    `;
  }
  return `
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
    <rect width="100%" height="100%" fill="url(#bg2)"/>
    <rect width="100%" height="100%" fill="${alpha('#ffffff', overlayOpacity)}"/>
  `;
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

function renderHeader(cfg, theme, labels, now, stats, width, padding, topY) {
  const dateText = cfg.lang === 'ru'
    ? `${labels.today}: ${now.format('D MMMM YYYY')}`
    : `${labels.today}: ${now.format('MMM D, YYYY')}`;
  const right = width - padding;
  const titleSize = Math.round(width * 0.06);
  const subtitleSize = Math.round(width * 0.024);
  const chipHeight = Math.round(width * 0.08);
  const chipWidth = Math.round(width * 0.28);
  const ringR = Math.round(width * 0.052);
  const ringCx = right - ringR - 2;
  const ringCy = topY + 18 + ringR;
  const circumference = 2 * Math.PI * ringR;
  const dash = circumference * (stats.percentPassed / 100);

  let out = `
    <text x="${padding}" y="${topY + titleSize}" fill="${theme.text}" font-size="${titleSize}" font-family="Inter, Arial, sans-serif" font-weight="800">${now.year()}</text>
    <text x="${padding}" y="${topY + titleSize + subtitleSize * 1.6}" fill="${theme.muted}" font-size="${subtitleSize}" font-family="Inter, Arial, sans-serif">${escapeXml(dateText)}</text>
    <rect x="${padding}" y="${topY + titleSize + subtitleSize * 2.3}" width="${chipWidth}" height="${chipHeight}" rx="${chipHeight / 2}" fill="${alpha(theme.panel, 0.92)}" stroke="${alpha(theme.accent2, 0.24)}" />
    <text x="${padding + chipWidth / 2}" y="${topY + titleSize + subtitleSize * 2.3 + chipHeight * 0.64}" text-anchor="middle" fill="${theme.accent2}" font-size="${Math.round(width * 0.026)}" font-family="Inter, Arial, sans-serif" font-weight="700">${labels.week} ${now.week()}</text>
  `;

  if (cfg.showProgressRing) {
    out += `
      <circle cx="${ringCx}" cy="${ringCy}" r="${ringR}" fill="none" stroke="${alpha(theme.panel, 0.92)}" stroke-width="${ringR * 0.28}" />
      <circle cx="${ringCx}" cy="${ringCy}" r="${ringR}" fill="none" stroke="${theme.accent}" stroke-width="${ringR * 0.28}" stroke-linecap="round" stroke-dasharray="${dash} ${circumference}" transform="rotate(-90 ${ringCx} ${ringCy})" />
      <text x="${ringCx}" y="${ringCy + width * 0.01}" text-anchor="middle" fill="${theme.text}" font-size="${Math.round(width * 0.025)}" font-family="Inter, Arial, sans-serif" font-weight="800">${stats.percentPassed}%</text>
    `;
  }

  return out;
}

function monthEmphasis(monthIndex, now, cfg) {
  if (!cfg.focusCurrentMonth) return 1;
  if (now.month() === monthIndex) return 1.12;
  if (Math.abs(now.month() - monthIndex) === 1) return 1.03;
  return 1;
}

function weekNumberLabel(date) {
  return dayjs(date).week();
}

function renderMonth({ monthIndex, year, x, y, w, h, cfg, theme, labels, now }) {
  const first = dayjs(`${year}-${String(monthIndex + 1).padStart(2, '0')}-01`);
  const daysInMonth = first.daysInMonth();
  const firstWeekday = (first.day() + 6) % 7;
  const isCurrent = now.month() === monthIndex;
  const emphasis = monthEmphasis(monthIndex, now, cfg);
  const radius = Math.max(16, Math.round(w * 0.08));
  const pad = Math.round(w * 0.06);
  const titleSize = Math.round(h * 0.14 * emphasis);
  const weekdaySize = Math.round(h * 0.065);
  const numberSize = Math.round(h * 0.078 * emphasis);
  const badgeH = Math.round(h * 0.12);
  const cardFill = isCurrent ? alpha(theme.panel, 0.98) : alpha(theme.panel, 0.72);
  let out = `
    <rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${radius}" fill="${cardFill}" stroke="${isCurrent ? alpha(theme.accent2, 0.36) : alpha('#ffffff', 0.06)}" />
    <text x="${x + pad}" y="${y + pad + titleSize * 0.75}" fill="${theme.text}" font-size="${titleSize}" font-family="Inter, Arial, sans-serif" font-weight="800">${labels.months[monthIndex]}</text>
  `;

  if (cfg.monthBadges) {
    const badgeW = Math.round(w * 0.26);
    out += `
      <rect x="${x + w - pad - badgeW}" y="${y + pad * 0.65}" width="${badgeW}" height="${badgeH}" rx="${badgeH / 2}" fill="${isCurrent ? alpha(theme.accent, 0.18) : alpha('#ffffff', 0.05)}" />
      <text x="${x + w - pad - badgeW / 2}" y="${y + pad * 0.65 + badgeH * 0.65}" text-anchor="middle" fill="${isCurrent ? theme.accent2 : theme.muted}" font-size="${Math.round(h * 0.06)}" font-family="Inter, Arial, sans-serif" font-weight="700">${daysInMonth}d</text>
    `;
  }

  const weekdayY = y + h * 0.24;
  const gridTop = cfg.showWeekdays ? y + h * 0.30 : y + h * 0.22;
  const rows = 6;
  const cols = 7;
  const weekNumberCol = cfg.showWeekNumbers ? 1 : 0;
  const innerW = w - pad * 2;
  const cellW = innerW / (cols + weekNumberCol);
  const cellH = (h - (gridTop - y) - h * 0.08) / rows;
  const startX = x + pad + (cfg.showWeekNumbers ? cellW : 0);

  if (cfg.showWeekdays) {
    if (cfg.showWeekNumbers) {
      out += `<text x="${x + pad + cellW / 2}" y="${weekdayY}" text-anchor="middle" fill="${theme.muted}" font-size="${weekdaySize}" font-family="Inter, Arial, sans-serif">#</text>`;
    }
    labels.weekdays.forEach((wd, i) => {
      const weekend = i >= 5;
      out += `<text x="${startX + i * cellW + cellW / 2}" y="${weekdayY}" text-anchor="middle" fill="${weekend ? alpha(theme.weekend, 0.95) : theme.muted}" font-size="${weekdaySize}" font-family="Inter, Arial, sans-serif" font-weight="700">${wd}</text>`;
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
    const textColor = isToday ? theme.text : isWeekend ? theme.weekend : isPast ? alpha(theme.text, 0.88) : theme.muted;

    if (isToday) {
      if (cfg.style === 'outline') {
        out += `<rect x="${cx - cellW * 0.38}" y="${cy - cellH * 0.58}" width="${cellW * 0.76}" height="${cellH * 0.72}" rx="${cellH * 0.28}" fill="none" stroke="${theme.accent}" stroke-width="${Math.max(2, w * 0.006)}"/>`;
      } else {
        out += `<rect x="${cx - cellW * 0.38}" y="${cy - cellH * 0.58}" width="${cellW * 0.76}" height="${cellH * 0.72}" rx="${cellH * 0.28}" fill="${alpha(theme.accent, cfg.style === 'numbers' ? 0.24 : 0.18)}" stroke="${alpha(theme.accent2, 0.34)}"/>`;
      }
    }

    if (cfg.style === 'dots') {
      const r = Math.min(cellW, cellH) * (isToday ? 0.2 : 0.14);
      out += `<circle cx="${cx}" cy="${cy - cellH * 0.15}" r="${r}" fill="${isToday ? theme.accent : isPast ? theme.accent2 : isWeekend ? alpha(theme.weekend, 0.9) : alpha(theme.text, 0.26)}"/>`;
      out += `<text x="${cx}" y="${cy + cellH * 0.36}" text-anchor="middle" fill="${textColor}" font-size="${Math.round(numberSize * 0.9)}" font-family="Inter, Arial, sans-serif" font-weight="700">${day}</text>`;
    } else if (cfg.style === 'focus') {
      out += `<text x="${cx}" y="${cy}" text-anchor="middle" fill="${textColor}" font-size="${Math.round(numberSize * (isToday ? 1.08 : 1))}" font-family="Inter, Arial, sans-serif" font-weight="${isToday || isCurrent ? 800 : 600}">${day}</text>`;
      if (isCurrent && !isToday) {
        out += `<line x1="${cx - cellW * 0.18}" y1="${cy + cellH * 0.17}" x2="${cx + cellW * 0.18}" y2="${cy + cellH * 0.17}" stroke="${alpha(theme.accent2, 0.35)}" stroke-linecap="round" />`;
      }
    } else {
      out += `<text x="${cx}" y="${cy}" text-anchor="middle" fill="${textColor}" font-size="${numberSize}" font-family="Inter, Arial, sans-serif" font-weight="${isToday ? 800 : 650}">${day}</text>`;
    }
  }

  if (cfg.showWeekNumbers) {
    [...usedWeekRows].forEach((row) => {
      const date = first.add(row * 7 - firstWeekday, 'day');
      const wx = x + pad + cellW / 2;
      const wy = gridTop + row * cellH + cellH * 0.68;
      out += `<text x="${wx}" y="${wy}" text-anchor="middle" fill="${alpha(theme.muted, 0.8)}" font-size="${Math.round(numberSize * 0.78)}" font-family="Inter, Arial, sans-serif">${weekNumberLabel(date)}</text>`;
    });
  }

  return out;
}

function renderFooter(cfg, theme, labels, now, stats, width, footerBox) {
  const { x, y, w, h } = footerBox;
  const pad = Math.round(w * 0.04);
  const base = `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${Math.round(w * 0.05)}" fill="${alpha(theme.panel, 0.82)}" stroke="${alpha('#ffffff', 0.06)}"/>`;
  const textSize = Math.round(h * 0.22);
  const subSize = Math.round(h * 0.15);
  if (cfg.footer === 'quote') {
    const lines = wrap(cfg.note || randomQuote(cfg.lang, now.year()), 34);
    return base + lines.map((line, i) => `<text x="${x + w / 2}" y="${y + h * 0.38 + i * subSize * 1.45}" text-anchor="middle" fill="${theme.text}" font-size="${subSize}" font-family="Inter, Arial, sans-serif" font-weight="700">${escapeXml(line)}</text>`).join('');
  }
  if (cfg.footer === 'progress_bar') {
    const barX = x + pad;
    const barY = y + h * 0.55;
    const barW = w - pad * 2;
    const barH = h * 0.12;
    return base + `
      <text x="${x + pad}" y="${y + h * 0.32}" fill="${theme.text}" font-size="${textSize}" font-family="Inter, Arial, sans-serif" font-weight="800">${stats.percentPassed}% ${labels.passed}</text>
      <rect x="${barX}" y="${barY}" width="${barW}" height="${barH}" rx="${barH / 2}" fill="${alpha(theme.bg, 0.7)}" />
      <rect x="${barX}" y="${barY}" width="${barW * stats.percentPassed / 100}" height="${barH}" rx="${barH / 2}" fill="${theme.accent}" />
    `;
  }
  if (cfg.footer === 'today_card') {
    const dateLabel = cfg.lang === 'ru' ? now.format('dddd, D MMMM') : now.format('dddd, MMMM D');
    return base + `
      <text x="${x + pad}" y="${y + h * 0.34}" fill="${theme.accent2}" font-size="${subSize}" font-family="Inter, Arial, sans-serif" font-weight="700">${labels.today}</text>
      <text x="${x + pad}" y="${y + h * 0.68}" fill="${theme.text}" font-size="${textSize}" font-family="Inter, Arial, sans-serif" font-weight="800">${escapeXml(dateLabel)}</text>
    `;
  }
  if (cfg.footer === 'custom_note' && cfg.note) {
    const lines = wrap(cfg.note, 36).slice(0, 2);
    return base + lines.map((line, i) => `<text x="${x + pad}" y="${y + h * 0.38 + i * subSize * 1.6}" fill="${theme.text}" font-size="${subSize}" font-family="Inter, Arial, sans-serif" font-weight="700">${escapeXml(line)}</text>`).join('');
  }
  return base + `
    <text x="${x + pad}" y="${y + h * 0.36}" fill="${theme.text}" font-size="${textSize}" font-family="Inter, Arial, sans-serif" font-weight="800">${stats.daysLeft} ${labels.daysLeft}</text>
    <text x="${x + pad}" y="${y + h * 0.66}" fill="${theme.muted}" font-size="${subSize}" font-family="Inter, Arial, sans-serif">${stats.percentPassed}% ${labels.passed}</text>
  `;
}

function renderSvg(cfg) {
  const theme = THEMES[cfg.theme];
  const labels = getLabels(cfg.lang);
  const now = zonedNow(cfg.timezone);
  const stats = yearStats(now);
  const { width, height } = cfg;
  const padding = Math.round(width * 0.06);
  const topArea = Math.round(height * (cfg.calendarSize === 'compact' ? 0.11 : 0.15));
  const footerArea = Math.round(height * (cfg.calendarSize === 'large' ? 0.1 : 0.12));
  const contentTop = padding + topArea;
  const contentBottom = height - padding - footerArea;
  const contentH = contentBottom - contentTop;

  let cols = 3, rows = 4;
  if (cfg.monthLayout === 'grid_4x3') { cols = 4; rows = 3; }
  if (cfg.monthLayout === 'list_1x12') { cols = 1; rows = 12; }

  const gap = Math.round(width * (cfg.monthLayout === 'list_1x12' ? 0.03 : 0.025));
  const monthW = (width - padding * 2 - gap * (cols - 1)) / cols;
  const monthH = (contentH - gap * (rows - 1)) / rows;

  let monthsSvg = '';
  for (let i = 0; i < 12; i++) {
    const col = i % cols;
    const row = Math.floor(i / cols);
    const x = padding + col * (monthW + gap);
    const y = contentTop + row * (monthH + gap);
    monthsSvg += renderMonth({ monthIndex: i, year: now.year(), x, y, w: monthW, h: monthH, cfg, theme, labels, now });
  }

  let quarterLines = '';
  if (cfg.quarterDividers && cfg.monthLayout !== 'list_1x12') {
    if (cols === 3 && rows === 4) {
      for (let r = 1; r < rows; r++) {
        const ly = contentTop + r * monthH + (r - 0.5) * gap;
        quarterLines += `<line x1="${padding}" y1="${ly}" x2="${width - padding}" y2="${ly}" stroke="${alpha(theme.accent2, 0.12)}" stroke-dasharray="10 12" />`;
      }
    }
  }

  const footerBox = { x: padding, y: height - padding - footerArea + Math.round(footerArea * 0.06), w: width - padding * 2, h: Math.round(footerArea * 0.84) };

  return `<?xml version="1.0" encoding="UTF-8"?>
  <svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
    ${renderBackground(cfg, theme, width, height)}
    ${renderHeader(cfg, theme, labels, now, stats, width, padding, padding)}
    ${quarterLines}
    ${monthsSvg}
    ${renderFooter(cfg, theme, labels, now, stats, width, footerBox)}
  </svg>`;
}

app.use(express.static(path.join(__dirname, 'public')));

app.get('/api/options', (req, res) => {
  res.json({ presets: PHONE_PRESETS, themes: THEMES, bgStyles: BG_STYLES });
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
    res.status(500).json({ error: 'Failed to render wallpaper', details: err.message });
  }
});

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Wallpaper Calendar Pro listening on http://localhost:${PORT}`);
});
