/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,ts,jsx,tsx}',
    './components/**/*.{js,ts,jsx,tsx}'
  ],
  theme: {
    extend: {
      colors: {
        // Primary colour palette used throughout the site. Update as needed.
        primary: '#0A192F',
        secondary: '#1E3A8A',
        accent: '#1E40AF',
        highlight: '#38BDF8'
      }
    }
  },
  plugins: []
};