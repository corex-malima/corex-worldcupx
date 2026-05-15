import { useState } from 'react';
import { Ban, FileText, Pencil } from 'lucide-react';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import type { AdminTicketRow } from '../../hooks/useAdminTickets';
import { useTournamentFixture } from '../../hooks/useTournamentFixture';
import { useTicketPrediction } from '../../hooks/useTicketPrediction';
import type { ScorePrediction } from '../../types/tournament';

// Lazy import del módulo PDF (≈500KB gzipped). Solo se carga cuando el admin
// pide descargar un PDF, no en el initial bundle.
async function loadPdfModule() {
  const [renderer, group, knockout] = await Promise.all([
    import('@react-pdf/renderer'),
    import('../../lib/pdf/groupStageTemplate'),
    import('../../lib/pdf/knockoutTemplate')
  ]);
  return {
    pdf: renderer.pdf,
    GroupStageTemplateDocument: group.GroupStageTemplateDocument,
    KnockoutTemplateDocument: knockout.KnockoutTemplateDocument
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
  // Solo carga la predicción cuando el ticket está reclamado (el PDF de eliminatorias
  // puede usar la fase de grupos del ticket si existe).
  const { data: prediction } = useTicketPrediction(row.status === 'claimed' ? row.id : null);
  const [pdfBusy, setPdfBusy] = useState<'groups' | 'knockout' | null>(null);

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
      alias: row.codeMasked
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
      const { pdf, GroupStageTemplateDocument } = await loadPdfModule();
      const blob = await pdf(
        <GroupStageTemplateDocument teams={fixture.teams} matches={fixture.matches} ticket={ticketContext()} />
      ).toBlob();
      triggerDownload(blob, `worldcupx-grupos-${row.codeMasked.replace(/[^A-Za-z0-9]/g, '')}.pdf`);
    } catch (err) {
      window.alert(err instanceof Error ? err.message : 'No se pudo generar el PDF.');
    } finally {
      setPdfBusy(null);
    }
  }

  async function downloadKnockout() {
    setPdfBusy('knockout');
    try {
      const { pdf, KnockoutTemplateDocument } = await loadPdfModule();
      const blob = await pdf(
        <KnockoutTemplateDocument
          matches={fixture.matches}
          teams={fixture.teams}
          ticket={ticketContext()}
          groupScores={groupScoresFromPrediction()}
        />
      ).toBlob();
      triggerDownload(blob, `worldcupx-eliminatorias-${row.codeMasked.replace(/[^A-Za-z0-9]/g, '')}.pdf`);
    } catch (err) {
      window.alert(err instanceof Error ? err.message : 'No se pudo generar el PDF.');
    } finally {
      setPdfBusy(null);
    }
  }

  return (
    <div className="flex flex-wrap items-center justify-end gap-2">
      {onEdit && row.status === 'claimed' && (
        <Button
          variant="secondary"
          icon={<Pencil size={14} />}
          onClick={() => onEdit(row.id)}
        >
          Editar
        </Button>
      )}
      {row.status !== 'cancelled' && (
        <>
          <Button
            variant="secondary"
            icon={<FileText size={14} />}
            disabled={pdfBusy !== null}
            onClick={() => void downloadGroups()}
            title="PDF de fase de grupos (en blanco)"
          >
            {pdfBusy === 'groups' ? 'PDF…' : 'PDF Grupos'}
          </Button>
          <Button
            variant="secondary"
            icon={<FileText size={14} />}
            disabled={pdfBusy !== null}
            onClick={() => void downloadKnockout()}
            title="PDF de eliminatorias (R32 resueltos con la predicción del ticket si existe)"
          >
            {pdfBusy === 'knockout' ? 'PDF…' : 'PDF KO'}
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
    <div className="overflow-hidden rounded-2xl border border-white/10 bg-pitch-900">
      {error && (
        <p className="border-b border-white/10 bg-cup-red/15 p-3 text-sm font-bold text-red-100">{error}</p>
      )}
      <table className="w-full min-w-[860px] text-sm">
        <thead className="bg-pitch-800 text-left text-white/50">
          <tr>
            <th className="p-4">Código</th>
            <th>Colaborador</th>
            <th>Área</th>
            <th>Estado</th>
            <th>Puntos</th>
            <th className="text-right pr-4">Acciones</th>
          </tr>
        </thead>
        <tbody>
          {loading && (
            <tr>
              <td colSpan={6} className="p-6 text-center text-white/55">Cargando tickets…</td>
            </tr>
          )}
          {!loading && rows.length === 0 && !error && (
            <tr>
              <td colSpan={6} className="p-6 text-center text-white/55">Aún no hay tickets vendidos.</td>
            </tr>
          )}
          {!loading && rows.map((row) => (
            <tr key={row.id} className="border-t border-white/10 text-white/80">
              <td className="p-4 font-black tracking-widest">{row.codeMasked}</td>
              <td>{row.personName}</td>
              <td>{row.areaName ?? row.areaId ?? '—'}</td>
              <td>
                <Badge tone={row.status === 'claimed' ? 'green' : row.status === 'cancelled' ? 'red' : 'gold'}>
                  {row.status}
                </Badge>
              </td>
              <td>{row.points}</td>
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
