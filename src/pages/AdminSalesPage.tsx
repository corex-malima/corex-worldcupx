import { useState } from 'react';
import type { EmployeeSearchResult } from '../types/domain';
import { EmployeeSearch } from '../components/admin/EmployeeSearch';
import { SellTicketPanel } from '../components/admin/SellTicketPanel';
import { AdminSidebar } from '../components/layout/AdminSidebar';

export function AdminSalesPage({ onNavigate }: { onNavigate: (to: string) => void }) {
  const [employee, setEmployee] = useState<EmployeeSearchResult | null>(null);
  return (
    <div className="flex gap-5">
      <AdminSidebar onNavigate={onNavigate} />
      <div className="min-w-0 flex-1 space-y-5">
        <div><p className="text-xs font-black uppercase tracking-widest text-cup-gold">Venta de tickets</p><h1 className="text-3xl font-black text-white">Buscar colaborador y generar código</h1></div>
        <EmployeeSearch onSelect={setEmployee} />
        <SellTicketPanel employee={employee} />
      </div>
    </div>
  );
}
