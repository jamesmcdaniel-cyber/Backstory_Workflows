/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      // ──────────────────────────────────────────────────────────────
      // "Studio" — black theme, white accents (Vercel-style).
      // Pure-black canvas, surfaces defined by hairline borders rather
      // than fill, white as the sole accent. Token NAMES are retained
      // from the original light theme so the palette can be re-skinned by
      // swapping values here alone — no component churn. Several names now
      // hold the opposite tone (e.g. `dark` is the light text color, and
      // the `coral*` accent tokens are white).
      // ──────────────────────────────────────────────────────────────
      colors: {
        ac: {
          coral: '#ffffff', // accent — white fill (buttons, active states, focus, hover borders)
          'coral-light': '#ffffff', // accent — white (highlights)
          'coral-dark': '#ededed', // accent — text/links on black
          salmon: '#b9ced6',
          cream: '#1a1a1a', // subtle tint / hover surface
          'warm-white': '#000000', // deepest inset background (inputs)
          card: '#0a0a0a', // card / panel surface (near-black)
          ink: '#000000', // header, overlays, tooltips (pure black)
          dark: '#ededed', // primary text (near-white on black)
          'dark-secondary': '#a1a1a1', // secondary text
          'med-gray': '#787878', // muted icons / placeholder text
          'light-gray': '#2e2e2e', // borders & dividers (gray hairlines)
          white: '#ffffff',
          success: '#62c073', // status — green accent (used sparingly)
          warning: '#d2a878',
        },
        wf: {
          bg: '#0a0a0a', // code surface
          surface: '#141414',
          border: '#2e2e2e',
          text: '#ededed',
        },
      },
      fontFamily: {
        sans: ['"DM Sans"', '-apple-system', 'BlinkMacSystemFont', '"Segoe UI"', 'sans-serif'],
        // JetBrains Mono is the structural/technical voice (eyebrows, titles,
        // labels, data); DM Sans stays for prose. `display` is the headline alias.
        mono: ['"JetBrains Mono"', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
        display: ['"JetBrains Mono"', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
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
