/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        background: '#050505', // Deep black
        surface: '#0A0A0A',    // Card background
        'surface-highlight': '#111111', // Card hover/highlight
        border: '#222222',     // Subtle border
        primary: '#3b82f6',    // Blue accent
        success: '#22c55e',    // Green accent
        text: {
          primary: '#ffffff',
          secondary: '#a1a1aa', // Zinc 400
          muted: '#71717a',     // Zinc 500
        }
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
      },
    },
  },
  plugins: [],
  darkMode: 'class',
}
