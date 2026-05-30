/**
 * Главный компонент VideoUniquer Pro.
 */
import { useEffect } from 'react';
import { motion } from 'framer-motion';
import TitleBar from './components/TitleBar';
import DropZone from './components/DropZone';
import CopySlider from './components/CopySlider';
import BatchToggle from './components/BatchToggle';
import ToggleSwitch from './components/ToggleSwitch';
import ProgressSection from './components/ProgressSection';
import TerminalLog from './components/TerminalLog';
import Toast from './components/Toast';
import useProcessing from './hooks/useProcessing';

export default function App() {
  const {
    videos,
    batchMode,
    setBatchMode,
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
  } = useProcessing();

  const canStart = videos.length > 0 && !isProcessing;

  useEffect(() => {
    const prevent = (e) => { e.preventDefault(); };
    window.addEventListener('dragover', prevent);
    window.addEventListener('drop', prevent);
    return () => {
      window.removeEventListener('dragover', prevent);
      window.removeEventListener('drop', prevent);
    };
  }, []);

  return (
    <div className="flex flex-col h-screen bg-cyber-bg overflow-hidden">
      <TitleBar />

      <div className="flex-1 flex flex-col p-5 gap-4 overflow-hidden">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <DropZone
            videos={videos}
            batchMode={batchMode}
            onFilesSelected={loadVideos}
            disabled={isProcessing}
          />

          <div className="flex flex-col justify-center gap-5 px-2">
            <BatchToggle
              enabled={batchMode}
              onChange={setBatchMode}
              disabled={isProcessing}
            />
            <CopySlider
              value={numCopies}
              onChange={setNumCopies}
              disabled={isProcessing}
            />
            <ToggleSwitch
              enabled={maxMode}
              onChange={setMaxMode}
              disabled={isProcessing}
            />

            <ProgressSection
              totalProgress={totalProgress}
              copyProgress={copyProgress}
              currentLabel={currentLabel}
              isProcessing={isProcessing}
            />

            <div className="flex gap-3 mt-2">
              {!isProcessing ? (
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={startProcessing}
                  disabled={!canStart}
                  className={`
                    flex-1 py-3 rounded-xl font-semibold text-sm tracking-wide transition-all
                    ${canStart
                      ? 'bg-gradient-to-r from-cyber-cyan/20 to-cyber-magenta/20 text-white border border-cyber-cyan/50 hover:shadow-neon-cyan hover:border-cyber-cyan'
                      : 'bg-cyber-card text-cyber-dim border border-cyber-dim/20 cursor-not-allowed'}
                  `}
                >
                  ▶ {batchMode && videos.length > 1
                    ? `СТАРТ (${videos.length} видео)`
                    : 'СТАРТ УНИКАЛИЗАЦИИ'}
                </motion.button>
              ) : (
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={cancelProcessing}
                  className="flex-1 py-3 rounded-xl font-semibold text-sm bg-cyber-red/10 text-cyber-red border border-cyber-red/40 hover:bg-cyber-red/20 transition-all"
                >
                  ■ ОТМЕНА
                </motion.button>
              )}
            </div>
          </div>
        </div>

        <div className="flex-1 min-h-0 rounded-xl border border-cyber-cyan/20 overflow-hidden bg-cyber-card/30">
          <TerminalLog logs={logs} />
        </div>
      </div>

      <Toast
        visible={toast.visible}
        message={toast.message}
        outputDir={toast.outputDir}
        onClose={closeToast}
        onOpenFolder={openOutputFolder}
      />
    </div>
  );
}
