import { supabase } from './supabase';
import { USE_MOCKS } from './constants';
import type { AppUser } from '../types/domain';

export interface RegistrationTicketValidation {
  ok: boolean;
  message: string;
  cedulaMasked?: string;
  employeeName?: string;
  areaId?: string;
  technicalEmail?: string;
}

const GENERIC_TICKET_ERROR = 'Datos no válidos o ticket no disponible.';

function cleanCedula(cedula: string): string {
  return cedula.replace(/\D/g, '');
}

function cleanTicketCode(ticketCode: string): string {
  return ticketCode.trim().toUpperCase();
}

function emailPart(value: string): string {
  const normalized = value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '');
  return normalized || 'colaborador';
}

function lastNameFromPersonName(personName: string): string {
  const parts = personName.trim().split(/\s+/).filter(Boolean);
  return emailPart(parts[parts.length - 1] ?? 'colaborador');
}

function cedulaToAuthEmail(cedula: string, personName = 'colaborador'): string {
  return `${cleanCedula(cedula)}.${lastNameFromPersonName(personName)}@mundial.malima`;
}

export function validateCedulaBasic(cedula: string): boolean {
  return /^\d{10,13}$/.test(cleanCedula(cedula));
}

export function validateTicketCodeBasic(ticketCode: string): boolean {
  const code = cleanTicketCode(ticketCode);
  return /^[A-Z0-9]{6}$/.test(code) || /^WCX-[A-Z0-9]{8}$/.test(code);
}

function mapProfile(row: { user_id: string; cedula: string; display_name: string; area_id: string | null; role: AppUser['role'] }): AppUser {
  return {
    id: row.user_id,
    cedula: row.cedula,
    name: row.display_name,
    areaId: row.area_id ?? 'SIN_AREA',
    role: row.role
  };
}

async function resolveAuthEmailByCedula(cedula: string): Promise<string> {
  if (USE_MOCKS || !supabase) {
    return cedulaToAuthEmail(cedula, cedula === 'admin' ? 'Admin TTHH' : 'David Rivera');
  }

  const { data, error } = await supabase.rpc('resolve_auth_email_by_cedula', { p_cedula: cleanCedula(cedula) });
  if (error) throw new Error('No se pudo validar el usuario.');

  const result = data as { ok?: boolean; technical_email?: string; message?: string } | null;
  if (!result?.ok || !result.technical_email) throw new Error('Credenciales inválidas.');
  return result.technical_email;
}

export async function validateRegistrationTicket(cedula: string, ticketCode: string): Promise<RegistrationTicketValidation> {
  const normalizedCedula = cleanCedula(cedula);
  const normalizedCode = cleanTicketCode(ticketCode);

  if (!validateCedulaBasic(normalizedCedula) || !validateTicketCodeBasic(normalizedCode)) {
    return { ok: false, message: GENERIC_TICKET_ERROR };
  }

  if (USE_MOCKS || !supabase) {
    return {
      ok: true,
      message: 'Ticket validado. Ya puedes crear tu contraseña.',
      cedulaMasked: `${normalizedCedula.slice(0, 2)}******${normalizedCedula.slice(-2)}`,
      employeeName: normalizedCedula === '0102030405' ? 'David Rivera' : 'Colaborador Demo',
      areaId: 'CAMPO',
      technicalEmail: cedulaToAuthEmail(normalizedCedula, normalizedCedula === '0102030405' ? 'David Rivera' : 'Colaborador Demo')
    };
  }

  const { data, error } = await supabase.rpc('validate_registration_ticket', {
    p_cedula: normalizedCedula,
    p_ticket_code: normalizedCode
  });

  if (error) return { ok: false, message: GENERIC_TICKET_ERROR };
  const result = data as { ok?: boolean; message?: string; cedula_masked?: string; person_name?: string; area_id?: string; technical_email?: string } | null;
  if (!result?.ok) return { ok: false, message: result?.message ?? GENERIC_TICKET_ERROR };

  return {
    ok: true,
    message: 'Ticket validado. Ya puedes crear tu contraseña.',
    cedulaMasked: result.cedula_masked,
    employeeName: result.person_name,
    areaId: result.area_id,
    technicalEmail: result.technical_email
  };
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

  const email = await resolveAuthEmailByCedula(cedula);
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error || !data.user) throw new Error(error?.message ?? 'No se pudo iniciar sesión.');

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('user_id, cedula, display_name, area_id, role')
    .eq('user_id', data.user.id)
    .single();

  if (profileError || !profile) throw new Error('Usuario autenticado, pero no se encontró perfil activo.');
  return mapProfile(profile as unknown as { user_id: string; cedula: string; display_name: string; area_id: string | null; role: AppUser['role'] });
}

export async function registerWithTicket(cedula: string, ticketCode: string, password: string): Promise<void> {
  if (USE_MOCKS || !supabase) return;

  const normalizedCedula = cleanCedula(cedula);
  const normalizedCode = cleanTicketCode(ticketCode);
  const validation = await validateRegistrationTicket(normalizedCedula, normalizedCode);
  if (!validation.ok || !validation.technicalEmail) throw new Error(GENERIC_TICKET_ERROR);

  const { error: signUpError } = await supabase.auth.signUp({
    email: validation.technicalEmail,
    password
  });
  if (signUpError) throw new Error(signUpError.message);

  const { error: rpcError } = await supabase.rpc('complete_registration_with_ticket', {
    p_cedula: normalizedCedula,
    p_ticket_code: normalizedCode
  });
  if (rpcError) throw new Error(rpcError.message);
}

export async function signOut(): Promise<void> {
  if (!USE_MOCKS && supabase) await supabase.auth.signOut();
}
