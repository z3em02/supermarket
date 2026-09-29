import colors from 'tailwindcss/colors';
import defaultTheme from 'tailwindcss/defaultTheme';

/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    // `xs` (large phones) is used across the UI; listed first so the
    // min-width rules cascade in order (xs < sm < md ...).
    screens: { xs: '480px', ...defaultTheme.screens },
    extend: {
      keyframes: {
        'fade-in': { from: { opacity: '0' }, to: { opacity: '1' } },
        'toast-in': { from: { opacity: '0', transform: 'translateY(6px)' }, to: { opacity: '1', transform: 'none' } },
        'drawer-in-end': { from: { transform: 'translateX(100%)' }, to: { transform: 'none' } },
        'drawer-in-start': { from: { transform: 'translateX(-100%)' }, to: { transform: 'none' } }
      },
      animation: {
        'fade-in': 'fade-in 150ms ease-out',
        'toast-in': 'toast-in 180ms ease-out',
        'drawer-in-end': 'drawer-in-end 220ms ease-out',
        'drawer-in-start': 'drawer-in-start 220ms ease-out'
      },
      colors: {
        // Semantic design tokens — use these, not raw palette names (see
        // README "Design system"). Each maps to a full Tailwind palette, so
        // `bg-primary-600` / `dark:text-danger-300` etc. all work.
        primary: colors.blue,     // admin back-office primary
        brand: colors.emerald,    // customer storefront primary
        success: colors.emerald,
        warning: colors.amber,
        danger: colors.rose,
        info: colors.sky,
        promo: colors.purple,
        // Dark-mode surface shades between Tailwind's gray steps
        gray: {
          650: '#2a3447',
          750: '#1a2234',
          850: '#111726',
          950: '#090d16'
        }
      }
    },
  },
  plugins: [],
}