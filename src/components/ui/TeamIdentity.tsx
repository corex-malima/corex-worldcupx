import { useState } from 'react';
import type { Team } from '../../types/tournament';

type Size = 'sm' | 'md' | 'lg';

const sizes: Record<Size, string> = {
  sm: 'h-7 w-7 text-base',
  md: 'h-8 w-8 text-lg',
  lg: 'h-10 w-10 text-xl'
};

export function TeamIdentity({ team, label, size = 'md', align = 'left', className = '' }: { team?: Team | null; label?: string | null; size?: Size; align?: 'left' | 'right'; className?: string }) {
  const [imageFailed, setImageFailed] = useState(false);
  const name = team?.name ?? label ?? 'Pendiente';
  const showImage = Boolean(team?.flagUrl && !imageFailed);

  return (
    <span className={`flex min-w-0 items-center gap-2 ${align === 'right' ? 'justify-end text-right' : ''} ${className}`}>
      {align === 'right' && <span className="min-w-0 truncate font-black text-white">{name}</span>}
      <span className={`grid shrink-0 place-items-center overflow-hidden rounded-full bg-white/10 ring-1 ring-white/15 ${sizes[size]}`}>
        {showImage ? <img src={team!.flagUrl} alt="" className="h-full w-full object-cover" onError={() => setImageFailed(true)} /> : <span>{team?.flagEmoji ?? '?'}</span>}
      </span>
      {align === 'left' && <span className="min-w-0 truncate font-black text-white">{name}</span>}
    </span>
  );
}
