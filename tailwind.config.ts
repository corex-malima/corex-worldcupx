import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        pitch: {
          950: '#06110d',
          900: '#071b14',
          800: '#0b2b20',
          700: '#124331'
        },
        cup: {
          gold: '#f6c453',
          green: '#1fbf75',
          blue: '#4f8cff',
          red: '#ef476f'
        }
      },
      boxShadow: {
        glow: '0 24px 80px rgba(31, 191, 117, 0.20)'
      },
      backgroundImage: {
        'stadium': 'radial-gradient(circle at 20% 20%, rgba(31,191,117,.22), transparent 28%), radial-gradient(circle at 80% 5%, rgba(246,196,83,.18), transparent 30%), linear-gradient(135deg,#06110d,#071b14 45%,#0b2139)'
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
