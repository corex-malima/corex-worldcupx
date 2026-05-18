import type { ReactNode } from 'react';

interface CardProps {
  children: ReactNode;
  className?: string;
}

export function Card({ children, className = '' }: CardProps) {
  return <section className={`rounded-2xl border border-corex-ink/10 bg-corex-white p-5 shadow-card ${className}`}>{children}</section>;
}
