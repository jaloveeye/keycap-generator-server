# 서버 배포 가이드

Next.js 서버를 Vercel 또는 Railway에 배포하는 방법입니다.

## 배포 전 확인 사항

### 1. 환경 변수 설정

다음 환경 변수들이 설정되어 있어야 합니다:

```bash
# OpenAI
OPENAI_API_KEY=your-openai-api-key

# Supabase
SUPABASE_URL=your-supabase-url
SUPABASE_KEY=your-supabase-key
SUPABASE_BUCKET=keycap-images

# Rate Limiting
RATE_LIMIT_DAILY=3
RATE_LIMIT_HOURLY=1
USE_FILE_STORAGE=true
USE_DATABASE_STORAGE=false

# API Key (선택적)
API_KEY=your-api-key

# Data Path (서버 내부 경로)
GMK_KEYCAPS_JSON_PATH=data/gmk_keycaps.json
```

### 2. 데이터 파일 확인

`data/gmk_keycaps.json` 파일이 서버 디렉토리에 있어야 합니다.

## Vercel 배포

### 방법 1: Vercel CLI 사용

```bash
# Vercel CLI 설치
npm i -g vercel

# 서버 디렉토리로 이동
cd keycap-generator-server

# 배포
vercel

# 프로덕션 배포
vercel --prod
```

### 방법 2: Vercel 웹 대시보드 사용

1. [Vercel](https://vercel.com)에 로그인
2. "New Project" 클릭
3. GitHub 저장소 연결
4. 프로젝트 설정:
   - **Root Directory**: `keycap-generator-server`
   - **Framework Preset**: Next.js
   - **Build Command**: `npm run build`
   - **Output Directory**: `.next`
5. 환경 변수 추가
6. "Deploy" 클릭

### Vercel 환경 변수 설정

Vercel 대시보드에서:

1. 프로젝트 선택
2. Settings → Environment Variables
3. 위의 환경 변수들을 모두 추가

## Railway 배포

### 방법 1: Railway CLI 사용

```bash
# Railway CLI 설치
npm i -g @railway/cli

# 로그인
railway login

# 서버 디렉토리로 이동
cd keycap-generator-server

# 프로젝트 초기화
railway init

# 배포
railway up
```

### 방법 2: Railway 웹 대시보드 사용

1. [Railway](https://railway.app)에 로그인
2. "New Project" 클릭
3. "Deploy from GitHub repo" 선택
4. 저장소 선택
5. 프로젝트 설정:
   - **Root Directory**: `keycap-generator-server`
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npm start`
6. 환경 변수 추가
7. 배포 시작

### Railway 환경 변수 설정

Railway 대시보드에서:

1. 프로젝트 선택
2. Variables 탭
3. 위의 환경 변수들을 모두 추가

## 배포 후 확인

### 1. API 엔드포인트 테스트

```bash
# 프롬프트 생성 테스트
curl -X POST https://your-server.vercel.app/api/generate-keycap-image \
  -H "Content-Type: application/json" \
  -d '{
    "colorCodes": ["MG1", "V2", "CV"],
    "anonymousId": "test-device",
    "apiKey": "your-api-key"
  }'
```

### 2. 생성된 이미지 조회

```bash
curl https://your-server.vercel.app/api/get-generated-images?limit=5
```

## 주의 사항

1. **데이터 파일**: `data/gmk_keycaps.json` 파일이 서버에 포함되어야 합니다 (Git LFS 사용 권장)
2. **환경 변수**: 모든 환경 변수가 올바르게 설정되어 있는지 확인
3. **Rate Limiting**: 파일 기반 rate limiting은 서버 재시작 시 초기화될 수 있으므로, 프로덕션에서는 데이터베이스 기반 rate limiting 사용 권장
4. **이미지 캐시**: `.image-cache` 디렉토리는 서버 재시작 시 초기화될 수 있습니다

## 문제 해결

### 빌드 실패

- TypeScript 오류 확인: `npm run build` 로컬에서 실행
- 환경 변수 누락 확인
- 의존성 설치 확인: `npm install`

### 런타임 오류

- 환경 변수 확인
- Supabase 연결 확인
- OpenAI API 키 확인
- 로그 확인 (Vercel: Deployments → Logs, Railway: Deployments → Logs)

## 비용 최적화

- 이미지 캐시 활용 (동일 색상 조합 재사용)
- Rate limiting으로 API 호출 제한
- DALL-E 이미지 크기: 1024x1024 (비용 절감)
