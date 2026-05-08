import { useState } from 'react';
import { KeyRound } from 'lucide-react';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';

export function ClaimTicketForm({ onClaim }: { onClaim: (code: string) => Promise<void> }) {
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    const cleanCode = code.trim().toUpperCase();
    if (!/^[A-Z0-9]{6}$/.test(cleanCode)) {
      setMessage('El código debe tener 6 caracteres alfanuméricos.');
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
    <form onSubmit={handleSubmit} className="rounded-3xl border border-cup-gold/25 bg-cup-gold/10 p-4">
      <div className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
        <Input label="Activar nuevo ticket" value={code} onChange={(event) => setCode(event.target.value.toUpperCase())} maxLength={6} placeholder="ABC123" helper="Ingresa el código de 6 caracteres entregado por TTHH." />
        <Button type="submit" disabled={loading} icon={<KeyRound size={17} />}>{loading ? 'Validando' : 'Activar'}</Button>
      </div>
      {message && <p className="mt-3 text-sm font-bold text-white/75">{message}</p>}
    </form>
  );
}
