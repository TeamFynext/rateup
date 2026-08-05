/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/app/**/*.{js,jsx,ts,tsx}",
    "./src/components/**/*.{js,jsx,ts,tsx}",
  ],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Nunito_400Regular"],
        nunito: ["Nunito_400Regular"],
        light: ["Nunito_300Light"],
        medium: ["Nunito_500Medium"],
        semibold: ["Nunito_600SemiBold"],
        bold: ["Nunito_700Bold"],
        extrabold: ["Nunito_800ExtraBold"],
        black: ["Nunito_900Black"],
      },
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
        "chat-bubble-green":"#d2f8d2",
        slate: {
          950: "#091522", // brand bg
          900: "#0D1E32", // brand surface
          800: "rgba(255,255,255,0.08)",
          700: "rgba(255,255,255,0.12)",
        },
        gray: {
          900: "#091522", // brand bg
        },
      },
    },
  },
  plugins: [],
};
