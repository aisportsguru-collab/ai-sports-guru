-- ===== MAIN TABLES (strict) =====
CREATE TABLE IF NOT EXISTS public.mlb_players (
  season int NOT NULL,
  player_id int NOT NULL,
  player_name text,
  last_known_team_id int,
  last_known_team_abbr text,
  primary_pos text,
  age int,
  bats text,
  throws text,

  pa int, ab int, r int, h int, "double" int, "triple" int, hr int, rbi int, bb int, ibb int, so int, hbp int, sb int, cs int,
  avg numeric, obp numeric, slg numeric, ops numeric, iso numeric, babip numeric, woba numeric, wrc_plus numeric,

  ip numeric, bf int, h_allowed int, er int, bb_allowed int, so_pitch int, hr_allowed int,
  era numeric, fip numeric, xfip numeric, whip numeric, k_pct numeric, bb_pct numeric, k_bb_pct numeric, gb_pct numeric, fb_pct numeric, hr_fb_pct numeric,

  innings_field numeric, chances int, putouts int, assists int, errors int, drs numeric, uzr numeric,
  source text,
  PRIMARY KEY (season, player_id)
);

CREATE TABLE IF NOT EXISTS public.mlb_teams (
  season int NOT NULL,
  team_id int NOT NULL,
  team_abbr text,
  team_name text,
  league text,
  division text,
  games int,
  wins int,
  losses int,
  runs_scored int,
  runs_allowed int,
  run_diff int,
  team_avg numeric,
  team_obp numeric,
  team_slg numeric,
  team_ops numeric,
  team_era numeric,
  team_fip numeric,
  team_whip numeric,
  team_woba numeric,
  team_wrc_plus numeric,
  source text,
  PRIMARY KEY (season, team_id)
);

-- NEW canonical schema for injuries uses player_key in PK
CREATE TABLE IF NOT EXISTS public.mlb_injuries (
  season int NOT NULL,
  date_report date NOT NULL,
  team_id int NOT NULL,
  team_abbr text,
  player_id int,
  player_name text,
  pos text,
  status text,
  designation text,
  il_days int,
  retro_date date,
  expected_return text,
  description text,
  source text,
  player_key text NOT NULL,
  PRIMARY KEY (season, date_report, team_id, player_key)
);

-- ---- MIGRATION: if table existed with old PK, convert to player_key ----
DO $$
BEGIN
  -- add column if missing
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
     WHERE table_schema='public' AND table_name='mlb_injuries' AND column_name='player_key'
  ) THEN
    ALTER TABLE public.mlb_injuries ADD COLUMN player_key text;
  END IF;

  -- if current PK does not include player_key, swap it
  IF NOT EXISTS (
    SELECT 1
      FROM pg_index i
      JOIN pg_attribute a ON a.attrelid=i.indrelid AND a.attnum = ANY(i.indkey)
     WHERE i.indrelid='public.mlb_injuries'::regclass
       AND i.indisprimary
       AND a.attname='player_key'
  ) THEN
    -- Drop existing primary key (name-agnostic)
    PERFORM 1 FROM pg_constraint WHERE conrelid='public.mlb_injuries'::regclass AND contype='p';
    IF FOUND THEN
      EXECUTE (
        SELECT 'ALTER TABLE public.mlb_injuries DROP CONSTRAINT '||quote_ident(conname)
          FROM pg_constraint
         WHERE conrelid='public.mlb_injuries'::regclass AND contype='p'
         LIMIT 1
      );
    END IF;

    -- Populate and enforce NOT NULL
    UPDATE public.mlb_injuries
       SET player_key = COALESCE(player_id::text, NULLIF(player_name,''));
    ALTER TABLE public.mlb_injuries ALTER COLUMN player_key SET NOT NULL;

    -- Add new PK
    ALTER TABLE public.mlb_injuries ADD PRIMARY KEY (season, date_report, team_id, player_key);
  END IF;
END$$;

-- ===== STAGING TABLES (nullable) =====
DROP TABLE IF EXISTS _stg_mlb_players;
CREATE TEMP TABLE _stg_mlb_players (
  season int,
  player_id int,
  player_name text,
  last_known_team_id int,
  last_known_team_abbr text,
  primary_pos text,
  age int,
  bats text,
  throws text,

  pa int, ab int, r int, h int, "double" int, "triple" int, hr int, rbi int, bb int, ibb int, so int, hbp int, sb int, cs int,
  avg numeric, obp numeric, slg numeric, ops numeric, iso numeric, babip numeric, woba numeric, wrc_plus numeric,

  ip numeric, bf int, h_allowed int, er int, bb_allowed int, so_pitch int, hr_allowed int,
  era numeric, fip numeric, xfip numeric, whip numeric, k_pct numeric, bb_pct numeric, k_bb_pct numeric, gb_pct numeric, fb_pct numeric, hr_fb_pct numeric,

  innings_field numeric, chances int, putouts int, assists int, errors int, drs numeric, uzr numeric,
  source text
);

DROP TABLE IF EXISTS _stg_mlb_teams;
CREATE TEMP TABLE _stg_mlb_teams (
  season int,
  team_id int,
  team_abbr text,
  team_name text,
  league text,
  division text,
  games int,
  wins int,
  losses int,
  runs_scored int,
  runs_allowed int,
  run_diff int,
  team_avg numeric,
  team_obp numeric,
  team_slg numeric,
  team_ops numeric,
  team_era numeric,
  team_fip numeric,
  team_whip numeric,
  team_woba numeric,
  team_wrc_plus numeric,
  source text
);

DROP TABLE IF EXISTS _stg_mlb_injuries;
CREATE TEMP TABLE _stg_mlb_injuries (
  season int,
  date_report date,
  team_id int,
  team_abbr text,
  player_id int,
  player_name text,
  pos text,
  status text,
  designation text,
  il_days int,
  retro_date date,
  expected_return text,
  description text,
  source text
);
