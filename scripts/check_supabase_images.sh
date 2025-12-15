#!/bin/bash

# Supabase Storage 이미지 확인 스크립트
# 환경 변수에서 Supabase 정보 가져오기

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SERVER_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

# .env.local 파일에서 Supabase 정보 읽기
if [ -f "$SERVER_DIR/.env.local" ]; then
    source <(grep -E "^SUPABASE_" "$SERVER_DIR/.env.local" | sed 's/^/export /')
fi

if [ -z "$SUPABASE_URL" ] || [ -z "$SUPABASE_KEY" ]; then
    echo "❌ Supabase 환경 변수가 설정되지 않았습니다."
    echo "   .env.local 파일에 SUPABASE_URL과 SUPABASE_KEY를 설정하세요."
    exit 1
fi

echo "📦 Supabase Storage 이미지 확인"
echo "   URL: $SUPABASE_URL"
echo "   Bucket: ${SUPABASE_BUCKET:-keycap-images}"
echo ""

# Supabase CLI가 있으면 사용, 없으면 curl로 확인
if command -v supabase &> /dev/null; then
    echo "✅ Supabase CLI 사용"
    supabase storage list "$SUPABASE_BUCKET" --project-url "$SUPABASE_URL" --key "$SUPABASE_KEY"
else
    echo "ℹ️ Supabase CLI가 없습니다. 수동으로 확인하세요:"
    echo "   https://supabase.com/dashboard/project/[project-id]/storage/buckets/keycap-images"
fi

