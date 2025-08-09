import fs from 'fs';

const filePath = './gamesData.json';
const backupPath = './gamesData_backup.json';

// Load existing file
let rawData = fs.readFileSync(filePath, 'utf-8');
let data = JSON.parse(rawData);

// Make a backup before modifying
fs.writeFileSync(backupPath, JSON.stringify(data, null, 2));

// Create a unique key for each game
const seen = new Set();
const deduped = [];

for (const sport in data) {
  const uniqueGames = [];
  const games = data[sport];
  for (const game of games) {
    const key = `${sport}-${game.home_team}-${game.away_team}-${game.commence_time}`;
    if (!seen.has(key)) {
      seen.add(key);
      uniqueGames.push(game);
    }
  }

  // Sort games by commence_time
  uniqueGames.sort((a, b) => new Date(a.commence_time) - new Date(b.commence_time));

  deduped.push([sport, uniqueGames]);
}

// Rebuild data object
const sortedData = {};
deduped.forEach(([sport, games]) => {
  sortedData[sport] = games;
});

// Save cleaned and sorted file
fs.writeFileSync(filePath, JSON.stringify(sortedData, null, 2));

console.log(`Duplicates removed and games sorted by date. Clean file saved to ${filePath}`);
console.log(`Backup of original file saved to ${backupPath}`);


