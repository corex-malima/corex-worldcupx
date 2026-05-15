interface Props {
  size?: number;
  className?: string;
  withBackground?: boolean;
  title?: string;
}

/**
 * Mark CoreX/WorldCupX reconstruido fielmente del brand sheet:
 *   - Anillo C exterior (r=36, gap ~120° a las 3 en punto)
 *   - Anillo C interior más pequeño (r=20, mismo orientación)
 *   - Núcleo blanco central (r=7)
 *   - Satélite blanco arriba-izquierda (en ~130° desde el centro)
 *   - Satélite slate-blue abajo-derecha (en ~-30°, sobre el arco exterior)
 *
 * El rect dark de fondo se controla con withBackground.
 */
export function WorldCupXMark({ size = 40, className, withBackground = true, title = 'WorldCupX' }: Props) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 100 100"
      width={size}
      height={size}
      role="img"
      aria-label={title}
      className={className}
      style={{ display: 'block', flexShrink: 0 }}
    >
      <title>{title}</title>
      {withBackground && <rect width="100" height="100" rx="22" fill="#0B0B0D" />}
      {/* Anillo C exterior */}
      <path d="M 68 19 A 36 36 0 1 0 68 81" fill="none" stroke="#F5F4F1" strokeWidth="8" strokeLinecap="round" />
      {/* Anillo C interior */}
      <path d="M 60 33 A 20 20 0 1 0 60 67" fill="none" stroke="#F5F4F1" strokeWidth="5" strokeLinecap="round" />
      {/* Núcleo */}
      <circle cx="50" cy="50" r="7" fill="#F5F4F1" />
      {/* Satélite blanco superior-izquierda */}
      <circle cx="38" cy="36" r="4.5" fill="#F5F4F1" />
      {/* Satélite slate inferior-derecha */}
      <circle cx="76" cy="66" r="4.5" fill="#5C6F89" />
    </svg>
  );
}

export function CoreXSymbol({ size = 24, className, title = 'CoreX' }: { size?: number; className?: string; title?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 100 100"
      width={size}
      height={size}
      role="img"
      aria-label={title}
      className={className}
    >
      <title>{title}</title>
      <path d="M 68 19 A 36 36 0 1 0 68 81" fill="none" stroke="currentColor" strokeWidth="8" strokeLinecap="round" />
      <path d="M 60 33 A 20 20 0 1 0 60 67" fill="none" stroke="currentColor" strokeOpacity="0.55" strokeWidth="5" strokeLinecap="round" />
      <circle cx="50" cy="50" r="7" fill="currentColor" />
      <circle cx="38" cy="36" r="4.5" fill="currentColor" />
      <circle cx="76" cy="66" r="4.5" fill="currentColor" opacity="0.55" />
    </svg>
  );
}
