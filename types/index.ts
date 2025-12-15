// 색상 정보 타입
export interface ColorInput {
  type: 'gmk' | 'hex'; // 색상 타입: GMK 코드 또는 hex 값
  value: string; // GMK 코드 (예: "CR") 또는 hex 값 (예: "#050505")
}

// 요청 타입
export interface GenerateKeycapImageRequest {
  // 새로운 방식: colors 배열 사용 (권장)
  colors?: ColorInput[];
  
  // 하위 호환성을 위한 필드 (deprecated, colors 사용 권장)
  colorCodes?: string[]; // GMK 색상 코드 배열 (예: ["CR", "N9"])
  
  anonymousId: string; // 필수: Rate limiting을 위한 익명 디바이스 ID
  apiKey?: string; // API 키 (선택적, 환경 변수에서 설정)
  
  // 베이스 이미지 관련 (새로 추가)
  baseLayoutKeycapId?: string; // 베이스 이미지로 사용할 키캡 ID (예: "GMK_Classic_Beige")
  baseLayoutName?: string; // 베이스 레이아웃 이름 (기본값: "Base")
  useBaseImageColors?: boolean; // 베이스 이미지의 색상 정보 활용 여부 (기본값: true)
}

// 응답 타입
export interface ColorGroup {
  id: string;
  approx: string; // GMK 색상 코드 또는 hex 값
  legend: string; // GMK 색상 코드 또는 hex 값
  approxType?: 'gmk' | 'hex'; // 색상 타입 (선택적)
  legendType?: 'gmk' | 'hex'; // 색상 타입 (선택적)
}

export interface GenerateKeycapImageResponse {
  success: boolean;
  imageUrl: string;
  imageId: string;
  createdAt: string;
  colorGroups: ColorGroup[];
  baseImageUsed?: string; // 사용된 베이스 이미지 경로 (선택적)
  baseColorGroups?: ColorGroup[]; // 베이스 이미지의 원본 색상 그룹 (참고용, 선택적)
}

export interface ErrorResponse {
  success: false;
  error: string;
  code: string;
  retryAfter?: number;
}

// 키캡 데이터 타입
export interface KeycapColor {
  code: string;
  name: string;
  hex?: string;
  gmkCode?: boolean;
}

export interface KeycapColorGroup {
  id: string;
  approx: string;
  legend: string;
}

export interface KeycapLayout {
  name: string;
  type?: string;
  colorGroups?: KeycapColorGroup[];
}

export interface Keycap {
  name: string;
  layouts: KeycapLayout[];
  colors?: KeycapColor[];
}

// 패턴 분석 타입
export interface ColorDistributionPattern {
  groupId: string;
  colorFrequency: Record<string, number>;
  topColors: string[];
  dominantColorRatio: number;
}

