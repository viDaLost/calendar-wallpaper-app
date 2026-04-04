(function(global) {
  const Engine = {};

  Engine.THEMES = {
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
    syndicate: { name: 'Синдикат (Неон)', bg: '#050505', panel: '#121212', text: '#e0e0e0', muted: '#666666', accent: '#fcee0a', accent2: '#00f0ff', weekend: '#ff003c' }
  };

  Engine.BG_STYLES = {
    mesh_organic: 'Органический Mesh (Новое)',
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
    static_noise: 'Шум эфира (Noise)'
  };

  function escapeXml(str) {
    return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;');
  }

  function alpha(hex, opacity) {
    const clean = hex.replace('#', '');
    if (clean.length !== 6) return hex;
    const r = (parseInt(clean, 16) >> 16) & 255;
    const g = (parseInt(clean, 16) >> 8) & 255;
    const b = parseInt(clean, 16) & 255;
    return `rgba(${r},${g},${b},${opacity})`;
  }

  function parseEvents(eventsStr) {
    const map = {};
    if (!eventsStr) return map;
    eventsStr.split(',').forEach(part => {
      const [date, name] = part.split(':');
      if (date && name) map[date.trim()] = name.trim();
    });
    return map;
  }

  function getLabels(lang) {
    return lang === 'ru'
      ? { months: ['Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь', 'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'], monthsShort: ['Янв', 'Фев', 'Мар', 'Апр', 'Май', 'Июн', 'Июл', 'Авг', 'Сен', 'Окт', 'Ноя', 'Дек'], monthsMedium: ['Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь', 'Июль', 'Август', 'Сент.', 'Октябрь', 'Ноябрь', 'Декабрь'], weekdays: ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'], weekdaysFull: ['понедельник', 'вторник', 'среда', 'четверг', 'пятница', 'суббота', 'воскресенье'], today: 'Сегодня', year: 'год', daysLeft: 'дн. осталось', passed: 'пройдено', week: 'Неделя' }
      : { months: ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'], monthsShort: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'], monthsMedium: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sept', 'Oct', 'Nov', 'Dec'], weekdays: ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'], weekdaysFull: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'], today: 'Today', year: 'year', daysLeft: 'days left', passed: 'passed', week: 'Week' };
  }

  function renderBackground(cfg, theme, width, height) {
    const bgType = cfg.bgStyle;
    const proceduralFilters = `
      <filter id="tex_paper" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency="0.008" numOctaves="5" result="noise"/><feColorMatrix type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  1 0 0 0 0" in="noise"/><feComponentTransfer><feFuncA type="linear" slope="0.12"/></feComponentTransfer></filter>
      <filter id="tex_stone" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency="0.02" numOctaves="6" result="noise"/><feColorMatrix type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  1 0 0 0 0" in="noise"/><feComponentTransfer><feFuncA type="linear" slope="0.25"/></feComponentTransfer></filter>
      <filter id="tex_metal" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency="0.001 0.4" numOctaves="3" result="noise"/><feColorMatrix type="matrix" values="0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  1 0 0 0 0" in="noise"/><feComponentTransfer><feFuncA type="linear" slope="0.15"/></feComponentTransfer></filter>
      <filter id="tex_static" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency="0.8" numOctaves="2" result="noise"/><feColorMatrix type="matrix" values="0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  1 0 0 0 0" in="noise"/><feComponentTransfer><feFuncA type="linear" slope="0.06"/></feComponentTransfer></filter>
    `;

    if (bgType === 'mesh_organic') {
      return `
        <defs>
          <radialGradient id="mo1" cx="20%" cy="10%" r="65%"><stop offset="0%" stop-color="${alpha(theme.accent, 0.45)}"/><stop offset="100%" stop-color="${alpha(theme.bg, 0)}"/></radialGradient>
          <radialGradient id="mo2" cx="80%" cy="75%" r="75%"><stop offset="0%" stop-color="${alpha(theme.accent2, 0.4)}"/><stop offset="100%" stop-color="${alpha(theme.bg, 0)}"/></radialGradient>
          <radialGradient id="mo3" cx="65%" cy="25%" r="60%"><stop offset="0%" stop-color="${alpha(theme.panel, 0.95)}"/><stop offset="100%" stop-color="${alpha(theme.bg, 0)}"/></radialGradient>
          <radialGradient id="mo4" cx="15%" cy="85%" r="70%"><stop offset="0%" stop-color="${alpha(theme.accent, 0.25)}"/><stop offset="100%" stop-color="${alpha(theme.bg, 0)}"/></radialGradient>
        </defs>
        <rect width="100%" height="100%" fill="${theme.bg}"/>
        <rect width="100%" height="100%" fill="url(#mo1)"/><rect width="100%" height="100%" fill="url(#mo2)"/><rect width="100%" height="100%" fill="url(#mo3)"/><rect width="100%" height="100%" fill="url(#mo4)"/>
        <rect width="100%" height="100%" fill="${alpha(theme.bg, 0.1)}" opacity="0.5"/>
      `;
    }
    if (bgType === 'paper') {
      return `<defs>${proceduralFilters}<linearGradient id="p_grad" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="${theme.bg}"/><stop offset="100%" stop-color="${alpha(theme.panel, 0.8)}"/></linearGradient><radialGradient id="p_vignette" cx="50%" cy="50%" r="75%"><stop offset="60%" stop-color="#000000" stop-opacity="0"/><stop offset="100%" stop-color="#000000" stop-opacity="0.25"/></radialGradient></defs><rect width="100%" height="100%" fill="url(#p_grad)"/><rect width="100%" height="100%" filter="url(#tex_paper)"/><rect width="100%" height="100%" fill="url(#p_vignette)"/>`;
    }
    if (bgType === 'stone') {
      return `<defs>${proceduralFilters}<radialGradient id="s_vignette" cx="50%" cy="50%" r="80%"><stop offset="40%" stop-color="#000000" stop-opacity="0"/><stop offset="100%" stop-color="#000000" stop-opacity="0.4"/></radialGradient><radialGradient id="s_spot1" cx="20%" cy="10%" r="50%"><stop offset="0%" stop-color="${alpha(theme.panel, 0.6)}"/><stop offset="100%" stop-color="${alpha(theme.panel, 0)}"/></radialGradient><radialGradient id="s_spot2" cx="80%" cy="80%" r="60%"><stop offset="0%" stop-color="${alpha(theme.accent, 0.1)}"/><stop offset="100%" stop-color="${alpha(theme.accent, 0)}"/></radialGradient></defs><rect width="100%" height="100%" fill="${theme.bg}"/><rect width="100%" height="100%" fill="url(#s_spot1)"/><rect width="100%" height="100%" fill="url(#s_spot2)"/><rect width="100%" height="100%" filter="url(#tex_stone)"/><rect width="100%" height="100%" fill="url(#s_vignette)"/>`;
    }
    if (bgType === 'metal') {
      return `<defs>${proceduralFilters}<linearGradient id="m_base" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="${theme.panel}"/><stop offset="30%" stop-color="${theme.bg}"/><stop offset="50%" stop-color="${theme.panel}"/><stop offset="70%" stop-color="${theme.bg}"/><stop offset="100%" stop-color="${theme.panel}"/></linearGradient><linearGradient id="m_shade" x1="0%" y1="0%" x2="100%" y2="0%"><stop offset="0%" stop-color="#000000" stop-opacity="0.3"/><stop offset="20%" stop-color="#000000" stop-opacity="0"/><stop offset="80%" stop-color="#000000" stop-opacity="0"/><stop offset="100%" stop-color="#000000" stop-opacity="0.3"/></linearGradient></defs><rect width="100%" height="100%" fill="url(#m_base)"/><rect width="100%" height="100%" filter="url(#tex_metal)"/><polygon points="0,${height*0.1} ${width},${height*0.55} ${width},${height*0.7} 0,${height*0.25}" fill="${alpha('#ffffff', 0.05)}"/><rect width="100%" height="100%" fill="url(#m_shade)"/>`;
    }
    if (bgType === 'carbon') {
      const cs = Math.max(16, Math.round(width * 0.015));
      return `<defs><pattern id="carbon_mesh" width="${cs}" height="${cs}" patternUnits="userSpaceOnUse"><rect x="0" y="0" width="${cs/2}" height="${cs/2}" fill="${alpha(theme.panel, 0.7)}"/><rect x="${cs/2}" y="${cs/2}" width="${cs/2}" height="${cs/2}" fill="${alpha(theme.panel, 0.4)}"/><rect x="0" y="${cs/2}" width="${cs/2}" height="${cs/2}" fill="${alpha('#000000', 0.3)}"/><rect x="${cs/2}" y="0" width="${cs/2}" height="${cs/2}" fill="${alpha('#000000', 0.5)}"/></pattern><radialGradient id="c_glow" cx="50%" cy="10%" r="80%"><stop offset="0%" stop-color="${alpha(theme.accent, 0.15)}"/><stop offset="100%" stop-color="${alpha(theme.bg, 0)}"/></radialGradient><radialGradient id="c_shade" cx="50%" cy="50%" r="80%"><stop offset="40%" stop-color="#000000" stop-opacity="0"/><stop offset="100%" stop-color="#000000" stop-opacity="0.5"/></radialGradient></defs><rect width="100%" height="100%" fill="${theme.bg}"/><rect width="100%" height="100%" fill="url(#carbon_mesh)"/><rect width="100%" height="100%" fill="url(#c_glow)"/><rect width="100%" height="100%" fill="url(#c_shade)"/>`;
    }
    if (bgType === 'liquid_glass') {
      return `<defs>${proceduralFilters}<radialGradient id="g_blob1" cx="15%" cy="15%" r="60%"><stop offset="0%" stop-color="${alpha(theme.accent, 0.35)}"/><stop offset="100%" stop-color="${alpha(theme.accent, 0)}"/></radialGradient><radialGradient id="g_blob2" cx="85%" cy="85%" r="70%"><stop offset="0%" stop-color="${alpha(theme.accent2, 0.25)}"/><stop offset="100%" stop-color="${alpha(theme.accent2, 0)}"/></radialGradient><linearGradient id="g_sheen" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="${alpha('#ffffff', 0.1)}"/><stop offset="35%" stop-color="${alpha('#ffffff', 0)}"/><stop offset="100%" stop-color="${alpha('#000000', 0.25)}"/></linearGradient></defs><rect width="100%" height="100%" fill="${theme.bg}"/><rect width="100%" height="100%" fill="url(#g_blob1)"/><rect width="100%" height="100%" fill="url(#g_blob2)"/><rect width="100%" height="100%" fill="url(#g_sheen)"/><rect width="100%" height="100%" filter="url(#tex_static)" opacity="0.6"/>`;
    }
    if (bgType === 'topography') {
      return `<defs>${proceduralFilters}</defs><rect width="100%" height="100%" fill="${theme.bg}"/><g stroke="${alpha(theme.accent, 0.18)}" fill="none" stroke-width="1.5"><path d="M -${width*0.2} ${height*0.1} Q ${width*0.4} ${height*0.3}, ${width*1.2} -${height*0.1}"/><path d="M -${width*0.2} ${height*0.14} Q ${width*0.4} ${height*0.34}, ${width*1.2} -${height*0.06}"/><path d="M -${width*0.2} ${height*0.18} Q ${width*0.4} ${height*0.38}, ${width*1.2} -${height*0.02}"/></g><g stroke="${alpha(theme.accent2, 0.12)}" fill="none" stroke-width="1"><path d="M -${width*0.2} ${height*0.8} Q ${width*0.6} ${height*0.6}, ${width*1.2} ${height*1.1}"/><path d="M -${width*0.2} ${height*0.84} Q ${width*0.6} ${height*0.64}, ${width*1.2} ${height*1.14}"/><path d="M -${width*0.2} ${height*0.88} Q ${width*0.6} ${height*0.68}, ${width*1.2} ${height*1.18}"/></g><circle cx="${width*0.85}" cy="${height*0.15}" r="${width*0.25}" fill="none" stroke="${alpha(theme.panel, 0.6)}" stroke-width="15"/><circle cx="${width*0.85}" cy="${height*0.15}" r="${width*0.32}" fill="none" stroke="${alpha(theme.panel, 0.3)}" stroke-width="1"/><rect width="100%" height="100%" filter="url(#tex_static)" opacity="0.4"/>`;
    }
    
    // Default Aurora clean
    return `<defs><radialGradient id="au1" cx="20%" cy="-10%" r="85%"><stop offset="0%" stop-color="${alpha(theme.accent, 0.35)}"/><stop offset="100%" stop-color="${alpha(theme.bg, 0)}"/></radialGradient><radialGradient id="au2" cx="110%" cy="40%" r="75%"><stop offset="0%" stop-color="${alpha(theme.accent2, 0.25)}"/><stop offset="100%" stop-color="${alpha(theme.bg, 0)}"/></radialGradient><radialGradient id="au3" cx="-10%" cy="110%" r="80%"><stop offset="0%" stop-color="${alpha(theme.panel, 0.9)}"/><stop offset="100%" stop-color="${alpha(theme.bg, 0)}"/></radialGradient></defs><rect width="100%" height="100%" fill="${theme.bg}"/><rect width="100%" height="100%" fill="url(#au1)"/><rect width="100%" height="100%" fill="url(#au2)"/><rect width="100%" height="100%" fill="url(#au3)"/>`;
  }

  function renderHeader(cfg, theme, labels, dayjsNow, width, padding, topY, FONT) {
    const titleSize = Math.round(width * 0.065);
    const subtitleSize = Math.round(width * 0.033);
    const chipWidth = Math.round(width * 0.24);
    const chipHeight = Math.round(width * 0.076);
    
    let weatherSvg = '';
    if (cfg.weatherData) {
      const wSize = subtitleSize * 1.5;
      weatherSvg = `<text x="${width - padding}" y="${topY + titleSize}" text-anchor="end" fill="${theme.text}" font-size="${wSize}" font-family="${FONT}" font-weight="700">${cfg.weatherData.temp}°C ${cfg.weatherData.icon}</text>`;
    }

    return `
      <text x="${padding}" y="${topY + titleSize}" fill="${theme.text}" font-size="${titleSize}" font-family="${FONT}" font-weight="900" letter-spacing="-0.03em">${dayjsNow.year()}</text>
      <text x="${padding}" y="${topY + titleSize + subtitleSize * 1.8}" fill="${theme.muted}" font-size="${subtitleSize}" font-family="${FONT}">${labels.today}: ${dayjsNow.date()} ${labels.months[dayjsNow.month()].toLowerCase()}</text>
      <rect x="${padding}" y="${topY + titleSize + subtitleSize * 2.55}" width="${chipWidth}" height="${chipHeight}" rx="${chipHeight / 2}" fill="${alpha(theme.panel, 0.92)}" stroke="${alpha(theme.accent2, 0.22)}"/>
      <text x="${padding + chipWidth / 2}" y="${topY + titleSize + subtitleSize * 2.55 + chipHeight * 0.66}" text-anchor="middle" fill="${theme.accent2}" font-size="${Math.round(width * 0.026)}" font-family="${FONT}" font-weight="700">${labels.week} ${dayjsNow.week()}</text>
      ${weatherSvg}
    `;
  }

  function isRestDay(date, cfg) {
    if (cfg.weekendMode === 'none') return false;
    const isWeekend = date.day() === 0 || date.day() === 6;
    if (cfg.weekendMode === 'production') {
      const holidays = [`01-01`,`01-02`,`01-03`,`01-04`,`01-05`,`01-06`,`01-07`,`01-08`,`02-23`,`03-08`,`05-01`,`05-09`,`06-12`,`11-04`];
      return isWeekend || holidays.includes(date.format('MM-DD'));
    }
    return isWeekend;
  }

  function renderMonthGrid({ dayjsInst, monthIndex, year, x, y, w, h, cfg, theme, labels, now, FONT }) {
    const first = dayjsInst(`${year}-${String(monthIndex + 1).padStart(2, '0')}-01`);
    const daysInMonth = first.daysInMonth();
    const firstWeekday = (first.day() + 6) % 7;
    const isCurrent = now.month() === monthIndex;
    const pad = Math.round(w * 0.055);
    const innerW = w - pad * 2;
    const cellW = innerW / 7;
    
    const topBand = h * 0.285;
    const bottomPad = h * 0.075;
    const cellHReal = Math.max(8, (h - topBand - bottomPad) / 6);
    const numSize = Math.min(Math.round(cellW * 0.52), Math.round(cellHReal * 0.54));
    
    let out = `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${Math.round(w*0.1)}" fill="${isCurrent ? alpha(theme.panel, 0.98) : alpha(theme.panel, 0.65)}" stroke="${isCurrent ? alpha(theme.accent2, 0.36) : alpha('#ffffff', 0.06)}" />`;
    out += `<text x="${x + pad}" y="${y + pad + (h*0.12) * 0.75}" fill="${theme.text}" font-size="${Math.round(w*0.14)}" font-family="${FONT}" font-weight="800">${labels.months[monthIndex]}</text>`;
    
    const gridTop = y + topBand;
    const startX = x + pad;

    for (let day = 1; day <= daysInMonth; day++) {
      const col = (firstWeekday + day - 1) % 7;
      const row = Math.floor((firstWeekday + day - 1) / 7);
      const cx = startX + col * cellW + cellW / 2;
      const cy = gridTop + row * cellHReal + cellHReal * 0.68;
      
      const date = dayjsInst(`${year}-${String(monthIndex + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`);
      const isToday = cfg.accentToday && date.isSame(now, 'day');
      const isPast = date.isBefore(now, 'day') && now.month() === monthIndex;
      const isRest = isRestDay(date, cfg);
      const textColor = isToday ? theme.text : isRest ? theme.weekend : isPast ? alpha(theme.text, 0.6) : theme.text;
      
      const mmdd = `${String(monthIndex + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const eventName = cfg.eventsMap[mmdd];

      if (isToday) {
        out += `<rect x="${cx - cellW*0.45}" y="${cy - cellHReal*0.6}" width="${cellW*0.9}" height="${cellHReal*0.8}" rx="${Math.min(cellW, cellHReal)*0.2}" fill="${alpha(theme.accent, 0.24)}" stroke="${alpha(theme.accent2, 0.34)}"/>`;
      }

      out += `<text x="${cx}" y="${cy}" text-anchor="middle" fill="${textColor}" font-size="${numSize}" font-family="${FONT}" font-weight="${isToday ? 800 : 600}">${day}</text>`;
      
      if (eventName) {
        out += `<circle cx="${cx}" cy="${cy + cellHReal * 0.25}" r="${Math.max(1.5, w*0.015)}" fill="${theme.accent}"/>`;
      }
    }
    return out;
  }

  Engine.renderSvg = function(cfg, dayjsInst, b64FontStr) {
    const theme = cfg.themeObj;
    const labels = getLabels(cfg.lang);
    const now = dayjsInst.utc().add(cfg.timezone, 'hour');
    
    cfg.eventsMap = parseEvents(cfg.events);

    const { width, height } = cfg;
    const padSide = Math.round(width * 0.035);
    const padTop = cfg.lockscreenSafe ? Math.round(height * 0.165 + width * 0.04) : padSide;
    const padBottom = height - (cfg.lockscreenSafe ? Math.round(height * 0.105 + width * 0.03) : padSide);
    
    const FONT_FAMILY = `'${cfg.fontFamily}','DejaVu Sans','Arial',sans-serif`;
    const fontDefs = b64FontStr ? `<style>@font-face { font-family: '${cfg.fontFamily}'; src: url(data:font/truetype;base64,${b64FontStr}) format('truetype'); font-weight: 100 900; } text { font-family: ${FONT_FAMILY}; }</style>` : '';

    const headerHeight = Math.round(height * 0.095);
    const contentTop = padTop + headerHeight + Math.round(height * 0.012);
    const contentH = (padBottom - Math.round(height * 0.08) - Math.round(height * 0.014)) - contentTop;
    
    const gap = Math.round(width * 0.014);
    const monthW = (width - padSide * 2 - gap * 2) / 3;
    const monthH = (contentH - gap * 3) / 4;

    let monthsSvg = '';
    for (let i = 0; i < 12; i++) {
      const col = i % 3, row = Math.floor(i / 3);
      monthsSvg += renderMonthGrid({ dayjsInst, monthIndex: i, year: now.year(), x: padSide + col * (monthW + gap), y: contentTop + row * (monthH + gap), w: monthW, h: monthH, cfg, theme, labels, now, FONT: FONT_FAMILY });
    }

    return `<?xml version="1.0" encoding="UTF-8"?><svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}"><defs>${fontDefs}</defs>${renderBackground(cfg, theme, width, height)}${renderHeader(cfg, theme, labels, now, null, width, padSide, padTop, FONT_FAMILY)}${monthsSvg}</svg>`;
  };

  global.Engine = Engine;
  if (typeof module !== 'undefined' && module.exports) module.exports = Engine;
})(typeof window !== 'undefined' ? window : global);
