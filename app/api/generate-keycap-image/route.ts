import { NextRequest, NextResponse } from "next/server";
import { ColorGroupGenerator } from "@/lib/services/color-group-generator";
import { PromptGenerator } from "@/lib/services/prompt-generator";
import { DalleService } from "@/lib/services/dalle-service";
import { SupabaseService } from "@/lib/services/supabase-service";
import { RateLimiter } from "@/lib/services/rate-limiter";
import { ImageCache } from "@/lib/services/image-cache";
import { processColorInputs } from "@/lib/services/color-converter";
import { createRateLimitIdentifier } from "@/lib/utils/privacy";
import type {
  GenerateKeycapImageRequest,
  GenerateKeycapImageResponse,
  ErrorResponse,
  Keycap,
  KeycapColorGroup,
} from "@/types";
import { readFileSync } from "fs";
import { join } from "path";

// 환경 변수
const OPENAI_API_KEY = process.env.OPENAI_API_KEY!;
const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_KEY = process.env.SUPABASE_KEY!;
const SUPABASE_BUCKET = process.env.SUPABASE_BUCKET || "keycap-images";
const GMK_KEYCAPS_JSON_PATH =
  process.env.GMK_KEYCAPS_JSON_PATH ||
  join(process.cwd(), "data/gmk_keycaps.json");
const REDIS_URL = process.env.REDIS_URL || "redis://localhost:6379";
const RATE_LIMIT_DAILY = parseInt(process.env.RATE_LIMIT_DAILY || "3", 10);
const RATE_LIMIT_HOURLY = parseInt(process.env.RATE_LIMIT_HOURLY || "1", 10);
// Vercel 환경 감지 (서버리스 환경)
const IS_VERCEL = process.env.VERCEL === "1" || process.env.VERCEL_ENV !== undefined;
const USE_FILE_STORAGE = process.env.USE_FILE_STORAGE !== "false" && !IS_VERCEL; // Vercel에서는 파일 저장 비활성화
const USE_DATABASE_STORAGE = process.env.USE_DATABASE_STORAGE === "true" || IS_VERCEL; // Vercel에서는 데이터베이스 사용
const API_KEY = process.env.API_KEY; // 서버 API 키 (선택적, 설정하면 필수)
const TEST_MODE = process.env.TEST_MODE === "true"; // 테스트 모드 (OpenAI API 호출 안 함)

// 서비스 인스턴스 (싱글톤)
let keycapsData: Keycap[] | null = null;
let dalleService: DalleService | null = null;
let supabaseService: SupabaseService | null = null;
let rateLimiter: RateLimiter | null = null;
let imageCache: ImageCache | null = null;

/**
 * 키캡 데이터 로드 (캐싱)
 */
function loadKeycapsData(): Keycap[] {
  if (keycapsData) {
    return keycapsData;
  }

  try {
    const fileContent = readFileSync(GMK_KEYCAPS_JSON_PATH, "utf-8");
    keycapsData = JSON.parse(fileContent) as Keycap[];
    return keycapsData;
  } catch (error) {
    console.error("Failed to load keycaps data:", error);
    throw new Error("Failed to load keycaps data");
  }
}

/**
 * 서비스 초기화
 */
function initializeServices() {
  // 테스트 모드가 아닐 때만 서비스 초기화
  if (!TEST_MODE) {
    if (!dalleService) {
      if (!OPENAI_API_KEY) {
        throw new Error("OPENAI_API_KEY is not set");
      }
      dalleService = new DalleService(OPENAI_API_KEY);
    }

    if (!supabaseService) {
      if (!SUPABASE_URL || !SUPABASE_KEY) {
        throw new Error("Supabase credentials are not set");
      }
      supabaseService = new SupabaseService(
        SUPABASE_URL,
        SUPABASE_KEY,
        SUPABASE_BUCKET
      );
    }
  }

  if (!rateLimiter) {
    rateLimiter = new RateLimiter(
      REDIS_URL,
      RATE_LIMIT_DAILY,
      RATE_LIMIT_HOURLY,
      USE_FILE_STORAGE,
      USE_DATABASE_STORAGE,
      USE_DATABASE_STORAGE ? SUPABASE_URL : undefined,
      USE_DATABASE_STORAGE ? SUPABASE_KEY : undefined
    );
  }

  if (!imageCache) {
    imageCache = new ImageCache();
  }
}

/**
 * POST /api/generate-keycap-image
 */
export async function POST(request: NextRequest) {
  try {
    // 서비스 초기화
    initializeServices();

    // 요청 본문 파싱
    const body: GenerateKeycapImageRequest = await request.json();

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

    // 색상 입력 처리 (새로운 colors 배열 또는 하위 호환 colorCodes)
    let colorCodes: string[] = [];

    if (body.colors && Array.isArray(body.colors) && body.colors.length > 0) {
      // 새로운 방식: colors 배열 사용
      if (body.colors.length > 10) {
        const errorResponse: ErrorResponse = {
          success: false,
          error: "colors must not exceed 10 items",
          code: "INVALID_INPUT",
        };
        return NextResponse.json(errorResponse, { status: 400 });
      }

      // colors 배열 검증
      for (const color of body.colors) {
        if (!color.type || !["gmk", "hex"].includes(color.type)) {
          const errorResponse: ErrorResponse = {
            success: false,
            error: `Invalid color type: ${color.type}. Must be 'gmk' or 'hex'`,
            code: "INVALID_INPUT",
          };
          return NextResponse.json(errorResponse, { status: 400 });
        }
        if (!color.value || typeof color.value !== "string") {
          const errorResponse: ErrorResponse = {
            success: false,
            error: "Each color must have a valid value",
            code: "INVALID_INPUT",
          };
          return NextResponse.json(errorResponse, { status: 400 });
        }
      }

      // 키캡 데이터 로드 (hex 변환을 위해 필요)
      const allKeycaps = loadKeycapsData();

      // colors를 GMK 코드로 변환
      colorCodes = processColorInputs(body.colors, allKeycaps);
    } else if (
      body.colorCodes &&
      Array.isArray(body.colorCodes) &&
      body.colorCodes.length > 0
    ) {
      // 하위 호환: colorCodes 배열 사용
      colorCodes = body.colorCodes;

      if (colorCodes.length > 10) {
        const errorResponse: ErrorResponse = {
          success: false,
          error: "colorCodes must not exceed 10 items",
          code: "INVALID_INPUT",
        };
        return NextResponse.json(errorResponse, { status: 400 });
      }
    } else {
      // 둘 다 없으면 에러
      const errorResponse: ErrorResponse = {
        success: false,
        error: "colors or colorCodes is required and must be a non-empty array",
        code: "INVALID_INPUT",
      };
      return NextResponse.json(errorResponse, { status: 400 });
    }

    // Rate limit 체크 (디바이스 ID만 사용, 개인정보 보호를 위해 해시화)
    if (!body.anonymousId) {
      const errorResponse: ErrorResponse = {
        success: false,
        error: "anonymousId is required for rate limiting",
        code: "MISSING_ANONYMOUS_ID",
      };
      return NextResponse.json(errorResponse, { status: 400 });
    }

    const identifier = createRateLimitIdentifier(body.anonymousId);
    console.log(`🔒 Rate Limit 체크 시작: identifier=${identifier.substring(0, 16)}...`);
    console.log(`📊 Rate Limit 설정: 일일 ${RATE_LIMIT_DAILY}회, 시간당 ${RATE_LIMIT_HOURLY}회`);
    
    const rateLimitResult = await rateLimiter!.checkRateLimit(identifier);
    
    console.log(`🔒 Rate Limit 결과: allowed=${rateLimitResult.allowed}, message=${rateLimitResult.message || 'N/A'}`);

    if (!rateLimitResult.allowed) {
      console.log(`❌ Rate Limit 초과: ${rateLimitResult.message}`);
      const errorResponse: ErrorResponse = {
        success: false,
        error: rateLimitResult.message || "Rate limit exceeded",
        code: "RATE_LIMIT_EXCEEDED",
        retryAfter: rateLimitResult.retryAfter,
      };
      return NextResponse.json(errorResponse, { status: 429 });
    }
    
    console.log(`✅ Rate Limit 통과`);

    // 키캡 데이터 로드 (아직 로드하지 않았다면)
    const allKeycaps = loadKeycapsData();

    // 원본 색상 정보 저장 (hex 값이 있으면 프롬프트에 사용)
    const originalColors =
      body.colors ||
      body.colorCodes?.map((code) => ({ type: "gmk" as const, value: code })) ||
      [];

    // 베이스 이미지 색상 정보 활용 여부 확인
    const useBaseImageColors = body.useBaseImageColors !== false; // 기본값: true
    let baseColorGroups: KeycapColorGroup[] | undefined;
    let baseImagePath: string | undefined;

    // 베이스 이미지의 colorGroups 가져오기
    if (useBaseImageColors && body.baseLayoutKeycapId) {
      const baseLayoutKeycapId = body.baseLayoutKeycapId; // TypeScript를 위한 명시적 변수 할당
      // 키캡 이름으로 찾기 (정확한 매칭 또는 부분 매칭)
      const baseKeycap = allKeycaps.find(
        (k) =>
          k.name === baseLayoutKeycapId ||
          k.name.toLowerCase() === baseLayoutKeycapId.toLowerCase() ||
          k.name.toLowerCase().includes(baseLayoutKeycapId.toLowerCase())
      );

      if (baseKeycap) {
        const layoutName = body.baseLayoutName || "Base";
        // 레이아웃 이름으로 찾기 (대소문자 무시)
        const baseLayout = baseKeycap.layouts.find(
          (l) => l.name.toLowerCase() === layoutName.toLowerCase()
        );

        if (baseLayout) {
          // colorGroups가 있으면 사용
          if (baseLayout.colorGroups && baseLayout.colorGroups.length > 0) {
            baseColorGroups = baseLayout.colorGroups;
            // 이미지 경로 찾기 (다양한 필드명 지원)
            baseImagePath =
              (baseLayout as any).imageLocal ||
              (baseLayout as any).localPath ||
              (baseLayout as any).image ||
              (baseLayout as any).imageUrl;
            console.log(
              `✅ 베이스 이미지 색상 정보 사용: ${baseKeycap.name} - ${baseLayout.name} (${baseColorGroups.length}개 그룹)`
            );
          } else {
            console.log(
              `⚠️ 베이스 레이아웃의 colorGroups 정보가 없습니다: ${baseKeycap.name} - ${baseLayout.name}`
            );
            console.log(
              `   💡 AI로 색상 그룹을 추출하려면 extract_color_groups_from_image.py 스크립트를 실행하세요.`
            );
          }
        } else {
          console.log(
            `⚠️ 베이스 레이아웃을 찾을 수 없습니다: ${baseKeycap.name} - ${layoutName}`
          );
          console.log(`   사용 가능한 레이아웃: ${baseKeycap.layouts.map((l) => l.name).join(", ")}`);
        }
      } else {
        console.log(`⚠️ 베이스 키캡을 찾을 수 없습니다: ${baseLayoutKeycapId}`);
        console.log(
          `   💡 사용 가능한 키캡 예시: ${allKeycaps.slice(0, 5).map((k) => k.name).join(", ")}...`
        );
      }
    }

    // colorGroups 생성
    let colorGroups: KeycapColorGroup[];
    if (baseColorGroups && baseColorGroups.length > 0) {
      // 베이스 이미지의 colorGroups를 활용하여 색상 매핑
      colorGroups = ColorGroupGenerator.generateColorGroupsFromBaseImage(
        baseColorGroups,
        colorCodes,
        allKeycaps,
        originalColors
      );
      console.log(
        `✅ 베이스 이미지 색상 매핑 완료: ${colorGroups.length}개 그룹 생성`
      );
    } else {
      // 기존 방식: 패턴 분석 기반 색상 배치
      colorGroups = ColorGroupGenerator.generateColorGroups(
        colorCodes,
        allKeycaps,
        originalColors
      );
      console.log(`✅ 패턴 분석 기반 색상 배치 완료: ${colorGroups.length}개 그룹 생성`);
    }

    // 캐시에서 이미지 확인 (비용 절감)
    let uploadedUrl: string;
    let path: string;

    console.log(
      `🔍 이미지 생성 요청: colorCodes=${colorCodes.join(
        ","
      )}, anonymousId=${body.anonymousId.substring(0, 8)}...`
    );

    // 테스트 모드 체크
    if (TEST_MODE) {
      console.log("🧪 테스트 모드: OpenAI API 호출을 건너뜁니다.");
      
      // 프롬프트 생성 (원본 색상 정보 전달) - 로그용
      const prompt = PromptGenerator.generatePrompt(
        colorGroups,
        originalColors
      );
      
      // 프롬프트 로그 출력
      console.log('\n📝 생성된 프롬프트 (테스트 모드):');
      console.log('='.repeat(80));
      console.log(prompt);
      console.log('='.repeat(80));
      console.log(`프롬프트 길이: ${prompt.length}자 (제한: 4000자)\n`);

      // 더미 이미지 URL 생성 (Supabase 형식)
      const testImageId = `test-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
      uploadedUrl = SUPABASE_URL 
        ? `${SUPABASE_URL}/storage/v1/object/public/${SUPABASE_BUCKET}/keycaps/${testImageId}.png`
        : `https://sevmlhasriqszaxgdkds.supabase.co/storage/v1/object/public/keycap-images/keycaps/${testImageId}.png`;
      path = `keycaps/${testImageId}.png`;
      
      console.log(`✅ 테스트 모드: 더미 이미지 URL 생성: ${uploadedUrl}`);
    } else {
      // 프로덕션 모드: 기존 로직
      const cachedImageUrl = imageCache!.getCachedImage(colorCodes);
      if (cachedImageUrl) {
        // 캐시에서 찾음 - DALL-E API 호출 없이 재사용
        console.log("💰 캐시에서 이미지 재사용 (비용 절감)");
        uploadedUrl = cachedImageUrl;
        // path는 URL에서 추출
        const urlParts = cachedImageUrl.split("/");
        path = urlParts[urlParts.length - 1] || "cached";
      } else {
        // 캐시에 없음 - 새로 생성
        console.log("🎨 새 이미지 생성 시작 (DALL-E API 호출)");

        // 프롬프트 생성 (원본 색상 정보 전달)
        const prompt = PromptGenerator.generatePrompt(
          colorGroups,
          originalColors
        );
        
        // 프롬프트 로그 출력
        console.log('\n📝 생성된 프롬프트:');
        console.log('='.repeat(80));
        console.log(prompt);
        console.log('='.repeat(80));
        console.log(`프롬프트 길이: ${prompt.length}자 (제한: 4000자)\n`);

        // DALL-E로 이미지 생성
        console.log("🔄 DALL-E API 호출 중...");
        const imageUrl = await dalleService!.generateImage(prompt);
        console.log(
          `✅ DALL-E 이미지 생성 완료: ${imageUrl.substring(0, 50)}...`
        );

        // 이미지 다운로드
        console.log("⬇️ 이미지 다운로드 중...");
        const imageBuffer = await dalleService!.downloadImage(imageUrl);
        console.log(
          `✅ 이미지 다운로드 완료 (크기: ${(imageBuffer.length / 1024).toFixed(
            2
          )}KB)`
        );

        // Supabase에 업로드
        console.log("☁️ Supabase Storage 업로드 중...");
        const uploadResult = await supabaseService!.uploadImage(imageBuffer);
        uploadedUrl = uploadResult.url;
        path = uploadResult.path;
        console.log(`✅ Supabase 업로드 완료: ${uploadedUrl}`);

        // 캐시에 저장 (colorCodes 사용)
        imageCache!.saveCachedImage(colorCodes, uploadedUrl);
        console.log("💾 캐시에 저장 완료");

        // Supabase Database에 메타데이터 저장 (선택적, 실패해도 계속 진행)
        try {
          await supabaseService!.saveImageMetadata(
            uploadedUrl,
            path,
            colorCodes,
            colorGroups,
            identifier
          );
        } catch (error) {
          console.warn("메타데이터 저장 실패 (계속 진행):", error);
        }
      }
    }

    // 응답 생성
    const response: GenerateKeycapImageResponse = {
      success: true,
      imageUrl: uploadedUrl,
      imageId: path,
      createdAt: new Date().toISOString(),
      colorGroups,
      // 베이스 이미지 정보 추가 (있는 경우)
      ...(baseImagePath && { baseImageUsed: baseImagePath }),
      ...(baseColorGroups && { baseColorGroups }),
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("Error generating keycap image:", error);

    const errorResponse: ErrorResponse = {
      success: false,
      error: error instanceof Error ? error.message : "Internal server error",
      code: "INTERNAL_ERROR",
    };

    return NextResponse.json(errorResponse, { status: 500 });
  }
}
