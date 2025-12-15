import { createClient } from 'redis';
import type { RedisClientType } from 'redis';
import { FileBasedRateLimiter } from './file-based-rate-limiter';
import { DatabaseBasedRateLimiter } from './database-based-rate-limiter';

/**
 * Rate Limiter
 * 우선순위: Redis > Database (Supabase) > File > Memory
 */
export class RateLimiter {
  private client: RedisClientType | null = null;
  private databaseLimiter: DatabaseBasedRateLimiter | null = null;
  private fileBasedLimiter: FileBasedRateLimiter | null = null;
  private dailyLimit: number;
  private hourlyLimit: number;
  private useFileStorage: boolean;
  private useDatabaseStorage: boolean;
  private supabaseUrl?: string;
  private supabaseKey?: string;

  constructor(
    redisUrl: string,
    dailyLimit: number = 3,
    hourlyLimit: number = 1,
    useFileStorage: boolean = true,
    useDatabaseStorage: boolean = false,
    supabaseUrl?: string,
    supabaseKey?: string
  ) {
    this.dailyLimit = dailyLimit;
    this.hourlyLimit = hourlyLimit;
    this.useFileStorage = useFileStorage;
    this.useDatabaseStorage = useDatabaseStorage;
    this.supabaseUrl = supabaseUrl;
    this.supabaseKey = supabaseKey;

    // Redis 클라이언트 초기화 (선택적, 없으면 메모리 기반)
    // Redis URL이 설정되어 있고, localhost가 아니면 Redis 사용 시도
    // localhost는 개발 환경에서 Redis가 없을 수 있으므로 메모리 기반 사용
    if (redisUrl && !redisUrl.includes('localhost')) {
      try {
        this.client = createClient({ url: redisUrl }) as RedisClientType;
        this.client.on('error', (err: Error) => {
          console.error('Redis error:', err);
          this.client = null; // Redis 실패 시 메모리 기반으로 폴백
        });
        // 비동기 연결은 필요시 별도로 처리
        // this.client.connect().catch(() => {
        //   console.warn('Redis connection failed, using in-memory storage');
        //   this.client = null;
        // });
      } catch (error) {
        console.warn('Redis initialization failed, using in-memory storage:', error);
        this.client = null;
      }
    }

    // Redis가 없으면 데이터베이스 기반 시도 (Vercel 등 서버리스 환경에 적합)
    if (!this.client && this.useDatabaseStorage && supabaseUrl && supabaseKey) {
      try {
        this.databaseLimiter = new DatabaseBasedRateLimiter(
          supabaseUrl,
          supabaseKey,
          dailyLimit,
          hourlyLimit
        );
        console.log('✅ Using database-based rate limiting (Supabase)');
      } catch (error) {
        console.warn('⚠️ Database-based rate limiter initialization failed:', error);
        this.databaseLimiter = null;
      }
    }

    // 데이터베이스도 없으면 파일 기반 시도 (로컬 개발 환경에서만 사용)
    if (!this.client && !this.databaseLimiter && this.useFileStorage) {
      try {
        this.fileBasedLimiter = new FileBasedRateLimiter(
          dailyLimit,
          hourlyLimit
        );
        console.log('✅ Using file-based rate limiting (local development only)');
      } catch (error) {
        console.warn('⚠️ File-based rate limiter initialization failed:', error);
        this.fileBasedLimiter = null;
      }
    }

    // 메모리 기반 카운터 (Redis와 파일 모두 없을 때 사용)
    this.memoryCounters = new Map<string, { daily: number; hourly: number; lastReset: number }>();
  }

  private memoryCounters: Map<string, { daily: number; hourly: number; lastReset: number }>;

  /**
   * Rate limit 체크
   */
  async checkRateLimit(identifier: string): Promise<{
    allowed: boolean;
    retryAfter?: number;
    message?: string;
  }> {
    const now = Math.floor(Date.now() / 1000);
    const today = Math.floor(now / 86400); // 일 단위
    const currentHour = Math.floor(now / 3600); // 시간 단위

    console.log(`[RateLimiter] 체크 시작: identifier=${identifier.substring(0, 16)}..., dailyLimit=${this.dailyLimit}, hourlyLimit=${this.hourlyLimit}`);

    // 1순위: Redis 사용
    if (this.client) {
      // Redis 사용
      try {
        // Redis 연결 확인
        if (!this.client.isOpen) {
          console.log('[RateLimiter] Redis 연결 시도 중...');
          await this.client.connect();
        }

        // 일일 제한 체크
        const dailyKey = `rate_limit:daily:${identifier}:${today}`;
        const dailyCount = await this.client.get(dailyKey);
        const dailyCountNum = dailyCount ? parseInt(dailyCount, 10) : 0;
        console.log(`[RateLimiter] Redis 일일 카운트: ${dailyCountNum}/${this.dailyLimit}`);

        if (dailyCountNum >= this.dailyLimit) {
          const nextDay = (today + 1) * 86400;
          const retryAfter = nextDay - now;
          console.log(`[RateLimiter] ❌ 일일 제한 초과: ${dailyCountNum}/${this.dailyLimit}`);
          return {
            allowed: false,
            retryAfter,
            message: `일일 생성 한도(${this.dailyLimit}회)를 초과했습니다. 내일 다시 시도해주세요.`,
          };
        }

        // 시간당 제한 체크
        const hourlyKey = `rate_limit:hourly:${identifier}:${currentHour}`;
        const hourlyCount = await this.client.get(hourlyKey);
        const hourlyCountNum = hourlyCount ? parseInt(hourlyCount, 10) : 0;
        console.log(`[RateLimiter] Redis 시간당 카운트: ${hourlyCountNum}/${this.hourlyLimit}`);

        if (hourlyCountNum >= this.hourlyLimit) {
          const nextHour = (currentHour + 1) * 3600;
          const retryAfter = nextHour - now;
          console.log(`[RateLimiter] ❌ 시간당 제한 초과: ${hourlyCountNum}/${this.hourlyLimit}`);
          return {
            allowed: false,
            retryAfter,
            message: `시간당 생성 한도(${this.hourlyLimit}회)를 초과했습니다. 잠시 후 다시 시도해주세요.`,
          };
        }

        // 카운터 증가
        await this.client.incr(dailyKey);
        await this.client.expire(dailyKey, 86400); // 24시간

        await this.client.incr(hourlyKey);
        await this.client.expire(hourlyKey, 3600); // 1시간

        console.log(`[RateLimiter] ✅ Redis 사용: 일일 ${dailyCountNum + 1}/${this.dailyLimit}, 시간당 ${hourlyCountNum + 1}/${this.hourlyLimit}`);
        return { allowed: true };
      } catch (error) {
        console.error('[RateLimiter] Redis error, falling back to database/file/memory:', error);
        this.client = null; // Redis 실패 시 DB/파일/메모리로 폴백
      }
    }

    // 2순위: 데이터베이스 기반 (Supabase)
    if (this.databaseLimiter) {
      console.log('[RateLimiter] 데이터베이스 기반 Rate Limiter 사용');
      return await this.databaseLimiter.checkRateLimit(identifier);
    }

    // 3순위: 파일 기반 (서버 재시작 후에도 유지)
    if (this.fileBasedLimiter) {
      console.log('[RateLimiter] 파일 기반 Rate Limiter 사용');
      return await this.fileBasedLimiter.checkRateLimit(identifier);
    }

    // 4순위: 메모리 기반 (Redis, DB, 파일 모두 없을 때)
    console.log('[RateLimiter] 메모리 기반 Rate Limiter 사용 (서버 재시작 시 초기화됨)');
    const key = `${identifier}:${today}:${currentHour}`;
    let counter = this.memoryCounters.get(key);

    if (!counter || counter.lastReset < today) {
      counter = { daily: 0, hourly: 0, lastReset: today };
      this.memoryCounters.set(key, counter);
      console.log('[RateLimiter] 새로운 카운터 생성');
    }

    console.log(`[RateLimiter] 메모리 카운터: 일일 ${counter.daily}/${this.dailyLimit}, 시간당 ${counter.hourly}/${this.hourlyLimit}`);

    // 일일 제한 체크
    if (counter.daily >= this.dailyLimit) {
      const nextDay = (today + 1) * 86400;
      const retryAfter = nextDay - now;
      console.log(`[RateLimiter] ❌ 일일 제한 초과: ${counter.daily}/${this.dailyLimit}`);
      return {
        allowed: false,
        retryAfter,
        message: `일일 생성 한도(${this.dailyLimit}회)를 초과했습니다. 내일 다시 시도해주세요.`,
      };
    }

    // 시간당 제한 체크
    if (counter.hourly >= this.hourlyLimit) {
      const nextHour = (currentHour + 1) * 3600;
      const retryAfter = nextHour - now;
      console.log(`[RateLimiter] ❌ 시간당 제한 초과: ${counter.hourly}/${this.hourlyLimit}`);
      return {
        allowed: false,
        retryAfter,
        message: `시간당 생성 한도(${this.hourlyLimit}회)를 초과했습니다. 잠시 후 다시 시도해주세요.`,
      };
    }

    // 카운터 증가
    counter.daily++;
    counter.hourly++;
    console.log(`[RateLimiter] ✅ 메모리 카운터 증가: 일일 ${counter.daily}/${this.dailyLimit}, 시간당 ${counter.hourly}/${this.hourlyLimit}`);

    return { allowed: true };
  }
}


