# 환경 변수 설정 가이드

## 1. `.env.local` 파일 생성

`keycap-generator-server/` 디렉토리에 `.env.local` 파일을 생성하세요.

```bash
cd keycap-generator-server
touch .env.local
```

## 2. 환경 변수 입력

`.env.local` 파일에 다음 내용을 입력하세요:

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

# API Key (선택적, 설정하면 클라이언트에서 필수)
# 설정하지 않으면 API 키 검증 없이 사용 가능 (개발 환경)
API_KEY=your-secret-api-key-here

# Rate Limiting Storage 옵션
USE_FILE_STORAGE=true          # 파일 기반 저장 (기본값: true)
USE_DATABASE_STORAGE=false     # 데이터베이스 기반 저장 (기본값: false)
```

## 3. 각 환경 변수 설정 방법

### 3.1 OpenAI API Key

1. [OpenAI Platform](https://platform.openai.com/api-keys)에 접속
2. "Create new secret key" 클릭
3. 생성된 키를 `OPENAI_API_KEY`에 입력

### 3.2 Supabase 설정

**먼저 Supabase 프로젝트를 생성해야 합니다.** (다음 단계에서 진행)

1. Supabase 프로젝트 생성 후:
   - **SUPABASE_URL**: 프로젝트 대시보드 → Settings → API → Project URL
   - **SUPABASE_KEY**: Settings → API → `service_role` key (⚠️ 서버에서만 사용)
   - **SUPABASE_BUCKET**: Storage 버킷 이름 (기본값: `keycap-images`)

### 3.3 GMK Keycaps JSON 경로

기본값은 `./data/gmk_keycaps.json`입니다 (서버 디렉토리 내부).
서버 디렉토리에 `data/gmk_keycaps.json` 파일이 있어야 합니다.

**참고**: `gmk_keycaps.json` 파일은 `keycap-generator-server/data/` 디렉토리에 복사되어 있습니다.
Flutter 앱의 데이터와 동기화하려면 수동으로 업데이트하거나 스크립트를 사용하세요.

### 3.4 Redis (선택적)

**Redis는 선택사항입니다!** Redis가 없으면 메모리 기반으로 자동 동작합니다.

#### Redis 없이 사용 (간단)

- `.env.local`에서 `REDIS_URL`을 비워두거나 설정하지 않으면 자동으로 메모리 기반 사용
- 서버 재시작 시 카운터가 초기화되지만, 개발/테스트에는 충분합니다

#### Redis 사용 (프로덕션 권장)

- **로컬 Redis**: `redis://localhost:6379` (로컬에 Redis 설치 필요)
- **클라우드 Redis**: Upstash, Railway 등에서 제공하는 URL 사용
  - 예: `redis://default:password@upstash-redis-url:6379`

**자세한 내용은 `REDIS_EXPLANATION.md` 참고**

### 3.5 Rate Limiting

- **RATE_LIMIT_DAILY**: 일일 생성 한도 (기본값: 3)
- **RATE_LIMIT_HOURLY**: 시간당 생성 한도 (기본값: 1)

### 3.6 Rate Limiting Storage 옵션

Rate Limiting 데이터를 어디에 저장할지 선택할 수 있습니다:

#### 옵션 1: 파일 기반 (기본값, 추천)

```env
USE_FILE_STORAGE=true
USE_DATABASE_STORAGE=false
```

- ✅ 설정 간단
- ✅ 서버 재시작 후 유지
- ⚠️ 여러 서버 인스턴스 불가

#### 옵션 2: 데이터베이스 기반 (Supabase)

```env
USE_FILE_STORAGE=false
USE_DATABASE_STORAGE=true
```

- ✅ 여러 서버 인스턴스 지원
- ✅ 동시성 처리 우수
- ⚠️ Supabase 테이블 생성 필요 (`SUPABASE_RATE_LIMIT_SETUP.sql` 실행)

#### 옵션 3: Redis (가장 빠름)

```env
REDIS_URL=redis://[your-redis-url]
USE_FILE_STORAGE=false
USE_DATABASE_STORAGE=false
```

- ✅ 가장 빠름
- ✅ 여러 서버 인스턴스 지원
- ⚠️ Redis 서버 필요

**자세한 비교는 `RATE_LIMITER_COMPARISON.md` 참고**

## 4. 확인

환경 변수가 제대로 설정되었는지 확인:

```bash
# Next.js는 .env.local을 자동으로 로드합니다
npm run dev
```

## 5. 보안 주의사항

⚠️ **중요**: `.env.local` 파일은 Git에 커밋하지 마세요!

- `.gitignore`에 이미 포함되어 있습니다
- 환경 변수는 서버에서만 사용하세요
- `service_role` 키는 클라이언트에 노출하지 마세요
