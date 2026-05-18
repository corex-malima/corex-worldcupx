export const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string | undefined;
export const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

export const USE_MOCKS = !SUPABASE_URL || !SUPABASE_ANON_KEY;

export const APP_NAME = 'WorldCupX';
export const APP_DESCRIPTOR = 'Polla Mundialista';
export const BRAND = 'CoreX';
export const SIGNATURE = 'by P&P';
export const COMPANY = 'Malima';
export const APP_VERSION = '0.1.0';
// Deadline duro: 10 de junio 2026, 23:59:59 hora Ecuador (UTC-5).
// Después de este instante, sell_ticket / claim_ticket / submit_complete_prediction
// quedan bloqueados. Admin sigue pudiendo cargar resultados oficiales y recalcular.
export const DEFAULT_DEADLINE_ISO = '2026-06-10T23:59:59-05:00';
