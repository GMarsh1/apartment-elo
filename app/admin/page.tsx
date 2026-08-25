'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { calculateEloChanges } from '@/lib/elo';
import Link from 'next/link';

export default function AdminPage() {
  const [games, setGames] = useState<any[]>([]);
  const [players, setPlayers] = useState<any[]>([]);
  
  const [newPlayerName, setNewPlayerName] = useState('');
  const [newGameName, setNewGameName] = useState('');
  const [scoringType, setScoringType] = useState<'high_score_wins' | 'low_score_wins'>('high_score_wins');

  const [selectedGameId, setSelectedGameId] = useState('');
  const [numTeams, setNumTeams] = useState(2);
  const [teamData, setTeamData] = useState<{ playerIds: string[]; rawScore: string }[]>([
    { playerIds: [], rawScore: '' },
    { playerIds: [], rawScore: '' },
  ]);

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    const { data: g } = await supabase.from('games').select('*');
    const { data: p } = await supabase.from('players').select('*');
    if (g && g.length > 0) {
      setGames(g);
      setSelectedGameId(g[0].id);
    }
    if (p) setPlayers(p);
  }

  async function addPlayer() {
    if (!newPlayerName.trim()) return;
    await supabase.from('players').insert([{ name: newPlayerName }]);
    setNewPlayerName('');
    loadData();
  }

  async function addGame() {
    if (!newGameName.trim()) return;
    await supabase.from('games').insert([{ name: newGameName, scoring_type: scoringType }]);
    setNewGameName('');
    loadData();
  }

  async function deleteGame(gameId: string) {
    if (!confirm('Are you sure you want to delete this game?')) return;
    await supabase.from('game_ratings').delete().eq('game_id', gameId);
    await supabase.from('matches').delete().eq('game_id', gameId);
    await supabase.from('games').delete().eq('id', gameId);
    loadData();
  }

  function handleTeamCountChange(count: number) {
    setNumTeams(count);
    const updated = [];
    for (let i = 0; i < count; i++) {
      updated.push(teamData[i] || { playerIds: [], rawScore: '' });
    }
    setTeamData(updated);
  }

  function handlePlayerToggle(teamIndex: number, playerId: string) {
    const updated = teamData.map((t, idx) => {
      if (idx === teamIndex) {
        const hasPlayer = t.playerIds.includes(playerId);
        return {
          ...t,
          playerIds: hasPlayer 
            ? t.playerIds.filter(id => id !== playerId)
            : [...t.playerIds, playerId]
        };
      }
      return t;
    });
    setTeamData(updated);
  }

  function handleScoreChange(teamIndex: number, score: string) {
    const updated = [...teamData];
    updated[teamIndex].rawScore = score;
    setTeamData(updated);
  }

  async function submitMatch() {
    if (!selectedGameId) return alert('Please select a game.');
    const currentGame = games.find(g => g.id === selectedGameId);
    const validTeams = teamData.filter(t => t.playerIds.length > 0 && t.rawScore !== '');

    if (validTeams.length < 2) return alert('Assign players and raw scores to at least 2 slots.');

    const allPlayerIds = validTeams.flatMap(t => t.playerIds);
    const { data: ratings } = await supabase
      .from('game_ratings')
      .select('player_id, elo')
      .eq('game_id', selectedGameId)
      .in('player_id', allPlayerIds);

    const currentElos: Record<string, number> = {};
    allPlayerIds.forEach(id => {
      const match = ratings?.find(r => r.player_id === id);
      currentElos[id] = match ? match.elo : 1200;
    });

    const teamsForElo = validTeams.map((t, idx) => ({
      teamId: idx + 1,
      playerIds: t.playerIds,
      rawScore: parseFloat(t.rawScore)
    }));

    const eloResults = calculateEloChanges(
      teamsForElo, 
      currentElos, 
      currentGame.scoring_type || 'high_score_wins'
    );

    const { data: matchRecord } = await supabase
      .from('matches')
      .insert([{ game_id: selectedGameId }])
      .select()
      .single();

    if (!matchRecord) return alert('Failed to log match.');

    for (const team of validTeams) {
      for (const pId of team.playerIds) {
        const result = eloResults[pId];
        const newElo = (currentElos[pId] || 1200) + result.eloChange;

        await supabase.from('match_scores').insert([{
          match_id: matchRecord.id,
          player_id: pId,
          team_id: validTeams.indexOf(team) + 1,
          raw_score: parseFloat(team.rawScore),
          rank: result.rank,
          elo_change: result.eloChange
        }]);

        await supabase.from('game_ratings').upsert({
          player_id: pId,
          game_id: selectedGameId,
          elo: newElo
        }, { onConflict: 'player_id,game_id' });
      }
    }

    alert('Match logged and Elo ratings updated!');
    setTeamData(teamData.map(() => ({ playerIds: [], rawScore: '' })));
  }

  return (
    <main className="min-h-screen bg-pink-50 text-pink-900 p-4 md:p-8">
      <div className="max-w-3xl mx-auto space-y-8">
        
        <header className="flex justify-between items-center bg-white p-5 rounded-3xl border border-pink-200 shadow-sm">
          <h1 className="text-2xl font-bold text-pink-800">Admin & Score Logger</h1>
          <Link href="/" className="text-xs font-bold text-pink-500 hover:underline">
            ← Back to Leaderboard
          </Link>
        </header>

        {/* Setup Section */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Add Roommate */}
          <div className="bg-white border border-pink-200 p-5 rounded-3xl shadow-sm space-y-3">
            <h3 className="font-bold text-pink-800 text-sm">1. Add Roommate</h3>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Player Name"
                value={newPlayerName}
                onChange={(e) => setNewPlayerName(e.target.value)}
                className="bg-pink-50/50 border border-pink-200 text-pink-800 placeholder-pink-300 rounded-xl px-3 py-2 text-sm flex-1 focus:outline-none focus:border-pink-400"
              />
              <button onClick={addPlayer} className="px-4 py-2 bg-pink-400 hover:bg-pink-500 text-white rounded-xl font-bold text-sm shadow-md shadow-pink-200">
                Add
              </button>
            </div>
          </div>

          {/* Add & Delete Games */}
          <div className="bg-white border border-pink-200 p-5 rounded-3xl shadow-sm space-y-3">
            <h3 className="font-bold text-pink-800 text-sm">2. Add or Remove Game</h3>
            <input
              type="text"
              placeholder="Game Name (e.g. Ping Pong)"
              value={newGameName}
              onChange={(e) => setNewGameName(e.target.value)}
              className="w-full bg-pink-50/50 border border-pink-200 text-pink-800 placeholder-pink-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-pink-400"
            />
            <div className="flex gap-2">
              <select
                value={scoringType}
                onChange={(e: any) => setScoringType(e.target.value)}
                className="w-full bg-pink-50/50 border border-pink-200 rounded-xl px-3 py-2 text-sm text-pink-700"
              >
                <option value="high_score_wins">High Score Wins (Ping Pong)</option>
                <option value="low_score_wins">Low Score Wins (Wii Golf)</option>
              </select>
              <button onClick={addGame} className="px-4 py-2 bg-pink-400 hover:bg-pink-500 text-white rounded-xl font-bold text-sm shadow-md shadow-pink-200">
                Add
              </button>
            </div>

            {/* Games List for quick removal */}
            {games.length > 0 && (
              <div className="pt-2 border-t border-pink-100 space-y-1.5">
                <span className="text-xs text-pink-400 block">Current Games (Click ✕ to delete):</span>
                <div className="flex flex-wrap gap-2">
                  {games.map(g => (
                    <div key={g.id} className="flex items-center gap-1.5 bg-pink-50 px-2.5 py-1 rounded-lg border border-pink-200 text-xs font-medium">
                      <span className="text-pink-700">{g.name}</span>
                      <button onClick={() => deleteGame(g.id)} className="text-pink-400 hover:text-pink-600 font-bold ml-1">
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Log Match Form */}
        <section className="bg-white border border-pink-200 p-6 rounded-3xl shadow-sm space-y-6">
          <h2 className="text-xl font-extrabold text-pink-500">3. Log Match Result</h2>

          <div className="space-y-2">
            <label className="text-xs font-bold uppercase text-pink-400 block">Game Played</label>
            <select 
              value={selectedGameId} 
              onChange={(e) => setSelectedGameId(e.target.value)}
              className="w-full bg-pink-50/50 border border-pink-200 rounded-2xl px-4 py-3 text-sm font-semibold text-pink-800 focus:outline-none focus:border-pink-400"
            >
              {games.length === 0 && <option>No games created yet</option>}
              {games.map(g => (
                <option key={g.id} value={g.id}>{g.name} ({g.scoring_type})</option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold uppercase text-pink-400 block">Number of Slots / Teams</label>
            <div className="flex gap-2">
              {[2, 3, 4].map(num => (
                <button
                  key={num}
                  type="button"
                  onClick={() => handleTeamCountChange(num)}
                  className={`px-4 py-2 rounded-xl text-sm font-bold transition ${
                    numTeams === num ? 'bg-pink-400 text-white shadow-md shadow-pink-200' : 'bg-pink-50 text-pink-600 hover:bg-pink-100'
                  }`}
                >
                  {num} Slots
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-4 pt-2">
            {teamData.map((team, idx) => (
              <div key={idx} className="bg-pink-50/40 p-4 border border-pink-200 rounded-2xl space-y-3">
                <div className="flex justify-between items-center">
                  <span className="font-bold text-xs text-pink-500 uppercase">Slot {idx + 1}</span>
                  <input
                    type="number"
                    placeholder="Raw Score"
                    value={team.rawScore}
                    onChange={(e) => handleScoreChange(idx, e.target.value)}
                    className="bg-white border border-pink-200 px-3 py-1.5 rounded-xl text-right text-pink-800 placeholder-pink-300 w-28 font-mono text-sm focus:outline-none focus:border-pink-400"
                  />
                </div>
                <div>
                  <span className="text-xs text-pink-400 block mb-2">Select Player(s):</span>
                  {players.length === 0 ? (
                    <p className="text-xs text-pink-300 italic">No players added yet. Add players above first!</p>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {players.map(p => {
                        const isSelected = team.playerIds.includes(p.id);
                        return (
                          <button
                            key={p.id}
                            type="button"
                            onClick={() => handlePlayerToggle(idx, p.id)}
                            className={`px-3 py-1.5 text-xs rounded-xl font-bold transition ${
                              isSelected
                                ? 'bg-pink-400 text-white shadow-sm'
                                : 'bg-white border border-pink-200 text-pink-600 hover:bg-pink-100'
                            }`}
                          >
                            {isSelected ? '✓ ' : ''}{p.name}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          <button 
            onClick={submitMatch}
            className="w-full py-4 bg-pink-400 hover:bg-pink-500 font-bold rounded-2xl text-white transition shadow-lg shadow-pink-200 text-sm"
          >
            Submit Match & Update Standings
          </button>
        </section>

      </div>
    </main>
  );
}