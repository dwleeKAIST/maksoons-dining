-- 게스트 와인 리스트 공유용 토큰 (7일 유효)
ALTER TABLE households ADD COLUMN IF NOT EXISTS guest_share_token UUID UNIQUE;
ALTER TABLE households ADD COLUMN IF NOT EXISTS guest_share_token_expires_at TIMESTAMPTZ;
CREATE INDEX IF NOT EXISTS idx_households_guest_token ON households(guest_share_token) WHERE guest_share_token IS NOT NULL;
