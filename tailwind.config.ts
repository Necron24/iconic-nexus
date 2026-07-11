import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}"
  ],
  theme: {
    extend: {
      colors: {
        ink: "#0B1020",
        panel: "#131A2B",
        lime: "#9EFF3A",
        cyan: "#57E6FF",
        soft: "#93A0B8"
      },
      boxShadow: {
        glow: "0 0 40px rgba(158,255,58,.15)"
      }
    }
  },
  plugins: []
};

export default config;
