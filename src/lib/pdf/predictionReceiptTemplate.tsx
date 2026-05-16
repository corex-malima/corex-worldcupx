import { Document, Image, Page, StyleSheet, Text, View } from '@react-pdf/renderer';
import type { Match, Team } from '../../types/tournament';
import type { PredictedBracketMatch, ThirdPlaceSlot } from '../../types/prediction';

const palette = {
  ink: '#0B0B0D',
  bone: '#F5F4F1',
  slate: '#5C6F89',
  mist: '#8A9099',
  line: '#D9DBDD',
  faint: '#F2F3F4',
  gold: '#C7A03D'
};

const styles = StyleSheet.create({
  page: { paddingTop: 28, paddingBottom: 36, paddingHorizontal: 28, fontSize: 9, color: palette.ink, fontFamily: 'Helvetica' },
  brandRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  brandBox: { width: 36, height: 36, borderRadius: 8, backgroundColor: palette.ink, marginRight: 10, justifyContent: 'center', alignItems: 'center' },
  brandLetter: { color: palette.bone, fontSize: 18, fontFamily: 'Helvetica-Bold' },
  brandTitle: { fontSize: 14, fontFamily: 'Helvetica-Bold', color: palette.ink },
  brandSub: { fontSize: 8, color: palette.slate, marginTop: 2, letterSpacing: 1 },
  metaRow: { flexDirection: 'row', marginTop: 6, marginBottom: 14 },
  metaCell: { flex: 1, borderWidth: 1, borderColor: palette.line, borderRadius: 4, padding: 6, marginRight: 8 },
  metaLabel: { fontSize: 7, color: palette.mist, letterSpacing: 1 },
  metaValue: { fontSize: 10, marginTop: 8, fontFamily: 'Helvetica-Bold' },
  championBanner: { backgroundColor: palette.ink, color: palette.bone, padding: 10, borderRadius: 8, marginBottom: 10, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  championLabel: { color: palette.mist, fontSize: 8, letterSpacing: 1 },
  championValue: { color: palette.bone, fontSize: 14, fontFamily: 'Helvetica-Bold' },
  thirdLabel: { color: palette.mist, fontSize: 8, letterSpacing: 1 },
  thirdValue: { color: palette.gold, fontSize: 12, fontFamily: 'Helvetica-Bold' },
  sectionTitle: { fontSize: 11, fontFamily: 'Helvetica-Bold', backgroundColor: palette.faint, paddingVertical: 4, paddingHorizontal: 6, marginTop: 8, marginBottom: 4 },
  groupsGrid: { flexDirection: 'row', flexWrap: 'wrap' },
  groupCard: { width: '50%', paddingRight: 6, paddingBottom: 6 },
  groupTitle: { fontSize: 9, fontFamily: 'Helvetica-Bold', paddingVertical: 3, paddingHorizontal: 5, backgroundColor: palette.faint },
  matchRow: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: palette.line, borderTopWidth: 0, paddingVertical: 4, paddingHorizontal: 5 },
  matchNo: { width: 12, fontSize: 6, color: palette.mist, fontFamily: 'Helvetica-Bold' },
  teamCell: { flex: 1, flexDirection: 'row', alignItems: 'center', minWidth: 0 },
  teamCellRight: { flex: 1, flexDirection: 'row', alignItems: 'center', minWidth: 0, justifyContent: 'flex-end' },
  flag: { width: 12, height: 12, borderRadius: 6, marginRight: 3 },
  flagRight: { width: 12, height: 12, borderRadius: 6, marginLeft: 3 },
  teamCode: { fontSize: 7, color: palette.ink, fontFamily: 'Helvetica-Bold' },
  scoreCell: { flexDirection: 'row', alignItems: 'center', width: 40, justifyContent: 'center' },
  scoreBox: { borderWidth: 1, borderColor: palette.ink, borderRadius: 2, paddingVertical: 1, paddingHorizontal: 4, marginHorizontal: 2 },
  scoreText: { fontSize: 8, fontFamily: 'Helvetica-Bold', color: palette.ink },
  scoreDash: { fontSize: 8, fontFamily: 'Helvetica-Bold' },
  thirdsList: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: 8 },
  thirdItem: { width: '25%', paddingRight: 6, paddingBottom: 4, flexDirection: 'row', alignItems: 'center' },
  bracketGrid: { flexDirection: 'row', flexWrap: 'wrap' },
  bracketCard: { width: '33%', paddingRight: 4, paddingBottom: 4 },
  bracketInner: { borderWidth: 1, borderColor: palette.line, borderRadius: 3, padding: 4 },
  bracketMatchNo: { fontSize: 6, color: palette.mist, fontFamily: 'Helvetica-Bold' },
  bracketRow: { flexDirection: 'row', alignItems: 'center', marginTop: 2 },
  bracketTeam: { fontSize: 7, flex: 1, color: palette.ink },
  bracketTeamBold: { fontSize: 7, flex: 1, color: palette.ink, fontFamily: 'Helvetica-Bold' },
  footer: { position: 'absolute', bottom: 16, left: 28, right: 28, flexDirection: 'row', justifyContent: 'space-between', fontSize: 7, color: palette.mist }
});

const GROUP_CODES = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L'] as const;

interface Props {
  teams: Team[];
  matches: Match[];
  groupScoresByMatch: Record<string, { homeScore: number | null; awayScore: number | null }>;
  thirdPlaceSlots: ThirdPlaceSlot[];
  bracketMatches: PredictedBracketMatch[];
  championTeamId: string | null;
  thirdPlaceTeamId: string | null;
  ticket: { code: string | null; ownerName: string | null; alias?: string | null; submittedAt?: string | null };
  flagPngs?: Map<string, string>;
}

function FlagOrCode({ team, flagSrc, align = 'left' }: { team: Team | null | undefined; flagSrc: string | undefined; align?: 'left' | 'right' }) {
  if (!team) return <Text style={styles.teamCode}>(sin asignar)</Text>;
  const flag = flagSrc ? (
    <Image src={flagSrc} style={align === 'right' ? styles.flagRight : styles.flag} />
  ) : null;
  const label = <Text style={styles.teamCode}>{team.fifaCode}</Text>;
  return align === 'right' ? (<>{label}{flag}</>) : (<>{flag}{label}</>);
}

export function PredictionReceiptDocument({
  teams,
  matches,
  groupScoresByMatch,
  thirdPlaceSlots,
  bracketMatches,
  championTeamId,
  thirdPlaceTeamId,
  ticket,
  flagPngs
}: Props) {
  const teamById = new Map(teams.map((t) => [t.id, t]));
  const champion = championTeamId ? teamById.get(championTeamId) : null;
  const thirdPlace = thirdPlaceTeamId ? teamById.get(thirdPlaceTeamId) : null;
  const groupMatches = matches.filter((m) => m.stage === 'GROUP').sort((a, b) => a.matchNo - b.matchNo);
  const matchesByGroup = new Map<string, Match[]>();
  GROUP_CODES.forEach((code) => matchesByGroup.set(code, []));
  groupMatches.forEach((m) => {
    if (m.groupCode && matchesByGroup.has(m.groupCode)) matchesByGroup.get(m.groupCode)!.push(m);
  });

  const renderGroupMatch = (m: Match) => {
    const home = m.homeTeamId ? teamById.get(m.homeTeamId) ?? null : null;
    const away = m.awayTeamId ? teamById.get(m.awayTeamId) ?? null : null;
    const score = groupScoresByMatch[m.id];
    const homeFlag = home ? flagPngs?.get(home.fifaCode.toLowerCase()) : undefined;
    const awayFlag = away ? flagPngs?.get(away.fifaCode.toLowerCase()) : undefined;
    return (
      <View key={m.id} style={styles.matchRow}>
        <Text style={styles.matchNo}>{m.matchNo}</Text>
        <View style={styles.teamCell}>
          <FlagOrCode team={home} flagSrc={homeFlag} align="left" />
        </View>
        <View style={styles.scoreCell}>
          <View style={styles.scoreBox}>
            <Text style={styles.scoreText}>{score?.homeScore ?? ' '}</Text>
          </View>
          <Text style={styles.scoreDash}>-</Text>
          <View style={styles.scoreBox}>
            <Text style={styles.scoreText}>{score?.awayScore ?? ' '}</Text>
          </View>
        </View>
        <View style={styles.teamCellRight}>
          <FlagOrCode team={away} flagSrc={awayFlag} align="right" />
        </View>
      </View>
    );
  };

  const renderBracketCard = (m: PredictedBracketMatch) => {
    const home = m.homeTeamId ? teamById.get(m.homeTeamId) ?? null : null;
    const away = m.awayTeamId ? teamById.get(m.awayTeamId) ?? null : null;
    const homeFlag = home ? flagPngs?.get(home.fifaCode.toLowerCase()) : undefined;
    const awayFlag = away ? flagPngs?.get(away.fifaCode.toLowerCase()) : undefined;
    const homeWins = m.advancingTeamId && m.advancingTeamId === home?.id;
    const awayWins = m.advancingTeamId && m.advancingTeamId === away?.id;
    return (
      <View key={m.id} style={styles.bracketCard}>
        <View style={styles.bracketInner}>
          <Text style={styles.bracketMatchNo}>#{m.matchNo} {m.roundCode}</Text>
          <View style={styles.bracketRow}>
            {homeFlag && <Image src={homeFlag} style={styles.flag} />}
            <Text style={homeWins ? styles.bracketTeamBold : styles.bracketTeam}>{home?.name ?? m.homeSlot ?? '—'}</Text>
            <Text style={styles.scoreText}>{m.homeScore ?? ' '}</Text>
          </View>
          <View style={styles.bracketRow}>
            {awayFlag && <Image src={awayFlag} style={styles.flag} />}
            <Text style={awayWins ? styles.bracketTeamBold : styles.bracketTeam}>{away?.name ?? m.awaySlot ?? '—'}</Text>
            <Text style={styles.scoreText}>{m.awayScore ?? ' '}</Text>
          </View>
        </View>
      </View>
    );
  };

  const submittedDate = ticket.submittedAt ? new Date(ticket.submittedAt).toLocaleString('es-EC') : new Date().toLocaleString('es-EC');

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.brandRow}>
          <View style={styles.brandBox}>
            <Text style={styles.brandLetter}>W</Text>
          </View>
          <View>
            <Text style={styles.brandTitle}>WorldCupX · Comprobante de Predicción</Text>
            <Text style={styles.brandSub}>MUNDIAL 2026 · COREX · BY P&P · MALIMA</Text>
          </View>
        </View>

        <View style={styles.metaRow}>
          <View style={styles.metaCell}>
            <Text style={styles.metaLabel}>COLABORADOR</Text>
            <Text style={styles.metaValue}>{ticket.ownerName ?? ' '}</Text>
          </View>
          <View style={styles.metaCell}>
            <Text style={styles.metaLabel}>TICKET</Text>
            <Text style={styles.metaValue}>{ticket.alias ?? ticket.code ?? ' '}</Text>
          </View>
          <View style={{ ...styles.metaCell, marginRight: 0 }}>
            <Text style={styles.metaLabel}>ENVIADO</Text>
            <Text style={styles.metaValue}>{submittedDate}</Text>
          </View>
        </View>

        <View style={styles.championBanner}>
          <View>
            <Text style={styles.championLabel}>CAMPEÓN PREDICHO</Text>
            <Text style={styles.championValue}>{champion?.name ?? '—'}</Text>
          </View>
          <View>
            <Text style={styles.thirdLabel}>TERCER PUESTO</Text>
            <Text style={styles.thirdValue}>{thirdPlace?.name ?? '—'}</Text>
          </View>
        </View>

        <Text style={styles.sectionTitle}>Fase de grupos · marcadores predichos</Text>
        <View style={styles.groupsGrid}>
          {GROUP_CODES.map((code) => (
            <View key={code} style={styles.groupCard}>
              <Text style={styles.groupTitle}>Grupo {code}</Text>
              {(matchesByGroup.get(code) ?? []).map(renderGroupMatch)}
            </View>
          ))}
        </View>

        <Text style={styles.sectionTitle} break>Mejores terceros asignados</Text>
        <View style={styles.thirdsList}>
          {thirdPlaceSlots.flatMap((s) => {
            if (!s.assignedTeamId) return [];
            const team = teamById.get(s.assignedTeamId) ?? null;
            const flagSrc = team ? flagPngs?.get(team.fifaCode.toLowerCase()) : undefined;
            return [(
              <View key={s.slotId} style={styles.thirdItem}>
                {flagSrc && <Image src={flagSrc} style={styles.flag} />}
                <Text style={styles.teamCode}>{team?.name ?? '(sin asignar)'} → P{s.matchNo}</Text>
              </View>
            )];
          })}
        </View>

        <Text style={styles.sectionTitle}>Bracket · ganadores predichos por partido</Text>
        <View style={styles.bracketGrid}>
          {bracketMatches.sort((a, b) => a.matchNo - b.matchNo).map(renderBracketCard)}
        </View>

        <View style={styles.footer} fixed>
          <Text>Comprobante · Conserva una copia. Cualquier reclamo presentarlo a TTHH.</Text>
          <Text>v0.1.3</Text>
        </View>
      </Page>
    </Document>
  );
}
