import type { Config } from "tailwindcss";

export default {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        'pastel-green': '#B2E4C8',
        'pastel-green-dark': '#99D4B5',
        'pastel-blue': '#B3D9FF',
        'pastel-blue-dark': '#99C9F2',
        'pastel-red': '#FFB3B3',
        'pastel-red-dark': '#E69999',
      },
    },
  },
  plugins: [],
} satisfies Config;
