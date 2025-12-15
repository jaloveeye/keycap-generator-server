import { createClient, SupabaseClient } from '@supabase/supabase-js';

/**
 * 데이터베이스 기반 Rate Limiter
 * Supabase Database를 사용하여 Rate Limiting 데이터 저장
 */
export class DatabaseBasedRateLimiter {
  private supabase: SupabaseClient;
  private dailyLimit: number;
  private hourlyLimit: number;

  constructor(
    supabaseUrl: string,
    supabaseKey: string,
    dailyLimit: number = 3,
    hourlyLimit: number = 1
  ) {
    this.supabase = createClient(supabaseUrl, supabaseKey);
    this.dailyLimit = dailyLimit;
    this.hourlyLimit = hourlyLimit;
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

    try {
      // 일일 카운터 조회/생성
      const dailyKey = `daily:${identifier}:${today}`;
      let dailyRecord = await this.getOrCreateCounter(dailyKey, 86400); // 24시간 TTL

      if (dailyRecord.count >= this.dailyLimit) {
        const nextDay = (today + 1) * 86400;
        const retryAfter = nextDay - now;
        return {
          allowed: false,
          retryAfter,
          message: `일일 생성 한도(${this.dailyLimit}회)를 초과했습니다. 내일 다시 시도해주세요.`,
        };
      }

      // 시간당 카운터 조회/생성
      const hourlyKey = `hourly:${identifier}:${currentHour}`;
      let hourlyRecord = await this.getOrCreateCounter(hourlyKey, 3600); // 1시간 TTL

      if (hourlyRecord.count >= this.hourlyLimit) {
        const nextHour = (currentHour + 1) * 3600;
        const retryAfter = nextHour - now;
        return {
          allowed: false,
          retryAfter,
          message: `시간당 생성 한도(${this.hourlyLimit}회)를 초과했습니다. 잠시 후 다시 시도해주세요.`,
        };
      }

      // 카운터 증가 (원자적 연산)
      await Promise.all([
        this.incrementCounter(dailyKey),
        this.incrementCounter(hourlyKey),
      ]);

      return { allowed: true };
    } catch (error) {
      console.error('Database rate limiter error:', error);
      // 에러 발생 시 허용 (서비스 중단 방지)
      return { allowed: true };
    }
  }

  /**
   * 카운터 조회 또는 생성
   */
  private async getOrCreateCounter(
    key: string,
    ttl: number
  ): Promise<{ count: number; expires_at: number }> {
    const expiresAt = Math.floor(Date.now() / 1000) + ttl;

    // 기존 레코드 조회
    const { data, error } = await this.supabase
      .from('rate_limits')
      .select('count, expires_at')
      .eq('key', key)
      .single();

    if (error && error.code !== 'PGRST116') {
      // PGRST116 = not found, 그 외 에러는 throw
      throw error;
    }

    if (data) {
      // 만료 시간 확인
      if (data.expires_at < Math.floor(Date.now() / 1000)) {
        // 만료된 레코드는 0으로 리셋
        await this.supabase
          .from('rate_limits')
          .update({ count: 0, expires_at: expiresAt })
          .eq('key', key);
        return { count: 0, expires_at: expiresAt };
      }
      return data;
    }

    // 레코드가 없으면 생성
    const { data: newData, error: insertError } = await this.supabase
      .from('rate_limits')
      .insert({
        key,
        count: 0,
        expires_at: expiresAt,
      })
      .select('count, expires_at')
      .single();

    if (insertError) {
      throw insertError;
    }

    return newData || { count: 0, expires_at: expiresAt };
  }

  /**
   * 카운터 증가 (원자적 연산)
   */
  private async incrementCounter(key: string): Promise<void> {
    const { error } = await this.supabase.rpc('increment_rate_limit', {
      counter_key: key,
    });

    // RPC 함수가 없으면 직접 업데이트
    if (error && error.message.includes('function') && error.message.includes('does not exist')) {
      // Fallback: 직접 업데이트
      const { data } = await this.supabase
        .from('rate_limits')
        .select('count')
        .eq('key', key)
        .single();

      if (data) {
        await this.supabase
          .from('rate_limits')
          .update({ count: data.count + 1 })
          .eq('key', key);
      }
    } else if (error) {
      throw error;
    }
  }
}

