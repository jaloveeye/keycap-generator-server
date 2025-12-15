import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';

/**
 * 파일 기반 Rate Limiter
 * Redis 없이도 서버 재시작 후 요청 횟수 유지
 */
export class FileBasedRateLimiter {
  private dailyLimit: number;
  private hourlyLimit: number;
  private storagePath: string;
  private memoryCounters: Map<string, { daily: number; hourly: number; lastReset: number }>;
  private saveInterval: NodeJS.Timeout | null = null;

  constructor(
    dailyLimit: number = 3,
    hourlyLimit: number = 1,
    storagePath: string = join(process.cwd(), '.rate-limit-storage')
  ) {
    this.dailyLimit = dailyLimit;
    this.hourlyLimit = hourlyLimit;
    this.storagePath = storagePath;
    this.memoryCounters = new Map();

    // 저장 디렉토리 생성
    if (!existsSync(this.storagePath)) {
      mkdirSync(this.storagePath, { recursive: true });
    }

    // 파일에서 데이터 로드
    this.loadFromFile();

    // 주기적으로 파일에 저장 (5분마다)
    this.saveInterval = setInterval(() => {
      this.saveToFile();
    }, 5 * 60 * 1000); // 5분

    // 프로세스 종료 시 저장
    process.on('SIGINT', () => {
      this.saveToFile();
      if (this.saveInterval) {
        clearInterval(this.saveInterval);
      }
      process.exit(0);
    });

    process.on('SIGTERM', () => {
      this.saveToFile();
      if (this.saveInterval) {
        clearInterval(this.saveInterval);
      }
      process.exit(0);
    });
  }

  /**
   * 파일에서 데이터 로드
   */
  private loadFromFile(): void {
    try {
      const filePath = join(this.storagePath, 'counters.json');
      if (!existsSync(filePath)) {
        return; // 파일이 없으면 빈 상태로 시작
      }

      const fileContent = readFileSync(filePath, 'utf-8');
      const data = JSON.parse(fileContent) as Record<
        string,
        { daily: number; hourly: number; lastReset: number }
      >;

      // 오래된 데이터 정리 (7일 이상 된 데이터 삭제)
      const now = Math.floor(Date.now() / 1000);
      const sevenDaysAgo = now - 7 * 86400;

      for (const [key, value] of Object.entries(data)) {
        if (value.lastReset > sevenDaysAgo) {
          this.memoryCounters.set(key, value);
        }
      }

      console.log(`Loaded ${this.memoryCounters.size} rate limit counters from file`);
    } catch (error) {
      console.warn('Failed to load rate limit data from file:', error);
      // 파일 로드 실패해도 계속 진행 (메모리 기반으로 시작)
    }
  }

  /**
   * 파일에 데이터 저장
   */
  private saveToFile(): void {
    try {
      const filePath = join(this.storagePath, 'counters.json');
      const data: Record<string, { daily: number; hourly: number; lastReset: number }> = {};

      for (const [key, value] of this.memoryCounters.entries()) {
        data[key] = value;
      }

      writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
    } catch (error) {
      console.error('Failed to save rate limit data to file:', error);
    }
  }

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

    // 메모리 기반 카운터 사용
    const key = `${identifier}:${today}:${currentHour}`;
    let counter = this.memoryCounters.get(key);

    // 오래된 카운터 정리 (새로운 날이면 리셋)
    if (!counter || counter.lastReset < today) {
      counter = { daily: 0, hourly: 0, lastReset: today };
      this.memoryCounters.set(key, counter);
    }

    // 일일 제한 체크
    if (counter.daily >= this.dailyLimit) {
      const nextDay = (today + 1) * 86400;
      const retryAfter = nextDay - now;
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
      return {
        allowed: false,
        retryAfter,
        message: `시간당 생성 한도(${this.hourlyLimit}회)를 초과했습니다. 잠시 후 다시 시도해주세요.`,
      };
    }

    // 카운터 증가
    counter.daily++;
    counter.hourly++;

    // 즉시 저장 (중요한 변경사항이므로)
    this.saveToFile();

    return { allowed: true };
  }

  /**
   * 정리 (인터벌 정리 등)
   */
  cleanup(): void {
    if (this.saveInterval) {
      clearInterval(this.saveInterval);
    }
    this.saveToFile();
  }
}

