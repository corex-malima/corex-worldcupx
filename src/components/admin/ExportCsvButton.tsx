import { Download } from 'lucide-react';
import { csvEscape } from '../../lib/format';
import { Button } from '../ui/Button';

export function ExportCsvButton({ filename, rows }: { filename: string; rows: Array<Record<string, unknown>> }) {
  function exportCsv() {
    if (!rows.length) return;
    const headers = Object.keys(rows[0]);
    const csv = [headers.join(','), ...rows.map((row) => headers.map((header) => csvEscape(row[header])).join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
  }
  return <Button variant="secondary" onClick={exportCsv} icon={<Download size={17} />}>Exportar CSV</Button>;
}
