/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        gold: {
          300: '#fcd96a',
          400: '#f5c842',
          500: '#d4a017',
          600: '#b8860b',
          700: '#8B6914',
        },
        dark: {
          900: '#0a0a0a',
          800: '#111111',
          700: '#1a1a1a',
          600: '#222222',
          500: '#2d2d2d',
          400: '#3d3d3d',
        }
      },
      fontFamily: {
        display: ['var(--font-display)', 'serif'],
        body: ['var(--font-body)', 'sans-serif'],
      },
      backgroundImage: {
        'gold-gradient': 'linear-gradient(135deg, #d4a017 0%, #f5c842 50%, #d4a017 100%)',
        'dark-gradient': 'linear-gradient(180deg, #0a0a0a 0%, #111111 100%)',
      },
      animation: {
        'fade-up': 'fadeUp 0.6s ease forwards',
        'shimmer': 'shimmer 2s infinite',
        'pulse-gold': 'pulseGold 2s ease-in-out infinite',
      },
      keyframes: {
        fadeUp: { '0%': { opacity: 0, transform: 'translateY(30px)' }, '100%': { opacity: 1, transform: 'translateY(0)' } },
        shimmer: { '0%': { backgroundPosition: '-200% 0' }, '100%': { backgroundPosition: '200% 0' } },
        pulseGold: { '0%,100%': { boxShadow: '0 0 20px rgba(212,160,23,0.3)' }, '50%': { boxShadow: '0 0 40px rgba(212,160,23,0.6)' } },
      }
    },
  },
  plugins: [],
};
