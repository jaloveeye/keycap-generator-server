-- 생성된 이미지 메타데이터 저장 테이블
-- Supabase Dashboard → SQL Editor에서 실행

-- Generated Images 테이블 생성
CREATE TABLE IF NOT EXISTS generated_keycap_images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  image_url TEXT NOT NULL UNIQUE,
  image_path TEXT NOT NULL,
  color_codes TEXT[] NOT NULL,
  color_groups JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by_anonymous_id TEXT, -- 해시화된 디바이스 ID (선택적)
  
  -- 인덱스
  CONSTRAINT unique_image_url UNIQUE (image_url)
);

-- 인덱스 생성 (조회 성능 향상)
CREATE INDEX IF NOT EXISTS idx_generated_images_color_codes ON generated_keycap_images USING GIN (color_codes);
CREATE INDEX IF NOT EXISTS idx_generated_images_created_at ON generated_keycap_images(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_generated_images_anonymous_id ON generated_keycap_images(created_by_anonymous_id);

-- 색상 코드로 이미지 검색 함수
CREATE OR REPLACE FUNCTION search_images_by_colors(search_colors TEXT[])
RETURNS TABLE (
  id UUID,
  image_url TEXT,
  image_path TEXT,
  color_codes TEXT[],
  color_groups JSONB,
  created_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    g.id,
    g.image_url,
    g.image_path,
    g.color_codes,
    g.color_groups,
    g.created_at
  FROM generated_keycap_images g
  WHERE g.color_codes && search_colors  -- 배열 교집합
  ORDER BY g.created_at DESC;
END;
$$ LANGUAGE plpgsql;

-- 최근 생성된 이미지 조회 함수
CREATE OR REPLACE FUNCTION get_recent_images(limit_count INTEGER DEFAULT 10)
RETURNS TABLE (
  id UUID,
  image_url TEXT,
  image_path TEXT,
  color_codes TEXT[],
  color_groups JSONB,
  created_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    g.id,
    g.image_url,
    g.image_path,
    g.color_codes,
    g.color_groups,
    g.created_at
  FROM generated_keycap_images g
  ORDER BY g.created_at DESC
  LIMIT limit_count;
END;
$$ LANGUAGE plpgsql;

