-- 와인 라벨 이미지 URL 컬럼 추가
ALTER TABLE wines ADD COLUMN IF NOT EXISTS label_image_url TEXT;
