const { fontFamily } = require("tailwindcss/defaultTheme");

module.exports = {
  mode: "jit",
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{vue,js,ts,jsx,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Inter var", ...fontFamily.sans],
      },
      borderRadius: {
        DEFAULT: "8px",
        secondary: "4px",
        container: "12px",
      },
      boxShadow: {
        DEFAULT: "0 1px 4px rgba(0, 0, 0, 0.1)",
        hover: "0 2px 8px rgba(0, 0, 0, 0.12)",
        "dark-card": "0 4px 12px rgba(0, 0, 0, 0.3)",
      },
      backgroundImage: {
        'dark-gradient': 'linear-gradient(135deg, #2D3748 0%, #1A202C 25%, #FF6B35 50%, #FFD93D 75%, #FF6B35 100%)',
        'iconnectit-gradient': 'linear-gradient(135deg, #2D3748 0%, #FF6B35 50%, #FFD93D 100%)',
      },
      colors: {
        primary: {
          DEFAULT: "#F85E00", // iConnectIT Orange (updated)
          hover: "#E55500",
        },
        secondary: {
          DEFAULT: "#6B7280",
          hover: "#4B5563",
        },
        accent: {
          DEFAULT: "#FFD93D", // iConnectIT Yellow
          hover: "#E6C335",
        },
        purple: {
          timer: "#FF6B35", // Use orange instead of purple for dark mode
          "timer-hover": "#E55A2B",
        },
        iconnectit: {
          orange: "#FF6B35",
          "orange-hover": "#E55A2B",
          "orange-light": "#FF8A5C",
          yellow: "#FFD93D",
          "yellow-hover": "#E6C335",
          "yellow-light": "#FFE066",
          dark: "#2D3748",
          "dark-lighter": "#4A5568",
          "dark-darker": "#1A202C",
        },
      },
      spacing: {
        "form-field": "16px",
        section: "32px",
      },
    },
  },
  variants: {
    extend: {
      boxShadow: ["hover", "active", "dark"],
    },
  },
};
