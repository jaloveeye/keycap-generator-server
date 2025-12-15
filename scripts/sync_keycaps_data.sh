#!/bin/bash

# 키캡 데이터 동기화 스크립트
# Flutter 앱의 데이터를 서버로 복사

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
FLUTTER_DATA="$PROJECT_ROOT/flutter_app/assets/data/gmk_keycaps.json"
SERVER_DATA="$PROJECT_ROOT/server/data/gmk_keycaps.json"

if [ ! -f "$FLUTTER_DATA" ]; then
    echo "❌ Flutter 데이터 파일을 찾을 수 없습니다: $FLUTTER_DATA"
    exit 1
fi

# 서버 데이터 디렉토리 생성
mkdir -p "$(dirname "$SERVER_DATA")"

# 파일 복사
cp "$FLUTTER_DATA" "$SERVER_DATA"

if [ $? -eq 0 ]; then
    echo "✅ 키캡 데이터 동기화 완료"
    echo "   From: $FLUTTER_DATA"
    echo "   To:   $SERVER_DATA"
    ls -lh "$SERVER_DATA"
else
    echo "❌ 파일 복사 실패"
    exit 1
fi

