import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // road-sign green rather than the usual indigo/purple
        brand: {
          50: '#eef7f1',
          100: '#d5ecdc',
          600: '#1f7a45',
          700: '#186238',
          800: '#154f2e',
        },
        ink: '#1c1f1d',
      },
      fontFamily: {
        sans: ['"Segoe UI"', 'system-ui', '-apple-system', 'Roboto', 'sans-serif'],
      },
    },
  },
  plugins: [],
};

export default config;
