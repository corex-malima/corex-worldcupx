import { Document, Page, StyleSheet, Text, View } from '@react-pdf/renderer';
import type { Match, Team } from '../../types/tournament';

const palette = {
  ink: '#0B0B0D',
  graphite: '#1A1B1E',
  bone: '#F5F4F1',
  slate: '#5C6F89',
  mist: '#8A9099',
  paper: '#FFFFFF',
  line: '#D9DBDD',
  faint: '#F2F3F4'
};

const styles = StyleSheet.create({
  page: { paddingTop: 28, paddingBottom: 28, paddingHorizontal: 28, fontSize: 9, color: palette.ink, fontFamily: 'Helvetica' },
  brandRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  brandBox: { width: 36, height: 36, borderRadius: 8, backgroundColor: palette.ink, marginRight: 10, justifyContent: 'center', alignItems: 'center' },
  brandLetter: { color: palette.bone, fontSize: 18, fontFamily: 'Helvetica-Bold' },
  brandTitle: { fontSize: 14, fontFamily: 'Helvetica-Bold', color: palette.ink },
  brandSub: { fontSize: 8, color: palette.slate, marginTop: 2, letterSpacing: 1 },
  metaRow: { flexDirection: 'row', marginTop: 6, marginBottom: 14 },
  metaCell: { flex: 1, borderWidth: 1, borderColor: palette.line, borderRadius: 4, padding: 6, marginRight: 8 },
  metaLabel: { fontSize: 7, color: palette.mist, letterSpacing: 1 },
  metaValue: { fontSize: 10, marginTop: 12 },
  groupsGrid: { flexDirection: 'row', flexWrap: 'wrap' },
  groupCard: { width: '50%', paddingRight: 6, paddingBottom: 8 },
  groupTitle: { fontSize: 11, fontFamily: 'Helvetica-Bold', color: palette.ink, paddingVertical: 4, paddingHorizontal: 6, backgroundColor: palette.faint, borderTopLeftRadius: 4, borderTopRightRadius: 4 },
  matchRow: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: palette.line, borderTopWidth: 0, paddingVertical: 5, paddingHorizontal: 6 },
  matchNo: { width: 18, fontSize: 7, color: palette.mist, fontFamily: 'Helvetica-Bold' },
  teamCell: { flex: 1, flexDirection: 'row', alignItems: 'center' },
  badge: { width: 14, height: 14, borderRadius: 7, marginRight: 4, justifyContent: 'center', alignItems: 'center' },
  badgeText: { fontSize: 6, fontFamily: 'Helvetica-Bold', color: palette.bone },
  teamName: { fontSize: 8, color: palette.ink },
  awayCell: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end' },
  scoreCell: { flexDirection: 'row', alignItems: 'center', width: 50, justifyContent: 'center' },
  scoreBox: { width: 18, height: 18, borderWidth: 1, borderColor: palette.ink, borderRadius: 3, marginHorizontal: 2 },
  scoreDash: { fontSize: 10, fontFamily: 'Helvetica-Bold' },
  dateCell: { width: 40, textAlign: 'right', fontSize: 6, color: palette.mist },
  footer: { position: 'absolute', bottom: 16, left: 28, right: 28, flexDirection: 'row', justifyContent: 'space-between', fontSize: 7, color: palette.mist }
});

/** Color estable derivado del FIFA code para los badges */
function badgeColor(fifaCode: string): string {
  let hash = 0;
  for (let i = 0; i < fifaCode.length; i += 1) hash = (hash * 31 + fifaCode.charCodeAt(i)) % 360;
  return `hsl(${hash}, 55%, 35%)`;
}

function formatDate(iso?: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString('es-EC', { day: '2-digit', month: 'short' });
}

const GROUP_CODES = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L'] as const;

interface Props {
  teams: Team[];
  matches: Match[];
  ticket?: { code: string | null; ownerName: string | null; alias?: string | null } | null;
}

export function GroupStageTemplateDocument({ teams, matches, ticket }: Props) {
  const teamById = new Map(teams.map((t) => [t.id, t]));
  const groupMatches = matches
    .filter((m) => m.stage === 'GROUP' && m.groupCode)
    .sort((a, b) => a.matchNo - b.matchNo);
  const matchesByGroup = new Map<string, Match[]>();
  GROUP_CODES.forEach((code) => matchesByGroup.set(code, []));
  groupMatches.forEach((m) => {
    if (m.groupCode && matchesByGroup.has(m.groupCode)) {
      matchesByGroup.get(m.groupCode)!.push(m);
    }
  });

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.brandRow}>
          <View style={styles.brandBox}>
            <Text style={styles.brandLetter}>W</Text>
          </View>
          <View>
            <Text style={styles.brandTitle}>WorldCupX · Plantilla Fase de Grupos</Text>
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
            <Text style={styles.metaLabel}>FECHA</Text>
            <Text style={styles.metaValue}>{new Date().toLocaleDateString('es-EC')}</Text>
          </View>
        </View>

        {/* Groups grid */}
        <View style={styles.groupsGrid}>
          {GROUP_CODES.map((code) => {
            const list = matchesByGroup.get(code) ?? [];
            return (
              <View key={code} style={styles.groupCard}>
                <Text style={styles.groupTitle}>Grupo {code}</Text>
                {list.map((m) => {
                  const home = m.homeTeamId ? teamById.get(m.homeTeamId) : null;
                  const away = m.awayTeamId ? teamById.get(m.awayTeamId) : null;
                  return (
                    <View key={m.id} style={styles.matchRow}>
                      <Text style={styles.matchNo}>#{m.matchNo}</Text>
                      <View style={styles.teamCell}>
                        {home && (
                          <View style={{ ...styles.badge, backgroundColor: badgeColor(home.fifaCode) }}>
                            <Text style={styles.badgeText}>{home.fifaCode}</Text>
                          </View>
                        )}
                        <Text style={styles.teamName}>{home?.name ?? '—'}</Text>
                      </View>
                      <View style={styles.scoreCell}>
                        <View style={styles.scoreBox} />
                        <Text style={styles.scoreDash}>-</Text>
                        <View style={styles.scoreBox} />
                      </View>
                      <View style={styles.awayCell}>
                        <Text style={styles.teamName}>{away?.name ?? '—'}</Text>
                        {away && (
                          <View style={{ ...styles.badge, marginLeft: 4, marginRight: 0, backgroundColor: badgeColor(away.fifaCode) }}>
                            <Text style={styles.badgeText}>{away.fifaCode}</Text>
                          </View>
                        )}
                      </View>
                      <Text style={styles.dateCell}>{formatDate(m.matchDatetime)}</Text>
                    </View>
                  );
                })}
              </View>
            );
          })}
        </View>

        <View style={styles.footer} fixed>
          <Text>Llenar a mano · entregar a TTHH antes del 11/jun/2026 15:00</Text>
          <Text>v0.1.1</Text>
        </View>
      </Page>
    </Document>
  );
}
