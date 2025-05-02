/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,jsx,ts,tsx}",
    "./src/components/**/*.{js,jsx,ts,tsx}" 
  ],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
        colors: {
          rateUpGreen: "#009987",
          rateUpGreen20:"#00998714",
        },
    },
  },
  plugins: [],
}
