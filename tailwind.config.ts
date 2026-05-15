import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        pitch: {
          950: '#081525',
          900: '#0f2235',
          800: '#1b3348',
          700: '#2a4963'
        },
        cup: {
          gold: '#8fa3b8',
          green: '#4f9d72',
          blue: '#5b9bd5',
          red: '#d86f7a'
        },
        corex: {
          coal: '#0B0B0D',
          graphite: '#1A1B1E',
          bone: '#F5F4F1',
          slate: '#5C6F89',
          mist: '#8A9099'
        }
      },
      boxShadow: {
        glow: '0 10px 30px rgba(8, 21, 37, 0.24)',
        card: '0 12px 34px rgba(0, 0, 0, 0.18)'
      },
      backgroundImage: {
        'stadium': 'linear-gradient(180deg,#081525,#0b1a2d)'
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
