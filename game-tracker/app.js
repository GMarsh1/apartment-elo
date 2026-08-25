// Mock Data Array
const matchHistory = [
  { id: 1, opponent: "Buzz_1927", result: "Win", game: "Chess", date: "2026-08-20" },
  { id: 2, opponent: "Rival_Ramblin", result: "Loss", game: "Catan", date: "2026-08-21" },
  { id: 3, opponent: "Buzz_1927", result: "Loss", game: "Ping Pong", date: "2026-08-22" },
  { id: 4, opponent: "Buzz_1927", result: "Win", game: "Chess", date: "2026-08-23" },
  { id: 5, opponent: "GeorgiaTech_Alum", result: "Win", game: "Ping Pong", date: "2026-08-24" }
];

const gameFilter = document.getElementById('game-filter');
const opponentFilter = document.getElementById('opponent-filter');
const matchList = document.getElementById('match-list');
const h2hStats = document.getElementById('h2h-stats');
const shareBtn = document.getElementById('share-btn');

// Render Filtered Matches & Compute H2H Stats
function render() {
  const selectedGame = gameFilter.value;
  const opponentSearch = opponentFilter.value.trim().toLowerCase();

  // 1. Filter Matches
  const filtered = matchHistory.filter(match => {
    const matchesGame = selectedGame === "All" || match.game === selectedGame;
    const matchesOpponent = match.opponent.toLowerCase().includes(opponentSearch);
    return matchesGame && matchesOpponent;
  });

  // 2. Render List
  matchList.innerHTML = filtered.length ? "" : "<li>No matches found.</li>";
  filtered.forEach(match => {
    const li = document.createElement('li');
    li.className = 'match-item';
    li.innerHTML = `
      <div>
        <strong>vs. ${match.opponent}</strong> (${match.game})
        <br><small>${match.date}</small>
      </div>
      <span class="${match.result === 'Win' ? 'tag-win' : 'tag-loss'}">${match.result}</span>
    `;
    matchList.appendChild(li);
  });

  // 3. Compute H2H Stats if opponent is searched
  if (opponentSearch.length > 0) {
    const opponentMatches = matchHistory.filter(m => m.opponent.toLowerCase().includes(opponentSearch));
    const wins = opponentMatches.filter(m => m.result === "Win").length;
    const losses = opponentMatches.filter(m => m.result === "Loss").length;
    const total = opponentMatches.length;

    h2hStats.innerHTML = total > 0 
      ? `<strong>Record:</strong> ${wins}W - ${losses}L (${total} total games)`
      : `No recorded history with "${opponentFilter.value}".`;
  } else {
    h2hStats.textContent = "Type an opponent's name to view your head-to-head record.";
  }
}

// Event Listeners
gameFilter.addEventListener('change', render);
opponentFilter.addEventListener('input', render);

// Native Mobile Web Share API
shareBtn.addEventListener('click', async () => {
  if (navigator.share) {
    try {
      await navigator.share({
        title: 'Game Tracker',
        text: 'Check out my game history and stats:',
        url: window.location.href,
      });
    } catch (err) {
      console.log('Share canceled:', err);
    }
  } else {
    navigator.clipboard.writeText(window.location.href);
    alert('Link copied to clipboard!');
  }
});

// Initial Render
render();