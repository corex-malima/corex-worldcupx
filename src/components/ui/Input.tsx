import type { InputHTMLAttributes, ReactNode } from 'react';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  helper?: string;
  icon?: ReactNode;
}

export function Input({ label, helper, icon, className = '', ...props }: InputProps) {
  return (
    <label className="block space-y-2">
      {label && <span className="text-sm font-bold text-white/80">{label}</span>}
      <span className="relative block">
        {icon && <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-white/35">{icon}</span>}
        <input
          className={`min-h-12 w-full rounded-2xl border border-white/10 bg-white/10 px-4 py-3 text-white outline-none transition placeholder:text-white/35 focus:border-cup-blue focus:ring-4 focus:ring-cup-blue/20 ${icon ? 'pl-11' : ''} ${className}`}
          {...props}
        />
      </span>
      {helper && <span className="text-xs text-white/55">{helper}</span>}
    </label>
  );
}
