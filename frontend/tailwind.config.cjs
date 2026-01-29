module.exports = {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        slate: {
          950: '#0f0f0f',
        }
      }
    },
  },
  plugins: [],
  darkMode: 'selector',
}
