import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import type { ErrorResponse } from '@/types';
import { createRateLimitIdentifier } from '@/lib/utils/privacy';

// 환경 변수
const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_KEY = process.env.SUPABASE_KEY!;

/**
 * GET /api/get-generated-images
 * 생성된 이미지 목록 조회
 */
export async function GET(request: NextRequest) {
  try {
    if (!SUPABASE_URL || !SUPABASE_KEY) {
      const errorResponse: ErrorResponse = {
        success: false,
        error: 'Supabase credentials are not set',
        code: 'CONFIG_ERROR',
      };
      return NextResponse.json(errorResponse, { status: 500 });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

    // 쿼리 파라미터
    const searchParams = request.nextUrl.searchParams;
    const limit = parseInt(searchParams.get('limit') || '10', 10);
    const colorCodes = searchParams.get('colorCodes')?.split(',').filter(Boolean);
    const anonymousId = searchParams.get('anonymousId'); // 사용자별 필터링

    let query = supabase
      .from('generated_keycap_images')
      .select('id, image_url, image_path, color_codes, color_groups, created_at')
      .order('created_at', { ascending: false })
      .limit(limit);

    // 사용자별 필터링 (anonymousId가 제공된 경우)
    if (anonymousId) {
      const identifier = createRateLimitIdentifier(anonymousId);
      query = query.eq('created_by_anonymous_id', identifier);
      console.log(`🔍 사용자별 이미지 조회: anonymousId=${anonymousId.substring(0, 8)}...`);
    }

    // 색상 코드로 필터링 (있는 경우)
    if (colorCodes && colorCodes.length > 0) {
      query = query.contains('color_codes', colorCodes);
    }

    const { data, error } = await query;

    if (error) {
      // 테이블이 없으면 빈 배열 반환
      if (error.code === 'PGRST116' || error.message.includes('does not exist')) {
        return NextResponse.json({
          success: true,
          images: [],
          message: 'Metadata table not set up. Run SUPABASE_IMAGE_METADATA_SETUP.sql',
        });
      }

      throw error;
    }

    return NextResponse.json({
      success: true,
      images: data || [],
      count: data?.length || 0,
    });
  } catch (error) {
    console.error('Error fetching generated images:', error);

    const errorResponse: ErrorResponse = {
      success: false,
      error:
        error instanceof Error ? error.message : 'Internal server error',
      code: 'INTERNAL_ERROR',
    };

    return NextResponse.json(errorResponse, { status: 500 });
  }
}

