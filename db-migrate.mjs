import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'

const env = readFileSync('.env.local', 'utf8')
const get = (k) => env.match(new RegExp(`^${k}=(.+)`, 'm'))?.[1]?.trim() ?? ''

const supabase = createClient(get('NEXT_PUBLIC_SUPABASE_URL'), get('SUPABASE_SERVICE_ROLE_KEY'))

// tests 테이블에 source 컬럼 추가 시도 (없으면 무시)
const { error } = await supabase.from('tests').select('source').limit(1)
if (error && error.message.includes('source')) {
  console.log('source 컬럼 없음 - 추가 필요 (Supabase 대시보드에서 직접 실행)')
  console.log(`ALTER TABLE tests ADD COLUMN IF NOT EXISTS source text DEFAULT 'digital' CHECK (source IN ('digital','paper','mixed'));`)
} else {
  console.log('source 컬럼 이미 존재하거나 확인 완료')
}

// test_questions 테이블 구조 확인
const { data: q, error: qe } = await supabase.from('test_questions').select('*').limit(1)
console.log('test_questions 구조:', q ? Object.keys(q[0] || {}) : qe?.message)

// words 테이블 구조 확인
const { data: w, error: we } = await supabase.from('words').select('*').limit(1)
console.log('words 컬럼:', w ? Object.keys(w[0] || {}) : we?.message)

// books 테이블 구조 확인
const { data: b } = await supabase.from('books').select('*').limit(3)
console.log('books 샘플:', b?.map(x => x.book_name))
