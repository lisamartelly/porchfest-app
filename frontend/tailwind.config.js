/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Uptown Porchfest color palette
        'sky-blue': '#a5d7f3',
        'neon': '#dfff9c',
        'cream': '#fafb9d',
        'almond': 'blanchedalmond',
        'teal': {
          DEFAULT: 'rgb(21, 172, 172)',
          dark: 'rgb(18, 145, 145)',
        },
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
        'forest': {
          50: '#f3f6f3',
          100: '#e3ebe3',
          200: '#c8d7c8',
          300: '#a0b9a1',
          400: '#749576',
          500: '#537855',
          600: '#3f5f42',
          700: '#334c36',
          800: '#2b3e2d',
          900: '#243326',
          950: '#111c13',
        },
      },
      fontFamily: {
        'display': ['Carena', 'serif'],
        'body': ['Montserrat', 'sans-serif'],
      },
      borderRadius: {
        'fancy': '60px 20px',
        'fancy-top': '60px 20px 0 0',
      },
    },
  },
  plugins: [],
}
