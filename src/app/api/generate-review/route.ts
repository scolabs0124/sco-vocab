import { createAdminClient } from '@/lib/supabase/server'
import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

function pickDistractors(correct: any, pool: any[], direction: string): string[] {
  const correctAnswer = direction === 'en_to_ko' ? correct.korean : correct.english
  const normalizedCorrect = correctAnswer.toLowerCase().replace(/[,\s]/g, '')

  const sameUnit = pool.filter((w) => w.id !== correct.id && w.unit_id === correct.unit_id)
  const sameBook = pool.filter((w) => w.id !== correct.id && w.unit_id !== correct.unit_id)

  const candidates = shuffle([...sameUnit, ...sameBook])
    .map((w) => (direction === 'en_to_ko' ? w.korean : w.english))
    .filter((ans) => ans.toLowerCase().replace(/[,\s]/g, '') !== normalizedCorrect)
    .slice(0, 3)

  while (candidates.length < 3) candidates.push('(없음)')
  return shuffle([correctAnswer, ...candidates.slice(0, 3)])
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const adminSupabase = await createAdminClient()

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 })
    }

    const { data: studentData } = await adminSupabase
      .from('students')
      .select('id')
      .eq('profile_id', user.id)
      .single()

    if (!studentData) {
      return NextResponse.json({ error: '학생 정보를 찾을 수 없습니다.' }, { status: 404 })
    }

    const studentId = studentData.id

    // 오답 단어 조회
    const { data: wrongWords } = await adminSupabase
      .from('wrong_words')
      .select('word_id')
      .eq('student_id', studentId)
      .eq('is_completed', false)
      .gt('review_remaining_count', 0)
      .order('last_wrong_date', { ascending: true })
      .limit(30)

    if (!wrongWords || wrongWords.length === 0) {
      return NextResponse.json({ error: '복습할 오답 단어가 없습니다.' }, { status: 404 })
    }

    const wordIds = wrongWords.map((w: any) => w.word_id)

    const { data: words } = await adminSupabase
      .from('words')
      .select('id, english, korean, unit_id, book_id')
      .in('id', wordIds)

    if (!words || words.length === 0) {
      return NextResponse.json({ error: '단어를 찾을 수 없습니다.' }, { status: 404 })
    }

    // 같은 교재의 단어 풀 (보기용)
    const bookIds = [...new Set(words.map((w: any) => w.book_id))]
    const { data: wordPool } = await adminSupabase
      .from('words')
      .select('id, english, korean, unit_id, book_id')
      .in('book_id', bookIds)

    const settings = await adminSupabase
      .from('test_settings')
      .select('question_direction, question_type')
      .eq('student_id', studentId)
      .single()

    const direction = settings.data?.question_direction || 'en_to_ko'
    const questionType = settings.data?.question_type || 'multiple'

    const shuffledWords = shuffle(words)
    const questions = shuffledWords.map((word: any, idx: number) => {
      let dir = direction
      if (direction === 'mixed') dir = Math.random() > 0.5 ? 'en_to_ko' : 'ko_to_en'

      let type = questionType
      if (questionType === 'mixed') type = Math.random() > 0.5 ? 'multiple' : 'short'

      const questionText = dir === 'en_to_ko' ? word.english : word.korean
      const correctAnswer = dir === 'en_to_ko' ? word.korean : word.english

      let choices = null
      if (type === 'multiple') {
        choices = pickDistractors(word, wordPool || [], dir)
      }

      return {
        word_id: word.id,
        question_order: idx + 1,
        question_type: type,
        direction: dir,
        question_text: questionText,
        choices,
        correct_answer: correctAnswer,
      }
    })

    // tests INSERT
    const today = new Date().toISOString().split('T')[0]
    const { data: testData, error: testError } = await adminSupabase
      .from('tests')
      .insert({
        student_id: studentId,
        test_date: today,
        total_count: questions.length,
        correct_count: 0,
        wrong_count: 0,
        is_review: true,
        status: 'in_progress',
      })
      .select('id')
      .single()

    if (testError || !testData) {
      return NextResponse.json({ error: `테스트 생성 실패: ${testError?.message}` }, { status: 500 })
    }

    const testId = testData.id

    const { error: qError } = await adminSupabase.from('test_questions').insert(
      questions.map((q) => ({ ...q, test_id: testId, student_answer: null, is_correct: null }))
    )

    if (qError) {
      await adminSupabase.from('tests').delete().eq('id', testId)
      return NextResponse.json({ error: `문항 생성 실패: ${qError.message}` }, { status: 500 })
    }

    const questionsForStudent = questions.map(({ correct_answer, ...q }) => q)
    return NextResponse.json({ testId, questions: questionsForStudent })
  } catch (err: any) {
    console.error('generate-review error:', err)
    return NextResponse.json({ error: err.message || '서버 오류' }, { status: 500 })
  }
}
