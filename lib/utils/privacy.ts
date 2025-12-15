import { createHash } from 'crypto';

/**
 * 개인정보 보호 유틸리티
 * 디바이스 ID와 IP 주소를 해시화하여 저장
 */

// 환경 변수에서 소금(salt) 가져오기 (선택적, 없으면 기본값 사용)
const SALT = process.env.RATE_LIMIT_SALT || 'capfinder-rate-limit-salt-2025';

/**
 * 식별자를 해시화하여 개인정보 보호
 * 
 * @param identifier 원본 식별자 (디바이스 ID 또는 IP 주소)
 * @returns SHA-256 해시값 (개인정보 보호)
 */
export function hashIdentifier(identifier: string): string {
  // 소금을 추가하여 해시화 (사전 공격 방지)
  const salted = `${SALT}:${identifier}`;
  const hash = createHash('sha256').update(salted).digest('hex');
  
  // 해시값의 앞 32자만 사용 (충분히 고유하면서도 짧게)
  return hash.substring(0, 32);
}

/**
 * Rate limiting용 식별자 생성
 * 
 * @param anonymousId 클라이언트에서 전달한 익명 ID (필수)
 * @returns 해시화된 식별자
 */
export function createRateLimitIdentifier(anonymousId: string): string {
  if (!anonymousId) {
    throw new Error('anonymousId is required for rate limiting');
  }
  
  // 해시화하여 반환 (원본 복구 불가능)
  return hashIdentifier(anonymousId);
}

/**
 * 개인정보 보호 정책 설명
 */
export const PRIVACY_POLICY = {
  description: `
Rate Limiting을 위한 식별자는 개인정보 보호를 위해 해시화되어 저장됩니다.

1. 디바이스 ID (anonymousId)
   - 클라이언트에서 생성한 익명 UUID (필수)
   - SHA-256 해시화하여 저장
   - 원본 복구 불가능
   - IP 주소는 저장하지 않음

2. 저장 기간
   - Rate limit 카운터는 만료 시간(24시간) 후 자동 삭제
   - 오래된 데이터는 주기적으로 정리

3. 데이터 사용 목적
   - Rate limiting (요청 횟수 제한)만을 위한 용도
   - 다른 목적으로 사용되지 않음
   - 통계나 분석에 사용되지 않음
   - IP 주소는 수집하지 않음
  `,
};

