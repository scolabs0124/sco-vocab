'use client'
export const dynamic = 'force-dynamic'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

interface Student {
  id: string
  name: string
  grade: string | null
  class_name: string | null
  status: string
  created_at: string
  profile_id: string
}

interface TestRecord {
  id: string
  test_date: string
  total_count: number
  correct_count: number
  wrong_count: number
  status: string
  is_review: boolean
}

export default function StudentDetailPage() {
  const [student, setStudent] = useState<Student | null>(null)
  const [tests, setTests] = useState<TestRecord[]>([])
  const [wrongCount, setWrongCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const params = useParams()
  const router = useRouter()
  const studentId = params.id as string
  const supabase = createClient()

  useEffect(() => {
    loadData()
  }, [studentId])

  const loadData = async () => {
    const [{ data: studentData }, { data: testsData }, { count: wrongCnt }] = await Promise.all([
      supabase.from('students').select('*').eq('id', studentId).single(),
      supabase.from('tests').select('*').eq('student_id', studentId).order('test_date', { ascending: false }).limit(20),
      supabase.from('wrong_words').select('id', { count: 'exact', head: true }).eq('student_id', studentId).eq('is_completed', false),
    ])

    if (studentData) setStudent(studentData)
    if (testsData) setTests(testsData)
    setWrongCount(wrongCnt || 0)
    setLoading(false)
  }

  const handleResetPassword = async () => {
    const newPassword = prompt('새 비밀번호를 입력하세요 (8자 이상):')
    if (!newPassword || newPassword.length < 8) {
      alert('비밀번호는 8자 이상이어야 합니다.')
      return
    }

    const res = await fetch('/api/admin/reset-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ studentId, newPassword }),
    })

    const data = await res.json()
    if (res.ok) {
      alert('비밀번호가 변경되었습니다.')
    } else {
      alert(`오류: ${data.error}`)
    }
  }

  if (loading) {
    return <div className="text-center py-12 text-gray-400">불러오는 중...</div>
  }

  if (!student) {
    return <div className="text-center py-12 text-gray-500">학생을 찾을 수 없습니다.</div>
  }

  const completedTests = tests.filter((t) => t.status === 'done')
  const avgScore = completedTests.length > 0
    ? Math.round(completedTests.reduce((sum, t) => sum + (t.correct_count / t.total_count) * 100, 0) / completedTests.length)
    : 0

  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-6">
        <Link href="/admin/students" className="text-indigo-600 hover:text-indigo-800 text-sm flex items-center gap-1">
          ← 학생 목록으로
        </Link>
        <div className="flex items-center justify-between mt-2">
          <h1 className="text-2xl font-bold text-gray-900">{student.name}</h1>
          <div className="flex gap-2">
            <Link
              href={`/admin/students/${studentId}/print/study`}
              className="text-sm text-gray-500 hover:text-gray-700 border border-gray-300 px-3 py-1.5 rounded-lg hover:bg-gray-50 transition"
            >
              📄 학습지
            </Link>
            <Link
              href={`/admin/students/${studentId}/print/test?type=A`}
              className="text-sm text-gray-500 hover:text-gray-700 border border-gray-300 px-3 py-1.5 rounded-lg hover:bg-gray-50 transition"
            >
              📝 테스트지
            </Link>
            <Link
              href={`/admin/students/${studentId}/offline-input`}
              className="text-sm text-indigo-600 hover:text-indigo-800 border border-indigo-300 px-3 py-1.5 rounded-lg hover:bg-indigo-50 transition"
            >
              ✏️ 오프라인 입력
            </Link>
            <button
              onClick={handleResetPassword}
              className="text-sm text-gray-500 hover:text-gray-700 border border-gray-300 px-3 py-1.5 rounded-lg hover:bg-gray-50 transition"
            >
              비밀번호 변경
            </button>
          </div>
        </div>
        <p className="text-gray-500 text-sm mt-1">
          {student.grade || '-'} {student.class_name ? `/ ${student.class_name}` : ''} · 등록일 {new Date(student.created_at).toLocaleDateString('ko-KR')}
        </p>
      </div>

      {/* 통계 */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-xl p-4 border border-gray-200 text-center">
          <p className="text-2xl font-bold text-indigo-600">{completedTests.length}</p>
          <p className="text-xs text-gray-400 mt-1">총 응시 횟수</p>
        </div>
        <div className="bg-white rounded-xl p-4 border border-gray-200 text-center">
          <p className="text-2xl font-bold text-green-500">{avgScore}%</p>
          <p className="text-xs text-gray-400 mt-1">평균 정답률</p>
        </div>
        <div className="bg-white rounded-xl p-4 border border-gray-200 text-center">
          <p className="text-2xl font-bold text-red-400">{wrongCount}</p>
          <p className="text-xs text-gray-400 mt-1">오답 단어</p>
        </div>
      </div>

      {/* 테스트 기록 */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <h3 className="font-semibold text-gray-700">테스트 기록</h3>
          <Link
            href={`/admin/settings?student=${student.id}`}
            className="text-indigo-600 text-sm hover:text-indigo-800"
          >
            테스트 설정 →
          </Link>
        </div>

        {tests.length === 0 ? (
          <div className="text-center py-8 text-gray-400">아직 테스트 기록이 없습니다.</div>
        ) : (
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-5 py-3 text-left text-xs font-medium text-gray-500">날짜</th>
                <th className="px-5 py-3 text-left text-xs font-medium text-gray-500">유형</th>
                <th className="px-5 py-3 text-left text-xs font-medium text-gray-500">정답률</th>
                <th className="px-5 py-3 text-left text-xs font-medium text-gray-500">결과</th>
                <th className="px-5 py-3 text-left text-xs font-medium text-gray-500">출력</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {tests.map((test) => {
                const score = test.status === 'done' ? Math.round((test.correct_count / test.total_count) * 100) : null
                return (
                  <tr key={test.id} className="hover:bg-gray-50">
                    <td className="px-5 py-3 text-sm text-gray-900">
                      {new Date(test.test_date).toLocaleDateString('ko-KR')}
                    </td>
                    <td className="px-5 py-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${test.is_review ? 'bg-orange-100 text-orange-600' : 'bg-blue-100 text-blue-600'}`}>
                        {test.is_review ? '오답복습' : '일반'}
                      </span>
                    </td>
                    <td className="px-5 py-3">
                      {score !== null ? (
                        <div className="flex items-center gap-2">
                          <div className="w-16 bg-gray-100 rounded-full h-1.5">
                            <div
                              className={`h-1.5 rounded-full ${score >= 80 ? 'bg-green-500' : score >= 60 ? 'bg-yellow-400' : 'bg-red-400'}`}
                              style={{ width: `${score}%` }}
                            />
                          </div>
                          <span className="text-sm font-medium text-gray-700">{score}%</span>
                        </div>
                      ) : (
                        <span className="text-xs text-gray-400">진행 중</span>
                      )}
                    </td>
                    <td className="px-5 py-3 text-sm text-gray-500">
                      {test.status === 'done' ? `${test.correct_count}/${test.total_count}` : '-'}
                    </td>
                    <td className="px-5 py-3">
                      {test.status === 'done' && (
                        <Link
                          href={`/admin/students/${studentId}/print/answer/${test.id}`}
                          className="text-xs text-indigo-600 hover:text-indigo-800 hover:underline"
                        >
                          답안지
                        </Link>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
