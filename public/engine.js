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

  function escapeXml(str) { return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;'); }
  function alpha(hex, opacity) {
    const clean = hex.replace('#', '');
    if (clean.length !== 6) return hex;
    return `rgba(${(parseInt(clean, 16) >> 16) & 255},${(parseInt(clean, 16) >> 8) & 255},${parseInt(clean, 16) & 255},${opacity})`;
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
        if (dateParts.length === 2) {
           date = `${dateParts[0].padStart(2, '0')}-${dateParts[1].padStart(2, '0')}`;
        }
        if (date && name) map[date] = name;
      }
    });
    return map;
  }

  function getLabels(lang) {
    return lang === 'ru'
      ? { months: ['Январь','Февраль','Март','Апрель','Май','Июнь','Июль','Август','Сентябрь','Октябрь','Ноябрь','Декабрь'], monthsShort: ['Янв','Фев','Мар','Апр','Май','Июн','Июл','Авг','Сен','Окт','Ноя','Дек'], monthsMedium: ['Январь','Февраль','Март','Апрель','Май','Июнь','Июль','Август','Сент.','Октябрь','Ноябрь','Декабрь'], weekdays: ['Пн','Вт','Ср','Чт','Пт','Сб','Вс'], weekdaysFull: ['понедельник','вторник','среда','четверг','пятница','суббота','воскресенье'], today: 'Сегодня', year: 'год', daysLeft: 'дн. осталось', passed: 'пройдено', week: 'Неделя' }
      : { months: ['January','February','March','April','May','June','July','August','September','October','November','December'], monthsShort: ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'], monthsMedium: ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sept','Oct','Nov','Dec'], weekdays: ['Mo','Tu','We','Th','Fr','Sa','Su'], weekdaysFull: ['monday','tuesday','wednesday','thursday','friday','saturday','sunday'], today: 'Today', year: 'year', daysLeft: 'days left', passed: 'passed', week: 'Week' };
  }
  
  function wrap(text, maxLen) {
    const words = String(text).split(/\s+/);
    const lines = []; let line = '';
    for (const word of words) {
      if ((line + ' ' + word).trim().length <= maxLen) line = (line + ' ' + word).trim();
      else { if (line) lines.push(line); line = word; }
    }
    if (line) lines.push(line);
    return lines;
  }

  function yearStats(dayjsInst, now) {
    const daysInYear = now.isLeapYear() ? 366 : 365;
    const dayOfYear = now.diff(dayjsInst(`${now.year()}-01-01`), 'day') + 1;
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
      if (!best || diff < best.diff) {
        best = { title, diff, date: candidate, label: `${d} ${labels.months[m - 1].toLowerCase?.() || labels.months[m - 1]}` };
      }
    }
    return best;
  }

  function getSeasonLabel(lang, monthIndex) {
    if (lang === 'ru') {
      if ([11,0,1].includes(monthIndex)) return 'Зима';
      if ([2,3,4].includes(monthIndex)) return 'Весна';
      if ([5,6,7].includes(monthIndex)) return 'Лето';
      return 'Осень';
    }
    if ([11,0,1].includes(monthIndex)) return 'Winter';
    if ([2,3,4].includes(monthIndex)) return 'Spring';
    if ([5,6,7].includes(monthIndex)) return 'Summer';
    return 'Autumn';
  }

  function weatherSummary(cfg, lang) {
    if (!cfg.weatherData) return lang === 'ru' ? 'Погода не выбрана' : 'No city weather';
    const city = String(cfg.weatherData.cityLabel || '').trim();
    const hiLo = cfg.weatherData.dailyMax && cfg.weatherData.dailyMin ? ` · ${cfg.weatherData.dailyMax} / ${cfg.weatherData.dailyMin}` : '';
    return `${cfg.weatherData.icon} ${cfg.weatherData.temp}°C${hiLo}${city ? ` · ${city}` : ''}`.trim();
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
      return `<defs><radialGradient id="mo1" cx="20%" cy="10%" r="65%"><stop offset="0%" stop-color="${alpha(theme.accent, 0.45)}"/><stop offset="100%" stop-color="${alpha(theme.bg, 0)}"/></radialGradient><radialGradient id="mo2" cx="80%" cy="75%" r="75%"><stop offset="0%" stop-color="${alpha(theme.accent2, 0.4)}"/><stop offset="100%" stop-color="${alpha(theme.bg, 0)}"/></radialGradient><radialGradient id="mo3" cx="65%" cy="25%" r="60%"><stop offset="0%" stop-color="${alpha(theme.panel, 0.95)}"/><stop offset="100%" stop-color="${alpha(theme.bg, 0)}"/></radialGradient><radialGradient id="mo4" cx="15%" cy="85%" r="70%"><stop offset="0%" stop-color="${alpha(theme.accent, 0.25)}"/><stop offset="100%" stop-color="${alpha(theme.bg, 0)}"/></radialGradient></defs><rect width="100%" height="100%" fill="${theme.bg}"/><rect width="100%" height="100%" fill="url(#mo1)"/><rect width="100%" height="100%" fill="url(#mo2)"/><rect width="100%" height="100%" fill="url(#mo3)"/><rect width="100%" height="100%" fill="url(#mo4)"/><rect width="100%" height="100%" fill="${alpha(theme.bg, 0.1)}" opacity="0.5"/>`;
    }
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
    if (bgType === 'static_noise') return `<defs>${proceduralFilters}<radialGradient id="sn_vignette" cx="50%" cy="50%" r="85%"><stop offset="0%" stop-color="${theme.bg}"/><stop offset="100%" stop-color="${alpha(theme.panel, 0.95)}"/></radialGradient></defs><rect width="100%" height="100%" fill="url(#sn_vignette)"/><rect width="100%" height="100%" filter="url(#tex_static)" opacity="1.2"/>`;

    return `<defs><radialGradient id="au1" cx="20%" cy="-10%" r="85%"><stop offset="0%" stop-color="${alpha(theme.accent, 0.35)}"/><stop offset="100%" stop-color="${alpha(theme.bg, 0)}"/></radialGradient><radialGradient id="au2" cx="110%" cy="40%" r="75%"><stop offset="0%" stop-color="${alpha(theme.accent2, 0.25)}"/><stop offset="100%" stop-color="${alpha(theme.bg, 0)}"/></radialGradient><radialGradient id="au3" cx="-10%" cy="110%" r="80%"><stop offset="0%" stop-color="${alpha(theme.panel, 0.9)}"/><stop offset="100%" stop-color="${alpha(theme.bg, 0)}"/></radialGradient></defs><rect width="100%" height="100%" fill="${theme.bg}"/><rect width="100%" height="100%" fill="url(#au1)"/><rect width="100%" height="100%" fill="url(#au2)"/><rect width="100%" height="100%" fill="url(#au3)"/>`;
  }

  function isListLayout(layout) { return ['list_1x12','list_1x12_compact'].includes(layout); }
  function isCompactGridLayout(layout) { return ['grid_3x4_compact','grid_2x6','grid_6x2','single_month_focus'].includes(layout); }

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
      return { ...spec, monthW: (width - sidePadding * 2 - spec.gap * (spec.cols - 1)) / spec.cols, monthH: (contentH - spec.gap * (spec.rows - 1)) / spec.rows, skinnyCols: 6 };
    }
    return { ...spec, monthW: (width - sidePadding * 2 - spec.gap * (spec.cols - 1)) / spec.cols, monthH: (contentH - spec.gap * (spec.rows - 1)) / spec.rows };
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
    const tiny = sixWide || w < 180;
    const compactGrid = cfg.monthLayout === 'grid_3x4_compact';
    return {
      tiny, skinny: sixWide && w < 190, sixWide, compactGrid,
      showWeekdays: cfg.showWeekdays && (!tiny || cfg.monthLayout === 'single_month_focus'),
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
    const dateText = cfg.lang === 'ru' ? `${labels.today}: ${now.date()} ${labels.months[now.month()].toLowerCase()}` : `${labels.today}: ${labels.months[now.month()]} ${now.date()}`;
    const leftTextY = yearY - yearSize * 0.45;
    const badgeY = yearY - yearSize * 0.15;

    const yearSvg = `<text x="${width / 2}" y="${yearY}" text-anchor="middle" fill="${theme.text}" font-size="${yearSize}" font-family="${FONT}">${now.year()}</text>`;
    const todaySvg = cfg.showHeaderMeta === false ? '' : `<text x="${padding}" y="${leftTextY}" fill="${theme.muted}" font-size="${subtitleSize}" font-family="${FONT}">${escapeXml(dateText)}</text>`;
    const badgeSvg = cfg.showHeaderMeta === false ? '' : `
      <rect x="${padding}" y="${badgeY}" width="${chipWidth}" height="${chipHeight}" rx="${chipHeight / 2}" fill="${alpha(theme.panel, 0.92)}" stroke="${alpha(theme.accent2, 0.22)}"/>
      <text x="${padding + chipWidth / 2}" y="${badgeY + chipHeight * 0.66}" text-anchor="middle" fill="${theme.accent2}" font-size="${Math.round(width * 0.024)}" font-family="${FONT}">${labels.week} ${now.week()}</text>`;

    let rightSvg = '';
    if (cfg.weatherData) {
      const weatherX = width - padding;
      const weatherY = yearY - yearSize * 0.42;
      const cityLineY = weatherY + subtitleSize * 1.15;
      const rawCity = String(cfg.weatherData.cityLabel || '').split(',')[0].trim();
      const cityLabel = rawCity.length > 18 ? `${rawCity.slice(0, 17)}…` : rawCity;
      rightSvg += `<text x="${weatherX}" y="${weatherY}" text-anchor="end" fill="${theme.text}" font-size="${subtitleSize * 1.42}" font-family="${FONT}">${cfg.weatherData.temp}°C ${cfg.weatherData.icon}</text>`;
      if (cityLabel) rightSvg += `<text x="${weatherX}" y="${cityLineY}" text-anchor="end" fill="${theme.muted}" font-size="${Math.round(subtitleSize * 0.9)}" font-family="${FONT}">${escapeXml(cityLabel)}</text>`;
    } else if (cfg.showProgressRing && stats) {
      const ringCx = width - padding - ringR;
      const ringCy = yearY - yearSize * 0.25;
      const dash = (Math.PI * 2 * ringR) * (stats.percentPassed / 100);
      rightSvg += `
        <circle cx="${ringCx}" cy="${ringCy}" r="${ringR}" fill="none" stroke="${alpha(theme.panel, 0.92)}" stroke-width="${ringR * 0.28}" />
        <circle cx="${ringCx}" cy="${ringCy}" r="${ringR}" fill="none" stroke="${theme.accent}" stroke-width="${ringR * 0.28}" stroke-linecap="round" stroke-dasharray="${dash} ${Math.PI * 2 * ringR}" transform="rotate(-90 ${ringCx} ${ringCy})" />
        <text x="${ringCx}" y="${ringCy + width * 0.008}" text-anchor="middle" fill="${theme.text}" font-size="${Math.round(width * 0.02)}" font-family="${FONT}">${stats.percentPassed}%</text>`;
    }
    return yearSvg + todaySvg + badgeSvg + rightSvg;
  }

  function isRestDayFactory(cfg, year, dayjsInst) {
    const holidays = [`01-01`,`01-02`,`01-03`,`01-04`,`01-05`,`01-06`,`01-07`,`01-08`,`02-23`,`03-08`,`05-01`,`05-09`,`06-12`,`11-04`];
    return (date) => {
      if (cfg.weekendMode === 'none') return false;
      const isWeekend = date.day() === 0 || date.day() === 6;
      if (cfg.weekendMode === 'production') return isWeekend || holidays.includes(date.format('MM-DD'));
      return isWeekend;
    };
  }

  function renderMonthGrid({ dayjsInst, monthIndex, year, x, y, w, h, cfg, theme, labels, now, FONT }) {
    const first = dayjsInst(`${year}-${String(monthIndex + 1).padStart(2, '0')}-01`);
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
    const cellW = (w - pad * 2) / (cols + weekNumberCol);
    const titleLabel = pickMonthLabel(labels, monthIndex, w, focusHero ? 'focus' : (opts.skinny ? 'skinny' : 'grid'));
    const titleSize = Math.min(Math.round(h * (focusHero ? 0.11 : opts.sixWide ? 0.09 : dense ? 0.10 : 0.12)), Math.round(w * (focusHero ? 0.13 : opts.sixWide ? 0.11 : dense ? 0.14 : 0.16))) * emphasis;
    const titleY = focusHero ? (y + pad + titleSize * 0.80) : (y + pad + titleSize * 0.75);
    const weekdaySize = Math.min(Math.round(cellW * (focusHero ? 0.34 : opts.sixWide ? 0.30 : dense ? 0.4 : 0.5)), Math.round(h * (focusHero ? 0.044 : opts.sixWide ? 0.032 : dense ? 0.048 : 0.058)));
    const topBand = opts.showWeekdays ? h * (focusHero ? 0.40 : opts.sixWide ? 0.20 : dense ? 0.245 : 0.285) : h * (focusHero ? 0.18 : opts.sixWide ? 0.14 : dense ? 0.17 : 0.20);
    const cellHReal = Math.max(8, (h - topBand - h * (focusHero ? 0.06 : opts.sixWide ? 0.06 : dense ? 0.06 : 0.075)) / 6);
    const numSize = Math.min(Math.round(cellW * (focusHero ? 0.5 : opts.sixWide ? 0.34 : dense ? 0.52 : 0.6)), Math.round(cellHReal * (focusHero ? 0.56 : opts.sixWide ? 0.42 : dense ? 0.54 : 0.6))) * emphasis;
    const badgeW = Math.round(w * (opts.sixWide ? 0.14 : focusHero ? 0.12 : 0.19));
    const badgeH = Math.round(h * (opts.sixWide ? 0.10 : focusHero ? 0.10 : 0.11));
    const cardFill = isCurrent ? alpha(theme.panel, focusHero ? 0.98 : 0.98) : alpha(theme.panel, opts.sixWide ? 0.78 : 0.65);
    const cardStroke = isCurrent ? alpha(theme.accent2, cfg.glassPanels === false ? 0.26 : 0.42) : alpha('#ffffff', cfg.glassPanels === false ? 0.05 : 0.09);
    
    let out = `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${radius}" fill="${cardFill}" stroke="${cardStroke}" />`;
    if (cfg.glassPanels !== false) out += `<rect x="${x + 1.5}" y="${y + 1.5}" width="${Math.max(0, w - 3)}" height="${Math.max(0, h - 3)}" rx="${Math.max(0, radius - 1.5)}" fill="none" stroke="${alpha(theme.accent2, isCurrent ? 0.10 : 0.04)}" />`;
    if (focusHero) { out += `<text x="${x + pad}" y="${titleY}" fill="${theme.text}" font-size="${titleSize}" font-family="${FONT}">${titleLabel}</text>`; } 
    else { out += `<text x="${x + pad}" y="${y + pad + titleSize * 0.75}" fill="${theme.text}" font-size="${titleSize}" font-family="${FONT}">${titleLabel}</text>`; }
    
    if (opts.showBadge || focusHero) {
      out += `<rect x="${x + w - pad - badgeW}" y="${y + pad * (focusHero ? 0.9 : 0.55)}" width="${badgeW}" height="${badgeH}" rx="${badgeH / 2}" fill="${isCurrent ? alpha(theme.accent, 0.18) : alpha('#ffffff', 0.05)}" />`;
      out += `<text x="${x + w - pad - badgeW / 2}" y="${y + pad * (focusHero ? 0.9 : 0.55) + badgeH * 0.65}" text-anchor="middle" fill="${isCurrent ? theme.accent2 : theme.muted}" font-size="${Math.round(badgeH * (focusHero ? 0.50 : 0.56))}" font-family="${FONT}">${daysInMonth}${cfg.lang === 'ru' ? 'д' : 'd'}</text>`;
    }
    const weekdayY = focusHero ? (y + pad + titleSize + h * 0.065) : (y + (opts.sixWide ? h * 0.18 : h * 0.23));
    const gridTop = y + topBand;
    const startX = x + pad + (weekNumberCol ? cellW : 0);
    if (cfg.strongWeekendTint) {
      [5, 6].forEach((weekendCol, idx) => {
        const tintX = startX + weekendCol * cellW + cellW * 0.08;
        out += `<rect x="${tintX}" y="${gridTop - cellHReal * 0.16}" width="${cellW * 0.84}" height="${cellHReal * 5.2}" rx="${cellW * 0.22}" fill="${alpha(theme.weekend, idx === 0 ? 0.07 : 0.10)}" />`;
      });
    }
    if (opts.showWeekdays) {
      if (weekNumberCol) out += `<text x="${x + pad + cellW / 2}" y="${weekdayY}" text-anchor="middle" fill="${theme.muted}" font-size="${weekdaySize}" font-family="${FONT}">#</text>`;
      labels.weekdays.forEach((wd, i) => out += `<text x="${startX + i * cellW + cellW / 2}" y="${weekdayY}" text-anchor="middle" fill="${i >= 5 ? alpha(theme.weekend, 0.95) : theme.muted}" font-size="${weekdaySize}" font-family="${FONT}">${wd}</text>`);
    }
    const isRestDay = isRestDayFactory(cfg, year, dayjsInst);
    const usedWeekRows = new Set();
    
    for (let day = 1; day <= daysInMonth; day++) {
      const index = firstWeekday + day - 1;
      const col = index % 7, row = Math.floor(index / 7);
      usedWeekRows.add(row);
      const date = dayjsInst(`${year}-${String(monthIndex + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`);
      const cx = startX + col * cellW + cellW / 2;
      const cy = gridTop + row * cellHReal + cellHReal * 0.68;
      const isToday = cfg.accentToday && date.isSame(now, 'day');
      const isWeekend = isRestDay(date);
      const isPast = date.isBefore(now, 'day') && now.month() === monthIndex;
      
      const mmdd = `${String(monthIndex + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const isCustomEvent = cfg.eventsMap && cfg.eventsMap[mmdd];

      let textColor = isToday ? theme.text : isWeekend ? theme.weekend : isPast ? alpha(theme.text, 0.6) : theme.text;
      const eventColor = cfg.eventColor || theme.accent;
      if (isCustomEvent && !isToday) textColor = eventColor;

      if (isCustomEvent) {
        out += `<rect x="${cx - cellW * 0.35}" y="${cy - cellHReal * 0.6}" width="${cellW * 0.7}" height="${cellHReal * 0.75}" rx="${Math.min(cellW, cellHReal) * 0.2}" fill="${alpha(eventColor, 0.18)}" stroke="${alpha(eventColor, 0.34)}"/>`;
      }

      if (isToday) {
        const rect = `<rect x="${cx - cellW * 0.45}" y="${cy - cellHReal * 0.6}" width="${cellW * 0.9}" height="${cellHReal * 0.8}" rx="${Math.min(cellW, cellHReal) * 0.2}"`;
        out += cfg.style === 'outline' ? `${rect} fill="none" stroke="${theme.accent}" stroke-width="${Math.max(1.2, w * 0.004)}"/>` : `${rect} fill="${alpha(theme.accent, cfg.style === 'numbers' ? 0.24 : 0.18)}" stroke="${alpha(theme.accent2, 0.34)}"/>`;
      }

      if (cfg.style === 'dots') {
        out += `<circle cx="${cx}" cy="${cy - cellHReal * 0.2}" r="${Math.min(cellW, cellHReal) * (isToday ? 0.18 : 0.12)}" fill="${isToday ? theme.accent : isPast ? theme.accent2 : isWeekend ? alpha(theme.weekend, 0.9) : alpha(theme.text, 0.26)}"/>`;
        out += `<text x="${cx}" y="${cy + cellHReal * 0.3}" text-anchor="middle" fill="${textColor}" font-size="${Math.round(numSize * 0.82)}" font-family="${FONT}">${day}</text>`;
      } else if (cfg.style === 'focus') {
        out += `<text x="${cx}" y="${cy}" text-anchor="middle" fill="${textColor}" font-size="${Math.round(numSize * (isToday ? 1.05 : 1))}" font-family="${FONT}">${day}</text>`;
        if (isCurrent && !isToday && !opts.tiny) out += `<line x1="${cx - cellW * 0.15}" y1="${cy + cellHReal * 0.15}" x2="${cx + cellW * 0.15}" y2="${cy + cellHReal * 0.15}" stroke="${alpha(theme.accent2, 0.35)}" stroke-linecap="round" stroke-width="2"/>`;
      } else if (cfg.style === 'capsule') {
        if (isToday || isWeekend) out += `<rect x="${cx - cellW * 0.38}" y="${cy - cellHReal * 0.48}" width="${cellW * 0.76}" height="${cellHReal * 0.56}" rx="${cellHReal * 0.28}" fill="${isToday ? alpha(theme.accent, 0.25) : alpha(theme.weekend, 0.12)}"/>`;
        out += `<text x="${cx}" y="${cy}" text-anchor="middle" fill="${textColor}" font-size="${numSize}" font-family="${FONT}">${day}</text>`;
      } else if (cfg.style === 'ring') {
        if (isToday) out += `<circle cx="${cx}" cy="${cy - cellHReal * 0.2}" r="${Math.min(cellW, cellHReal) * 0.28}" fill="none" stroke="${theme.accent}" stroke-width="${Math.max(1.2, w * 0.004)}"/>`;
        out += `<text x="${cx}" y="${cy}" text-anchor="middle" fill="${textColor}" font-size="${numSize}" font-family="${FONT}">${day}</text>`;
      } else if (cfg.style === 'micro') {
        out += `<circle cx="${cx}" cy="${cy - cellHReal * 0.18}" r="${Math.max(1.1, Math.min(cellW, cellHReal) * 0.08)}" fill="${isToday ? theme.accent : isWeekend ? theme.weekend : alpha(theme.text, 0.24)}"/>`;
        out += `<text x="${cx}" y="${cy + cellHReal * 0.24}" text-anchor="middle" fill="${textColor}" font-size="${Math.round(numSize * 0.72)}" font-family="${FONT}">${day}</text>`;
      } else {
        out += `<text x="${cx}" y="${cy}" text-anchor="middle" fill="${textColor}" font-size="${numSize}" font-family="${FONT}">${day}</text>`;
      }

    }
    if (weekNumberCol) {
      [...usedWeekRows].forEach((row) => {
        const date = first.add(row * 7 - firstWeekday, 'day');
        out += `<text x="${x + pad + cellW / 2}" y="${gridTop + row * cellHReal + cellHReal * 0.68}" text-anchor="middle" fill="${alpha(theme.muted, 0.7)}" font-size="${Math.round(numSize * 0.68)}" font-family="${FONT}">${date.week()}</text>`;
      });
    }
    return out;
  }

  function renderMonthListRow({ dayjsInst, monthIndex, year, x, y, w, h, cfg, theme, labels, now, FONT }) {
    const first = dayjsInst(`${year}-${String(monthIndex + 1).padStart(2, '0')}-01`);
    const daysInMonth = first.daysInMonth();
    const firstWeekday = (first.day() + 6) % 7;
    const isCurrent = now.month() === monthIndex;
    const isRestDay = isRestDayFactory(cfg, year, dayjsInst);
    const compact = cfg.monthLayout === 'list_1x12_compact';
    const radius = Math.max(14, Math.round(h * (compact ? 0.24 : 0.28)));
    const padX = Math.round(w * (compact ? 0.024 : 0.03));
    const nameW = Math.round(w * (compact ? 0.16 : 0.18));
    const badgeW = cfg.monthBadges ? Math.round(w * 0.08) : 0;
    const innerX = x + padX + nameW;
    const innerW = Math.max(80, w - padX * 2 - nameW - badgeW);
    const topPad = cfg.showWeekdays ? h * (compact ? 0.22 : 0.24) : h * (compact ? 0.14 : 0.16);
    const cellW = innerW / 7;
    const cellH = Math.max(8, (h - topPad - h * (compact ? 0.08 : 0.10)) / 6);
    const numberSize = Math.max(8, Math.round(Math.min(cellW, cellH) * (compact ? 0.40 : 0.44)));
    
    let out = `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${radius}" fill="${isCurrent ? alpha(theme.panel, 0.95) : alpha(theme.panel, 0.72)}" stroke="${isCurrent ? alpha(theme.accent2, cfg.glassPanels === false ? 0.24 : 0.38) : alpha('#ffffff', cfg.glassPanels === false ? 0.05 : 0.08)}"/>`;
    if (cfg.glassPanels !== false) out += `<rect x="${x + 1.5}" y="${y + 1.5}" width="${Math.max(0, w - 3)}" height="${Math.max(0, h - 3)}" rx="${Math.max(0, radius - 1.5)}" fill="none" stroke="${alpha(theme.accent2, isCurrent ? 0.09 : 0.04)}"/>`;
    out += `<text x="${x + padX}" y="${y + h * 0.28}" fill="${theme.text}" font-size="${Math.max(12, Math.round(Math.min(h * (compact ? 0.16 : 0.19), nameW * 0.22)))}" font-family="${FONT}">${pickMonthLabel(labels, monthIndex, nameW, 'list')}</text>`;
    if (cfg.monthBadges) {
      out += `<rect x="${x + w - padX - badgeW}" y="${y + h * 0.17}" width="${badgeW}" height="${h * 0.20}" rx="${h * 0.10}" fill="${isCurrent ? alpha(theme.accent, 0.18) : alpha('#ffffff', 0.05)}"/>`;
      out += `<text x="${x + w - padX - badgeW / 2}" y="${y + h * 0.30}" text-anchor="middle" fill="${isCurrent ? theme.accent2 : theme.muted}" font-size="${Math.round(h * 0.10)}" font-family="${FONT}">${daysInMonth}${cfg.lang === 'ru' ? 'д' : 'd'}</text>`;
    }
    if (cfg.showWeekdays) {
      labels.weekdays.forEach((wd, i) => out += `<text x="${innerX + i * cellW + cellW / 2}" y="${y + h * 0.24}" text-anchor="middle" fill="${i >= 5 ? alpha(theme.weekend, 0.95) : theme.muted}" font-size="${Math.max(8, Math.round(Math.min(h * (compact ? 0.078 : 0.088), cellW * 0.24)))}" font-family="${FONT}">${wd}</text>`);
    }
    const gridTop = y + topPad + (cfg.showWeekdays ? h * (compact ? 0.04 : 0.05) : 0);
    if (cfg.strongWeekendTint) {
      [5, 6].forEach((weekendCol, idx) => {
        const tintX = innerX + weekendCol * cellW + cellW * 0.08;
        out += `<rect x="${tintX}" y="${gridTop - cellH * 0.18}" width="${cellW * 0.84}" height="${cellH * 5.2}" rx="${cellW * 0.22}" fill="${alpha(theme.weekend, idx === 0 ? 0.06 : 0.09)}"/>`;
      });
    }
    for (let day = 1; day <= daysInMonth; day++) {
      const col = (firstWeekday + day - 1) % 7, row = Math.floor((firstWeekday + day - 1) / 7);
      const date = dayjsInst(`${year}-${String(monthIndex + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`);
      const cx = innerX + col * cellW + cellW / 2, cy = gridTop + row * cellH + cellH * 0.72;
      const isToday = cfg.accentToday && date.isSame(now, 'day');
      const isPast = date.isBefore(now, 'day') && now.month() === monthIndex;
      
      const mmdd = `${String(monthIndex + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const isCustomEvent = cfg.eventsMap && cfg.eventsMap[mmdd];

      let textColor = isToday ? theme.text : isRestDay(date) ? theme.weekend : isPast ? alpha(theme.text, 0.64) : theme.text;
      const eventColor = cfg.eventColor || theme.accent;
      if (isCustomEvent && !isToday) textColor = eventColor;

      if (isCustomEvent) out += `<rect x="${cx - cellW * 0.35}" y="${cy - cellH * 0.65}" width="${cellW * 0.7}" height="${cellH * 0.75}" rx="${Math.min(cellW, cellH) * 0.2}" fill="${alpha(eventColor, 0.18)}" stroke="${alpha(eventColor, 0.34)}"/>`;

      if (isToday) out += `<rect x="${cx - cellW * 0.34}" y="${cy - cellH * 0.58}" width="${cellW * 0.68}" height="${cellH * 0.72}" rx="${Math.min(cellW, cellH) * 0.22}" fill="${alpha(theme.accent, 0.24)}" stroke="${alpha(theme.accent2, 0.28)}"/>`;
      if (cfg.style === 'dots' || cfg.style === 'micro') out += `<circle cx="${cx}" cy="${cy - cellH * 0.24}" r="${Math.max(1.1, Math.min(cellW, cellH) * 0.08)}" fill="${isToday ? theme.accent : isRestDay(date) ? theme.weekend : alpha(theme.text, 0.22)}"/>`;
      
      out += `<text x="${cx}" y="${cy + (cfg.style === 'dots' || cfg.style === 'micro' ? cellH * 0.18 : 0)}" text-anchor="middle" fill="${textColor}" font-size="${numberSize}" font-family="${FONT}">${day}</text>`;
      
    }
    return out;
  }

  function renderFooter(cfg, theme, labels, now, stats, width, footerBox, FONT) {
    const { x, y, w, h } = footerBox;
    const pad = Math.round(w * 0.04);
    const footerRadius = Math.round(w * 0.05);
    let base = `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${footerRadius}" fill="${alpha(theme.panel, 0.82)}" stroke="${alpha('#ffffff', cfg.glassPanels === false ? 0.06 : 0.08)}"/>`;
    if (cfg.glassPanels !== false) base += `<rect x="${x + 1.5}" y="${y + 1.5}" width="${Math.max(0, w - 3)}" height="${Math.max(0, h - 3)}" rx="${Math.max(0, footerRadius - 1.5)}" fill="none" stroke="${alpha(theme.accent2, 0.05)}"/>`; 
    const textSize = Math.round(h * 0.22);
    const subSize = Math.round(h * 0.15);
    const nextEvent = findNearestEvent(cfg, now, labels);
    
    if (cfg.footer === 'quote') {
      const lines = wrap(cfg.note || randomQuote(cfg.lang, now.year()), 34);
      return base + lines.map((line, i) => `<text x="${x + w / 2}" y="${y + h * 0.38 + i * subSize * 1.45}" text-anchor="middle" fill="${theme.text}" font-size="${subSize}" font-family="${FONT}">${escapeXml(line)}</text>`).join('');
    }
    if (cfg.footer === 'progress_bar') {
      const barX = x + pad, barY = y + h * 0.55, barW = w - pad * 2, barH = h * 0.12;
      return base + `<text x="${x + pad}" y="${y + h * 0.32}" fill="${theme.text}" font-size="${textSize}" font-family="${FONT}">${stats.percentPassed}% ${labels.passed}</text><rect x="${barX}" y="${barY}" width="${barW}" height="${barH}" rx="${barH / 2}" fill="${alpha(theme.bg, 0.7)}" /><rect x="${barX}" y="${barY}" width="${barW * stats.percentPassed / 100}" height="${barH}" rx="${barH / 2}" fill="${theme.accent}" />`;
    }
    if (cfg.footer === 'today_card') {
      const dateLabel = cfg.lang === 'ru' ? `${labels.weekdaysFull[(now.day() + 6) % 7]}, ${now.date()} ${labels.months[now.month()].toLowerCase()}` : `${labels.weekdaysFull[(now.day() + 6) % 7]}, ${labels.months[now.month()]} ${now.date()}`;
      return base + `<text x="${x + pad}" y="${y + h * 0.34}" fill="${theme.accent2}" font-size="${subSize}" font-family="${FONT}">${labels.today}</text><text x="${x + pad}" y="${y + h * 0.68}" fill="${theme.text}" font-size="${textSize}" font-family="${FONT}">${escapeXml(dateLabel)}</text>`;
    }
    if (cfg.footer === 'next_event') {
      const title = nextEvent ? nextEvent.title : (cfg.lang === 'ru' ? 'События не добавлены' : 'No events added');
      const meta = nextEvent ? (cfg.lang === 'ru' ? `Через ${nextEvent.diff} дн. · ${nextEvent.label}` : `In ${nextEvent.diff} days · ${nextEvent.label}`) : weatherSummary(cfg, cfg.lang);
      return base + `<text x="${x + pad}" y="${y + h * 0.32}" fill="${theme.accent2}" font-size="${subSize}" font-family="${FONT}">${cfg.lang === 'ru' ? 'Ближайший ориентир' : 'Next marker'}</text><text x="${x + pad}" y="${y + h * 0.62}" fill="${theme.text}" font-size="${textSize}" font-family="${FONT}">${escapeXml(title)}</text><text x="${x + pad}" y="${y + h * 0.82}" fill="${theme.muted}" font-size="${subSize}" font-family="${FONT}">${escapeXml(meta)}</text>`;
    }
    if (cfg.footer === 'seasonal_focus') {
      const season = getSeasonLabel(cfg.lang, now.month());
      const detail = cfg.lang === 'ru' ? `${season} · ${stats.daysLeft} дн. до конца года` : `${season} · ${stats.daysLeft} days left this year`;
      const focusText = cfg.note || (cfg.lang === 'ru' ? 'Спокойный темп, ясный фокус, один главный приоритет.' : 'Calm pace, clear focus, one main priority.');
      const lines = wrap(focusText, 48).slice(0, 2);
      return base + `<text x="${x + pad}" y="${y + h * 0.26}" fill="${theme.accent2}" font-size="${subSize}" font-family="${FONT}">${cfg.lang === 'ru' ? 'Сезонный режим' : 'Season mode'}</text><text x="${x + pad}" y="${y + h * 0.5}" fill="${theme.text}" font-size="${textSize}" font-family="${FONT}">${escapeXml(detail)}</text>${lines.map((line, i) => `<text x="${x + pad}" y="${y + h * 0.72 + i * subSize * 1.4}" fill="${theme.muted}" font-size="${subSize}" font-family="${FONT}">${escapeXml(line)}</text>`).join('')}`;
    }
    if (cfg.footer === 'weather_strip') {
      const weatherLine = weatherSummary(cfg, cfg.lang);
      const tzLine = `UTC${cfg.timezone >= 0 ? '+' + cfg.timezone : cfg.timezone} · ${labels.months[now.month()]} ${now.date()}`;
      return base + `<text x="${x + pad}" y="${y + h * 0.34}" fill="${theme.accent2}" font-size="${subSize}" font-family="${FONT}">${cfg.lang === 'ru' ? 'Сводка среды' : 'Ambient summary'}</text><text x="${x + pad}" y="${y + h * 0.62}" fill="${theme.text}" font-size="${textSize}" font-family="${FONT}">${escapeXml(weatherLine)}</text><text x="${x + pad}" y="${y + h * 0.82}" fill="${theme.muted}" font-size="${subSize}" font-family="${FONT}">${escapeXml(tzLine)}</text>`;
    }
    if (cfg.footer === 'day_weather') {
      const items = (cfg.weatherData && Array.isArray(cfg.weatherData.hourly) ? cfg.weatherData.hourly.slice(0, 6) : []);
      const title = cfg.lang === 'ru' ? 'Прогноз на день' : 'Day forecast';
      const city = cfg.weatherData && cfg.weatherData.cityLabel ? String(cfg.weatherData.cityLabel).split(',')[0].trim() : '';
      const hiLo = cfg.weatherData && cfg.weatherData.dailyMax && cfg.weatherData.dailyMin ? `${cfg.weatherData.dailyMax} / ${cfg.weatherData.dailyMin}` : '';
      if (!items.length) {
        return base + `<text x="${x + pad}" y="${y + h * 0.34}" fill="${theme.accent2}" font-size="${subSize}" font-family="${FONT}">${title}</text><text x="${x + pad}" y="${y + h * 0.66}" fill="${theme.text}" font-size="${textSize * 0.8}" font-family="${FONT}">${cfg.lang === 'ru' ? 'Добавь город для погодного блока' : 'Add a city for forecast'}</text>`;
      }
      const titleY = y + h * 0.23;
      const metaY = y + h * 0.40;
      const stripTop = y + h * 0.50;
      const stripH = h * 0.30;
      const gap = Math.max(10, Math.round(w * 0.012));
      const chipW = (w - pad * 2 - gap * (items.length - 1)) / items.length;
      let chips = `<text x="${x + pad}" y="${titleY}" fill="${theme.accent2}" font-size="${subSize}" font-family="${FONT}">${title}</text>`;
      if (city || hiLo) {
        const meta = [city, hiLo].filter(Boolean).join(' · ');
        chips += `<text x="${x + pad}" y="${metaY}" fill="${theme.muted}" font-size="${subSize * 0.88}" font-family="${FONT}">${escapeXml(meta)}</text>`;
      }
      items.forEach((item, i) => {
        const cx = x + pad + i * (chipW + gap);
        chips += `<rect x="${cx}" y="${stripTop}" width="${chipW}" height="${stripH}" rx="${stripH * 0.24}" fill="${alpha(theme.bg, 0.18)}" stroke="${alpha(theme.accent2, 0.10)}"/>`;
        chips += `<text x="${cx + chipW / 2}" y="${stripTop + stripH * 0.28}" text-anchor="middle" fill="${theme.muted}" font-size="${subSize * 0.72}" font-family="${FONT}">${escapeXml(item.hour)}</text>`;
        chips += `<text x="${cx + chipW / 2}" y="${stripTop + stripH * 0.56}" text-anchor="middle" fill="${theme.text}" font-size="${subSize * 0.95}" font-family="${FONT}">${item.icon}</text>`;
        chips += `<text x="${cx + chipW / 2}" y="${stripTop + stripH * 0.82}" text-anchor="middle" fill="${theme.text}" font-size="${textSize * 0.64}" font-family="${FONT}">${escapeXml(item.temp)}°</text>`;
      });
      return base + chips;
    }
    if (cfg.footer === 'custom_note'  && cfg.note) {
      const lines = wrap(cfg.note, 36).slice(0, 2);
      return base + lines.map((line, i) => `<text x="${x + pad}" y="${y + h * 0.38 + i * subSize * 1.6}" fill="${theme.text}" font-size="${subSize}" font-family="${FONT}">${escapeXml(line)}</text>`).join('');
    }
    return base + `<text x="${x + pad}" y="${y + h * 0.36}" fill="${theme.text}" font-size="${textSize}" font-family="${FONT}">${stats.daysLeft} ${labels.daysLeft}</text><text x="${x + pad}" y="${y + h * 0.66}" fill="${theme.muted}" font-size="${subSize}" font-family="${FONT}">${stats.percentPassed}% ${labels.passed}</text>`;
  }

  Engine.renderSvg = function(cfg, dayjsInst, fontPayload) {
    const theme = cfg.themeObj;
    const labels = getLabels(cfg.lang);
    const now = dayjsInst.utc().add(cfg.timezone, 'hour');
    const stats = yearStats(dayjsInst, now);
    cfg.eventsMap = parseEvents(cfg.events);

    const { width, height } = cfg;
    const padSide = Math.round(width * 0.035);
    const padTop = cfg.lockscreenSafe ? Math.round(height * 0.165 + width * 0.04) : padSide;
    const padBottom = height - (cfg.lockscreenSafe ? Math.round(height * 0.105 + width * 0.03) : padSide);
    
    // ИСПРАВЛЕНИЕ #1: Разделяем поведение для сервера и браузера
    const isServer = cfg.isServer === true;
    
    const fontMap = (fontPayload && typeof fontPayload === 'object' && !Array.isArray(fontPayload))
      ? fontPayload
      : (fontPayload ? { selected: fontPayload } : {});
      
    const browserFamily = fontMap.browserFamily || cfg.fontFamily || 'Inter';
    
    let fontDefs = '';
    let FONT_FAMILY = browserFamily;

    // Вставляем Base64 ТОЛЬКО для браузера (превью).
    // Если вставить Base64 на сервере, внутренний парсер Resvg сломается и не отрендерит SVG.
    if (!isServer) {
      const selectedB64 = fontMap.selected || '';
      const interB64 = fontMap.inter || '';
      const ubuntuB64 = fontMap.ubuntu || '';
      
      const extraFaces = [];
      if (selectedB64) extraFaces.push(`@font-face { font-family: 'AppPrimary'; src: url(data:font/ttf;base64,${selectedB64}); }`);
      if (interB64) extraFaces.push(`@font-face { font-family: 'AppInter'; src: url(data:font/ttf;base64,${interB64}); }`);
      if (ubuntuB64) extraFaces.push(`@font-face { font-family: 'AppUbuntu'; src: url(data:font/ttf;base64,${ubuntuB64}); }`);
      
      FONT_FAMILY = `AppPrimary, ${browserFamily}, sans-serif`;
      fontDefs = `<style>\n${extraFaces.join('\n')}\ntext, tspan { font-family: ${FONT_FAMILY}; }\n</style>`;
    }

    const listLike = isListLayout(cfg.monthLayout);
    const compactLike = isCompactGridLayout(cfg.monthLayout) || listLike;
    const headerHeight = Math.round(height * (listLike ? 0.088 : compactLike ? 0.09 : 0.12));
    const footerHeight = Math.round(height * (listLike ? 0.072 : compactLike ? 0.076 : 0.08));
    const contentTop = padTop + headerHeight + Math.round(height * 0.012);
    const contentBottom = padBottom - footerHeight - Math.round(height * 0.014);
    const contentH = contentBottom - contentTop;

    const layout = getLayoutMetrics(cfg, width, height, contentH, padSide);

    let monthsSvg = '';
    if (layout.mode === 'focus') {
      const heroGap = Math.round(width * 0.014);
      const heroH = Math.round(contentH * 0.40);
      monthsSvg += renderMonthGrid({ dayjsInst, monthIndex: now.month(), year: now.year(), x: padSide, y: contentTop, w: width - padSide * 2, h: heroH, cfg: { ...cfg, monthLayout: 'single_month_focus', monthBadges: true, showWeekNumbers: true }, theme, labels, now, FONT: FONT_FAMILY });
      const miniTop = contentTop + heroH + heroGap;
      const miniH = (contentBottom - miniTop - heroGap * 2) / 3, miniW = (width - padSide * 2 - heroGap * 3) / 4;
      const otherMonths = Array.from({ length: 12 }, (_, i) => i).filter(i => i !== now.month());
      otherMonths.forEach((monthIndex, i) => monthsSvg += renderMonthGrid({ dayjsInst, monthIndex, year: now.year(), x: padSide + (i % 4) * (miniW + heroGap), y: miniTop + Math.floor(i / 4) * (miniH + heroGap), w: miniW, h: miniH, cfg: { ...cfg, monthLayout: 'grid_3x4_compact', focusCurrentMonth: false, monthBadges: false, showWeekNumbers: false, showWeekdays: true }, theme, labels, now, FONT: FONT_FAMILY }));
    } else {
      for (let i = 0; i < 12; i++) {
        const x = padSide + (i % layout.cols) * (layout.monthW + layout.gap), y = contentTop + Math.floor(i / layout.cols) * (layout.monthH + layout.gap);
        monthsSvg += isListLayout(cfg.monthLayout) ? renderMonthListRow({ dayjsInst, monthIndex: i, year: now.year(), x, y, w: layout.monthW, h: layout.monthH, cfg, theme, labels, now, FONT: FONT_FAMILY }) : renderMonthGrid({ dayjsInst, monthIndex: i, year: now.year(), x, y, w: layout.monthW, h: layout.monthH, cfg, theme, labels, now, FONT: FONT_FAMILY });
      }
    }

    let quarterLines = '';
    if (cfg.quarterDividers && layout.mode !== 'focus') {
      if (isListLayout(cfg.monthLayout)) {
        [3, 6, 9].forEach((idx) => quarterLines += `<line x1="${padSide}" y1="${contentTop + idx * layout.monthH + (idx - 0.5) * layout.gap}" x2="${width - padSide}" y2="${contentTop + idx * layout.monthH + (idx - 0.5) * layout.gap}" stroke="${alpha(theme.accent2, 0.12)}" stroke-dasharray="12 12" />`);
      } else if (layout.cols === 3 && layout.rows === 4) {
        for (let r = 1; r < layout.rows; r++) quarterLines += `<line x1="${padSide}" y1="${contentTop + r * layout.monthH + (r - 0.5) * layout.gap}" x2="${width - padSide}" y2="${contentTop + r * layout.monthH + (r - 0.5) * layout.gap}" stroke="${alpha(theme.accent2, 0.12)}" stroke-dasharray="10 12" />`;
      } else if (layout.cols === 2 && layout.rows === 6) {
        [2, 4].forEach((r) => quarterLines += `<line x1="${padSide}" y1="${contentTop + r * layout.monthH + (r - 0.5) * layout.gap}" x2="${width - padSide}" y2="${contentTop + r * layout.monthH + (r - 0.5) * layout.gap}" stroke="${alpha(theme.accent2, 0.10)}" stroke-dasharray="10 12" />`);
      } else if (layout.cols === 6 && layout.rows === 2) {
        quarterLines += `<line x1="${padSide}" y1="${contentTop + layout.monthH + layout.gap / 2}" x2="${width - padSide}" y2="${contentTop + layout.monthH + layout.gap / 2}" stroke="${alpha(theme.accent2, 0.10)}" stroke-dasharray="10 12" />`;
        quarterLines += `<line x1="${padSide + 3 * layout.monthW + 2.5 * layout.gap}" y1="${contentTop}" x2="${padSide + 3 * layout.monthW + 2.5 * layout.gap}" y2="${contentBottom}" stroke="${alpha(theme.accent2, 0.08)}" stroke-dasharray="8 10" />`;
      }
    }

    return `<?xml version="1.0" encoding="UTF-8"?><svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" font-family="${escapeXml(FONT_FAMILY)}"><defs>${fontDefs}</defs>${renderBackground(cfg, theme, width, height)}${renderHeader(cfg, theme, labels, now, stats, width, padSide, padTop, FONT_FAMILY)}${quarterLines}${monthsSvg}${renderFooter(cfg, theme, labels, now, stats, width, { x: padSide, y: padBottom - footerHeight, w: width - padSide * 2, h: Math.round(footerHeight * 0.92) }, FONT_FAMILY)}</svg>`;
  };

  global.Engine = Engine;
  if (typeof module !== 'undefined' && module.exports) module.exports = Engine;
})(typeof window !== 'undefined' ? window : global);
