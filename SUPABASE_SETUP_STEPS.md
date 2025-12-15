# Supabase 설정 단계별 가이드

## 단계 1: Supabase 프로젝트 생성

1. [Supabase](https://supabase.com)에 접속하여 로그인
2. 대시보드에서 **"New Project"** 클릭
3. 프로젝트 정보 입력:
   - **Name**: `capfinder-keycap-images` (또는 원하는 이름)
   - **Database Password**: 강력한 비밀번호 설정 (⚠️ 저장 필수!)
   - **Region**: 가장 가까운 리전 선택
     - 한국: `Northeast Asia (Seoul)`
     - 미국: `West US (N. California)` 등
4. **"Create new project"** 클릭
5. 프로젝트 생성 완료 대기 (약 2분)

## 단계 2: 프로젝트 정보 확인

프로젝트가 생성되면 다음 정보를 확인하세요:

### 2.1 Project URL
1. 좌측 메뉴에서 **Settings** → **API** 클릭
2. **Project URL** 복사
   - 예: `https://xxxxxxxxxxxxx.supabase.co`
   - 이 값을 `.env.local`의 `SUPABASE_URL`에 입력

### 2.2 Service Role Key
1. 같은 페이지에서 **API Keys** 섹션 확인
2. **`service_role`** 키 복사 (⚠️ **secret** 키입니다!)
   - ⚠️ **주의**: 이 키는 서버에서만 사용하고 클라이언트에 노출하지 마세요!
   - 이 값을 `.env.local`의 `SUPABASE_KEY`에 입력

## 단계 3: Storage 버킷 생성

### 3.1 Storage 활성화
1. 좌측 메뉴에서 **Storage** 클릭
2. Storage가 활성화되어 있는지 확인 (기본적으로 활성화됨)

### 3.2 버킷 생성
1. **"New bucket"** 버튼 클릭
2. 버킷 정보 입력:
   - **Name**: `keycap-images`
   - **Public bucket**: ✅ **체크** (이미지 URL 공개 접근 필요)
   - **File size limit**: `10 MB` (또는 원하는 크기)
   - **Allowed MIME types**: `image/png, image/jpeg, image/jpg, image/webp`
3. **"Create bucket"** 클릭

### 3.3 버킷 확인
- 버킷이 생성되면 목록에 `keycap-images`가 표시됩니다
- Public 버킷이므로 모든 사용자가 읽기 가능합니다

## 단계 4: 환경 변수 업데이트

`.env.local` 파일을 열고 Supabase 정보를 입력하세요:

```env
# Supabase
SUPABASE_URL=https://[여기에-project-id].supabase.co
SUPABASE_KEY=[여기에-service_role-key]
SUPABASE_BUCKET=keycap-images
```

## 단계 5: 연결 테스트 (선택적)

서버 코드가 준비되면 다음 명령으로 테스트할 수 있습니다:

```bash
cd keycap-generator-server
npm run dev
```

## 다음 단계

✅ Supabase 설정이 완료되면:
- 환경 변수가 올바르게 설정되었는지 확인
- 서버 실행 테스트
- Flutter 클라이언트 통합

## 문제 해결

### 버킷이 보이지 않을 때
- Storage 메뉴에서 새로고침
- 프로젝트가 완전히 생성되었는지 확인

### 권한 오류가 발생할 때
- `service_role` 키가 올바른지 확인
- 버킷이 Public으로 설정되었는지 확인

### 업로드 실패 시
- 파일 크기가 제한을 초과하지 않는지 확인
- MIME 타입이 허용 목록에 있는지 확인

