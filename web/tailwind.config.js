/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        ac: {
          coral: '#6f9eb2',
          'coral-light': '#86b1c2',
          'coral-dark': '#5f8fa4',
          salmon: '#b9ced6',
          cream: '#eaf3ef',
          'warm-white': '#fbfcfa',
          dark: '#1f2230',
          'dark-secondary': '#5f6672',
          'med-gray': '#818996',
          'light-gray': '#d7e0da',
          white: '#ffffff',
          success: '#7aa28a',
          warning: '#c89b63',
        },
        wf: {
          bg: '#26323a',
          surface: '#314048',
          border: '#445760',
          text: '#eef4f2',
        },
      },
      fontFamily: {
        sans: ['"DM Sans"', '-apple-system', 'BlinkMacSystemFont', '"Segoe UI"', 'sans-serif'],
        mono: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'Consolas', 'monospace'],
      },
      borderRadius: {
        xl: '14px',
        '2xl': '20px',
        '3xl': '28px',
      },
      boxShadow: {
        card: '0 10px 24px rgba(31, 34, 48, 0.08)',
        cardhover: '0 16px 32px rgba(31, 34, 48, 0.12)',
        menu: '0 20px 36px rgba(31, 34, 48, 0.16)',
      },
      keyframes: {
        'fade-in': { from: { opacity: '0' }, to: { opacity: '1' } },
        'fade-up': { from: { opacity: '0', transform: 'translateY(8px)' }, to: { opacity: '1', transform: 'translateY(0)' } },
        'overlay-in': { from: { opacity: '0' }, to: { opacity: '1' } },
        'content-in': { from: { opacity: '0', transform: 'translate(-50%, -48%) scale(0.97)' }, to: { opacity: '1', transform: 'translate(-50%, -50%) scale(1)' } },
      },
      animation: {
        'fade-in': 'fade-in 0.2s ease both',
        'fade-up': 'fade-up 0.3s ease both',
        'overlay-in': 'overlay-in 0.2s ease both',
        'content-in': 'content-in 0.2s ease both',
      },
    },
  },
  plugins: [],
};
