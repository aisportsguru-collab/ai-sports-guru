import { getLeagueLabel } from '../constants/leagues';

/** Convert a league id (e.g., "ncaa_football") to a user-facing label ("NCAA Football"). */
export const labelForLeague = (id: string) => getLeagueLabel(id);
