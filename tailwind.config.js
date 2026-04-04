/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "#0a0a0a",
        surface: "#111111",
        'surface-light': "#1a1a1a",
        text: "#f5f5f5",
        secondary: "#9CA3AF",
        muted: "#D1D5DB",
        accent: "#DC2626",
        'accent-dark': "#B91C1C",
        gold: "#CA8A04",
        'gold-light': "#EAB308",
        border: "rgba(255,255,255,0.08)",
      },
      fontFamily: {
        display: ["var(--font-barlow-condensed)", "sans-serif"],
        body: ["var(--font-barlow)", "sans-serif"],
      },
      letterSpacing: {
        'widest-xl': '0.25em',
      },
    },
  },
  plugins: [],
};
