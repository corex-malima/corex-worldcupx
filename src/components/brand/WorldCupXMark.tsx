import { useId } from 'react';

interface Props {
  size?: number;
  className?: string;
  withBackground?: boolean;
  title?: string;
}

/**
 * Isotipo CoreX oficial — versión fiel al brand sheet de Loriva Intelligence.
 *
 * Composición:
 *   - C blanca abierta a la derecha (anillo externo)
 *   - Órbita interna punteada (ring dashed)
 *   - Núcleo blanco central
 *   - 3 nodos en la órbita (white-top, blue-right, white-bottom)
 *   - 1 nodo gris dentro del orbital izquierdo
 *
 * Usa useId() para garantizar IDs únicos cuando hay múltiples instancias.
 */
export function WorldCupXMark({ size = 40, className, withBackground = true, title = 'CoreX · WorldCupX' }: Props) {
  const reactId = useId();
  const ringId = `${reactId}-ring`;
  const blueId = `${reactId}-blue`;

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
        <linearGradient id={ringId} x1="100" y1="100" x2="900" y2="900" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#FFFFFF" />
          <stop offset="1" stopColor="#F1F3F6" />
        </linearGradient>
        <radialGradient id={blueId} cx="35%" cy="35%" r="75%">
          <stop offset="0" stopColor="#ff8fab" />
          <stop offset="1" stopColor="#fb6f92" />
        </radialGradient>
      </defs>

      {withBackground && <rect width="1000" height="1000" rx="220" fill="#0B0B0D" />}

      {/* C exterior — gran arco abierto a la derecha */}
      <path
        d="M 750 230 A 360 360 0 1 0 750 770"
        fill="none"
        stroke={`url(#${ringId})`}
        strokeWidth="110"
        strokeLinecap="round"
      />

      {/* Órbita interna punteada */}
      <circle
        cx="500"
        cy="500"
        r="195"
        fill="none"
        stroke="#FFFFFF"
        strokeOpacity="0.45"
        strokeWidth="3"
        strokeDasharray="6 9"
      />

      {/* Núcleo central blanco */}
      <circle cx="500" cy="500" r="62" fill="#FFFFFF" />

      {/* Nodo superior en la órbita (blanco) */}
      <circle cx="500" cy="305" r="20" fill="#FFFFFF" />

      {/* Nodo izquierdo dentro de la órbita (gris claro) */}
      <circle cx="332" cy="500" r="18" fill="#A8AFB7" />

      {/* Nodo derecho sobre la órbita (azul CoreX con halo oscuro) */}
      <circle cx="695" cy="500" r="42" fill="#0B0B0D" />
      <circle cx="695" cy="500" r="32" fill={`url(#${blueId})`} />

      {/* Nodo inferior en la órbita (blanco) */}
      <circle cx="500" cy="695" r="20" fill="#FFFFFF" />
    </svg>
  );
}

/**
 * Variante monocromo para footer / lockups en texto.
 * Usa currentColor con opacidades parciales para los detalles.
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
      <path d="M 750 230 A 360 360 0 1 0 750 770" fill="none" stroke="currentColor" strokeWidth="110" strokeLinecap="round" />
      <circle cx="500" cy="500" r="195" fill="none" stroke="currentColor" strokeOpacity="0.45" strokeWidth="3" strokeDasharray="6 9" />
      <circle cx="500" cy="500" r="62" fill="currentColor" />
      <circle cx="500" cy="305" r="20" fill="currentColor" />
      <circle cx="332" cy="500" r="18" fill="currentColor" fillOpacity="0.6" />
      <circle cx="695" cy="500" r="32" fill="currentColor" fillOpacity="0.85" />
      <circle cx="500" cy="695" r="20" fill="currentColor" />
    </svg>
  );
}
