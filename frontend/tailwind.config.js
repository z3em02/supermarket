import colors from 'tailwindcss/colors';

/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
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