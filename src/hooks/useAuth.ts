import { useCallback, useEffect, useMemo, useState } from 'react';
import type { AppUser } from '../types/domain';
import { signInWithCedula, signOut as signOutRequest, registerWithTicket } from '../lib/auth';
import { USE_MOCKS, SUPABASE_URL, SUPABASE_ANON_KEY } from '../lib/constants';

// Lee el access_token directamente desde localStorage (clave que mantiene la SDK).
// Lo usamos para hidratar el perfil al cargar la app sin pasar por supabase.from()
// (que en algunas combinaciones de clave publishable + RLS se cuelga en getSession).
function readStoredSession(): { userId: string; accessToken: string } | null {
  if (typeof window === 'undefined' || !SUPABASE_URL) return null;
  try {
    // La SDK guarda el token con un key derivado del project ref
    const projectRef = SUPABASE_URL.match(/^https:\/\/([^.]+)\.supabase\.co/)?.[1];
    if (!projectRef) return null;
    const raw = window.localStorage.getItem(`sb-${projectRef}-auth-token`);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    const userId = parsed?.user?.id ?? parsed?.currentSession?.user?.id;
    const accessToken = parsed?.access_token ?? parsed?.currentSession?.access_token;
    if (!userId || !accessToken) return null;
    return { userId, accessToken };
  } catch {
    return null;
  }
}

async function fetchProfileViaRest(userId: string, accessToken: string): Promise<AppUser | null> {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) return null;
  try {
    const url = `${SUPABASE_URL}/rest/v1/profiles?user_id=eq.${encodeURIComponent(userId)}&select=user_id,cedula,display_name,area_id,role&limit=1`;
    const r = await fetch(url, {
      headers: {
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${accessToken}`
      }
    });
    if (!r.ok) return null;
    const rows = await r.json() as Array<{ user_id: string; cedula: string; display_name: string; area_id: string | null; role: AppUser['role'] }>;
    if (!rows.length) return null;
    const row = rows[0];
    return {
      id: row.user_id,
      cedula: row.cedula,
      name: row.display_name,
      areaId: row.area_id ?? 'SIN_AREA',
      role: row.role
    };
  } catch {
    return null;
  }
}

export function useAuth() {
  const [user, setUser] = useState<AppUser | null>(null);
  // loading=true mientras intentamos rehidratar la sesión existente. Esto evita
  // que <AdminRoute> muestre "Acceso restringido" durante el primer paint cuando
  // aún no se ha resuelto la sesión.
  const [loading, setLoading] = useState<boolean>(!USE_MOCKS && !!SUPABASE_URL);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (USE_MOCKS || !SUPABASE_URL) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    const stored = readStoredSession();
    if (!stored) {
      setLoading(false);
      return;
    }
    (async () => {
      const next = await fetchProfileViaRest(stored.userId, stored.accessToken);
      if (cancelled) return;
      setUser(next);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const signIn = useCallback(async (cedula: string, password: string) => {
    setLoading(true);
    setError(null);
    try {
      const nextUser = await signInWithCedula(cedula, password);
      setUser(nextUser);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error de autenticación.');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const register = useCallback(async (cedula: string, ticketCode: string, password: string) => {
    setLoading(true);
    setError(null);
    try {
      await registerWithTicket(cedula, ticketCode, password);
      const nextUser = await signInWithCedula(cedula, password);
      setUser(nextUser);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo registrar.');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const signOut = useCallback(async () => {
    await signOutRequest();
    setUser(null);
  }, []);

  return useMemo(() => ({ user, loading, error, signIn, register, signOut }), [user, loading, error, signIn, register, signOut]);
}
