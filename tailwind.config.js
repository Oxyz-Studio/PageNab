/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{tsx,ts,jsx,js}"],
  theme: {
    extend: {
      colors: {
        neu: {
          base: "#e0e5ec",
          dark: "#a3b1c6",
          light: "#ffffff",
          accent: "#6366f1",
          "accent-soft": "#eef2ff",
          text1: "#2d3142",
          text2: "#6b7280",
          success: "#10b981",
          error: "#ef4444",
          warning: "#f59e0b",
        },
      },
      boxShadow: {
        "neu-raised": "6px 6px 14px #a3b1c6, -6px -6px 14px #ffffff",
        "neu-raised-sm": "3px 3px 7px #a3b1c6, -3px -3px 7px #ffffff",
        "neu-inset": "inset 4px 4px 10px #a3b1c6, inset -4px -4px 10px #ffffff",
        "neu-inset-sm": "inset 2px 2px 5px #a3b1c6, inset -2px -2px 5px #ffffff",
        "neu-pressed": "inset 3px 3px 8px #a3b1c6, inset -1px -1px 4px #ffffff",
        "neu-accent": "4px 4px 12px rgba(99, 102, 241, 0.4), -4px -4px 12px #ffffff",
      },
    },
  },
  plugins: [],
}
