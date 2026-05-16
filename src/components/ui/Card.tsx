import type { ReactNode } from 'react';

interface CardProps {
  children: ReactNode;
  className?: string;
}

export function Card({ children, className = '' }: CardProps) {
  return <section className={`rounded-2xl border border-white/10 bg-pitch-900 p-5 shadow-card ${className}`}>{children}</section>;
}
