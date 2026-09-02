'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';
import AdminMatchManager from '@/components/AdminMatchManager';
import { calculateEloChanges, ScoringType, TeamInput } from '@/lib/elo';

interface TeamState {
  players: string[];
  score: string;
}

export default function AdminPage() {
  const [games, setGames] = useState<any[]>([]);
  const [players, setPlayers] = useState<any[]>([]);
  const [selectedGame, setSelectedGame] = useState<string>('');
  const [scoringType, setScoringType] = useState<ScoringType>('high_score_wins');
  const [refreshKey, setRefreshKey] = useState<number>(0);

  const [newGameName, setNewGameName] = useState<string>('');
  const [newPlayerName, setNewPlayerName] = useState<string>('');

  const [teams, setTeams] = useState<TeamState[]>([
    { players: [''], score: '' },
    { players: [''], score: '' },
  ]);

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
    if (p) {
      setPlayers(p);
      if (p.length >= 2) {
        setTeams([
          { players: [p[0].id], score: '' },
          { players: [p[1].id], score: '' },
        ]);
      }
    }
  }

  function handleAddTeam() {
    if (teams.length < 4) {
      setTeams([...teams, { players: [''], score: '' }]);
    }
  }

  function handleRemoveTeam(teamIndex: number) {
    if (teams.length > 2) {
      setTeams(teams.filter((_, i) => i !== teamIndex));
    }
  }

  function handleAddPlayerToTeam(teamIndex: number) {
    const updated = [...teams];
    if (updated[teamIndex].players.length < 3) {
      updated[teamIndex].players.push('');
      setTeams(updated);
    }
  }

  function handleRemovePlayerFromTeam(teamIndex: number, playerIndex: number) {
    const updated = [...teams];
    if (updated[teamIndex].players.length > 1) {
      updated[teamIndex].players = updated[teamIndex].players.filter((_, i) => i !== playerIndex);
      setTeams(updated);
    }
  }

  function handleUpdatePlayer(teamIndex: number, playerIndex: number, value: string) {
    const updated = [...teams];
    updated[teamIndex].players[playerIndex] = value;
    setTeams(updated);
  }

  function handleUpdateScore(teamIndex: number, value: string) {
    const updated = [...teams];
    updated[teamIndex].score = value;
    setTeams(updated);
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

    const activeTeams = teams.map((t) => ({
      players: t.players.filter((id) => id !== ''),
      score: parseFloat(t.score),
    }));

    for (let i = 0; i < activeTeams.length; i++) {
      if (activeTeams[i].players.length === 0) {
        alert(`Team ${i + 1} must have at least one player selected.`);
        return;
      }
      if (isNaN(activeTeams[i].score)) {
        alert(`Please enter a valid numeric score for Team ${i + 1}.`);
        return;
      }
    }

    const allPlayerIds = activeTeams.flatMap((t) => t.players);
    if (new Set(allPlayerIds).size !== allPlayerIds.length) {
      alert('A player cannot be selected multiple times across teams.');
      return;
    }

    // A. Fetch current global stats from players
    const { data: playerData, error: pError } = await supabase
      .from('players')
      .select('id, elo, matches_played')
      .in('id', allPlayerIds);

    if (pError || !playerData) {
      alert('Error fetching player ratings: ' + pError?.message);
      return;
    }

    // A2. Fetch game-specific ratings from game_ratings
    const { data: gameRatingData } = await supabase
      .from('game_ratings')
      .select('player_id, elo, matches_played')
      .eq('game_id', selectedGame)
      .in('player_id', allPlayerIds);

    const gameEloMap = new Map<string, number>(
      gameRatingData?.map((gr) => [gr.player_id, gr.elo]) ?? []
    );
    const gameMatchesMap = new Map<string, number>(
      gameRatingData?.map((gr) => [gr.player_id, gr.matches_played ?? 0]) ?? []
    );

    // B. Build lookup maps (Prefer game_ratings Elo over global player Elo)
    const ratingMap = new Map<string, number>(
      playerData.map((p) => [
        p.id,
        gameEloMap.has(p.id) ? gameEloMap.get(p.id)! : (p.elo ?? 1000),
      ])
    );
    const matchCountMap = new Map<string, number>(
      playerData.map((p) => [
        p.id,
        gameMatchesMap.has(p.id) ? gameMatchesMap.get(p.id)! : (p.matches_played ?? 0),
      ])
    );

    const eloInputs: TeamInput[] = activeTeams.map((t, idx) => ({
      id: idx,
      playerIds: t.players,
      rawScore: t.score,
    }));

    // C. Calculate dynamic Elo changes
    const calculated = calculateEloChanges(eloInputs, scoringType, ratingMap, matchCountMap);
    const results = Array.isArray(calculated) ? calculated : Object.values(calculated);

    // D. Insert match record
    const { data: matchData, error: matchError } = await supabase
      .from('matches')
      .insert([{ game_id: selectedGame }])
      .select()
      .single();

    if (matchError || !matchData) {
      alert('Error creating match record: ' + matchError?.message);
      return;
    }

    const scoresToInsert: any[] = [];
    const playerUpdatesMap = new Map<string, { elo: number; gameMatches: number; globalMatches: number }>();

    results.forEach((res: any, teamIdx: number) => {
      const team = activeTeams[teamIdx];
      if (!team) return;

      const currentTeamId = Number(teamIdx + 1);

      team.players.forEach((playerId) => {
        const eloChange = res.eloChangePerPlayer ?? 0;
        
        scoresToInsert.push({
          match_id: matchData.id,
          player_id: playerId,
          rank: res.rank ?? 1,
          raw_score: res.rawScore ?? team.score,
          elo_change: eloChange,
          team_id: currentTeamId,
        });

        const currentElo = ratingMap.get(playerId) ?? 1000;
        const currentGameMatches = gameMatchesMap.get(playerId) ?? 0;
        const currentGlobalMatches = playerData.find((p) => p.id === playerId)?.matches_played ?? 0;

        const updatedElo = Math.round(currentElo + eloChange);

        playerUpdatesMap.set(playerId, {
          elo: updatedElo,
          gameMatches: currentGameMatches + 1,
          globalMatches: currentGlobalMatches + 1,
        });
      });
    });

    // Save match scores to match_scores
    const { error: scoreError } = await supabase.from('match_scores').insert(scoresToInsert);
    if (scoreError) {
      alert('Error saving match scores: ' + scoreError.message);
      return;
    }

    // E. Update game_ratings and global player match counts
    for (const [pId, updates] of Array.from(playerUpdatesMap.entries())) {
      // 1. Save new Elo into game_ratings
      const { error: grError } = await supabase
        .from('game_ratings')
        .upsert(
          { 
            player_id: pId, 
            game_id: selectedGame, 
            elo: updates.elo,
            matches_played: updates.gameMatches 
          },
          { onConflict: 'player_id,game_id' }
        );

      if (grError) {
        alert(`Error updating game rating for player ${pId}: ` + grError.message);
        return;
      }

      // 2. Increment global match count in players table
      const { error: updateError } = await supabase
        .from('players')
        .update({
          matches_played: updates.globalMatches,
        })
        .eq('id', pId);

      if (updateError) {
        alert(`Error updating global player stats for ${pId}: ` + updateError.message);
        return;
      }
    }

    alert('Match logged successfully! Ratings updated in game_ratings.');

    setTeams(teams.map((t) => ({ ...t, score: '' })));
    setRefreshKey((prev) => prev + 1);
  }

  const allChosen = new Set(teams.flatMap((t) => t.players).filter(Boolean));

  return (
    <main style={{ minHeight: '100vh', backgroundColor: '#fff1f2', color: '#831843', padding: '16px', fontFamily: 'system-ui, sans-serif' }}>
      <div style={{ maxWidth: '768px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '20px' }}>
        
        {/* Navigation & Header */}
        <div style={{ backgroundColor: '#ffffff', padding: '20px', borderRadius: '24px', border: '1px solid #fbcfe8', boxShadow: '0 2px 8px rgba(244, 114, 182, 0.08)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <Link href="/" style={{ fontSize: '0.75rem', fontWeight: 700, color: '#ec4899', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '4px', marginBottom: '4px' }}>
              <span>←</span> Back to Standings
            </Link>
            <h1 style={{ fontSize: '1.75rem', fontWeight: 900, margin: 0, color: '#ec4899', letterSpacing: '-0.025em' }}>
              ⚡ Admin Control Center
            </h1>
            <p style={{ fontSize: '0.75rem', color: '#f472b6', margin: '2px 0 0 0' }}>Configure your roster, register categories, and submit live match results.</p>
          </div>
          <div style={{ backgroundColor: '#fdf2f8', border: '1px solid #fbcfe8', padding: '6px 12px', borderRadius: '12px', color: '#db2777', fontSize: '0.75rem', fontWeight: 700 }}>
            System Active
          </div>
        </div>

        {/* Setup Grid: Add Games & Players */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
          
          <form onSubmit={handleAddGame} style={{ backgroundColor: '#ffffff', border: '1px solid #fbcfe8', padding: '20px', borderRadius: '24px', display: 'flex', flexDirection: 'column', gap: '12px', boxShadow: '0 2px 8px rgba(244, 114, 182, 0.05)' }}>
            <div>
              <span style={{ fontSize: '0.65rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#ec4899', backgroundColor: '#fdf2f8', padding: '2px 6px', borderRadius: '6px' }}>Catalog</span>
              <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#831843', margin: '6px 0 2px 0' }}>Add New Game</h3>
              <p style={{ fontSize: '0.7rem', color: '#f472b6', margin: 0 }}>Create a tracking board (e.g. Golf, Smash, Catan)</p>
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <input
                type="text"
                placeholder="Game title..."
                value={newGameName}
                onChange={(e) => setNewGameName(e.target.value)}
                style={{ flex: 1, backgroundColor: '#fff1f2', border: '1px solid #fbcfe8', borderRadius: '12px', padding: '10px 14px', fontSize: '0.875rem', color: '#831843', outline: 'none' }}
              />
              <button type="submit" style={{ backgroundColor: '#f472b6', color: '#ffffff', fontWeight: 700, fontSize: '0.75rem', padding: '10px 16px', borderRadius: '12px', border: 'none', cursor: 'pointer', boxShadow: '0 2px 6px rgba(244, 114, 182, 0.3)' }}>
                Add Game
              </button>
            </div>
          </form>

          <form onSubmit={handleAddPlayer} style={{ backgroundColor: '#ffffff', border: '1px solid #fbcfe8', padding: '20px', borderRadius: '24px', display: 'flex', flexDirection: 'column', gap: '12px', boxShadow: '0 2px 8px rgba(244, 114, 182, 0.05)' }}>
            <div>
              <span style={{ fontSize: '0.65rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#059669', backgroundColor: '#ecfdf5', padding: '2px 6px', borderRadius: '6px' }}>Roster</span>
              <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#831843', margin: '6px 0 2px 0' }}>Add New Player</h3>
              <p style={{ fontSize: '0.7rem', color: '#f472b6', margin: 0 }}>Register a participant into the system</p>
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <input
                type="text"
                placeholder="Player name..."
                value={newPlayerName}
                onChange={(e) => setNewPlayerName(e.target.value)}
                style={{ flex: 1, backgroundColor: '#fff1f2', border: '1px solid #fbcfe8', borderRadius: '12px', padding: '10px 14px', fontSize: '0.875rem', color: '#831843', outline: 'none' }}
              />
              <button type="submit" style={{ backgroundColor: '#10b981', color: '#ffffff', fontWeight: 700, fontSize: '0.75rem', padding: '10px 16px', borderRadius: '12px', border: 'none', cursor: 'pointer', boxShadow: '0 2px 6px rgba(16, 185, 129, 0.3)' }}>
                Add Player
              </button>
            </div>
          </form>

        </div>

        {/* Log Match Section */}
        <form onSubmit={handleLogMatch} style={{ backgroundColor: '#ffffff', border: '1px solid #fbcfe8', padding: '24px', borderRadius: '24px', display: 'flex', flexDirection: 'column', gap: '20px', boxShadow: '0 2px 8px rgba(244, 114, 182, 0.05)' }}>
          <div style={{ borderBottom: '1px solid #fbcfe8', paddingBottom: '16px' }}>
            <h2 style={{ fontSize: '1.125rem', fontWeight: 800, color: '#831843', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span>🏆</span> Log Match Outcome
            </h2>
            <p style={{ fontSize: '0.75rem', color: '#f472b6', margin: '2px 0 0 0' }}>Record lineup matchups and scores to execute automatic Elo calculations.</p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px' }}>
            <div>
              <label style={{ fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', color: '#f472b6', letterSpacing: '0.05em', display: 'block', marginBottom: '6px' }}>Select Game Mode</label>
              <select
                value={selectedGame}
                onChange={(e) => setSelectedGame(e.target.value)}
                style={{ width: '100%', backgroundColor: '#fff1f2', border: '1px solid #fbcfe8', borderRadius: '12px', padding: '12px', fontSize: '0.875rem', fontWeight: 700, color: '#831843', outline: 'none' }}
              >
                {games.map((g) => (
                  <option key={g.id} value={g.id}>{g.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label style={{ fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', color: '#f472b6', letterSpacing: '0.05em', display: 'block', marginBottom: '6px' }}>Scoring Mechanic</label>
              <select
                value={scoringType}
                onChange={(e) => setScoringType(e.target.value as ScoringType)}
                style={{ width: '100%', backgroundColor: '#fff1f2', border: '1px solid #fbcfe8', borderRadius: '12px', padding: '12px', fontSize: '0.875rem', fontWeight: 700, color: '#831843', outline: 'none' }}
              >
                <option value="high_score_wins">High Score Wins (Points, Kills)</option>
                <option value="low_score_wins">Low Score Wins (Golf Strokes, Time)</option>
              </select>
            </div>
          </div>

          {/* Teams Container */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <label style={{ fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', color: '#f472b6', letterSpacing: '0.05em' }}>Active Lineups</label>
              <span style={{ fontSize: '0.7rem', color: '#f472b6' }}>Up to 4 teams supported</span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
              {teams.map((team, teamIdx) => (
                <div key={teamIdx} style={{ backgroundColor: '#fff1f2', padding: '16px', borderRadius: '16px', border: '1px solid #fbcfe8', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #fce7f3', paddingBottom: '8px' }}>
                    <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#ec4899', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#ec4899', display: 'inline-block' }}></span>
                      Team {teamIdx + 1}
                    </span>
                    {teams.length > 2 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveTeam(teamIdx)}
                        style={{ background: 'none', border: 'none', fontSize: '0.75rem', fontWeight: 700, color: '#e11d48', cursor: 'pointer' }}
                      >
                        Remove
                      </button>
                    )}
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {team.players.map((pId, pIdx) => (
                      <div key={pIdx} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <select
                          value={pId}
                          onChange={(e) => handleUpdatePlayer(teamIdx, pIdx, e.target.value)}
                          style={{ width: '100%', backgroundColor: '#ffffff', border: '1px solid #fbcfe8', borderRadius: '10px', padding: '10px', fontSize: '0.75rem', fontWeight: 700, color: '#831843', outline: 'none' }}
                        >
                          <option value="">Select player...</option>
                          {players.map((p) => (
                            <option key={p.id} value={p.id} disabled={allChosen.has(p.id) && p.id !== pId}>
                              {p.name}
                            </option>
                          ))}
                        </select>
                        {team.players.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleRemovePlayerFromTeam(teamIdx, pIdx)}
                            style={{ background: 'none', border: 'none', color: '#f472b6', fontSize: '0.875rem', fontWeight: 700, cursor: 'pointer', padding: '4px' }}
                          >
                            ✕
                          </button>
                        )}
                      </div>
                    ))}

                    {team.players.length < 3 && (
                      <button
                        type="button"
                        onClick={() => handleAddPlayerToTeam(teamIdx)}
                        style={{ background: 'none', border: 'none', fontSize: '0.75rem', fontWeight: 700, color: '#ec4899', cursor: 'pointer', textAlign: 'left', padding: '2px 0' }}
                      >
                        + Add Teammate
                      </button>
                    )}
                  </div>

                  <div style={{ borderTop: '1px solid #fce7f3', paddingTop: '10px' }}>
                    <label style={{ fontSize: '0.65rem', fontWeight: 700, color: '#f472b6', textTransform: 'uppercase', display: 'block', marginBottom: '4px' }}>
                      Final Team Score
                    </label>
                    <input
                      type="number"
                      step="any"
                      placeholder="e.g. 72, 4, 100"
                      value={team.score}
                      onChange={(e) => handleUpdateScore(teamIdx, e.target.value)}
                      style={{ width: '100%', backgroundColor: '#ffffff', border: '1px solid #fbcfe8', borderRadius: '10px', padding: '10px', fontSize: '0.875rem', fontWeight: 700, color: '#831843', outline: 'none' }}
                    />
                  </div>
                </div>
              ))}
            </div>

            {teams.length < 4 && (
              <button
                type="button"
                onClick={handleAddTeam}
                style={{ width: '100%', border: '2px dashed #fbcfe8', backgroundColor: '#fdf2f8', color: '#db2777', fontWeight: 700, padding: '14px', borderRadius: '16px', cursor: 'pointer', fontSize: '0.75rem' }}
              >
                + Add Another Team to Match
              </button>
            )}
          </div>

          <button
            type="submit"
            style={{ width: '100%', backgroundColor: '#f472b6', color: '#ffffff', fontWeight: 800, padding: '16px', borderRadius: '16px', border: 'none', cursor: 'pointer', fontSize: '0.875rem', boxShadow: '0 4px 12px rgba(244, 114, 182, 0.3)' }}
          >
            Commit Match Results & Recalculate Ratings
          </button>
        </form>

        {/* Existing Match Manager section */}
        <div style={{ backgroundColor: '#ffffff', border: '1px solid #fbcfe8', padding: '24px', borderRadius: '24px', boxShadow: '0 2px 8px rgba(244, 114, 182, 0.05)' }}>
          <AdminMatchManager key={refreshKey} />
        </div>

      </div>
    </main>
  );
}