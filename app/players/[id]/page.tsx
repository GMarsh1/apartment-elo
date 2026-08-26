'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';

export default function PlayerProfilePage() {
  const params = useParams();
  const playerId = params.id as string;

  const [player, setPlayer] = useState<any>(null);
  const [matchHistory, setMatchHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (playerId) fetchProfileData();
  }, [playerId]);

  async function fetchProfileData() {
    setLoading(true);

    // Fetch Player Info
    const { data: p } = await supabase.from('players').select('*').eq('id', playerId).single();
    setPlayer(p);

    // Fetch player scores
    const { data: playerScores } = await supabase
      .from('match_scores')
      .select('match_id, rank, raw_score, elo_change')
      .eq('player_id', playerId);

    if (!playerScores || playerScores.length === 0) {
      setMatchHistory([]);
      setLoading(false);
      return;
    }

    const matchIds = playerScores.map((s) => s.match_id);

    // Fetch Match & Game Details
    const { data: matches } = await supabase
      .from('matches')
      .select('id, created_at, games(name)')
      .in('id', matchIds)
      .order('created_at', { ascending: false });

    // Fetch Opponent Scores & Names for these matches
    const { data: allScores } = await supabase
      .from('match_scores')
      .select('match_id, player_id, raw_score, rank, players(name)')
      .in('match_id', matchIds);

    // Assemble Player History
    const history = (matches || []).map((m: any) => {
      const myScore = playerScores.find((s) => s.match_id === m.id);
      const opponents = (allScores || [])
        .filter((s: any) => s.match_id === m.id && s.player_id !== playerId)
        .map((s: any) => s.players?.name || 'Unknown');

      return {
        matchId: m.id,
        date: m.created_at,
        gameName: m.games?.name || 'Game',
        rank: myScore?.rank,
        rawScore: myScore?.raw_score,
        eloChange: myScore?.elo_change,
        opponents: opponents.length > 0 ? opponents.join(', ') : 'None',
      };
    });

    setMatchHistory(history);
    setLoading(false);
  }

  if (loading) return <div className="p-8 text-xs text-pink-400">Loading profile...</div>;

  return (
    <main className="min-h-screen bg-pink-50 text-pink-900 p-4 md:p-8">
      <div className="max-w-2xl mx-auto space-y-6">
        <Link href="/" className="text-xs font-bold text-pink-400 hover:text-pink-600">
          ← Back to Standings
        </Link>

        <header className="bg-white p-6 rounded-3xl border border-pink-200 shadow-sm">
          <h1 className="text-2xl font-black text-pink-500">{player?.name || 'Player'} Profile</h1>
        </header>

        <div className="bg-white border border-pink-200 p-6 rounded-3xl space-y-4 shadow-sm">
          <h3 className="text-sm font-black text-pink-800">🎮 Match History</h3>

          {matchHistory.length === 0 ? (
            <p className="text-xs text-pink-400">No matches played yet.</p>
          ) : (
            <div className="space-y-3">
              {matchHistory.map((m) => {
                const formattedDate = new Date(m.date).toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                });

                return (
                  <div key={m.matchId} className="p-3 bg-pink-50/60 rounded-2xl border border-pink-100 text-xs space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-pink-700">{m.gameName}</span>
                      <span className="text-[10px] text-pink-400">{formattedDate}</span>
                    </div>

                    <div className="flex items-center justify-between text-pink-900">
                      <div>
                        <span className="text-pink-400 text-[10px] block">vs. {m.opponents}</span>
                        <span className="font-semibold">Score: {m.rawScore}</span>
                      </div>
                      <span className={m.eloChange >= 0 ? 'text-green-600 font-bold' : 'text-red-500 font-bold'}>
                        {m.eloChange >= 0 ? `+${m.eloChange}` : m.eloChange} Elo
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}