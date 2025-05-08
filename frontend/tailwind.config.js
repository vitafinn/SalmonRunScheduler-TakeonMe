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
      },
      keyframes: {
        // Define keyframes for pulsing the highlight shadow
        'highlight-pulse': {
          '0%, 100%': {
            'box-shadow': '0 0 12px 3px rgba(250, 204, 21, 0.4)', // Adjust color (yellow-400), spread, opacity
          },
          '50%': {
            // Slightly more intense shadow in the middle of the pulse
            'box-shadow': '0 0 20px 8px rgba(250, 204, 21, 0.55)', 
          }
        }
      },
      // --- Link Keyframes to Animation Utilities ---
      animation: {
        'highlight-pulse': 'highlight-pulse 2.5s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        // 'opacity-pulse': 'opacity-pulse 2s ease-in-out infinite',
      }
    }, 
  },
  plugins: [], 
}