/**
 * Preload: безопасный мост IPC между main и renderer.
 */

const { contextBridge, ipcRenderer, webUtils } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  // Путь к файлу из drag & drop (file.path в renderer больше не работает)
  getPathForFile: (file) => webUtils.getPathForFile(file),
  // Диалоги и файлы
  selectVideoFile: () => ipcRenderer.invoke('dialog:openVideo'),
  selectVideoFiles: () => ipcRenderer.invoke('dialog:openVideos'),
  probeVideo: (path) => ipcRenderer.invoke('video:probe', path),
  startProcessing: (opts) => ipcRenderer.invoke('video:process', opts),
  cancelProcessing: () => ipcRenderer.invoke('video:cancel'),
  openPath: (dir) => ipcRenderer.invoke('shell:openPath', dir),

  // Управление окном
  minimize: () => ipcRenderer.send('window:minimize'),
  maximize: () => ipcRenderer.send('window:maximize'),
  close: () => ipcRenderer.send('window:close'),

  // Подписки на события (возвращают функцию отписки)
  onLog: (cb) => {
    const handler = (_, data) => cb(data);
    ipcRenderer.on('log', handler);
    return () => ipcRenderer.removeListener('log', handler);
  },
  onCopyProgress: (cb) => {
    const handler = (_, data) => cb(data);
    ipcRenderer.on('copyProgress', handler);
    return () => ipcRenderer.removeListener('copyProgress', handler);
  },
  onTotalProgress: (cb) => {
    const handler = (_, data) => cb(data);
    ipcRenderer.on('totalProgress', handler);
    return () => ipcRenderer.removeListener('totalProgress', handler);
  },
  onCopyDone: (cb) => {
    const handler = (_, data) => cb(data);
    ipcRenderer.on('copyDone', handler);
    return () => ipcRenderer.removeListener('copyDone', handler);
  },
  onAllDone: (cb) => {
    const handler = (_, data) => cb(data);
    ipcRenderer.on('allDone', handler);
    return () => ipcRenderer.removeListener('allDone', handler);
  },
  onError: (cb) => {
    const handler = (_, data) => cb(data);
    ipcRenderer.on('error', handler);
    return () => ipcRenderer.removeListener('error', handler);
  },
  onProcessingStarted: (cb) => {
    const handler = () => cb();
    ipcRenderer.on('processingStarted', handler);
    return () => ipcRenderer.removeListener('processingStarted', handler);
  },
  onProcessingStopped: (cb) => {
    const handler = () => cb();
    ipcRenderer.on('processingStopped', handler);
    return () => ipcRenderer.removeListener('processingStopped', handler);
  },
});
