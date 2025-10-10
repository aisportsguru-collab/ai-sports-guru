import fs from 'fs';
import path from 'path';

const wfDir = path.resolve('.github/workflows');
if (!fs.existsSync(wfDir)) {
  console.error('❌ .github/workflows/ not found in this repo');
  process.exit(1);
}

// Find a workflow file matching odds.*sync (v2 optional)
const wfFiles = fs.readdirSync(wfDir).filter(f => /\.ya?ml$/i.test(f));
const candidates = wfFiles.filter(f => /odds.*sync/i.test(f));
if (candidates.length === 0) {
  console.error('❌ No workflow file matching /odds.*sync/i found. Files:', wfFiles.join(', '));
  process.exit(1);
}
const wfPath = path.join(wfDir, candidates[0]); // take the first match
let s = fs.readFileSync(wfPath, 'utf8');
const orig = s;

// Helper to ensure an ENV key/value under an existing "env:" section (4-space indent under job)
function ensureEnvKey(lines, startIdx, key, value) {
  // Look for "    env:" within this job block
  let iEnv = -1;
  for (let i = startIdx + 1; i < lines.length; i++) {
    const l = lines[i];
    if (/^ {2}[A-Za-z0-9_-]+:/.test(l) && !/^ {4}/.test(l)) break; // next job or out of this job
    if (/^ {4}env:\s*$/.test(l)) { iEnv = i; break; }
  }

  if (iEnv >= 0) {
    // env block exists — see if key present
    const kvRe = new RegExp(`^ {6}${key}:`);
    for (let i = iEnv + 1; i < lines.length; i++) {
      const l = lines[i];
      if (/^ {2}[A-Za-z0-9_-]+:/.test(l) && !/^ {4}/.test(l)) break; // left job
      if (/^ {4}[A-Za-z0-9_-]+:/.test(l)) break; // left env block
      if (kvRe.test(l)) return; // key already present
      if (!/^ {6}/.test(l) && l.trim() !== '') break; // something else; stop
    }
    lines.splice(iEnv + 1, 0, `      ${key}: ${value}`);
    return;
  }

  // No env block; try to insert after runs-on:
  let iRunsOn = -1;
  for (let i = startIdx + 1; i < lines.length; i++) {
    const l = lines[i];
    if (/^ {2}[A-Za-z0-9_-]+:/.test(l) && !/^ {4}/.test(l)) break; // next job
    if (/^ {4}runs-on:/.test(l)) { iRunsOn = i; break; }
  }
  const envChunk = [
    '    env:',
    `      ${key}: ${value}`
  ];
  if (iRunsOn >= 0) {
    lines.splice(iRunsOn + 1, 0, ...envChunk);
  } else {
    // Fallback: insert right after the job header line
    lines.splice(startIdx + 1, 0, ...envChunk);
  }
}

// Work on the "sync" job (2-space indent)
const lines = s.split('\n');
let iJobs = lines.findIndex(l => /^jobs:\s*$/.test(l));
if (iJobs === -1) {
  console.error('❌ Could not find top-level "jobs:" in workflow:', wfPath);
  process.exit(1);
}

let iSync = lines.findIndex(l => /^ {2}sync:\s*$/.test(l));
if (iSync === -1) {
  // If job name differs, pick the first job under jobs:
  for (let i = iJobs + 1; i < lines.length; i++) {
    const l = lines[i];
    if (/^ {2}[A-Za-z0-9_-]+:\s*$/.test(l)) { iSync = i; break; }
    if (/^[A-Za-z0-9_-]+:\s*$/.test(l)) break;
  }
  if (iSync === -1) {
    console.error('❌ Could not locate a job block under "jobs:" to patch.');
    process.exit(1);
  } else {
    console.warn('⚠️  "sync:" job not found; patching the first job block instead.');
  }
}

// Ensure both keys
ensureEnvKey(lines, iSync, 'SUPABASE_URL', '${{ secrets.SUPABASE_URL }}');
ensureEnvKey(lines, iSync, 'SUPABASE_SERVICE_ROLE_KEY', '${{ secrets.SUPABASE_SERVICE_ROLE_KEY }}');

s = lines.join('\n');
if (s !== orig) {
  fs.writeFileSync(wfPath, s);
  console.log(`✅ Patched workflow: ${path.relative(process.cwd(), wfPath)}`);
} else {
  console.log(`ℹ️  No changes needed in: ${path.relative(process.cwd(), wfPath)}`);
}
