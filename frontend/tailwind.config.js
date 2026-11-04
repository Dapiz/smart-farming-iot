/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,jsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50:  '#f0fdf4',
          100: '#dcfce7',
          200: '#bbf7d0',
          300: '#86efac',
          400: '#4ade80',
          500: '#22c55e',
          600: '#16a34a',
          700: '#15803d',
          800: '#166534',
          900: '#14532d',
        },
        accent: {
          400: '#2dd4bf',
          500: '#14b8a6',
          600: '#0d9488',
          700: '#0f766e',
          800: '#115e59',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      backgroundImage: {
        'gradient-primary': 'linear-gradient(135deg, #16a34a 0%, #0d9488 100%)',
        'gradient-primary-soft': 'linear-gradient(135deg, #f0fdf4 0%, #ccfbf1 100%)',
        'gradient-mesh': 'radial-gradient(at 20% 20%, #bbf7d0 0%, transparent 50%), radial-gradient(at 80% 0%, #99f6e4 0%, transparent 50%), radial-gradient(at 0% 100%, #a7f3d0 0%, transparent 50%)',
        'gradient-sidebar': 'linear-gradient(180deg, #166534 0%, #115e59 100%)',
        'gradient-card': 'linear-gradient(135deg, #ffffff 0%, #f9fafb 100%)',
      },
      boxShadow: {
        'soft': '0 2px 8px -2px rgba(0, 0, 0, 0.06)',
        'glow': '0 0 20px rgba(34, 197, 94, 0.15)',
        'glow-teal': '0 0 20px rgba(20, 184, 166, 0.15)',
        'card': '0 1px 3px rgba(0, 0, 0, 0.04), 0 1px 2px rgba(0, 0, 0, 0.06)',
      },
      animation: {
        'fade-in': 'fadeIn 0.3s ease-out',
        'slide-up': 'slideUp 0.4s ease-out',
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: 0 },
          '100%': { opacity: 1 },
        },
        slideUp: {
          '0%': { transform: 'translateY(10px)', opacity: 0 },
          '100%': { transform: 'translateY(0)', opacity: 1 },
        },
      },
    },
  },
  plugins: [],
}