-- =============================================================
-- AMSC Performance — Athlete Results Table
-- =============================================================
-- Run this in the Supabase SQL Editor (Dashboard → SQL Editor → New Query)
--
-- WHAT THIS DOES:
-- 1. Creates an 'athlete_results' table to store processed performance data
-- 2. Enables RLS with zero public policies (service role only)
-- 3. Creates indexes for fast lookups by email, access code, and event date
--
-- SECURITY MODEL:
-- - Same as the clients table: RLS ON, no public policies
-- - Only the service_role key (used in API routes) can read/write
-- =============================================================

-- 1. Create the athlete_results table
CREATE TABLE IF NOT EXISTS athlete_results (
  id                  UUID DEFAULT gen_random_uuid() PRIMARY KEY,

  -- Identity
  athlete_name        TEXT NOT NULL,
  athlete_email       TEXT,
  access_code         TEXT UNIQUE,
  gender              TEXT NOT NULL CHECK (gender IN ('male', 'female')),
  sport               TEXT,
  event_date          DATE,

  -- Raw inputs
  split_0_20          NUMERIC,
  split_0_40          NUMERIC,
  split_0_60          NUMERIC,
  split_0_80          NUMERIC,
  split_0_100         NUMERIC,
  fly10               NUMERIC,
  cmj_cm              NUMERIC,
  broad_cm            NUMERIC,

  -- Derived segments
  seg_20_40           NUMERIC,
  seg_40_60           NUMERIC,
  seg_60_80           NUMERIC,
  seg_80_100          NUMERIC,
  peak_velocity_segment NUMERIC,
  peak_velocity_zone  TEXT,

  -- Classifications
  acceleration_category       TEXT,
  max_velocity_category       TEXT,
  hundred_category            TEXT,
  speed_maintenance_category  TEXT,
  cmj_category                TEXT,
  broad_jump_category         TEXT,
  power_category              TEXT,
  power_level                 TEXT,
  primary_imbalance_flag      TEXT,
  missing_fields              TEXT,

  -- RSI (future — all nullable)
  rsi_double_avg              NUMERIC,
  rsi_double_best             NUMERIC,
  rsi_double_gct_avg          NUMERIC,
  rsi_single_left_avg         NUMERIC,
  rsi_single_left_best        NUMERIC,
  rsi_single_left_gct_avg     NUMERIC,
  rsi_single_right_avg        NUMERIC,
  rsi_single_right_best       NUMERIC,
  rsi_single_right_gct_avg    NUMERIC,
  rsi_double_category         TEXT,
  rsi_single_left_cat         TEXT,
  rsi_single_right_cat        TEXT,
  rsi_asymmetry_pct           NUMERIC,
  rsi_dominant_side           TEXT,
  rsi_asymmetry_flagged       BOOLEAN,
  power_profile_type          TEXT,

  -- Timestamps
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  updated_at          TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Enable Row Level Security (blocks ALL public/anon access)
ALTER TABLE athlete_results ENABLE ROW LEVEL SECURITY;

-- 3. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_athlete_results_email ON athlete_results (athlete_email);
CREATE INDEX IF NOT EXISTS idx_athlete_results_access_code ON athlete_results (access_code);
CREATE INDEX IF NOT EXISTS idx_athlete_results_event_date ON athlete_results (event_date DESC);
CREATE INDEX IF NOT EXISTS idx_athlete_results_name ON athlete_results (athlete_name);

-- 4. Auto-update the updated_at timestamp
CREATE TRIGGER set_athlete_results_updated_at
  BEFORE UPDATE ON athlete_results
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- =============================================================
-- DONE! Run this after supabase-setup.sql (which creates the
-- update_updated_at() function used by the trigger above).
-- =============================================================
