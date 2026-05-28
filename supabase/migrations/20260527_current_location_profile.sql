-- ============================================================
-- Current-location profile columns
-- Adds nullable location fields so "now" features (Muhurta,
-- Panchang, transit ascendant) can use the user's current city
-- instead of defaulting to the birth place.
-- Additive only — no destructive changes, no RLS changes.
-- ============================================================

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS current_place_name text,
  ADD COLUMN IF NOT EXISTS current_lat double precision,
  ADD COLUMN IF NOT EXISTS current_lon double precision,
  ADD COLUMN IF NOT EXISTS current_timezone text;
