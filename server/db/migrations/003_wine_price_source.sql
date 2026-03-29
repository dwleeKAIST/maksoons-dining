-- 와인 추정 시세 출처 컬럼 추가
ALTER TABLE wines ADD COLUMN IF NOT EXISTS price_source TEXT;
