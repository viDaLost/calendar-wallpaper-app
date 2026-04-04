# Wallpaper Calendar Pro

Готовое Node.js веб-приложение для генерации календаря-обоев с PNG endpoint.

## Что умеет
- генератор обоев с live preview
- PNG endpoint: `/wallpaper.png?...`
- SVG endpoint: `/wallpaper.svg?...`
- shareable URL с параметрами
- пресеты iPhone / Android
- несколько стилей: numbers, dots, bars, rings, heatmap, focus
- темы, footer-режимы, сетки месяцев, timezone

## Запуск
```bash
npm install
npm start
```

После запуска:
- UI: `http://localhost:3000`
- PNG: `http://localhost:3000/wallpaper.png?...`

## Для деплоя
Подходит для Render, Railway, VPS, Docker.

## Что можно добавить дальше
- загрузку своей картинки как фон
- аккаунты и сохранение наборов обоев
- праздники по странам
- отдельные премиум-паки тем
- автоматическое определение разрешения устройства
- WebP/JPEG export
