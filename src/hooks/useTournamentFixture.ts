import { useEffect, useState } from 'react';
import { USE_MOCKS } from '../lib/constants';
import { supabase } from '../lib/supabase';
import { mockMatches } from '../data/mock/matches';
import { mockTeams } from '../data/mock/teams';
import type { Match, Stage, Team } from '../types/tournament';

interface TournamentFixture {
  teams: Team[];
  matches: Match[];
}

interface DbTeamRow {
  id: string;
  fifa_code: string;
  name: string;
  group_code: string | null;
  flag_emoji: string | null;
  flag_url: string | null;
  primary_color: string | null;
  secondary_color: string | null;
  seed_order: number | null;
}

interface DbMatchRow {
  id: string;
  match_no: number;
  stage: Stage;
  group_code: string | null;
  home_team_id: string | null;
  away_team_id: string | null;
  home_slot: string | null;
  away_slot: string | null;
  match_datetime: string | null;
  venue: string | null;
  status: 'scheduled' | 'live' | 'official';
  home_score: number | null;
  away_score: number | null;
  penalty_winner_team_id: string | null;
  winner_team_id: string | null;
}

function flagUrlForCode(fifaCode: string): string {
  return `${import.meta.env.BASE_URL}assets/flags/circle/${fifaCode.toLowerCase()}.svg`;
}

function mapTeam(row: DbTeamRow): Team {
  return {
    id: row.id,
    fifaCode: row.fifa_code,
    name: row.name,
    groupCode: row.group_code ?? '',
    flagEmoji: row.flag_emoji ?? '',
    flagUrl: row.flag_url ?? flagUrlForCode(row.fifa_code),
    primaryColor: row.primary_color ?? undefined,
    secondaryColor: row.secondary_color ?? undefined,
    seedOrder: row.seed_order ?? 999
  };
}

function mapMatch(row: DbMatchRow): Match {
  return {
    id: row.id,
    matchNo: row.match_no,
    stage: row.stage,
    groupCode: row.group_code,
    homeTeamId: row.home_team_id,
    awayTeamId: row.away_team_id,
    homeSlot: row.home_slot,
    awaySlot: row.away_slot,
    matchDatetime: row.match_datetime,
    venue: row.venue,
    status: row.status,
    homeScore: row.home_score,
    awayScore: row.away_score,
    penaltyWinnerTeamId: row.penalty_winner_team_id,
    winnerTeamId: row.winner_team_id
  };
}

const MOCK_FIXTURE: TournamentFixture = { teams: mockTeams, matches: mockMatches };

export function useTournamentFixture() {
  const [fixture, setFixture] = useState<TournamentFixture>(MOCK_FIXTURE);
  const [loading, setLoading] = useState(!USE_MOCKS && Boolean(supabase));
  const [error, setError] = useState<string | null>(null);

  async function load() {
    if (USE_MOCKS || !supabase) {
      setFixture(MOCK_FIXTURE);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const [teamsRes, matchesRes] = await Promise.all([
        supabase.from('teams').select('*'),
        supabase.from('matches').select('*').order('match_no')
      ]);
      if (teamsRes.error) throw new Error(teamsRes.error.message);
      if (matchesRes.error) throw new Error(matchesRes.error.message);
      setFixture({
        teams: (teamsRes.data ?? []).map((row) => mapTeam(row as unknown as DbTeamRow)),
        matches: (matchesRes.data ?? []).map((row) => mapMatch(row as unknown as DbMatchRow))
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo cargar el fixture.');
      setFixture(MOCK_FIXTURE);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  return { fixture, loading, error, reload: load };
}
