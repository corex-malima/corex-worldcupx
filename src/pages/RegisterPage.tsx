import { useState } from 'react';
import { UserPlus } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Input } from '../components/ui/Input';
import { normalizeCedula } from '../lib/format';
import { validateCedulaBasic } from '../lib/auth';

export function RegisterPage({ onRegister, onNavigate, loading, error }: { onRegister: (cedula: string, password: string) => Promise<void>; onNavigate: (to: string) => void; loading?: boolean; error?: string | null }) {
  const [cedula, setCedula] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [localError, setLocalError] = useState<string | null>(null);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    const cleanCedula = normalizeCedula(cedula);
    if (!validateCedulaBasic(cleanCedula)) return setLocalError('La cédula debe tener entre 10 y 13 dígitos.');
    if (password.length < 6) return setLocalError('La contraseña debe tener al menos 6 caracteres.');
    if (password !== confirm) return setLocalError('Las contraseñas no coinciden.');
    setLocalError(null);
    await onRegister(cleanCedula, password);
  }

  return (
    <div className="grid min-h-[72vh] place-items-center">
      <Card className="w-full max-w-md">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-4 grid h-16 w-16 place-items-center rounded-3xl bg-cup-green text-pitch-950 shadow-glow"><UserPlus /></div>
          <h1 className="text-3xl font-black text-white">Crear cuenta</h1>
          <p className="mt-2 text-sm text-white/60">Solo colaboradores activos cargados por TTHH pueden registrarse.</p>
        </div>
        <form onSubmit={submit} className="space-y-4">
          <Input label="Cédula" value={cedula} onChange={(event) => setCedula(event.target.value)} placeholder="0102030405" />
          <Input label="Contraseña" type="password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Mínimo 6 caracteres" />
          <Input label="Confirmar contraseña" type="password" value={confirm} onChange={(event) => setConfirm(event.target.value)} />
          {(localError || error) && <p className="rounded-2xl bg-cup-red/15 p-3 text-sm font-bold text-red-100">{localError || error}</p>}
          <Button className="w-full" disabled={loading}>{loading ? 'Registrando' : 'Validar y crear cuenta'}</Button>
        </form>
        <button onClick={() => onNavigate('#/login')} className="mt-5 w-full text-sm font-bold text-cup-gold hover:underline">Ya tengo cuenta</button>
      </Card>
    </div>
  );
}
