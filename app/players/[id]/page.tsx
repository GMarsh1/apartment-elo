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

    // Fetch All Scores for these matches (to show everyone's score/rank)
    const { data: allScores } = await supabase
      .from('match_scores')
      .select('match_id, player_id, raw_score, rank, players(name)')
      .in('match_id', matchIds);

    // Assemble Player History with full participant breakdowns
    const history = (matches || []).map((m: any) => {
      const myScore = playerScores.find((s) => s.match_id === m.id);
      const matchParticipants = (allScores || [])
        .filter((s: any) => s.match_id === m.id)
        .map((s: any) => ({
          playerId: s.player_id,
          name: s.players?.name || 'Unknown',
          score: s.raw_score,
          rank: s.rank,
          isMe: s.player_id === playerId,
        }));

      return {
        matchId: m.id,
        date: m.created_at,
        gameName: m.games?.name || 'Game',
        rank: myScore?.rank,
        rawScore: myScore?.raw_score,
        eloChange: myScore?.elo_change,
        participants: matchParticipants,
      };
    });

    setMatchHistory(history);
    setLoading(false);
  }

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', backgroundColor: '#fff1f2', padding: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p style={{ fontSize: '0.75rem', fontWeight: 700, color: '#f472b6', margin: 0 }}>Loading profile...</p>
      </div>
    );
  }

  return (
    <main style={{ minHeight: '100vh', backgroundColor: '#fff1f2', color: '#831843', padding: '16px' }}>
      <div style={{ maxWidth: '672px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '24px' }}>
        <Link href="/" style={{ fontSize: '0.75rem', fontWeight: 700, color: '#f472b6', textDecoration: 'none' }}>
          ← Back to Standings
        </Link>

        <header style={{ backgroundColor: '#ffffff', padding: '24px', borderRadius: '24px', border: '1px solid #fbcfe8', boxShadow: '0 2px 8px rgba(244, 114, 182, 0.05)' }}>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 900, color: '#db2777', margin: 0 }}>{player?.name || 'Player'} Profile</h1>
        </header>

        <div style={{ backgroundColor: '#ffffff', border: '1px solid #fbcfe8', padding: '24px', borderRadius: '24px', display: 'flex', flexDirection: 'column', gap: '16px', boxShadow: '0 2px 8px rgba(244, 114, 182, 0.05)' }}>
          <h3 style={{ fontSize: '0.875rem', fontWeight: 900, color: '#831843', margin: 0 }}>🎮 Match History</h3>

          {matchHistory.length === 0 ? (
            <p style={{ fontSize: '0.75rem', color: '#f472b6', fontStyle: 'italic', margin: 0 }}>No matches played yet.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {matchHistory.map((m) => {
                const formattedDate = new Date(m.date).toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                });

                const isPositive = (m.eloChange ?? 0) >= 0;

                return (
                  <div key={m.matchId} style={{ padding: '16px', backgroundColor: 'rgba(255, 241, 242, 0.6)', borderRadius: '16px', border: '1px solid #fce7f3', fontSize: '0.75rem', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span style={{ fontWeight: 700, color: '#b91c1c' }}>{m.gameName}</span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <span style={{ fontSize: '0.625rem', color: '#f472b6' }}>{formattedDate}</span>
                        <span style={{ fontWeight: 700, color: isPositive ? '#16a34a' : '#ef4444' }}>
                          {isPositive ? `+${m.eloChange}` : m.eloChange} Elo
                        </span>
                      </div>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', paddingTop: '6px', borderTop: '1px solid rgba(251, 207, 232, 0.6)' }}>
                      <span style={{ color: '#f472b6', fontSize: '0.625rem', textTransform: 'uppercase', fontWeight: 700 }}>Participants & Scores</span>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                        {m.participants.map((p: any, idx: number) => (
                          <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontWeight: p.isMe ? 700 : 500, color: p.isMe ? '#831843' : '#9d174d' }}>
                            <span>{p.name} {p.isMe && '(You)'}</span>
                            <span style={{ fontFamily: 'monospace' }}>Score: {p.score} {p.rank ? `(Rank ${p.rank})` : ''}</span>
                          </div>
                        ))}
                      </div>
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