-- Maksoon's Dining: 초기 스키마

-- 사용자
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  firebase_uid TEXT UNIQUE NOT NULL,
  email TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  is_admin BOOLEAN DEFAULT FALSE,
  active_household_id UUID,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 사용자 설정
CREATE TABLE IF NOT EXISTS user_settings (
  user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  bot_max_cost_krw INTEGER DEFAULT 10000,
  usd_to_krw INTEGER DEFAULT 1350,
  telegram_bot_token TEXT,
  telegram_chat_id TEXT,
  telegram_enabled BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 가정 (Household)
CREATE TABLE IF NOT EXISTS households (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  owner_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  max_members INTEGER DEFAULT 5,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_households_owner ON households(owner_id);

-- users.active_household_id FK (after households created)
ALTER TABLE users ADD CONSTRAINT fk_users_active_household
  FOREIGN KEY (active_household_id) REFERENCES households(id) ON DELETE SET NULL;

-- 가정 멤버
CREATE TABLE IF NOT EXISTS household_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id UUID NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('owner', 'member')),
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(household_id, user_id)
);
CREATE INDEX IF NOT EXISTS idx_household_members_user ON household_members(user_id);
CREATE INDEX IF NOT EXISTS idx_household_members_household ON household_members(household_id);

-- 가정 초대
CREATE TABLE IF NOT EXISTS household_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id UUID NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  invited_by UUID NOT NULL REFERENCES users(id),
  token TEXT UNIQUE NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined', 'expired')),
  expires_at TIMESTAMPTZ DEFAULT NOW() + INTERVAL '7 days',
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_household_invitations_email ON household_invitations(email);
CREATE INDEX IF NOT EXISTS idx_household_invitations_token ON household_invitations(token);

-- 와인 컬렉션
CREATE TABLE IF NOT EXISTS wines (
  id SERIAL PRIMARY KEY,
  household_id UUID NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  added_by UUID NOT NULL REFERENCES users(id),
  name TEXT NOT NULL,
  vintage INTEGER,
  region TEXT,
  country TEXT,
  grape_variety TEXT,
  wine_type TEXT DEFAULT 'red',
  purchase_price NUMERIC(10,2),
  estimated_price NUMERIC(10,2),
  quantity INTEGER DEFAULT 1,
  storage_location TEXT,
  memo TEXT,
  purchase_date DATE,
  drinking_window_start INTEGER,
  drinking_window_end INTEGER,
  drinking_recommendation TEXT DEFAULT 'unknown',
  recommendation_reason TEXT,
  is_consumed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_wines_household ON wines(household_id);
CREATE INDEX IF NOT EXISTS idx_wines_type ON wines(household_id, wine_type);
CREATE INDEX IF NOT EXISTS idx_wines_vintage ON wines(household_id, vintage);

-- 와인 다이어리
CREATE TABLE IF NOT EXISTS wine_diary (
  id SERIAL PRIMARY KEY,
  wine_id INTEGER NOT NULL REFERENCES wines(id) ON DELETE CASCADE,
  household_id UUID NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id),
  rating SMALLINT NOT NULL CHECK (rating >= 1 AND rating <= 5),
  tasting_notes TEXT,
  consumed_date DATE DEFAULT CURRENT_DATE,
  occasion TEXT,
  food_pairing TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_wine_diary_wine ON wine_diary(wine_id);
CREATE INDEX IF NOT EXISTS idx_wine_diary_household ON wine_diary(household_id);

-- AI 봇 사용량
CREATE TABLE IF NOT EXISTS bot_usage (
  id SERIAL PRIMARY KEY,
  household_id UUID NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id),
  month TEXT NOT NULL,
  input_tokens INTEGER NOT NULL,
  output_tokens INTEGER NOT NULL,
  cost_usd REAL NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_bot_usage_household_month ON bot_usage(household_id, month);

-- AI 봇 위키 (소믈리에 지식 저장)
CREATE TABLE IF NOT EXISTS bot_wiki (
  id SERIAL PRIMARY KEY,
  household_id UUID NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  category TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_bot_wiki_household ON bot_wiki(household_id);

-- 식재료 (TBU)
CREATE TABLE IF NOT EXISTS groceries (
  id SERIAL PRIMARY KEY,
  household_id UUID NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  added_by UUID NOT NULL REFERENCES users(id),
  name TEXT NOT NULL,
  category TEXT,
  quantity NUMERIC(10,2),
  unit TEXT,
  purchase_date DATE,
  expiry_date DATE,
  memo TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_groceries_household ON groceries(household_id);

-- 마이그레이션 추적
CREATE TABLE IF NOT EXISTS _migrations (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  applied_at TIMESTAMPTZ DEFAULT NOW()
);
