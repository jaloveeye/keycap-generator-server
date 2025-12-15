# 생성된 이미지의 colorGroups 확인 방법

## 현재 확인 방법

### 1. API 응답에서 확인

이미지 생성 API를 호출하면 응답에 `colorGroups`가 포함됩니다:

```bash
curl -X POST http://localhost:3000/api/generate-keycap-image \
  -H "Content-Type: application/json" \
  -d '{
    "colorCodes": ["CR", "N9"],
    "anonymousId": "test-device-001"
  }'
```

**응답 예시:**
```json
{
  "success": true,
  "imageUrl": "https://...",
  "imageId": "keycaps/...",
  "createdAt": "2025-12-04T...",
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

### 2. Flutter 앱에서 확인

이미지 생성 후 `KeycapSetGeneratorDialog`에서:
- 생성된 이미지 표시
- `colorGroups` 정보를 레이아웃에 적용하여 시각화

### 3. Supabase Database에서 확인 (설정 후)

메타데이터 테이블을 설정하면 저장된 정보를 조회할 수 있습니다.

## Supabase Database 설정 (선택적)

### 1. 테이블 생성

Supabase Dashboard → SQL Editor에서 `SUPABASE_IMAGE_METADATA_SETUP.sql` 실행

### 2. 생성된 이미지 목록 조회

```bash
# 최근 10개 이미지
curl http://localhost:3000/api/get-generated-images

# 특정 색상 코드로 검색
curl "http://localhost:3000/api/get-generated-images?colorCodes=CR,N9"

# 개수 제한
curl "http://localhost:3000/api/get-generated-images?limit=5"
```

**응답 예시:**
```json
{
  "success": true,
  "images": [
    {
      "id": "uuid-here",
      "image_url": "https://...",
      "image_path": "keycaps/...",
      "color_codes": ["CR", "N9"],
      "color_groups": [
        {
          "id": "alpha",
          "approx": "CR",
          "legend": "N9"
        },
        ...
      ],
      "created_at": "2025-12-04T..."
    },
    ...
  ],
  "count": 3
}
```

### 3. Supabase Dashboard에서 직접 확인

1. Supabase Dashboard 접속
2. Table Editor → `generated_keycap_images` 테이블 선택
3. 생성된 이미지와 colorGroups 확인

## 현재 상태

- ✅ API 응답에 colorGroups 포함
- ✅ Flutter 앱에서 시각화
- ⏳ Supabase Database 저장 (선택적, 설정 필요)

## 권장 사항

메타데이터를 저장하려면:
1. `SUPABASE_IMAGE_METADATA_SETUP.sql` 실행
2. 서버가 자동으로 메타데이터 저장
3. 나중에 조회 가능

저장하지 않아도:
- API 응답에서 확인 가능
- Flutter 앱에서 확인 가능

