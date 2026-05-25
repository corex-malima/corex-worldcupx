import { useReducer } from 'react';
import { CheckCircle2, TicketCheck } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Input } from '../components/ui/Input';
import { WorldCupXMark } from '../components/brand/WorldCupXMark';
import { normalizeCedula } from '../lib/format';
import { validateCedulaBasic, validateRegistrationTicket, validateTicketCodeBasic, type RegistrationTicketValidation } from '../lib/auth';
import { APP_DESCRIPTOR, APP_NAME, BRAND, COMPANY, SIGNATURE } from '../lib/constants';

// Anclamos la validación al par cédula+ticket que se usó al pedirla. Si el usuario
// cambia cualquier input, la validación deja de aplicar automáticamente (derivado),
// sin necesidad de un useEffect que resetee state.
type ValidationCache = { key: string; result: RegistrationTicketValidation };

interface RegisterFormState {
  cedula: string;
  ticketCode: string;
  password: string;
  confirm: string;
  validationCache: ValidationCache | null;
  validating: boolean;
  localError: string | null;
}

type RegisterAction =
  | { type: 'set_field'; field: 'cedula' | 'ticketCode' | 'password' | 'confirm'; value: string }
  | { type: 'set_validation_cache'; value: ValidationCache | null }
  | { type: 'set_validating'; value: boolean }
  | { type: 'set_local_error'; value: string | null };

function registerReducer(state: RegisterFormState, action: RegisterAction): RegisterFormState {
  switch (action.type) {
    case 'set_field':
      return { ...state, [action.field]: action.value };
    case 'set_validation_cache':
      return { ...state, validationCache: action.value };
    case 'set_validating':
      return { ...state, validating: action.value };
    case 'set_local_error':
      return { ...state, localError: action.value };
    default:
      return state;
  }
}

const INITIAL_STATE: RegisterFormState = {
  cedula: '',
  ticketCode: '',
  password: '',
  confirm: '',
  validationCache: null,
  validating: false,
  localError: null,
};

export function RegisterPage({ onRegister, onNavigate, loading, error }: { onRegister: (cedula: string, ticketCode: string, password: string) => Promise<void>; onNavigate: (to: string) => void; loading?: boolean; error?: string | null }) {
  const [state, dispatch] = useReducer(registerReducer, INITIAL_STATE);

  const cleanCedula = normalizeCedula(state.cedula);
  const cleanTicketCode = state.ticketCode.trim().toUpperCase();
  const currentKey = `${cleanCedula}|${cleanTicketCode}`;
  const validation = state.validationCache?.key === currentKey ? state.validationCache.result : null;

  async function validateTicket() {
    if (!validateCedulaBasic(cleanCedula)) return dispatch({ type: 'set_local_error', value: 'La cédula debe tener entre 10 y 13 dígitos.' });
    if (!validateTicketCodeBasic(cleanTicketCode)) return dispatch({ type: 'set_local_error', value: 'El codigo de ticket debe ser ABC123 o WCX-XXXXXXXX.' });
    dispatch({ type: 'set_validating', value: true });
    dispatch({ type: 'set_local_error', value: null });
    try {
      const result = await validateRegistrationTicket(cleanCedula, cleanTicketCode);
      dispatch({ type: 'set_validation_cache', value: { key: currentKey, result } });
      if (!result.ok) dispatch({ type: 'set_local_error', value: result.message });
    } catch (err) {
      dispatch({ type: 'set_local_error', value: err instanceof Error ? err.message : 'No se pudo validar el ticket.' });
    } finally {
      dispatch({ type: 'set_validating', value: false });
    }
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!validation?.ok) return dispatch({ type: 'set_local_error', value: 'Primero valida tu cédula y código de ticket.' });
    if (state.password.length < 6) return dispatch({ type: 'set_local_error', value: 'La contraseña debe tener al menos 6 caracteres.' });
    if (state.password !== state.confirm) return dispatch({ type: 'set_local_error', value: 'Las contraseñas no coinciden.' });
    dispatch({ type: 'set_local_error', value: null });
    await onRegister(cleanCedula, cleanTicketCode, state.password);
  }

  return (
    <div className="grid min-h-[72vh] place-items-center">
      <Card className="w-full max-w-2xl">
        <div className="mb-6 text-center">
          <WorldCupXMark size={72} className="mx-auto mb-4 rounded-2xl border border-corex-ink/10" />
          <p className="text-[11px] font-black uppercase tracking-[0.32em] text-corex-ink/45">{APP_NAME} · {APP_DESCRIPTOR}</p>
          <h1 className="mt-1 text-3xl font-semibold text-corex-ink">Crear cuenta</h1>
          <p className="mt-2 text-sm text-corex-ink/60">Primero compra tu ticket con TTHH. Luego registra tu cuenta con tu cédula y el código recibido.</p>
        </div>

        <div className="mb-5 rounded-2xl border border-corex-ink/10 bg-pitch-800 p-4 text-sm text-cup-blue">
          <b>Flujo seguro:</b> validamos que el ticket esté vendido, activo y asignado a tu cédula antes de crear tu contraseña.
        </div>

        <form onSubmit={submit} className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-[1fr_180px] sm:items-end">
            <Input label="Cédula" value={state.cedula} onChange={(event) => { dispatch({ type: 'set_field', field: 'cedula', value: event.target.value }); dispatch({ type: 'set_local_error', value: null }); }} placeholder="0102030405" />
            <Input label="Codigo de ticket" value={state.ticketCode} onChange={(event) => { dispatch({ type: 'set_field', field: 'ticketCode', value: event.target.value.toUpperCase() }); dispatch({ type: 'set_local_error', value: null }); }} maxLength={12} placeholder="WCX-ABC12345" />
          </div>

          <Button type="button" variant={validation?.ok ? 'secondary' : 'primary'} className="w-full" disabled={state.validating || loading} onClick={() => void validateTicket()} icon={validation?.ok ? <CheckCircle2 size={17} /> : <TicketCheck size={17} />}>
            {state.validating ? 'Validando ticket' : validation?.ok ? 'Ticket validado' : 'Validar cédula y ticket'}
          </Button>

          {validation?.ok && (
            <div className="rounded-2xl border border-cup-green/25 bg-pitch-800 p-4">
              <p className="text-sm font-black text-cup-green">{validation.employeeName ?? 'Colaborador validado'}</p>
              <p className="mt-1 text-xs text-corex-ink/60">{validation.cedulaMasked} · {validation.areaId ?? 'Área pendiente'}</p>
              <p className="mt-2 text-xs text-corex-ink/45">El email técnico de Supabase se genera automáticamente y no necesitas usarlo para entrar.</p>
            </div>
          )}

          <div className={`grid gap-3 sm:grid-cols-2 ${validation?.ok ? '' : 'opacity-50'}`}>
            <Input label="Contraseña" type="password" value={state.password} onChange={(event) => dispatch({ type: 'set_field', field: 'password', value: event.target.value })} placeholder="Mínimo 6 caracteres" disabled={!validation?.ok || loading} />
            <Input label="Confirmar contraseña" type="password" value={state.confirm} onChange={(event) => dispatch({ type: 'set_field', field: 'confirm', value: event.target.value })} disabled={!validation?.ok || loading} />
          </div>

          {(state.localError || error) && <p className="rounded-2xl bg-cup-red/15 p-3 text-sm font-bold text-cup-red">{state.localError || error}</p>}
          <Button type="submit" className="w-full" disabled={loading || !validation?.ok}>{loading ? 'Registrando' : 'Crear cuenta y reclamar ticket'}</Button>
        </form>
        <button type="button" onClick={() => onNavigate('#/login')} className="mt-5 w-full text-sm font-bold text-cup-blue hover:underline">Ya tengo cuenta</button>
        <p className="mt-6 text-center text-[10px] uppercase tracking-[0.3em] text-corex-ink/30">{BRAND} · {SIGNATURE} · {COMPANY}</p>
      </Card>
    </div>
  );
}
