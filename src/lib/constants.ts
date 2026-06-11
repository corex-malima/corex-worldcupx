export const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string | undefined;
export const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

export const USE_MOCKS = !SUPABASE_URL || !SUPABASE_ANON_KEY;

export const APP_NAME = 'WorldCupX';
export const APP_DESCRIPTOR = 'Polla Mundialista';
export const BRAND = 'CoreX';
export const SIGNATURE = 'by P&P';
export const COMPANY = 'Malima';
export const APP_VERSION = '0.1.9';
// Deadline duro: 11 de junio 2026, 14:16 hora Ecuador (UTC-5) — CIERRE del envío.
// Después de este instante:
//   - Colaboradores normales: NO pueden enviar/editar predicciones ni reclamar tickets.
//   - Admin (TTHH): SÍ puede seguir cargando predicciones para tickets `sold`
//     no reclamados (transcripción de papel). Ver supabase/sql/23_admin_bypass_deadline.sql.
//   - sell_ticket / claim_ticket → cerrados para TODOS (intencional).
//   - Admin sigue pudiendo cargar resultados oficiales y recalcular ranking en cualquier momento.
export const DEFAULT_DEADLINE_ISO = '2026-06-11T14:16:00-05:00';

