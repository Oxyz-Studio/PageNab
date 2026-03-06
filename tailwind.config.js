/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{tsx,ts,jsx,js}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Inter", "-apple-system", "BlinkMacSystemFont", "Segoe UI", "Roboto", "sans-serif"],
      },
      colors: {
        bg: {
          primary: "#ffffff",
          secondary: "#f9fafb",
          tertiary: "#f3f4f6",
        },
        border: {
          primary: "#e5e7eb",
          secondary: "#d1d5db",
        },
        text: {
          primary: "#111827",
          secondary: "#6b7280",
          tertiary: "#9ca3af",
        },
        accent: {
          DEFAULT: "#6366f1",
          hover: "#4f46e5",
          soft: "#eef2ff",
        },
        success: {
          DEFAULT: "#10b981",
          soft: "#ecfdf5",
        },
        error: {
          DEFAULT: "#ef4444",
          soft: "#fef2f2",
        },
        warning: "#f59e0b",
      },
      boxShadow: {
        sm: "0 1px 2px 0 rgba(0, 0, 0, 0.05)",
        md: "0 4px 6px -1px rgba(0, 0, 0, 0.07), 0 2px 4px -2px rgba(0, 0, 0, 0.05)",
      },
    },
  },
  plugins: [],
}
