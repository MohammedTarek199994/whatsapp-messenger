/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        wa: {
          green: '#25D366',
          dark: '#128C7E',
          teal: '#075E54',
          light: '#DCF8C6',
          bg: '#ECE5DD',
          chat: '#0B141A',
          sidebar: '#111B21',
          input: '#2A3942',
          hover: '#202C33'
        }
      }
    }
  },
  plugins: []
};
