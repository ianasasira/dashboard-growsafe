import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: '#16a34a', secondary: '#0f172a', accent: '#22c55e', danger: '#dc2626', warning: '#d97706', info: '#2563eb', background: '#f8fafc', sidebar: '#0f172a'
      }
    }
  },
  plugins: []
};
export default config;
