'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

interface RecordItem {
  title: string;
  player: string;
  stat: string;
  description: string;
}

export default function RecordsSection() {
  const [loading, setLoading] = useState(true);
  const [records, setRecords] = useState<RecordItem[]>([]);

  useEffect(() => {
    fetchRecords();
  }, []);

  async function fetchRecords() {
    setLoading(true);

    try {
      const { data: scores, error } = await supabase
        .from('match_scores')
        .select(`
          raw_score,
          elo_change,
          rank,
          players ( name ),
          matches (
            created_at,
            games ( name )
          )
        `);

      if (error || !scores || scores.length === 0) {
        setLoading(false);
        return;
      }

      const calculatedRecords: RecordItem[] = [];

      const highestScore = [...scores].sort((a, b) => Number(b.raw_score) - Number(a.raw_score))[0];
      if (highestScore) {
        calculatedRecords.push({
          title: '🔥 High Score Record',
          player: (highestScore.players as any)?.name ?? 'Unknown',
          stat: `${highestScore.raw_score} pts`,
          description: `Set in ${(highestScore.matches as any)?.games?.name ?? 'a game'}`,
        });
      }

      const lowestScore = [...scores].sort((a, b) => Number(a.raw_score) - Number(b.raw_score))[0];
      if (lowestScore) {
        calculatedRecords.push({
          title: '⛳ Lowest Score Record',
          player: (lowestScore.players as any)?.name ?? 'Unknown',
          stat: `${lowestScore.raw_score}`,
          description: `Set in ${(lowestScore.matches as any)?.games?.name ?? 'a game'}`,
        });
      }

      const biggestGain = [...scores].sort((a, b) => Number(b.elo_change) - Number(a.elo_change))[0];
      if (biggestGain && Number(biggestGain.elo_change) > 0) {
        calculatedRecords.push({
          title: '📈 Biggest Elo Gain',
          player: (biggestGain.players as any)?.name ?? 'Unknown',
          stat: `+${biggestGain.elo_change} pts`,
          description: `Single match gain in ${(biggestGain.matches as any)?.games?.name ?? 'a match'}`,
        });
      }

      const playerWinCounts: Record<string, { name: string; wins: number; matches: number }> = {};
      
      scores.forEach((s) => {
        const pName = (s.players as any)?.name ?? 'Unknown';
        if (!playerWinCounts[pName]) {
          playerWinCounts[pName] = { name: pName, wins: 0, matches: 0 };
        }
        playerWinCounts[pName].matches += 1;
        if (s.rank === 1) {
          playerWinCounts[pName].wins += 1;
        }
      });

      const playerList = Object.values(playerWinCounts);

      const mostWins = [...playerList].sort((a, b) => b.wins - a.wins)[0];
      if (mostWins && mostWins.wins > 0) {
        calculatedRecords.push({
          title: '👑 Most Victorious',
          player: mostWins.name,
          stat: `${mostWins.wins} Wins`,
          description: `Total 1st place finishes across all games`,
        });
      }

      const mostMatches = [...playerList].sort((a, b) => b.matches - a.matches)[0];
      if (mostMatches) {
        calculatedRecords.push({
          title: '🏋️ Most Active Player',
          player: mostMatches.name,
          stat: `${mostMatches.matches} Matches`,
          description: `Most logged games in the apartment history`,
        });
      }

      setRecords(calculatedRecords);
    } catch (err) {
      console.error('Error fetching records:', err);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '32px 0', color: '#f472b6', fontSize: '0.875rem' }}>
        Loading record books...
      </div>
    );
  }

  if (records.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '32px 16px', color: '#f472b6', fontSize: '0.875rem', backgroundColor: '#fff1f2', borderRadius: '16px', border: '1px dashed #fbcfe8' }}>
        No match records found yet! Log some games in the Admin tab to establish apartment records.
      </div>
    );
  }

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
      {records.map((rec, i) => (
        <div
          key={i}
          style={{
            backgroundColor: '#ffffff',
            border: '1px solid #fbcfe8',
            borderRadius: '16px',
            padding: '16px',
            boxShadow: '0 2px 8px rgba(244, 114, 182, 0.05)',
            display: 'flex',
            flexDirection: 'column',
            justify: 'space-between',
          }}
        >
          <div>
            <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#ec4899', display: 'block', marginBottom: '4px' }}>
              {rec.title}
            </span>
            <div style={{ fontSize: '1.25rem', fontWeight: 900, color: '#831843' }}>
              {rec.player}
            </div>
            <div style={{ fontSize: '1rem', fontWeight: 800, color: '#db2777', margin: '4px 0' }}>
              {rec.stat}
            </div>
          </div>
          <div style={{ fontSize: '0.6875rem', color: '#f472b6', marginTop: '8px', borderTop: '1px solid #fff1f2', paddingTop: '6px' }}>
            {rec.description}
          </div>
        </div>
      ))}
    </div>
  );
}