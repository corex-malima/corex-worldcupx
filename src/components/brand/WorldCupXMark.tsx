interface Props {
  size?: number;
  className?: string;
  withBackground?: boolean;
  title?: string;
}

export function WorldCupXMark({ size = 40, className, withBackground = true, title = 'WorldCupX' }: Props) {
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
      {withBackground && <rect width="64" height="64" rx="14" fill="#0B0B0D" />}
      <path d="M52 32a20 20 0 1 1-9.6-17.1" fill="none" stroke="#F5F4F1" strokeWidth="3" strokeLinecap="round" />
      <path d="M19 32a13 13 0 0 1 22.5-8.8" fill="none" stroke="#8A9099" strokeWidth="2.4" strokeLinecap="round" />
      <path d="M45 32a13 13 0 0 1-22.5 8.8" fill="none" stroke="#8A9099" strokeWidth="2.4" strokeLinecap="round" />
      <circle cx="32" cy="32" r="5.6" fill="#F5F4F1" />
      <path d="M32 28.6l3.3 2.4-1.3 3.8h-4l-1.3-3.8z" fill="#0B0B0D" />
      <circle cx="49.4" cy="20" r="2.2" fill="#5C6F89" />
    </svg>
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
      <path d="M52 32a20 20 0 1 1-9.6-17.1" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
      <path d="M19 32a13 13 0 0 1 22.5-8.8" fill="none" stroke="currentColor" strokeOpacity="0.55" strokeWidth="2.4" strokeLinecap="round" />
      <path d="M45 32a13 13 0 0 1-22.5 8.8" fill="none" stroke="currentColor" strokeOpacity="0.55" strokeWidth="2.4" strokeLinecap="round" />
      <circle cx="32" cy="32" r="3.8" fill="currentColor" />
    </svg>
  );
}
