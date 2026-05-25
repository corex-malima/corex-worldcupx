import { useState } from 'react';
import { UserRound } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Input } from '../components/ui/Input';
import { WorldCupXMark } from '../components/brand/WorldCupXMark';
import { normalizeCedula } from '../lib/format';
import { validateCedulaBasic } from '../lib/auth';
import { APP_DESCRIPTOR, APP_NAME, BRAND, COMPANY, SIGNATURE } from '../lib/constants';

export function LoginPage({ onLogin, onNavigate, loading, error }: { onLogin: (cedula: string, password: string) => Promise<void>; onNavigate: (to: string) => void; loading?: boolean; error?: string | null }) {
  const [cedula, setCedula] = useState('');
  const [password, setPassword] = useState('');
  const [localError, setLocalError] = useState<string | null>(null);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    const isAdminDemo = cedula.trim().toLowerCase() === 'admin';
    const cleanCedula = isAdminDemo ? 'admin' : normalizeCedula(cedula);
    if (!isAdminDemo && !validateCedulaBasic(cleanCedula)) {
      setLocalError('Ingresa una cédula válida. Para demo mock puedes usar admin.');
      return;
    }
    if (password.length < 6) {
      setLocalError('La contraseña debe tener al menos 6 caracteres.');
      return;
    }
    setLocalError(null);
    await onLogin(cleanCedula, password);
  }

  return (
    <div className="grid min-h-[72vh] place-items-center">
      <Card className="w-full max-w-md">
        <div className="mb-6 text-center">
          <WorldCupXMark size={72} className="mx-auto mb-4 rounded-2xl border border-corex-ink/10" />
          <p className="text-[11px] font-black uppercase tracking-[0.32em] text-corex-ink/45">{APP_NAME}</p>
          <h1 className="mt-1 text-3xl font-semibold text-corex-ink">Ingresa a {APP_NAME}</h1>
          <p className="mt-2 text-sm text-corex-ink/60">{APP_DESCRIPTOR} interna · usa tu cédula y contraseña, no verás el email técnico de Supabase.</p>
        </div>
        <form onSubmit={submit} className="space-y-4">
          <Input label="Cédula" value={cedula} onChange={(event) => setCedula(event.target.value)} placeholder="0102030405" />
          <Input label="Contraseña" type="password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="••••••••" />
          {(localError || error) && <p className="rounded-2xl bg-cup-red/15 p-3 text-sm font-bold text-cup-red">{localError || error}</p>}
          <Button type="submit" className="w-full" disabled={loading} icon={<UserRound size={17} />}>{loading ? 'Ingresando' : 'Iniciar sesión'}</Button>
        </form>
        <button type="button" onClick={() => onNavigate('#/register')} className="mt-5 w-full text-sm font-bold text-cup-blue hover:underline">Crear cuenta con ticket</button>
        <p className="mt-6 text-center text-[10px] uppercase tracking-[0.3em] text-corex-ink/30">{BRAND} · {SIGNATURE} · {COMPANY}</p>
      </Card>
    </div>
  );
}
