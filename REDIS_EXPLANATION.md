# Redis 사용 설명

## 1. Redis를 왜 사용하나요?

### Redis의 역할
Redis는 **Rate Limiting 데이터를 저장**하는 용도로 사용됩니다.

### Redis를 사용하는 이유

#### ✅ Redis를 사용할 때 (권장)
- **서버 재시작해도 데이터 유지**: 서버가 재시작되어도 사용자의 요청 횟수가 초기화되지 않음
- **여러 서버 인스턴스 간 공유**: 서버가 여러 개 실행될 때 (로드 밸런싱) 모든 서버가 같은 카운터를 공유
- **영구 저장**: 메모리 기반이지만 디스크에 저장 가능 (설정 시)

#### ⚠️ Redis 없이 사용할 때 (메모리 기반)
- **서버 재시작 시 초기화**: 서버를 재시작하면 모든 카운터가 0으로 리셋됨
- **단일 서버만 가능**: 서버가 여러 개 실행되면 각각 독립적인 카운터를 가짐
- **메모리에만 저장**: 서버가 꺼지면 모든 데이터 손실

### 현재 구현
코드는 **Redis가 없어도 동작**하도록 설계되었습니다:
- Redis가 있으면 → Redis 사용
- Redis가 없으면 → 메모리 기반으로 자동 폴백

## 2. 하루에 한 번만 허용하려면?

네, **환경 변수만 설정하면 됩니다!**

### 설정 방법

`.env.local` 파일에서:

```env
# 하루에 1번만 허용
RATE_LIMIT_DAILY=1
RATE_LIMIT_HOURLY=1
```

또는 시간당 제한을 없애려면:

```env
# 하루에 1번만 허용 (시간당 제한 없음)
RATE_LIMIT_DAILY=1
RATE_LIMIT_HOURLY=999  # 매우 큰 값으로 설정
```

### 현재 기본값
- `RATE_LIMIT_DAILY=3` (하루 3회)
- `RATE_LIMIT_HOURLY=1` (1시간에 1회)

## 3. Redis 서버는 어디서 실행되나요?

### Redis는 별도의 서버입니다

Redis는 **별도로 설치하고 실행**해야 하는 인메모리 데이터베이스입니다.

### 옵션 1: 로컬에서 실행 (개발용)

#### macOS
```bash
# Homebrew로 설치
brew install redis

# 실행
brew services start redis
# 또는
redis-server
```

#### Linux
```bash
# 설치
sudo apt-get install redis-server  # Ubuntu/Debian
# 또는
sudo yum install redis  # CentOS/RHEL

# 실행
sudo systemctl start redis
```

#### Windows
- [Redis for Windows](https://github.com/microsoftarchive/redis/releases) 다운로드
- 또는 WSL2 사용

### 옵션 2: 클라우드 Redis 사용 (프로덕션 권장)

#### Upstash (무료 티어 제공)
1. [Upstash](https://upstash.com) 가입
2. Redis 데이터베이스 생성
3. 연결 URL 복사
4. `.env.local`에 설정:
   ```env
   REDIS_URL=redis://[upstash-url]
   ```

#### Railway
1. Railway 프로젝트 생성
2. Redis 추가
3. 연결 URL 복사
4. `.env.local`에 설정

#### AWS ElastiCache, Google Cloud Memorystore 등
- 각 클라우드 제공자의 Redis 서비스 사용

### 옵션 3: Redis 없이 사용 (간단한 테스트용)

**Redis 없이도 동작합니다!**

`.env.local`에서:
```env
# Redis URL을 비워두거나 잘못된 URL 입력
REDIS_URL=redis://localhost:6379
```

또는 코드에서 자동으로 감지:
- Redis 연결 실패 시 → 메모리 기반으로 자동 전환

## 4. 추천 설정

### 개발 환경 (로컬)
```env
# Redis 없이 메모리 기반 사용 (간단)
REDIS_URL=redis://localhost:6379  # Redis 없어도 됨 (자동 폴백)
RATE_LIMIT_DAILY=10  # 개발 중에는 많이 테스트
RATE_LIMIT_HOURLY=5
```

### 프로덕션 환경
```env
# Upstash 또는 클라우드 Redis 사용
REDIS_URL=redis://[upstash-url]
RATE_LIMIT_DAILY=3
RATE_LIMIT_HOURLY=1
```

## 5. 요약

| 항목 | Redis 사용 | Redis 없음 |
|------|-----------|-----------|
| **설치 필요** | ✅ 별도 설치 필요 | ❌ 불필요 |
| **서버 재시작** | ✅ 데이터 유지 | ❌ 초기화됨 |
| **여러 서버** | ✅ 공유 가능 | ❌ 독립적 |
| **복잡도** | ⚠️ 약간 복잡 | ✅ 간단 |
| **추천** | 프로덕션 | 개발/테스트 |

## 6. 결론

- **개발/테스트**: Redis 없이도 OK (메모리 기반 자동 사용)
- **프로덕션**: Redis 사용 권장 (Upstash 무료 티어 추천)
- **하루 1회 제한**: `RATE_LIMIT_DAILY=1` 설정만 하면 됨

