'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

interface Player {
  id: string;
  name: string;
}

export default function HeadToHeadCard({ players }: { players: Player[] }) {
  const [p1, setP1] = useState<string>('');
  const [p2, setP2] = useState<string>('');
  const [stats, setStats] = useState<{ p1Wins: number; p2Wins: number; total: number } | null>(null);

  useEffect(() => {
    if (players.length >= 2) {
      setP1(players[0].id);
      setP2(players[1].id);
    }
  }, [players]);

  useEffect(() => {
    if (p1 && p2 && p1 !== p2) {
      fetchH2HStats();
    }
  }, [p1, p2]);

  async function fetchH2HStats() {
    // Fetch match scores where both players participated in the same match
    const { data: p1Matches } = await supabase
      .from('match_scores')
      .select('match_id, rank')
      .eq('player_id', p1);

    const { data: p2Matches } = await supabase
      .from('match_scores')
      .select('match_id, rank')
      .eq('player_id', p2);

    if (!p1Matches || !p2Matches) return;

    const p2MatchMap = new Map(p2Matches.map((m) => [m.match_id, m.rank]));
    let p1Wins = 0;
    let p2Wins = 0;

    p1Matches.forEach((m1) => {
      if (p2MatchMap.has(m1.match_id)) {
        const p2Rank = p2MatchMap.get(m1.match_id)!;
        if (m1.rank < p2Rank) p1Wins++;
        else if (p2Rank < m1.rank) p2Wins++;
      }
    });

    setStats({ p1Wins, p2Wins, total: p1Wins + p2Wins });
  }

  const player1 = players.find((p) => p.id === p1);
  const player2 = players.find((p) => p.id === p2);

  return (
    <div className="bg-white border border-pink-200 p-6 rounded-3xl shadow-sm space-y-4">
      <h3 className="text-base font-black text-pink-800">⚔️ Head-to-Head History</h3>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-[10px] font-bold text-pink-400 uppercase">Player 1</label>
          <select
            value={p1}
            onChange={(e) => setP1(e.target.value)}
            className="w-full bg-pink-50 border border-pink-200 rounded-xl p-2 text-xs font-bold text-pink-800 mt-1"
          >
            {players.map((p) => (
              <option key={p.id} value={p.id} disabled={p.id === p2}>
                {p.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="text-[10px] font-bold text-pink-400 uppercase">Player 2</label>
          <select
            value={p2}
            onChange={(e) => setP2(e.target.value)}
            className="w-full bg-pink-50 border border-pink-200 rounded-xl p-2 text-xs font-bold text-pink-800 mt-1"
          >
            {players.map((p) => (
              <option key={p.id} value={p.id} disabled={p.id === p1}>
                {p.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {stats && (
        <div className="bg-pink-50/60 border border-pink-200 p-4 rounded-2xl text-center space-y-2">
          <p className="text-xs text-pink-400 font-bold uppercase tracking-wider">
            All-Time Direct Battles ({stats.total} Played)
          </p>
          <div className="flex justify-around items-center pt-2">
            <div>
              <span className="text-2xl font-black text-pink-700">{stats.p1Wins}</span>
              <p className="text-xs font-bold text-pink-900 mt-1">{player1?.name}</p>
            </div>
            <span className="text-lg font-black text-pink-300">VS</span>
            <div>
              <span className="text-2xl font-black text-pink-700">{stats.p2Wins}</span>
              <p className="text-xs font-bold text-pink-900 mt-1">{player2?.name}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}