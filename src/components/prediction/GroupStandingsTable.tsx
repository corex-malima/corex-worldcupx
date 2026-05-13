import type { StandingRow, Team } from '../../types/tournament';

export function GroupStandingsTable({ groupCode, rows, teams }: { groupCode: string; rows: StandingRow[]; teams: Team[] }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-white/10 bg-pitch-900">
      <div className="bg-pitch-800 px-4 py-3 font-black text-white">Grupo {groupCode}</div>
      <table className="w-full text-sm">
        <thead className="text-white/45">
          <tr><th className="p-3 text-left">#</th><th className="p-3 text-left">Equipo</th><th>Pts</th><th>DG</th><th>GF</th></tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const team = teams.find((item) => item.id === row.teamId);
            return (
              <tr key={row.teamId} className="border-t border-white/10 text-white/80">
                <td className="p-3 font-black">{row.position}</td>
                <td className="p-3 font-bold">{team?.flagEmoji} {team?.name}</td>
                <td className="text-center font-black">{row.points}</td>
                <td className="text-center">{row.goalDifference}</td>
                <td className="text-center">{row.goalsFor}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
