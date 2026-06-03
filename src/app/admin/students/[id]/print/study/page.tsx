export const dynamic = 'force-dynamic'
import { createAdminClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import PrintStudyClient from './PrintStudyClient'

interface Props {
  params: Promise<{ id: string }>
}

export default async function AdminPrintStudyPage({ params }: Props) {
  const { id } = await params
  const supabase = await createAdminClient()

  // 학생 정보
  const { data: student } = await supabase
    .from('students')
    .select('id, name, grade, class_name')
    .eq('id', id)
    .single()

  if (!student) return notFound()

  // 테스트 설정
  const { data: settings } = await supabase
    .from('test_settings')
    .select('*, books(book_name), units_from:units!unit_from_id(unit_name), units_to:units!unit_to_id(unit_name)')
    .eq('student_id', id)
    .single()

  // 단어 목록 (설정된 교재/단원 범위)
  let words: { id: string; english: string; korean: string; unit_id: string; units?: { unit_name: string } | null }[] = []

  if (settings?.book_id) {
    // 단원 범위 내 단어 조회
    const { data: unitData } = await supabase
      .from('units')
      .select('id, unit_name, unit_order')
      .eq('book_id', settings.book_id)
      .gte('unit_order', settings.unit_from || 1)
      .lte('unit_order', settings.unit_to || 999)
      .order('unit_order')

    if (unitData && unitData.length > 0) {
      const unitIds = unitData.map(u => u.id)
      const { data: wordData } = await supabase
        .from('words')
        .select('id, english, korean, unit_id')
        .in('unit_id', unitIds)
        .order('unit_id')
        .order('english')
        .limit(settings.daily_question_count || 30)

      if (wordData) {
        // unit_name 매핑
        const unitMap = Object.fromEntries(unitData.map(u => [u.id, u.unit_name]))
        words = wordData.map(w => ({
          ...w,
          units: { unit_name: unitMap[w.unit_id] || '' }
        }))
      }
    }
  }

  const bookName = settings?.books?.book_name || ''
  const today = new Date().toLocaleDateString('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit' })

  return (
    <PrintStudyClient
      student={student}
      words={words}
      bookName={bookName}
      today={today}
    />
  )
}
