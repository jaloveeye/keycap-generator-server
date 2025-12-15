/**
 * 색상 변환 유틸리티
 * hex 값을 GMK 색상 코드로 변환하거나, GMK 코드를 hex로 변환
 */

/**
 * hex 값을 가장 유사한 GMK 색상 코드로 변환
 */
export function hexToGmkCode(
  hex: string,
  gmkColors: Array<{ code: string; hex?: string }>
): string {
  // hex 정규화 (# 제거, 대문자 변환)
  const normalizedHex = hex.replace('#', '').toUpperCase();
  
  // RGB로 변환
  const r = parseInt(normalizedHex.substring(0, 2), 16);
  const g = parseInt(normalizedHex.substring(2, 4), 16);
  const b = parseInt(normalizedHex.substring(4, 6), 16);
  
  // 가장 유사한 GMK 색상 찾기
  let closestCode = 'CR'; // 기본값
  let minDistance = Infinity;
  
  for (const gmkColor of gmkColors) {
    if (!gmkColor.hex) continue;
    
    const gmkHex = gmkColor.hex.replace('#', '').toUpperCase();
    const gmkR = parseInt(gmkHex.substring(0, 2), 16);
    const gmkG = parseInt(gmkHex.substring(2, 4), 16);
    const gmkB = parseInt(gmkHex.substring(4, 6), 16);
    
    // 유클리드 거리 계산
    const distance = Math.sqrt(
      Math.pow(r - gmkR, 2) + Math.pow(g - gmkG, 2) + Math.pow(b - gmkB, 2)
    );
    
    if (distance < minDistance) {
      minDistance = distance;
      closestCode = gmkColor.code;
    }
  }
  
  return closestCode;
}

/**
 * GMK 코드를 hex 값으로 변환
 */
export function gmkCodeToHex(
  gmkCode: string,
  gmkColors: Array<{ code: string; hex?: string }>
): string | null {
  const gmkColor = gmkColors.find((c) => c.code === gmkCode);
  return gmkColor?.hex || null;
}

/**
 * 색상 입력을 처리하여 colorGroups 생성에 사용할 색상 코드 배열 반환
 * @returns GMK 색상 코드 배열 (hex 값이 전달되어도 GMK 코드로 변환)
 */
export function processColorInputs(
  colors: Array<{ type: 'gmk' | 'hex'; value: string }>,
  allKeycaps: Array<{ colors?: Array<{ code: string; hex?: string }> }>
): string[] {
  // 모든 키캡에서 GMK 색상 수집
  const gmkColorsMap = new Map<string, string>();
  for (const keycap of allKeycaps) {
    if (keycap.colors) {
      for (const color of keycap.colors) {
        if ((color as any).gmkCode && color.hex && !gmkColorsMap.has(color.code)) {
          gmkColorsMap.set(color.code, color.hex);
        }
      }
    }
  }
  
  const gmkColors = Array.from(gmkColorsMap.entries()).map(([code, hex]) => ({
    code,
    hex,
  }));
  
  // 색상 입력을 GMK 코드로 변환
  const colorCodes: string[] = [];
  
  for (const color of colors) {
    if (color.type === 'gmk') {
      // 이미 GMK 코드
      colorCodes.push(color.value);
    } else if (color.type === 'hex') {
      // hex 값을 GMK 코드로 변환 (colorGroups 생성에 사용)
      const gmkCode = hexToGmkCode(color.value, gmkColors);
      colorCodes.push(gmkCode);
    }
  }
  
  return colorCodes;
}

