-- Supabase Database에 Rate Limiting 테이블 생성
-- Supabase Dashboard → SQL Editor에서 실행

-- Rate Limits 테이블 생성
CREATE TABLE IF NOT EXISTS rate_limits (
  id BIGSERIAL PRIMARY KEY,
  key TEXT NOT NULL UNIQUE,
  count INTEGER NOT NULL DEFAULT 0,
  expires_at BIGINT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 인덱스 생성 (조회 성능 향상)
CREATE INDEX IF NOT EXISTS idx_rate_limits_key ON rate_limits(key);
CREATE INDEX IF NOT EXISTS idx_rate_limits_expires_at ON rate_limits(expires_at);

-- 만료된 레코드 자동 삭제를 위한 함수 (선택적)
CREATE OR REPLACE FUNCTION cleanup_expired_rate_limits()
RETURNS void AS $$
BEGIN
  DELETE FROM rate_limits WHERE expires_at < EXTRACT(EPOCH FROM NOW());
END;
$$ LANGUAGE plpgsql;

-- 카운터 증가 함수 (원자적 연산)
CREATE OR REPLACE FUNCTION increment_rate_limit(counter_key TEXT)
RETURNS void AS $$
BEGIN
  UPDATE rate_limits
  SET count = count + 1,
      updated_at = NOW()
  WHERE key = counter_key;
END;
$$ LANGUAGE plpgsql;

-- 만료된 레코드 정리 (선택적, cron job으로 주기적 실행)
-- SELECT cleanup_expired_rate_limits();

