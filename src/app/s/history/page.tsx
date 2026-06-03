'use client'
export const dynamic = 'force-dynamic'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

interface TestRecord {
  id: string
  test_date: string
  total_count: number
  correct_count: number
  wrong_count: number
  status: string
}

export default function HistoryPage() {
  const [records, setRecords] = useState<TestRecord[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    loadHistory()
  }, [])

  const loadHistory = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data: student } = await supabase
      .from('students')
      .select('id')
      .eq('profile_id', user.id)
      .single()

    if (!student) return

    const { data } = await supabase
      .from('tests')
      .select('*')
      .eq('student_id', student.id)
      .eq('status', 'done')
      .order('test_date', { ascending: false })
      .limit(30)

    if (data) setRecords(data)
    setLoading(false)
  }

  const avgScore = records.length > 0
    ? Math.round(records.reduce((sum, r) => sum + (r.correct_count / r.total_count) * 100, 0) / records.length)
    : 0

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between">
        <Link href="/s" className="text-indigo-600 text-sm">← 홈으로</Link>
        <span className="font-semibold text-gray-900 text-sm">학습 기록</span>
        <div />
      </header>

      <div className="max-w-md mx-auto px-4 py-6 space-y-4">
        {/* 통계 요약 */}
        {records.length > 0 && (
          <div className="bg-white rounded-2xl p-5 shadow-sm">
            <h3 className="font-semibold text-gray-700 mb-4">전체 통계</h3>
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <p className="text-2xl font-bold text-indigo-600">{records.length}</p>
                <p className="text-xs text-gray-400">총 응시 횟수</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-green-500">{avgScore}%</p>
                <p className="text-xs text-gray-400">평균 정답률</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-700">
                  {records.reduce((sum, r) => sum + r.total_count, 0)}
                </p>
                <p className="text-xs text-gray-400">총 풀이 수</p>
              </div>
            </div>
          </div>
        )}

        {/* 기록 목록 */}
        {loading ? (
          <div className="text-center py-12 text-gray-400">불러오는 중...</div>
        ) : records.length === 0 ? (
          <div className="text-center py-16">
            <div className="text-5xl mb-4">📊</div>
            <p className="text-gray-700 font-medium">아직 학습 기록이 없습니다.</p>
            <Link href="/s" className="mt-4 inline-block text-indigo-600 text-sm underline">
              테스트 시작하기
            </Link>
          </div>
        ) : (
          <div className="space-y-2">
            {records.map((record) => {
              const score = Math.round((record.correct_count / record.total_count) * 100)
              return (
                <Link
                  key={record.id}
                  href={`/s/test/result/${record.id}`}
                  className="block bg-white rounded-xl p-4 border border-gray-100 hover:border-indigo-200 transition"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-gray-900">
                        {new Date(record.test_date).toLocaleDateString('ko-KR', {
                          month: 'long',
                          day: 'numeric',
                          weekday: 'short',
                        })}
                      </p>
                      <p className="text-sm text-gray-400 mt-0.5">
                        {record.total_count}문제 · 정답 {record.correct_count}개
                      </p>
                    </div>
                    <div className="text-right">
                      <p className={`text-xl font-bold ${
                        score >= 80 ? 'text-green-500' : score >= 60 ? 'text-yellow-500' : 'text-red-400'
                      }`}>
                        {score}점
                      </p>
                    </div>
                  </div>
                </Link>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
