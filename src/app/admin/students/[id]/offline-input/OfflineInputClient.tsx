'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

interface Word {
  id: string
  english: string
  korean: string
  unit_id: string
  units?: { unit_name: string } | null
}

interface Props {
  student: { id: string; name: string; grade: string | null; class_name: string | null }
  words: Word[]
  bookName: string
  studentId: string
}

type ResultMap = Record<string, { isCorrect: boolean | null; studentAnswer: string }>

export default function OfflineInputClient({ student, words, bookName, studentId }: Props) {
  const [results, setResults] = useState<ResultMap>(() => {
    const init: ResultMap = {}
    words.forEach(w => { init[w.id] = { isCorrect: null, studentAnswer: '' } })
    return init
  })
  const [testDate, setTestDate] = useState(new Date().toISOString().split('T')[0])
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [submitResult, setSubmitResult] = useState<{ correctCount: number; wrongCount: number; score: number } | null>(null)
  const [error, setError] = useState('')
  const router = useRouter()

  const setCorrect = (wordId: string, isCorrect: boolean) => {
    setResults(prev => ({ ...prev, [wordId]: { ...prev[wordId], isCorrect } }))
  }

  const setAnswer = (wordId: string, answer: string) => {
    setResults(prev => ({ ...prev, [wordId]: { ...prev[wordId], studentAnswer: answer } }))
  }

  // 전체 정답/오답 일괄 설정
  const setAll = (isCorrect: boolean) => {
    setResults(prev => {
      const next = { ...prev }
      words.forEach(w => { next[w.id] = { ...next[w.id], isCorrect } })
      return next
    })
  }

  const answeredCount = words.filter(w => results[w.id]?.isCorrect !== null).length
  const correctCount = words.filter(w => results[w.id]?.isCorrect === true).length
  const wrongCount = words.filter(w => results[w.id]?.isCorrect === false).length

  const handleSubmit = async () => {
    const unanswered = words.filter(w => results[w.id]?.isCorrect === null)
    if (unanswered.length > 0) {
      setError(`${unanswered.length}개 단어의 정오답을 입력해주세요.`)
      return
    }

    setSubmitting(true)
    setError('')

    const payload = {
      studentId,
      results: words.map(w => ({
        wordId: w.id,
        english: w.english,
        korean: w.korean,
        isCorrect: results[w.id].isCorrect,
        studentAnswer: results[w.id].studentAnswer,
      })),
      testDate,
    }

    const res = await fetch('/api/offline-result', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })

    const data = await res.json()

    if (!res.ok) {
      setError(data.error || '저장 실패')
      setSubmitting(false)
      return
    }

    setSubmitted(true)
    setSubmitResult({ correctCount: data.correctCount, wrongCount: data.wrongCount, score: data.score })
    setSubmitting(false)
  }

  if (submitted && submitResult) {
    return (
      <div className="max-w-2xl mx-auto py-12 px-4 text-center">
        <div className="bg-white rounded-2xl border border-gray-200 p-8">
          <div className="text-5xl mb-4">{submitResult.score >= 80 ? '🎉' : submitResult.score >= 60 ? '👍' : '💪'}</div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">결과 저장 완료!</h2>
          <p className="text-gray-500 mb-6">{student.name}의 종이 시험 결과가 기록되었습니다.</p>
          <div className="flex justify-center gap-8 mb-8">
            <div className="text-center">
              <p className="text-3xl font-bold text-indigo-600">{submitResult.score}%</p>
              <p className="text-sm text-gray-400">정답률</p>
            </div>
            <div className="text-center">
              <p className="text-3xl font-bold text-green-500">{submitResult.correctCount}</p>
              <p className="text-sm text-gray-400">정답</p>
            </div>
            <div className="text-center">
              <p className="text-3xl font-bold text-red-400">{submitResult.wrongCount}</p>
              <p className="text-sm text-gray-400">오답</p>
            </div>
          </div>
          <div className="flex gap-3 justify-center">
            <Link
              href={`/admin/students/${studentId}`}
              className="px-6 py-2.5 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition"
            >
              학생 상세로 돌아가기
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-3xl mx-auto">
      {/* 헤더 */}
      <div className="mb-6">
        <Link href={`/admin/students/${studentId}`} className="text-indigo-600 hover:text-indigo-800 text-sm flex items-center gap-1">
          ← 학생 상세로
        </Link>
        <h1 className="text-2xl font-bold text-gray-900 mt-2">종이 시험 결과 입력</h1>
        <p className="text-gray-500 text-sm mt-1">
          {student.name} · {bookName} · {words.length}문제
        </p>
      </div>

      {/* 시험 날짜 + 진행 상황 */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 mb-4 flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <label className="text-sm font-medium text-gray-700">시험 날짜:</label>
          <input
            type="date"
            value={testDate}
            onChange={e => setTestDate(e.target.value)}
            className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
        <div className="flex items-center gap-4 text-sm">
          <span className="text-gray-500">입력: <strong>{answeredCount}/{words.length}</strong></span>
          <span className="text-green-600">정답: <strong>{correctCount}</strong></span>
          <span className="text-red-500">오답: <strong>{wrongCount}</strong></span>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setAll(true)}
            className="px-3 py-1.5 text-xs bg-green-50 text-green-700 border border-green-200 rounded-lg hover:bg-green-100 transition"
          >
            전체 정답
          </button>
          <button
            onClick={() => setAll(false)}
            className="px-3 py-1.5 text-xs bg-red-50 text-red-700 border border-red-200 rounded-lg hover:bg-red-100 transition"
          >
            전체 오답
          </button>
        </div>
      </div>

      {words.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-8 text-center text-gray-500">
          <p>입력할 단어가 없습니다. 교재 설정을 확인해주세요.</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden mb-4">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="px-4 py-3 text-left text-gray-600 font-medium w-8">#</th>
                <th className="px-4 py-3 text-left text-gray-600 font-medium">영어</th>
                <th className="px-4 py-3 text-left text-gray-600 font-medium">정답</th>
                <th className="px-4 py-3 text-center text-gray-600 font-medium w-32">정오답</th>
                <th className="px-4 py-3 text-left text-gray-600 font-medium">학생 답안 (선택)</th>
              </tr>
            </thead>
            <tbody>
              {words.map((word, idx) => {
                const result = results[word.id]
                return (
                  <tr
                    key={word.id}
                    className={`border-b border-gray-100 ${
                      result.isCorrect === true ? 'bg-green-50' :
                      result.isCorrect === false ? 'bg-red-50' : ''
                    }`}
                  >
                    <td className="px-4 py-2.5 text-gray-400 text-xs">{String(idx + 1).padStart(2, '0')}</td>
                    <td className="px-4 py-2.5 font-semibold text-gray-900">{word.english}</td>
                    <td className="px-4 py-2.5 text-gray-600">{word.korean}</td>
                    <td className="px-4 py-2.5">
                      <div className="flex gap-2 justify-center">
                        <button
                          onClick={() => setCorrect(word.id, true)}
                          className={`px-3 py-1 rounded-lg text-xs font-medium transition ${
                            result.isCorrect === true
                              ? 'bg-green-500 text-white'
                              : 'bg-gray-100 text-gray-600 hover:bg-green-100'
                          }`}
                        >
                          ✓ 정답
                        </button>
                        <button
                          onClick={() => setCorrect(word.id, false)}
                          className={`px-3 py-1 rounded-lg text-xs font-medium transition ${
                            result.isCorrect === false
                              ? 'bg-red-500 text-white'
                              : 'bg-gray-100 text-gray-600 hover:bg-red-100'
                          }`}
                        >
                          ✗ 오답
                        </button>
                      </div>
                    </td>
                    <td className="px-4 py-2.5">
                      <input
                        type="text"
                        value={result.studentAnswer}
                        onChange={e => setAnswer(word.id, e.target.value)}
                        placeholder="학생이 쓴 답"
                        className="w-full px-2 py-1 border border-gray-200 rounded text-xs focus:outline-none focus:ring-1 focus:ring-indigo-400"
                      />
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
          <p className="text-red-600 text-sm">❌ {error}</p>
        </div>
      )}

      <div className="flex gap-3">
        <Link
          href={`/admin/students/${studentId}`}
          className="flex-1 text-center py-3 border border-gray-300 rounded-xl text-gray-700 font-medium hover:bg-gray-50 transition"
        >
          취소
        </Link>
        <button
          onClick={handleSubmit}
          disabled={submitting || words.length === 0}
          className="flex-1 bg-indigo-600 text-white py-3 rounded-xl font-semibold hover:bg-indigo-700 disabled:opacity-50 transition"
        >
          {submitting ? '저장 중...' : `결과 저장 (${answeredCount}/${words.length})`}
        </button>
      </div>
    </div>
  )
}
