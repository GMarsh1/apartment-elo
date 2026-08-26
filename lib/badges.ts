export interface Badge {
  label: string;
  icon: string;
  description: string;
}

export function computePlayerBadges(scores: { rank: number; raw_score: number; elo_change: number }[]): Badge[] {
  const badges: Badge[] = [];

  if (!scores || scores.length === 0) return badges;

  // 1. Hot Streak: Won last 3 matches in a row
  const recentRanks = scores.slice(0, 3).map((s) => s.rank);
  if (recentRanks.length >= 3 && recentRanks.every((r) => r === 1)) {
    badges.push({
      label: 'On Fire',
      icon: '🔥',
      description: '3+ consecutive 1st place finishes',
    });
  }

  // 2. High Roller: Has earned a single raw score >= 100
  if (scores.some((s) => s.raw_score >= 100)) {
    badges.push({
      label: 'Century Club',
      icon: '💯',
      description: 'Logged a single score over 100',
    });
  }

  // 3. Clutch Performer: Big Elo boost in a single game (+25 or higher)
  if (scores.some((s) => s.elo_change >= 25)) {
    badges.push({
      label: 'Giant Slayer',
      icon: '🗡️',
      description: 'Scored a massive +25 Elo gain in one match',
    });
  }

  // 4. Veteran: Played 10 or more logged matches
  if (scores.length >= 10) {
    badges.push({
      label: 'Veteran',
      icon: '🎖️',
      description: 'Logged 10+ completed matches',
    });
  }

  return badges;
}