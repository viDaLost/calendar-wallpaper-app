const express = require('express');
const path = require('path');
const sharp = require('sharp');
const dayjs = require('dayjs');
const utc = require('dayjs/plugin/utc');
const isLeapYear = require('dayjs/plugin/isLeapYear');

dayjs.extend(utc);
dayjs.extend(isLeapYear);

const app = express();
const PORT = process.env.PORT || 3000;

const PHONE_PRESETS = {
  iphone_15_pro: { label: 'iPhone 15 Pro', width: 1179, height: 2556 },
  iphone_15_pro_max: { label: 'iPhone 15 Pro Max', width: 1290, height: 2796 },
  iphone_15: { label: 'iPhone 15', width: 1179, height: 2556 },
  iphone_14: { label: 'iPhone 14', width: 1170, height: 2532 },
  iphone_se: { label: 'iPhone SE', width: 750, height: 1334 },
  galaxy_s24: { label: 'Galaxy S24', width: 1080, height: 2340 },
  galaxy_s24_ultra: { label: 'Galaxy S24 Ultra', width: 1440, height: 3120 },
  pixel_8: { label: 'Pixel 8', width: 1080, height: 2400 },
  pixel_8_pro: { label: 'Pixel 8 Pro', width: 1344, height: 2992 }
};

const THEMES = {
  graphite_orange: {
    bg: '#0b0d12', panel: '#12161d', text: '#e9edf4', muted: '#8c95a4', accent: '#ff8a26', accent2: '#ffb26c', weekend: '#c95f5f'
  },
  midnight_blue: {
    bg: '#07111f', panel: '#0d1726', text: '#ebf3ff', muted: '#91a7c7', accent: '#5bb9ff', accent2: '#9dd9ff', weekend: '#8bb4ff'
  },
  forest_green: {
    bg: '#07140e', panel: '#102017', text: '#edf8ef', muted: '#95b29d', accent: '#59c57d', accent2: '#a3e0b6', weekend: '#73d49f'
  },
  sand_terracotta: {
    bg: '#1b1612', panel: '#261f19', text: '#f8efe7', muted: '#c3ae9b', accent: '#d37b4d', accent2: '#f0c19f', weekend: '#ea8c63'
  },
  violet_focus: {
    bg: '#100b17', panel: '#181022', text: '#f5efff', muted: '#b6a4cb', accent: '#9b6bff', accent2: '#c4a8ff', weekend: '#bc8cff'
  },
  minimal_red: {
    bg: '#121212', panel: '#1a1a1a', text: '#f7f7f7', muted: '#9c9c9c', accent: '#ff4d5f', accent2: '#ff8e98', weekend: '#ff7e8a'
  },
  oled_gold: {
    bg: '#000000', panel: '#0a0a0a', text: '#fff5dc', muted: '#9f8d65', accent: '#ffc14d', accent2: '#ffe39c', weekend: '#ffcf70'
  },
  frost: {
    bg: '#eef5ff', panel: '#dfe9f8', text: '#1c2b3d', muted: '#6b8097', accent: '#367cff', accent2: '#8ab2ff', weekend: '#5c93ff'
  }
};

const QUOTES = {
  ru: [
    'Главное — не идеальный план, а движение каждый день.',
    'Маленькие шаги собирают большой год.',
    'У времени нет черновика — живи осознанно.',
    'Сегодня тоже часть твоего будущего.'
  ],
  en: [
    'Small consistent steps shape a big year.',
    'Today is part of the life you are building.',
    'Time rewards attention.',
    'Progress is quieter than excuses.'
  ]
};

function parseNumber(value, fallback) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function getConfig(query) {
  const preset = PHONE_PRESETS[query.model] || PHONE_PRESETS.iphone_15_pro;
  const width = query.width ? Math.max(320, parseNumber(query.width, preset.width)) : preset.width;
  const height = query.height ? Math.max(568, parseNumber(query.height, preset.height)) : preset.height;
  return {
    model: query.model || 'iphone_15_pro',
    width,
    height,
    style: query.style || 'numbers',
    calendarSize: query.calendar_size || 'standard',
    weekendMode: query.weekend_mode || 'weekends_only',
    opacity: Math.min(100, Math.max(0, parseNumber(query.opacity, 0))),
    theme: query.theme || 'graphite_orange',
    lang: query.lang === 'en' ? 'en' : 'ru',
    timezone: parseNumber(query.timezone, 3),
    footer: query.footer || 'days_left_percent_left',
    monthLayout: query.month_layout || 'grid_3x4',
    showWeekdays: String(query.show_weekdays || '0') === '1',
    accentToday: String(query.accent_today || '1') !== '0',
    showProgressRing: String(query.show_progress_ring || '0') === '1',
    bgMode: query.bg_mode || 'solid'
  };
}

function getZonedNow(offsetHours) {
  return dayjs.utc().add(offsetHours, 'hour');
}

function getLabels(lang) {
  return lang === 'ru'
    ? {
        months: ['Янв', 'Фев', 'Март', 'Апр', 'Май', 'Июнь', 'Июль', 'Авг', 'Сен', 'Окт', 'Нояб', 'Дек'],
        weekdays: ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'],
        daysLeft: 'дн. осталось',
        daysPassed: 'дн. прошло'
      }
    : {
        months: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
        weekdays: ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'],
        daysLeft: 'days left',
        daysPassed: 'days passed'
      };
}

function getProductionHolidays(year) {
  // simplified fixed RU holidays only; weekends are handled separately
  return new Set([
    `${year}-01-01`, `${year}-01-02`, `${year}-01-03`, `${year}-01-04`, `${year}-01-05`, `${year}-01-06`, `${year}-01-07`, `${year}-01-08`,
    `${year}-02-23`, `${year}-03-08`, `${year}-05-01`, `${year}-05-09`, `${year}-06-12`, `${year}-11-04`
  ]);
}

function isWeekendOrHoliday(date, weekendMode, holidays) {
  const day = date.day();
  if (weekendMode === 'none') return false;
  if (weekendMode === 'weekends_only') return day === 0 || day === 6;
  return day === 0 || day === 6 || holidays.has(date.format('YYYY-MM-DD'));
}

function computeYearStats(now) {
  const start = dayjs.utc(`${now.year()}-01-01T00:00:00Z`).add(now.utcOffset(), 'minute');
  const end = dayjs.utc(`${now.year() + 1}-01-01T00:00:00Z`).add(now.utcOffset(), 'minute');
  const daysInYear = now.isLeapYear() ? 366 : 365;
  const dayOfYear = now.diff(dayjs(`${now.year()}-01-01`), 'day') + 1;
  const daysLeft = daysInYear - dayOfYear;
  const percentPassed = Math.round((dayOfYear / daysInYear) * 100);
  const percentLeft = 100 - percentPassed;
  return { daysInYear, dayOfYear, daysLeft, percentPassed, percentLeft };
}

function wrapSvgText(text, x, y, maxChars, lineHeight, fill, fontSize, anchor = 'middle') {
  const words = text.split(' ');
  const lines = [];
  let line = '';
  for (const word of words) {
    const next = line ? `${line} ${word}` : word;
    if (next.length > maxChars && line) {
      lines.push(line);
      line = word;
    } else {
      line = next;
    }
  }
  if (line) lines.push(line);
  return lines.map((ln, i) => `<text x="${x}" y="${y + i * lineHeight}" text-anchor="${anchor}" fill="${fill}" font-size="${fontSize}" font-family="Inter, Arial, sans-serif">${escapeXml(ln)}</text>`).join('');
}

function escapeXml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function renderMonthNumbers({ monthIndex, year, x, y, w, h, cfg, theme, labels, now, holidays }) {
  const first = dayjs(`${year}-${String(monthIndex + 1).padStart(2, '0')}-01`);
  const daysInMonth = first.daysInMonth();
  const firstWeekday = (first.day() + 6) % 7;
  const titleY = y + h * 0.10;
  const showWeekdays = cfg.showWeekdays;
  const gridTop = y + (showWeekdays ? h * 0.28 : h * 0.2);
  const cols = 7;
  const rows = 6;
  const cellW = w / cols;
  const cellH = (h - (gridTop - y) - h * 0.04) / rows;
  let out = `<text x="${x}" y="${titleY}" fill="${theme.text}" font-size="${Math.round(h * 0.12)}" font-family="Inter, Arial, sans-serif" font-weight="600">${labels.months[monthIndex]}</text>`;
  if (showWeekdays) {
    for (let i = 0; i < labels.weekdays.length; i++) {
      out += `<text x="${x + i * cellW + cellW / 2}" y="${y + h * 0.2}" text-anchor="middle" fill="${theme.muted}" font-size="${Math.round(h * 0.07)}" font-family="Inter, Arial, sans-serif">${labels.weekdays[i]}</text>`;
    }
  }
  for (let day = 1; day <= daysInMonth; day++) {
    const idx = firstWeekday + (day - 1);
    const col = idx % 7;
    const row = Math.floor(idx / 7);
    const date = dayjs(`${year}-${String(monthIndex + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`);
    const isToday = date.isSame(now, 'day');
    const isAccent = isWeekendOrHoliday(date, cfg.weekendMode, holidays);
    const tx = x + col * cellW + cellW / 2;
    const ty = gridTop + row * cellH + cellH * 0.72;
    if (isToday && cfg.accentToday) {
      out += `<circle cx="${tx}" cy="${ty - cellH * 0.32}" r="${Math.min(cellW, cellH) * 0.34}" fill="${theme.accent}" fill-opacity="0.18" stroke="${theme.accent}" stroke-opacity="0.5" />`;
    }
    out += `<text x="${tx}" y="${ty}" text-anchor="middle" fill="${isToday && cfg.accentToday ? theme.accent2 : isAccent ? theme.weekend : theme.muted}" font-size="${Math.round(h * 0.08)}" font-family="Inter, Arial, sans-serif" font-weight="${isToday ? 700 : 500}">${day}</text>`;
  }
  return out;
}

function renderMonthDots({ monthIndex, year, x, y, w, h, cfg, theme, labels, now }) {
  const first = dayjs(`${year}-${String(monthIndex + 1).padStart(2, '0')}-01`);
  const daysInMonth = first.daysInMonth();
  const titleY = y + h * 0.1;
  const cols = 7;
  const rows = Math.ceil(daysInMonth / 7);
  const dotAreaTop = y + h * 0.23;
  const cellW = w / cols;
  const cellH = (h - (dotAreaTop - y) - h * 0.08) / Math.max(rows, 5);
  let out = `<text x="${x}" y="${titleY}" fill="${theme.text}" font-size="${Math.round(h * 0.12)}" font-family="Inter, Arial, sans-serif" font-weight="600">${labels.months[monthIndex]}</text>`;
  for (let day = 1; day <= daysInMonth; day++) {
    const date = dayjs(`${year}-${String(monthIndex + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`);
    const idx = day - 1;
    const col = idx % 7;
    const row = Math.floor(idx / 7);
    const cx = x + col * cellW + cellW / 2;
    const cy = dotAreaTop + row * cellH + cellH / 2;
    const isPast = date.isBefore(now, 'day');
    const isToday = date.isSame(now, 'day');
    const fill = isToday ? theme.accent : isPast ? theme.accent2 : theme.panel;
    out += `<circle cx="${cx}" cy="${cy}" r="${Math.min(cellW, cellH) * 0.22}" fill="${fill}" stroke="${isPast || isToday ? 'none' : theme.muted}" stroke-opacity="0.35" />`;
  }
  return out;
}

function renderMonthBars({ monthIndex, year, x, y, w, h, theme, labels, now }) {
  const first = dayjs(`${year}-${String(monthIndex + 1).padStart(2, '0')}-01`);
  const daysInMonth = first.daysInMonth();
  const titleY = y + h * 0.12;
  const barY = y + h * 0.52;
  const barH = h * 0.15;
  const progress = Math.max(0, Math.min(1, now.month() > monthIndex ? 1 : now.month() < monthIndex ? 0 : now.date() / daysInMonth));
  return [
    `<text x="${x}" y="${titleY}" fill="${theme.text}" font-size="${Math.round(h * 0.12)}" font-family="Inter, Arial, sans-serif" font-weight="600">${labels.months[monthIndex]}</text>`,
    `<rect x="${x}" y="${barY}" rx="${barH / 2}" ry="${barH / 2}" width="${w}" height="${barH}" fill="${theme.panel}" stroke="${theme.muted}" stroke-opacity="0.2" />`,
    `<rect x="${x}" y="${barY}" rx="${barH / 2}" ry="${barH / 2}" width="${w * progress}" height="${barH}" fill="${theme.accent}" />`,
    `<text x="${x}" y="${barY + h * 0.33}" fill="${theme.muted}" font-size="${Math.round(h * 0.08)}" font-family="Inter, Arial, sans-serif">${daysInMonth}d</text>`
  ].join('');
}

function renderMonthRings({ monthIndex, year, x, y, w, h, theme, labels, now }) {
  const first = dayjs(`${year}-${String(monthIndex + 1).padStart(2, '0')}-01`);
  const daysInMonth = first.daysInMonth();
  const progress = Math.max(0, Math.min(1, now.month() > monthIndex ? 1 : now.month() < monthIndex ? 0 : now.date() / daysInMonth));
  const cx = x + w * 0.5;
  const cy = y + h * 0.58;
  const r = Math.min(w, h) * 0.23;
  const c = 2 * Math.PI * r;
  return `
    <text x="${x}" y="${y + h * 0.12}" fill="${theme.text}" font-size="${Math.round(h * 0.12)}" font-family="Inter, Arial, sans-serif" font-weight="600">${labels.months[monthIndex]}</text>
    <circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${theme.panel}" stroke-width="${r * 0.28}" />
    <circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${theme.accent}" stroke-width="${r * 0.28}" stroke-dasharray="${c}" stroke-dashoffset="${c * (1 - progress)}" transform="rotate(-90 ${cx} ${cy})" stroke-linecap="round" />
    <text x="${cx}" y="${cy + 10}" text-anchor="middle" fill="${theme.accent2}" font-size="${Math.round(h * 0.12)}" font-family="Inter, Arial, sans-serif" font-weight="700">${Math.round(progress * 100)}%</text>
  `;
}

function renderMonthHeatmap({ monthIndex, year, x, y, w, h, theme, labels, now }) {
  const first = dayjs(`${year}-${String(monthIndex + 1).padStart(2, '0')}-01`);
  const daysInMonth = first.daysInMonth();
  const cols = 7;
  const rows = 5;
  const top = y + h * 0.22;
  const cellW = w / cols;
  const cellH = (h - h * 0.28) / rows;
  let out = `<text x="${x}" y="${y + h * 0.1}" fill="${theme.text}" font-size="${Math.round(h * 0.12)}" font-family="Inter, Arial, sans-serif" font-weight="600">${labels.months[monthIndex]}</text>`;
  for (let day = 1; day <= daysInMonth; day++) {
    const idx = day - 1;
    const col = idx % 7;
    const row = Math.floor(idx / 7);
    const date = dayjs(`${year}-${String(monthIndex + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`);
    const t = date.isBefore(now, 'day') ? 0.85 : date.isSame(now, 'day') ? 1 : 0.15;
    const alpha = t;
    out += `<rect x="${x + col * cellW + 3}" y="${top + row * cellH + 3}" width="${Math.max(8, cellW - 6)}" height="${Math.max(8, cellH - 6)}" rx="${Math.min(cellW, cellH) * 0.18}" fill="${theme.accent}" fill-opacity="${alpha}" />`;
  }
  return out;
}

function renderMonthFocus({ monthIndex, year, x, y, w, h, cfg, theme, labels, now, holidays }) {
  if (monthIndex !== now.month()) {
    return `<text x="${x}" y="${y + h * 0.1}" fill="${theme.text}" font-size="${Math.round(h * 0.12)}" font-family="Inter, Arial, sans-serif" font-weight="600">${labels.months[monthIndex]}</text>
    <rect x="${x}" y="${y + h * 0.24}" width="${w}" height="${h * 0.18}" rx="12" fill="${theme.panel}" />`;
  }
  return renderMonthNumbers({ monthIndex, year, x, y, w, h, cfg, theme, labels, now, holidays });
}

function renderProgressRing(width, height, theme, stats) {
  const cx = width * 0.5;
  const cy = height * 0.16;
  const r = Math.min(width, height) * 0.08;
  const c = 2 * Math.PI * r;
  const progress = stats.percentPassed / 100;
  return `
    <circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${theme.panel}" stroke-width="${r * 0.22}" />
    <circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${theme.accent}" stroke-width="${r * 0.22}" stroke-dasharray="${c}" stroke-dashoffset="${c * (1 - progress)}" transform="rotate(-90 ${cx} ${cy})" stroke-linecap="round" />
    <text x="${cx}" y="${cy + 12}" text-anchor="middle" fill="${theme.text}" font-size="${Math.round(r * 0.52)}" font-family="Inter, Arial, sans-serif" font-weight="700">${stats.percentPassed}%</text>
  `;
}

function renderFooter(cfg, labels, theme, width, height, stats) {
  const y = height * 0.88;
  const x = width * 0.5;
  switch (cfg.footer) {
    case 'days_left':
      return `<text x="${x}" y="${y}" text-anchor="middle" fill="${theme.accent}" font-size="${Math.round(height * 0.028)}" font-family="Inter, Arial, sans-serif" font-weight="700">${stats.daysLeft} ${labels.daysLeft}</text>`;
    case 'days_passed':
      return `<text x="${x}" y="${y}" text-anchor="middle" fill="${theme.accent}" font-size="${Math.round(height * 0.028)}" font-family="Inter, Arial, sans-serif" font-weight="700">${stats.dayOfYear} ${labels.daysPassed}</text>`;
    case 'quote': {
      const list = QUOTES[cfg.lang] || QUOTES.ru;
      const quote = list[stats.dayOfYear % list.length];
      return wrapSvgText(quote, x, y - 12, 34, Math.round(height * 0.024), theme.accent, Math.round(height * 0.02));
    }
    case 'progress_bar': {
      const w = width * 0.46;
      const h = height * 0.014;
      const progress = stats.percentPassed / 100;
      return `
        <rect x="${x - w / 2}" y="${y - 10}" width="${w}" height="${h}" rx="${h / 2}" fill="${theme.panel}" />
        <rect x="${x - w / 2}" y="${y - 10}" width="${w * progress}" height="${h}" rx="${h / 2}" fill="${theme.accent}" />
        <text x="${x}" y="${y + 28}" text-anchor="middle" fill="${theme.muted}" font-size="${Math.round(height * 0.018)}" font-family="Inter, Arial, sans-serif">${stats.percentPassed}%</text>
      `;
    }
    case 'days_left_percent_passed':
      return `
        <text x="${x - 16}" y="${y}" text-anchor="end" fill="${theme.accent}" font-size="${Math.round(height * 0.028)}" font-family="Inter, Arial, sans-serif" font-weight="700">${stats.daysLeft} ${labels.daysLeft}</text>
        <text x="${x + 16}" y="${y}" text-anchor="start" fill="${theme.muted}" font-size="${Math.round(height * 0.026)}" font-family="Inter, Arial, sans-serif">${stats.percentPassed}%</text>
      `;
    default:
      return `
        <text x="${x - 16}" y="${y}" text-anchor="end" fill="${theme.accent}" font-size="${Math.round(height * 0.028)}" font-family="Inter, Arial, sans-serif" font-weight="700">${stats.daysLeft} ${labels.daysLeft}</text>
        <text x="${x + 16}" y="${y}" text-anchor="start" fill="${theme.muted}" font-size="${Math.round(height * 0.026)}" font-family="Inter, Arial, sans-serif">${stats.percentLeft}%</text>
      `;
  }
}

function createLayout(cfg, width, height) {
  let top = height * 0.14;
  let bottom = height * 0.18;
  if (cfg.calendarSize === 'large') {
    top = height * 0.11;
    bottom = height * 0.14;
  } else if (cfg.calendarSize === 'large_no_top') {
    top = height * 0.06;
    bottom = height * 0.14;
  } else if (cfg.calendarSize === 'large_no_bottom') {
    top = height * 0.11;
    bottom = height * 0.08;
  }
  return { top, bottom };
}

function renderSvg(cfg) {
  const theme = THEMES[cfg.theme] || THEMES.graphite_orange;
  const labels = getLabels(cfg.lang);
  const now = getZonedNow(cfg.timezone);
  const year = now.year();
  const stats = computeYearStats(now);
  const holidays = getProductionHolidays(year);
  const { width, height } = cfg;
  const layout = createLayout(cfg, width, height);
  const cols = cfg.monthLayout === 'list_1x12' ? 1 : cfg.monthLayout === 'grid_4x3' ? 4 : 3;
  const rows = cfg.monthLayout === 'list_1x12' ? 12 : cfg.monthLayout === 'grid_4x3' ? 3 : 4;
  const calendarW = width * 0.82;
  const gapX = width * 0.05;
  const gapY = height * 0.025;
  const innerW = calendarW - gapX * (cols - 1);
  const cardW = innerW / cols;
  const usableH = height - layout.top - layout.bottom - gapY * (rows - 1);
  const cardH = usableH / rows;
  const startX = (width - calendarW) / 2;
  const startY = layout.top;

  const styleRenderer = {
    numbers: renderMonthNumbers,
    dots: renderMonthDots,
    bars: renderMonthBars,
    rings: renderMonthRings,
    heatmap: renderMonthHeatmap,
    focus: renderMonthFocus
  }[cfg.style] || renderMonthNumbers;

  let months = '';
  for (let i = 0; i < 12; i++) {
    const col = i % cols;
    const row = Math.floor(i / cols);
    const x = startX + col * (cardW + gapX);
    const y = startY + row * (cardH + gapY);
    months += styleRenderer({ monthIndex: i, year, x, y, w: cardW, h: cardH, cfg, theme, labels, now, holidays });
  }

  const bgOpacity = Math.max(0, Math.min(1, cfg.opacity / 100));
  const defs = `
    <linearGradient id="bgGrad" x1="0" x2="0" y1="0" y2="1">
      <stop offset="0%" stop-color="${theme.bg}" />
      <stop offset="100%" stop-color="${theme.panel}" />
    </linearGradient>
    <radialGradient id="glow" cx="50%" cy="0%" r="85%">
      <stop offset="0%" stop-color="${theme.accent}" stop-opacity="0.20" />
      <stop offset="100%" stop-color="${theme.accent}" stop-opacity="0" />
    </radialGradient>
  `;

  return `
  <svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
    <defs>${defs}</defs>
    <rect width="100%" height="100%" fill="url(#bgGrad)" />
    <rect width="100%" height="100%" fill="${theme.bg}" fill-opacity="${bgOpacity}" />
    <rect width="100%" height="${height * 0.4}" fill="url(#glow)" />
    ${cfg.showProgressRing ? renderProgressRing(width, height, theme, stats) : ''}
    ${months}
    ${renderFooter(cfg, labels, theme, width, height, stats)}
  </svg>`;
}

app.use(express.static(path.join(__dirname, 'public')));

app.get('/api/config', (req, res) => {
  res.json({ presets: PHONE_PRESETS, themes: Object.keys(THEMES) });
});

app.get('/wallpaper.svg', (req, res) => {
  const cfg = getConfig(req.query);
  const svg = renderSvg(cfg);
  res.setHeader('Content-Type', 'image/svg+xml; charset=utf-8');
  res.send(svg);
});

app.get('/wallpaper.png', async (req, res) => {
  try {
    const cfg = getConfig(req.query);
    const svg = renderSvg(cfg);
    const png = await sharp(Buffer.from(svg)).png().toBuffer();
    res.setHeader('Content-Type', 'image/png');
    res.send(png);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to generate PNG' });
  }
});

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Wallpaper Calendar Pro listening on http://localhost:${PORT}`);
});
