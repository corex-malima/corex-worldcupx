import { useState } from 'react';
import { LockKeyhole, UserRound } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Input } from '../components/ui/Input';
import { normalizeCedula } from '../lib/format';
import { validateCedulaBasic } from '../lib/auth';

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
          <div className="mx-auto mb-4 grid h-16 w-16 place-items-center rounded-3xl bg-cup-gold text-pitch-950 shadow-glow"><LockKeyhole /></div>
          <h1 className="text-3xl font-black text-white">Entra a tu polla</h1>
          <p className="mt-2 text-sm text-white/60">Usa tu cédula y contraseña. No verás el email técnico de Supabase.</p>
        </div>
        <form onSubmit={submit} className="space-y-4">
          <Input label="Cédula" value={cedula} onChange={(event) => setCedula(event.target.value)} placeholder="0102030405" />
          <Input label="Contraseña" type="password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="••••••••" />
          {(localError || error) && <p className="rounded-2xl bg-cup-red/15 p-3 text-sm font-bold text-red-100">{localError || error}</p>}
          <Button className="w-full" disabled={loading} icon={<UserRound size={17} />}>{loading ? 'Ingresando' : 'Iniciar sesión'}</Button>
        </form>
        <button onClick={() => onNavigate('#/register')} className="mt-5 w-full text-sm font-bold text-cup-gold hover:underline">Crear cuenta con mi cédula</button>
      </Card>
    </div>
  );
}
