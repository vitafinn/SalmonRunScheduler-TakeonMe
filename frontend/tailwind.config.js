/** @type {import('tailwindcss').Config} */
export default {
  content: [ // Tell Tailwind where to look for class names
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {      
      fontFamily: {
      // Use the font name from your CSS @font-face rule as the key
      // The value is the font stack (same as your CSS variable)
      's1': ['Splatoon1', 'system-ui', 'sans-serif'],
      's2': ['Splatoon2', 'system-ui', 'sans-serif'],
    }
  }, // Your custom theme settings go here
  },
  plugins: [], // Any other Tailwind plugins go here
}