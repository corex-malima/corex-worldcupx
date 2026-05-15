export const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string | undefined;
export const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

export const USE_MOCKS = !SUPABASE_URL || !SUPABASE_ANON_KEY;

export const APP_NAME = 'WorldCupX';
export const APP_DESCRIPTOR = 'Polla Mundialista';
export const BRAND = 'CoreX';
export const SIGNATURE = 'by P&P';
export const COMPANY = 'Malima';
export const APP_VERSION = '0.1.0';
export const DEFAULT_DEADLINE_ISO = '2026-06-11T15:00:00-05:00';

export const ROUTES = {
  login: '#/login',
  register: '#/register',
  dashboard: '#/dashboard',
  prediction: '#/prediction',
  ranking: '#/ranking',
  admin: '#/admin',
  adminSales: '#/admin/sales',
  adminTickets: '#/admin/tickets',
  adminResults: '#/admin/results'
} as const;
