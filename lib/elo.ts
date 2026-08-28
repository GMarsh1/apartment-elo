export type ScoringType = 'high_score_wins' | 'low_score_wins';

export type TeamInput = {
  id: string | number;
  playerIds: string[];
  rawScore: number;
};

export type TeamEloResult = {
  teamId: string | number;
  rank: number;
  rawScore: number;
  eloChangePerPlayer: number;
};

function getKFactor(matchesPlayed: number): number {
  if (matchesPlayed <= 10) return 50;  // Provisional tier (rapid calibration)
  if (matchesPlayed <= 30) return 32;  // Developing tier (standard baseline)
  return 16;                          // Veteran tier (stable ratings)
}

export function getWinProbability(ratingA: number, ratingB: number): number {
  return 1 / (1 + Math.pow(10, (ratingB - ratingA) / 400));
}

export function calculateEloChanges(
  teams: TeamInput[],
  scoringType: ScoringType,
  ratingMap: Map<string, number>,
  matchCountMap: Map<string, number> // Pass player ID -> matches_played map here
): TeamEloResult[] {
  // 1. Sort teams by score based on scoring type
  const sortedTeams = [...teams].sort((a, b) => 
    scoringType === 'high_score_wins' ? b.rawScore - a.rawScore : a.rawScore - b.rawScore
  );

  // 2. Determine ranks (handling ties properly)
  const teamRanks: Record<string | number, number> = {};
  let currentRank = 1;
  sortedTeams.forEach((team, index) => {
    if (index > 0 && team.rawScore === sortedTeams[index - 1].rawScore) {
      teamRanks[team.id] = teamRanks[sortedTeams[index - 1].id];
    } else {
      teamRanks[team.id] = currentRank;
    }
    currentRank++;
  });

  // 3. Compute average Elo for each team using the provided ratingMap
  const teamElos: Record<string | number, number> = {};
  teams.forEach(t => {
    const avg = t.playerIds.length 
      ? t.playerIds.reduce((sum, id) => sum + (ratingMap.get(id) ?? 1000), 0) / t.playerIds.length 
      : 1000;
    teamElos[t.id] = avg;
  });

  // 4. Calculate pairwise Elo updates across all teams using individual player K-factors
  const results: TeamEloResult[] = [];

  teams.forEach(teamA => {
    let totalEloChange = 0;

    teams.forEach(teamB => {
      if (teamA.id === teamB.id) return;

      const ratingA = teamElos[teamA.id];
      const ratingB = teamElos[teamB.id];

      const expectedA = getWinProbability(ratingA, ratingB);

      let actualA = 0.5;
      if (teamRanks[teamA.id] < teamRanks[teamB.id]) actualA = 1; 
      else if (teamRanks[teamA.id] > teamRanks[teamB.id]) actualA = 0; 

      // Use average K-factor of Team A's players for this pairwise matchup
      const teamAKFactor = teamA.playerIds.length > 0
        ? teamA.playerIds.reduce((sum, id) => sum + getKFactor(matchCountMap.get(id) ?? 0), 0) / teamA.playerIds.length
        : 32;

      totalEloChange += teamAKFactor * (actualA - expectedA);
    });

    const avgTeamChange = teams.length > 1 ? Math.round(totalEloChange / (teams.length - 1)) : 0;

    results.push({
      teamId: teamA.id,
      rank: teamRanks[teamA.id],
      rawScore: teamA.rawScore,
      eloChangePerPlayer: avgTeamChange,
    });
  });

  return results;
}