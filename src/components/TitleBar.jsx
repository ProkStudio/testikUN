/**
 * Кастомный заголовок безрамного окна с неоновой линией.
 */
import { motion } from 'framer-motion';

export default function TitleBar() {
  return (
    <div className="drag-region flex items-center justify-between h-10 px-4 bg-cyber-bg border-b border-cyber-cyan/20 relative">
      {/* Неоновая линия снизу */}
      <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-cyber-cyan to-transparent opacity-60" />

      <div className="flex items-center gap-2">
        <motion.div
          className="w-2 h-2 rounded-full bg-cyber-cyan"
          animate={{ boxShadow: ['0 0 4px #00FFFF', '0 0 12px #00FFFF', '0 0 4px #00FFFF'] }}
          transition={{ duration: 2, repeat: Infinity }}
        />
        <span className="text-sm font-semibold tracking-wider text-cyber-cyan">
          VideoUniquer Pro
        </span>
        <span className="text-xs text-cyber-dim ml-1">v1.0.0</span>
      </div>

      <div className="no-drag flex items-center gap-1">
        <button
          onClick={() => window.electronAPI?.minimize()}
          className="w-8 h-8 flex items-center justify-center text-cyber-dim hover:text-cyber-cyan hover:bg-cyber-cyan/10 rounded transition-colors"
          title="Свернуть"
        >
          <svg width="12" height="12" viewBox="0 0 12 12"><rect y="5" width="12" height="1.5" fill="currentColor" /></svg>
        </button>
        <button
          onClick={() => window.electronAPI?.maximize()}
          className="w-8 h-8 flex items-center justify-center text-cyber-dim hover:text-cyber-cyan hover:bg-cyber-cyan/10 rounded transition-colors"
          title="Развернуть"
        >
          <svg width="12" height="12" viewBox="0 0 12 12"><rect x="1" y="1" width="10" height="10" stroke="currentColor" strokeWidth="1.5" fill="none" /></svg>
        </button>
        <button
          onClick={() => window.electronAPI?.close()}
          className="w-8 h-8 flex items-center justify-center text-cyber-dim hover:text-cyber-red hover:bg-cyber-red/10 rounded transition-colors"
          title="Закрыть"
        >
          <svg width="12" height="12" viewBox="0 0 12 12">
            <path d="M1 1L11 11M11 1L1 11" stroke="currentColor" strokeWidth="1.5" />
          </svg>
        </button>
      </div>
    </div>
  );
}
