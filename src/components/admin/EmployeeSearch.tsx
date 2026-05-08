import { useState } from 'react';
import { Search } from 'lucide-react';
import type { EmployeeSearchResult } from '../../types/domain';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';

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
  function search() {
    onSelect({ ...demoEmployee, cedula: cedula || demoEmployee.cedula });
  }
  return (
    <div className="rounded-3xl border border-white/10 bg-white/[0.06] p-4">
      <div className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
        <Input label="Buscar colaborador por cédula" value={cedula} onChange={(event) => setCedula(event.target.value)} placeholder="0102030405" />
        <Button onClick={search} icon={<Search size={17} />}>Buscar</Button>
      </div>
    </div>
  );
}
