import { useState } from 'react';
import { Ban, FileCheck, FileText, Pencil } from 'lucide-react';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import type { AdminTicketRow } from '../../hooks/useAdminTickets';
import { useTournamentFixture } from '../../hooks/useTournamentFixture';
import { useTicketPrediction } from '../../hooks/useTicketPrediction';
import type { ScorePrediction } from '../../types/tournament';
import { bundleToReceiptInputs } from '../../lib/pdf/predictionReceiptAdapter';

// Lazy import del módulo PDF (≈500KB gzipped). Solo se carga cuando el admin
// pide descargar un PDF, no en el initial bundle.
async function loadPdfModule() {
  const [renderer, group, knockout, receipt, flags] = await Promise.all([
    import('@react-pdf/renderer'),
    import('../../lib/pdf/groupStageTemplate'),
    import('../../lib/pdf/knockoutTemplate'),
    import('../../lib/pdf/predictionReceiptTemplate'),
    import('../../lib/pdf/flagLoader')
  ]);
  return {
    pdf: renderer.pdf,
    GroupStageTemplateDocument: group.GroupStageTemplateDocument,
    KnockoutTemplateDocument: knockout.KnockoutTemplateDocument,
    PredictionReceiptDocument: receipt.PredictionReceiptDocument,
    loadFlagPngMap: flags.loadFlagPngMap
  };
}

interface Props {
  rows: AdminTicketRow[];
  loading: boolean;
  error: string | null;
  onCancel: (ticketId: string, reason: string) => Promise<void>;
  onEdit?: (ticketId: string) => void;
}

interface TicketActionsProps {
  row: AdminTicketRow;
  onCancel: (ticketId: string, reason: string) => Promise<void>;
  onEdit?: (ticketId: string) => void;
  busy: boolean;
  setBusy: (busy: boolean) => void;
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

function TicketActions({ row, onCancel, onEdit, busy, setBusy }: TicketActionsProps) {
  const { fixture } = useTournamentFixture();
  const groupsComplete = row.groupsFilled >= 72;
  // Carga la predicción para tickets reclamados O vendidos (admin/TTHH también
  // llena predicciones de tickets sold para colaboradores que no se registraron).
  // Solo se carga cuando los 72 grupos están completos: el PDF de eliminatorias
  // necesita los scores de grupo para emparejar R32.
  const { data: prediction } = useTicketPrediction(
    (row.status === 'claimed' || row.status === 'sold') && groupsComplete ? row.id : null
  );
  const [pdfBusy, setPdfBusy] = useState<'groups' | 'knockout' | 'receipt' | null>(null);
  const canDownloadReceipt = row.predictionStatus === 'submitted' && groupsComplete;

  async function handleCancel() {
    const reason = window.prompt('Motivo de anulación');
    if (!reason || !reason.trim()) return;
    setBusy(true);
    try {
      await onCancel(row.id, reason.trim());
    } catch (err) {
      window.alert(err instanceof Error ? err.message : 'No se pudo anular el ticket.');
    } finally {
      setBusy(false);
    }
  }

  function ticketContext() {
    return {
      code: prediction.ticketCode ?? null,
      ownerName: row.personName,
      alias: row.alias  // "Ticket N" amigable, no el código enmascarado
    };
  }

  function groupScoresFromPrediction(): ScorePrediction[] {
    return prediction.groupScores.map((s) => ({
      matchId: s.match_id,
      homeScore: s.home_score,
      awayScore: s.away_score
    }));
  }

  async function downloadGroups() {
    setPdfBusy('groups');
    try {
      const { pdf, GroupStageTemplateDocument, loadFlagPngMap } = await loadPdfModule();
      const flagPngs = await loadFlagPngMap(fixture.teams);
      const blob = await pdf(
        <GroupStageTemplateDocument teams={fixture.teams} matches={fixture.matches} ticket={ticketContext()} flagPngs={flagPngs} />
      ).toBlob();
      triggerDownload(blob, `worldcupx-grupos-${row.alias.replace(/\s/g, '_')}.pdf`);
    } catch (err) {
      window.alert(err instanceof Error ? err.message : 'No se pudo generar el PDF.');
    } finally {
      setPdfBusy(null);
    }
  }

  async function downloadKnockout() {
    setPdfBusy('knockout');
    try {
      const { pdf, KnockoutTemplateDocument, loadFlagPngMap } = await loadPdfModule();
      const flagPngs = await loadFlagPngMap(fixture.teams);
      const blob = await pdf(
        <KnockoutTemplateDocument
          matches={fixture.matches}
          teams={fixture.teams}
          ticket={ticketContext()}
          groupScores={groupScoresFromPrediction()}
          flagPngs={flagPngs}
        />
      ).toBlob();
      triggerDownload(blob, `worldcupx-eliminatorias-${row.alias.replace(/\s/g, '_')}.pdf`);
    } catch (err) {
      window.alert(err instanceof Error ? err.message : 'No se pudo generar el PDF.');
    } finally {
      setPdfBusy(null);
    }
  }

  // Descarga el comprobante completo (predicción enviada) — evidencia auditable
  // de qué predijo el colaborador. Misma plantilla que el usuario descarga al
  // enviar, pero accesible desde la tabla admin.
  async function downloadReceipt() {
    setPdfBusy('receipt');
    try {
      const { pdf, PredictionReceiptDocument, loadFlagPngMap } = await loadPdfModule();
      const flagPngs = await loadFlagPngMap(fixture.teams);
      const inputs = bundleToReceiptInputs(prediction, fixture.matches);
      const blob = await pdf(
        <PredictionReceiptDocument
          teams={fixture.teams}
          matches={fixture.matches}
          groupScoresByMatch={inputs.groupScoresByMatch}
          thirdPlaceSlots={inputs.thirdPlaceSlots}
          bracketMatches={inputs.bracketMatches}
          championTeamId={prediction.championTeamId}
          thirdPlaceTeamId={prediction.thirdPlaceTeamId}
          ticket={{ code: prediction.ticketCode ?? null, ownerName: row.personName, alias: row.alias, submittedAt: row.claimedAt ?? null }}
          flagPngs={flagPngs}
        />
      ).toBlob();
      triggerDownload(blob, `worldcupx-comprobante-${row.alias.replace(/\s/g, '_')}.pdf`);
    } catch (err) {
      window.alert(err instanceof Error ? err.message : 'No se pudo generar el comprobante.');
    } finally {
      setPdfBusy(null);
    }
  }

  return (
    <div className="flex flex-wrap items-center justify-end gap-2">
      {onEdit && row.status === 'sold' && (
        <Button
          variant="secondary"
          icon={<Pencil size={14} />}
          onClick={() => onEdit(row.id)}
          title="Transcribir predicción de papel (solo tickets sin reclamar)"
        >
          Cargar predicción
        </Button>
      )}
      {row.status !== 'cancelled' && (
        <>
          {canDownloadReceipt && (
            <Button
              variant="primary"
              icon={<FileCheck size={14} />}
              disabled={pdfBusy !== null}
              onClick={() => void downloadReceipt()}
              title="Comprobante PDF de la predicción enviada (evidencia)"
            >
              {pdfBusy === 'receipt' ? 'PDF…' : 'Comprobante'}
            </Button>
          )}
          <Button
            variant="secondary"
            icon={<FileText size={14} />}
            disabled={pdfBusy !== null}
            onClick={() => void downloadGroups()}
            title="PDF de fase de grupos (con datos del ticket en el header)"
          >
            {pdfBusy === 'groups' ? 'PDF…' : 'PDF Grupos'}
          </Button>
          <Button
            variant="secondary"
            icon={<FileText size={14} />}
            disabled={pdfBusy !== null || !groupsComplete}
            onClick={() => void downloadKnockout()}
            title={
              groupsComplete
                ? 'PDF de eliminatorias con los R32 resueltos según las predicciones de grupos del ticket'
                : `Para generar el PDF KO el ticket debe tener los 72 partidos de grupos predichos. Lleva ${row.groupsFilled}/72.`
            }
          >
            {pdfBusy === 'knockout' ? 'PDF…' : groupsComplete ? 'PDF KO' : `PDF KO · ${row.groupsFilled}/72`}
          </Button>
          <Button
            variant="danger"
            icon={<Ban size={14} />}
            disabled={busy}
            onClick={() => void handleCancel()}
          >
            {busy ? 'Anulando…' : 'Anular'}
          </Button>
        </>
      )}
    </div>
  );
}

export function TicketAdminTable({ rows, loading, error, onCancel, onEdit }: Props) {
  const [cancellingId, setCancellingId] = useState<string | null>(null);

  return (
    <div className="overflow-hidden rounded-2xl border border-corex-ink/10 bg-pitch-900">
      {error && (
        <p className="border-b border-corex-ink/10 bg-cup-red/15 p-3 text-sm font-bold text-cup-red">{error}</p>
      )}
      <table className="w-full min-w-[960px] text-sm">
        <thead className="bg-pitch-800 text-left text-corex-ink/50">
          <tr>
            <th className="p-4">Alias</th>
            <th>Colaborador</th>
            <th>Área</th>
            <th>Estado</th>
            <th>Predicción</th>
            <th>Puntos</th>
            <th className="text-right pr-4">Acciones</th>
          </tr>
        </thead>
        <tbody>
          {loading && (
            <tr>
              <td colSpan={7} className="p-6 text-center text-corex-ink/55">Cargando tickets…</td>
            </tr>
          )}
          {!loading && rows.length === 0 && !error && (
            <tr>
              <td colSpan={7} className="p-6 text-center text-corex-ink/55">No se encontraron tickets con esos filtros.</td>
            </tr>
          )}
          {!loading && rows.map((row) => (
            <tr key={row.id} className="border-t border-corex-ink/10 text-corex-ink/80">
              <td className="p-4 font-black text-corex-ink" title={row.codeMasked}>{row.alias}</td>
              <td>
                <div className="leading-tight">{row.personName}</div>
                <div className="mt-1 text-xs text-corex-ink/45">{row.codeMasked}</div>
              </td>
              <td>
                <div className="leading-tight">{row.areaName ?? row.areaId ?? '—'}</div>
                {row.jobClassificationCode && <div className="mt-1 text-xs text-corex-ink/45">{row.jobClassificationCode}</div>}
              </td>
              <td>
                <Badge tone={row.status === 'claimed' ? 'green' : row.status === 'cancelled' ? 'red' : 'gold'}>
                  {row.status}
                </Badge>
              </td>
              <td>
                <span className="text-xs font-bold text-corex-ink/65">{row.groupsFilled}/72 grupos</span>
                {row.predictionStatus === 'submitted' && <Badge tone="green" className="ml-2">Enviada</Badge>}
              </td>
              <td className="font-black">{row.points}</td>
              <td className="pr-4">
                <TicketActions
                  row={row}
                  onCancel={onCancel}
                  onEdit={onEdit}
                  busy={cancellingId === row.id}
                  setBusy={(b) => setCancellingId(b ? row.id : null)}
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
