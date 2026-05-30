/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        cyber: {
          bg: '#050510',
          card: '#0a0a1a',
          cyan: '#00FFFF',
          magenta: '#FF00FF',
          green: '#00FF88',
          red: '#FF4466',
          dim: '#888899',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'Consolas', 'monospace'],
      },
      boxShadow: {
        'neon-cyan': '0 0 20px rgba(0, 255, 255, 0.4)',
        'neon-magenta': '0 0 20px rgba(255, 0, 255, 0.4)',
        'neon-cyan-lg': '0 0 40px rgba(0, 255, 255, 0.3)',
      },
      animation: {
        pulseGlow: 'pulseGlow 2s ease-in-out infinite',
        float: 'float 3s ease-in-out infinite',
      },
      keyframes: {
        pulseGlow: {
          '0%, 100%': { opacity: '1', boxShadow: '0 0 10px rgba(0,255,255,0.5)' },
          '50%': { opacity: '0.7', boxShadow: '0 0 25px rgba(255,0,255,0.6)' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-4px)' },
        },
      },
    },
  },
  plugins: [],
};
