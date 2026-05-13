import { useEffect, useState } from 'react';
import { CheckCircle2, TicketCheck, UserPlus } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Input } from '../components/ui/Input';
import { normalizeCedula } from '../lib/format';
import { validateCedulaBasic, validateRegistrationTicket, validateTicketCodeBasic, type RegistrationTicketValidation } from '../lib/auth';

export function RegisterPage({ onRegister, onNavigate, loading, error }: { onRegister: (cedula: string, ticketCode: string, password: string) => Promise<void>; onNavigate: (to: string) => void; loading?: boolean; error?: string | null }) {
  const [cedula, setCedula] = useState('');
  const [ticketCode, setTicketCode] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [validation, setValidation] = useState<RegistrationTicketValidation | null>(null);
  const [validating, setValidating] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  const cleanCedula = normalizeCedula(cedula);
  const cleanTicketCode = ticketCode.trim().toUpperCase();

  useEffect(() => {
    setValidation(null);
    setLocalError(null);
  }, [cleanCedula, cleanTicketCode]);

  async function validateTicket() {
    if (!validateCedulaBasic(cleanCedula)) return setLocalError('La cédula debe tener entre 10 y 13 dígitos.');
    if (!validateTicketCodeBasic(cleanTicketCode)) return setLocalError('El código de ticket debe tener 6 letras o números.');
    setValidating(true);
    setLocalError(null);
    try {
      const result = await validateRegistrationTicket(cleanCedula, cleanTicketCode);
      setValidation(result);
      if (!result.ok) setLocalError(result.message);
    } catch (err) {
      setLocalError(err instanceof Error ? err.message : 'No se pudo validar el ticket.');
    } finally {
      setValidating(false);
    }
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!validation?.ok) return setLocalError('Primero valida tu cédula y código de ticket.');
    if (password.length < 6) return setLocalError('La contraseña debe tener al menos 6 caracteres.');
    if (password !== confirm) return setLocalError('Las contraseñas no coinciden.');
    setLocalError(null);
    await onRegister(cleanCedula, cleanTicketCode, password);
  }

  return (
    <div className="grid min-h-[72vh] place-items-center">
      <Card className="w-full max-w-2xl">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-4 grid h-16 w-16 place-items-center rounded-3xl bg-cup-green text-pitch-950 shadow-glow"><UserPlus /></div>
          <h1 className="text-3xl font-black text-white">Crear cuenta</h1>
          <p className="mt-2 text-sm text-white/60">Primero compra tu ticket con TTHH. Luego registra tu cuenta con tu cédula y el código recibido.</p>
        </div>

        <div className="mb-5 rounded-2xl border border-cup-gold/25 bg-cup-gold/10 p-4 text-sm text-yellow-50">
          <b>Flujo seguro:</b> validamos que el ticket esté vendido, activo y asignado a tu cédula antes de crear tu contraseña.
        </div>

        <form onSubmit={submit} className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-[1fr_180px] sm:items-end">
            <Input label="Cédula" value={cedula} onChange={(event) => setCedula(event.target.value)} placeholder="0102030405" />
            <Input label="Código de ticket" value={ticketCode} onChange={(event) => setTicketCode(event.target.value.toUpperCase())} maxLength={6} placeholder="ABC123" />
          </div>

          <Button type="button" variant={validation?.ok ? 'secondary' : 'primary'} className="w-full" disabled={validating || loading} onClick={() => void validateTicket()} icon={validation?.ok ? <CheckCircle2 size={17} /> : <TicketCheck size={17} />}>
            {validating ? 'Validando ticket' : validation?.ok ? 'Ticket validado' : 'Validar cédula y ticket'}
          </Button>

          {validation?.ok && (
            <div className="rounded-2xl border border-cup-green/25 bg-cup-green/10 p-4">
              <p className="text-sm font-black text-green-100">{validation.employeeName ?? 'Colaborador validado'}</p>
              <p className="mt-1 text-xs text-white/60">{validation.cedulaMasked} · {validation.areaId ?? 'Área pendiente'}</p>
              <p className="mt-2 text-xs text-white/45">El email técnico de Supabase se genera automáticamente y no necesitas usarlo para entrar.</p>
            </div>
          )}

          <div className={`grid gap-3 sm:grid-cols-2 ${validation?.ok ? '' : 'opacity-50'}`}>
            <Input label="Contraseña" type="password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Mínimo 6 caracteres" disabled={!validation?.ok || loading} />
            <Input label="Confirmar contraseña" type="password" value={confirm} onChange={(event) => setConfirm(event.target.value)} disabled={!validation?.ok || loading} />
          </div>

          {(localError || error) && <p className="rounded-2xl bg-cup-red/15 p-3 text-sm font-bold text-red-100">{localError || error}</p>}
          <Button className="w-full" disabled={loading || !validation?.ok}>{loading ? 'Registrando' : 'Crear cuenta y reclamar ticket'}</Button>
        </form>
        <button onClick={() => onNavigate('#/login')} className="mt-5 w-full text-sm font-bold text-cup-gold hover:underline">Ya tengo cuenta</button>
      </Card>
    </div>
  );
}
