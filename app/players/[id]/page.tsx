'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';

export default function PlayerProfilePage() {
  const params = useParams();
  const playerId = params?.id as string;

  const [player, setPlayer] = useState<any>(null);
  const [ratings, setRatings] = useState<any[]>([]);
  const [matchHistory, setMatchHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (playerId) loadPlayerStats();
  }, [playerId]);

  async function loadPlayerStats() {
    setLoading(true);

    const { data: p } = await supabase
      .from('players')
      .select('*')
      .eq('id', playerId)
      .single();

    if (p) setPlayer(p);

    const { data: r } = await supabase
      .from('game_ratings')
      .select('elo, games(name)')
      .eq('player_id', playerId);

    if (r) setRatings(r);

    const { data: history } = await supabase
      .from('match_scores')
      .select('rank, raw_score, elo_change, matches!inner(created_at, games(name))')
      .eq('player_id', playerId)
      .order('matches(created_at)', { ascending: false });

    if (history) setMatchHistory(history);

    setLoading(false);
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-pink-50 p-8 flex justify-center items-center">
        <p className="text-pink-400 font-bold text-sm animate-pulse">Loading player profile...</p>
      </main>
    );
  }

  if (!player) {
    return (
      <main className="min-h-screen bg-pink-50 p-8 text-center space-y-4">
        <p className="text-pink-400 font-semibold">Player not found.</p>
        <Link href="/" className="text-pink-500 font-bold text-sm underline">Back to Leaderboard</Link>
      </main>
    );
  }

  const totalMatches = matchHistory.length;
  const wins = matchHistory.filter(m => m.rank === 1).length;
  const winRate = totalMatches > 0 ? Math.round((wins / totalMatches) * 100) : 0;

  return (
    <main className="min-h-screen bg-pink-50 text-pink-900 p-4 md:p-8">
      <div className="max-w-2xl mx-auto space-y-6">
        
        {/* Navigation */}
        <Link href="/" className="text-xs font-bold text-pink-400 hover:underline flex items-center gap-1">
          ← Back to Leaderboard
        </Link>

        {/* Profile Card */}
        <div className="bg-white border border-pink-200 p-6 rounded-3xl shadow-sm space-y-6">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-3xl bg-pink-400 text-white font-black text-2xl flex items-center justify-center shadow-md shadow-pink-200">
              {player.name.charAt(0).toUpperCase()}
            </div>
            <div>
              <h1 className="text-2xl font-black text-pink-800">{player.name}</h1>
              <p className="text-xs text-pink-400">Player Stats & Match Performance</p>
            </div>
          </div>

          {/* Highlights */}
          <div className="grid grid-cols-3 gap-3 pt-2">
            <div className="bg-pink-50/60 p-3.5 rounded-2xl border border-pink-200 text-center">
              <span className="text-xs text-pink-400 font-bold block">Matches</span>
              <span className="text-xl font-black text-pink-800">{totalMatches}</span>
            </div>
            <div className="bg-pink-50/60 p-3.5 rounded-2xl border border-pink-200 text-center">
              <span className="text-xs text-pink-400 font-bold block">1st Place Wins</span>
              <span className="text-xl font-black text-pink-600">{wins}</span>
            </div>
            <div className="bg-pink-50/60 p-3.5 rounded-2xl border border-pink-200 text-center">
              <span className="text-xs text-pink-400 font-bold block">Win Rate</span>
              <span className="text-xl font-black text-pink-500">{winRate}%</span>
            </div>
          </div>
        </div>

        {/* Ratings Breakdown By Game */}
        <div className="bg-white border border-pink-200 p-6 rounded-3xl shadow-sm space-y-4">
          <h3 className="text-xs font-bold uppercase text-pink-400 tracking-wider">Game Elo Ratings</h3>
          {ratings.length === 0 ? (
            <p className="text-xs text-pink-300 italic">No ratings recorded yet.</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {ratings.map((r, idx) => (
                <div key={idx} className="bg-pink-50/40 p-3.5 rounded-2xl border border-pink-200 flex justify-between items-center">
                  <span className="font-bold text-pink-800 text-sm">{r.games?.name}</span>
                  <span className="font-mono font-black text-pink-500 text-lg">{r.elo}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Match History */}
        <div className="bg-white border border-pink-200 p-6 rounded-3xl shadow-sm space-y-4">
          <h3 className="text-xs font-bold uppercase text-pink-400 tracking-wider">Match History</h3>
          {matchHistory.length === 0 ? (
            <p className="text-xs text-pink-300 italic">No matches logged yet.</p>
          ) : (
            <div className="space-y-2.5">
              {matchHistory.map((m, idx) => (
                <div key={idx} className="bg-pink-50/40 border border-pink-200 p-3.5 rounded-2xl flex justify-between items-center text-xs">
                  <div>
                    <span className="font-bold text-pink-800 block">{m.matches?.games?.name}</span>
                    <span className="text-pink-400 text-[11px]">Score: {m.raw_score} (Rank #{m.rank})</span>
                  </div>
                  <span className={`font-mono font-bold px-2.5 py-1 rounded-xl ${
                    m.elo_change >= 0 ? 'bg-pink-200 text-pink-700' : 'bg-pink-100 text-pink-500'
                  }`}>
                    {m.elo_change >= 0 ? `+${m.elo_change}` : m.elo_change} Elo
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </main>
  );
}