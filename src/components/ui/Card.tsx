import type { ReactNode } from 'react';

interface CardProps {
  children: ReactNode;
  className?: string;
}

export function Card({ children, className = '' }: CardProps) {
  return <section className={`rounded-3xl border border-white/10 bg-white/[0.08] p-5 shadow-2xl backdrop-blur ${className}`}>{children}</section>;
}

export function CardTitle({ children, className = '' }: CardProps) {
  return <h2 className={`text-lg font-black text-white ${className}`}>{children}</h2>;
}
