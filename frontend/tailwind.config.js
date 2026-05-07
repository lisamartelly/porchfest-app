/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'system-ui', 'sans-serif'],
      },
      colors: {
        'porch': {
          50: '#fdf8f3',
          100: '#faeee1',
          200: '#f4dbc3',
          300: '#ecc29a',
          400: '#e2a06f',
          500: '#d9854d',
          600: '#cb6f42',
          700: '#a95838',
          800: '#874833',
          900: '#6d3c2c',
          950: '#3a1d15',
        },
      },
    },
  },
  plugins: [],
}
