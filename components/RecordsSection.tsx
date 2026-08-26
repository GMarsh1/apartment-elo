'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';

interface HighScoreRecord {
  gameName: string;
  highScore: number;
  playerName: string;
  playerId: string;
  createdAt: string | null;
}

export default function RecordsSection() {
  const [records, setRecords] = useState<HighScoreRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchHighScores();
  }, []);

  async function fetchHighScores() {
    setLoading(true);

    // Fetch all scores joined with game, player, and match created_at
    const { data: scores } = await supabase
      .from('match_scores')
      .select(`
        raw_score,
        player_id,
        players(name),
        matches!inner(
          created_at,
          games(name)
        )
      `);

    if (scores && scores.length > 0) {
      // Group scores by game name and find the highest score for each game
      const gameRecordsMap: Record<string, HighScoreRecord> = {};

      scores.forEach((s: any) => {
        const gameName = s.matches?.games?.name || 'Unknown Game';
        const currentScore = s.raw_score ?? 0;

        if (!gameRecordsMap[gameName] || currentScore > gameRecordsMap[gameName].highScore) {
          gameRecordsMap[gameName] = {
            gameName,
            highScore: currentScore,
            playerName: s.players?.name || 'Unknown Player',
            playerId: s.player_id,
            createdAt: s.matches?.created_at || null,
          };
        }
      });

      setRecords(Object.values(gameRecordsMap));
    }

    setLoading(false);
  }

  if (loading) {
    return (
      <div className="bg-white border border-pink-200 p-6 rounded-3xl shadow-sm text-center">
        <p className="text-xs font-bold text-pink-400 animate-pulse">Loading all-time records...</p>
      </div>
    );
  }

  return (
    <div className="bg-white border border-pink-200 p-6 rounded-3xl shadow-sm space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-base font-black text-pink-800">🏆 All-Time High Scores</h2>
          <p className="text-xs text-pink-400">Record high scores for every game</p>
        </div>
      </div>

      {records.length === 0 ? (
        <p className="text-xs text-pink-300 italic">No records logged yet.</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {records.map((rec, idx) => {
            const dateObj = rec.createdAt ? new Date(rec.createdAt) : null;
            const formattedDate = dateObj
              ? dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
              : '';

            return (
              <div
                key={idx}
                className="bg-pink-50/50 border border-pink-200 p-4 rounded-2xl flex flex-col justify-between space-y-2"
              >
                <div className="flex justify-between items-start">
                  <span className="font-bold text-pink-900 text-sm">{rec.gameName}</span>
                  <span className="font-mono font-black text-xl text-pink-600 bg-pink-100 px-2.5 py-0.5 rounded-xl border border-pink-200">
                    {rec.highScore}
                  </span>
                </div>

                <div className="flex justify-between items-end pt-1 border-t border-pink-200/60 text-xs">
                  <div>
                    <span className="text-pink-400 text-[10px] uppercase font-bold block">Holder</span>
                    <Link
                      href={`/players/${rec.playerId}`}
                      className="font-bold text-pink-800 hover:underline"
                    >
                      {rec.playerName}
                    </Link>
                  </div>
                  {formattedDate && (
                    <span className="text-[10px] text-pink-400 font-medium">
                      {formattedDate}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}