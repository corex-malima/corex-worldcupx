import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        pitch: {
          950: '#061224',
          900: '#0b1f38',
          800: '#123456',
          700: '#1b4f7d'
        },
        cup: {
          gold: '#f4c95d',
          green: '#22c55e',
          blue: '#38bdf8',
          red: '#fb7185'
        }
      },
      boxShadow: {
        glow: '0 24px 80px rgba(56, 189, 248, 0.22)'
      },
      backgroundImage: {
        'stadium': 'radial-gradient(circle at 18% 18%, rgba(56,189,248,.20), transparent 30%), radial-gradient(circle at 82% 5%, rgba(96,165,250,.14), transparent 32%), linear-gradient(135deg,#061224,#0b1f38 48%,#111c32)'
      },
      animation: {
        float: 'float 5s ease-in-out infinite',
        pulseSoft: 'pulseSoft 2.4s ease-in-out infinite'
      },
      keyframes: {
        float: {
          '0%,100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-7px)' }
        },
        pulseSoft: {
          '0%,100%': { opacity: '1' },
          '50%': { opacity: '.7' }
        }
      }
    }
  },
  plugins: []
};

export default config;
