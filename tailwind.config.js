/** @type {import('tailwindcss').Config} */
export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: {
          DEFAULT: "#14171A",
          soft: "#4A5250",
        },
        paper: {
          DEFAULT: "#FFFFFF",
          dark: "#101312",
        },
        surface: {
          DEFAULT: "#F5F6F4",
          dark: "#1A1E1C",
        },
        line: {
          DEFAULT: "#E1E4E0",
          dark: "#2A302D",
        },
        clinic: {
          red: "#C23B26",
          "red-dark": "#E05038",
          green: "#2F8F5B",
          "green-soft": "#E3F3EA",
          "green-soft-dark": "#173226",
          "green-dark": "#49B87D",
        },
      },
      fontFamily: {
        display: ["Archivo", "system-ui", "sans-serif"],
        sans: ["IBM Plex Sans", "system-ui", "sans-serif"],
        mono: ["IBM Plex Mono", "ui-monospace", "monospace"],
      },
      borderRadius: {
        sm: "4px",
        DEFAULT: "6px",
        md: "8px",
        lg: "10px",
      },
      boxShadow: {
        panel: "0 1px 2px 0 rgb(0 0 0 / 0.04)",
        pop: "0 8px 24px -8px rgb(0 0 0 / 0.18)",
      },
      keyframes: {
        "toast-in": {
          "0%": { transform: "translateY(-8px)", opacity: "0" },
          "100%": { transform: "translateY(0)", opacity: "1" },
        },
        "fade-in": {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        "scale-in": {
          "0%": { opacity: "0", transform: "scale(0.97)" },
          "100%": { opacity: "1", transform: "scale(1)" },
        },
      },
      animation: {
        "toast-in": "toast-in 0.22s cubic-bezier(0.16,1,0.3,1)",
        "fade-in": "fade-in 0.15s ease-out",
        "scale-in": "scale-in 0.16s cubic-bezier(0.16,1,0.3,1)",
      },
    },
  },
  plugins: [],
};
