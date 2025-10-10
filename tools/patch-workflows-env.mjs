import fs from 'node:fs';

const files = [
  '.github/workflows/odds-sync.yml',
  '.github/workflows/odds-sync-v2.yml',
].filter(f => fs.existsSync(f));

for (const wf of files) {
  const orig = fs.readFileSync(wf, 'utf8');
  const lines = orig.split('\n');

  const iJobs = lines.findIndex(l => /^jobs:\s*$/.test(l));
  if (iJobs === -1) continue;

  let iJob = -1;
  for (let i = iJobs + 1; i < lines.length; i++) {
    const l = lines[i];
    if (/^  [A-Za-z0-9_-]+:\s*$/.test(l)) { iJob = i; break; }
    if (/^[A-Za-z0-9_-]+:\s*$/.test(l)) break;
  }
  if (iJob === -1) continue;

  let iRunsOn = -1;
  for (let i = iJob + 1; i < lines.length; i++) {
    const l = lines[i];
    if (/^  [A-Za-z0-9_-]+:\s*$/.test(l)) break;
    if (/^    runs-on:\s*/.test(l)) { iRunsOn = i; break; }
  }
  if (iRunsOn === -1) continue;

  let already = false;
  for (let i = iRunsOn + 1; i < lines.length; i++) {
    const l = lines[i];
    if (/^  [A-Za-z0-9_-]+:\s*$/.test(l)) break;
    if (/^\s{4}env:\s*$/.test(l)) {
      let hasUrl = false, hasKey = false;
      for (let j = i + 1; j < lines.length; j++) {
        const lj = lines[j];
        if (/^\s{4}[A-Za-z0-9_-]+:\s*$/.test(lj)) break;
        if (/^\s{6}SUPABASE_URL:\s*\$\{\{\s*secrets\.SUPABASE_URL\s*\}\}/.test(lj)) hasUrl = true;
        if (/^\s{6}SUPABASE_SERVICE_ROLE_KEY:\s*\$\{\{\s*secrets\.SUPABASE_SERVICE_ROLE_KEY\s*\}\}/.test(lj)) hasKey = true;
      }
      already = hasUrl && hasKey;
      break;
    }
  }
  if (already) { console.log(`ℹ️  ${wf} already has SUPABASE env.`); continue; }

  const inject = [
    '    env:',
    '      SUPABASE_URL: ${{ secrets.SUPABASE_URL }}',
    '      SUPABASE_SERVICE_ROLE_KEY: ${{ secrets.SUPABASE_SERVICE_ROLE_KEY }}',
    '      ODDS_API_KEY: ${{ secrets.ODDS_API_KEY }}'
  ];
  lines.splice(iRunsOn + 1, 0, ...inject);
  fs.writeFileSync(wf, lines.join('\n'));
  console.log(`✅ Patched: ${wf}`);
}
