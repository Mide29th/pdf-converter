/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./src/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        "primary": "#0F172A",
        "on-primary": "#FFFFFF",
        "secondary": "#3B82F6",
        "background": "#F8FAFC",
        "surface": "#FFFFFF",
        "outline": "#E2E8F0",
        "on-surface-variant": "#64748B"
      },
      fontFamily: {
        "sans": ["Manrope", "sans-serif"],
        "headline": ["Manrope", "sans-serif"],
      },
    },
  },
  plugins: [],
}
