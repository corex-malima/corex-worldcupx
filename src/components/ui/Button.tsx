import type { ButtonHTMLAttributes, ReactNode } from 'react';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  icon?: ReactNode;
}

const variants: Record<Variant, string> = {
  primary: 'border border-cup-blue bg-cup-blue text-corex-white hover:brightness-110 shadow-sm',
  secondary: 'border border-corex-ink/15 bg-corex-white text-corex-ink hover:bg-corex-paper',
  ghost: 'border border-transparent bg-transparent text-corex-ink/70 hover:border-corex-ink/10 hover:bg-corex-paper hover:text-corex-ink',
  danger: 'border border-cup-red bg-cup-red text-corex-white hover:brightness-110'
};

export function Button({ className = '', variant = 'primary', icon, children, ...props }: ButtonProps) {
  return (
    <button
      className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-xl px-4 py-2 text-sm font-bold transition disabled:cursor-not-allowed disabled:opacity-50 ${variants[variant]} ${className}`}
      {...props}
    >
      {icon}
      {children}
    </button>
  );
}
