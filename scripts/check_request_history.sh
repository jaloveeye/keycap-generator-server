#!/bin/bash

# 요청 이력 확인 스크립트

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SERVER_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

echo "📊 서버 요청 이력 확인"
echo ""

# 1. Rate Limit 저장소 확인
echo "1️⃣ Rate Limit 저장소:"
if [ -f "$SERVER_DIR/.rate-limit-storage/counters.json" ]; then
    echo "   ✅ 파일 존재"
    echo "   내용:"
    cat "$SERVER_DIR/.rate-limit-storage/counters.json" | python3 -m json.tool 2>/dev/null | head -20 || cat "$SERVER_DIR/.rate-limit-storage/counters.json"
else
    echo "   ❌ 파일 없음"
fi
echo ""

# 2. 이미지 캐시 확인
echo "2️⃣ 이미지 캐시:"
if [ -f "$SERVER_DIR/.image-cache/index.json" ]; then
    echo "   ✅ 파일 존재"
    CACHE_COUNT=$(cat "$SERVER_DIR/.image-cache/index.json" | python3 -c "import sys, json; data=json.load(sys.stdin); print(len(data))" 2>/dev/null || echo "0")
    echo "   캐시된 이미지 수: $CACHE_COUNT"
    echo "   내용:"
    cat "$SERVER_DIR/.image-cache/index.json" | python3 -m json.tool 2>/dev/null | head -30 || cat "$SERVER_DIR/.image-cache/index.json"
else
    echo "   ❌ 파일 없음"
fi
echo ""

# 3. Supabase Storage 확인 안내
echo "3️⃣ Supabase Storage:"
echo "   Supabase 대시보드에서 확인하세요:"
echo "   https://supabase.com/dashboard/project/[project-id]/storage/buckets/keycap-images"
echo ""

