/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,jsx,ts,tsx}",
    "./src/components/**/*.{js,jsx,ts,tsx}",
  ],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        rateUpGreen: "#009987",
        rateUpGreen20: "#00998714",
        rateUpLightGreen: "#EBF7F5",
        rateUpTextGray: "#7A8289",
        rateUpBlue: "#004F98",
        chatAvatarBlue: "#63a4f9",
        primaryBlue: "#1873E8",
        lightBlue: "#E3F2FD",
        lightgray: "#E2E5ED",
      },
    },
  },
  plugins: [],
};
