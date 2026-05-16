import { Check, CloudOff, Loader2, Save } from 'lucide-react';
import type { PredictedBracketMatch } from '../../types/prediction';
import type { Team } from '../../types/tournament';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { TeamIdentity } from '../ui/TeamIdentity';
import { PenaltyAdvanceSelector } from './PenaltyAdvanceSelector';

export type KnockoutSaveStatus = 'idle' | 'saving' | 'saved' | 'error';

export function KnockoutMatchCard({ match, teams, disabled, onChange, onSave, saveStatus, saveError, isOfficial }: {
  match: PredictedBracketMatch;
  teams: Team[];
  disabled?: boolean;
  onChange: (matchId: string, home: number | null, away: number | null, advancingTeamId?: string | null) => void;
  /** Si se pasa, muestra botón Guardar para persistir el resultado en BD (modo admin). */
  onSave?: (matchId: string) => void | Promise<void>;
  saveStatus?: KnockoutSaveStatus;
  saveError?: string;
  /** Si true muestra badge "Oficial" en lugar de "Definido" (admin loading results) */
  isOfficial?: boolean;
}) {
  const home = teams.find((team) => team.id === match.homeTeamId);
  const away = teams.find((team) => team.id === match.awayTeamId);
  const isReady = Boolean(home && away);
  const isDraw = match.homeScore !== null && match.awayScore !== null && match.homeScore === match.awayScore;
  const status: KnockoutSaveStatus = saveStatus ?? 'idle';
  const canSave = isReady && match.homeScore !== null && match.awayScore !== null && (!isDraw || Boolean(match.advancingTeamId));

  function badgeContent() {
    if (status === 'saving') return <Badge tone="slate"><Loader2 size={11} className="inline animate-spin" /> Guardando…</Badge>;
    if (status === 'error') return <Badge tone="red"><CloudOff size={11} className="inline" /> Error</Badge>;
    if (isOfficial) return <Badge tone="green"><Check size={11} className="inline" /> Oficial</Badge>;
    if (match.advancingTeamId) return <Badge tone="green">Definido</Badge>;
    if (isReady) return <Badge tone="gold">Pendiente</Badge>;
    return <Badge tone="slate">Esperando</Badge>;
  }

  return (
    <div className={`min-w-0 rounded-2xl border p-3 sm:p-4 ${isReady ? 'border-white/10 bg-pitch-900' : 'border-white/5 bg-pitch-900/70'}`}>
      <div className="mb-3 flex flex-wrap items-start justify-between gap-2 text-xs font-bold text-white/45">
        <span>Partido {match.matchNo}</span>
        {badgeContent()}
      </div>

      <div className="space-y-2">
        <div className="min-w-0 rounded-2xl bg-pitch-800 px-3 py-2">
          <TeamIdentity team={home} label={match.homeSlot ?? 'Slot pendiente'} size="sm" truncate={false} />
        </div>
        <div className="min-w-0 rounded-2xl bg-pitch-800 px-3 py-2">
          <TeamIdentity team={away} label={match.awaySlot ?? 'Slot pendiente'} size="sm" truncate={false} />
        </div>
      </div>

      <div className="mt-3 grid grid-cols-[minmax(0,1fr)_20px_minmax(0,1fr)] items-center gap-2">
        <Input
          aria-label="Goles local"
          type="number"
          inputMode="numeric"
          min={0}
          max={30}
          disabled={disabled || !isReady}
          value={match.homeScore ?? ''}
          onChange={(event) => onChange(match.id, event.target.value === '' ? null : Number(event.target.value), match.awayScore)}
          className="h-14 text-center text-2xl font-black"
        />
        <span className="text-center text-white/35">-</span>
        <Input
          aria-label="Goles visitante"
          type="number"
          inputMode="numeric"
          min={0}
          max={30}
          disabled={disabled || !isReady}
          value={match.awayScore ?? ''}
          onChange={(event) => onChange(match.id, match.homeScore, event.target.value === '' ? null : Number(event.target.value))}
          className="h-14 text-center text-2xl font-black"
        />
      </div>

      {isDraw && <PenaltyAdvanceSelector home={home} away={away} value={match.advancingTeamId} disabled={disabled} onChange={(teamId) => onChange(match.id, match.homeScore, match.awayScore, teamId)} />}

      {onSave && (
        <Button
          className="mt-3 w-full"
          variant={isOfficial ? 'secondary' : 'primary'}
          disabled={!canSave || status === 'saving'}
          onClick={() => void onSave(match.id)}
          icon={status === 'saving' ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
        >
          {status === 'saving' ? 'Guardando' : isOfficial ? 'Reemplazar' : 'Guardar'}
        </Button>
      )}

      {saveError && status === 'error' && (
        <p className="mt-2 rounded-xl bg-cup-red/15 p-2 text-xs font-bold text-red-100">{saveError}</p>
      )}

      {match.venue && <p className="mt-3 break-words text-xs font-bold text-white/45">{match.venue}</p>}
    </div>
  );
}
