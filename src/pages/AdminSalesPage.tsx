import { useState } from 'react';
import type { EmployeeSearchResult } from '../types/domain';
import { EmployeeSearch } from '../components/admin/EmployeeSearch';
import { SellTicketPanel } from '../components/admin/SellTicketPanel';
import { AdminSidebar } from '../components/layout/AdminSidebar';
import { InfoButton } from '../components/ui/InfoButton';
import { help } from '../lib/help/helpContent';

export function AdminSalesPage({ onNavigate }: { onNavigate: (to: string) => void }) {
  const [employee, setEmployee] = useState<EmployeeSearchResult | null>(null);
  return (
    <div className="flex gap-5">
      <AdminSidebar onNavigate={onNavigate} />
      <div className="min-w-0 flex-1 space-y-5">
        <div>
          <p className="text-xs font-black uppercase tracking-widest text-cup-blue">Venta de tickets</p>
          <h1 className="text-3xl font-semibold text-corex-ink">
            Buscar colaborador y generar codigo
            <InfoButton title={help.adminSales.title} className="ml-2 align-middle">{help.adminSales.body}</InfoButton>
          </h1>
          <p className="mt-2 max-w-3xl text-sm text-corex-ink/60">
            La busqueda consulta personal real mediante Supabase Edge Function y genera tickets transaccionales en Supabase.
          </p>
        </div>
        <EmployeeSearch onSelect={setEmployee} />
        <SellTicketPanel employee={employee} />
      </div>
    </div>
  );
}
