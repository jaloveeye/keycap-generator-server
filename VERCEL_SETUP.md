# Vercel 배포 설정 가이드

**작성 시간**: 2025-12-15  
**최종 수정**: 2025-12-15

## 1. Vercel 프로젝트 생성

1. [Vercel 대시보드](https://vercel.com/dashboard)에 로그인
2. "Add New..." → "Project" 클릭
3. "Import Git Repository" 선택
4. `jaloveeye/keycap-generator-server` 저장소 선택
5. "Import" 클릭

## 2. 프로젝트 설정

### Framework Preset
- **Framework Preset**: Next.js (자동 감지)

### Root Directory
- **Root Directory**: (비워두기 - 저장소 루트가 이미 `keycap-generator-server`이므로)

### Build Settings
- **Build Command**: `npm run build` (기본값)
- **Output Directory**: `.next` (기본값)
- **Install Command**: `npm install` (기본값)

## 3. 환경 변수 설정

Settings → Environment Variables에서 다음 변수들을 추가:

### 필수 환경 변수

```env
# Supabase
SUPABASE_URL=https://[project-id].supabase.co
SUPABASE_KEY=[service_role_key]
SUPABASE_BUCKET=keycap-images

# OpenAI (이미지 생성용)
OPENAI_API_KEY=sk-...

# API 보호 (선택적)
API_KEY=your-secret-api-key
```

### 선택적 환경 변수

```env
# Rate Limiting
RATE_LIMIT_DAILY=3
RATE_LIMIT_HOURLY=1
USE_FILE_STORAGE=false
USE_DATABASE_STORAGE=true

# Data Path
GMK_KEYCAPS_JSON_PATH=./data/gmk_keycaps.json
```

**⚠️ 중요**: 
- `SUPABASE_KEY`는 **service_role** 키를 사용해야 합니다 (anon 키가 아님)
- `API_KEY`를 설정하면 모든 API 요청에 `apiKey` 파라미터가 필요합니다

## 4. 배포

1. "Deploy" 버튼 클릭
2. 배포 완료 대기 (약 2-3분)
3. 배포 완료 후 제공되는 URL 확인 (예: `https://keycap-generator-server.vercel.app`)

## 5. 배포 확인

### API 엔드포인트 테스트

```bash
# 이미지 업로드 API 테스트
curl -X POST https://your-project.vercel.app/api/upload-keycap-image \
  -H 'Content-Type: application/json' \
  -d '{
    "keycapName": "GMK Test",
    "imageUrl": "https://img.zfrontier.com/post/FluHYpMEJUQWRsKNsJOADP-kVnuf.jpg",
    "layoutType": "cover"
  }'
```

### 성공 응답 예시

```json
{
  "success": true,
  "imageUrl": "https://[project].supabase.co/storage/v1/object/public/keycap-images/keycaps/GMK_Test/cover.png",
  "imagePath": "keycaps/GMK_Test/cover.png",
  "keycapName": "GMK Test",
  "layoutType": "cover"
}
```

## 6. 기존 Vercel 프로젝트 연결 변경 (선택적)

기존에 `keycap-generator-server` 프로젝트가 있다면:

1. Vercel 프로젝트 설정 페이지로 이동
2. Settings → Git
3. "Disconnect" 클릭
4. "Connect Git Repository" 클릭
5. `jaloveeye/keycap-generator-server` 선택
6. 환경 변수 다시 설정 (연결 변경 시 초기화될 수 있음)

## 문제 해결

### 빌드 실패
- TypeScript 오류 확인: 로컬에서 `npm run build` 실행
- 환경 변수 누락 확인
- 의존성 설치 확인: `npm install`

### API 405 오류
- 배포가 완료되었는지 확인
- Vercel 로그에서 API 라우트가 빌드되었는지 확인
- Root Directory 설정 확인

### 이미지 업로드 실패
- Supabase 환경 변수 확인
- Supabase 버킷이 Public으로 설정되어 있는지 확인
- MIME type 설정 확인 (`images/*` 또는 비워두기)

