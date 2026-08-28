'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

interface Player {
  id: string;
  name: string;
}

interface Game {
  id: string;
  name: string;
}

export default function HeadToHeadCard() {
  const [players, setPlayers] = useState<Player[]>([]);
  const [games, setGames] = useState<Game[]>([]);
  
  const [playerOne, setPlayerOne] = useState<string>('');
  const [playerTwo, setPlayerTwo] = useState<string>('');
  const [selectedGame, setSelectedGame] = useState<string>('all');

  const [stats, setStats] = useState({
    totalMatches: 0,
    p1Wins: 0,
    p2Wins: 0,
    ties: 0,
    p1AvgScore: 0,
    p2AvgScore: 0,
  });

  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchOptions();
  }, []);

  useEffect(() => {
    if (playerOne && playerTwo && playerOne !== playerTwo) {
      fetchHeadToHead();
    }
  }, [playerOne, playerTwo, selectedGame]);

  async function fetchOptions() {
    const { data: pData } = await supabase.from('players').select('id, name');
    const { data: gData } = await supabase.from('games').select('id, name');
    
    if (pData && pData.length >= 2) {
      setPlayers(pData);
      setPlayerOne(pData[0].id);
      setPlayerTwo(pData[1].id);
    }
    if (gData) {
      setGames(gData);
    }
  }

  async function fetchHeadToHead() {
    setLoading(true);
    try {
      // Find matches where both playerOne and playerTwo participated
      let matchQuery = supabase
        .from('match_scores')
        .select(`
          match_id,
          player_id,
          raw_score,
          rank,
          team_id,
          matches (
            id,
            game_id,
            created_at
          )
        `);

      const { data: scoresData, error } = await matchQuery;
      if (error || !scoresData) return;

      // Group scores by match_id
      const matchMap = new Map<string, any[]>();
      scoresData.forEach((row: any) => {
        // Filter by game if selected
        if (selectedGame !== 'all' && row.matches?.game_id !== selectedGame) return;
        
        const list = matchMap.get(row.match_id) || [];
        list.push(row);
        matchMap.set(row.match_id, list);
      });

      let total = 0;
      let wins1 = 0;
      let wins2 = 0;
      let tiesCount = 0;
      let p1ScoresSum = 0;
      let p2ScoresSum = 0;
      let p1Count = 0;
      let p2Count = 0;

      matchMap.forEach((matchScores) => {
        const p1Record = matchScores.find((s) => s.player_id === playerOne);
        const p2Record = matchScores.find((s) => s.player_id === playerTwo);

        // Only count matches where both players actually played
        if (p1Record && p2Record) {
          total++;

          if (p1Record.raw_score !== null) {
            p1ScoresSum += Number(p1Record.raw_score);
            p1Count++;
          }
          if (p2Record.raw_score !== null) {
            p2ScoresSum += Number(p2Record.raw_score);
            p2Count++;
          }

          // Compare ranks (lower rank number is better/winning)
          if (p1Record.rank < p2Record.rank) {
            wins1++;
          } else if (p2Record.rank < p1Record.rank) {
            wins2++;
          } else {
            // Tie breaker fallback to raw score if ranks are equal
            if (p1Record.raw_score < p2Record.raw_score) {
              wins1++;
            } else if (p2Record.raw_score < p1Record.raw_score) {
              wins2++;
            } else {
              tiesCount++;
            }
          }
        }
      });

      setStats({
        totalMatches: total,
        p1Wins: wins1,
        p2Wins: wins2,
        ties: tiesCount,
        p1AvgScore: p1Count > 0 ? Number((p1ScoresSum / p1Count).toFixed(1)) : 0,
        p2AvgScore: p2Count > 0 ? Number((p2ScoresSum / p2Count).toFixed(1)) : 0,
      });
    } finally {
      setLoading(false);
    }
  }

  const p1Name = players.find((p) => p.id === playerOne)?.name || 'Player 1';
  const p2Name = players.find((p) => p.id === playerTwo)?.name || 'Player 2';

  return (
    <div style={{ backgroundColor: '#ffffff', border: '1px solid #fbcfe8', padding: '24px', borderRadius: '24px', display: 'flex', flexDirection: 'column', gap: '20px', boxShadow: '0 2px 8px rgba(244, 114, 182, 0.05)' }}>
      
      {/* Header */}
      <div style={{ borderBottom: '1px solid #fbcfe8', paddingBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <span style={{ fontSize: '0.65rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#ec4899', backgroundColor: '#fdf2f8', padding: '2px 6px', borderRadius: '6px' }}>Analytics</span>
          <h2 style={{ fontSize: '1.125rem', fontWeight: 800, color: '#831843', margin: '4px 0 0 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
            ⚔️ Head-to-Head Breakdown
          </h2>
        </div>
        
        {/* Game Filter */}
        <select
          value={selectedGame}
          onChange={(e) => setSelectedGame(e.target.value)}
          style={{ backgroundColor: '#fff1f2', border: '1px solid #fbcfe8', borderRadius: '12px', padding: '8px 12px', fontSize: '0.75rem', fontWeight: 700, color: '#831843', outline: 'none' }}
        >
          <option value="all">All Games Combined</option>
          {games.map((g) => (
            <option key={g.id} value={g.id}>{g.name}</option>
          ))}
        </select>
      </div>

      {/* Selectors */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', gap: '12px', alignItems: 'center' }}>
        <div>
          <label style={{ fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase', color: '#f472b6', display: 'block', marginBottom: '4px' }}>Fighter One</label>
          <select
            value={playerOne}
            onChange={(e) => setPlayerOne(e.target.value)}
            style={{ width: '100%', backgroundColor: '#fff1f2', border: '1px solid #fbcfe8', borderRadius: '12px', padding: '10px', fontSize: '0.8rem', fontWeight: 700, color: '#831843', outline: 'none' }}
          >
            {players.map((p) => (
              <option key={p.id} value={p.id} disabled={p.id === playerTwo}>{p.name}</option>
            ))}
          </select>
        </div>

        <div style={{ fontWeight: 900, color: '#f472b6', fontSize: '1rem', paddingTop: '16px' }}>
          VS
        </div>

        <div>
          <label style={{ fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase', color: '#f472b6', display: 'block', marginBottom: '4px' }}>Fighter Two</label>
          <select
            value={playerTwo}
            onChange={(e) => setPlayerTwo(e.target.value)}
            style={{ width: '100%', backgroundColor: '#fff1f2', border: '1px solid #fbcfe8', borderRadius: '12px', padding: '10px', fontSize: '0.8rem', fontWeight: 700, color: '#831843', outline: 'none' }}
          >
            {players.map((p) => (
              <option key={p.id} value={p.id} disabled={p.id === playerOne}>{p.name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Stats Display */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '24px', fontSize: '0.75rem', color: '#f472b6' }}>Loading matchup data...</div>
      ) : stats.totalMatches === 0 ? (
        <div style={{ backgroundColor: '#fff1f2', padding: '20px', borderRadius: '16px', textAlign: 'center', border: '1px dashed #fbcfe8' }}>
          <p style={{ fontSize: '0.8rem', fontWeight: 700, color: '#831843', margin: 0 }}>No shared matches found between {p1Name} and {p2Name}.</p>
          <p style={{ fontSize: '0.7rem', color: '#f472b6', margin: '4px 0 0 0' }}>Log a match featuring both players to generate statistics!</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          
          {/* Summary Banner */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px', textAlign: 'center' }}>
            <div style={{ backgroundColor: '#fff1f2', padding: '12px', borderRadius: '16px', border: '1px solid #fbcfe8' }}>
              <span style={{ fontSize: '0.6rem', fontWeight: 700, color: '#f472b6', textTransform: 'uppercase', display: 'block' }}>{p1Name} Wins</span>
              <span style={{ fontSize: '1.25rem', fontWeight: 900, color: '#ec4899' }}>{stats.p1Wins}</span>
            </div>
            
            <div style={{ backgroundColor: '#fdf2f8', padding: '12px', borderRadius: '16px', border: '1px solid #fbcfe8' }}>
              <span style={{ fontSize: '0.6rem', fontWeight: 700, color: '#f472b6', textTransform: 'uppercase', display: 'block' }}>Total Battles</span>
              <span style={{ fontSize: '1.25rem', fontWeight: 900, color: '#831843' }}>{stats.totalMatches}</span>
            </div>

            <div style={{ backgroundColor: '#fff1f2', padding: '12px', borderRadius: '16px', border: '1px solid #fbcfe8' }}>
              <span style={{ fontSize: '0.6rem', fontWeight: 700, color: '#f472b6', textTransform: 'uppercase', display: 'block' }}>{p2Name} Wins</span>
              <span style={{ fontSize: '1.25rem', fontWeight: 900, color: '#ec4899' }}>{stats.p2Wins}</span>
            </div>
          </div>

          {/* Progress / Win Ratio Bar */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', fontWeight: 700, color: '#831843' }}>
              <span>{Math.round((stats.p1Wins / (stats.totalMatches || 1)) * 100)}% Win Rate</span>
              <span>{stats.ties > 0 ? `${stats.ties} Ties` : 'Direct Rivalry'}</span>
              <span>{Math.round((stats.p2Wins / (stats.totalMatches || 1)) * 100)}% Win Rate</span>
            </div>
            
            <div style={{ height: '10px', backgroundColor: '#fff1f2', borderRadius: '5px', overflow: 'hidden', display: 'flex', border: '1px solid #fbcfe8' }}>
              <div style={{ width: `${(stats.p1Wins / stats.totalMatches) * 100}%`, backgroundColor: '#ec4899', transition: 'width 0.3s ease' }}></div>
              <div style={{ width: `${(stats.ties / stats.totalMatches) * 100}%`, backgroundColor: '#f472b6', transition: 'width 0.3s ease' }}></div>
              <div style={{ width: `${(stats.p2Wins / stats.totalMatches) * 100}%`, backgroundColor: '#db2777', transition: 'width 0.3s ease' }}></div>
            </div>
          </div>

          {/* Average Scores Comparison */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div style={{ backgroundColor: '#fff1f2', padding: '12px 16px', borderRadius: '14px', border: '1px solid #fbcfe8', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#831843' }}>{p1Name} Avg Score</span>
              <span style={{ fontSize: '0.875rem', fontWeight: 900, color: '#ec4899' }}>{stats.p1AvgScore}</span>
            </div>
            
            <div style={{ backgroundColor: '#fff1f2', padding: '12px 16px', borderRadius: '14px', border: '1px solid #fbcfe8', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#831843' }}>{p2Name} Avg Score</span>
              <span style={{ fontSize: '0.875rem', fontWeight: 900, color: '#ec4899' }}>{stats.p2AvgScore}</span>
            </div>
          </div>

        </div>
      )}

    </div>
  );
}