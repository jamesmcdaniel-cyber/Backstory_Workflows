/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      // ──────────────────────────────────────────────────────────────
      // "Studio" — dark theme (sibling brand to Backstory).
      // Token NAMES are retained from the original light theme so the
      // theme can be flipped back by swapping values here alone — no
      // component churn. The semantic ROLE of each token is noted below
      // because several names now hold the opposite tone (e.g. `dark` is
      // the light text color on a dark surface).
      // ──────────────────────────────────────────────────────────────
      colors: {
        ac: {
          coral: '#6f9eb2', // accent — solid (buttons, active states, focus)
          'coral-light': '#a6cad9', // accent — bright (subtle highlights)
          'coral-dark': '#8fbccd', // accent — text/links on dark surfaces
          salmon: '#b9ced6',
          cream: '#1b1f25', // subtle tint / hover surface
          'warm-white': '#101317', // deepest inset background (inputs)
          card: '#16191e', // card / panel surface
          ink: '#0c0e11', // header, overlays, tooltips (near-black)
          dark: '#e9ecef', // primary text (light on dark)
          'dark-secondary': '#9aa4ad', // secondary text
          'med-gray': '#727b84', // muted icons / placeholder text
          'light-gray': '#272c33', // borders & dividers
          white: '#ffffff',
          success: '#7fbf9c', // status — light green on dark
          warning: '#d2a878',
        },
        wf: {
          bg: '#0c0e11', // code surface (matches studio ink)
          surface: '#15181c',
          border: '#272c33',
          text: '#e3e7ea',
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
        card: '0 1px 0 rgba(255,255,255,0.02), 0 12px 28px rgba(0,0,0,0.35)',
        cardhover: '0 1px 0 rgba(255,255,255,0.03), 0 18px 36px rgba(0,0,0,0.45)',
        menu: '0 24px 48px rgba(0,0,0,0.55)',
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
