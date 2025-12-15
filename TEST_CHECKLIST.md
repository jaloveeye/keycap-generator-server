# 서버 테스트 체크리스트

## 사전 확인

- [x] 환경 변수 설정 완료 (`.env.local`)
- [x] Supabase 설정 완료
- [ ] 의존성 설치 (`npm install`)
- [ ] 서버 실행 (`npm run dev`)

## 환경 변수 확인

다음 항목들이 `.env.local`에 설정되어 있는지 확인:

- [ ] `OPENAI_API_KEY` - OpenAI API 키
- [ ] `SUPABASE_URL` - Supabase 프로젝트 URL
- [ ] `SUPABASE_KEY` - Supabase service_role 키
- [ ] `SUPABASE_BUCKET` - Storage 버킷 이름 (기본: `keycap-images`)
- [ ] `GMK_KEYCAPS_JSON_PATH` - 키캡 데이터 경로 (기본: `./data/gmk_keycaps.json`)
- [ ] `RATE_LIMIT_DAILY` - 일일 제한 (기본: 3)
- [ ] `RATE_LIMIT_HOURLY` - 시간당 제한 (기본: 1)

## Supabase 확인

- [ ] Storage 버킷 생성됨 (`keycap-images`)
- [ ] 버킷이 Public으로 설정됨
- [ ] (선택) Rate Limiting 테이블 생성됨 (`SUPABASE_RATE_LIMIT_SETUP.sql` 실행)

## 서버 실행

```bash
cd keycap-generator-server
npm install  # 아직 안 했다면
npm run dev
```

서버가 `http://localhost:3000`에서 실행되어야 합니다.

## API 테스트

### 1. 기본 테스트

```bash
curl -X POST http://localhost:3000/api/generate-keycap-image \
  -H "Content-Type: application/json" \
  -d '{
    "colorCodes": ["CR", "N9"],
    "anonymousId": "test-device-001"
  }'
```

### 2. 예상 응답

**성공 시:**
```json
{
  "success": true,
  "imageUrl": "https://[project].supabase.co/storage/v1/object/public/keycap-images/keycaps/[uuid].png",
  "imageId": "keycaps/[uuid].png",
  "createdAt": "2025-12-04T...",
  "colorGroups": [...]
}
```

**에러 시:**
- 환경 변수 확인
- Supabase 연결 확인
- OpenAI API 키 확인

## 문제 해결

### 서버가 시작되지 않음
- Node.js 버전 확인 (v18 이상 권장)
- `npm install` 실행 확인
- 포트 3000이 사용 중인지 확인

### API 호출 실패
- 서버 로그 확인
- 환경 변수 확인
- Supabase Storage 버킷 확인

### Rate Limit 에러
- `anonymousId`가 올바르게 전달되는지 확인
- Rate limit 설정 확인

## 다음 단계

테스트가 성공하면:
1. ✅ 서버 정상 동작 확인
2. ⏳ Flutter 클라이언트 통합 테스트
3. ⏳ 배포 준비

