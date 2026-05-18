import { Check, CloudOff, Loader2, Save } from 'lucide-react';
import type { Match, ScorePrediction, Team } from '../../types/tournament';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { TeamIdentity } from '../ui/TeamIdentity';

export type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';

interface Props {
  matches: Match[];
  teams: Team[];
  results: ScorePrediction[];
  onChange: (matchId: string, homeScore: number | null, awayScore: number | null) => void;
  /** Persistir el resultado en BD. Si no se pasa, no se muestra el botón Guardar. */
  onSave?: (matchId: string) => void | Promise<void>;
  /** Estado por matchId para mostrar feedback */
  saveStatusByMatch?: Record<string, SaveStatus>;
  /** Error message por matchId si saveStatus === 'error' */
  saveErrorByMatch?: Record<string, string>;
}

function isValidScore(value: number | null | undefined): value is number {
  return value !== null && value !== undefined && Number.isFinite(value) && value >= 0;
}

function SaveBadge({ status, official }: { status: SaveStatus; official: boolean }) {
  if (status === 'saving') return <Badge tone="slate"><Loader2 size={11} className="inline animate-spin" /> Guardando…</Badge>;
  if (status === 'error') return <Badge tone="red"><CloudOff size={11} className="inline" /> Error</Badge>;
  if (status === 'saved' || official) return <Badge tone="green"><Check size={11} className="inline" /> Oficial</Badge>;
  return <Badge tone="gold">Pendiente</Badge>;
}

export function AdminGroupResultsPanel({ matches, teams, results, onChange, onSave, saveStatusByMatch, saveErrorByMatch }: Props) {
  return (
    <div className="space-y-3">
      {matches.map((match) => {
        const home = teams.find((team) => team.id === match.homeTeamId);
        const away = teams.find((team) => team.id === match.awayTeamId);
        const result = results.find((item) => item.matchId === match.id);
        const homeValid = isValidScore(result?.homeScore);
        const awayValid = isValidScore(result?.awayScore);
        const canSave = homeValid && awayValid;
        const status = saveStatusByMatch?.[match.id] ?? 'idle';
        const errorMsg = saveErrorByMatch?.[match.id];
        const official = match.status === 'official';
        return (
          <div key={match.id} className="rounded-2xl border border-corex-ink/10 bg-pitch-900 p-4">
            <div className="mb-4 flex flex-wrap items-start justify-between gap-2 text-xs font-bold text-corex-ink/45">
              <div>
                <span className="block">Partido {match.matchNo} · Grupo {match.groupCode}</span>
                <span className="mt-1 block break-words text-corex-ink/35">{match.venue}</span>
              </div>
              <SaveBadge status={status} official={official} />
            </div>

            <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_220px_minmax(0,1fr)_auto] lg:items-center">
              <div className="min-w-0 rounded-2xl bg-pitch-800 px-3 py-2 lg:justify-self-end">
                <TeamIdentity team={home} label="Equipo local" align="right" />
              </div>

              <div className="grid grid-cols-[minmax(0,1fr)_20px_minmax(0,1fr)] items-center gap-2">
                <Input
                  aria-label="Goles local"
                  type="number"
                  inputMode="numeric"
                  min={0}
                  max={30}
                  value={result?.homeScore ?? ''}
                  onChange={(event) => onChange(match.id, event.target.value === '' ? null : Number(event.target.value), result?.awayScore ?? null)}
                  className="h-14 text-center text-2xl font-black"
                />
                <span className="text-center text-corex-ink/35">-</span>
                <Input
                  aria-label="Goles visitante"
                  type="number"
                  inputMode="numeric"
                  min={0}
                  max={30}
                  value={result?.awayScore ?? ''}
                  onChange={(event) => onChange(match.id, result?.homeScore ?? null, event.target.value === '' ? null : Number(event.target.value))}
                  className="h-14 text-center text-2xl font-black"
                />
              </div>

              <div className="min-w-0 rounded-2xl bg-pitch-800 px-3 py-2">
                <TeamIdentity team={away} label="Equipo visitante" />
              </div>

              {onSave && (
                <Button
                  variant={official ? 'secondary' : 'primary'}
                  disabled={!canSave || status === 'saving'}
                  onClick={() => void onSave(match.id)}
                  icon={status === 'saving' ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
                  className="lg:self-stretch"
                >
                  {status === 'saving' ? 'Guardando' : official ? 'Reemplazar' : 'Guardar'}
                </Button>
              )}
            </div>

            {errorMsg && (
              <p className="mt-2 rounded-xl bg-cup-red/15 p-2 text-xs font-bold text-cup-red">{errorMsg}</p>
            )}
          </div>
        );
      })}
    </div>
  );
}
