# 서버 테스트 가이드

## 1. 환경 변수 확인

`.env.local` 파일이 올바르게 설정되었는지 확인하세요:

```bash
cd keycap-generator-server
cat .env.local
```

필수 환경 변수:
- `OPENAI_API_KEY`
- `SUPABASE_URL`
- `SUPABASE_KEY`
- `SUPABASE_BUCKET`

## 2. 의존성 설치

```bash
npm install
```

## 3. 서버 실행

### 개발 모드

```bash
npm run dev
```

서버가 `http://localhost:3000`에서 실행됩니다.

## 4. API 테스트

### 4.1 curl로 테스트

```bash
curl -X POST http://localhost:3000/api/generate-keycap-image \
  -H "Content-Type: application/json" \
  -d '{
    "colorCodes": ["CR", "RO1", "N9"],
    "anonymousId": "550e8400-e29b-41d4-a716-446655440000"
  }'
```

### 4.2 예상 응답

**성공 응답:**
```json
{
  "success": true,
  "imageUrl": "https://[project].supabase.co/storage/v1/object/public/keycap-images/keycaps/[uuid].png",
  "imageId": "keycaps/[uuid].png",
  "createdAt": "2025-12-03T10:00:00.000Z",
  "colorGroups": [
    {
      "id": "alpha",
      "approx": "CR",
      "legend": "N9"
    },
    ...
  ]
}
```

**에러 응답:**
```json
{
  "success": false,
  "error": "Error message",
  "code": "ERROR_CODE"
}
```

## 5. 테스트 시나리오

### 5.1 정상 요청

```bash
# 1. 첫 번째 요청 (성공)
curl -X POST http://localhost:3000/api/generate-keycap-image \
  -H "Content-Type: application/json" \
  -d '{
    "colorCodes": ["CR", "N9"],
    "anonymousId": "test-device-001"
  }'
```

### 5.2 Rate Limit 테스트

```bash
# 1. 첫 번째 요청
curl -X POST http://localhost:3000/api/generate-keycap-image \
  -H "Content-Type: application/json" \
  -d '{
    "colorCodes": ["CR"],
    "anonymousId": "test-device-002"
  }'

# 2. 두 번째 요청 (같은 anonymousId)
curl -X POST http://localhost:3000/api/generate-keycap-image \
  -H "Content-Type: application/json" \
  -d '{
    "colorCodes": ["CR"],
    "anonymousId": "test-device-002"
  }'

# 3. 세 번째 요청 (같은 anonymousId, 일일 한도 초과 시 에러)
curl -X POST http://localhost:3000/api/generate-keycap-image \
  -H "Content-Type: application/json" \
  -d '{
    "colorCodes": ["CR"],
    "anonymousId": "test-device-002"
  }'
```

예상 응답 (Rate Limit 초과):
```json
{
  "success": false,
  "error": "일일 생성 한도(1회)를 초과했습니다. 내일 다시 시도해주세요.",
  "code": "RATE_LIMIT_EXCEEDED",
  "retryAfter": 86400
}
```

### 5.3 입력 검증 테스트

**anonymousId 없음:**
```bash
curl -X POST http://localhost:3000/api/generate-keycap-image \
  -H "Content-Type: application/json" \
  -d '{
    "colorCodes": ["CR"]
  }'
```

예상 응답:
```json
{
  "success": false,
  "error": "anonymousId is required for rate limiting",
  "code": "MISSING_ANONYMOUS_ID"
}
```

**colorCodes 없음:**
```bash
curl -X POST http://localhost:3000/api/generate-keycap-image \
  -H "Content-Type: application/json" \
  -d '{
    "anonymousId": "test-device-003"
  }'
```

예상 응답:
```json
{
  "success": false,
  "error": "colorCodes is required and must be a non-empty array",
  "code": "INVALID_INPUT"
}
```

## 6. Postman 테스트

### 6.1 Collection 설정

1. Postman 열기
2. New → Request
3. Method: `POST`
4. URL: `http://localhost:3000/api/generate-keycap-image`
5. Headers: `Content-Type: application/json`
6. Body (raw JSON):

```json
{
  "colorCodes": ["CR", "RO1", "N9"],
  "anonymousId": "550e8400-e29b-41d4-a716-446655440000"
}
```

## 7. 로그 확인

서버 콘솔에서 다음 로그를 확인할 수 있습니다:

```
Using file-based rate limiting (persists across restarts)
Loaded 0 rate limit counters from file
```

## 8. 문제 해결

### 8.1 환경 변수 오류

```
Error: OPENAI_API_KEY is not set
```

**해결**: `.env.local` 파일에 `OPENAI_API_KEY` 설정

### 8.2 Supabase 연결 오류

```
Error: Supabase credentials are not set
```

**해결**: `.env.local` 파일에 Supabase 정보 설정

### 8.3 키캡 데이터 로드 실패

```
Error: Failed to load keycaps data
```

**해결**: `GMK_KEYCAPS_JSON_PATH` 경로 확인

### 8.4 Rate Limiter 초기화 실패

```
Warning: File-based rate limiter initialization failed
```

**해결**: 서버 디렉토리에 쓰기 권한 확인

## 9. 다음 단계

서버 테스트가 완료되면:
1. ✅ API 정상 동작 확인
2. ✅ Rate Limiting 동작 확인
3. ⏳ Flutter 클라이언트 통합
4. ⏳ 배포

