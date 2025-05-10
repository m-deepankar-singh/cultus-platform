import type { Config } from "tailwindcss"

const config = {
  darkMode: ["class"],
  content: [
    "./pages/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./app/**/*.{ts,tsx}",
    "./src/**/*.{ts,tsx}",
    "*.{js,ts,jsx,tsx,mdx}",
  ],
  prefix: "",
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'gradient-conic': 'conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))',
        'gradient-shine': 'linear-gradient(45deg, transparent 25%, rgba(255,255,255,0.1) 50%, transparent 75%)',
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
        "float": {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-10px)" },
        },
        "pulse-glow": {
          "0%, 100%": { 
            opacity: "0.3",
            boxShadow: "0 0 5px rgba(var(--primary) / 0.3)"
          },
          "50%": { 
            opacity: "0.8",
            boxShadow: "0 0 15px rgba(var(--primary) / 0.5)"
          },
        },
        "gradient-shift": {
          "0%": { backgroundPosition: "0% 50%" },
          "50%": { backgroundPosition: "100% 50%" },
          "100%": { backgroundPosition: "0% 50%" },
        },
        "page-fade-in": {
          "0%": { 
            opacity: "0",
            transform: "translateY(20px)"
          },
          "100%": { 
            opacity: "1",
            transform: "translateY(0)"
          },
        },
        "page-fade-out": {
          "0%": { 
            opacity: "1",
            transform: "translateY(0)"
          },
          "100%": { 
            opacity: "0",
            transform: "translateY(-20px)"
          },
        },
        "page-slide-in": {
          "0%": { 
            opacity: "0",
            transform: "translateX(30px)"
          },
          "100%": { 
            opacity: "1",
            transform: "translateX(0)"
          },
        },
        "overlay-reveal": {
          "0%": { 
            transform: "scaleY(1)",
            transformOrigin: "top"
          },
          "100%": { 
            transform: "scaleY(0)",
            transformOrigin: "bottom"
          },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "float": "float 6s ease-in-out infinite",
        "pulse-glow": "pulse-glow 4s ease-in-out infinite",
        "gradient-shift": "gradient-shift 8s ease infinite",
        "page-fade-in": "page-fade-in 0.6s ease forwards",
        "page-fade-out": "page-fade-out 0.4s ease forwards",
        "page-slide-in": "page-slide-in 0.5s ease forwards",
        "overlay-reveal": "overlay-reveal 0.7s ease forwards",
      },
      backdropFilter: {
        'none': 'none',
        'blur': 'blur(8px)',
      },
    },
  },
  plugins: [
    require("tailwindcss-animate"),
    // Add plugin for backdrop filters
    function({ addUtilities }: { addUtilities: (utilities: Record<string, Record<string, string>>) => void }) {
      const newUtilities = {
        '.backdrop-blur-sm': {
          backdropFilter: 'blur(4px)',
        },
        '.backdrop-blur': {
          backdropFilter: 'blur(8px)',
        },
        '.backdrop-blur-md': {
          backdropFilter: 'blur(12px)',
        },
        '.backdrop-blur-lg': {
          backdropFilter: 'blur(16px)',
        },
        '.backdrop-blur-xl': {
          backdropFilter: 'blur(24px)',
        },
        '.backdrop-blur-2xl': {
          backdropFilter: 'blur(40px)',
        },
        '.backdrop-blur-3xl': {
          backdropFilter: 'blur(64px)',
        },
      }
      addUtilities(newUtilities)
    }
  ],
} satisfies Config

export default config
