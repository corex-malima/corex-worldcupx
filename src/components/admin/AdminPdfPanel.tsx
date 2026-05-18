import { useState } from 'react';
import { Download, FileText } from 'lucide-react';
import type { Match, Team } from '../../types/tournament';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';

interface Props {
  teams: Team[];
  matches: Match[];
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

export function AdminPdfPanel({ teams, matches }: Props) {
  const [busy, setBusy] = useState<'groups' | 'knockout' | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function downloadGroupStage() {
    setBusy('groups');
    setError(null);
    try {
      // Lazy-load: @react-pdf/renderer pesa ~1.4MB. Solo lo cargamos cuando el admin
      // realmente pide un PDF, no en el bundle inicial de la app.
      const [{ pdf }, { GroupStageTemplateDocument }, { loadFlagPngMap }] = await Promise.all([
        import('@react-pdf/renderer'),
        import('../../lib/pdf/groupStageTemplate'),
        import('../../lib/pdf/flagLoader')
      ]);
      const flagPngs = await loadFlagPngMap(teams);
      const blob = await pdf(<GroupStageTemplateDocument teams={teams} matches={matches} flagPngs={flagPngs} />).toBlob();
      triggerDownload(blob, `worldcupx-fase-grupos.pdf`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo generar el PDF.');
    } finally {
      setBusy(null);
    }
  }

  async function downloadKnockout() {
    setBusy('knockout');
    setError(null);
    try {
      const [{ pdf }, { KnockoutTemplateDocument }, { loadFlagPngMap }] = await Promise.all([
        import('@react-pdf/renderer'),
        import('../../lib/pdf/knockoutTemplate'),
        import('../../lib/pdf/flagLoader')
      ]);
      const flagPngs = await loadFlagPngMap(teams);
      const blob = await pdf(<KnockoutTemplateDocument matches={matches} teams={teams} flagPngs={flagPngs} />).toBlob();
      triggerDownload(blob, `worldcupx-eliminatorias.pdf`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo generar el PDF.');
    } finally {
      setBusy(null);
    }
  }

  return (
    <Card>
      <div className="flex items-center gap-3">
        <span className="grid size-12 place-items-center rounded-2xl border border-corex-ink/10 bg-pitch-800 text-cup-blue">
          <FileText size={22} />
        </span>
        <div>
          <p className="text-xs font-black uppercase tracking-widest text-cup-blue">Plantillas imprimibles</p>
          <h2 className="text-xl font-semibold text-corex-ink">PDF para colaboradores sin internet</h2>
        </div>
      </div>
      <p className="mt-3 max-w-3xl text-sm text-corex-ink/65">
        Descarga e imprime las plantillas para que los colaboradores que no tienen acceso a la app
        llenen sus pronósticos a mano. Tú las pasas al sistema desde "Cargar resultados".
      </p>
      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <Button onClick={() => void downloadGroupStage()} disabled={busy !== null} icon={<Download size={17} />}>
          {busy === 'groups' ? 'Generando…' : 'Descargar fase de grupos'}
        </Button>
        <Button variant="secondary" onClick={() => void downloadKnockout()} disabled={busy !== null} icon={<Download size={17} />}>
          {busy === 'knockout' ? 'Generando…' : 'Descargar eliminatorias'}
        </Button>
      </div>
      {error && (
        <p className="mt-4 rounded-2xl bg-cup-red/15 p-3 text-sm font-bold text-cup-red">{error}</p>
      )}
      <p className="mt-4 text-xs text-corex-ink/45">
        Las plantillas usan el fixture cargado actualmente en Supabase. Si el fixture cambia, vuelve a descargar.
      </p>
    </Card>
  );
}
