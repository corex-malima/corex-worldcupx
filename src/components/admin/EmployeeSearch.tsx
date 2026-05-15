import { useState } from 'react';
import { RefreshCw, Search, UserCheck, Users } from 'lucide-react';
import type { EmployeeSearchResult } from '../../types/domain';
import type { CollaboratorSearchResult } from '../../types/personProfile';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { useCollaboratorSearch } from '../../hooks/useCollaboratorSearch';
import { usePersonProfiles } from '../../hooks/usePersonProfiles';
import { collaboratorToEmployeeSearchResult } from '../../services/ticketSalesService';

function isNumericQuery(value: string): boolean {
  const compact = value.replace(/\s+/g, '');
  return compact.length > 0 && /^\d+$/.test(compact);
}

function ResultCard({ result, onSelect }: { result: CollaboratorSearchResult; onSelect: (employee: EmployeeSearchResult) => void }) {
  const hasCedula = Boolean(result.national_id && result.national_id.replace(/\D/g, '').length > 0);

  return (
    <button
      type="button"
      onClick={() => hasCedula && onSelect(collaboratorToEmployeeSearchResult(result))}
      disabled={!hasCedula}
      title={hasCedula ? undefined : 'Este colaborador no tiene cédula registrada en HR. Cárgala antes de vender el ticket.'}
      className={`w-full rounded-2xl border p-4 text-left transition ${
        hasCedula
          ? 'border-white/10 bg-pitch-800 hover:border-cup-blue/40 hover:bg-pitch-700'
          : 'cursor-not-allowed border-cup-red/30 bg-pitch-900/60 opacity-60'
      }`}
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <p className="truncate text-base font-black text-white">{result.person_name ?? 'Colaborador sin nombre'}</p>
          <p className="mt-1 text-sm text-white/60">
            Cedula {result.masked_national_id ?? 'sin registro'} · Codigo {result.person_id}
          </p>
        </div>
        <span className={`inline-flex w-fit items-center rounded-full border px-3 py-1 text-xs font-bold ${hasCedula ? 'border-cup-blue/25 text-cup-blue' : 'border-cup-red/40 text-red-200'}`}>
          {hasCedula ? 'Seleccionar' : 'Sin cédula'}
        </span>
      </div>
      <div className="mt-3 grid gap-2 text-sm text-white/60 md:grid-cols-2">
        <span>{result.area_name ?? result.area_id ?? 'Area pendiente'}</span>
        <span>{result.job_title ?? 'Cargo pendiente'}</span>
      </div>
    </button>
  );
}

export function EmployeeSearch({ onSelect }: { onSelect: (employee: EmployeeSearchResult) => void }) {
  const { profiles, loading, error, reload } = usePersonProfiles();
  const [query, setQuery] = useState('');
  const results = useCollaboratorSearch(profiles, query);
  const showShortHint = query.trim().length > 0 && query.trim().length < 2 && !isNumericQuery(query);
  const showNoResults = !loading && !showShortHint && query.trim().length > 0 && results.length === 0;

  function handleSearchClick() {
    if (results.length === 1) {
      onSelect(collaboratorToEmployeeSearchResult(results[0]));
    }
  }

  return (
    <div className="rounded-2xl border border-white/10 bg-pitch-900 p-4">
      <div className="grid gap-3 lg:grid-cols-[1fr_auto_auto] lg:items-end">
        <Input
          label="Buscar por cedula, codigo o nombre"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Ej. 0107428849 · 1000 · erick david · rivera erick · andrade r"
          icon={<Search size={17} />}
          helper={loading
            ? 'Cargando colaboradores desde Supabase...'
            : `${profiles.length.toLocaleString('es-EC')} colaboradores en memoria. Puedes mezclar nombres y apellidos en cualquier orden.`}
        />
        <Button type="button" onClick={handleSearchClick} disabled={loading || results.length !== 1} icon={<UserCheck size={17} />}>
          Seleccionar
        </Button>
        <Button type="button" variant="secondary" onClick={() => void reload()} disabled={loading} icon={<RefreshCw size={17} />}>
          Recargar
        </Button>
      </div>

      {error && (
        <p className="mt-3 rounded-2xl bg-cup-red/15 p-3 text-sm font-bold text-red-100">
          No se pudo consultar la base de colaboradores. Verifique la conexion con Supabase/API.
        </p>
      )}
      {showShortHint && <p className="mt-3 text-sm text-white/55">Escribe al menos 2 caracteres para buscar por nombre. Para cedula o codigo puedes escribir numeros parciales.</p>}
      {showNoResults && <p className="mt-3 rounded-2xl bg-pitch-800 p-3 text-sm font-bold text-white/70">No se encontro ningun colaborador con ese dato.</p>}

      {results.length > 0 && (
        <div className="mt-4 space-y-3">
          <div className="flex items-center gap-2 text-sm font-bold text-white/65">
            <Users size={16} />
            <span>{results.length} coincidencia{results.length === 1 ? '' : 's'}</span>
          </div>
          <div className="grid gap-3">
            {results.map((result) => (
              <ResultCard key={`${result.person_id}-${result.national_id}`} result={result} onSelect={onSelect} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
