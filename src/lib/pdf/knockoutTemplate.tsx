import { Document, Page, StyleSheet, Text, View } from '@react-pdf/renderer';
import type { Match, ScorePrediction, Team } from '../../types/tournament';
import { calculateGroupStandings, getQualifiedTeams } from '../../lib/standings';

const palette = {
  ink: '#0B0B0D',
  bone: '#F5F4F1',
  slate: '#5C6F89',
  mist: '#8A9099',
  line: '#D9DBDD',
  faint: '#F2F3F4'
};

const styles = StyleSheet.create({
  page: { paddingTop: 28, paddingBottom: 28, paddingHorizontal: 28, fontSize: 9, color: palette.ink, fontFamily: 'Helvetica' },
  brandRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  brandBox: { width: 36, height: 36, borderRadius: 8, backgroundColor: palette.ink, marginRight: 10, justifyContent: 'center', alignItems: 'center' },
  brandLetter: { color: palette.bone, fontSize: 18, fontFamily: 'Helvetica-Bold' },
  brandTitle: { fontSize: 14, fontFamily: 'Helvetica-Bold' },
  brandSub: { fontSize: 8, color: palette.slate, marginTop: 2, letterSpacing: 1 },
  metaRow: { flexDirection: 'row', marginTop: 6, marginBottom: 14 },
  metaCell: { flex: 1, borderWidth: 1, borderColor: palette.line, borderRadius: 4, padding: 6, marginRight: 8 },
  metaLabel: { fontSize: 7, color: palette.mist, letterSpacing: 1 },
  metaValue: { fontSize: 10, marginTop: 12 },
  ticketBadge: { fontSize: 8, fontFamily: 'Helvetica-Bold', color: palette.ink, marginTop: 4 },
  roundTitle: { fontSize: 11, fontFamily: 'Helvetica-Bold', backgroundColor: palette.faint, paddingVertical: 4, paddingHorizontal: 6, marginTop: 10, marginBottom: 2 },
  matchesGrid: { flexDirection: 'row', flexWrap: 'wrap' },
  matchCard: { width: '50%', paddingRight: 6, paddingBottom: 6 },
  matchInner: { borderWidth: 1, borderColor: palette.line, borderRadius: 4, padding: 6 },
  matchHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  matchNo: { fontSize: 8, fontFamily: 'Helvetica-Bold', color: palette.slate },
  matchVenue: { fontSize: 6, color: palette.mist },
  slotRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginVertical: 2 },
  slotLabel: { fontSize: 8, flex: 1 },
  slotHint: { fontSize: 6, color: palette.mist, marginLeft: 4 },
  scoreBox: { width: 18, height: 18, borderWidth: 1, borderColor: palette.ink, borderRadius: 3 },
  vsLine: { borderBottomWidth: 1, borderColor: palette.line, marginVertical: 2 },
  winnerRow: { flexDirection: 'row', alignItems: 'center', marginTop: 4 },
  winnerLabel: { fontSize: 7, color: palette.mist, marginRight: 4 },
  winnerLine: { flex: 1, borderBottomWidth: 1, borderColor: palette.mist, marginRight: 2, height: 14 },
  finalsRow: { flexDirection: 'row', marginTop: 14 },
  finalCard: { flex: 1, borderWidth: 1, borderColor: palette.ink, borderRadius: 4, padding: 8, marginRight: 8 },
  finalTitle: { fontSize: 10, fontFamily: 'Helvetica-Bold' },
  finalField: { fontSize: 7, color: palette.mist, marginTop: 4 },
  finalLine: { borderBottomWidth: 1, borderColor: palette.mist, height: 14, marginTop: 2 },
  footer: { position: 'absolute', bottom: 16, left: 28, right: 28, flexDirection: 'row', justifyContent: 'space-between', fontSize: 7, color: palette.mist }
});

interface Props {
  matches: Match[];
  teams?: Team[];
  ticket?: { code: string | null; ownerName: string | null; alias?: string | null } | null;
  /** Predicciones de fase de grupos del ticket. Si se pasan + teams, los slots R32 muestran los teams predichos. */
  groupScores?: ScorePrediction[];
}

function formatVenue(venue?: string | null): string {
  if (!venue) return '';
  return venue.replace(/^Estadio\s+/i, '');
}

/**
 * Si tenemos teams + groupScores, computamos standings predichos y resolvemos los
 * slots literales del fixture (1A, 2B, 3A/B/C/D/F) a equipos reales según las
 * predicciones del ticket.
 */
function resolveSlotLabel(slot: string | null | undefined, teamsById: Map<string, Team>, standingsByGroupPosition: Map<string, string>, bestThirdGroups: string[]): string {
  if (!slot) return '—';
  const trimmed = slot.trim();
  // Compacto: '1A', '2B', '3C'
  const compact = trimmed.match(/^([123])([A-L])$/);
  if (compact) {
    const teamId = standingsByGroupPosition.get(`${compact[1]}-${compact[2]}`);
    if (!teamId) return trimmed;
    const team = teamsById.get(teamId);
    return team ? `${team.name} (${compact[1]}.º ${compact[2]})` : trimmed;
  }
  // Tercero: '3A/B/C/D/F'
  if (/^3[A-L/]+$/.test(trimmed)) {
    const allowed = trimmed.slice(1).split('/');
    // Tomamos el primer grupo permitido que esté entre los mejores 8 terceros.
    const matchedGroup = allowed.find((g) => bestThirdGroups.includes(g));
    if (!matchedGroup) return `${trimmed} (mejor tercero)`;
    const teamId = standingsByGroupPosition.get(`3-${matchedGroup}`);
    if (!teamId) return `${trimmed} (mejor tercero)`;
    const team = teamsById.get(teamId);
    return team ? `${team.name} (3.º ${matchedGroup})` : trimmed;
  }
  return trimmed;
}

export function KnockoutTemplateDocument({ matches, teams, ticket, groupScores }: Props) {
  const knockout = matches.filter((m) => m.stage !== 'GROUP').sort((a, b) => a.matchNo - b.matchNo);
  const groupMatches = matches.filter((m) => m.stage === 'GROUP');
  const r32 = knockout.filter((m) => m.stage === 'R32');
  const r16 = knockout.filter((m) => m.stage === 'R16');
  const qf = knockout.filter((m) => m.stage === 'QF');
  const sf = knockout.filter((m) => m.stage === 'SF');
  const third = knockout.find((m) => m.stage === 'THIRD_PLACE');
  const final = knockout.find((m) => m.stage === 'FINAL');

  const teamsById = new Map<string, Team>((teams ?? []).map((t) => [t.id, t]));

  // Compute standings desde groupScores (si están disponibles).
  let standingsByGroupPosition = new Map<string, string>();
  let bestThirdGroups: string[] = [];
  let isResolved = false;
  if (teams && groupScores && groupScores.length > 0) {
    try {
      const standings = calculateGroupStandings(teams, groupMatches, groupScores);
      const qualified = getQualifiedTeams(standings);
      standings.forEach((row) => {
        standingsByGroupPosition.set(`${row.position}-${row.groupCode}`, row.teamId);
      });
      bestThirdGroups = qualified.bestThirds.map((row) => row.groupCode);
      isResolved = standings.length > 0;
    } catch {
      // si el calculo falla, caemos al fallback (slots literales)
      isResolved = false;
    }
  }

  const renderMatchCard = (m: Match) => {
    const homeLabel = isResolved
      ? resolveSlotLabel(m.homeSlot, teamsById, standingsByGroupPosition, bestThirdGroups)
      : (m.homeSlot ?? '—');
    const awayLabel = isResolved
      ? resolveSlotLabel(m.awaySlot, teamsById, standingsByGroupPosition, bestThirdGroups)
      : (m.awaySlot ?? '—');
    return (
      <View key={m.id} style={styles.matchCard}>
        <View style={styles.matchInner}>
          <View style={styles.matchHeader}>
            <Text style={styles.matchNo}>Partido #{m.matchNo}</Text>
            <Text style={styles.matchVenue}>{formatVenue(m.venue)}</Text>
          </View>
          <View style={styles.slotRow}>
            <Text style={styles.slotLabel}>{homeLabel}</Text>
            <View style={styles.scoreBox} />
          </View>
          <View style={styles.vsLine} />
          <View style={styles.slotRow}>
            <Text style={styles.slotLabel}>{awayLabel}</Text>
            <View style={styles.scoreBox} />
          </View>
          <View style={styles.winnerRow}>
            <Text style={styles.winnerLabel}>Ganador:</Text>
            <View style={styles.winnerLine} />
          </View>
        </View>
      </View>
    );
  };

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.brandRow}>
          <View style={styles.brandBox}>
            <Text style={styles.brandLetter}>W</Text>
          </View>
          <View>
            <Text style={styles.brandTitle}>WorldCupX · Plantilla Eliminatorias</Text>
            <Text style={styles.brandSub}>MUNDIAL 2026 · COREX · BY P&P · MALIMA</Text>
          </View>
        </View>

        <View style={styles.metaRow}>
          <View style={styles.metaCell}>
            <Text style={styles.metaLabel}>COLABORADOR</Text>
            <Text style={styles.metaValue}>{ticket?.ownerName ?? ' '}</Text>
          </View>
          <View style={styles.metaCell}>
            <Text style={styles.metaLabel}>TICKET</Text>
            <Text style={styles.metaValue}>{ticket?.alias ?? ticket?.code ?? ' '}</Text>
          </View>
          <View style={{ ...styles.metaCell, marginRight: 0 }}>
            <Text style={styles.metaLabel}>FASE DE GRUPOS</Text>
            <Text style={styles.ticketBadge}>{isResolved ? 'Resuelta · slots con equipos del ticket' : 'Sin datos · usa slots del fixture'}</Text>
          </View>
        </View>

        <Text style={styles.roundTitle}>Dieciseisavos de final (R32)</Text>
        <View style={styles.matchesGrid}>{r32.map(renderMatchCard)}</View>

        <Text style={styles.roundTitle} break>Octavos de final (R16)</Text>
        <View style={styles.matchesGrid}>{r16.map(renderMatchCard)}</View>

        <Text style={styles.roundTitle}>Cuartos de final (QF)</Text>
        <View style={styles.matchesGrid}>{qf.map(renderMatchCard)}</View>

        <Text style={styles.roundTitle}>Semifinales (SF)</Text>
        <View style={styles.matchesGrid}>{sf.map(renderMatchCard)}</View>

        <View style={styles.finalsRow}>
          {third && (
            <View style={styles.finalCard}>
              <Text style={styles.finalTitle}>Tercer puesto (Partido #{third.matchNo})</Text>
              <Text style={styles.finalField}>{third.homeSlot} vs {third.awaySlot}</Text>
              <View style={styles.slotRow}>
                <Text style={styles.slotLabel}>Marcador</Text>
                <View style={styles.scoreBox} />
                <Text style={{ marginHorizontal: 4 }}>-</Text>
                <View style={styles.scoreBox} />
              </View>
              <Text style={styles.finalField}>Ganador (3er puesto)</Text>
              <View style={styles.finalLine} />
            </View>
          )}
          {final && (
            <View style={{ ...styles.finalCard, marginRight: 0 }}>
              <Text style={styles.finalTitle}>Final (Partido #{final.matchNo})</Text>
              <Text style={styles.finalField}>{final.homeSlot} vs {final.awaySlot}</Text>
              <View style={styles.slotRow}>
                <Text style={styles.slotLabel}>Marcador</Text>
                <View style={styles.scoreBox} />
                <Text style={{ marginHorizontal: 4 }}>-</Text>
                <View style={styles.scoreBox} />
              </View>
              <Text style={styles.finalField}>Campeón</Text>
              <View style={styles.finalLine} />
            </View>
          )}
        </View>

        <View style={styles.footer} fixed>
          <Text>Llenar a mano tras la fase de grupos · entregar a TTHH antes del 28/jun/2026</Text>
          <Text>v0.1.1</Text>
        </View>
      </Page>
    </Document>
  );
}
