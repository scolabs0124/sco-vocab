'use client'

import { useState, useEffect, useCallback, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

interface Question {
  word_id: string
  question_order: number
  question_type: string
  direction: string
  question_text: string
  choices: string[] | null
}

interface TestQuestion extends Question {
  id: string
}

function TestContent() {
  const [questions, setQuestions] = useState<TestQuestion[]>([])
  const [currentIdx, setCurrentIdx] = useState(0)
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [feedback, setFeedback] = useState<'correct' | 'wrong' | null>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [testId, setTestId] = useState<string | null>(null)
  const [shortAnswer, setShortAnswer] = useState('')

  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = createClient()

  useEffect(() => {
    const tid = searchParams.get('testId')
    const resume = searchParams.get('resume')

    if (tid) {
      setTestId(tid)
      loadExistingTest(tid, resume === 'true')
    } else {
      setError('테스트 ID가 없습니다.')
      setLoading(false)
    }
  }, [])

  const loadExistingTest = async (tid: string, resume: boolean) => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      router.push('/login')
      return
    }

    const { data: qs } = await supabase
      .from('test_questions')
      .select('*')
      .eq('test_id', tid)
      .order('question_order', { ascending: true })

    if (!qs || qs.length === 0) {
      setError('문항을 불러올 수 없습니다.')
      setLoading(false)
      return
    }

    setQuestions(qs)

    if (resume) {
      // 이미 답한 문항 복원
      const answeredMap: Record<string, string> = {}
      let firstUnanswered = 0
      qs.forEach((q: any, idx: number) => {
        if (q.student_answer !== null) {
          answeredMap[q.id] = q.student_answer
          firstUnanswered = idx + 1
        }
      })
      setAnswers(answeredMap)
      setCurrentIdx(Math.min(firstUnanswered, qs.length - 1))
    }

    setLoading(false)
  }

  const currentQuestion = questions[currentIdx]

  const handleAnswer = useCallback(async (answer: string) => {
    if (!currentQuestion || feedback) return

    setAnswers((prev) => ({ ...prev, [currentQuestion.id]: answer }))
    setShortAnswer('')

    // 즉시 채점 (UI 피드백용 - 실제 채점은 제출 시)
    // 4지선다는 즉시 다음으로, 주관식은 제출 버튼 클릭
    if (currentQuestion.question_type === 'multiple') {
      // 1초 피드백 후 다음 문항
      setTimeout(() => {
        if (currentIdx < questions.length - 1) {
          setCurrentIdx((prev) => prev + 1)
          setFeedback(null)
        } else {
          submitTest({ ...answers, [currentQuestion.id]: answer })
        }
      }, 800)
    }
  }, [currentQuestion, currentIdx, questions.length, answers, feedback])

  const handleShortSubmit = () => {
    if (!shortAnswer.trim()) return
    handleAnswer(shortAnswer.trim())

    setTimeout(() => {
      if (currentIdx < questions.length - 1) {
        setCurrentIdx((prev) => prev + 1)
        setFeedback(null)
      } else {
        submitTest({ ...answers, [currentQuestion.id]: shortAnswer.trim() })
      }
    }, 300)
  }

  const submitTest = async (finalAnswers: Record<string, string>) => {
    if (!testId) return
    setSubmitting(true)

    const answersArray = questions.map((q) => ({
      questionId: q.id,
      studentAnswer: finalAnswers[q.id] || '',
    }))

    try {
      const res = await fetch('/api/submit-answer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ testId, answers: answersArray }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || '제출 실패')
        setSubmitting(false)
        return
      }

      router.push(`/s/test/result/${testId}`)
    } catch (e) {
      setError('네트워크 오류가 발생했습니다.')
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-4xl mb-3">📝</div>
          <p className="text-gray-500">테스트 준비 중...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="text-center">
          <div className="text-4xl mb-3">❌</div>
          <p className="text-gray-700 font-medium">{error}</p>
          <button
            onClick={() => router.push('/s')}
            className="mt-4 bg-indigo-600 text-white px-6 py-2 rounded-lg"
          >
            돌아가기
          </button>
        </div>
      </div>
    )
  }

  if (!currentQuestion) return null

  const progress = ((currentIdx + 1) / questions.length) * 100

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* 진행률 헤더 */}
      <div className="bg-white border-b border-gray-200 px-4 py-3">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-gray-500">{currentIdx + 1} / {questions.length}</span>
          <span className="text-sm font-medium text-indigo-600">{Math.round(progress)}%</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className="bg-indigo-600 h-2 rounded-full transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* 문항 */}
      <div className="flex-1 flex flex-col items-center justify-center px-4 py-8">
        <div className="w-full max-w-md">
          {/* 방향 표시 */}
          <p className="text-xs text-gray-400 text-center mb-3">
            {currentQuestion.direction === 'en_to_ko' ? '영어 → 한글' : '한글 → 영어'}
          </p>

          {/* 문제 */}
          <div className="bg-white rounded-2xl shadow-sm p-8 text-center mb-6">
            <p className="text-2xl font-bold text-gray-900 break-words">
              {currentQuestion.question_text}
            </p>
          </div>

          {/* 4지선다 */}
          {currentQuestion.question_type === 'multiple' && currentQuestion.choices && (
            <div className="space-y-3">
              {currentQuestion.choices.map((choice, idx) => {
                const isSelected = answers[currentQuestion.id] === choice
                return (
                  <button
                    key={idx}
                    onClick={() => handleAnswer(choice)}
                    disabled={!!answers[currentQuestion.id]}
                    className={`w-full py-4 px-5 rounded-xl text-left font-medium transition-all ${
                      isSelected
                        ? 'bg-indigo-600 text-white'
                        : 'bg-white border border-gray-200 text-gray-700 hover:border-indigo-400 hover:bg-indigo-50'
                    } disabled:cursor-default`}
                  >
                    <span className="text-gray-400 mr-3">{String.fromCharCode(9312 + idx)}</span>
                    {choice}
                  </button>
                )
              })}
            </div>
          )}

          {/* 주관식 */}
          {currentQuestion.question_type === 'short' && (
            <div className="space-y-3">
              <input
                type="text"
                value={shortAnswer}
                onChange={(e) => setShortAnswer(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleShortSubmit()}
                placeholder={currentQuestion.direction === 'en_to_ko' ? '한글 뜻을 입력하세요' : '영어 단어를 입력하세요'}
                disabled={!!answers[currentQuestion.id]}
                autoFocus
                className="w-full py-4 px-5 rounded-xl border border-gray-200 text-gray-900 text-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-center"
              />
              <button
                onClick={handleShortSubmit}
                disabled={!shortAnswer.trim() || !!answers[currentQuestion.id]}
                className="w-full py-4 bg-indigo-600 text-white rounded-xl font-semibold hover:bg-indigo-700 disabled:opacity-50 transition"
              >
                확인
              </button>
            </div>
          )}

          {/* 모름 버튼 */}
          {!answers[currentQuestion.id] && (
            <button
              onClick={() => handleAnswer('__SKIP__')}
              className="w-full mt-3 py-2 text-gray-400 text-sm hover:text-gray-600 transition"
            >
              모르겠어요 →
            </button>
          )}
        </div>
      </div>

      {/* 제출 중 오버레이 */}
      {submitting && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center">
          <div className="bg-white rounded-2xl p-8 text-center">
            <div className="text-4xl mb-3">⏳</div>
            <p className="text-gray-700 font-medium">채점 중...</p>
          </div>
        </div>
      )}
    </div>
  )
}

export default function TestPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-400">불러오는 중...</p>
      </div>
    }>
      <TestContent />
    </Suspense>
  )
}
