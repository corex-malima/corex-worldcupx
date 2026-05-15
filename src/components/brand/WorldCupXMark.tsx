interface Props {
  size?: number;
  className?: string;
  withBackground?: boolean;
  title?: string;
}

// PNG oficial provisto por el usuario, copiado a public/brand/worldcupx-icon.png.
const ICON_URL = `${import.meta.env.BASE_URL}brand/worldcupx-icon.png`;

export function WorldCupXMark({ size = 40, className, withBackground = true, title = 'WorldCupX' }: Props) {
  const padding = withBackground ? Math.max(4, Math.round(size * 0.12)) : 0;
  const innerSize = size - padding * 2;
  return (
    <span
      role="img"
      aria-label={title}
      title={title}
      className={className}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: size,
        height: size,
        borderRadius: Math.round(size * 0.22),
        background: withBackground ? '#0B0B0D' : 'transparent',
        padding,
        flexShrink: 0
      }}
    >
      <img
        src={ICON_URL}
        alt=""
        width={innerSize}
        height={innerSize}
        style={{ display: 'block', objectFit: 'contain', width: innerSize, height: innerSize }}
      />
    </span>
  );
}

export function CoreXSymbol({ size = 24, className, title = 'CoreX' }: { size?: number; className?: string; title?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 64 64"
      width={size}
      height={size}
      role="img"
      aria-label={title}
      className={className}
    >
      <title>{title}</title>
      {/* Anillo exterior "C" — gap superior-derecho */}
      <path d="M 47 16 A 20 20 0 1 0 47 48" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
      {/* Anillo interior */}
      <path d="M 42 22 A 12 12 0 1 0 42 42" fill="none" stroke="currentColor" strokeOpacity="0.55" strokeWidth="2.4" strokeLinecap="round" />
      {/* Núcleo */}
      <circle cx="32" cy="32" r="3.4" fill="currentColor" />
      {/* Satélite blanco superior */}
      <circle cx="24" cy="24" r="2" fill="currentColor" />
      {/* Satélite slate */}
      <circle cx="48" cy="44" r="2.4" fill="currentColor" opacity="0.55" />
    </svg>
  );
}
