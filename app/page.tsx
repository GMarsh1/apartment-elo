'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';

export default function Home() {
  const [games, setGames] = useState<any[]>([]);
  const [players, setPlayers] = useState<any[]>([]);
  const [selectedGame, setSelectedGame] = useState<string>('');
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [recentMatches, setRecentMatches] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'leaderboard' | 'players'>('leaderboard');

  useEffect(() => { 
    fetchData(); 
  }, []);

  useEffect(() => { 
    if (selectedGame) {
      fetchLeaderboard();
      fetchRecentMatches();
    }
  }, [selectedGame]);

  async function fetchData() {
    const { data: g } = await supabase.from('games').select('*');
    const { data: p } = await supabase.from('players').select('*');

    if (p) setPlayers(p);
    if (g && g.length > 0) {
      setGames(g);
      setSelectedGame(g[0].id);
    }
  }

  async function fetchLeaderboard() {
    const { data } = await supabase
      .from('game_ratings')
      .select('elo, players(id, name)')
      .eq('game_id', selectedGame)
      .order('elo', { ascending: false });

    if (data) setLeaderboard(data);
  }

  async function fetchRecentMatches() {
    const { data } = await supabase
      .from('match_scores')
      .select('rank, raw_score, elo_change, players(id, name), matches!inner(created_at, game_id)')
      .eq('matches.game_id', selectedGame)
      .order('created_at', { ascending: false })
      .limit(6);

    if (data) setRecentMatches(data);
  }

  return (
    <main className="min-h-screen bg-pink-50 text-pink-900 p-4 md:p-8">
      <div className="max-w-3xl mx-auto space-y-6">
        
        {/* Header */}
        <header className="flex justify-between items-center bg-white p-5 rounded-3xl border border-pink-200 shadow-sm shadow-pink-100">
          <div>
            <h1 className="text-3xl font-black tracking-tight text-pink-500">
              BOSS ST ELO
            </h1>
            <p className="text-xs text-pink-400 mt-0.5">Apartment Standings & Player Profiles</p>
          </div>
          <Link 
            href="/admin" 
            className="px-4 py-2 bg-pink-400 hover:bg-pink-500 text-white text-xs font-bold rounded-xl transition shadow-md shadow-pink-200"
          >
            + Admin / Log Match
          </Link>
        </header>

        {/* View Tabs */}
        <div className="flex bg-white p-1.5 rounded-2xl border border-pink-200 shadow-sm">
          <button
            onClick={() => setActiveTab('leaderboard')}
            className={`flex-1 py-2.5 text-xs font-bold rounded-xl transition ${
              activeTab === 'leaderboard'
                ? 'bg-pink-400 text-white shadow-sm'
                : 'text-pink-400 hover:text-pink-600'
            }`}
          >
            🏆 Game Standings
          </button>
          <button
            onClick={() => setActiveTab('players')}
            className={`flex-1 py-2.5 text-xs font-bold rounded-xl transition ${
              activeTab === 'players'
                ? 'bg-pink-400 text-white shadow-sm'
                : 'text-pink-400 hover:text-pink-600'
            }`}
          >
            👤 Player Profiles ({players.length})
          </button>
        </div>

        {activeTab === 'leaderboard' ? (
          <>
            {/* Game Selector Tabs */}
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase text-pink-400 block tracking-wider px-1">
                Select Game
              </label>
              <div className="flex gap-2 overflow-x-auto pb-2 pt-1 scrollbar-thin">
                {games.length === 0 ? (
                  <p className="text-sm text-pink-300">No games added yet. Visit Admin to add games!</p>
                ) : (
                  games.map((game) => (
                    <button
                      key={game.id}
                      onClick={() => setSelectedGame(game.id)}
                      className={`px-5 py-2.5 rounded-2xl text-xs font-bold whitespace-nowrap transition-all ${
                        selectedGame === game.id
                          ? 'bg-pink-400 text-white shadow-md shadow-pink-200 ring-2 ring-pink-300'
                          : 'bg-white border border-pink-200 text-pink-500 hover:bg-pink-100/50'
                      }`}
                    >
                      {game.name}
                    </button>
                  ))
                )}
              </div>
            </div>

            {/* Standings Table Card */}
            <div className="bg-white border border-pink-200 rounded-3xl overflow-hidden shadow-sm shadow-pink-100">
              <div className="p-4 border-b border-pink-200 font-bold text-xs text-pink-400 uppercase tracking-wider flex justify-between bg-pink-100/40">
                <span>Rank & Player (Click to view profile)</span>
                <span>Elo Rating</span>
              </div>
              <div className="divide-y divide-pink-100">
                {leaderboard.length === 0 ? (
                  <p className="p-8 text-center text-pink-300 text-sm">No matches recorded for this game yet.</p>
                ) : (
                  leaderboard.map((entry, index) => (
                    <Link
                      key={entry.players.id}
                      href={`/players/${entry.players.id}`}
                      className="p-4 flex items-center justify-between hover:bg-pink-100/40 transition group cursor-pointer"
                    >
                      <div className="flex items-center gap-3.5">
                        <span className={`w-8 h-8 rounded-full flex items-center justify-center font-extrabold text-xs ${
                          index === 0 ? 'bg-pink-200 text-pink-700 border border-pink-300' :
                          index === 1 ? 'bg-pink-100 text-pink-600 border border-pink-200' :
                          index === 2 ? 'bg-pink-50 text-pink-500 border border-pink-200' : 'text-pink-400 bg-pink-50/50'
                        }`}>
                          #{index + 1}
                        </span>
                        <span className="font-semibold text-pink-800 text-base group-hover:text-pink-500 transition">
                          {entry.players.name}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-lg text-pink-500">{entry.elo}</span>
                        <span className="text-pink-300 group-hover:text-pink-400 text-sm">→</span>
                      </div>
                    </Link>
                  ))
                )}
              </div>
            </div>

            {/* Recent Match Feed */}
            {recentMatches.length > 0 && (
              <div className="bg-white border border-pink-200 rounded-3xl p-5 space-y-3 shadow-sm shadow-pink-100">
                <h3 className="text-xs font-bold uppercase text-pink-400 tracking-wider">Recent Activity</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {recentMatches.map((m, idx) => (
                    <div key={idx} className="bg-pink-50/50 border border-pink-200 p-3.5 rounded-2xl flex justify-between items-center text-xs">
                      <div>
                        <Link href={`/players/${m.players?.id}`} className="font-bold text-pink-800 hover:text-pink-500">
                          {m.players?.name}
                        </Link>
                        <span className="text-pink-400 block text-[11px] mt-0.5">Score: {m.raw_score} (Rank #{m.rank})</span>
                      </div>
                      <span className={`font-mono font-bold px-2 py-1 rounded-lg ${
                        m.elo_change >= 0 ? 'bg-pink-200 text-pink-700' : 'bg-pink-100 text-pink-500'
                      }`}>
                        {m.elo_change >= 0 ? `+${m.elo_change}` : m.elo_change} Elo
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        ) : (
          /* Players Directory Tab */
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {players.length === 0 ? (
              <div className="col-span-2 bg-white p-8 rounded-3xl border border-pink-200 text-center text-pink-300 text-sm">
                No players added yet. Go to Admin to add your roommates!
              </div>
            ) : (
              players.map((p) => (
                <Link
                  key={p.id}
                  href={`/players/${p.id}`}
                  className="bg-white border border-pink-200 p-5 rounded-3xl flex items-center justify-between hover:border-pink-300 hover:shadow-md transition group"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-pink-100 text-pink-500 font-bold flex items-center justify-center text-base">
                      {p.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <h4 className="font-bold text-pink-800 group-hover:text-pink-500 transition">{p.name}</h4>
                      <p className="text-xs text-pink-400">View performance stats</p>
                    </div>
                  </div>
                  <span className="text-pink-400 font-bold text-sm">View Profile →</span>
                </Link>
              ))
            )}
          </div>
        )}

      </div>
    </main>
  );
}