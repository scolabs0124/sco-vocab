'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

export default function WrongTestPage() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()

  const startReviewTest = async () => {
    setLoading(true)
    setError('')

    try {
      const res = await fetch('/api/generate-review', { method: 'POST' })
      const data = await res.json()

      if (!res.ok) {
        setError(data.error || '오답 복습 테스트 생성 실패')
        setLoading(false)
        return
      }

      router.push(`/s/test?testId=${data.testId}`)
    } catch (e) {
      setError('네트워크 오류가 발생했습니다.')
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <header className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between">
        <Link href="/s/wrong" className="text-indigo-600 text-sm">← 오답 목록</Link>
        <span className="font-semibold text-gray-900 text-sm">오답 복습</span>
        <div />
      </header>

      <div className="flex-1 flex items-center justify-center px-4">
        <div className="text-center max-w-sm">
          <div className="text-5xl mb-4">🔄</div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">오답 집중 복습</h2>
          <p className="text-gray-500 text-sm mb-6">
            틀린 단어들만 모아서 다시 테스트합니다.
            N번 연속으로 맞추면 오답 목록에서 제거됩니다.
          </p>

          {error && (
            <p className="text-red-500 text-sm mb-4">{error}</p>
          )}

          <button
            onClick={startReviewTest}
            disabled={loading}
            className="w-full bg-red-500 text-white py-3 rounded-xl font-semibold hover:bg-red-600 disabled:opacity-50 transition"
          >
            {loading ? '준비 중...' : '오답 복습 시작'}
          </button>
        </div>
      </div>
    </div>
  )
}
