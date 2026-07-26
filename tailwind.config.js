/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  darkMode: "class",
  theme: {
    extend: {
      spacing: {
        "4.5": "1.125rem",
        "5.5": "1.375rem",
        "6.5": "1.625rem",
        "7.5": "1.875rem",
        "8.5": "2.125rem",
        "9.5": "2.375rem",
      },
      fontFamily: {
        display: ["'Plus Jakarta Sans'", "system-ui", "sans-serif"],
        sans: ["'Inter'", "system-ui", "sans-serif"],
      },
      colors: {
        "orla-black": "#000000",
        "orla-white": "#ffffff",
        "orla-paper": "#fbfcf6",
        "orla-blue": "#0057ff",
        "orla-blue-deep": "#14237d",
        "orla-coral": "#ff5e40",
        "orla-coral-soft": "#fc9d80",
        neutral: {
          0: "#ffffff",
          50: "#fbfcf6",
          100: "#f5f5f5",
          200: "#f0f0f0",
          300: "#dfdfe0",
          400: "#d7dce0",
          500: "#aeaeb2",
          600: "#717177",
          700: "#474747",
          800: "#2a2a2a",
          900: "#141414",
          950: "#0a0a0a",
        },
        status: {
          success: "#198f51",
          warning: "#de7d02",
          error: "#d4453b",
          info: "#0057ff",
        },
        // Paleta fixa dos fluxos financeiros nos gráficos (Dashboard/Análise
        // Exploratória) — deliberadamente separada de `status.success`/`error`
        // (usados em badges/toasts/botões para semântica genérica de
        // sucesso/erro) para poder seguir o padrão financeiro clássico
        // (verde/vermelho vivos) sem alterar nada fora dos gráficos.
        flow: {
          entrada: "#10b981",
          saida: "#ef4444",
        },
      },
      borderRadius: {
        sm: "6px",
        md: "10px",
        lg: "16px",
        pill: "999px",
      },
      boxShadow: {
        md: "0 8px 30px rgba(0,0,0,0.12)",
      },
    },
  },
  plugins: [],
};
