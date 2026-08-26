'use client';

import { useState } from 'react';

interface Player {
  id: string;
  name: string;
  avatar_url?: string;
  current_elo?: number;
}

interface MatchupCardProps {
  players: Player[];
  leaderboard?: any[];
}

export default function MatchupCard({ players, leaderboard = [] }: MatchupCardProps) {
  const [player1Id, setPlayer1Id] = useState<string>('');
  const [player2Id, setPlayer2Id] = useState<string>('');

  const p1 = players.find((p) => p.id === player1Id);
  const p2 = players.find((p) => p.id === player2Id);

  // Retrieve Elo ratings (defaulting to 1500 if not found)
  const elo1 = p1?.current_elo ?? 1500;
  const elo2 = p2?.current_elo ?? 1500;

  // Calculate expected win probability using standard Elo formula
  let prob1 = 0;
  let prob2 = 0;

  if (p1 && p2 && p1.id !== p2.id) {
    prob1 = 1 / (1 + Math.pow(10, (elo2 - elo1) / 400));
    prob2 = 1 - prob1;
  }

  const p1Percentage = Math.round(prob1 * 100);
  const p2Percentage = Math.round(prob2 * 100);

  return (
    <div className="bg-white border border-pink-200 p-6 rounded-3xl space-y-6 shadow-sm">
      <div className="space-y-1">
        <h3 className="text-lg font-black text-pink-800">🔮 Matchup Predictor</h3>
        <p className="text-xs text-pink-400">Select two players to calculate head-to-head win probability.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Player 1 Selector */}
        <div className="space-y-2">
          <label className="text-xs font-bold text-pink-600 block">Player 1</label>
          <select
            value={player1Id}
            onChange={(e) => setPlayer1Id(e.target.value)}
            className="w-full p-3 bg-pink-50 border border-pink-200 rounded-2xl text-xs font-semibold text-pink-900 focus:outline-none focus:ring-2 focus:ring-pink-400"
          >
            <option value="">Select Player 1</option>
            {players.map((p) => (
              <option key={p.id} value={p.id} disabled={p.id === player2Id}>
                {p.name} ({p.current_elo ?? 1500} Elo)
              </option>
            ))}
          </select>
        </div>

        {/* Player 2 Selector */}
        <div className="space-y-2">
          <label className="text-xs font-bold text-pink-600 block">Player 2</label>
          <select
            value={player2Id}
            onChange={(e) => setPlayer2Id(e.target.value)}
            className="w-full p-3 bg-pink-50 border border-pink-200 rounded-2xl text-xs font-semibold text-pink-900 focus:outline-none focus:ring-2 focus:ring-pink-400"
          >
            <option value="">Select Player 2</option>
            {players.map((p) => (
              <option key={p.id} value={p.id} disabled={p.id === player1Id}>
                {p.name} ({p.current_elo ?? 1500} Elo)
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Matchup Results Visualizer */}
      {p1 && p2 && p1.id !== p2.id ? (
        <div className="p-4 bg-pink-50/60 rounded-2xl border border-pink-100 space-y-4">
          <div className="flex items-center justify-between font-bold text-sm">
            <div className="text-left">
              <span className="text-pink-800 block">{p1.name}</span>
              <span className="text-xs text-pink-400 font-normal">{elo1} Elo</span>
            </div>
            <span className="text-xs text-pink-400 uppercase tracking-widest font-black">VS</span>
            <div className="text-right">
              <span className="text-pink-800 block">{p2.name}</span>
              <span className="text-xs text-pink-400 font-normal">{elo2} Elo</span>
            </div>
          </div>

          {/* Probability Bar */}
          <div className="space-y-1">
            <div className="h-4 w-full bg-pink-200 rounded-full overflow-hidden flex">
              <div
                style={{ width: `${p1Percentage}%` }}
                className="bg-pink-500 h-full transition-all duration-500"
              />
              <div
                style={{ width: `${p2Percentage}%` }}
                className="bg-pink-300 h-full transition-all duration-500"
              />
            </div>
            <div className="flex justify-between text-xs font-black text-pink-700">
              <span>{p1Percentage}% Win Chance</span>
              <span>{p2Percentage}% Win Chance</span>
            </div>
          </div>
        </div>
      ) : (
        <div className="p-4 bg-pink-50/40 rounded-2xl border border-dashed border-pink-200 text-center text-xs text-pink-400">
          Pick two different players above to see win odds.
        </div>
      )}
    </div>
  );
}