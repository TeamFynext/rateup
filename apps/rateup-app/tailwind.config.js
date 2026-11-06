/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/app/**/*.{js,jsx,ts,tsx}", "./src/components/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      // Design System V2, matching `rateup-ui/src/styles/foundation.css`: Instrument
      // Sans for body and UI, Figtree for display. These classes set `fontFamily`, not
      // `fontWeight` — `font-semibold` names a face, it does not embolden one.
      fontFamily: {
        sans: ["InstrumentSans_400Regular"],
        // The web keeps `--font-nunito` as the historical alias for the *display* face.
        // Unused in this app, aliased the same way so markup copied across matches.
        nunito: ["Figtree_800ExtraBold"],
        light: ["Figtree_300Light"],
        medium: ["InstrumentSans_500Medium"],
        semibold: ["InstrumentSans_600SemiBold"],
        bold: ["InstrumentSans_700Bold"],
        extrabold: ["Figtree_800ExtraBold"],
        black: ["Figtree_900Black"],
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
        "chat-bubble-green": "#d2f8d2",
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
