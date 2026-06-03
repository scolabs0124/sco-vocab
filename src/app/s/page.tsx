'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

interface TodayTest {
  id: string
  status: string
  correct_count: number
  wrong_count: number
  total_count: number
  test_date: string
}

interface StudentInfo {
  name: string
  grade: string | null
}

export default function StudentMainPage() {
  const [studentInfo, setStudentInfo] = useState<StudentInfo | null>(null)
  const [todayTest, setTodayTest] = useState<TodayTest | null>(null)
  const [hasSettings, setHasSettings] = useState(false)
  const [loading, setLoading] = useState(true)
  const [startingTest, setStartingTest] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      router.push('/login')
      return
    }

    // 학생 정보
    const { data: profile } = await supabase
      .from('profiles')
      .select('name')
      .eq('id', user.id)
      .single()

    const { data: student } = await supabase
      .from('students')
      .select('id, name, grade')
      .eq('profile_id', user.id)
      .single()

    if (student) {
      setStudentInfo({ name: student.name, grade: student.grade })

      // 테스트 설정 확인
      const { data: settings } = await supabase
        .from('test_settings')
        .select('id')
        .eq('student_id', student.id)
        .single()

      setHasSettings(!!settings)

      // 오늘 테스트 확인
      const today = new Date().toISOString().split('T')[0]
      const { data: test } = await supabase
        .from('tests')
        .select('*')
        .eq('student_id', student.id)
        .eq('test_date', today)
        .order('created_at', { ascending: false })
        .limit(1)
        .single()

      if (test) setTodayTest(test)
    }

    setLoading(false)
  }

  const startTest = async () => {
    setStartingTest(true)
    setError('')

    try {
      const res = await fetch('/api/generate-test', { method: 'POST' })
      const data = await res.json()

      if (!res.ok) {
        setError(data.error || '테스트 생성 실패')
        setStartingTest(false)
        return
      }

      router.push(`/s/test?testId=${data.testId}`)
    } catch (e) {
      setError('네트워크 오류가 발생했습니다.')
      setStartingTest(false)
    }
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-400">불러오는 중...</div>
      </div>
    )
  }

  const score = todayTest
    ? Math.round((todayTest.correct_count / todayTest.total_count) * 100)
    : null

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-blue-50">
      {/* 헤더 */}
      <header className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-xs">S</span>
          </div>
          <span className="font-bold text-gray-900 text-sm">SCO 단어암기장</span>
        </div>
        <button onClick={handleLogout} className="text-gray-400 hover:text-gray-600 text-sm">
          로그아웃
        </button>
      </header>

      <div className="max-w-md mx-auto px-4 py-6 space-y-4">
        {/* 인사말 */}
        <div className="bg-white rounded-2xl p-5 shadow-sm">
          <p className="text-gray-500 text-sm">안녕하세요,</p>
          <h1 className="text-xl font-bold text-gray-900 mt-1">
            {studentInfo?.name || '학생'}님 👋
          </h1>
          {studentInfo?.grade && (
            <p className="text-gray-400 text-sm mt-0.5">{studentInfo.grade}</p>
          )}
        </div>

        {/* 오늘의 테스트 */}
        <div className="bg-white rounded-2xl p-5 shadow-sm">
          <h2 className="font-semibold text-gray-700 mb-4">오늘의 테스트</h2>

          {!hasSettings ? (
            <div className="text-center py-6">
              <div className="text-3xl mb-2">⚙️</div>
              <p className="text-gray-500 text-sm">테스트 설정이 없습니다.</p>
              <p className="text-gray-400 text-xs mt-1">관리자에게 교재 및 설정을 요청하세요.</p>
            </div>
          ) : todayTest?.status === 'done' ? (
            <div className="text-center py-4">
              <div className="text-4xl mb-2">
                {score !== null && score >= 80 ? '🎉' : score !== null && score >= 60 ? '👍' : '💪'}
              </div>
              <p className="text-lg font-bold text-gray-900">오늘 테스트 완료!</p>
              <div className="flex items-center justify-center gap-4 mt-3">
                <div className="text-center">
                  <p className="text-2xl font-bold text-indigo-600">{score}%</p>
                  <p className="text-xs text-gray-400">정답률</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-green-500">{todayTest.correct_count}</p>
                  <p className="text-xs text-gray-400">정답</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-red-400">{todayTest.wrong_count}</p>
                  <p className="text-xs text-gray-400">오답</p>
                </div>
              </div>
              <Link
                href={`/s/test/result/${todayTest.id}`}
                className="mt-4 inline-block text-indigo-600 text-sm underline"
              >
                결과 상세 보기
              </Link>
            </div>
          ) : todayTest?.status === 'in_progress' ? (
            <div className="text-center py-4">
              <div className="text-3xl mb-2">⏳</div>
              <p className="text-gray-700 font-medium">진행 중인 테스트가 있습니다.</p>
              <button
                onClick={() => router.push(`/s/test?testId=${todayTest.id}&resume=true`)}
                className="mt-4 w-full bg-indigo-600 text-white py-3 rounded-xl font-semibold hover:bg-indigo-700 transition"
              >
                이어서 응시하기
              </button>
            </div>
          ) : (
            <div className="text-center py-4">
              <div className="text-3xl mb-2">📝</div>
              <p className="text-gray-700 font-medium">오늘 테스트를 시작하세요!</p>
              {error && (
                <p className="text-red-500 text-sm mt-2">{error}</p>
              )}
              <button
                onClick={startTest}
                disabled={startingTest}
                className="mt-4 w-full bg-indigo-600 text-white py-3 rounded-xl font-semibold hover:bg-indigo-700 disabled:opacity-50 transition text-lg"
              >
                {startingTest ? '준비 중...' : '오늘의 테스트 시작 🚀'}
              </button>
            </div>
          )}
        </div>

        {/* 빠른 메뉴 */}
        <div className="grid grid-cols-2 gap-3">
          <Link
            href="/s/wrong"
            className="bg-white rounded-2xl p-4 shadow-sm flex flex-col items-center gap-2 hover:bg-indigo-50 transition"
          >
            <span className="text-2xl">❌</span>
            <span className="text-sm font-medium text-gray-700">오답 단어</span>
          </Link>
          <Link
            href="/s/history"
            className="bg-white rounded-2xl p-4 shadow-sm flex flex-col items-center gap-2 hover:bg-indigo-50 transition"
          >
            <span className="text-2xl">📊</span>
            <span className="text-sm font-medium text-gray-700">학습 기록</span>
          </Link>
          <Link
            href="/s/print/study"
            className="bg-white rounded-2xl p-4 shadow-sm flex flex-col items-center gap-2 hover:bg-indigo-50 transition"
          >
            <span className="text-2xl">📄</span>
            <span className="text-sm font-medium text-gray-700">학습지 출력</span>
          </Link>
          <Link
            href="/s/wrong"
            className="bg-white rounded-2xl p-4 shadow-sm flex flex-col items-center gap-2 hover:bg-orange-50 transition"
          >
            <span className="text-2xl">🔁</span>
            <span className="text-sm font-medium text-gray-700">오답 복습</span>
          </Link>
        </div>
      </div>
    </div>
  )
}
