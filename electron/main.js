/**
 * Main-процесс Electron: окно, IPC, управление ffmpeg.
 * Архитектура по образцу LosslessCut.
 */

const { app, BrowserWindow, ipcMain, dialog, shell } = require('electron');
const path = require('path');
const { getMediaInfo } = require('./ffmpeg/probe');
const { ProcessingManager } = require('./ffmpeg/processor');

const isDev = !app.isPackaged;
let mainWindow = null;
const processor = new ProcessingManager();

/** Создание главного окна (безрамное) */
function createWindow() {
  mainWindow = new BrowserWindow({
    width: 960,
    height: 720,
    minWidth: 720,
    minHeight: 560,
    frame: false,
    transparent: false,
    backgroundColor: '#050510',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
    show: false,
  });

  if (isDev) {
    mainWindow.loadURL('http://localhost:5173');
  } else {
    mainWindow.loadFile(path.join(__dirname, '..', 'dist', 'index.html'));
  }

  mainWindow.once('ready-to-show', () => mainWindow.show());
  mainWindow.on('closed', () => { mainWindow = null; });

  // Блокируем открытие файла как страницы при drop из проводника
  mainWindow.webContents.on('will-navigate', (event, url) => {
    if (url.startsWith('file://')) event.preventDefault();
  });
  mainWindow.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
}

/** Отправка события в renderer */
function sendToRenderer(channel, ...args) {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send(channel, ...args);
  }
}

// --- IPC: управление окном ---
ipcMain.on('window:minimize', () => mainWindow?.minimize());
ipcMain.on('window:maximize', () => {
  if (mainWindow?.isMaximized()) mainWindow.unmaximize();
  else mainWindow?.maximize();
});
ipcMain.on('window:close', () => mainWindow?.close());

// --- IPC: диалог выбора файла ---
ipcMain.handle('dialog:openVideo', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    title: 'Выберите видео или фото',
    filters: [
      { name: 'Все медиа', extensions: ['mp4', 'mkv', 'avi', 'mov', 'webm', 'jpg', 'jpeg', 'png', 'webp', 'bmp', 'gif'] },
      { name: 'Видео', extensions: ['mp4', 'mkv', 'avi', 'mov', 'webm', 'flv', 'wmv'] },
      { name: 'Фото', extensions: ['jpg', 'jpeg', 'png', 'webp', 'bmp', 'gif'] },
      { name: 'Все файлы', extensions: ['*'] },
    ],
    properties: ['openFile'],
  });
  if (result.canceled || !result.filePaths.length) return null;
  return result.filePaths[0];
});

// --- IPC: диалог выбора нескольких видео ---
ipcMain.handle('dialog:openVideos', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    title: 'Выберите файлы (можно несколько)',
    filters: [
      { name: 'Все медиа', extensions: ['mp4', 'mkv', 'avi', 'mov', 'webm', 'jpg', 'jpeg', 'png', 'webp', 'bmp', 'gif'] },
      { name: 'Видео', extensions: ['mp4', 'mkv', 'avi', 'mov', 'webm', 'flv', 'wmv'] },
      { name: 'Фото', extensions: ['jpg', 'jpeg', 'png', 'webp', 'bmp', 'gif'] },
      { name: 'Все файлы', extensions: ['*'] },
    ],
    properties: ['openFile', 'multiSelections'],
  });
  if (result.canceled || !result.filePaths.length) return [];
  return result.filePaths;
});

// --- IPC: probe видео ---
ipcMain.handle('video:probe', async (_, filePath) => {
  try {
    return { ok: true, data: await getMediaInfo(filePath) };
  } catch (e) {
    return { ok: false, error: e.message };
  }
});

// --- IPC: запуск обработки ---
ipcMain.handle('video:process', async (_, opts) => {
  return processor.start(opts);
});

// --- IPC: отмена ---
ipcMain.handle('video:cancel', () => {
  processor.cancel();
  return { ok: true };
});

// --- IPC: открыть папку ---
ipcMain.handle('shell:openPath', async (_, dirPath) => {
  return shell.openPath(dirPath);
});

// --- События процессора → renderer ---
processor.on('log', (text, level) => sendToRenderer('log', { text, level }));
processor.on('copyProgress', (data) => sendToRenderer('copyProgress', data));
processor.on('totalProgress', (pct) => sendToRenderer('totalProgress', { percent: pct }));
processor.on('copyDone', (data) => sendToRenderer('copyDone', data));
processor.on('allDone', (data) => sendToRenderer('allDone', data));
processor.on('error', (msg) => sendToRenderer('error', { message: msg }));
processor.on('started', () => sendToRenderer('processingStarted'));
processor.on('stopped', () => sendToRenderer('processingStopped'));

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  processor.cancel();
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});
