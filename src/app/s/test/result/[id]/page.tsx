'use client'
export const dynamic = 'force-dynamic'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

interface TestResult {
  id: string
  total_count: number
  correct_count: number
  wrong_count: number
  test_date: string
  status: string
}

interface QuestionResult {
  id: string
  question_text: string
  correct_answer: string
  student_answer: string
  is_correct: boolean
  direction: string
  question_type: string
}

export default function TestResultPage() {
  const [test, setTest] = useState<TestResult | null>(null)
  const [questions, setQuestions] = useState<QuestionResult[]>([])
  const [loading, setLoading] = useState(true)
  const [showDetails, setShowDetails] = useState(false)
  const router = useRouter()
  const params = useParams()
  const testId = params.id as string
  const supabase = createClient()

  useEffect(() => {
    loadResult()
  }, [testId])

  const loadResult = async () => {
    const { data: testData } = await supabase
      .from('tests')
      .select('*')
      .eq('id', testId)
      .single()

    if (testData) setTest(testData)

    const { data: qs } = await supabase
      .from('test_questions')
      .select('*')
      .eq('test_id', testId)
      .order('question_order', { ascending: true })

    if (qs) setQuestions(qs)
    setLoading(false)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-400">불러오는 중...</p>
      </div>
    )
  }

  if (!test) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-500">결과를 찾을 수 없습니다.</p>
      </div>
    )
  }

  const score = Math.round((test.correct_count / test.total_count) * 100)
  const wrongQuestions = questions.filter((q) => !q.is_correct)

  const getScoreEmoji = () => {
    if (score >= 90) return '🏆'
    if (score >= 80) return '🎉'
    if (score >= 70) return '👍'
    if (score >= 60) return '😊'
    return '💪'
  }

  const getScoreMessage = () => {
    if (score >= 90) return '완벽해요!'
    if (score >= 80) return '잘했어요!'
    if (score >= 70) return '좋아요!'
    if (score >= 60) return '조금 더 노력해요!'
    return '다시 복습해봐요!'
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-blue-50">
      {/* 헤더 */}
      <header className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between">
        <Link href="/s" className="text-indigo-600 text-sm">← 홈으로</Link>
        <span className="font-semibold text-gray-900 text-sm">테스트 결과</span>
        <div />
      </header>

      <div className="max-w-md mx-auto px-4 py-6 space-y-4">
        {/* 점수 카드 */}
        <div className="bg-white rounded-2xl p-6 shadow-sm text-center">
          <div className="text-5xl mb-3">{getScoreEmoji()}</div>
          <p className="text-gray-500 text-sm">{new Date(test.test_date).toLocaleDateString('ko-KR')}</p>
          <div className="mt-4">
            <p className="text-5xl font-bold text-indigo-600">{score}점</p>
            <p className="text-gray-500 mt-1">{getScoreMessage()}</p>
          </div>

          <div className="flex justify-center gap-8 mt-6">
            <div className="text-center">
              <p className="text-2xl font-bold text-green-500">{test.correct_count}</p>
              <p className="text-xs text-gray-400">정답</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-red-400">{test.wrong_count}</p>
              <p className="text-xs text-gray-400">오답</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-gray-600">{test.total_count}</p>
              <p className="text-xs text-gray-400">전체</p>
            </div>
          </div>
        </div>

        {/* 오답 목록 */}
        {wrongQuestions.length > 0 && (
          <div className="bg-white rounded-2xl p-5 shadow-sm">
            <button
              onClick={() => setShowDetails(!showDetails)}
              className="w-full flex items-center justify-between"
            >
              <h3 className="font-semibold text-gray-700">
                오답 단어 ({wrongQuestions.length}개)
              </h3>
              <span className="text-gray-400">{showDetails ? '▲' : '▼'}</span>
            </button>

            {showDetails && (
              <div className="mt-4 space-y-2">
                {wrongQuestions.map((q) => (
                  <div key={q.id} className="bg-red-50 rounded-xl p-3">
                    <div className="flex items-start justify-between">
                      <p className="font-medium text-gray-900">{q.question_text}</p>
                      <span className="text-red-400 text-xs ml-2 shrink-0">오답</span>
                    </div>
                    <p className="text-green-600 text-sm mt-1">
                      정답: {q.correct_answer}
                    </p>
                    {q.student_answer && q.student_answer !== '__SKIP__' && (
                      <p className="text-red-400 text-sm">
                        내 답: {q.student_answer}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* 액션 버튼 */}
        <div className="space-y-3">
          {wrongQuestions.length > 0 && (
            <Link
              href="/s/wrong/test"
              className="block w-full bg-red-500 text-white py-3 rounded-xl font-semibold text-center hover:bg-red-600 transition"
            >
              오답 집중 복습 시작
            </Link>
          )}
          <Link
            href="/s"
            className="block w-full bg-indigo-600 text-white py-3 rounded-xl font-semibold text-center hover:bg-indigo-700 transition"
          >
            홈으로 돌아가기
          </Link>
        </div>
      </div>
    </div>
  )
}
