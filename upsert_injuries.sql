-- stage
drop table if exists _stg_injuries;
create table _stg_injuries (
  season int,
  week int,
  team text,
  player_id text,
  player_name text,
  position text,
  report_status text,
  practice_status text,
  designation text,
  body_part text,
  description text,
  date_updated timestamptz
);

\copy _stg_injuries from 'nfl_injuries.csv' with (format csv, header true, encoding 'UTF8');

with cleaned as (
  select
    season, coalesce(week, 0) as week, team,
    nullif(player_id,'') as player_id,
    nullif(player_name,'') as player_name,
    position, report_status, practice_status, designation, body_part, description,
    date_updated,
    coalesce(nullif(player_id,''), nullif(player_name,'')) as player_key
  from _stg_injuries
  where season is not null and team is not null
)
insert into public.nfl_injuries as t (
  season, week, team, player_id, player_name, position,
  report_status, practice_status, designation, body_part, description,
  date_updated, source, player_key
)
select
  season, week, team, player_id, player_name, position,
  report_status, practice_status, designation, body_part, description,
  coalesce(date_updated, now()) as date_updated,
  'nfl_data_py' as source,
  player_key
from cleaned
on conflict on constraint nfl_injuries_pkey do update
set player_name     = excluded.player_name,
    position        = excluded.position,
    report_status   = excluded.report_status,
    practice_status = excluded.practice_status,
    designation     = excluded.designation,
    body_part       = excluded.body_part,
    description     = excluded.description,
    date_updated    = greatest(t.date_updated, excluded.date_updated),
    source          = excluded.source;
