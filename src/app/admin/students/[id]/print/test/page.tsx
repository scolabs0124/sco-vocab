export const dynamic = 'force-dynamic'
import { createAdminClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import PrintTestClient from './PrintTestClient'

interface Props {
  params: Promise<{ id: string }>
  searchParams: Promise<{ type?: string; count?: string; sort?: string }>
}

export default async function AdminPrintTestPage({ params, searchParams }: Props) {
  const { id } = await params
  const { type = 'A', count = '30', sort = 'alpha' } = await searchParams
  const supabase = await createAdminClient()

  const { data: student } = await supabase
    .from('students')
    .select('id, name, grade, class_name')
    .eq('id', id)
    .single()

  if (!student) return notFound()

  const { data: settings } = await supabase
    .from('test_settings')
    .select('*, books(book_name)')
    .eq('student_id', id)
    .single()

  let words: { id: string; english: string; korean: string; unit_id: string; units?: { unit_name: string } | null }[] = []

  if (settings?.book_id) {
    const { data: unitData } = await supabase
      .from('units')
      .select('id, unit_name, unit_order')
      .eq('book_id', settings.book_id)
      .gte('unit_order', settings.unit_from || 1)
      .lte('unit_order', settings.unit_to || 999)
      .order('unit_order')

    if (unitData && unitData.length > 0) {
      const unitIds = unitData.map(u => u.id)
      const wordCount = Math.min(parseInt(count) || 30, 100)

      let query = supabase
        .from('words')
        .select('id, english, korean, unit_id')
        .in('unit_id', unitIds)
        .limit(wordCount)

      if (sort === 'alpha') {
        query = query.order('english')
      } else {
        query = query.order('unit_id').order('english')
      }

      const { data: wordData } = await query
      if (wordData) {
        const unitMap = Object.fromEntries(unitData.map(u => [u.id, u.unit_name]))
        words = wordData.map(w => ({
          ...w,
          units: { unit_name: unitMap[w.unit_id] || '' }
        }))
      }
    }
  }

  // 4지선다용 보기 생성 (유형 C)
  let allWords: { english: string; korean: string }[] = []
  if (type === 'C' && settings?.book_id) {
    const { data: allWordData } = await supabase
      .from('words')
      .select('english, korean')
      .eq('book_id', settings.book_id)
    allWords = allWordData || []
  }

  const bookName = settings?.books?.book_name || ''
  const today = new Date().toLocaleDateString('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit' })

  return (
    <PrintTestClient
      student={student}
      words={words}
      allWords={allWords}
      bookName={bookName}
      today={today}
      type={type as 'A' | 'B' | 'C'}
    />
  )
}
