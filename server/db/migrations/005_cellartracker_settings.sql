-- CellarTracker 연동 자격증명
ALTER TABLE user_settings
  ADD COLUMN IF NOT EXISTS cellartracker_user TEXT,
  ADD COLUMN IF NOT EXISTS cellartracker_password TEXT;
