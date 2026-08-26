'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

interface MatchDetail {
  id: string;
  created_at: string;
  game_name: string;
  match_scores: Array<{
    team?: number;
    rank: number;
    raw_score: number;
    elo_change: number;
    player_name: string;
  }>;
}

export default function AdminMatchManager() {
  const [matches, setMatches] = useState<MatchDetail[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    fetchMatches();
  }, []);

  async function fetchMatches() {
    setLoading(true);

    try {
      // 1. Fetch matches with game name
      const { data: matchesData, error: matchesError } = await supabase
        .from('matches')
        .select('id, created_at, game_id, games ( name )')
        .order('created_at', { ascending: false })
        .limit(15);

      if (matchesError) {
        console.error('Matches fetch error:', matchesError);
        setLoading(false);
        return;
      }

      if (!matchesData || matchesData.length === 0) {
        setMatches([]);
        setLoading(false);
        return;
      }

      const matchIds = matchesData.map((m: any) => m.id);

      // 2. Fetch scores with player name
      const { data: scoresData, error: scoresError } = await supabase
        .from('match_scores')
        .select('match_id, player_id, rank, raw_score, elo_change, players ( name )')
        .in('match_id', matchIds);

      if (scoresError) {
        console.error('Scores fetch error:', scoresError);
        setLoading(false);
        return;
      }

      // 3. Map match data together
      const assembledMatches: MatchDetail[] = matchesData.map((m: any) => {
        const relatedScores = (scoresData || [])
          .filter((s: any) => s.match_id === m.id)
          .map((s: any) => ({
            rank: s.rank,
            raw_score: s.raw_score,
            elo_change: s.elo_change,
            player_name: s.players?.name || 'Unknown',
          }));

        return {
          id: m.id,
          created_at: m.created_at,
          game_name: m.games?.name || 'Unknown Game',
          match_scores: relatedScores,
        };
      });

      setMatches(assembledMatches);
    } catch (err) {
      console.error('Error loading matches:', err);
    } finally {
      setLoading(false);
    }
  }

  async function handleDeleteMatch(matchId: string) {
    if (!confirm('Are you sure you want to delete this match record?')) return;

    await supabase.from('match_scores').delete().eq('match_id', matchId);
    const { error } = await supabase.from('matches').delete().eq('id', matchId);

    if (error) {
      alert('Failed to delete match: ' + error.message);
    } else {
      fetchMatches();
    }
  }

  return (
    <div className="bg-white border border-pink-200 p-6 rounded-3xl space-y-4 shadow-sm">
      <h3 className="text-sm font-black text-pink-800">📋 Recent Match History</h3>

      {loading ? (
        <p className="text-xs text-pink-400 animate-pulse">Loading recent matches...</p>
      ) : matches.length === 0 ? (
        <p className="text-xs text-pink-400">No recent matches logged.</p>
      ) : (
        <div className="space-y-3">
          {matches.map((m) => {
            const formattedDate = new Date(m.created_at).toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            });

            // Split into Winners (Rank 1) and Losers (Rank 2+)
            const winners = m.match_scores.filter((s) => s.rank === 1);
            const losers = m.match_scores.filter((s) => s.rank !== 1);

            const winnerNames = winners.map((s) => s.player_name).join(', ');
            const loserNames = losers.map((s) => s.player_name).join(', ');

            const winnerScore = winners[0]?.raw_score ?? 0;
            const loserScore = losers[0]?.raw_score ?? 0;

            const winnerElo = winners[0]?.elo_change ?? 0;
            const loserElo = losers[0]?.elo_change ?? 0;

            return (
              <div
                key={m.id}
                className="flex items-center justify-between p-3.5 bg-pink-50/60 rounded-2xl border border-pink-100 text-xs gap-3"
              >
                <div className="space-y-1.5 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-black text-pink-700 uppercase tracking-wide">
                      {m.game_name}
                    </span>
                    <span className="text-[10px] text-pink-400 font-medium">({formattedDate})</span>
                  </div>

                  <div className="flex items-center gap-2 text-pink-900 font-bold flex-wrap">
                    <span>
                      {winnerNames || 'Team 1'}{' '}
                      <span className="text-[10px] text-pink-500 font-normal">
                        ({winnerScore}) {winnerElo >= 0 ? `+${winnerElo}` : winnerElo}
                      </span>
                    </span>
                    <span className="text-pink-300 font-normal">vs</span>
                    <span>
                      {loserNames || 'Team 2'}{' '}
                      <span className="text-[10px] text-pink-500 font-normal">
                        ({loserScore}) {loserElo >= 0 ? `+${loserElo}` : loserElo}
                      </span>
                    </span>
                  </div>
                </div>

                <button
                  onClick={() => handleDeleteMatch(m.id)}
                  className="bg-red-100 hover:bg-red-200 text-red-600 font-bold px-3 py-1.5 rounded-xl transition text-[10px] shrink-0"
                >
                  Delete
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}