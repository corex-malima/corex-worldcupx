import { useId } from 'react';

interface Props {
  size?: number;
  className?: string;
  withBackground?: boolean;
  title?: string;
}

/**
 * Isotipo CoreX/WorldCupX — SVG oficial del brand sheet (con gradients,
 * aro exterior con contornos, aro interior + segmento curvo derecho,
 * ticks diagonales como rectángulos, nodos blancos y slate-blue).
 *
 * Usa useId() para garantizar IDs únicos de gradients cuando se renderiza
 * más de una instancia simultáneamente en la página.
 */
export function WorldCupXMark({ size = 40, className, withBackground = true, title = 'WorldCupX' }: Props) {
  const reactId = useId();
  const outerFill = `${reactId}-outerFill`;
  const innerFill = `${reactId}-innerFill`;
  const nodeBlue = `${reactId}-nodeBlue`;
  const softShadow = `${reactId}-softShadow`;

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 1000 1000"
      width={size}
      height={size}
      role="img"
      aria-label={title}
      className={className}
      style={{ display: 'block', flexShrink: 0 }}
    >
      <title>{title}</title>
      <defs>
        <linearGradient id={outerFill} x1="250" y1="180" x2="820" y2="820" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#FFFFFF" />
          <stop offset="0.55" stopColor="#FAFBFC" />
          <stop offset="1" stopColor="#EFF2F4" />
        </linearGradient>
        <linearGradient id={innerFill} x1="385" y1="285" x2="750" y2="705" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#BAC3CB" />
          <stop offset="0.52" stopColor="#A3ADB6" />
          <stop offset="1" stopColor="#8E98A2" />
        </linearGradient>
        <radialGradient id={nodeBlue} cx="42%" cy="35%" r="70%">
          <stop offset="0" stopColor="#A7B6C4" />
          <stop offset="1" stopColor="#738596" />
        </radialGradient>
        <filter id={softShadow} x="-10%" y="-10%" width="120%" height="120%">
          <feDropShadow dx="0" dy="1.4" stdDeviation="1.6" floodColor="#101418" floodOpacity="0.16" />
        </filter>
      </defs>
      {withBackground && <rect width="1000" height="1000" rx="220" fill="#0B0B0D" />}
      <g filter={`url(#${softShadow})`}>
        {/* Aro exterior con contornos */}
        <path d="M 804.6 348.3 A 302.5 302.5 0 1 0 717.8 739.7" fill="none" stroke={`url(#${outerFill})`} strokeWidth="45" strokeLinecap="butt" />
        <path d="M 824.3 337.4 A 325.0 325.0 0 1 0 731.0 757.9" fill="none" stroke="#C6CBD0" strokeWidth="1.3" strokeLinecap="butt" />
        <path d="M 784.9 359.3 A 280.0 280.0 0 1 0 704.6 721.5" fill="none" stroke="#60676F" strokeWidth="1.4" strokeLinecap="butt" />
        <line x1="784.9" y1="359.3" x2="824.3" y2="337.4" stroke="#C6CBD0" strokeWidth="1.3" />
        <line x1="704.6" y1="721.5" x2="731.0" y2="757.9" stroke="#C6CBD0" strokeWidth="1.3" />

        {/* Aro interior principal */}
        <path d="M 675.8 384.6 A 187.5 187.5 0 1 0 648.5 643.6" fill="none" stroke="#77818B" strokeWidth="38" strokeLinecap="butt" />
        <path d="M 675.8 384.6 A 187.5 187.5 0 1 0 648.5 643.6" fill="none" stroke={`url(#${innerFill})`} strokeWidth="35" strokeLinecap="butt" />

        {/* Segmento curvo derecho separado */}
        <path d="M 687.0 400.6 A 187.5 187.5 0 0 1 695.1 585.1" fill="none" stroke="#77818B" strokeWidth="38" strokeLinecap="butt" />
        <path d="M 687.0 400.6 A 187.5 187.5 0 0 1 695.1 585.1" fill="none" stroke={`url(#${innerFill})`} strokeWidth="35" strokeLinecap="butt" />

        {/* Tic diagonal superior-derecho */}
        <polygon points="620 405 640 425 729 337 709 317" fill={`url(#${innerFill})`} stroke="#727C86" strokeWidth="2" />

        {/* Stem diagonal inferior-derecho */}
        <polygon points="616.5 585.6 635.7 566.9 708.5 641.2 689.3 659.9" fill={`url(#${innerFill})`} stroke="#727C86" strokeWidth="2" />

        {/* Núcleo blanco */}
        <circle cx="528.7" cy="498.1" r="90.3" fill="#FFFFFF" stroke="#B9BEC3" strokeWidth="2.2" />

        {/* Nodo blanco superior-izquierdo */}
        <circle cx="355.5" cy="402.4" r="38.4" fill="#FFFFFF" stroke="#B9BEC3" strokeWidth="2.2" />

        {/* Nodo slate inferior-derecho */}
        <circle cx="758.4" cy="682.8" r="50.4" fill={`url(#${nodeBlue})`} stroke="#586574" strokeWidth="2.4" />
      </g>
    </svg>
  );
}

/**
 * Variante monocromo (para footer / lockups en texto). Usa currentColor.
 * Versión simplificada sin gradients ni contornos para legibilidad.
 */
export function CoreXSymbol({ size = 24, className, title = 'CoreX' }: { size?: number; className?: string; title?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 1000 1000"
      width={size}
      height={size}
      role="img"
      aria-label={title}
      className={className}
    >
      <title>{title}</title>
      <path d="M 804.6 348.3 A 302.5 302.5 0 1 0 717.8 739.7" fill="none" stroke="currentColor" strokeWidth="45" strokeLinecap="butt" />
      <path d="M 675.8 384.6 A 187.5 187.5 0 1 0 648.5 643.6" fill="none" stroke="currentColor" strokeOpacity="0.55" strokeWidth="35" strokeLinecap="butt" />
      <path d="M 687.0 400.6 A 187.5 187.5 0 0 1 695.1 585.1" fill="none" stroke="currentColor" strokeOpacity="0.55" strokeWidth="35" strokeLinecap="butt" />
      <polygon points="620 405 640 425 729 337 709 317" fill="currentColor" fillOpacity="0.55" />
      <polygon points="616.5 585.6 635.7 566.9 708.5 641.2 689.3 659.9" fill="currentColor" fillOpacity="0.55" />
      <circle cx="528.7" cy="498.1" r="90.3" fill="currentColor" />
      <circle cx="355.5" cy="402.4" r="38.4" fill="currentColor" />
      <circle cx="758.4" cy="682.8" r="50.4" fill="currentColor" fillOpacity="0.6" />
    </svg>
  );
}
