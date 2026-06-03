export const dynamic = 'force-dynamic'
import { createAdminClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'
import { redirect } from 'next/navigation'
import PrintStudyClient from '@/app/admin/students/[id]/print/study/PrintStudyClient'

export default async function StudentPrintStudyPage() {
  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
  )

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const adminClient = await createAdminClient()

  const { data: student } = await adminClient
    .from('students')
    .select('id, name, grade, class_name')
    .eq('profile_id', user.id)
    .single()

  if (!student) redirect('/s')

  const { data: settings } = await adminClient
    .from('test_settings')
    .select('*, books(book_name)')
    .eq('student_id', student.id)
    .single()

  let words: { id: string; english: string; korean: string; unit_id: string; units?: { unit_name: string } | null }[] = []

  if (settings?.book_id) {
    const { data: unitData } = await adminClient
      .from('units')
      .select('id, unit_name, unit_order')
      .eq('book_id', settings.book_id)
      .gte('unit_order', settings.unit_from || 1)
      .lte('unit_order', settings.unit_to || 999)
      .order('unit_order')

    if (unitData && unitData.length > 0) {
      const unitIds = unitData.map(u => u.id)
      const { data: wordData } = await adminClient
        .from('words')
        .select('id, english, korean, unit_id')
        .in('unit_id', unitIds)
        .order('unit_id')
        .order('english')
        .limit(settings.daily_question_count || 30)

      if (wordData) {
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
