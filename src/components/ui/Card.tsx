import type { ReactNode } from 'react';

interface CardProps {
  children: ReactNode;
  className?: string;
}

export function Card({ children, className = '' }: CardProps) {
  return <section className={`rounded-2xl border border-white/10 bg-pitch-900 p-5 shadow-card ${className}`}>{children}</section>;
}

export function CardTitle({ children, className = '' }: CardProps) {
  return <h2 className={`text-lg font-black text-white ${className}`}>{children}</h2>;
}
