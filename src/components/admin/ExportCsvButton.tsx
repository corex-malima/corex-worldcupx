import { useState } from 'react';
import { Download, Loader2 } from 'lucide-react';
import { Button } from '../ui/Button';

/**
 * Exporta los rows como archivo XLSX descargable. Lazy-loadea la librería
 * SheetJS para no inflar el bundle inicial — solo se carga cuando el admin
 * presiona el botón. Si SheetJS no está disponible (offline) cae a CSV.
 */
export function ExportCsvButton({ filename, rows }: { filename: string; rows: Array<Record<string, unknown>> }) {
  const [busy, setBusy] = useState(false);

  async function exportXlsx() {
    if (!rows.length) return;
    setBusy(true);
    try {
      // Lazy load SheetJS solo cuando se necesita
      const XLSX = await import('xlsx');
      const worksheet = XLSX.utils.json_to_sheet(rows);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Datos');
      // El nombre por defecto del componente venía con .csv, lo normalizamos a .xlsx
      const xlsxName = filename.replace(/\.csv$/i, '.xlsx').replace(/\.txt$/i, '.xlsx');
      const finalName = /\.xlsx$/i.test(xlsxName) ? xlsxName : `${xlsxName}.xlsx`;
      XLSX.writeFile(workbook, finalName);
    } catch (err) {
      window.alert(err instanceof Error ? err.message : 'No se pudo generar el XLSX.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Button
      variant="secondary"
      onClick={() => void exportXlsx()}
      disabled={busy || rows.length === 0}
      icon={busy ? <Loader2 size={17} className="animate-spin" /> : <Download size={17} />}
    >
      {busy ? 'Generando…' : 'Exportar XLSX'}
    </Button>
  );
}
