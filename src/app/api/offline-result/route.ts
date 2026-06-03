import { createAdminClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  const { studentId, bookId, unitFrom, unitTo, wordCount, results, testDate } = await req.json()
  // results: [{ wordId, isCorrect, studentAnswer }]

  if (!studentId || !results || !Array.isArray(results)) {
    return NextResponse.json({ error: '필수 데이터가 없습니다.' }, { status: 400 })
  }

  const supabase = await createAdminClient()
  const today = testDate || new Date().toISOString().split('T')[0]

  // 테스트 설정 조회
  const { data: settings } = await supabase
    .from('test_settings')
    .select('id')
    .eq('student_id', studentId)
    .single()

  if (!settings) {
    return NextResponse.json({ error: '테스트 설정이 없습니다.' }, { status: 400 })
  }

  const correctCount = results.filter(r => r.isCorrect).length
  const wrongCount = results.filter(r => !r.isCorrect).length
  const totalCount = results.length

  // 테스트 레코드 생성
  const { data: test, error: testError } = await supabase
    .from('tests')
    .insert({
      student_id: studentId,
      settings_id: settings.id,
      test_date: today,
      status: 'done',
      correct_count: correctCount,
      wrong_count: wrongCount,
      total_count: totalCount,
      source: 'paper',
    })
    .select('id')
    .single()

  if (testError || !test) {
    return NextResponse.json({ error: testError?.message || '테스트 생성 실패' }, { status: 400 })
  }

  // 문제별 결과 저장
  const questionInserts = results.map((r, idx) => ({
    test_id: test.id,
    word_id: r.wordId,
    question_order: idx + 1,
    question_type: 'short',
    direction: 'en_to_ko',
    question_text: r.english || '',
    choices: null,
    correct_answer: r.korean || '',
    student_answer: r.studentAnswer || null,
    is_correct: r.isCorrect,
    answered_at: new Date().toISOString(),
  }))

  const { error: qError } = await supabase
    .from('test_questions')
    .insert(questionInserts)

  if (qError) {
    console.error('문제 저장 오류:', qError)
  }

  // 오답 단어 wrong_words 업데이트
  for (const r of results) {
    if (!r.isCorrect && r.wordId) {
      const { data: existing } = await supabase
        .from('wrong_words')
        .select('id, wrong_count, consecutive_correct')
        .eq('student_id', studentId)
        .eq('word_id', r.wordId)
        .single()

      if (existing) {
        await supabase
          .from('wrong_words')
          .update({
            wrong_count: (existing.wrong_count || 0) + 1,
            consecutive_correct: 0,
            last_wrong_at: new Date().toISOString(),
          })
          .eq('id', existing.id)
      } else {
        await supabase
          .from('wrong_words')
          .insert({
            student_id: studentId,
            word_id: r.wordId,
            wrong_count: 1,
            consecutive_correct: 0,
            last_wrong_at: new Date().toISOString(),
          })
      }
    } else if (r.isCorrect && r.wordId) {
      // 정답 시 연속 정답 카운트 증가
      const { data: existing } = await supabase
        .from('wrong_words')
        .select('id, consecutive_correct')
        .eq('student_id', studentId)
        .eq('word_id', r.wordId)
        .single()

      if (existing) {
        const newConsecutive = (existing.consecutive_correct || 0) + 1
        if (newConsecutive >= 3) {
          // 3번 연속 정답 → 오답 목록에서 제거
          await supabase.from('wrong_words').delete().eq('id', existing.id)
        } else {
          await supabase
            .from('wrong_words')
            .update({ consecutive_correct: newConsecutive })
            .eq('id', existing.id)
        }
      }
    }
  }

  return NextResponse.json({
    success: true,
    testId: test.id,
    correctCount,
    wrongCount,
    totalCount,
    score: Math.round((correctCount / totalCount) * 100),
  })
}
