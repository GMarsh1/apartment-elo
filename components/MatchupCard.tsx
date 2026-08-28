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
    <div style={{ backgroundColor: '#ffffff', border: '1px solid #fbcfe8', padding: '24px', borderRadius: '24px', display: 'flex', flexDirection: 'column', gap: '20px', boxShadow: '0 2px 8px rgba(244, 114, 182, 0.05)' }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
        <h3 style={{ fontSize: '1rem', fontWeight: 900, color: '#831843', margin: 0 }}>🔮 Matchup Predictor</h3>
        <p style={{ fontSize: '0.75rem', color: '#f472b6', margin: 0 }}>Select two players to calculate head-to-head win probability.</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <label style={{ fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase', color: '#db2777' }}>Player 1</label>
          <select
            value={player1Id}
            onChange={(e) => setPlayer1Id(e.target.value)}
            style={{ width: '100%', padding: '12px', backgroundColor: '#fff1f2', border: '1px solid #fbcfe8', borderRadius: '12px', fontSize: '0.8rem', fontWeight: 700, color: '#831843', outline: 'none' }}
          >
            <option value="">Select Player 1</option>
            {players.map((p) => (
              <option key={p.id} value={p.id} disabled={p.id === player2Id}>
                {p.name} ({p.current_elo ?? 1500})
              </option>
            ))}
          </select>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <label style={{ fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase', color: '#db2777' }}>Player 2</label>
          <select
            value={player2Id}
            onChange={(e) => setPlayer2Id(e.target.value)}
            style={{ width: '100%', padding: '12px', backgroundColor: '#fff1f2', border: '1px solid #fbcfe8', borderRadius: '12px', fontSize: '0.8rem', fontWeight: 700, color: '#831843', outline: 'none' }}
          >
            <option value="">Select Player 2</option>
            {players.map((p) => (
              <option key={p.id} value={p.id} disabled={p.id === player1Id}>
                {p.name} ({p.current_elo ?? 1500})
              </option>
            ))}
          </select>
        </div>
      </div>

      {p1 && p2 && p1.id !== p2.id ? (
        <div style={{ padding: '20px', backgroundColor: '#fff1f2', borderRadius: '16px', border: '1px solid #fbcfe8', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontWeight: 700 }}>
            <div style={{ textAlign: 'left' }}>
              <span style={{ color: '#831843', fontSize: '0.875rem', display: 'block', fontWeight: 900 }}>{p1.name}</span>
              <span style={{ fontSize: '0.65rem', color: '#f472b6', fontWeight: 700, textTransform: 'uppercase' }}>{elo1} Elo</span>
            </div>
            <span style={{ fontSize: '0.875rem', color: '#db2777', fontWeight: 900, backgroundColor: '#fdf2f8', padding: '4px 10px', borderRadius: '12px', border: '1px solid #fbcfe8' }}>VS</span>
            <div style={{ textAlign: 'right' }}>
              <span style={{ color: '#831843', fontSize: '0.875rem', display: 'block', fontWeight: 900 }}>{p2.name}</span>
              <span style={{ fontSize: '0.65rem', color: '#f472b6', fontWeight: 700, textTransform: 'uppercase' }}>{elo2} Elo</span>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div style={{ height: '12px', width: '100%', backgroundColor: '#fce7f3', borderRadius: '9999px', overflow: 'hidden', display: 'flex', border: '1px solid #fbcfe8' }}>
              <div style={{ width: `${p1Percentage}%`, backgroundColor: '#ec4899', height: '100%', transition: 'width 0.5s ease' }} />
              <div style={{ width: `${p2Percentage}%`, backgroundColor: '#f472b6', height: '100%', transition: 'width 0.5s ease' }} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', fontWeight: 900, color: '#831843' }}>
              <span>{p1Percentage}%</span>
              <span>{p2Percentage}%</span>
            </div>
          </div>
        </div>
      ) : (
        <div style={{ padding: '20px', backgroundColor: 'rgba(255, 241, 242, 0.5)', borderRadius: '16px', border: '1px dashed #fbcfe8', textAlign: 'center', fontSize: '0.75rem', color: '#f472b6', fontWeight: 600 }}>
          Pick two different players to reveal win odds.
        </div>
      )}
    </div>
  );
}