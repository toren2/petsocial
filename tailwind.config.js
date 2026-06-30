export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        'ps-purple':       '#7C3AED',
        'ps-purple-light': '#EDE9FE',
        'ps-teal':         '#0F9B8E',
        'ps-teal-light':   '#E0F7F4',
        'ps-pink':         '#EC4899',
        'ps-bg':           '#F8F7FF',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}