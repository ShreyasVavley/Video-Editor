/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "#0d0f12",
        surface: "#16191f",
        "surface-raised": "#1e222b",
        "surface-border": "#2a2f3d",
        brand: {
          50: "#eef2ff",
          100: "#e0e7ff",
          500: "#6366f1",
          600: "#4f46e5",
          700: "#4338ca",
        },
        timeline: {
          bg: "#11141a",
          track: "#181c24",
          ruler: "#1c202a",
          playhead: "#ef4444",
          video: "#3b82f6",
          audio: "#10b981",
          text: "#f59e0b",
        }
      },
    },
  },
  plugins: [],
};
