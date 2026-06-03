import { createAdminClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import Papa from 'papaparse'
import * as XLSX from 'xlsx'

// 헤더 별칭 매핑
const HEADER_ALIASES: Record<string, string> = {
  '영어': 'english', '단어': 'english', 'word': 'english', 'english': 'english', 'words': 'english',
  '한글': 'korean', '뜻': 'korean', '의미': 'korean', 'korean': 'korean', 'meaning': 'korean',
  '단원': 'unit', 'day': 'unit', 'unit': 'unit', 'chapter': 'unit',
  '교재': 'book_name', '책': 'book_name', 'book': 'book_name', 'book_name': 'book_name',
  '레벨': 'level', 'level': 'level',
  '메모': 'memo', 'memo': 'memo',
}

function normalizeHeader(header: string): string {
  const lower = header.toLowerCase().trim()
  return HEADER_ALIASES[lower] || lower
}

function parseRows(rawRows: Record<string, string>[]): {
  valid: { book_name: string; unit: string; english: string; korean: string; level?: string; memo?: string }[]
  skipped: number
} {
  const valid: { book_name: string; unit: string; english: string; korean: string; level?: string; memo?: string }[] = []
  let skipped = 0

  for (const row of rawRows) {
    const normalized: Record<string, string> = {}
    for (const [key, val] of Object.entries(row)) {
      normalized[normalizeHeader(key)] = (val || '').trim()
    }

    const { book_name, unit, english, korean, level, memo } = normalized

    if (!english || !korean) {
      skipped++
      continue
    }

    valid.push({
      book_name: book_name || '기본 교재',
      unit: unit || 'DAY 1',
      english,
      korean,
      level: level || undefined,
      memo: memo || undefined,
    })
  }

  return { valid, skipped }
}

/**
 * 이 파일 특수 구조 파서:
 * - 행0: 섹션 제목 (예: "초등저학년")
 * - 행1: 헤더 (No. | Words | 품사 | Meaning | No. | Words | 품사 | Meaning)
 * - 행2~51: 데이터 (왼쪽 4컬럼 + 오른쪽 4컬럼 = 2개 단어/행)
 * - 행52: 다음 섹션 제목 ...
 */
function parseSpecialXlsx(buffer: ArrayBuffer): {
  valid: { book_name: string; unit: string; english: string; korean: string; level?: string; memo?: string }[]
  skipped: number
} {
  const workbook = XLSX.read(buffer, { type: 'array' })
  const valid: { book_name: string; unit: string; english: string; korean: string }[] = []
  let skipped = 0

  // '초등단어' 또는 첫 번째 시트 사용 (테스트지 시트 제외)
  const targetSheet = workbook.SheetNames.find(n => !n.includes('테스트')) || workbook.SheetNames[0]
  const sheet = workbook.Sheets[targetSheet]
  const rows = XLSX.utils.sheet_to_json<any[]>(sheet, { defval: '', raw: false, header: 1 })

  let currentBookName = '기본 교재'
  let sectionCount = 0

  let i = 0
  while (i < rows.length) {
    const row = rows[i]
    const first = String(row[0] || '').trim()

    // 섹션 제목 행 (숫자가 아니고 No.가 아닌 텍스트)
    if (first && isNaN(Number(first)) && first.toLowerCase() !== 'no.' && first.toLowerCase() !== 'no') {
      currentBookName = first
      sectionCount++
      i++ // 다음은 헤더 행
      i++ // 헤더 행 스킵
      continue
    }

    // 헤더 행 스킵 (No., Words 등)
    if (first.toLowerCase() === 'no.' || first.toLowerCase() === 'no') {
      i++
      continue
    }

    // 데이터 행: 왼쪽(col0~3) + 오른쪽(col4~7)
    const leftNo = String(row[0] || '').trim()
    const leftWord = String(row[1] || '').trim()
    const leftMeaning = String(row[3] || '').trim()

    const rightNo = String(row[4] || '').trim()
    const rightWord = String(row[5] || '').trim()
    const rightMeaning = String(row[7] || '').trim()

    // 단원 번호 계산: No. 기반으로 단원 그룹화 (50개 단위)
    const getUnit = (noStr: string) => {
      const n = parseInt(noStr)
      if (isNaN(n)) return null
      const unitNum = Math.ceil(n / 50)
      return `Unit ${unitNum}`
    }

    if (leftWord && leftMeaning) {
      const unit = getUnit(leftNo) || 'Unit 1'
      valid.push({ book_name: currentBookName, unit, english: leftWord, korean: leftMeaning })
    } else if (leftWord || leftMeaning) {
      skipped++
    }

    if (rightWord && rightMeaning) {
      const unit = getUnit(rightNo) || 'Unit 1'
      valid.push({ book_name: currentBookName, unit, english: rightWord, korean: rightMeaning })
    } else if (rightWord || rightMeaning) {
      skipped++
    }

    i++
  }

  return { valid, skipped }
}

function isSpecialFormat(buffer: ArrayBuffer): boolean {
  try {
    const workbook = XLSX.read(buffer, { type: 'array' })
    const sheet = workbook.Sheets[workbook.SheetNames[0]]
    const rows = XLSX.utils.sheet_to_json<any[]>(sheet, { defval: '', raw: false, header: 1 })
    if (rows.length < 2) return false
    const firstCell = String(rows[0]?.[0] || '').trim()
    const secondRowFirst = String(rows[1]?.[0] || '').trim().toLowerCase()
    // 첫 행이 텍스트 제목이고, 두 번째 행이 No. 헤더인 경우
    return firstCell !== '' && isNaN(Number(firstCell)) && (secondRowFirst === 'no.' || secondRowFirst === 'no')
  } catch {
    return false
  }
}

function extractUnitOrder(unitName: string): number {
  const match = unitName.match(/\d+/)
  return match ? parseInt(match[0], 10) : 0
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createAdminClient()

    const formData = await req.formData()
    const file = formData.get('file') as File | null

    if (!file) {
      return NextResponse.json({ error: '파일이 없습니다.' }, { status: 400 })
    }

    const fileName = file.name.toLowerCase()
    const buffer = await file.arrayBuffer()
    let valid: { book_name: string; unit: string; english: string; korean: string; level?: string; memo?: string }[] = []
    let skipped = 0

    if (fileName.endsWith('.csv')) {
      const text = new TextDecoder('utf-8').decode(buffer)
      const result = Papa.parse<Record<string, string>>(text, {
        header: true,
        skipEmptyLines: true,
        transformHeader: (h) => h.trim(),
      })
      const parsed = parseRows(result.data)
      valid = parsed.valid
      skipped = parsed.skipped
    } else if (fileName.endsWith('.xlsx') || fileName.endsWith('.xls')) {
      // 특수 포맷 감지
      if (isSpecialFormat(buffer)) {
        const parsed = parseSpecialXlsx(buffer)
        valid = parsed.valid
        skipped = parsed.skipped
      } else {
        // 일반 헤더 방식
        const workbook = XLSX.read(buffer, { type: 'array' })
        const sheetName = workbook.SheetNames[0]
        const sheet = workbook.Sheets[sheetName]
        const rawRows = XLSX.utils.sheet_to_json<Record<string, string>>(sheet, { defval: '', raw: false })
        const parsed = parseRows(rawRows)
        valid = parsed.valid
        skipped = parsed.skipped
      }
    } else {
      return NextResponse.json({ error: 'CSV 또는 XLSX 파일만 지원합니다.' }, { status: 400 })
    }

    if (valid.length === 0) {
      return NextResponse.json({ error: '유효한 단어가 없습니다. 헤더를 확인하세요.' }, { status: 400 })
    }

    // 파일 내 중복 제거 (같은 book_name + english 기준)
    const seenKeys = new Set<string>()
    const deduped: typeof valid = []
    for (const row of valid) {
      const key = `${row.book_name}|${row.english.toLowerCase()}`
      if (!seenKeys.has(key)) {
        seenKeys.add(key)
        deduped.push(row)
      }
    }
    valid = deduped

    // 교재별로 그룹화
    const bookMap = new Map<string, typeof valid>()
    for (const row of valid) {
      if (!bookMap.has(row.book_name)) bookMap.set(row.book_name, [])
      bookMap.get(row.book_name)!.push(row)
    }

    let totalInserted = 0
    let totalDuplicates = 0

    for (const [bookName, rows] of bookMap.entries()) {
      const { data: bookData, error: bookError } = await supabase
        .from('books')
        .upsert({ book_name: bookName }, { onConflict: 'book_name' })
        .select('id')
        .single()

      if (bookError || !bookData) {
        return NextResponse.json({ error: `교재 저장 실패: ${bookError?.message}` }, { status: 500 })
      }

      const bookId = bookData.id

      const unitMap = new Map<string, typeof rows>()
      for (const row of rows) {
        if (!unitMap.has(row.unit)) unitMap.set(row.unit, [])
        unitMap.get(row.unit)!.push(row)
      }

      for (const [unitName, unitRows] of unitMap.entries()) {
        const unitOrder = extractUnitOrder(unitName)

        const { data: unitData, error: unitError } = await supabase
          .from('word_units')
          .upsert(
            { book_id: bookId, unit_name: unitName, unit_order: unitOrder },
            { onConflict: 'book_id,unit_name' }
          )
          .select('id')
          .single()

        if (unitError || !unitData) {
          return NextResponse.json({ error: `단원 저장 실패: ${unitError?.message}` }, { status: 500 })
        }

        const unitId = unitData.id

        const { data: existingWords } = await supabase
          .from('words')
          .select('english')
          .eq('book_id', bookId)
          .eq('unit_id', unitId)

        const existingSet = new Set((existingWords || []).map((w: any) => w.english.toLowerCase()))
        const newWords = unitRows.filter((r) => !existingSet.has(r.english.toLowerCase()))
        totalDuplicates += unitRows.length - newWords.length

        if (newWords.length === 0) continue

        const CHUNK_SIZE = 1000
        for (let i = 0; i < newWords.length; i += CHUNK_SIZE) {
          const chunk = newWords.slice(i, i + CHUNK_SIZE).map((r) => ({
            book_id: bookId,
            unit_id: unitId,
            english: r.english,
            korean: r.korean,
            level: r.level || null,
            memo: r.memo || null,
          }))

          const { error: insertError } = await supabase.from('words').insert(chunk)

          if (insertError) {
            return NextResponse.json({ error: `단어 저장 실패: ${insertError.message}` }, { status: 500 })
          }

          totalInserted += chunk.length
        }
      }
    }

    // books 테이블 total_words 업데이트
    for (const [bookName] of bookMap.entries()) {
      const { data: bookData } = await supabase.from('books').select('id').eq('book_name', bookName).single()
      if (bookData) {
        const { count } = await supabase.from('words').select('id', { count: 'exact', head: true }).eq('book_id', bookData.id)
        await supabase.from('books').update({ total_words: count || 0 }).eq('id', bookData.id)
      }
    }

    return NextResponse.json({
      success: true,
      inserted: totalInserted,
      duplicates: totalDuplicates,
      skipped,
      message: `${totalInserted}개 단어 저장 완료 (중복 ${totalDuplicates}개 스킵, 오류 행 ${skipped}개 스킵)`,
    })
  } catch (err: any) {
    console.error('upload-words error:', err)
    return NextResponse.json({ error: err.message || '서버 오류가 발생했습니다.' }, { status: 500 })
  }
}
