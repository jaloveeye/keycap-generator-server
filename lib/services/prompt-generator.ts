import type { KeycapColorGroup, ColorInput } from "@/types";

/**
 * 프롬프트 생성기
 */
export class PromptGenerator {
  /**
   * colorGroups를 기반으로 DALL-E 프롬프트 생성
   * @param colorGroups 생성된 colorGroups
   * @param originalColors 원본 색상 입력 (hex 값이 있으면 사용)
   */
  static generatePrompt(
    colorGroups: KeycapColorGroup[],
    originalColors?: ColorInput[]
  ): string {
    // 색상 그룹별 설명 생성
    const colorDescriptions: string[] = [];

    for (const group of colorGroups) {
      // Novelty 그룹 제외 (프롬프트 길이 제한을 위해)
      if (
        group.id.startsWith("novelty") ||
        group.id.startsWith("accent") ||
        group.id.startsWith("various") ||
        group.id.startsWith("escape") ||
        group.id === "novelty"
      ) {
        continue;
      }

      const groupName = this.getGroupName(group.id);
      const colorName = this.getColorName(group.approx, originalColors);
      const legendColorName = this.getColorName(group.legend, originalColors);

      // 주요 그룹만 상세하게 설명
      colorDescriptions.push(
        `${groupName}: body MUST be ${colorName}, legend MUST be ${legendColorName}`
      );
    }

    const colorSchemeText = colorDescriptions.join("\n");

    // 키보드 케이스 색상 결정 (알파열 우선, 없으면 모디파이어 열 색상과 매칭)
    const alphaGroup = colorGroups.find((g) => g.id === "alpha");
    const modifierGroup = colorGroups.find((g) => g.id === "modifier");
    
    let keyboardCaseColor = "";
    if (alphaGroup?.approx) {
      keyboardCaseColor = this.getColorName(alphaGroup.approx, originalColors);
    } else if (modifierGroup?.approx) {
      keyboardCaseColor = this.getColorName(modifierGroup.approx, originalColors);
    }

    // 기본 프롬프트 템플릿 (DALL-E 3는 4000자 제한)
    const prompt = `Ultra-realistic full-frame product photo (1024x1024) of a complete TKL mechanical keyboard with custom keycaps in WKL layout and 7U spacebar. The ENTIRE keyboard must be visible in the frame from a top-down or slightly angled overhead view. High-detail PBT/ABS texture, bright studio lighting, precise legends, on clean modern desk with glowing particles.

CRITICAL COMPOSITION REQUIREMENTS:
- The ENTIRE keyboard must be visible in the frame - all 87 keys must be shown
- Use a top-down or slightly angled overhead camera angle that shows the full keyboard
- The keyboard should be centered in the frame with all edges visible
- NO partial views, NO close-ups, NO cropped sections - the complete keyboard must be shown

Layout specifications (CRITICAL - MUST be exact, NO exceptions):
- TKL (Tenkeyless): EXACTLY 87 keys total. This is NOT a compact 65%, 75%, or 60% keyboard. It MUST have a full alphanumeric section, full function row, and navigation cluster.
- Function row: EXACTLY 12 function keys in a single row: F1, F2, F3, F4, F5, F6, F7, F8, F9, F10, F11, F12. All 12 keys MUST be clearly visible and labeled.
- WKL (WinKeyLess) bottom row: ABSOLUTELY NO Windows keys anywhere on the keyboard. The bottom row MUST be exactly: Left Ctrl - empty space (NO key) - Left Alt - 7U spacebar - Right Alt - empty space (NO key) - Right Ctrl. There must be TWO empty spaces (one between Left Ctrl and Left Alt, one between Right Alt and Right Ctrl) where Windows keys would normally be. DO NOT place any Windows logo keys, Windows symbol keys, or any keys in those empty spaces.
- 7U spacebar: Standard 7-unit width spacebar in the center of bottom row
- Keycap legends: Standard English QWERTY ONLY. Each key shows its correct character: Q="Q", W="W", 1="1", F1="F1", Esc="Esc", etc. NO variations, NO "EGES", "FetE", "Fg18", "Herre", "POTTING", "ALTAの", or any non-standard text.

Color scheme (CRITICAL - Use EXACT hex colors, NO substitutions):
${colorSchemeText}

Keyboard case/frame color: The keyboard case and frame must match the overall keycap color scheme for visual harmony. ${keyboardCaseColor ? `Use color ${keyboardCaseColor} for the keyboard case and frame (matching the alpha row or modifier row keycap color).` : "The keyboard case should complement the keycap colors, typically matching the alpha row or modifier row color."}

CRITICAL COLOR REQUIREMENTS:
- Each keycap has TWO colors: body (material) and legend (printed text). DO NOT swap them.
- Use EXACT hex values - even similar colors like #171718 and #393b3b are DIFFERENT.
- Alpha and Modifier keys have DIFFERENT body and legend colors - apply exactly as specified.

Lighting: Bright studio, soft directional light for color visibility. Ensure legend colors are clearly visible against body colors.

Style: Ultra-realistic, professional product photography, 8K detail, high contrast, bright background. Commercial style. All keycap colors clearly visible and accurate. Keycap legends must be sharp, clear, and readable with standard English QWERTY characters.

ABSOLUTELY FORBIDDEN:
- NO RGB backlighting, NO LED lighting, NO glowing effects, NO translucent keycaps
- NO partial views, NO close-ups, NO cropped sections - ENTIRE keyboard visible
- NO Windows keys anywhere - bottom row has empty spaces where Windows keys would be
- NO non-standard legends ("EGES", "FetE", "Fg18", "Herre", "POTTING", "ALTAの") - ONLY standard QWERTY
- Keyboard is solid, opaque with printed legends, NOT glowing or translucent`;

    return prompt;
  }

  /**
   * 그룹 ID를 읽기 쉬운 이름으로 변환
   */
  private static getGroupName(groupId: string): string {
    const groupNames: Record<string, string> = {
      alpha: "Alpha row keys (Q-P)",
      modifier: "Modifier keys (Ctrl, Alt, Shift) - WKL layout: Left Ctrl, empty space, Left Alt, 7U spacebar, Right Alt, empty space, Right Ctrl (NO Windows keys)",
      num: "Number row keys",
      function: "Function keys (F1-F12, all 12 keys must be visible)",
      nav: "Navigation keys (Arrow keys, Home, End)",
      special: "Special keys (Space, Enter, Backspace)",
    };

    if (groupId.startsWith("novelty-")) {
      const color = groupId.replace("novelty-", "");
      return `Novelty accent keys (${color})`;
    }

    return groupNames[groupId] || groupId;
  }

  /**
   * 색상 코드를 실제 색상 설명으로 변환
   * hex 값이 있으면 직접 사용, 없으면 GMK 코드로 변환
   */
  private static getColorName(
    colorCode: string,
    originalColors?: ColorInput[]
  ): string {
    // 원본 색상에서 hex 값 찾기
    if (originalColors) {
      const originalColor = originalColors.find(
        (c) => c.type === "gmk" && c.value === colorCode
      );

      // hex 값이 있으면 직접 사용
      if (originalColor && originalColor.type === "hex") {
        return this.hexToColorDescription(originalColor.value);
      }
    }

    // GMK 색상 코드를 실제 색상으로 변환 (표준 GMK 색상 코드 기준)
    // 참고: https://matrixzj.github.io/docs/gmk-keycaps/ColorCodes/
    // 총 38개의 GMK 표준 색상 코드 매핑 (표준 hex 값 사용)
    const colorMap: Record<string, string> = {
      // 표준 GMK 색상 코드 (38개)
      CR: "#171718",
      N9: "#393b3b",
      CC: "#67635b",
      "2B": "#727474",
      BJ: "#91867a",
      CB: "#9b9284",
      U9: "#aca693",
      L9: "#d8d2c3",
      T9: "#c3c3ba",
      "3K": "#ccc6c0",
      "2M": "#c6c9c7",
      GR1: "#c5c7ca",
      CP: "#e1dbd1",
      WS1: "#f7f2ea",
      WS4: "#eee2d0",
      BR1: "#653c25",
      N7: "#00773a",
      AE: "#689b34",
      "3B": "#768e72",
      "3A": "#7fa580",
      V4: "#00589f",
      N5: "#0084c2",
      TU1: "#00627a",
      TU2: "#00a4a9",
      DY: "#5d437e",
      RO1: "#8d242f",
      P3: "#bc251e",
      V1: "#d02f1c",
      RO2: "#dd1126",
      "3C": "#c87e74",
      MG1: "#cb3d6e",
      V2: "#ee6900",
      N6: "#e5a100",
      CV: "#f8c200",
      GE1: "#ebd400",
    };

    return colorMap[colorCode] || colorCode;
  }

  /**
   * hex 값을 색상 설명으로 변환
   */
  private static hexToColorDescription(hex: string): string {
    // hex 값만 반환 (간결하게)
    return hex;
  }
}
