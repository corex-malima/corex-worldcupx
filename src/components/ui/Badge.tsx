import type { ReactNode } from 'react';

type Tone = 'green' | 'gold' | 'blue' | 'red' | 'slate';

const tones: Record<Tone, string> = {
  green: 'border-cup-green/40 bg-cup-green/15 text-green-200',
  gold: 'border-cup-gold/40 bg-cup-gold/15 text-yellow-100',
  blue: 'border-cup-blue/40 bg-cup-blue/15 text-blue-100',
  red: 'border-cup-red/40 bg-cup-red/15 text-red-100',
  slate: 'border-white/15 bg-white/10 text-white/70'
};

export function Badge({ children, tone = 'slate', className = '' }: { children: ReactNode; tone?: Tone; className?: string }) {
  return <span className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-bold ${tones[tone]} ${className}`}>{children}</span>;
}
