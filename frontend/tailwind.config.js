/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.jsx',
    './src/**/*.js',
    './src/**/*.tsx',
    './src/**/*.ts',
  ],
  safelist: {
    pattern: /^(w|h|max-w|min-w|max-h|min-h|p|m|gap|text|bg|border|rounded|shadow|font|leading|tracking)-(0|1|2|3|4|5|6|7|8|9|10|11|12|13|14|15|16|20|24|28|32|36|40|44|48|52|56|60|64|80|96|full|screen|px|auto|max|min|fit|flow|between|around|evenly|center|start|end|baseline|before|after)(-[a-z]+)?$/,
  },
  theme: {
    extend: {
      colors: {
        surface: {
          DEFAULT: 'rgb(var(--color-surface) / <alpha-value>)',
          raised: 'rgb(var(--color-surface-raised) / <alpha-value>)',
          card: 'rgb(var(--color-surface-card) / <alpha-value>)',
          border: 'rgb(var(--color-surface-border) / <alpha-value>)',
          hover: 'rgb(var(--color-surface-hover) / <alpha-value>)',
        },
        accent: {
          DEFAULT: 'rgb(var(--color-accent) / <alpha-value>)',
          light: 'rgb(var(--color-accent-light) / <alpha-value>)',
          dark: 'rgb(var(--color-accent-dark) / <alpha-value>)',
        },
        status: {
          pending: '#f59e0b',
          no_answer: '#6b7280',
          closed: '#10b981',
          rejected: '#ef4444',
        },
        opportunity: {
          alta: '#10b981',
          media: '#f59e0b',
          baja: '#ef4444',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      boxShadow: {
        'card':       '0 1px 3px 0 rgb(0 0 0 / 0.35), 0 1px 2px -1px rgb(0 0 0 / 0.25)',
        'card-hover': '0 8px 28px -4px rgb(0 0 0 / 0.55), 0 4px 8px -2px rgb(0 0 0 / 0.3)',
        'glow-accent':  '0 0 20px -4px rgb(79 142 247 / 0.45)',
        'glow-emerald': '0 0 16px -4px rgb(52 211 153 / 0.4)',
        'glow-amber':   '0 0 16px -4px rgb(251 191 36 / 0.4)',
        'glow-red':     '0 0 16px -4px rgb(248 113 113 / 0.4)',
        'inner-top': 'inset 0 1px 0 0 rgb(255 255 255 / 0.06)',
      },
      animation: {
        'fade-in':    'fadeIn 200ms ease-out',
        'slide-up':   'slideUp 250ms cubic-bezier(0.16, 1, 0.3, 1)',
        'slide-down': 'slideDown 250ms cubic-bezier(0.16, 1, 0.3, 1)',
        'pulse-soft': 'pulseSoft 2s ease-in-out infinite',
        'shimmer':    'shimmer 2.5s linear infinite',
        'modal-pop':  'modalPop 280ms cubic-bezier(0.16, 1, 0.3, 1)',
      },
      keyframes: {
        fadeIn: {
          '0%':   { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%':   { opacity: '0', transform: 'translateY(12px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        slideDown: {
          '0%':   { opacity: '0', transform: 'translateY(-8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        pulseSoft: {
          '0%, 100%': { opacity: '1' },
          '50%':      { opacity: '0.6' },
        },
        shimmer: {
          '0%':   { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        modalPop: {
          '0%':   { opacity: '0', transform: 'scale(0.94) translateY(8px)' },
          '100%': { opacity: '1', transform: 'scale(1) translateY(0)' },
        },
      },
    },
  },
  plugins: [],
}
