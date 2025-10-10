/** Tailwind config (CommonJS) */
module.exports = {
  darkMode: ['class'],
  content: [
    './app/**/*.{ts,tsx,mdx}',
    './components/**/*.{ts,tsx,mdx}',
    './pages/**/*.{ts,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        'brand-black': '#0B0B0C',   // fixes: bg-brand-black
        'brand-gold':  '#F2C94C',
      },
    },
  },
  plugins: [],
  safelist: [
    'bg-brand-black', // ensure utility is kept even if only used via @apply
  ],
};
