/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{ts,tsx,html}'],
  theme: {
    extend: {
      colors: {
        magenta: '#8B1E5C',
        purple: '#4B2A8A',
      },
      fontFamily: {
        mono: ['DM Mono', 'Geist Mono', 'ui-monospace', 'monospace'],
        sans: ['Inter', 'Hiragino Sans', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
