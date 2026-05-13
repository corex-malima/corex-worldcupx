import { useCallback, useMemo, useState } from 'react';
import type { AppUser } from '../types/domain';
import { signInWithCedula, signOut as signOutRequest, registerWithTicket } from '../lib/auth';

export function useAuth() {
  const [user, setUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
