import type { InputHTMLAttributes, ReactNode } from 'react';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  helper?: string;
  icon?: ReactNode;
}

export function Input({ label, helper, icon, className = '', ...props }: InputProps) {
  return (
    <label className="block space-y-2">
      {label && <span className="text-sm font-bold text-corex-ink/80">{label}</span>}
      <span className="relative block">
        {icon && <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-corex-ink/35">{icon}</span>}
        <input
          className={`min-h-12 w-full rounded-xl border border-corex-ink/10 bg-pitch-800 px-4 py-3 text-corex-ink outline-none transition placeholder:text-corex-ink/35 focus:border-cup-blue focus:ring-2 focus:ring-cup-blue/20 ${icon ? 'pl-11' : ''} ${className}`}
          {...props}
        />
      </span>
      {helper && <span className="text-xs text-corex-ink/55">{helper}</span>}
    </label>
  );
}
