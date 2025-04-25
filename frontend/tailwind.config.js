/** @type {import('tailwindcss').Config} */
export default {
  content: [ // Tell Tailwind where to look for class names
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {}, // Your custom theme settings go here
  },
  plugins: [], // Any other Tailwind plugins go here
}