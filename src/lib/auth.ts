import { supabase } from './supabase';
import { USE_MOCKS } from './constants';
import type { AppUser } from '../types/domain';

export function cedulaToAuthEmail(cedula: string): string {
  return `${cedula.replace(/\D/g, '')}@polla.local`;
}

export function validateCedulaBasic(cedula: string): boolean {
  return /^\d{10,13}$/.test(cedula.replace(/\D/g, ''));
}

export async function signInWithCedula(cedula: string, password: string): Promise<AppUser> {
  if (USE_MOCKS || !supabase) {
    return {
      id: 'mock-user-1',
      cedula,
      name: cedula === 'admin' ? 'Admin TTHH' : 'David Rivera',
      areaId: cedula === 'admin' ? 'TTHH' : 'CAMPO',
      role: cedula === 'admin' ? 'admin_tthh' : 'collaborator'
    };
  }

  const email = cedulaToAuthEmail(cedula);
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error || !data.user) throw new Error(error?.message ?? 'No se pudo iniciar sesión.');

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('user_id, cedula, display_name, area_id, role')
    .eq('user_id', data.user.id)
    .single();

  if (profileError || !profile) throw new Error('Usuario autenticado, pero no se encontró perfil activo.');
  const row = profile as unknown as { user_id: string; cedula: string; display_name: string; area_id: string; role: AppUser['role'] };

  return {
    id: row.user_id,
    cedula: row.cedula,
    name: row.display_name,
    areaId: row.area_id,
    role: row.role
  };
}

export async function registerWithCedula(cedula: string, password: string): Promise<void> {
  if (USE_MOCKS || !supabase) return;

  const email = cedulaToAuthEmail(cedula);
  const { error: signUpError } = await supabase.auth.signUp({ email, password });
  if (signUpError) throw new Error(signUpError.message);

  const { error: rpcError } = await supabase.rpc('register_profile_by_cedula', { p_cedula: cedula });
  if (rpcError) throw new Error(rpcError.message);
}

export async function signOut(): Promise<void> {
  if (!USE_MOCKS && supabase) await supabase.auth.signOut();
}
