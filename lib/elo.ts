type TeamResult = {
  teamId: number;
  playerIds: string[];
  rawScore: number;
};

export function calculateEloChanges(
  teams: TeamResult[],
  currentElos: Record<string, number>,
  scoringType: 'high_score_wins' | 'low_score_wins',
  kFactor: number = 32
): Record<string, { rank: number; eloChange: number }> {
  const sortedTeams = [...teams].sort((a, b) => 
    scoringType === 'high_score_wins' ? b.rawScore - a.rawScore : a.rawScore - b.rawScore
  );

  const teamRanks: Record<number, number> = {};
  let currentRank = 1;
  sortedTeams.forEach((team, index) => {
    if (index > 0 && team.rawScore === sortedTeams[index - 1].rawScore) {
      teamRanks[team.teamId] = teamRanks[sortedTeams[index - 1].teamId];
    } else {
      teamRanks[team.teamId] = currentRank;
    }
    currentRank++;
  });

  const teamElos: Record<number, number> = {};
  teams.forEach(t => {
    const avg = t.playerIds.reduce((sum, id) => sum + (currentElos[id] || 1200), 0) / t.playerIds.length;
    teamElos[t.teamId] = avg;
  });

  const playerResults: Record<string, { rank: number; eloChange: number }> = {};

  teams.forEach(teamA => {
    let totalEloChange = 0;

    teams.forEach(teamB => {
      if (teamA.teamId === teamB.teamId) return;

      const ratingA = teamElos[teamA.teamId];
      const ratingB = teamElos[teamB.teamId];

      const expectedA = 1 / (1 + Math.pow(10, (ratingB - ratingA) / 400));

      let actualA = 0.5;
      if (teamRanks[teamA.teamId] < teamRanks[teamB.teamId]) actualA = 1;
      else if (teamRanks[teamA.teamId] > teamRanks[teamB.teamId]) actualA = 0;

      totalEloChange += kFactor * (actualA - expectedA);
    });

    const avgTeamChange = Math.round(totalEloChange / (teams.length - 1));

    teamA.playerIds.forEach(pId => {
      playerResults[pId] = {
        rank: teamRanks[teamA.teamId],
        eloChange: avgTeamChange
      };
    });
  });

  return playerResults;
}