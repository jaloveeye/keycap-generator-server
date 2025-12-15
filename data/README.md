# 서버 데이터 디렉토리

이 디렉토리는 서버에서 사용하는 데이터 파일을 저장합니다.

## 파일

- `gmk_keycaps.json`: GMK 키캡 데이터 (colorGroups 패턴 분석용)

## 데이터 동기화

Flutter 앱의 데이터와 동기화하려면:

```bash
# Flutter 앱에서 서버로 복사
cp ../flutter_app/assets/data/gmk_keycaps.json ./gmk_keycaps.json
```

또는 스크립트를 사용:

```bash
# 프로젝트 루트에서
./scripts/sync_keycaps_data.sh
```

## Git 관리

`gmk_keycaps.json`은 큰 파일이므로:
- Git LFS 사용 권장
- 또는 `.gitignore`에 추가하여 제외

