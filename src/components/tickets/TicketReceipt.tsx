import { Copy, Printer, Ticket } from 'lucide-react';
import { Button } from '../ui/Button';

export function TicketReceipt({ code, employeeName }: { code: string; employeeName: string }) {
  async function copyCode() {
    await navigator.clipboard.writeText(code);
  }

  return (
    <div className="rounded-2xl border border-dashed border-cup-blue/45 bg-pitch-900 p-5 text-white">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-black uppercase tracking-widest text-white/55">Comprobante de ticket</p>
          <h3 className="mt-1 text-xl font-semibold">{employeeName}</h3>
        </div>
        <Ticket className="text-cup-blue" />
      </div>
      <p className="my-5 overflow-hidden rounded-2xl bg-pitch-950/50 px-4 py-3 text-center text-2xl font-black tracking-widest text-cup-blue sm:text-3xl">{code}</p>
      <div className="grid grid-cols-2 gap-2">
        <Button variant="secondary" onClick={copyCode} icon={<Copy size={16} />}>Copiar</Button>
        <Button variant="secondary" onClick={() => window.print()} icon={<Printer size={16} />}>Imprimir</Button>
      </div>
    </div>
  );
}
