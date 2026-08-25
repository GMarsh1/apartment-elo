export interface Player {
  id: string;
  name: string;
  rating: number;
}

export interface EloChangeResult {
  newWinnerRating: number;
  newLoserRating: number;
  change: number;
  [key: string]: number; // Allows string indexing safely for TypeScript
}

// Calculates standard 1v1 Elo change after a match
export function calculateEloChanges(
  winnerRating: number,
  loserRating: number,
  kFactor: number = 32
): EloChangeResult {
  const expectedWinner = 1 / (1 + Math.pow(10, (loserRating - winnerRating) / 400));
  const change = Math.round(kFactor * (1 - expectedWinner));

  return {
    newWinnerRating: winnerRating + change,
    newLoserRating: loserRating - change,
    change,
  };
}

// Calculates expected win probability for Team A vs Team B (supports 1v1 up to 5v5)
export function getTeamWinProbability(teamA: Player[], teamB: Player[]): number {
  if (teamA.length === 0 || teamB.length === 0) return 0.5;

  const avgRatingA = teamA.reduce((sum, p) => sum + p.rating, 0) / teamA.length;
  const avgRatingB = teamB.reduce((sum, p) => sum + p.rating, 0) / teamB.length;

  return 1 / (1 + Math.pow(10, (avgRatingB - avgRatingA) / 400));
}

export interface BettingLine {
  winProbA: number;
  winProbB: number;
  americanOddsA: string;
  americanOddsB: string;
  decimalOddsA: number;
  decimalOddsB: number;
  spreadA: string;
  spreadB: string;
  avgEloA: number;
  avgEloB: number;
}

export function calculateTeamBettingLines(teamA: Player[], teamB: Player[]): BettingLine {
  const probA = getTeamWinProbability(teamA, teamB);
  const probB = 1 - probA;

  const avgEloA = teamA.length > 0 
    ? Math.round(teamA.reduce((sum, p) => sum + p.rating, 0) / teamA.length) 
    : 1200;
  const avgEloB = teamB.length > 0 
    ? Math.round(teamB.reduce((sum, p) => sum + p.rating, 0) / teamB.length) 
    : 1200;

  const decA = Number((1 / Math.max(probA, 0.01)).toFixed(2));
  const decB = Number((1 / Math.max(probB, 0.01)).toFixed(2));

  const amA = probA >= 0.5 
    ? `-${Math.round((probA / (1 - probA)) * 100)}`
    : `+${Math.round(((1 - probA) / probA) * 100)}`;

  const amB = probB >= 0.5 
    ? `-${Math.round((probB / (1 - probB)) * 100)}`
    : `+${Math.round(((1 - probB) / probB) * 100)}`;

  const eloDiff = avgEloA - avgEloB;
  const spreadValue = Number((eloDiff / 28.5).toFixed(1));
  const spreadA = spreadValue > 0 ? `-${spreadValue}` : `+${Math.abs(spreadValue)}`;
  const spreadB = spreadValue > 0 ? `+${spreadValue}` : `-${Math.abs(spreadValue)}`;

  return {
    winProbA: Math.round(probA * 100),
    winProbB: Math.round(probB * 100),
    americanOddsA: amA,
    americanOddsB: amB,
    decimalOddsA: decA,
    decimalOddsB: decB,
    spreadA,
    spreadB,
    avgEloA,
    avgEloB,
  };
}