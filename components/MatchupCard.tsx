'use client';

import React, { useState } from 'react';
import { Player, calculateTeamBettingLines } from '@/lib/elo';

interface MatchupProps {
  availablePlayers: Player[];
  headToHeadWinsA?: number;
  headToHeadWinsB?: number;
}

export default function MatchupCard({
  availablePlayers,
  headToHeadWinsA = 0,
  headToHeadWinsB = 0,
}: MatchupProps) {
  const [teamA, setTeamA] = useState<Player[]>(
    availablePlayers.slice(0, 1)
  );
  const [teamB, setTeamB] = useState<Player[]>(
    availablePlayers.slice(1, 2)
  );
  const [copied, setCopied] = useState(false);

  const odds = calculateTeamBettingLines(teamA, teamB);

  const togglePlayerA = (player: Player) => {
    if (teamA.some((p) => p.id === player.id)) {
      setTeamA(teamA.filter((p) => p.id !== player.id));
    } else if (teamA.length < 5) {
      setTeamA([...teamA, player]);
      setTeamB(teamB.filter((p) => p.id !== player.id));
    }
  };

  const togglePlayerB = (player: Player) => {
    if (teamB.some((p) => p.id === player.id)) {
      setTeamB(teamB.filter((p) => p.id !== player.id));
    } else if (teamB.length < 5) {
      setTeamB([...teamB, player]);
      setTeamA(teamA.filter((p) => p.id !== player.id));
    }
  };

  const nameListA = teamA.map((p) => p.name).join(', ') || 'No Players';
  const nameListB = teamB.map((p) => p.name).join(', ') || 'No Players';

  const shareText = `🔥 UPCOMING MATCHUP:\n` +
    `🔴 [Team A]: ${nameListA} (Avg ${odds.avgEloA} Elo)\n` +
    `🔵 [Team B]: ${nameListB} (Avg ${odds.avgEloB} Elo)\n\n` +
    `📊 Win Probabilities: Team A ${odds.winProbA}% | Team B ${odds.winProbB}%\n` +
    `💰 Moneyline: Team A (${odds.americanOddsA}) vs Team B (${odds.americanOddsB})\n` +
    `⚔️ Spread: Team A (${odds.spreadA}) | Team B (${odds.spreadB})\n` +
    `Check live standings at https://boss-st-elo.vercel.app`;

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Matchup: ${nameListA} vs ${nameListB}`,
          text: shareText,
          url: window.location.href,
        });
      } catch (err) {
        console.log('Share canceled', err);
      }
    } else {
      await navigator.clipboard.writeText(shareText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="max-w-xl mx-auto bg-slate-950/90 text-slate-100 rounded-3xl p-6 shadow-2xl border border-slate-800 space-y-6 backdrop-blur-md">
      <h2 className="text-xl font-black text-center text-amber-400 uppercase tracking-widest">
        Matchup Simulator (Up to 5v5)
      </h2>

      <div className="space-y-3 bg-slate-900/80 p-4 rounded-2xl border border-slate-800">
        <h3 className="text-xs uppercase font-bold text-slate-400 tracking-wider">
          Assign Roster (Tap A or B to Assign)
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto pr-1">
          {availablePlayers.map((player) => {
            const isA = teamA.some((p) => p.id === player.id);
            const isB = teamB.some((p) => p.id === player.id);

            return (
              <div
                key={player.id}
                className="flex items-center justify-between bg-slate-800/80 px-3 py-2 rounded-xl text-sm border border-slate-700/50"
              >
                <span className="font-semibold truncate">
                  {player.name} <span className="text-xs text-slate-400">({player.rating})</span>
                </span>
                <div className="flex gap-1">
                  <button
                    onClick={() => togglePlayerA(player)}
                    className={`px-2 py-1 rounded-lg text-xs font-bold transition ${
                      isA ? 'bg-red-600 text-white' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                    }`}
                  >
                    Team A
                  </button>
                  <button
                    onClick={() => togglePlayerB(player)}
                    className={`px-2 py-1 rounded-lg text-xs font-bold transition ${
                      isB ? 'bg-blue-600 text-white' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                    }`}
                  >
                    Team B
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-5 items-center text-center bg-slate-900 p-4 rounded-2xl border border-slate-800">
        <div className="col-span-2">
          <span className="text-xs font-bold uppercase text-red-400">Team A</span>
          <p className="font-extrabold text-base truncate">{nameListA}</p>
          <span className="text-xs text-slate-400">{odds.avgEloA} Avg Elo</span>
        </div>
        <div className="col-span-1 font-black text-amber-400 text-lg">VS</div>
        <div className="col-span-2">
          <span className="text-xs font-bold uppercase text-blue-400">Team B</span>
          <p className="font-extrabold text-base truncate">{nameListB}</p>
          <span className="text-xs text-slate-400">{odds.avgEloB} Avg Elo</span>
        </div>
      </div>

      <div>
        <div className="flex justify-between text-xs font-semibold mb-1">
          <span className="text-red-400">Team A {odds.winProbA}%</span>
          <span className="text-blue-400">Team B {odds.winProbB}%</span>
        </div>
        <div className="w-full bg-blue-900/60 h-4 rounded-full overflow-hidden flex border border-slate-700">
          <div
            className="bg-red-600 h-full transition-all duration-500"
            style={{ width: `${odds.winProbA}%` }}
          />
        </div>
      </div>

      <div className="bg-slate-900 rounded-2xl p-4 space-y-3 text-sm border border-slate-800">
        <h4 className="font-bold text-slate-400 text-xs uppercase tracking-wider text-center">
          Vegas Odds & Lines
        </h4>
        <div className="grid grid-cols-3 gap-2 text-center items-center">
          <span className="text-slate-400 text-xs text-left">Market</span>
          <span className="font-bold text-red-400">Team A</span>
          <span className="font-bold text-blue-400">Team B</span>

          <span className="text-slate-400 text-xs text-left">Moneyline</span>
          <span className="text-emerald-400 font-bold">{odds.americanOddsA}</span>
          <span className="text-emerald-400 font-bold">{odds.americanOddsB}</span>

          <span className="text-slate-400 text-xs text-left">Spread</span>
          <span className="text-amber-300 font-semibold">{odds.spreadA}</span>
          <span className="text-amber-300 font-semibold">{odds.spreadB}</span>
        </div>
      </div>

      {headToHeadWinsA + headToHeadWinsB > 0 && (
        <div className="border-t border-slate-800 pt-4 text-center">
          <span className="text-xs uppercase text-slate-400 tracking-wider">H2H Series Record</span>
          <div className="text-xl font-black mt-1">
            {headToHeadWinsA} - {headToHeadWinsB}
          </div>
        </div>
      )}

      <button
        onClick={handleShare}
        className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold py-3.5 rounded-2xl transition flex items-center justify-center gap-2 shadow-lg shadow-indigo-950 active:scale-95 border border-indigo-500/30"
      >
        <span>📲</span>
        <span>{copied ? 'Copied to Clipboard!' : 'Share Odds to Group Chat'}</span>
      </button>
    </div>
  );
}