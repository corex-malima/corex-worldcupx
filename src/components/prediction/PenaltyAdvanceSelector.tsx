import type { Team } from '../../types/tournament';
import { TeamIdentity } from '../ui/TeamIdentity';

export function PenaltyAdvanceSelector({ home, away, value, disabled, onChange }: { home?: Team; away?: Team; value?: string | null; disabled?: boolean; onChange: (teamId: string) => void }) {
  return (
    <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
      {[home, away].filter(Boolean).map((team) => (
        <button key={team!.id} disabled={disabled} onClick={() => onChange(team!.id)} className={`min-w-0 rounded-2xl border px-3 py-2 text-sm font-bold transition disabled:cursor-not-allowed disabled:opacity-50 ${value === team!.id ? 'border-cup-gold bg-cup-gold/20 text-cup-gold' : 'border-white/10 bg-white/5 text-white/65 hover:bg-white/10'}`}>
          <span className="mb-1 block text-left text-xs uppercase tracking-widest text-white/40">Pasa</span>
          <TeamIdentity team={team} size="sm" />
        </button>
      ))}
    </div>
  );
}
