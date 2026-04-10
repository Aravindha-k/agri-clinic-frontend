
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        primary: "#15803d",
        "primary-dark": "#14532d",
        "primary-light": "#22c55e",
        secondary: "#059669",
        accent: "#10b981",
        "agri-light": "#ecfdf5",
        "agri-dim": "#f0fdf8",
        "agri-brown": "#8b6f47",
        surface: "#ffffff",
        "surface-dim": "#f0f4f8",
        "surface-mid": "#e8f0ed",
      },
      fontFamily: {
        display: ["Sora", "system-ui", "sans-serif"],
        body: ["Inter", "system-ui", "sans-serif"],
      },
      boxShadow: {
        card: "0 0 0 1px rgba(15,118,110,0.06), 0 2px 8px rgba(0,0,0,0.05), 0 8px 24px rgba(0,0,0,0.06)",
        "card-hover": "0 0 0 1px rgba(15,118,110,0.10), 0 4px 16px rgba(0,0,0,0.08), 0 16px 40px rgba(0,0,0,0.10)",
        "card-green": "0 0 0 1px rgba(16,185,129,0.15), 0 4px 20px rgba(16,185,129,0.12)",
        glow: "0 0 20px rgba(34,197,94,0.20)",
        "glow-md": "0 0 40px rgba(34,197,94,0.15)",
        "btn-primary": "0 2px 8px rgba(21,128,61,0.30), 0 1px 2px rgba(0,0,0,0.10)",
        glass: "0 4px 24px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)",
      },
      backgroundImage: {
        "gradient-primary": "linear-gradient(135deg, #16a34a 0%, #15803d 100%)",
        "gradient-hero": "linear-gradient(155deg, #042014 0%, #0f2d1c 35%, #15803d 75%, #16a34a 100%)",
        "gradient-sidebar": "linear-gradient(180deg, #0a1f14 0%, #0f2d1c 40%, #134d2b 100%)",
        "gradient-card": "linear-gradient(135deg, #f0fdf8 0%, #f8fffc 100%)",
        "grid-pattern": "linear-gradient(rgba(255,255,255,.06) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.06) 1px, transparent 1px)",
      },
      animation: {
        "leaf-float": "leafFloat 3s ease-in-out infinite",
        "pulse-grow": "pulseGrow 2s ease-in-out infinite",
        "fade-in": "fadeIn 0.35s ease-out",
        "fade-up": "fadeUp 0.4s ease-out",
        "slide-in": "slideIn 0.3s ease-out",
        "scale-in": "scaleIn 0.25s ease-out",
        "spin-slow": "spin 1.5s linear infinite",
      },
      keyframes: {
        leafFloat: { "0%, 100%": { transform: "translateY(0px) rotate(0deg)", opacity: "0.7" }, "50%": { transform: "translateY(-20px) rotate(5deg)", opacity: "1" } },
        pulseGrow: { "0%, 100%": { transform: "scale(1)" }, "50%": { transform: "scale(1.05)" } },
        fadeIn: { from: { opacity: "0" }, to: { opacity: "1" } },
        fadeUp: { from: { opacity: "0", transform: "translateY(8px)" }, to: { opacity: "1", transform: "translateY(0)" } },
        slideIn: { from: { opacity: "0", transform: "translateX(16px)" }, to: { opacity: "1", transform: "translateX(0)" } },
        scaleIn: { from: { opacity: "0", transform: "scale(0.95)" }, to: { opacity: "1", transform: "scale(1)" } },
      },
    },
  },
  plugins: [],
}
