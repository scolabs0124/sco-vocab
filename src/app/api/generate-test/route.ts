import { createAdminClient } from '@/lib/supabase/server'
import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

interface Word {
  id: string
  english: string
  korean: string
  unit_id: string
  book_id: string
}

interface GeneratedQuestion {
  word_id: string
  question_order: number
  question_type: string
  direction: string
  question_text: string
  choices: string[] | null
  correct_answer: string
}

// Fisher-Yates 셔플
function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

// 4지선다 보기 생성
function pickDistractors(correct: Word, pool: Word[], direction: string): string[] {
  const correctAnswer = direction === 'en_to_ko' ? correct.korean : correct.english
  const normalizedCorrect = correctAnswer.toLowerCase().replace(/[,\s]/g, '')

  // 같은 단원 우선, 그 다음 같은 교재
  const sameUnit = pool.filter((w) => w.id !== correct.id && w.unit_id === correct.unit_id)
  const sameBook = pool.filter((w) => w.id !== correct.id && w.unit_id !== correct.unit_id)

  const candidates = shuffle([...sameUnit, ...sameBook])
    .map((w) => (direction === 'en_to_ko' ? w.korean : w.english))
    .filter((ans) => ans.toLowerCase().replace(/[,\s]/g, '') !== normalizedCorrect)
    .slice(0, 3)

  // 보기가 3개 미만이면 패딩
  while (candidates.length < 3) {
    candidates.push('(없음)')
  }

  // 정답 포함 후 셔플
  const choices = shuffle([correctAnswer, ...candidates.slice(0, 3)])
  return choices
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const adminSupabase = await createAdminClient()

    // 현재 로그인 사용자 확인
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 })
    }

    // 학생 정보 조회
    const { data: studentData } = await adminSupabase
      .from('students')
      .select('id')
      .eq('profile_id', user.id)
      .single()

    if (!studentData) {
      return NextResponse.json({ error: '학생 정보를 찾을 수 없습니다.' }, { status: 404 })
    }

    const studentId = studentData.id

    // 테스트 설정 조회
    const { data: settings } = await adminSupabase
      .from('test_settings')
      .select('*')
      .eq('student_id', studentId)
      .single()

    if (!settings) {
      return NextResponse.json({ error: '테스트 설정이 없습니다. 관리자에게 문의하세요.' }, { status: 404 })
    }

    const totalCount = settings.daily_question_count || 30
    const ratioWrong = settings.ratio_wrong || 40
    const ratioReview = settings.ratio_review || 30
    const ratioNew = settings.ratio_new || 30
    const direction = settings.question_direction || 'en_to_ko'
    const questionType = settings.question_type || 'multiple'

    const wrongTarget = Math.round(totalCount * ratioWrong / 100)
    const reviewTarget = Math.round(totalCount * ratioReview / 100)
    const newTarget = totalCount - wrongTarget - reviewTarget

    // 단원 범위 내 단어 풀 조회
    const { data: allUnits } = await adminSupabase
      .from('word_units')
      .select('id, unit_order')
      .eq('book_id', settings.book_id)
      .gte('unit_order', settings.unit_from || 1)
      .lte('unit_order', settings.unit_to || 999)

    if (!allUnits || allUnits.length === 0) {
      return NextResponse.json({ error: '해당 단원 범위에 단어가 없습니다.' }, { status: 404 })
    }

    const unitIds = allUnits.map((u: any) => u.id)

    const { data: wordPool } = await adminSupabase
      .from('words')
      .select('id, english, korean, unit_id, book_id')
      .in('unit_id', unitIds)

    if (!wordPool || wordPool.length === 0) {
      return NextResponse.json({ error: '단어가 없습니다.' }, { status: 404 })
    }

    // 1. 오답 단어 (wrong_words)
    const { data: wrongWords } = await adminSupabase
      .from('wrong_words')
      .select('word_id')
      .eq('student_id', studentId)
      .eq('is_completed', false)
      .gt('review_remaining_count', 0)
      .order('last_wrong_date', { ascending: true })
      .limit(wrongTarget)

    const wrongWordIds = new Set((wrongWords || []).map((w: any) => w.word_id))

    // 2. 복습 단어 (word_history - 오래된 순)
    const { data: historyWords } = await adminSupabase
      .from('word_history')
      .select('word_id')
      .eq('student_id', studentId)
      .not('word_id', 'in', `(${[...wrongWordIds].join(',') || 'null'})`)
      .order('last_seen_date', { ascending: true })
      .limit(reviewTarget)

    const reviewWordIds = new Set((historyWords || []).map((w: any) => w.word_id))

    // 3. 신규 단어 (한 번도 본 적 없는)
    const seenWordIds = new Set([...wrongWordIds, ...reviewWordIds])
    const { data: seenHistory } = await adminSupabase
      .from('word_history')
      .select('word_id')
      .eq('student_id', studentId)

    const allSeenIds = new Set([
      ...seenWordIds,
      ...(seenHistory || []).map((w: any) => w.word_id),
    ])

    const newWords = shuffle(wordPool.filter((w: any) => !allSeenIds.has(w.id))).slice(0, newTarget)

    // 부족분 보충
    const wrongWordsData = wordPool.filter((w: any) => wrongWordIds.has(w.id))
    const reviewWordsData = wordPool.filter((w: any) => reviewWordIds.has(w.id))

    let selectedWords: Word[] = [...wrongWordsData, ...reviewWordsData, ...newWords]

    // 부족하면 이미 본 단어로 보충
    if (selectedWords.length < totalCount) {
      const usedIds = new Set(selectedWords.map((w) => w.id))
      const extra = shuffle(wordPool.filter((w: any) => !usedIds.has(w.id))).slice(0, totalCount - selectedWords.length)
      selectedWords = [...selectedWords, ...extra]
    }

    selectedWords = shuffle(selectedWords).slice(0, totalCount)

    // 문항 생성
    const questions: GeneratedQuestion[] = selectedWords.map((word, idx) => {
      let dir = direction
      if (direction === 'mixed') {
        dir = Math.random() > 0.5 ? 'en_to_ko' : 'ko_to_en'
      }

      const questionText = dir === 'en_to_ko' ? word.english : word.korean
      const correctAnswer = dir === 'en_to_ko' ? word.korean : word.english

      let type = questionType
      if (questionType === 'mixed') {
        type = Math.random() > 0.5 ? 'multiple' : 'short'
      }

      let choices: string[] | null = null
      if (type === 'multiple') {
        choices = pickDistractors(word, wordPool, dir)
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

    // tests 테이블에 INSERT
    const today = new Date().toISOString().split('T')[0]
    const { data: testData, error: testError } = await adminSupabase
      .from('tests')
      .insert({
        student_id: studentId,
        test_date: today,
        total_count: questions.length,
        correct_count: 0,
        wrong_count: 0,
        is_review: false,
        status: 'in_progress',
      })
      .select('id')
      .single()

    if (testError || !testData) {
      return NextResponse.json({ error: `테스트 생성 실패: ${testError?.message}` }, { status: 500 })
    }

    const testId = testData.id

    // test_questions INSERT
    const questionsToInsert = questions.map((q) => ({
      test_id: testId,
      word_id: q.word_id,
      question_order: q.question_order,
      question_type: q.question_type,
      direction: q.direction,
      question_text: q.question_text,
      choices: q.choices,
      correct_answer: q.correct_answer,
      student_answer: null,
      is_correct: null,
    }))

    const { error: qError } = await adminSupabase.from('test_questions').insert(questionsToInsert)

    if (qError) {
      await adminSupabase.from('tests').delete().eq('id', testId)
      return NextResponse.json({ error: `문항 생성 실패: ${qError.message}` }, { status: 500 })
    }

    // 학생에게 반환 시 correct_answer 제외
    const questionsForStudent = questions.map(({ correct_answer, ...q }) => q)

    return NextResponse.json({ testId, questions: questionsForStudent })
  } catch (err: any) {
    console.error('generate-test error:', err)
    return NextResponse.json({ error: err.message || '서버 오류' }, { status: 500 })
  }
}
