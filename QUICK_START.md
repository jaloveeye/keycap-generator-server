# 빠른 시작 가이드

## 1. 환경 변수 설정

`.env.local` 파일을 생성하고 필수 정보를 입력하세요:

```bash
cd keycap-generator-server
cp .env.example .env.local  # .env.example이 있다면
# 또는 직접 생성
```

`.env.local` 내용:
```env
OPENAI_API_KEY=sk-...
SUPABASE_URL=https://[project-id].supabase.co
SUPABASE_KEY=[service_role_key]
SUPABASE_BUCKET=keycap-images
GMK_KEYCAPS_JSON_PATH=./data/gmk_keycaps.json
RATE_LIMIT_DAILY=1
RATE_LIMIT_HOURLY=1
# API_KEY=your-secret-api-key-here  # 선택적, 설정하면 클라이언트에서 필수
```

## 2. 의존성 설치

```bash
npm install
```

## 3. 서버 실행

```bash
npm run dev
```

서버가 `http://localhost:3000`에서 실행됩니다.

## 4. 테스트

### 간단한 테스트

```bash
curl -X POST http://localhost:3000/api/generate-keycap-image \
  -H "Content-Type: application/json" \
  -d '{
    "colorCodes": ["CR", "N9"],
    "anonymousId": "test-device-001"
  }'
```

### 성공 응답 예시

```json
{
  "success": true,
  "imageUrl": "https://...",
  "imageId": "keycaps/...",
  "createdAt": "2025-12-03T...",
  "colorGroups": [...]
}
```

## 5. 다음 단계

- 자세한 테스트: `TESTING_GUIDE.md` 참고
- 환경 변수 설정: `ENV_SETUP.md` 참고
- Supabase 설정: `SUPABASE_SETUP_STEPS.md` 참고

