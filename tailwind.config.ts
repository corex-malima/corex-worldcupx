import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Backgrounds CoreX (gris carbón corporativo, no azul deportivo)
        pitch: {
          950: '#0B0B0D', // base brand dark
          900: '#141519',
          800: '#1E1F25',
          700: '#2C2E37'
        },
        // Acentos del producto WorldCupX (puente entre brand y deporte)
        cup: {
          gold: '#C9B27A',
          green: '#5BB582',
          blue: '#5A78D5',   // signal blue oficial CoreX
          red: '#D86F7A'
        },
        // Paleta CoreX corporativa (brand sheet)
        corex: {
          coal: '#0B0B0D',
          graphite: '#1A1B1E',
          ivory: '#F5F4F1',
          slate: '#5C6F89',
          mist: '#8A9099',
          signal: '#5A78D5',    // azul principal (REVERSE · SIGNAL)
          lavender: '#B589C4',  // violeta (status pending)
          sky: '#EAF1F8'        // azul claro (status sq-50)
        }
      },
      boxShadow: {
        glow: '0 10px 30px rgba(90, 120, 213, 0.18)',
        card: '0 12px 34px rgba(0, 0, 0, 0.22)',
        signal: '0 0 0 1px rgba(90, 120, 213, 0.35), 0 14px 30px rgba(90, 120, 213, 0.15)'
      },
      backgroundImage: {
        'stadium': 'linear-gradient(180deg,#0B0B0D,#141519)',
        'signal-fade': 'linear-gradient(135deg,#5A78D5,#8DA8FF)'
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
