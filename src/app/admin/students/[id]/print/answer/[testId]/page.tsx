import { createAdminClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import PrintAnswerClient from './PrintAnswerClient'

interface Props {
  params: Promise<{ id: string; testId: string }>
}

export default async function AdminPrintAnswerPage({ params }: Props) {
  const { id, testId } = await params
  const supabase = await createAdminClient()

  const { data: student } = await supabase
    .from('students')
    .select('id, name, grade, class_name')
    .eq('id', id)
    .single()

  if (!student) return notFound()

  // 테스트 정보
  const { data: test } = await supabase
    .from('tests')
    .select('*, test_settings(books(book_name))')
    .eq('id', testId)
    .single()

  if (!test) return notFound()

  // 테스트 문제 + 단어 정보
  const { data: questions } = await supabase
    .from('test_questions')
    .select('*, words(english, korean)')
    .eq('test_id', testId)
    .order('question_order')

  const bookName = test.test_settings?.books?.book_name || ''
  const today = new Date().toLocaleDateString('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit' })
  const testDate = new Date(test.test_date).toLocaleDateString('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit' })

  return (
    <PrintAnswerClient
      student={student}
      questions={questions || []}
      bookName={bookName}
      today={today}
      testDate={testDate}
      testInfo={{
        totalCount: test.total_count,
        correctCount: test.correct_count,
        wrongCount: test.wrong_count,
        status: test.status,
      }}
    />
  )
}
