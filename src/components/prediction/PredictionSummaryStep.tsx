import { useState } from 'react';
import { CheckCircle2, Download, Loader2, Trophy } from 'lucide-react';
import type { FinalPredictionSummary, PredictionDraft, ThirdPlaceSlot } from '../../types/prediction';
import type { Match, Team } from '../../types/tournament';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { TeamIdentity } from '../ui/TeamIdentity';

function findTeam(teams: Team[], teamId: string | null) {
  return teams.find((item) => item.id === teamId);
}

function TeamLine({ label, team }: { label: string; team?: Team }) {
  return (
    <div className="flex min-w-0 items-center justify-between gap-3 rounded-2xl bg-pitch-800 px-3 py-2">
      <span className="shrink-0 text-sm font-bold text-corex-ink/55">{label}</span>
      <TeamIdentity team={team} label="Pendiente" align="right" />
    </div>
  );
}

function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

interface Props {
  ticketId: string;
  ticketAlias?: string | null;
  ownerName?: string | null;
  draft: PredictionDraft;
  teams: Team[];
  matches: Match[];
  thirdPlaceSlots: ThirdPlaceSlot[];
  summary: FinalPredictionSummary;
  disabled?: boolean;
  onSubmit: () => void;
}

export function PredictionSummaryStep({ ticketId, ticketAlias, ownerName, draft, teams, matches, thirdPlaceSlots, summary, disabled, onSubmit }: Props) {
  const champion = findTeam(teams, summary.championTeamId);
  const [pdfBusy, setPdfBusy] = useState(false);
  const submitted = draft.status === 'submitted';

  async function downloadReceipt() {
    setPdfBusy(true);
    try {
      const [{ pdf }, { PredictionReceiptDocument }, { loadFlagPngMap }] = await Promise.all([
        import('@react-pdf/renderer'),
        import('../../lib/pdf/predictionReceiptTemplate'),
        import('../../lib/pdf/flagLoader')
      ]);
      const flagPngs = await loadFlagPngMap(teams);
      const groupScoresByMatch = Object.fromEntries(
        Object.entries(draft.groupScores).map(([id, s]) => [id, { homeScore: s.homeScore, awayScore: s.awayScore }])
      );
      const blob = await pdf(
        <PredictionReceiptDocument
          teams={teams}
          matches={matches}
          groupScoresByMatch={groupScoresByMatch}
          thirdPlaceSlots={thirdPlaceSlots}
          bracketMatches={draft.bracketMatches}
          championTeamId={summary.championTeamId}
          thirdPlaceTeamId={summary.thirdPlaceTeamId}
          ticket={{ code: null, ownerName: ownerName ?? null, alias: ticketAlias ?? null, submittedAt: draft.submittedAt ?? null }}
          flagPngs={flagPngs}
        />
      ).toBlob();
      // El nombre del archivo usa el alias amigable (Ticket_N) y no el UUID.
      const safeName = (ticketAlias ?? `Ticket-${ticketId.slice(0, 8)}`).replace(/\s/g, '_');
      triggerDownload(blob, `worldcupx-comprobante-${safeName}.pdf`);
    } catch (err) {
      window.alert(err instanceof Error ? err.message : 'No se pudo generar el comprobante.');
    } finally {
      setPdfBusy(false);
    }
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[.8fr_1.2fr]">
      <Card>
        <Trophy className="mb-4 text-cup-blue" size={42} />
        <p className="text-xs font-black uppercase tracking-widest text-corex-ink/45">{ticketAlias ?? `Ticket ${ticketId.slice(0, 8)}`}</p>
        <div className="mt-2">
          <p className="text-sm font-black uppercase tracking-widest text-cup-blue">Campeón</p>
          <TeamIdentity team={champion} label="Pendiente" size="lg" className="mt-2 text-2xl" />
        </div>
        <div className="mt-4 space-y-2">
          <TeamLine label="Subcampeón" team={findTeam(teams, summary.runnerUpTeamId)} />
          <TeamLine label="Tercer lugar" team={findTeam(teams, summary.thirdPlaceTeamId)} />
          <TeamLine label="Cuarto lugar" team={findTeam(teams, summary.fourthPlaceTeamId)} />
          <p className="px-1 text-sm text-corex-ink/65"><b>Estado:</b> {draft.status}</p>
        </div>
        <Button className="mt-5 w-full" disabled={disabled || !summary.championTeamId} onClick={onSubmit} icon={<CheckCircle2 size={17} />}>
          {submitted ? 'Reenviar predicción' : 'Enviar predicción'}
        </Button>
        <Button
          variant="secondary"
          className="mt-2 w-full"
          disabled={pdfBusy || !summary.championTeamId}
          onClick={() => void downloadReceipt()}
          icon={pdfBusy ? <Loader2 size={17} className="animate-spin" /> : <Download size={17} />}
          title={summary.championTeamId ? undefined : 'Completa tu predicción primero para descargar el comprobante'}
        >
          {pdfBusy ? 'Generando…' : submitted ? 'Descargar mi comprobante (PDF)' : 'Descargar borrador (PDF)'}
        </Button>
      </Card>
      <Card>
        <h3 className="text-xl font-semibold text-corex-ink">Predicción completa</h3>
        <div className="mt-4 grid gap-2 md:grid-cols-2">
          {draft.bracketMatches.flatMap((match) => !match.advancingTeamId ? [] : [
            <div key={match.id} className="min-w-0 rounded-2xl bg-pitch-800 p-3 text-sm text-corex-ink/75">
              <b>Partido {match.matchNo}</b>
              <TeamIdentity team={findTeam(teams, match.advancingTeamId)} label="Pendiente" size="sm" className="mt-2" />
            </div>
          ])}
        </div>
      </Card>
    </div>
  );
}
