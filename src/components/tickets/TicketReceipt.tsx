import { Copy, Printer, Ticket } from 'lucide-react';
import { Button } from '../ui/Button';

export function TicketReceipt({ code, employeeName }: { code: string; employeeName: string }) {
  async function copyCode() {
    await navigator.clipboard.writeText(code);
  }

  return (
    <div className="rounded-3xl border border-dashed border-cup-gold/60 bg-gradient-to-br from-cup-gold/25 to-white/10 p-5 text-white">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-black uppercase tracking-widest text-white/55">Comprobante de ticket</p>
          <h3 className="mt-1 text-xl font-black">{employeeName}</h3>
        </div>
        <Ticket className="text-cup-gold" />
      </div>
      <p className="my-5 rounded-2xl bg-black/20 px-4 py-3 text-center text-3xl font-black tracking-[0.35em] text-cup-gold">{code}</p>
      <div className="grid grid-cols-2 gap-2">
        <Button variant="secondary" onClick={copyCode} icon={<Copy size={16} />}>Copiar</Button>
        <Button variant="secondary" onClick={() => window.print()} icon={<Printer size={16} />}>Imprimir</Button>
      </div>
    </div>
  );
}
