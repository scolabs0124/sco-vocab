import { createAdminClient } from '@/lib/supabase/server'
import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

// 채점 함수
function gradeAnswer(
  studentAnswer: string,
  correctAnswer: string,
  direction: string,
  questionType: string
): boolean {
  if (!studentAnswer) return false

  const sa = studentAnswer.trim()
  const ca = correctAnswer.trim()

  if (questionType === 'multiple') {
    // 4지선다: 정확히 일치
    return sa === ca
  }

  // 주관식
  if (direction === 'ko_to_en') {
    // 영어: 대소문자 무시
    return sa.toLowerCase() === ca.toLowerCase()
  } else {
    // 한글: 쉼표로 분리 후 하나라도 포함되면 정답
    const answers = ca.split(/[,，]/).map((a) => a.trim())
    return answers.some((a) => sa.includes(a) || a.includes(sa))
  }
}

// 오답 순환 로직
async function updateWrongWord(
  supabase: any,
  studentId: string,
  wordId: string,
  isCorrect: boolean,
  wrongReviewCount: number
) {
  const { data: existing } = await supabase
    .from('wrong_words')
    .select('*')
    .eq('student_id', studentId)
    .eq('word_id', wordId)
    .single()

  if (isCorrect) {
    if (!existing || existing.is_completed) return

    const newCount = existing.review_remaining_count - 1
    if (newCount <= 0) {
      await supabase
        .from('wrong_words')
        .update({ review_remaining_count: 0, is_completed: true })
        .eq('id', existing.id)
    } else {
      await supabase
        .from('wrong_words')
        .update({ review_remaining_count: newCount })
        .eq('id', existing.id)
    }
  } else {
    // 오답
    if (!existing) {
      await supabase.from('wrong_words').insert({
        student_id: studentId,
        word_id: wordId,
        wrong_count: 1,
        review_remaining_count: wrongReviewCount,
        last_wrong_date: new Date().toISOString(),
        is_completed: false,
      })
    } else {
      await supabase
        .from('wrong_words')
        .update({
          wrong_count: existing.wrong_count + 1,
          review_remaining_count: wrongReviewCount,
          last_wrong_date: new Date().toISOString(),
          is_completed: false,
        })
        .eq('id', existing.id)
    }
  }
}

// word_history 업데이트
async function updateWordHistory(
  supabase: any,
  studentId: string,
  wordId: string,
  isCorrect: boolean
) {
  const today = new Date().toISOString().split('T')[0]

  const { data: existing } = await supabase
    .from('word_history')
    .select('*')
    .eq('student_id', studentId)
    .eq('word_id', wordId)
    .single()

  if (!existing) {
    await supabase.from('word_history').insert({
      student_id: studentId,
      word_id: wordId,
      last_seen_date: today,
      seen_count: 1,
      correct_count: isCorrect ? 1 : 0,
    })
  } else {
    await supabase
      .from('word_history')
      .update({
        last_seen_date: today,
        seen_count: existing.seen_count + 1,
        correct_count: existing.correct_count + (isCorrect ? 1 : 0),
      })
      .eq('id', existing.id)
  }
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const adminSupabase = await createAdminClient()

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 })
    }

    const { testId, answers } = await req.json()
    // answers: [{ questionId, studentAnswer }]

    if (!testId || !answers || !Array.isArray(answers)) {
      return NextResponse.json({ error: '잘못된 요청입니다.' }, { status: 400 })
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

    // 테스트 설정 조회 (오답 복습 횟수)
    const { data: settings } = await adminSupabase
      .from('test_settings')
      .select('wrong_review_count')
      .eq('student_id', studentId)
      .single()

    const wrongReviewCount = settings?.wrong_review_count || 3

    // 문항 조회
    const { data: questions } = await adminSupabase
      .from('test_questions')
      .select('*')
      .eq('test_id', testId)

    if (!questions) {
      return NextResponse.json({ error: '문항을 찾을 수 없습니다.' }, { status: 404 })
    }

    let correctCount = 0
    let wrongCount = 0
    const results: { questionId: string; isCorrect: boolean; correctAnswer: string }[] = []

    for (const answer of answers) {
      const question = questions.find((q: any) => q.id === answer.questionId)
      if (!question) continue

      const isCorrect = gradeAnswer(
        answer.studentAnswer,
        question.correct_answer,
        question.direction,
        question.question_type
      )

      if (isCorrect) correctCount++
      else wrongCount++

      // test_questions 업데이트
      await adminSupabase
        .from('test_questions')
        .update({ student_answer: answer.studentAnswer, is_correct: isCorrect })
        .eq('id', question.id)

      // 오답 순환 로직
      await updateWrongWord(adminSupabase, studentId, question.word_id, isCorrect, wrongReviewCount)

      // 학습 이력 업데이트
      await updateWordHistory(adminSupabase, studentId, question.word_id, isCorrect)

      results.push({ questionId: question.id, isCorrect, correctAnswer: question.correct_answer })
    }

    // tests 테이블 업데이트
    await adminSupabase
      .from('tests')
      .update({
        correct_count: correctCount,
        wrong_count: wrongCount,
        status: 'done',
      })
      .eq('id', testId)

    return NextResponse.json({
      success: true,
      correctCount,
      wrongCount,
      totalCount: questions.length,
      results,
    })
  } catch (err: any) {
    console.error('submit-answer error:', err)
    return NextResponse.json({ error: err.message || '서버 오류' }, { status: 500 })
  }
}
