module.exports = {
  content: [
    "./apps/**/*.{js,ts,jsx,tsx,html}",
    "./libs/**/*.{js,ts,jsx,tsx,html}",
  ],
  theme: {
    extend: {
      colors: {
        'accent-primary': '#38bdf8',
        'accent-secondary': '#f43f5e',
        'bg-dark': '#0f172a',
      },
      animation: {
        'glow': 'glow 2s ease-in-out infinite',
      },
      keyframes: {
        glow: {
          '0%, 100%': { opacity: 0.8, filter: 'brightness(1)' },
          '50%': { opacity: 1, filter: 'brightness(1.5)' },
        },
      },
    },
  },
  plugins: [],
}
