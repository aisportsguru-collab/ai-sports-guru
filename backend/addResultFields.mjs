import fs from 'fs';

const filePath = './gamesData.json';
const raw = JSON.parse(fs.readFileSync(filePath, 'utf-8'));

let updated = 0;

// Loop through each sport
for (const sport in raw) {
  const games = raw[sport];
  if (Array.isArray(games)) {
    games.forEach(game => {
      if (!game.result) {
        game.result = {
          winner: null,
          spreadResult: null,
          totalResult: null
        };
        updated++;
      }
    });
  }
}

fs.writeFileSync(filePath, JSON.stringify(raw, null, 2));
console.log(`Result fields added to ${updated} games. Updated file saved to ${filePath}`);


