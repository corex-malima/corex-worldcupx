import type { ReactNode } from 'react';

type Tone = 'green' | 'gold' | 'blue' | 'red' | 'slate';

const tones: Record<Tone, string> = {
  green: 'border-cup-green/35 bg-cup-green/10 text-green-100',
  gold: 'border-cup-blue/35 bg-cup-blue/10 text-sky-100',
  blue: 'border-cup-blue/35 bg-cup-blue/10 text-sky-100',
  red: 'border-cup-red/35 bg-cup-red/10 text-red-100',
  slate: 'border-white/10 bg-pitch-800 text-white/70'
};

export function Badge({ children, tone = 'slate', className = '' }: { children: ReactNode; tone?: Tone; className?: string }) {
  return <span className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-bold ${tones[tone]} ${className}`}>{children}</span>;
}
