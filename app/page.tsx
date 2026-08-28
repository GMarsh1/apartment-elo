'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';
import MatchupCard from '@/components/MatchupCard';
import RecordsSection from '@/components/RecordsSection';
import HeadToHeadCard from '@/components/HeadToHeadCard';

export default function Home() {
  const [games, setGames] = useState<any[]>([]);
  const [players, setPlayers] = useState<any[]>([]);
  const [selectedGame, setSelectedGame] = useState<string>('');
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [recentMatches, setRecentMatches] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'leaderboard' | 'records' | 'players' | 'matchup'>('leaderboard');

  useEffect(() => { 
    fetchData(); 
  }, []);

  useEffect(() => { 
    if (selectedGame) {
      fetchLeaderboard();
      fetchRecentMatches();
    }

    const channel = supabase
      .channel('realtime-matches')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'match_scores' },
        () => {
          if (selectedGame) {
            fetchLeaderboard();
            fetchRecentMatches();
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
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
    <main style={{ minHeight: '100vh', backgroundColor: '#fff1f2', color: '#831843', padding: '16px', fontFamily: 'system-ui, sans-serif' }}>
      <div style={{ maxWidth: '768px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '20px' }}>
        
        {/* Header */}
        <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#ffffff', padding: '20px', borderRadius: '24px', border: '1px solid #fbcfe8', boxShadow: '0 2px 8px rgba(244, 114, 182, 0.08)' }}>
          <div>
            <h1 style={{ fontSize: '1.75rem', fontWeight: 900, margin: 0, color: '#ec4899', letterSpacing: '-0.025em' }}>
              BOSS ST ELO
            </h1>
            <p style={{ fontSize: '0.75rem', color: '#f472b6', margin: '2px 0 0 0' }}>Apartment Standings & Player Profiles</p>
          </div>
          <Link 
            href="/admin" 
            style={{ padding: '8px 16px', backgroundColor: '#f472b6', color: '#ffffff', fontSize: '0.75rem', fontWeight: 700, borderRadius: '12px', textDecoration: 'none', boxShadow: '0 2px 6px rgba(244, 114, 182, 0.3)' }}
          >
            + Admin / Log Match
          </Link>
        </header>

        {/* View Tabs */}
        <div style={{ display: 'flex', backgroundColor: '#ffffff', padding: '6px', borderRadius: '16px', border: '1px solid #fbcfe8', gap: '6px' }}>
          {[
            { id: 'leaderboard', label: '🏆 Standings' },
            { id: 'records', label: '⭐ Records' },
            { id: 'players', label: `👤 Players (${players.length})` },
            { id: 'matchup', label: '🎲 Matchup & H2H' }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              style={{
                flex: 1,
                padding: '10px 12px',
                fontSize: '0.75rem',
                fontWeight: 700,
                borderRadius: '12px',
                border: 'none',
                backgroundColor: activeTab === tab.id ? '#f472b6' : 'transparent',
                color: activeTab === tab.id ? '#ffffff' : '#f472b6',
                cursor: 'pointer',
                whiteSpace: 'nowrap'
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Show Game Selector for Leaderboard tab */}
        {activeTab === 'leaderboard' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <label style={{ fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', color: '#f472b6', letterSpacing: '0.05em', paddingLeft: '4px' }}>
              Select Game
            </label>
            <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '4px' }}>
              {games.length === 0 ? (
                <p style={{ fontSize: '0.875rem', color: '#f472b6' }}>No games added yet. Visit Admin to add games!</p>
              ) : (
                games.map((game) => (
                  <button
                    key={game.id}
                    onClick={() => setSelectedGame(game.id)}
                    style={{
                      padding: '10px 20px',
                      borderRadius: '16px',
                      fontSize: '0.75rem',
                      fontWeight: 700,
                      whiteSpace: 'nowrap',
                      border: selectedGame === game.id ? '2px solid #f472b6' : '1px solid #fbcfe8',
                      backgroundColor: selectedGame === game.id ? '#f472b6' : '#ffffff',
                      color: selectedGame === game.id ? '#ffffff' : '#db2777',
                      cursor: 'pointer',
                      boxShadow: selectedGame === game.id ? '0 2px 8px rgba(244, 114, 182, 0.3)' : 'none'
                    }}
                  >
                    {game.name}
                  </button>
                ))
              )}
            </div>
          </div>
        )}

        {/* Tab 1: Leaderboard */}
        {activeTab === 'leaderboard' && (
          <>
            <div style={{ backgroundColor: '#ffffff', border: '1px solid #fbcfe8', borderRadius: '24px', overflow: 'hidden', boxShadow: '0 2px 8px rgba(244, 114, 182, 0.05)' }}>
              <div style={{ padding: '16px', borderBottom: '1px solid #fbcfe8', fontSize: '0.7rem', fontWeight: 700, color: '#f472b6', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'flex', justifyContent: 'space-between', backgroundColor: '#fdf2f8' }}>
                <span>Rank & Player (Click to view profile)</span>
                <span>Elo Rating</span>
              </div>
              <div>
                {leaderboard.length === 0 ? (
                  <p style={{ padding: '32px', textAlign: 'center', color: '#f472b6', fontSize: '0.875rem' }}>No matches recorded for this game yet.</p>
                ) : (
                  leaderboard.map((entry, index) => (
                    <Link
                      key={entry.players.id}
                      href={`/players/${entry.players.id}`}
                      style={{ padding: '16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', textDecoration: 'none', borderBottom: '1px solid #fce7f3' }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                        <span style={{ width: '32px', height: '32px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '0.75rem', backgroundColor: index === 0 ? '#fbcfe8' : index === 1 ? '#fce7f3' : '#fff1f2', color: '#be185d' }}>
                          #{index + 1}
                        </span>
                        <span style={{ fontWeight: 600, color: '#831843', fontSize: '1rem' }}>
                          {entry.players.name}
                        </span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontFamily: 'monospace', fontWeight: 700, fontSize: '1.125rem', color: '#ec4899' }}>{entry.elo}</span>
                        <span style={{ color: '#f472b6', fontSize: '0.875rem' }}>→</span>
                      </div>
                    </Link>
                  ))
                )}
              </div>
            </div>

            {recentMatches.length > 0 && (
              <div style={{ backgroundColor: '#ffffff', border: '1px solid #fbcfe8', borderRadius: '24px', padding: '20px', display: 'flex', flexDirection: 'column', gap: '12px', boxShadow: '0 2px 8px rgba(244, 114, 182, 0.05)' }}>
                <h3 style={{ fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', color: '#f472b6', letterSpacing: '0.05em', margin: 0 }}>Recent Activity</h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '12px' }}>
                  {recentMatches.map((m, idx) => (
                    <div key={idx} style={{ backgroundColor: '#fff1f2', border: '1px solid #fbcfe8', padding: '14px', borderRadius: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.75rem' }}>
                      <div>
                        <Link href={`/players/${m.players?.id}`} style={{ fontWeight: 700, color: '#831843', textDecoration: 'none' }}>
                          {m.players?.name}
                        </Link>
                        <span style={{ display: 'block', color: '#f472b6', fontSize: '0.7rem', marginTop: '2px' }}>Score: {m.raw_score} (Rank #{m.rank})</span>
                      </div>
                      <span style={{ fontFamily: 'monospace', fontWeight: 700, padding: '4px 8px', borderRadius: '8px', backgroundColor: m.elo_change >= 0 ? '#fbcfe8' : '#fce7f3', color: '#9d174d' }}>
                        {m.elo_change >= 0 ? `+${m.elo_change}` : m.elo_change} Elo
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}

        {/* Tab 2: Records Section */}
        {activeTab === 'records' && (
          <RecordsSection />
        )}

        {/* Tab 3: Players Directory */}
        {activeTab === 'players' && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
            {players.length === 0 ? (
              <div style={{ gridColumn: 'span 2', backgroundColor: '#ffffff', padding: '32px', borderRadius: '24px', border: '1px solid #fbcfe8', textAlign: 'center', color: '#f472b6', fontSize: '0.875rem' }}>
                No players added yet. Go to Admin to add your roommates!
              </div>
            ) : (
              players.map((p) => (
                <Link
                  key={p.id}
                  href={`/players/${p.id}`}
                  style={{ backgroundColor: '#ffffff', border: '1px solid #fbcfe8', padding: '20px', borderRadius: '24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', textDecoration: 'none', boxShadow: '0 2px 8px rgba(244, 114, 182, 0.05)' }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ width: '40px', height: '40px', borderRadius: '16px', backgroundColor: '#fce7f3', color: '#ec4899', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1rem' }}>
                      {p.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <h4 style={{ fontWeight: 700, color: '#831843', margin: 0, fontSize: '1rem' }}>{p.name}</h4>
                      <p style={{ fontSize: '0.75rem', color: '#f472b6', margin: '2px 0 0 0' }}>View performance stats</p>
                    </div>
                  </div>
                  <span style={{ color: '#ec4899', fontWeight: 700, fontSize: '0.875rem' }}>View Profile →</span>
                </Link>
              ))
            )}
          </div>
        )}

        {/* Tab 4: Win-Probability Matchups & Head-to-Head */}
        {activeTab === 'matchup' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            <MatchupCard players={players} leaderboard={leaderboard} />
            <HeadToHeadCard players={players} />
          </div>
        )}

      </div>
    </main>
  );
}