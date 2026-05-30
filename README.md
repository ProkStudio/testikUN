# VideoUniquer Pro

Десктопное приложение для создания уникальных копий видео через FFmpeg-фильтры.

**Стек:** Electron + React + Vite + Tailwind CSS + Framer Motion

## Возможности

- Загрузка видео (drag & drop или выбор файла)
- 1–7 уникальных копий с параллельной обработкой
- 15 методов уникализации через FFmpeg filter_complex
- Пресет «Максимальная уникализация» (все методы) / умеренный (7 методов)
- Два прогресс-бара + терминальный лог с цветовым кодированием
- Конфetti и toast по завершении

## Методы уникализации

1. Crop (0–3%)
2. Rotate (±2°)
3. Horizontal flip (50%)
4. Speed (setpts 0.95x–1.05x)
5. Color balance + EQ
6. Noise (grain)
7. Vignette
8. Unsharp / SmartBlur
9. Scale down 2–5% и обратно
10. CRF 18–24 + GOP
11. Trim первых 1–3 кадров
12. Audio: atempo, volume, delay
13. Watermark (drawtext)
14. Fade in/out
15. Случайный порядок фильтров

## Установка

### 1. FFmpeg

**Windows** — `resources/bin/win/`:

```
resources/bin/win/ffmpeg.exe
resources/bin/win/ffprobe.exe
```

**macOS** — `resources/bin/mac/arm64/` и `resources/bin/mac/x64/` (без `.exe`):

```
resources/bin/mac/arm64/ffmpeg   # M1/M2/M3
resources/bin/mac/x64/ffmpeg     # Intel Mac
```

Для локальной сборки достаточно папки своего процессора; в CI кладутся обе.

Скачать для Mac: [evermeet.cx/ffmpeg](https://evermeet.cx/ffmpeg/)

> Без бинарников приложение попытается использовать системный ffmpeg из PATH.

### 2. Зависимости

```bash
npm install
```

### 3. Запуск (dev)

```bash
npm run dev
```

Откроется Electron-окно с hot-reload через Vite.

## Сборка EXE (Windows)

```bash
npm run build:frontend
```

Сборка распакованного приложения (без установщика):

```bash
$env:CSC_IDENTITY_AUTO_DISCOVERY='false'
npx electron-builder --win --dir --config electron-builder.yml
```

Готовый EXE: `release/win-unpacked/VideoUniquer Pro.exe`

Полный установщик NSIS (может потребовать права администратора для symlinks):

```bash
npm run build:win
```

FFmpeg бинарники автоматически включаются через `extraResources`.

## Сборка для macOS (друг с Mac)

**С Windows .dmg собрать нельзя** — нужен Mac или облачная сборка.

### Вариант A: GitHub Actions (удобнее всего)

1. Залейте проект на GitHub.
2. Вкладка **Actions** → workflow **Build Release** → **Run workflow**.
3. Скачайте артефакт **VideoUniquer-Pro-macOS** — один файл `VideoUniquer Pro-Setup-1.0.0-mac.dmg`.
4. Отправьте другу этот DMG (подходит и для M1/M2, и для Intel Mac).

### Вариант B: Сборка на Mac друга

```bash
chmod +x build-mac.sh
./build-mac.sh
```

Или: `npm run build:mac` (после `npm install` и FFmpeg в `resources/bin/mac/`).

### Установка у друга

1. Открыть `.dmg`, перетащить **VideoUniquer Pro** в «Программы».
2. При первом запуске macOS может заблокировать приложение без подписи Apple:
   - **ПКМ** по иконке → **Открыть** → подтвердить,  
   - или: **Системные настройки** → **Конфиденциальность и безопасность** → **Всё равно открыть**.

## Выходные файлы

Рядом с исходным видео создаётся папка:

```
Uniqued_Видео/
  уник_1.mp4
  уник_2.mp4
  ...
```

## Структура проекта

```
electron/
  main.js              — main-процесс, IPC
  preload.js           — contextBridge API
  ffmpeg/
    pathResolver.js    — пути к ffmpeg/ffprobe
    probe.js           — ffprobe метаданные
    progressParser.js  — парсинг time= из stderr
    presets.js         — moderate / maximum
    filterBuilder.js   — 15 методов, filter_complex
    processor.js       — параллельная очередь

src/
  App.jsx              — главный компонент
  components/          — UI (DropZone, TerminalLog, …)
  hooks/useProcessing.js
```

## Лицензия

MIT
