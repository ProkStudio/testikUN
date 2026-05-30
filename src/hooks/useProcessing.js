/**
 * Хук для связи UI с IPC и управления состоянием обработки.
 */
import { useState, useEffect, useCallback } from 'react';
import { fireConfetti } from '../components/Confetti';

let logIdCounter = 0;

export default function useProcessing() {
  const [videos, setVideos] = useState([]);
  const [batchMode, setBatchMode] = useState(false);
  const [numCopies, setNumCopies] = useState(3);
  const [maxMode, setMaxMode] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [totalProgress, setTotalProgress] = useState(0);
  const [copyProgress, setCopyProgress] = useState(0);
  const [currentLabel, setCurrentLabel] = useState('');
  const [logs, setLogs] = useState([]);
  const [toast, setToast] = useState({ visible: false, message: '', outputDir: '' });

  const addLog = useCallback((text, level = 'info') => {
    setLogs((prev) => [
      ...prev.slice(-200),
      { id: ++logIdCounter, text, level, timestamp: Date.now() },
    ]);
  }, []);

  /** Загрузка одного или нескольких видео */
  const loadVideos = useCallback(async (paths, errorMsg) => {
    if (!paths?.length) {
      if (errorMsg) addLog(errorMsg, 'error');
      return;
    }

    addLog(`Загрузка: ${paths.length} файл(ов)…`, 'info');
    const results = await Promise.all(
      paths.map((p) => window.electronAPI?.probeVideo(p))
    );

    const loaded = [];
    for (let i = 0; i < results.length; i++) {
      const r = results[i];
      const name = paths[i].split(/[/\\]/).pop();
      if (r?.ok) {
        loaded.push(r.data);
        const info = r.data.isImage
          ? `${r.data.mediaLabel}, ${r.data.resolution}`
          : `${r.data.resolution}, ${r.data.durationFormatted}`;
        addLog(`✓ ${name}: ${info}`, 'success');
      } else {
        addLog(`✗ ${name}: ${r?.error || 'ошибка'}`, 'error');
      }
    }

    if (loaded.length) {
      setVideos(loaded);
    } else {
      setVideos([]);
      addLog('Не удалось загрузить видео', 'error');
    }
  }, [addLog]);

  /** Переключение пакетного режима */
  const toggleBatchMode = useCallback((enabled) => {
    setBatchMode(enabled);
    if (!enabled && videos.length > 1) {
      setVideos((prev) => prev.slice(0, 1));
      addLog('Пакетный режим выкл — оставлено 1 видео', 'info');
    }
  }, [videos.length, addLog]);

  /** Запуск обработки */
  const startProcessing = useCallback(async () => {
    if (!videos.length || isProcessing) return;

    setIsProcessing(true);
    setTotalProgress(0);
    setCopyProgress(0);
    setCurrentLabel(videos.length > 1 ? 'Видео 1' : 'Копия 1');
    addLog('Запуск обработки…', 'info');

    const result = await window.electronAPI?.startProcessing({
      inputPaths: videos.map((v) => v.path),
      numCopies,
      maxMode,
      batchMode: batchMode || videos.length > 1,
    });

    if (result && !result.ok) {
      addLog(`Ошибка запуска: ${result.error}`, 'error');
      setIsProcessing(false);
    }
  }, [videos, isProcessing, numCopies, maxMode, batchMode, addLog]);

  const cancelProcessing = useCallback(async () => {
    await window.electronAPI?.cancelProcessing();
  }, []);

  useEffect(() => {
    const api = window.electronAPI;
    if (!api) return;

    const unsubs = [
      api.onLog(({ text, level }) => addLog(text, level)),
      api.onCopyProgress(({ label, percent }) => {
        if (label) setCurrentLabel(label);
        setCopyProgress(percent);
      }),
      api.onTotalProgress(({ percent }) => setTotalProgress(percent)),
      api.onCopyDone(({ label, outputPath }) => {
        addLog(`${label}: сохранено → ${outputPath.split(/[/\\]/).pop()}`, 'success');
      }),
      api.onAllDone(({ outputDir, totalVideos, successCount }) => {
        fireConfetti();
        setToast({
          visible: true,
          message: totalVideos > 1
            ? `Готово! ${successCount} задач (${totalVideos} видео)`
            : 'Обработка завершена!',
          outputDir,
        });
      }),
      api.onError(({ message }) => addLog(message, 'error')),
      api.onProcessingStarted(() => setIsProcessing(true)),
      api.onProcessingStopped(() => {
        setIsProcessing(false);
        setCurrentLabel('');
      }),
    ];

    return () => unsubs.forEach((fn) => fn?.());
  }, [addLog]);

  const openOutputFolder = useCallback(async () => {
    if (toast.outputDir) {
      await window.electronAPI?.openPath(toast.outputDir);
    }
  }, [toast.outputDir]);

  const closeToast = useCallback(() => {
    setToast((t) => ({ ...t, visible: false }));
  }, []);

  return {
    videos,
    batchMode,
    setBatchMode: toggleBatchMode,
    numCopies,
    setNumCopies,
    maxMode,
    setMaxMode,
    isProcessing,
    totalProgress,
    copyProgress,
    currentLabel,
    logs,
    toast,
    loadVideos,
    startProcessing,
    cancelProcessing,
    openOutputFolder,
    closeToast,
  };
}
