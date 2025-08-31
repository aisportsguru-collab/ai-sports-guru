drop table if exists _stg_injuries;
create temporary table _stg_injuries (
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

\copy _stg_injuries from 'nfl_injuries.csv' with (format csv, header true, encoding 'UTF8')

insert into public.nfl_injuries as t (
  season, week, team, player_id, player_name, position,
  report_status, practice_status, designation, body_part, description, date_updated, source
)
select
  season, week, team, player_id, player_name, position,
  report_status, practice_status, designation, body_part, description,
  coalesce(date_updated, now()), 'nfl_data_py'
from _stg_injuries s
where s.season is not null and s.team is not null and s.player_id is not null
on conflict (season, week, team, player_id) do update
set player_name     = excluded.player_name,
    position        = excluded.position,
    report_status   = excluded.report_status,
    practice_status = excluded.practice_status,
    designation     = excluded.designation,
    body_part       = excluded.body_part,
    description     = excluded.description,
    date_updated    = greatest(t.date_updated, excluded.date_updated),
    source          = excluded.source;
