import type { Team } from '../../types/tournament';

export function PenaltyWinnerSelect({ home, away, value, onChange }: { home?: Team; away?: Team; value?: string | null; onChange: (teamId: string) => void }) {
  return (
    <div className="mt-3 grid grid-cols-2 gap-2">
      {[home, away].filter(Boolean).map((team) => (
        <button key={team!.id} onClick={() => onChange(team!.id)} className={`rounded-xl border px-3 py-2 text-sm font-bold ${value === team!.id ? 'border-cup-blue bg-pitch-800 text-cup-blue' : 'border-white/10 bg-pitch-900 text-white/65'}`}>
          Penales: {team!.flagEmoji} {team!.name}
        </button>
      ))}
    </div>
  );
}
