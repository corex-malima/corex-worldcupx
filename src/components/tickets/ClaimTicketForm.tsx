import { useState } from 'react';
import { KeyRound } from 'lucide-react';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';

function isValidTicketCode(code: string): boolean {
  return /^[A-Z0-9]{6}$/.test(code) || /^WCX-[A-Z0-9]{8}$/.test(code);
}

export function ClaimTicketForm({ onClaim }: { onClaim: (code: string) => Promise<void> }) {
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    const cleanCode = code.trim().toUpperCase();
    if (!isValidTicketCode(cleanCode)) {
      setMessage('El codigo debe ser ABC123 o WCX-XXXXXXXX.');
      return;
    }
    setLoading(true);
    setMessage(null);
    try {
      await onClaim(cleanCode);
      setCode('');
      setMessage('Ticket activado correctamente.');
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'No se pudo activar el ticket.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-2xl border border-corex-ink/10 bg-pitch-900 p-4">
      <div className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
        <Input label="Activar nuevo ticket" value={code} onChange={(event) => setCode(event.target.value.toUpperCase())} maxLength={12} placeholder="WCX-ABC12345" helper="Ingresa el codigo entregado por TTHH." />
        <Button type="submit" disabled={loading} icon={<KeyRound size={17} />}>{loading ? 'Validando' : 'Activar'}</Button>
      </div>
      {message && <p className="mt-3 text-sm font-bold text-corex-ink/75">{message}</p>}
    </form>
  );
}
