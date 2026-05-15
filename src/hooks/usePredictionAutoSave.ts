import { useCallback, useEffect, useRef, useState } from 'react';
import { USE_MOCKS } from '../lib/constants';
import { supabase } from '../lib/supabase';

export type AutoSaveStatus = 'idle' | 'saving' | 'saved' | 'error';

interface GroupScorePayload {
  matchId: string;
  homeScore: number | null;
  awayScore: number | null;
}

interface KnockoutScorePayload {
  matchId: string;
  homeScore: number | null;
  awayScore: number | null;
  homeTeamId: string | null;
  awayTeamId: string | null;
  advancingTeamId: string | null;
}

interface ThirdAssignmentPayload {
  slotMatchId: string;
  teamId: string | null;
}

const DEBOUNCE_MS = 500;

/**
 * Persistencia incremental de cambios de predicción en Supabase.
 *
 * Cada cambio (group score, knockout score, third place assignment) se persiste
 * con debounce de 500ms por clave (matchId / slotMatchId). Si el RPC falla,
 * status pasa a 'error' y el caller decide qué hacer (típicamente mantener el
 * cambio local y mostrar un badge de error).
 *
 * En USE_MOCKS no hace nada (el estado local + localStorage del wizard alcanza).
 */
export function usePredictionAutoSave(ticketId: string) {
  const timers = useRef<Map<string, number>>(new Map());
  const inflight = useRef<Set<string>>(new Set());
  const [status, setStatus] = useState<AutoSaveStatus>('idle');
  const [lastError, setLastError] = useState<string | null>(null);

  // Limpieza al desmontar
  useEffect(() => {
    return () => {
      timers.current.forEach((t) => window.clearTimeout(t));
      timers.current.clear();
    };
  }, []);

  const updateStatus = useCallback(() => {
    if (inflight.current.size > 0) {
      setStatus('saving');
      return;
    }
    setStatus((current) => (current === 'error' ? 'error' : 'saved'));
  }, []);

  const enqueue = useCallback((key: string, run: () => Promise<{ error?: { message: string } | null }>) => {
    if (USE_MOCKS || !supabase) return;
    const prev = timers.current.get(key);
    if (prev) window.clearTimeout(prev);
    setStatus('saving');
    setLastError(null);
    const timer = window.setTimeout(async () => {
      timers.current.delete(key);
      inflight.current.add(key);
      try {
        const { error } = await run();
        if (error) {
          setStatus('error');
          setLastError(error.message);
        }
      } catch (err) {
        setStatus('error');
        setLastError(err instanceof Error ? err.message : 'Error de red.');
      } finally {
        inflight.current.delete(key);
        if (inflight.current.size === 0 && timers.current.size === 0) {
          // Solo marcar 'saved' si no hubo error desde la última vez que se limpió.
          setStatus((current) => (current === 'error' ? 'error' : 'saved'));
        } else {
          updateStatus();
        }
      }
    }, DEBOUNCE_MS);
    timers.current.set(key, timer);
  }, [updateStatus]);

  const saveGroupScore = useCallback((p: GroupScorePayload) => {
    const sb = supabase;
    if (!sb) return;
    const key = `g-${p.matchId}`;
    if (p.homeScore === null || p.awayScore === null) {
      enqueue(key, async () => sb.rpc('delete_prediction_match_score', {
        p_ticket_id: ticketId,
        p_match_id: p.matchId
      }));
      return;
    }
    enqueue(key, async () => sb.rpc('save_prediction_match_score', {
      p_ticket_id: ticketId,
      p_match_id: p.matchId,
      p_home_score: p.homeScore as number,
      p_away_score: p.awayScore as number
    }));
  }, [enqueue, ticketId]);

  const saveKnockoutScore = useCallback((p: KnockoutScorePayload) => {
    const sb = supabase;
    if (!sb) return;
    const key = `k-${p.matchId}`;
    if (p.homeScore === null || p.awayScore === null || !p.homeTeamId || !p.awayTeamId) {
      enqueue(key, async () => sb.rpc('delete_prediction_match_score', {
        p_ticket_id: ticketId,
        p_match_id: p.matchId
      }));
      return;
    }
    const penaltyWinner = p.homeScore === p.awayScore ? p.advancingTeamId : null;
    enqueue(key, async () => sb.rpc('save_prediction_match_score', {
      p_ticket_id: ticketId,
      p_match_id: p.matchId,
      p_home_score: p.homeScore as number,
      p_away_score: p.awayScore as number,
      p_penalty_winner_team_id: penaltyWinner,
      p_home_team_id: p.homeTeamId,
      p_away_team_id: p.awayTeamId
    }));
  }, [enqueue, ticketId]);

  const saveThirdAssignment = useCallback((p: ThirdAssignmentPayload) => {
    const sb = supabase;
    if (!sb) return;
    const key = `t-${p.slotMatchId}`;
    if (!p.teamId) {
      enqueue(key, async () => sb.rpc('clear_prediction_third_place_assignment', {
        p_ticket_id: ticketId,
        p_slot_match_id: p.slotMatchId
      }));
      return;
    }
    enqueue(key, async () => sb.rpc('save_prediction_third_place_assignment', {
      p_ticket_id: ticketId,
      p_slot_match_id: p.slotMatchId,
      p_team_id: p.teamId
    }));
  }, [enqueue, ticketId]);

  return { status, lastError, saveGroupScore, saveKnockoutScore, saveThirdAssignment };
}
