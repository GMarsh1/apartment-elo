type TeamResult = {
  teamId: number;
  playerIds: string[];
  rawScore: number;
};

export function getWinProbability(ratingA: number, ratingB: number): number {
  return 1 / (1 + Math.pow(10, (ratingB - ratingA) / 400));
}

export function probabilityToMoneyline(prob: number): string {
  if (prob >= 0.5) {
    const odds = Math.round((-100 * prob) / (1 - prob));
    return `${odds}`;
  } else {
    const odds = Math.round((100 * (1 - prob)) / prob);
    return `+${odds}`;
  }
}

export function calculateTeamBettingLines(team1Elos: number[], team2Elos: number[]) {
  const avgTeam1 = team1Elos.length ? team1Elos.reduce((a, b) => a + b, 0) / team1Elos.length : 1200;
  const avgTeam2 = team2Elos.length ? team2Elos.reduce((a, b) => a + b, 0) / team2Elos.length : 1200;

  const team1WinProb = getWinProbability(avgTeam1, avgTeam2);
  const team2WinProb = 1 - team1WinProb;

  return {
    team1AvgElo: Math.round(avgTeam1),
    team2AvgElo: Math.round(avgTeam2),
    team1WinProbability: team1WinProb,
    team2WinProbability: team2WinProb,
    team1Moneyline: probabilityToMoneyline(team1WinProb),
    team2Moneyline: probabilityToMoneyline(team2WinProb),
  };
}

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

      const expectedA = getWinProbability(ratingA, ratingB);

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