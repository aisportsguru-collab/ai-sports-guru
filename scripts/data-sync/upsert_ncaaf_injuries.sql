begin;

-- staging
drop table if exists public._stg_ncaaf_injuries;
create table public._stg_ncaaf_injuries (like public.ncaaf_injuries);

-- trim
update public._stg_ncaaf_injuries
   set team = trim(team), player_name = trim(player_name);

-- keep only FBS teams present in live teams table for that season
delete from public._stg_ncaaf_injuries s
 where not exists (
   select 1 from public.ncaaf_teams t
   where t.season = s.season
     and t.team   = s.team
 );

-- upsert
insert into public.ncaaf_injuries as i (
  season, week, team, player_id, player_name, position,
  report_status, practice_status, designation,
  body_part, description, source, date_updated
)
select
  season, week, team, player_id, player_name, position,
  report_status, practice_status, designation,
  body_part, description, source, coalesce(date_updated, now())
from public._stg_ncaaf_injuries
on conflict (season, week, team, player_key) do update set
  report_status   = excluded.report_status,
  practice_status = excluded.practice_status,
  designation     = excluded.designation,
  body_part       = excluded.body_part,
  description     = excluded.description,
  source          = excluded.source,
  date_updated    = greatest(i.date_updated, excluded.date_updated);

commit;

-- verify
select season, week, count(*) rows
from public.ncaaf_injuries
group by season, week
order by season, week;
