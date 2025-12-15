# 생성된 이미지 메타데이터 사용 가이드

## 개요

`generated_keycap_images` 테이블에 저장된 메타데이터를 조회하고 활용하는 방법입니다.

## 저장되는 정보

- `image_url`: Supabase Storage의 이미지 URL
- `image_path`: Storage 내부 경로
- `color_codes`: 사용된 색상 코드 배열
- `color_groups`: 생성된 colorGroups (JSON)
- `created_at`: 생성 시간
- `created_by_anonymous_id`: 해시화된 디바이스 ID (선택적)

## API 사용법

### 1. 최근 생성된 이미지 목록 조회

```bash
GET /api/get-generated-images?limit=10
```

**응답:**
```json
{
  "success": true,
  "images": [
    {
      "id": "uuid",
      "image_url": "https://...",
      "image_path": "keycaps/...",
      "color_codes": ["CR", "N9"],
      "color_groups": [
        {"id": "alpha", "approx": "CR", "legend": "N9"},
        ...
      ],
      "created_at": "2025-12-04T..."
    }
  ],
  "count": 3
}
```

### 2. 특정 색상 코드로 검색

```bash
GET /api/get-generated-images?colorCodes=CR,N9&limit=5
```

동일한 색상 조합으로 생성된 이미지를 찾을 수 있습니다.

### 3. Supabase Dashboard에서 직접 확인

1. Supabase Dashboard 접속
2. Table Editor → `generated_keycap_images` 선택
3. 모든 생성 이력 확인

## 활용 예시

### 같은 색상 조합 재사용

```typescript
// 1. 색상 코드로 검색
const response = await fetch('/api/get-generated-images?colorCodes=CR,N9');
const { images } = await response.json();

// 2. 기존 이미지가 있으면 재사용
if (images.length > 0) {
  const existingImage = images[0];
  console.log('기존 이미지 재사용:', existingImage.image_url);
  console.log('colorGroups:', existingImage.color_groups);
}
```

### 생성 이력 확인

```typescript
// 최근 생성된 이미지 10개
const response = await fetch('/api/get-generated-images?limit=10');
const { images } = await response.json();

images.forEach(img => {
  console.log(`${img.created_at}: ${img.color_codes.join(', ')}`);
});
```

## 주의사항

- 메타데이터 저장 실패해도 이미지 생성은 계속 진행됩니다
- 테이블이 없으면 저장을 건너뛰고 경고만 출력합니다
- `created_by_anonymous_id`는 해시화되어 저장됩니다 (개인정보 보호)

## 다음 단계

- Flutter 앱에서 생성 이력 확인 기능 추가
- 같은 색상 조합 자동 재사용 기능
- 사용자별 생성 이력 조회 (선택적)

