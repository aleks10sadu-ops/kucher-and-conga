/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      // Дизайн-система «Перевёрнутый лес» — снята с зала Conga.
      colors: {
        forest: {
          DEFAULT: "#182620",
          deep: "#16221B",
          mid: "#22352A",
          ink: "#0F1411",
        },
        cream: "#F4F7F2",
        terracotta: {
          DEFAULT: "#AC4823",
          dark: "#8F3A1B",
        },
        brass: "#C29455",
        oxblood: "#7A2E26",
        bark: "#1B140E",
      },
      fontFamily: {
        display: ["var(--font-display)", "Georgia", "serif"],
        body: ["var(--font-body)", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};
