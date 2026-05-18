import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // === LIGHT THEME ===
        // pitch-* mantiene su NOMBRE para no romper todos los className del proyecto,
        // pero su SEMÁNTICA está invertida: ahora 950 es la página (clara) y 700 es
        // el contraste más fuerte (gris medio). Compatibilidad sin sed gigante.
        pitch: {
          950: '#FFFFFF', // page bg (era #0B0B0D)
          900: '#F4F5F8', // tarjeta sutil / panel
          800: '#E6E8EC', // card principal / input bg
          700: '#DCDFE5'  // hover / separadores
        },
        // Acentos producto WorldCupX
        cup: {
          gold: '#B59A5A',
          green: '#3FA869',
          blue: '#5A78D5',  // signal blue oficial CoreX
          red: '#C2585F'
        },
        // Paleta CoreX corporativa actualizada al brand sheet light
        corex: {
          coal: '#1F232A',     // texto principal (semántica anterior era el bg oscuro)
          ink: '#1F232A',      // alias semántico para texto
          graphite: '#2A2E36',
          slate: '#5C6573',
          ash: '#8E98A2',      // texto terciario
          mist: '#A8AEB8',
          stone: '#C8C5CD',    // borders
          fog: '#DCDFE5',
          ivory: '#E6E8EC',
          paper: '#F4F5F8',
          white: '#FFFFFF',
          signal: '#5A78D5',
          lavender: '#B889C4',
          sky: '#EAF1F8'
        }
      },
      boxShadow: {
        glow: '0 10px 30px rgba(90, 120, 213, 0.18)',
        card: '0 6px 18px rgba(31, 35, 42, 0.08)',
        signal: '0 0 0 1px rgba(90, 120, 213, 0.25), 0 14px 30px rgba(90, 120, 213, 0.10)'
      },
      backgroundImage: {
        'stadium': 'linear-gradient(180deg,#FFFFFF,#F4F5F8)',
        'signal-fade': 'linear-gradient(135deg,#5A78D5,#8DA8FF)',
        'lavender-fade': 'linear-gradient(135deg,#B889C4,#D7B2E2)'
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
