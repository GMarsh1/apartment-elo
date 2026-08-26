'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';
import AdminMatchManager from '@/components/AdminMatchManager';

export default function AdminPage() {
  const [games, setGames] = useState<any[]>([]);
  const [players, setPlayers] = useState<any[]>([]);
  const [selectedGame, setSelectedGame] = useState<string>('');
  const [refreshKey, setRefreshKey] = useState<number>(0);

  // Inputs for adding games/players
  const [newGameName, setNewGameName] = useState<string>('');
  const [newPlayerName, setNewPlayerName] = useState<string>('');

  // Team Assignments (Array of player IDs for each team)
  const [team1Players, setTeam1Players] = useState<string[]>(['']);
  const [team2Players, setTeam2Players] = useState<string[]>(['']);

  // Scores per team
  const [team1Score, setTeam1Score] = useState<string>('');
  const [team2Score, setTeam2Score] = useState<string>('');

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    const { data: g } = await supabase.from('games').select('*');
    const { data: p } = await supabase.from('players').select('*');

    if (g && g.length > 0) {
      setGames(g);
      setSelectedGame((prev) => prev || g[0].id);
    }
    if (p && p.length >= 2) {
      setPlayers(p);
      setTeam1Players([p[0].id]);
      setTeam2Players([p[1].id]);
    } else if (p) {
      setPlayers(p);
    }
  }

  // Helpers to adjust dynamic team sizes (up to 3 players per team)
  function handleAddTeamPlayer(team: 1 | 2) {
    const setTeam = team === 1 ? setTeam1Players : setTeam2Players;
    const currentTeam = team === 1 ? team1Players : team2Players;

    if (currentTeam.length < 3) {
      const allSelected = new Set([...team1Players, ...team2Players]);
      const unused = players.find((p) => !allSelected.has(p.id));
      setTeam([...currentTeam, unused ? unused.id : '']);
    }
  }

  function handleRemoveTeamPlayer(team: 1 | 2, index: number) {
    const setTeam = team === 1 ? setTeam1Players : setTeam2Players;
    const currentTeam = team === 1 ? team1Players : team2Players;

    if (currentTeam.length > 1) {
      setTeam(currentTeam.filter((_, i) => i !== index));
    }
  }

  function handleUpdatePlayer(team: 1 | 2, index: number, value: string) {
    const setTeam = team === 1 ? setTeam1Players : setTeam2Players;
    const currentTeam = team === 1 ? [...team1Players] : [...team2Players];
    currentTeam[index] = value;
    setTeam(currentTeam);
  }

  async function handleAddGame(e: React.FormEvent) {
    e.preventDefault();
    if (!newGameName.trim()) return;

    const { error } = await supabase.from('games').insert([{ name: newGameName.trim() }]);
    if (error) {
      alert('Error adding game: ' + error.message);
    } else {
      setNewGameName('');
      fetchData();
    }
  }

  async function handleAddPlayer(e: React.FormEvent) {
    e.preventDefault();
    if (!newPlayerName.trim()) return;

    const { error } = await supabase.from('players').insert([{ name: newPlayerName.trim() }]);
    if (error) {
      alert('Error adding player: ' + error.message);
    } else {
      setNewPlayerName('');
      fetchData();
    }
  }

  async function handleLogMatch(e: React.FormEvent) {
    e.preventDefault();

    const activeT1 = team1Players.filter((id) => id);
    const activeT2 = team2Players.filter((id) => id);

    if (activeT1.length === 0 || activeT2.length === 0) {
      alert('Both teams must have at least one player.');
      return;
    }

    const allSelected = [...activeT1, ...activeT2];
    if (new Set(allSelected).size !== allSelected.length) {
      alert('A player cannot be on both teams or selected multiple times.');
      return;
    }

    const s1 = parseFloat(team1Score);
    const s2 = parseFloat(team2Score);

    if (isNaN(s1) || isNaN(s2)) {
      alert('Please enter valid numerical scores for both teams.');
      return;
    }

    // Determine ranks
    const rank1 = s1 > s2 ? 1 : s1 < s2 ? 2 : 1;
    const rank2 = s2 > s1 ? 1 : s2 < s1 ? 2 : 1;

    // Fetch existing ratings
    const { data: ratingsData } = await supabase
      .from('game_ratings')
      .select('player_id, elo')
      .eq('game_id', selectedGame)
      .in('player_id', allSelected);

    const ratingMap = new Map<string, number>();
    ratingsData?.forEach((row) => ratingMap.set(row.player_id, row.elo));

    // Calculate Team Average Elos
    const avgElo1 = activeT1.reduce((sum, id) => sum + (ratingMap.get(id) ?? 1000), 0) / activeT1.length;
    const avgElo2 = activeT2.reduce((sum, id) => sum + (ratingMap.get(id) ?? 1000), 0) / activeT2.length;

    // Standard Team Elo
    const expected1 = 1 / (1 + Math.pow(10, (avgElo2 - avgElo1) / 400));
    const expected2 = 1 / (1 + Math.pow(10, (avgElo1 - avgElo2) / 400));

    const actual1 = s1 > s2 ? 1 : s1 === s2 ? 0.5 : 0;
    const actual2 = s2 > s1 ? 1 : s1 === s2 ? 0.5 : 0;

    const eloChange1 = Math.round(32 * (actual1 - expected1));
    const eloChange2 = Math.round(32 * (actual2 - expected2));

    // Create Match Record
    const { data: matchData, error: matchError } = await supabase
      .from('matches')
      .insert([{ game_id: selectedGame }])
      .select()
      .single();

    if (matchError || !matchData) {
      alert('Error creating match record: ' + matchError?.message);
      return;
    }

    // Prepare Score Entries
    const scoresToInsert = [
      ...activeT1.map((playerId) => ({
        match_id: matchData.id,
        player_id: playerId,
        rank: rank1,
        raw_score: s1,
        elo_change: eloChange1,
        team: 1,
      })),
      ...activeT2.map((playerId) => ({
        match_id: matchData.id,
        player_id: playerId,
        rank: rank2,
        raw_score: s2,
        elo_change: eloChange2,
        team: 2,
      })),
    ];

    await supabase.from('match_scores').insert(scoresToInsert);

    // Upsert individual player ratings
    const ratingsToUpsert = [
      ...activeT1.map((playerId) => ({
        game_id: selectedGame,
        player_id: playerId,
        elo: (ratingMap.get(playerId) ?? 1000) + eloChange1,
      })),
      ...activeT2.map((playerId) => ({
        game_id: selectedGame,
        player_id: playerId,
        elo: (ratingMap.get(playerId) ?? 1000) + eloChange2,
      })),
    ];

    await supabase.from('game_ratings').upsert(ratingsToUpsert);

    alert('Match logged successfully!');
    setTeam1Score('');
    setTeam2Score('');
    setRefreshKey((prev) => prev + 1);
  }

  const allChosen = new Set([...team1Players, ...team2Players]);

  return (
    <main className="min-h-screen bg-pink-50 text-pink-900 p-4 md:p-8">
      <div className="max-w-2xl mx-auto space-y-6">
        <Link href="/" className="text-xs font-bold text-pink-400 hover:text-pink-600 transition inline-block">
          ← Back to Standings
        </Link>

        <header className="bg-white p-6 rounded-3xl border border-pink-200 shadow-sm">
          <h1 className="text-2xl font-black text-pink-500">ADMIN CONTROL CENTER</h1>
          <p className="text-xs text-pink-400 mt-1">Add games, register roommates, and log match scores.</p>
        </header>

        {/* Form: Add New Game & Add New Player */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <form onSubmit={handleAddGame} className="bg-white border border-pink-200 p-5 rounded-3xl space-y-3 shadow-sm">
            <h3 className="text-xs font-bold uppercase text-pink-400 tracking-wider">+ Add New Game</h3>
            <input
              type="text"
              placeholder="e.g. Smash Bros, Pool"
              value={newGameName}
              onChange={(e) => setNewGameName(e.target.value)}
              className="w-full bg-pink-50 border border-pink-200 rounded-xl p-2.5 text-xs font-bold text-pink-800 placeholder-pink-300"
            />
            <button type="submit" className="w-full bg-pink-400 hover:bg-pink-500 text-white text-xs font-bold py-2.5 rounded-xl transition">
              Add Game
            </button>
          </form>

          <form onSubmit={handleAddPlayer} className="bg-white border border-pink-200 p-5 rounded-3xl space-y-3 shadow-sm">
            <h3 className="text-xs font-bold uppercase text-pink-400 tracking-wider">+ Add New Player</h3>
            <input
              type="text"
              placeholder="Roommate Name"
              value={newPlayerName}
              onChange={(e) => setNewPlayerName(e.target.value)}
              className="w-full bg-pink-50 border border-pink-200 rounded-xl p-2.5 text-xs font-bold text-pink-800 placeholder-pink-300"
            />
            <button type="submit" className="w-full bg-pink-400 hover:bg-pink-500 text-white text-xs font-bold py-2.5 rounded-xl transition">
              Add Player
            </button>
          </form>
        </div>

        {/* Form: Log Match Outcome (Team 1 vs Team 2 Column View) */}
        <form onSubmit={handleLogMatch} className="bg-white border border-pink-200 p-6 rounded-3xl space-y-4 shadow-sm">
          <h3 className="text-sm font-black text-pink-800">🎮 Log Match Result</h3>

          <div>
            <label className="text-[10px] font-bold text-pink-400 uppercase">Select Game</label>
            <select
              value={selectedGame}
              onChange={(e) => setSelectedGame(e.target.value)}
              className="w-full bg-pink-50 border border-pink-200 rounded-xl p-2.5 text-xs font-bold text-pink-800 mt-1"
            >
              {games.map((g) => (
                <option key={g.id} value={g.id}>{g.name}</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Team 1 Column */}
            <div className="bg-pink-50/50 p-4 rounded-2xl border border-pink-100 space-y-3">
              <h4 className="text-xs font-black text-pink-700 uppercase tracking-wider">TEAM 1</h4>
              
              {team1Players.map((pId, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <select
                    value={pId}
                    onChange={(e) => handleUpdatePlayer(1, idx, e.target.value)}
                    className="w-full bg-white border border-pink-200 rounded-xl p-2 text-xs font-bold text-pink-800"
                  >
                    <option value="">Select Player</option>
                    {players.map((p) => (
                      <option key={p.id} value={p.id} disabled={allChosen.has(p.id) && p.id !== pId}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                  {team1Players.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveTeamPlayer(1, idx)}
                      className="text-xs font-bold text-pink-400 hover:text-pink-600 px-1"
                    >
                      ✕
                    </button>
                  )}
                </div>
              ))}

              {team1Players.length < 3 && (
                <button
                  type="button"
                  onClick={() => handleAddTeamPlayer(1)}
                  className="text-[10px] font-bold text-pink-500 hover:underline block"
                >
                  + Add Teammate
                </button>
              )}

              <div>
                <label className="text-[10px] font-bold text-pink-400 uppercase block mt-2">Team 1 Score</label>
                <input
                  type="number"
                  placeholder="Score"
                  value={team1Score}
                  onChange={(e) => setTeam1Score(e.target.value)}
                  className="w-full bg-white border border-pink-200 rounded-xl p-2 text-xs font-bold text-pink-800 mt-1"
                />
              </div>
            </div>

            {/* Team 2 Column */}
            <div className="bg-pink-50/50 p-4 rounded-2xl border border-pink-100 space-y-3">
              <h4 className="text-xs font-black text-pink-700 uppercase tracking-wider">TEAM 2</h4>

              {team2Players.map((pId, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <select
                    value={pId}
                    onChange={(e) => handleUpdatePlayer(2, idx, e.target.value)}
                    className="w-full bg-white border border-pink-200 rounded-xl p-2 text-xs font-bold text-pink-800"
                  >
                    <option value="">Select Player</option>
                    {players.map((p) => (
                      <option key={p.id} value={p.id} disabled={allChosen.has(p.id) && p.id !== pId}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                  {team2Players.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveTeamPlayer(2, idx)}
                      className="text-xs font-bold text-pink-400 hover:text-pink-600 px-1"
                    >
                      ✕
                    </button>
                  )}
                </div>
              ))}

              {team2Players.length < 3 && (
                <button
                  type="button"
                  onClick={() => handleAddTeamPlayer(2)}
                  className="text-[10px] font-bold text-pink-500 hover:underline block"
                >
                  + Add Teammate
                </button>
              )}

              <div>
                <label className="text-[10px] font-bold text-pink-400 uppercase block mt-2">Team 2 Score</label>
                <input
                  type="number"
                  placeholder="Score"
                  value={team2Score}
                  onChange={(e) => setTeam2Score(e.target.value)}
                  className="w-full bg-white border border-pink-200 rounded-xl p-2 text-xs font-bold text-pink-800 mt-1"
                />
              </div>
            </div>
          </div>

          <button
            type="submit"
            className="w-full bg-pink-500 hover:bg-pink-600 text-white font-bold py-3 rounded-2xl transition text-xs shadow-md shadow-pink-200 mt-2"
          >
            Submit Match & Update Elo
          </button>
        </form>

        {/* Recent Match Manager */}
        <AdminMatchManager key={refreshKey} />
      </div>
    </main>
  );
}