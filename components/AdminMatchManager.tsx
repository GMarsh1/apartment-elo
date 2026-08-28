'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

interface Match {
  id: string;
  created_at: string;
  game_id: string;
  games?: {
    name: string;
  };
  match_scores?: {
    player_id: string;
    rank: number;
    raw_score: number;
    elo_change: number;
    team_id: number;
    players?: {
      name: string;
    };
  }[];
}

export default function AdminMatchManager() {
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    fetchRecentMatches();
  }, []);

  async function fetchRecentMatches() {
    setLoading(true);
    const { data, error } = await supabase
      .from('matches')
      .select(`
        id,
        created_at,
        game_id,
        games ( name ),
        match_scores (
          player_id,
          rank,
          raw_score,
          elo_change,
          team_id,
          players ( name )
        )
      `)
      .order('created_at', { ascending: false })
      .limit(10);

    if (!error && data) {
      setMatches(data as any);
    }
    setLoading(false);
  }

  async function handleDeleteMatch(matchId: string) {
    if (!confirm('Are you sure you want to delete this match? Note: Elo ratings will need manual review or recalculation if reverting historical data.')) {
      return;
    }

    const { error } = await supabase.from('matches').delete().eq('id', matchId);
    if (error) {
      alert('Error deleting match: ' + error.message);
    } else {
      fetchRecentMatches();
    }
  }

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '20px', fontSize: '0.75rem', color: '#f472b6', fontWeight: 700 }}>
        Loading match history...
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div style={{ borderBottom: '1px solid #fbcfe8', paddingBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 style={{ fontSize: '1.125rem', fontWeight: 800, color: '#831843', margin: 0 }}>📜 Recent Match History</h2>
          <p style={{ fontSize: '0.75rem', color: '#f472b6', margin: '2px 0 0 0' }}>Review past logs and manage entry errors.</p>
        </div>
        <button
          onClick={fetchRecentMatches}
          style={{ backgroundColor: '#fff1f2', border: '1px solid #fbcfe8', borderRadius: '10px', padding: '6px 12px', fontSize: '0.7rem', fontWeight: 700, color: '#831843', cursor: 'pointer' }}
        >
          Refresh
        </button>
      </div>

      {matches.length === 0 ? (
        <div style={{ padding: '24px', backgroundColor: '#fff1f2', borderRadius: '16px', border: '1px dashed #fbcfe8', textAlign: 'center', fontSize: '0.75rem', color: '#f472b6', fontWeight: 600 }}>
          No matches logged yet.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {matches.map((match) => {
            const dateStr = new Date(match.created_at).toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            });

            // Group scores by team_id
            const teamsMap = new Map<number, any[]>();
            match.match_scores?.forEach((score) => {
              const tId = score.team_id || 1;
              const list = teamsMap.get(tId) || [];
              list.push(score);
              teamsMap.set(tId, list);
            });

            return (
              <div
                key={match.id}
                style={{ backgroundColor: '#fff1f2', border: '1px solid #fbcfe8', borderRadius: '16px', padding: '16px', display: 'flex', flexDirection: 'column', gap: '10px' }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #fce7f3', paddingBottom: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '0.75rem', fontWeight: 900, color: '#831843', backgroundColor: '#ffffff', padding: '2px 8px', borderRadius: '6px', border: '1px solid #fbcfe8' }}>
                      {match.games?.name || 'Unknown Game'}
                    </span>
                    <span style={{ fontSize: '0.7rem', color: '#f472b6', fontWeight: 600 }}>{dateStr}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleDeleteMatch(match.id)}
                    style={{ background: 'none', border: 'none', fontSize: '0.7rem', fontWeight: 700, color: '#e11d48', cursor: 'pointer', padding: '2px 6px', borderRadius: '6px' }}
                  >
                    Delete Match
                  </button>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '8px' }}>
                  {Array.from(teamsMap.entries()).map(([teamId, scores]) => (
                    <div key={teamId} style={{ backgroundColor: '#ffffff', border: '1px solid #fbcfe8', borderRadius: '12px', padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <div style={{ fontSize: '0.65rem', fontWeight: 800, textTransform: 'uppercase', color: '#db2777', display: 'flex', justifyContent: 'space-between' }}>
                        <span>Team {teamId}</span>
                        <span>Score: {scores[0]?.raw_score ?? '-'}</span>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                        {scores.map((s: any, idx: number) => (
                          <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', fontWeight: 700, color: '#831843' }}>
                            <span>{s.players?.name || 'Unknown Player'}</span>
                            <span style={{ color: s.elo_change >= 0 ? '#059669' : '#e11d48', fontWeight: 800, fontSize: '0.7rem' }}>
                              {s.elo_change > 0 ? `+${s.elo_change}` : s.elo_change} Elo
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}