interface Props {
  size?: number;
  className?: string;
  withBackground?: boolean;
  title?: string;
}

/**
 * Mark CoreX/WorldCupX — geometría fiel al brand sheet:
 *   - Anillo C exterior blanco (r=36, stroke=7) con gap tilted upper-right (de ~1 a ~4 en punto).
 *   - Anillo C interior gris medio #5A5D62 (r=20, stroke=4.5) — "ghost arc" detrás del exterior.
 *   - Núcleo blanco central (r=8).
 *   - Satélite blanco arriba-izquierda en (35, 35).
 *   - Satélite slate-blue al final del arco exterior en (78, 66).
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
      <path d="M 59 15 A 36 36 0 1 0 82 67" fill="none" stroke="#F5F4F1" strokeWidth="7" strokeLinecap="round" />
      <path d="M 55 32 A 20 20 0 1 0 67 60" fill="none" stroke="#5A5D62" strokeWidth="4.5" strokeLinecap="round" />
      <circle cx="50" cy="50" r="8" fill="#F5F4F1" />
      <circle cx="35" cy="35" r="4" fill="#F5F4F1" />
      <circle cx="78" cy="66" r="4.2" fill="#5C6F89" />
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
      <path d="M 59 15 A 36 36 0 1 0 82 67" fill="none" stroke="currentColor" strokeWidth="7" strokeLinecap="round" />
      <path d="M 55 32 A 20 20 0 1 0 67 60" fill="none" stroke="currentColor" strokeOpacity="0.45" strokeWidth="4.5" strokeLinecap="round" />
      <circle cx="50" cy="50" r="8" fill="currentColor" />
      <circle cx="35" cy="35" r="4" fill="currentColor" />
      <circle cx="78" cy="66" r="4.2" fill="currentColor" opacity="0.6" />
    </svg>
  );
}
