'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

interface WrongWord {
  id: string
  wrong_count: number
  review_remaining_count: number
  last_wrong_date: string
  is_completed: boolean
  words: {
    english: string
    korean: string
  }
}

export default function WrongWordsPage() {
  const [wrongWords, setWrongWords] = useState<WrongWord[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    loadWrongWords()
  }, [])

  const loadWrongWords = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data: student } = await supabase
      .from('students')
      .select('id')
      .eq('profile_id', user.id)
      .single()

    if (!student) return

    const { data } = await supabase
      .from('wrong_words')
      .select('*, words(english, korean)')
      .eq('student_id', student.id)
      .eq('is_completed', false)
      .order('last_wrong_date', { ascending: false })

    if (data) setWrongWords(data)
    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between">
        <Link href="/s" className="text-indigo-600 text-sm">← 홈으로</Link>
        <span className="font-semibold text-gray-900 text-sm">오답 단어</span>
        <div />
      </header>

      <div className="max-w-md mx-auto px-4 py-6">
        {loading ? (
          <div className="text-center py-12 text-gray-400">불러오는 중...</div>
        ) : wrongWords.length === 0 ? (
          <div className="text-center py-16">
            <div className="text-5xl mb-4">🎉</div>
            <p className="text-gray-700 font-medium">오답 단어가 없습니다!</p>
            <p className="text-gray-400 text-sm mt-1">모든 단어를 완벽하게 외웠어요.</p>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between mb-4">
              <p className="text-gray-600 text-sm">총 {wrongWords.length}개 단어</p>
              <Link
                href="/s/wrong/test"
                className="bg-red-500 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-red-600 transition"
              >
                오답 복습 시작
              </Link>
            </div>

            <div className="space-y-2">
              {wrongWords.map((ww) => (
                <div key={ww.id} className="bg-white rounded-xl p-4 border border-gray-100">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-semibold text-gray-900">{ww.words?.english}</p>
                      <p className="text-gray-500 text-sm mt-0.5">{ww.words?.korean}</p>
                    </div>
                    <div className="text-right shrink-0 ml-3">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700">
                        {ww.wrong_count}회 틀림
                      </span>
                      <p className="text-xs text-gray-400 mt-1">
                        복습 {ww.review_remaining_count}회 남음
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
