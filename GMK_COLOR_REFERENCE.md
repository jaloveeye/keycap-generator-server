# GMK 표준 색상 코드 참고

## 참고 사이트
https://matrixzj.github.io/docs/gmk-keycaps/ColorCodes/

## 주요 색상 코드

| Code | R   | G   | B   | Hex     | 설명 |
| ---- | --- | --- | --- | ------- | ---- |
| CR   | 23  | 23  | 24  | #171718 | 거의 검정색 (Cherry Red라는 이름이지만 실제로는 검정에 가까움) |
| N9   | 57  | 59  | 59  | #393b3b | 어두운 회색 |
| WS1  | 247 | 242 | 234 | #f7f2ea | 크림색/오프화이트 |
| CP   | 225 | 219 | 209 | #e1dbd1 | 연한 베이지색 |
| V2   | 238 | 105 | 0   | #ee6900 | 오렌지색 |
| RO1  | 141 | 36  | 47  | #8d242f | 어두운 빨간색 |

## 주의사항

- **CR (Cherry Red)**: 이름은 "Cherry Red"이지만 실제로는 거의 검정색에 가까운 매우 어두운 색상입니다. 붉은색이 아닙니다.
- **N9**: 어두운 회색 계열입니다.
- 프롬프트 생성 시 이 hex 값을 정확히 사용하여 DALL-E가 올바른 색상을 생성하도록 해야 합니다.

## 코드에서 사용

`keycap-generator-server/lib/services/prompt-generator.ts`에서 이 값을 사용합니다.

