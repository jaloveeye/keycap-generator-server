# API 키 설정 가이드

## 개요

서버와 클라이언트 간의 통신을 보호하기 위한 API 키 인증 시스템입니다.

## 동작 방식

### 서버 측

1. **환경 변수 설정** (선택적)
   ```env
   API_KEY=your-secret-api-key-here
   ```

2. **검증 로직**
   - `API_KEY`가 설정되어 있으면: 클라이언트에서 전송한 API 키 검증 (필수)
   - `API_KEY`가 설정되지 않으면: API 키 검증 없음 (개발 환경용)

### 클라이언트 측

1. **API 키 설정**
   ```dart
   // keycap_image_generation_service.dart
   static const String? apiKey = 'your-secret-api-key-here';
   ```

2. **요청 전송**
   - API 키가 설정되어 있으면 자동으로 요청에 포함
   - API 키가 `null`이면 전송하지 않음

## 보안 권장사항

### 프로덕션 환경

1. **강력한 API 키 생성**
   ```bash
   # 랜덤 문자열 생성 (예시)
   openssl rand -hex 32
   ```

2. **환경 변수로 관리**
   - `.env.local` 파일에 저장
   - Git에 커밋하지 않음 (`.gitignore`에 포함)

3. **클라이언트 보호**
   - Flutter 앱의 API 키는 난독화 고려
   - 또는 서버에서 클라이언트별 API 키 발급

### 개발 환경

- API 키를 설정하지 않으면 검증 없이 사용 가능
- 로컬 개발 시 편의성을 위해 선택적으로 사용

## 에러 응답

API 키가 잘못되었거나 없을 때:

```json
{
  "success": false,
  "error": "Invalid or missing API key",
  "code": "INVALID_API_KEY"
}
```

HTTP Status: `401 Unauthorized`

## 예시

### 서버 설정

```env
# .env.local
API_KEY=capfinder-secret-key-2025-xyz123
```

### 클라이언트 설정

```dart
// keycap_image_generation_service.dart
static const String? apiKey = 'capfinder-secret-key-2025-xyz123';
```

### 요청 예시

```json
{
  "colors": [
    {"type": "hex", "value": "#171718"},
    {"type": "hex", "value": "#393b3b"}
  ],
  "anonymousId": "550e8400-e29b-41d4-a716-446655440000",
  "apiKey": "capfinder-secret-key-2025-xyz123"
}
```

## 주의사항

- API 키는 서버와 클라이언트 모두 동일한 값이어야 합니다
- API 키를 변경하면 클라이언트도 함께 업데이트해야 합니다
- 프로덕션 환경에서는 반드시 API 키를 설정하는 것을 권장합니다

