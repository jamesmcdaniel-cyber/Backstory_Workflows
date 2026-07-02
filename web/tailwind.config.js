/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      // ──────────────────────────────────────────────────────────────
      // Backstory Design System — Core Product surface (light).
      // White page, Graphite text, Horizon Blue reserved for signal
      // (CTAs, links, the /// mark). Token NAMES are retained from the
      // original theme so the palette can be re-skinned by swapping
      // values here alone — no component churn. Source of truth:
      // "Backstory Design System" colors_and_type.css.
      // ──────────────────────────────────────────────────────────────
      colors: {
        ac: {
          coral: '#447C93', // accent — Horizon-500 (primary CTAs, focus, active states)
          'coral-light': '#7DACC0', // Horizon-300 (soft accent, decorative)
          'coral-dark': '#2B6178', // Horizon-600 (links, hover on CTAs)
          salmon: '#99C1D1', // Horizon-200 (marketing tint)
          cream: '#F1F2F5', // Graphite-100 — subtle tint / hover surface
          'warm-white': '#FAFAFA', // Graphite-50 — inset input background
          card: '#FFFFFF', // card / panel surface
          ink: '#FFFFFF', // header & sheet surface (white in product)
          dark: '#171721', // Graphite-900 — primary text
          'dark-secondary': '#55555E', // Graphite-700 — secondary text
          'med-gray': '#8E8E92', // Graphite-500 — muted icons / placeholders
          'light-gray': '#E3E3E4', // Graphite-200 — borders & dividers
          white: '#FFFFFF',
          success: '#008859', // Green-500 — status only
          warning: '#B38F00', // Yellow-700 — status only
          horizon: {
            50: '#EBF3F6',
            100: '#DBEBF2',
            200: '#99C1D1',
            300: '#7DACC0',
            500: '#447C93',
            600: '#2B6178',
            700: '#18485C',
            800: '#0A2F3F',
            900: '#021821',
          },
        },
        wf: {
          bg: '#F1F2F5', // code surface (light)
          surface: '#FFFFFF',
          border: '#E3E3E4',
          text: '#171721',
        },
      },
      fontFamily: {
        // KMR Waldenburg is the brand display + body voice (self-hosted);
        // Arimo is the licensed Google alternate. Chivo Mono carries the
        // all-caps eyebrows, micro-labels, and data cells.
        sans: ['"KMR Waldenburg"', 'Arimo', '-apple-system', 'BlinkMacSystemFont', '"Segoe UI"', 'sans-serif'],
        mono: ['"Chivo Mono"', '"Anonymous Pro"', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
        display: ['"KMR Waldenburg"', 'Arimo', '-apple-system', 'BlinkMacSystemFont', '"Segoe UI"', 'sans-serif'],
      },
      borderRadius: {
        xl: '12px', // product cards
        '2xl': '16px',
        '3xl': '20px',
      },
      boxShadow: {
        // Subtle, deep-blue-tinted (never gray) — DS --shadow-2/-3/-popover.
        card: '0 2px 6px rgba(13, 26, 51, 0.05), 0 1px 2px rgba(13, 26, 51, 0.05)',
        cardhover: '0 8px 24px rgba(13, 26, 51, 0.08), 0 2px 6px rgba(13, 26, 51, 0.05)',
        menu: '0 12px 32px rgba(13, 26, 51, 0.15)',
      },
      keyframes: {
        'fade-in': { from: { opacity: '0' }, to: { opacity: '1' } },
        'fade-up': { from: { opacity: '0', transform: 'translateY(8px)' }, to: { opacity: '1', transform: 'translateY(0)' } },
        'overlay-in': { from: { opacity: '0' }, to: { opacity: '1' } },
        'content-in': { from: { opacity: '0', transform: 'translate(-50%, -48%) scale(0.97)' }, to: { opacity: '1', transform: 'translate(-50%, -50%) scale(1)' } },
      },
      animation: {
        'fade-in': 'fade-in 0.2s ease-out both',
        'fade-up': 'fade-up 0.2s ease-out both',
        'overlay-in': 'overlay-in 0.15s ease-out both',
        'content-in': 'content-in 0.2s ease-out both',
      },
    },
  },
  plugins: [],
};
