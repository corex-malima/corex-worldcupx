import type { ButtonHTMLAttributes, ReactNode } from 'react';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  icon?: ReactNode;
}

const variants: Record<Variant, string> = {
  primary: 'border border-cup-blue bg-cup-blue text-pitch-950 hover:bg-blue-300 shadow-sm',
  secondary: 'border border-white/10 bg-pitch-800 text-white hover:bg-pitch-700',
  ghost: 'border border-transparent bg-transparent text-white/75 hover:border-white/10 hover:bg-pitch-800 hover:text-white',
  danger: 'border border-cup-red bg-cup-red text-white hover:bg-red-400'
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
