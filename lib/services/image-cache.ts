import { createHash } from 'crypto';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';

/**
 * 이미지 캐시 서비스
 * 동일한 색상 조합이면 기존 이미지 재사용하여 비용 절감
 */
export class ImageCache {
  private cacheDir: string;
  private cacheIndexPath: string;

  constructor(cacheDir: string = join(process.cwd(), '.image-cache')) {
    this.cacheDir = cacheDir;
    this.cacheIndexPath = join(cacheDir, 'index.json');

    // 캐시 디렉토리 생성 (Lambda 환경 등에서 실패할 수 있음)
    try {
      if (!existsSync(this.cacheDir)) {
        mkdirSync(this.cacheDir, { recursive: true });
      }
    } catch (error) {
      // Lambda 환경 등에서 파일 시스템 접근이 제한될 수 있음
      console.warn(`⚠️ Failed to create cache directory: ${this.cacheDir}`, error);
      console.warn('⚠️ Image cache will be disabled. Using in-memory cache only.');
      // 캐시 디렉토리를 /tmp로 변경 시도 (Lambda에서 쓰기 가능)
      try {
        const tmpDir = join('/tmp', '.image-cache');
        if (!existsSync(tmpDir)) {
          mkdirSync(tmpDir, { recursive: true });
        }
        this.cacheDir = tmpDir;
        this.cacheIndexPath = join(tmpDir, 'index.json');
        console.log(`✅ Using temporary cache directory: ${tmpDir}`);
      } catch (tmpError) {
        console.error('❌ Failed to create temporary cache directory:', tmpError);
        // 캐시 기능 비활성화 (메모리만 사용)
        this.cacheDir = '';
        this.cacheIndexPath = '';
      }
    }
  }

  /**
   * 색상 코드 리스트를 해시로 변환 (캐시 키)
   */
  private getCacheKey(colorCodes: string[]): string {
    const sorted = [...colorCodes].sort().join(',');
    return createHash('sha256').update(sorted).digest('hex').substring(0, 16);
  }

  /**
   * 캐시 인덱스 로드
   */
  private loadCacheIndex(): Map<string, { url: string; createdAt: string }> {
    // 캐시 디렉토리가 없으면 빈 맵 반환
    if (!this.cacheIndexPath || !existsSync(this.cacheIndexPath)) {
      return new Map();
    }

    try {
      const content = readFileSync(this.cacheIndexPath, 'utf-8');
      const data = JSON.parse(content) as Record<string, { url: string; createdAt: string }>;
      return new Map(Object.entries(data));
    } catch (error) {
      console.warn('Failed to load cache index:', error);
      return new Map();
    }
  }

  /**
   * 캐시 인덱스 저장
   */
  private saveCacheIndex(index: Map<string, { url: string; createdAt: string }>): void {
    // 캐시 디렉토리가 없으면 저장하지 않음
    if (!this.cacheIndexPath) {
      return;
    }

    try {
      const data = Object.fromEntries(index);
      writeFileSync(this.cacheIndexPath, JSON.stringify(data, null, 2), 'utf-8');
    } catch (error) {
      console.warn('Failed to save cache index:', error);
    }
  }

  /**
   * 캐시에서 이미지 URL 조회
   * 캐시는 24시간(1일) 동안만 유효
   */
  getCachedImage(colorCodes: string[]): string | null {
    const cacheKey = this.getCacheKey(colorCodes);
    const index = this.loadCacheIndex();
    const cached = index.get(cacheKey);

    if (cached) {
      // 캐시 만료 시간 확인 (24시간 = 1일)
      const cacheAge = Date.now() - new Date(cached.createdAt).getTime();
      const oneDayInMs = 24 * 60 * 60 * 1000; // 24시간을 밀리초로 변환

      if (cacheAge > oneDayInMs) {
        // 캐시가 만료되었으면 제거
        console.log(`⏰ 캐시 만료 (${Math.round(cacheAge / (60 * 60 * 1000))}시간 경과): ${colorCodes.join(', ')}`);
        index.delete(cacheKey);
        this.saveCacheIndex(index);
        return null;
      }

      // URL이 유효한지 확인 (Supabase URL 형식)
      if (cached.url && cached.url.includes('supabase.co')) {
        const remainingHours = Math.round((oneDayInMs - cacheAge) / (60 * 60 * 1000));
        console.log(`✅ 캐시 히트 (${remainingHours}시간 남음): ${colorCodes.join(', ')} -> ${cached.url}`);
        return cached.url;
      } else {
        // 유효하지 않은 URL이면 캐시에서 제거
        console.warn(`⚠️ 캐시에 유효하지 않은 URL: ${cached.url}`);
        index.delete(cacheKey);
        this.saveCacheIndex(index);
      }
    }

    return null;
  }

  /**
   * 이미지 URL을 캐시에 저장
   */
  saveCachedImage(colorCodes: string[], imageUrl: string): void {
    const cacheKey = this.getCacheKey(colorCodes);
    const index = this.loadCacheIndex();

    index.set(cacheKey, {
      url: imageUrl,
      createdAt: new Date().toISOString(),
    });

    this.saveCacheIndex(index);
    console.log(`💾 캐시 저장: ${colorCodes.join(', ')} -> ${imageUrl}`);
  }

  /**
   * 만료된 캐시 항목 정리 (24시간 이상 된 항목 제거)
   */
  cleanupExpiredCache(): number {
    const index = this.loadCacheIndex();
    const oneDayInMs = 24 * 60 * 60 * 1000;
    const now = Date.now();
    let removedCount = 0;

    for (const [key, value] of index.entries()) {
      const cacheAge = now - new Date(value.createdAt).getTime();
      if (cacheAge > oneDayInMs) {
        index.delete(key);
        removedCount++;
      }
    }

    if (removedCount > 0) {
      this.saveCacheIndex(index);
      console.log(`🧹 만료된 캐시 ${removedCount}개 정리 완료`);
    }

    return removedCount;
  }

  /**
   * 캐시 통계
   */
  getCacheStats(): { total: number; oldest: string | null; newest: string | null; expired: number } {
    const index = this.loadCacheIndex();
    const entries = Array.from(index.values());
    const oneDayInMs = 24 * 60 * 60 * 1000;
    const now = Date.now();
    
    // 만료된 항목 개수 계산
    const expiredCount = entries.filter(e => {
      const cacheAge = now - new Date(e.createdAt).getTime();
      return cacheAge > oneDayInMs;
    }).length;
    
    if (entries.length === 0) {
      return { total: 0, oldest: null, newest: null, expired: 0 };
    }

    const dates = entries.map(e => new Date(e.createdAt).getTime());
    return {
      total: index.size,
      oldest: entries[dates.indexOf(Math.min(...dates))].createdAt,
      newest: entries[dates.indexOf(Math.max(...dates))].createdAt,
      expired: expiredCount,
    };
  }
}

