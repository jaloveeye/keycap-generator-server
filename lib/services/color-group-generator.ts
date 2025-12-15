import type {
  Keycap,
  KeycapColorGroup,
  ColorDistributionPattern,
} from '@/types';
import { gmkCodeToHex } from './color-converter';

/**
 * 색상 분배 패턴 분석 결과
 */
export class ColorDistributionPatternAnalyzer {
  /**
   * 모든 키캡의 색상 분배 패턴 분석
   */
  static analyzePatterns(
    allKeycaps: Keycap[]
  ): Map<string, ColorDistributionPattern> {
    // 그룹별 색상 빈도 수집
    const groupColorFrequency = new Map<string, Map<string, number>>();

    for (const keycap of allKeycaps) {
      for (const layout of keycap.layouts) {
        const colorGroups = layout.colorGroups;
        if (!colorGroups || colorGroups.length === 0) continue;

        for (const colorGroup of colorGroups) {
          const groupId = colorGroup.id;
          const approxColor = colorGroup.approx;

          // 그룹별 색상 빈도 업데이트
          if (!groupColorFrequency.has(groupId)) {
            groupColorFrequency.set(groupId, new Map<string, number>());
          }
          const frequency = groupColorFrequency.get(groupId)!;
          frequency.set(approxColor, (frequency.get(approxColor) || 0) + 1);
        }
      }
    }

    // 패턴 생성
    const patterns = new Map<string, ColorDistributionPattern>();

    for (const [groupId, frequency] of groupColorFrequency.entries()) {
      // 총 사용 횟수
      let totalCount = 0;
      for (const count of frequency.values()) {
        totalCount += count;
      }

      // Top 3 색상 추출
      const sortedColors = Array.from(frequency.entries()).sort(
        (a, b) => b[1] - a[1]
      );
      const topColors = sortedColors.slice(0, 3).map(([color]) => color);

      // 가장 흔한 색상의 비율
      const dominantColorRatio =
        totalCount > 0 ? sortedColors[0][1] / totalCount : 0;

      patterns.set(groupId, {
        groupId,
        colorFrequency: Object.fromEntries(frequency),
        topColors,
        dominantColorRatio,
      });
    }

    return patterns;
  }

  /**
   * 특정 색상 그룹의 가장 흔한 색상 반환
   */
  static getMostCommonColor(
    patterns: Map<string, ColorDistributionPattern>,
    groupId: string
  ): string | null {
    const pattern = patterns.get(groupId);
    return pattern?.topColors[0] || null;
  }

  /**
   * RGB 색상 거리 계산 (유클리드 거리)
   */
  private static colorDistance(hex1: string, hex2: string): number {
    const rgb1 = this.hexToRgb(hex1);
    const rgb2 = this.hexToRgb(hex2);
    if (!rgb1 || !rgb2) return Infinity;

    const dr = rgb1.r - rgb2.r;
    const dg = rgb1.g - rgb2.g;
    const db = rgb1.b - rgb2.b;

    return Math.sqrt(dr * dr + dg * dg + db * db);
  }

  /**
   * Hex 값을 RGB로 변환
   */
  private static hexToRgb(hex: string): { r: number; g: number; b: number } | null {
    // GMK 코드인 경우 hex로 변환 필요
    if (!hex.startsWith('#')) {
      return null; // GMK 코드는 나중에 변환
    }

    const normalizedHex = hex.replace('#', '');
    const r = parseInt(normalizedHex.substring(0, 2), 16);
    const g = parseInt(normalizedHex.substring(2, 4), 16);
    const b = parseInt(normalizedHex.substring(4, 6), 16);

    return { r, g, b };
  }

  /**
   * 색상 조합의 유사도 계산
   * 입력 색상들과 패턴의 색상들을 매칭하여 최소 거리 합 계산
   */
  private static calculateColorSimilarity(
    inputColors: string[],
    patternColors: string[],
    gmkColorsMap: Map<string, string>
  ): number {
    // 모든 색상을 hex로 변환
    const inputHex = inputColors.map(color => {
      if (color.startsWith('#')) return color;
      return gmkColorsMap.get(color) || color;
    });

    const patternHex = patternColors.map(color => {
      if (color.startsWith('#')) return color;
      return gmkColorsMap.get(color) || color;
    });

    // 최소 거리 매칭 (헝가리안 알고리즘의 간단한 버전)
    // 각 입력 색상에 대해 가장 가까운 패턴 색상 찾기
    let totalDistance = 0;
    const usedPatternIndices = new Set<number>();

    for (const inputColor of inputHex) {
      let minDistance = Infinity;
      let bestMatchIndex = -1;

      for (let i = 0; i < patternHex.length; i++) {
        if (usedPatternIndices.has(i)) continue;

        const distance = this.colorDistance(inputColor, patternHex[i]);
        if (distance < minDistance) {
          minDistance = distance;
          bestMatchIndex = i;
        }
      }

      if (bestMatchIndex >= 0) {
        totalDistance += minDistance;
        usedPatternIndices.add(bestMatchIndex);
      }
    }

    // 평균 거리 반환 (낮을수록 유사)
    return totalDistance / inputColors.length;
  }

  /**
   * 입력 색상 개수와 동일한 키캡 패턴 찾기
   */
  static findMatchingPatterns(
    allKeycaps: Keycap[],
    colorCount: number
  ): Array<{ keycap: Keycap; layout: any; colorGroups: KeycapColorGroup[]; uniqueColors: Set<string>; colorArray: string[] }> {
    const matchingPatterns: Array<{ keycap: Keycap; layout: any; colorGroups: KeycapColorGroup[]; uniqueColors: Set<string>; colorArray: string[] }> = [];

    for (const keycap of allKeycaps) {
      for (const layout of keycap.layouts) {
        const colorGroups = layout.colorGroups;
        if (!colorGroups || colorGroups.length === 0) continue;

        // 고유한 색상 개수 계산 (approx만 고려)
        const uniqueColors = new Set<string>();
        const colorArray: string[] = [];
        for (const group of colorGroups) {
          if (group.approx && !uniqueColors.has(group.approx)) {
            uniqueColors.add(group.approx);
            colorArray.push(group.approx);
          }
        }

        // 입력 색상 개수와 일치하는 패턴만 선택
        if (uniqueColors.size === colorCount) {
          matchingPatterns.push({
            keycap,
            layout,
            colorGroups,
            uniqueColors,
            colorArray,
          });
        }
      }
    }

    return matchingPatterns;
  }

  /**
   * GMK 색상 코드를 hex로 변환하는 맵 생성
   */
  private static buildGmkColorMap(allKeycaps: Keycap[]): Map<string, string> {
    const colorMap = new Map<string, string>();

    for (const keycap of allKeycaps) {
      if (keycap.colors) {
        for (const color of keycap.colors) {
          if (color.gmkCode && color.hex && !colorMap.has(color.code)) {
            colorMap.set(color.code, color.hex);
          }
        }
      }
    }

    return colorMap;
  }

  /**
   * 추출한 색상들을 패턴에 맞게 그룹에 배치
   * 1. 색상 개수 기반 패턴 매칭
   * 2. 색상 유사도 기반 매칭
   * 3. 그룹별 색상 빈도 기반 배치
   */
  static distributeColorsByPattern(
    patterns: Map<string, ColorDistributionPattern>,
    extractedColors: string[],
    allKeycaps?: Keycap[]
  ): Map<string, string> {
    const distribution = new Map<string, string>();

    if (extractedColors.length === 0) return distribution;

    // GMK 색상 코드 → hex 맵 생성
    const gmkColorMap = allKeycaps ? this.buildGmkColorMap(allKeycaps) : new Map<string, string>();

    // 1단계: 색상 개수 기반 패턴 찾기
    if (allKeycaps && allKeycaps.length > 0) {
      const matchingPatterns = this.findMatchingPatterns(allKeycaps, extractedColors.length);

      if (matchingPatterns.length > 0) {
        // 2단계: 색상 유사도 기반으로 가장 유사한 패턴 선택
        let bestPattern = matchingPatterns[0];
        let bestSimilarity = Infinity;

        for (const pattern of matchingPatterns) {
          const similarity = this.calculateColorSimilarity(
            extractedColors,
            pattern.colorArray,
            gmkColorMap
          );

          if (similarity < bestSimilarity) {
            bestSimilarity = similarity;
            bestPattern = pattern;
          }
        }

        // 3단계: 선택된 패턴을 기반으로 색상 매핑
        // 입력 색상과 패턴 색상을 유사도 기반으로 매칭
        const colorMapping = new Map<string, string>();
        const usedInputIndices = new Set<number>();

        // 패턴의 각 색상에 대해 가장 유사한 입력 색상 찾기
        for (const patternColor of bestPattern.colorArray) {
          let bestMatchIndex = -1;
          let minDistance = Infinity;

          for (let i = 0; i < extractedColors.length; i++) {
            if (usedInputIndices.has(i)) continue;

            const patternHex = patternColor.startsWith('#') 
              ? patternColor 
              : (gmkColorMap.get(patternColor) || patternColor);
            const inputHex = extractedColors[i].startsWith('#')
              ? extractedColors[i]
              : (gmkColorMap.get(extractedColors[i]) || extractedColors[i]);

            const distance = this.colorDistance(patternHex, inputHex);
            if (distance < minDistance) {
              minDistance = distance;
              bestMatchIndex = i;
            }
          }

          if (bestMatchIndex >= 0) {
            colorMapping.set(patternColor, extractedColors[bestMatchIndex]);
            usedInputIndices.add(bestMatchIndex);
          }
        }

        // 사용되지 않은 입력 색상은 첫 번째 색상으로 매핑
        const defaultColor = extractedColors[0];
        for (let i = 0; i < extractedColors.length; i++) {
          if (!usedInputIndices.has(i)) {
            // 패턴에 없는 색상에 매핑
            for (const patternColor of bestPattern.colorArray) {
              if (!colorMapping.has(patternColor)) {
                colorMapping.set(patternColor, extractedColors[i]);
                break;
              }
            }
          }
        }

        // 패턴의 그룹별 색상 배치를 입력 색상으로 변환
        for (const group of bestPattern.colorGroups) {
          if (group.approx) {
            const mappedColor = colorMapping.get(group.approx) || defaultColor;
            distribution.set(group.id, mappedColor);
          }
        }

        // 배치된 그룹이 있으면 반환
        if (distribution.size > 0) {
          return distribution;
        }
      }
    }

    // 4단계: 패턴을 찾지 못한 경우, 그룹별 색상 빈도 기반 배치
    // 각 그룹에서 가장 자주 사용되는 색상 유형을 분석
    const priorityGroups = ['alpha', 'modifier', 'num', 'function', 'nav', 'special'];
    let colorIndex = 0;

    // 우선순위 그룹에 색상 배치 (빈도 기반)
    for (const groupId of priorityGroups) {
      if (colorIndex >= extractedColors.length) break;
      if (patterns.has(groupId)) {
        // 그룹별 가장 흔한 색상과 입력 색상의 유사도 고려
        const pattern = patterns.get(groupId)!;
        const mostCommonColor = pattern.topColors[0];

        // 가장 흔한 색상과 가장 유사한 입력 색상 선택
        if (mostCommonColor) {
          const mostCommonHex = mostCommonColor.startsWith('#')
            ? mostCommonColor
            : (gmkColorMap.get(mostCommonColor) || mostCommonColor);

          let bestMatchIndex = colorIndex;
          let minDistance = Infinity;

          for (let i = colorIndex; i < extractedColors.length; i++) {
            const inputHex = extractedColors[i].startsWith('#')
              ? extractedColors[i]
              : (gmkColorMap.get(extractedColors[i]) || extractedColors[i]);

            const distance = this.colorDistance(mostCommonHex, inputHex);
            if (distance < minDistance) {
              minDistance = distance;
              bestMatchIndex = i;
            }
          }

          // 색상 교체
          if (bestMatchIndex !== colorIndex) {
            const temp = extractedColors[colorIndex];
            extractedColors[colorIndex] = extractedColors[bestMatchIndex];
            extractedColors[bestMatchIndex] = temp;
          }

          distribution.set(groupId, extractedColors[colorIndex]);
          colorIndex++;
        } else {
          distribution.set(groupId, extractedColors[colorIndex]);
          colorIndex++;
        }
      }
    }

    // 나머지 그룹 (novelty 등)에 남은 색상 배치
    const remainingGroups = Array.from(patterns.keys()).filter(
      (g) => !priorityGroups.includes(g) && !distribution.has(g)
    );

    for (const groupId of remainingGroups) {
      if (colorIndex >= extractedColors.length) break;
      
      // 그룹별 가장 흔한 색상과 유사도 고려
      if (patterns.has(groupId)) {
        const pattern = patterns.get(groupId)!;
        const mostCommonColor = pattern.topColors[0];

        if (mostCommonColor && colorIndex < extractedColors.length) {
          const mostCommonHex = mostCommonColor.startsWith('#')
            ? mostCommonColor
            : (gmkColorMap.get(mostCommonColor) || mostCommonColor);

          let bestMatchIndex = colorIndex;
          let minDistance = Infinity;

          for (let i = colorIndex; i < extractedColors.length; i++) {
            const inputHex = extractedColors[i].startsWith('#')
              ? extractedColors[i]
              : (gmkColorMap.get(extractedColors[i]) || extractedColors[i]);

            const distance = this.colorDistance(mostCommonHex, inputHex);
            if (distance < minDistance) {
              minDistance = distance;
              bestMatchIndex = i;
            }
          }

          if (bestMatchIndex !== colorIndex) {
            const temp = extractedColors[colorIndex];
            extractedColors[colorIndex] = extractedColors[bestMatchIndex];
            extractedColors[bestMatchIndex] = temp;
          }

          distribution.set(groupId, extractedColors[colorIndex]);
          colorIndex++;
        } else {
          distribution.set(groupId, extractedColors[colorIndex]);
          colorIndex++;
        }
      }
    }

    // 색상이 부족한 경우, 가장 흔한 색상으로 채우기
    for (const groupId of patterns.keys()) {
      if (!distribution.has(groupId)) {
        const mostCommon = this.getMostCommonColor(patterns, groupId);
        if (mostCommon) {
          distribution.set(
            groupId,
            extractedColors[0] || mostCommon
          );
        }
      }
    }

    return distribution;
  }
}

/**
 * colorGroups 생성기
 */
export class ColorGroupGenerator {
  /**
   * 색상 코드로부터 colorGroups 생성
   * @param colorCodes GMK 색상 코드 배열 (hex 값이 전달되면 GMK 코드로 변환된 값)
   * @param allKeycaps 전체 키캡 데이터
   * @param originalColors 원본 색상 입력 (hex 값 보존을 위해)
   */
  static generateColorGroups(
    colorCodes: string[],
    allKeycaps: Keycap[],
    originalColors?: Array<{ type: 'gmk' | 'hex'; value: string }>
  ): KeycapColorGroup[] {
    // 색상 분배 패턴 분석
    const patterns = ColorDistributionPatternAnalyzer.analyzePatterns(
      allKeycaps
    );

    // 패턴에 맞게 색상 배치 (기존 키캡 데이터의 패턴 활용)
    const colorDistribution =
      ColorDistributionPatternAnalyzer.distributeColorsByPattern(
        patterns,
        colorCodes,
        allKeycaps // 기존 키캡 데이터 전달
      );

    // colorGroups 생성
    const colorGroups: KeycapColorGroup[] = [];

    // 원본 색상 정보를 맵으로 변환 (빠른 조회를 위해)
    // colorCodes는 이미 GMK 코드로 변환된 값
    // originalColors는 클라이언트가 전달한 원본 색상 정보 (hex 또는 GMK)
    const originalColorMap = new Map<string, { type: 'gmk' | 'hex'; value: string }>();
    if (originalColors) {
      // colorCodes와 originalColors를 순서대로 매칭
      // colorCodes[i]는 originalColors[i]에서 변환된 GMK 코드
      for (let i = 0; i < Math.min(colorCodes.length, originalColors.length); i++) {
        originalColorMap.set(colorCodes[i], originalColors[i]);
      }
    }

    for (const [groupId, colorCode] of colorDistribution.entries()) {
      // legend 색상은 일반적으로 alpha와 동일하거나 대비되는 색상
      // 간단하게 alpha의 legend를 사용하거나, 대비 색상 사용
      const legendColorCode =
        groupId === 'alpha'
          ? colorCodes.length > 1
            ? colorCodes[1]
            : colorCodes[0]
          : colorCodes[0];

      // 원본 색상 정보 확인
      const approxOriginal = originalColorMap.get(colorCode);
      const legendOriginal = originalColorMap.get(legendColorCode);

      // colorGroup 생성 (원본 타입 정보 포함)
      const colorGroup: KeycapColorGroup = {
        id: groupId,
        approx: approxOriginal?.type === 'hex' ? approxOriginal.value : colorCode,
        legend: legendOriginal?.type === 'hex' ? legendOriginal.value : legendColorCode,
      };

      // 타입 정보 추가 (선택적)
      if (approxOriginal || legendOriginal) {
        (colorGroup as any).approxType = approxOriginal?.type || 'gmk';
        (colorGroup as any).legendType = legendOriginal?.type || 'gmk';
      }

      colorGroups.push(colorGroup);
    }

    return colorGroups;
  }

  /**
   * 베이스 이미지의 원본 colorGroups와 사용자 선택 색상을 매핑하여 새로운 colorGroups 생성
   * @param baseColorGroups 베이스 이미지의 원본 colorGroups
   * @param userSelectedColors 사용자가 선택한 색상 코드 배열
   * @param allKeycaps 전체 키캡 데이터 (GMK 색상 정보를 위한 참조)
   * @param originalColors 원본 색상 입력 (hex 값 보존을 위해)
   */
  static generateColorGroupsFromBaseImage(
    baseColorGroups: KeycapColorGroup[],
    userSelectedColors: string[],
    allKeycaps: Keycap[],
    originalColors?: Array<{ type: 'gmk' | 'hex'; value: string }>
  ): KeycapColorGroup[] {
    if (userSelectedColors.length === 0) {
      // 색상이 없으면 원본 그대로 반환
      return baseColorGroups;
    }

    // GMK 색상 코드 → hex 맵 생성
    const gmkColorMap = this.buildGmkColorMap(allKeycaps);
    
    // 원본 색상 정보를 맵으로 변환
    const originalColorMap = new Map<string, { type: 'gmk' | 'hex'; value: string }>();
    if (originalColors) {
      for (let i = 0; i < Math.min(userSelectedColors.length, originalColors.length); i++) {
        originalColorMap.set(userSelectedColors[i], originalColors[i]);
      }
    }

    // 사용된 색상 추적
    const usedColors = new Set<string>();
    const newColorGroups: KeycapColorGroup[] = [];

    for (const baseGroup of baseColorGroups) {
      // 원본 키캡 색상(body)과 가장 유사한 사용자 색상 찾기
      const originalBodyHex = this.gmkCodeToHex(baseGroup.approx, gmkColorMap);
      const bestBodyMatch = this.findClosestColor(
        originalBodyHex,
        userSelectedColors,
        usedColors,
        gmkColorMap
      ) || userSelectedColors[0];

      // 원본 각인 색상(legend)과 가장 유사한 사용자 색상 찾기
      const originalLegendHex = this.gmkCodeToHex(baseGroup.legend, gmkColorMap);
      let bestLegendMatch = this.findClosestColor(
        originalLegendHex,
        userSelectedColors,
        usedColors,
        gmkColorMap
      );

      // 각인 색상이 키캡 색상과 동일하면 대비 색상 선택
      if (!bestLegendMatch || bestLegendMatch === bestBodyMatch) {
        bestLegendMatch = this.findContrastColor(
          bestBodyMatch,
          originalLegendHex,
          userSelectedColors,
          usedColors,
          gmkColorMap
        ) || bestBodyMatch;
      }

      // 사용된 색상 표시
      usedColors.add(bestBodyMatch);
      if (bestLegendMatch !== bestBodyMatch) {
        usedColors.add(bestLegendMatch);
      }

      // 원본 색상 정보 확인
      const approxOriginal = originalColorMap.get(bestBodyMatch);
      const legendOriginal = originalColorMap.get(bestLegendMatch);

      // 새로운 colorGroup 생성
      const newColorGroup: KeycapColorGroup = {
        id: baseGroup.id,
        approx: approxOriginal?.type === 'hex' ? approxOriginal.value : bestBodyMatch,
        legend: legendOriginal?.type === 'hex' ? legendOriginal.value : bestLegendMatch,
      };

      newColorGroups.push(newColorGroup);
    }

    return newColorGroups;
  }

  /**
   * 원본 색상과 가장 유사한 사용자 색상 찾기
   */
  private static findClosestColor(
    originalHex: string | null,
    userColors: string[],
    usedColors: Set<string>,
    gmkColorMap: Map<string, string>
  ): string | null {
    if (!originalHex) return null;

    let bestMatch: string | null = null;
    let minDistance = Infinity;

    for (const userColor of userColors) {
      // 이미 사용된 색상은 스킵
      if (usedColors.has(userColor)) continue;

      const userHex = this.gmkCodeToHex(userColor, gmkColorMap);
      if (!userHex) continue;

      const distance = this.colorDistance(originalHex, userHex);
      if (distance < minDistance) {
        minDistance = distance;
        bestMatch = userColor;
      }
    }

    return bestMatch;
  }

  /**
   * 대비되는 색상 찾기 (각인 색상용)
   */
  private static findContrastColor(
    bodyColor: string,
    originalLegendHex: string | null,
    userColors: string[],
    usedColors: Set<string>,
    gmkColorMap: Map<string, string>
  ): string | null {
    const bodyHex = this.gmkCodeToHex(bodyColor, gmkColorMap);
    if (!bodyHex) return null;

    // 원본 각인 색상과 유사한 색상 찾기
    let bestMatch = this.findClosestColor(originalLegendHex, userColors, usedColors, gmkColorMap);

    // 대비가 부족하면 대비 색상 선택
    if (bestMatch) {
      const matchHex = this.gmkCodeToHex(bestMatch, gmkColorMap);
      if (matchHex) {
        const contrast = this.calculateContrast(bodyHex, matchHex);
        if (contrast < 4.5) { // WCAG AA 기준
          // 대비가 부족하면 다른 색상 시도
          for (const userColor of userColors) {
            if (usedColors.has(userColor) || userColor === bodyColor) continue;
            const userHex = this.gmkCodeToHex(userColor, gmkColorMap);
            if (!userHex) continue;
            const newContrast = this.calculateContrast(bodyHex, userHex);
            if (newContrast > contrast) {
              bestMatch = userColor;
            }
          }
        }
      }
    }

    return bestMatch || bodyColor; // 대비 색상을 찾지 못하면 body 색상 사용
  }

  /**
   * 색상 거리 계산 (유클리드 거리)
   */
  private static colorDistance(hex1: string, hex2: string): number {
    const rgb1 = this.hexToRgb(hex1);
    const rgb2 = this.hexToRgb(hex2);
    if (!rgb1 || !rgb2) return Infinity;

    const dr = rgb1.r - rgb2.r;
    const dg = rgb1.g - rgb2.g;
    const db = rgb1.b - rgb2.b;

    return Math.sqrt(dr * dr + dg * dg + db * db);
  }

  /**
   * 대비 비율 계산 (WCAG 기준)
   */
  private static calculateContrast(hex1: string, hex2: string): number {
    const rgb1 = this.hexToRgb(hex1);
    const rgb2 = this.hexToRgb(hex2);
    if (!rgb1 || !rgb2) return 0;

    const l1 = this.getLuminance(rgb1);
    const l2 = this.getLuminance(rgb2);

    const lighter = Math.max(l1, l2);
    const darker = Math.min(l1, l2);

    return (lighter + 0.05) / (darker + 0.05);
  }

  /**
   * RGB를 휘도로 변환
   */
  private static getLuminance(rgb: { r: number; g: number; b: number }): number {
    const [r, g, b] = [rgb.r, rgb.g, rgb.b].map((val) => {
      val = val / 255;
      return val <= 0.03928 ? val / 12.92 : Math.pow((val + 0.055) / 1.055, 2.4);
    });
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  }

  /**
   * Hex 값을 RGB로 변환
   */
  private static hexToRgb(hex: string): { r: number; g: number; b: number } | null {
    const normalizedHex = hex.replace('#', '').toUpperCase();
    if (normalizedHex.length !== 6) return null;

    const r = parseInt(normalizedHex.substring(0, 2), 16);
    const g = parseInt(normalizedHex.substring(2, 4), 16);
    const b = parseInt(normalizedHex.substring(4, 6), 16);

    if (isNaN(r) || isNaN(g) || isNaN(b)) return null;

    return { r, g, b };
  }

  /**
   * GMK 코드를 hex 값으로 변환
   */
  private static gmkCodeToHex(
    gmkCode: string,
    gmkColorMap: Map<string, string>
  ): string | null {
    // 이미 hex 값인 경우
    if (gmkCode.startsWith('#')) {
      return gmkCode;
    }

    // GMK 코드인 경우 맵에서 찾기
    return gmkColorMap.get(gmkCode) || null;
  }

  /**
   * GMK 색상 코드를 hex로 변환하는 맵 생성
   */
  private static buildGmkColorMap(allKeycaps: Keycap[]): Map<string, string> {
    const colorMap = new Map<string, string>();

    for (const keycap of allKeycaps) {
      if (keycap.colors) {
        for (const color of keycap.colors) {
          if ((color as any).gmkCode && color.hex && !colorMap.has(color.code)) {
            colorMap.set(color.code, color.hex);
          }
        }
      }
    }

    return colorMap;
  }
}

