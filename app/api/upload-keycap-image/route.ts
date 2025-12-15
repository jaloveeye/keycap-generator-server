import { NextRequest, NextResponse } from "next/server";
import { SupabaseService } from "@/lib/services/supabase-service";
import type { ErrorResponse } from "@/types";

// 환경 변수
const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_KEY = process.env.SUPABASE_KEY!;
const SUPABASE_BUCKET = process.env.SUPABASE_BUCKET || "keycap-images";
const API_KEY = process.env.API_KEY; // 서버 API 키 (선택적, 설정하면 필수)

/**
 * POST /api/upload-keycap-image
 * 키캡 이미지를 Supabase Storage에 업로드
 * 
 * Request Body:
 * {
 *   keycapName: string,      // 키캡 이름 (예: "GMK CYL Hangulbeit")
 *   imageUrl: string,        // 이미지 URL
 *   layoutType: string,      // "cover" 또는 레이아웃 이름 (예: "Base", "Novelties")
 *   apiKey?: string          // API 키 (설정되어 있으면 필수)
 * }
 */
export async function POST(request: NextRequest) {
  try {
    // Supabase 서비스 초기화
    if (!SUPABASE_URL || !SUPABASE_KEY) {
      const errorResponse: ErrorResponse = {
        success: false,
        error: "Supabase credentials are not set",
        code: "CONFIG_ERROR",
      };
      return NextResponse.json(errorResponse, { status: 500 });
    }

    const supabaseService = new SupabaseService(
      SUPABASE_URL,
      SUPABASE_KEY,
      SUPABASE_BUCKET
    );

    // 요청 본문 파싱
    const body = await request.json();

    // API 키 검증 (설정되어 있으면 필수)
    if (API_KEY) {
      if (!body.apiKey || body.apiKey !== API_KEY) {
        const errorResponse: ErrorResponse = {
          success: false,
          error: "Invalid or missing API key",
          code: "INVALID_API_KEY",
        };
        return NextResponse.json(errorResponse, { status: 401 });
      }
    }

    // 필수 파라미터 검증
    if (!body.keycapName || !body.imageUrl) {
      const errorResponse: ErrorResponse = {
        success: false,
        error: "keycapName and imageUrl are required",
        code: "INVALID_INPUT",
      };
      return NextResponse.json(errorResponse, { status: 400 });
    }

    const { keycapName, imageUrl, layoutType = "cover" } = body;

    console.log(`📤 키캡 이미지 업로드 요청: ${keycapName} (${layoutType})`);
    console.log(`   이미지 URL: ${imageUrl.substring(0, 80)}...`);

    // 이미지 다운로드
    console.log("⬇️ 이미지 다운로드 중...");
    const imageResponse = await fetch(imageUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
        'Accept': 'image/webp,image/apng,image/*,*/*;q=0.8'
      }
    });

    if (!imageResponse.ok) {
      const errorResponse: ErrorResponse = {
        success: false,
        error: `Failed to download image: ${imageResponse.status} ${imageResponse.statusText}`,
        code: "DOWNLOAD_ERROR",
      };
      return NextResponse.json(errorResponse, { status: 400 });
    }

    const imageBuffer = Buffer.from(await imageResponse.arrayBuffer());
    console.log(`✅ 이미지 다운로드 완료 (크기: ${(imageBuffer.length / 1024).toFixed(2)}KB)`);

    // 파일 경로 생성
    // keycaps/키캡이름/cover.png 또는 keycaps/키캡이름/레이아웃이름.png
    const sanitizedName = keycapName.replace(/[^a-zA-Z0-9가-힣\s]/g, '').trim();
    const sanitizedLayout = layoutType.replace(/[^a-zA-Z0-9가-힣\s]/g, '').trim();
    const fileName = layoutType === "cover" 
      ? `keycaps/${sanitizedName}/cover.png`
      : `keycaps/${sanitizedName}/${sanitizedLayout}.png`;

    console.log(`📁 파일 경로: ${fileName}`);

    // Supabase에 업로드
    console.log("☁️ Supabase Storage 업로드 중...");
    
    // SupabaseService의 uploadImage 메서드는 randomUUID를 사용하므로,
    // 직접 Supabase 클라이언트를 사용하여 지정된 경로에 업로드
    const { createClient } = await import('@supabase/supabase-js');
    const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

    const { data, error } = await supabase.storage
      .from(SUPABASE_BUCKET)
      .upload(fileName, imageBuffer, {
        contentType: 'image/png',
        upsert: true, // 이미 있으면 덮어쓰기
      });

    if (error) {
      console.error('Supabase upload error:', error);
      const errorResponse: ErrorResponse = {
        success: false,
        error: `Supabase upload error: ${error.message}`,
        code: "UPLOAD_ERROR",
      };
      return NextResponse.json(errorResponse, { status: 500 });
    }

    // Public URL 생성
    const { data: urlData } = supabase.storage
      .from(SUPABASE_BUCKET)
      .getPublicUrl(fileName);

    if (!urlData?.publicUrl) {
      const errorResponse: ErrorResponse = {
        success: false,
        error: "Failed to get public URL",
        code: "URL_ERROR",
      };
      return NextResponse.json(errorResponse, { status: 500 });
    }

    console.log(`✅ 업로드 완료: ${urlData.publicUrl}`);

    return NextResponse.json({
      success: true,
      imageUrl: urlData.publicUrl,
      imagePath: fileName,
      keycapName,
      layoutType,
    });
  } catch (error) {
    console.error('Upload keycap image error:', error);
    const errorResponse: ErrorResponse = {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
      code: "INTERNAL_ERROR",
    };
    return NextResponse.json(errorResponse, { status: 500 });
  }
}

