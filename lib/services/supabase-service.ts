import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { randomUUID } from 'crypto';
import type { ColorGroup } from '@/types';

/**
 * Supabase 서비스
 */
export class SupabaseService {
  private client: SupabaseClient;
  private bucketName: string;

  constructor(url: string, key: string, bucketName: string) {
    this.client = createClient(url, key);
    this.bucketName = bucketName;
  }

  /**
   * 생성된 이미지 메타데이터 저장
   */
  async saveImageMetadata(
    imageUrl: string,
    imagePath: string,
    colorCodes: string[],
    colorGroups: ColorGroup[],
    anonymousId?: string
  ): Promise<void> {
    try {
      const { error } = await this.client
        .from('generated_keycap_images')
        .insert({
          image_url: imageUrl,
          image_path: imagePath,
          color_codes: colorCodes,
          color_groups: colorGroups,
          created_by_anonymous_id: anonymousId,
        });

      if (error) {
        // UNIQUE 제약 조건 위반은 무시 (이미 저장된 경우)
        if (error.code !== '23505') {
          console.warn('Failed to save image metadata:', error.message);
        }
      } else {
        console.log('💾 이미지 메타데이터 저장 완료');
      }
    } catch (error) {
      console.warn('Failed to save image metadata:', error);
      // 메타데이터 저장 실패해도 이미지 생성은 성공으로 처리
    }
  }

  /**
   * 이미지를 Supabase Storage에 업로드
   */
  async uploadImage(imageBuffer: Buffer, contentType: string = 'image/png'): Promise<{
    url: string;
    path: string;
  }> {
    try {
      // 고유 파일명 생성
      const fileName = `keycaps/${randomUUID()}.png`;
      const filePath = fileName;

      // 업로드
      const { data, error } = await this.client.storage
        .from(this.bucketName)
        .upload(filePath, imageBuffer, {
          contentType,
          upsert: false,
        });

      if (error) {
        throw new Error(`Supabase upload error: ${error.message}`);
      }

      // Public URL 생성
      const { data: urlData } = this.client.storage
        .from(this.bucketName)
        .getPublicUrl(filePath);

      if (!urlData?.publicUrl) {
        throw new Error('Failed to get public URL');
      }

      return {
        url: urlData.publicUrl,
        path: filePath,
      };
    } catch (error) {
      console.error('Supabase upload error:', error);
      throw new Error(
        `Failed to upload image: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }
}

