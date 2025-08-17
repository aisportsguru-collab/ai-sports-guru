import type { NextApiRequest, NextApiResponse } from 'next';
import { promises as fs } from 'fs';
import path from 'path';

const GAMES_FILE  = path.join(process.cwd(), '.data', 'ingest', 'games.json');
const SCORES_FILE = path.join(process.cwd(), '.data', 'scores', 'scores.json');

type Pred = { league:string; homeTeam:string; awayTeam:string; kickoffISO?:string; market:'SPREAD'|'ML'|'TOTAL'; pick:'HOME'|'AWAY'|'OVER'|'UNDER'; line?:number; };

function key(l:string,h:string,a:string,iso?:string){const d=(iso||'').slice(0,10);return `${l}|${d}|${h.trim().toLowerCase()}|${a.trim().toLowerCase()}`;}
function decide(p:Pred, hs:number, as:number){
  if (p.market==='ML'){ if(hs===as) return 'push'; const w=hs>as?'HOME':'AWAY'; return w===p.pick?'win':'loss'; }
  if (p.market==='SPREAD' && p.line!=null){ const homeAdj=hs+(p.pick==='HOME'?p.line:0); const awayAdj=as+(p.pick==='AWAY'?-p.line:0);
    if (homeAdj===awayAdj) return 'push'; return (homeAdj>awayAdj?'HOME':'AWAY')===p.pick?'win':'loss'; }
  if (p.market==='TOTAL' && p.line!=null){ const s=hs+as; if (s===p.line) return 'push'; return ((s>p.line)?'OVER':'UNDER')===p.pick?'win':'loss'; }
  return 'unknown';
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const league = String(req.query.league||'').toLowerCase();

  let games:any[]=[]; try{ games = Object.values(JSON.parse(await fs.readFile(GAMES_FILE,'utf8')).items||{});}catch{}
  if (league) games = games.filter(g => (g.league||'').toLowerCase()===league);

  const preds: Pred[] = [];
  for (const g of games) {
    const sp=g.odds?.spread, ml=g.odds?.moneyline, tot=g.odds?.total;
    if (sp?.line!=null) preds.push({ league:g.league, homeTeam:g.homeTeam, awayTeam:g.awayTeam, kickoffISO:g.kickoffISO, market:'SPREAD', pick: sp.line<0?'HOME':'AWAY', line:sp.line });
    if (ml?.home!=null || ml?.away!=null) preds.push({ league:g.league, homeTeam:g.homeTeam, awayTeam:g.awayTeam, kickoffISO:g.kickoffISO, market:'ML', pick: (ml.home ?? -999) < (ml.away ?? -999) ? 'HOME':'AWAY' });
    if (tot?.line!=null) preds.push({ league:g.league, homeTeam:g.homeTeam, awayTeam:g.awayTeam, kickoffISO:g.kickoffISO, market:'TOTAL', pick: (tot.over ?? -110) <= (tot.under ?? -110) ? 'OVER':'UNDER', line:tot.line });
  }

  let scores:Record<string,{homeScore:number;awayScore:number}> = {};
  try{
    const s = JSON.parse(await fs.readFile(SCORES_FILE,'utf8')) as { items: Record<string, any> };
    for (const v of Object.values(s.items||{})) scores[key((v as any).league,(v as any).homeTeam,(v as any).awayTeam,(v as any).kickoffISO)] =
      { homeScore:(v as any).homeScore, awayScore:(v as any).awayScore };
  }catch{}

  let win=0,loss=0,push=0,unknown=0;
  for (const p of preds){
    const sc = scores[key(p.league,p.homeTeam,p.awayTeam,p.kickoffISO)];
    if (!sc){ unknown++; continue; }
    const r = decide(p, sc.homeScore, sc.awayScore);
    if(r==='win')win++; else if(r==='loss')loss++; else if(r==='push')push++; else unknown++;
  }
  return res.status(200).json({ win, loss, push, unknown, total: win+loss+push+unknown });
}
