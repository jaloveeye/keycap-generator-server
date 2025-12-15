# CapFinder Keycap Image Generator Server

키캡 이미지 생성 서버 (Next.js)

## 개요

이미지에서 추출한 색상 코드를 기반으로 OpenAI DALL-E API를 사용하여 키보드 이미지를 생성하고, Supabase Storage에 저장하는 서버입니다.

## 기술 스택

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **AI**: OpenAI DALL-E 3
- **Storage**: Supabase Storage
- **Rate Limiting**: Redis (선택적, 없으면 메모리 기반)

## 설치

```bash
npm install
```

## 환경 변수 설정

`.env.local` 파일을 생성하고 다음 변수들을 설정하세요:

```env
# OpenAI API
OPENAI_API_KEY=sk-...

# Supabase
SUPABASE_URL=https://[project-id].supabase.co
SUPABASE_KEY=[service_role_key]
SUPABASE_BUCKET=keycap-images

# Data
GMK_KEYCAPS_JSON_PATH=./data/gmk_keycaps.json

# Redis (Rate Limiting, 선택적)
REDIS_URL=redis://localhost:6379

# Rate Limiting
RATE_LIMIT_DAILY=3
RATE_LIMIT_HOURLY=1
```

## 실행

### 개발 모드

```bash
npm run dev
```

### 프로덕션 빌드

```bash
npm run build
npm start
```

## API 엔드포인트

### POST `/api/generate-keycap-image`

키캡 이미지 생성

**Request Body:**

```json
{
  "colorCodes": ["CR", "RO1", "N9", "CP", "GR9"],
  "anonymousId": "550e8400-e29b-41d4-a716-446655440000" // 선택적
}
```

**Response:**

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

**Error Response:**

```json
{
  "success": false,
  "error": "Error message",
  "code": "ERROR_CODE",
  "retryAfter": 86400 // Rate limit 초과 시
}
```

## Rate Limiting

- **일일 제한**: 3회 (기본값)
- **시간당 제한**: 1회 (기본값)
- **식별자**: `anonymousId` (클라이언트에서 전달) 또는 IP 주소

Redis가 없으면 메모리 기반으로 동작합니다 (서버 재시작 시 초기화).

## 프로젝트 구조

```
keycap-generator-server/
├── app/
│   └── api/
│       └── generate-keycap-image/
│           └── route.ts          # API 엔드포인트
├── lib/
│   └── services/
│       ├── color-group-generator.ts  # colorGroups 생성
│       ├── prompt-generator.ts       # DALL-E 프롬프트 생성
│       ├── dalle-service.ts          # DALL-E API 통합
│       ├── supabase-service.ts       # Supabase Storage 통합
│       └── rate-limiter.ts           # Rate limiting
├── types/
│   └── index.ts                      # TypeScript 타입 정의
└── package.json
```

## 배포

### Vercel (추천)

1. Vercel에 프로젝트 연결
2. 환경 변수 설정
3. 자동 배포

### Railway

1. Railway에 프로젝트 연결
2. 환경 변수 설정
3. 빌드 및 배포

## 비용

- **DALL-E 3**: $0.080 / 이미지 (1792x1024)
- **Supabase Storage**: 무료 티어 1GB
- **예상**: 약 $0.080 / 이미지 생성

## 참고

- `gmk_keycaps.json` 파일이 서버에서 접근 가능한 경로에 있어야 합니다.
- Supabase Storage 버킷은 Public으로 설정되어야 합니다.
- Rate limiting은 Redis 없이도 동작하지만, 서버 재시작 시 초기화됩니다.

