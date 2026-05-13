import { useState } from 'react';
import { Search } from 'lucide-react';
import type { EmployeeSearchResult } from '../../types/domain';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { supabase } from '../../lib/supabase';
import { USE_MOCKS } from '../../lib/constants';
import { maskCedula, normalizeCedula } from '../../lib/format';

const demoEmployee: EmployeeSearchResult = {
  cedula: '0102030405',
  cedulaMasked: '01******05',
  personId: '2888',
  personName: 'David Rivera',
  areaId: 'CAMPO',
  costArea: 'COSECHA',
  jobTitle: 'Analista de datos',
  isActive: true,
  ticketsSold: 2,
  ticketsClaimed: 1,
  ticketsPending: 1
};

export function EmployeeSearch({ onSelect }: { onSelect: (employee: EmployeeSearchResult) => void }) {
  const [cedula, setCedula] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function search() {
    const cleanCedula = normalizeCedula(cedula || (demoEmployee.cedula ?? '0102030405'));
    setLoading(true);
    setError(null);
    try {
      if (USE_MOCKS || !supabase) {
        onSelect({ ...demoEmployee, cedula: cleanCedula, cedulaMasked: maskCedula(cleanCedula) });
        return;
      }

      const { data, error: rpcError } = await supabase.rpc('validate_active_employee', { p_cedula: cleanCedula });
      if (rpcError) throw new Error(rpcError.message);
      const result = data as { ok?: boolean; employee_id?: string; person_name?: string; area_id?: string } | null;
      if (!result?.ok) throw new Error('Colaborador no encontrado o inactivo.');

      onSelect({
        cedula: cleanCedula,
        cedulaMasked: maskCedula(cleanCedula),
        personId: result.employee_id ?? cleanCedula,
        personName: result.person_name ?? 'Colaborador',
        areaId: result.area_id ?? 'SIN_AREA',
        costArea: 'Pendiente',
        jobTitle: 'Pendiente',
        isActive: true,
        ticketsSold: 0,
        ticketsClaimed: 0,
        ticketsPending: 0
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo buscar el colaborador.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="rounded-3xl border border-white/10 bg-white/[0.06] p-4">
      <div className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
        <Input label="Buscar colaborador por cédula" value={cedula} onChange={(event) => setCedula(event.target.value)} placeholder="0102030405" />
        <Button onClick={() => void search()} disabled={loading} icon={<Search size={17} />}>{loading ? 'Buscando' : 'Buscar'}</Button>
      </div>
      {error && <p className="mt-3 rounded-2xl bg-cup-red/15 p-3 text-sm font-bold text-red-100">{error}</p>}
    </div>
  );
}
