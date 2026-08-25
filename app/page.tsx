import MatchupCard from '@/components/MatchupCard';

export default function Home() {
  // Sample player roster (replace or hook up to your Supabase query)
  const players = [
    { id: '1', name: 'Grant', rating: 1250 },
    { id: '2', name: 'Alex', rating: 1180 },
    { id: '3', name: 'Sam', rating: 1050 },
    { id: '4', name: 'Jordan', rating: 990 },
    { id: '5', name: 'Chris', rating: 1120 },
  ];

  return (
    <main className="container mx-auto px-4 py-10 space-y-8">
      <header className="text-center space-y-2">
        <h1 className="text-4xl font-black tracking-tight text-white sm:text-5xl">
          BOSS ST. <span className="text-amber-400">ELO</span> LEADERBOARD
        </h1>
        <p className="text-slate-400 text-sm">Apartment Rankings & Live Betting Lines</p>
      </header>

      <MatchupCard availablePlayers={players} />
    </main>
  );
}