'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

interface Book {
  id: string
  book_name: string
  total_words: number
}

export default function NewStudentPage() {
  const [form, setForm] = useState({
    name: '',
    username: '',
    password: '',
    grade: '',
    class_name: '',
    book_id: '',
    unit_from: '1',
    unit_to: '999',
    daily_question_count: '30',
  })
  const [books, setBooks] = useState<Book[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    supabase.from('books').select('*').order('book_name').then(({ data }) => {
      if (data) setBooks(data)
    })
  }, [])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    // 아이디 유효성 검사 (영문/숫자/언더스코어만)
    if (!/^[a-zA-Z0-9_가-힣]+$/.test(form.username)) {
      setError('아이디는 영문, 숫자, 한글, 언더스코어(_)만 사용 가능합니다.')
      setLoading(false)
      return
    }

    const res = await fetch('/api/admin/create-student', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...form,
        unit_from: parseInt(form.unit_from),
        unit_to: parseInt(form.unit_to),
        daily_question_count: parseInt(form.daily_question_count),
        book_id: form.book_id || null,
      }),
    })

    const data = await res.json()

    if (!res.ok) {
      setError(data.error || '학생 등록 실패')
      setLoading(false)
      return
    }

    router.push('/admin/students')
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-6">
        <Link href="/admin/students" className="text-indigo-600 hover:text-indigo-800 text-sm flex items-center gap-1">
          ← 학생 목록으로
        </Link>
        <h1 className="text-2xl font-bold text-gray-900 mt-2">학생 등록</h1>
        <p className="text-gray-500 text-sm mt-1">새 학생 계정을 생성합니다.</p>
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-gray-200 p-6 space-y-5">
        {/* 기본 정보 */}
        <div>
          <h3 className="font-semibold text-gray-700 mb-4">기본 정보</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">이름 *</label>
              <input
                type="text"
                name="name"
                value={form.name}
                onChange={handleChange}
                required
                placeholder="홍길동"
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">학년</label>
              <input
                type="text"
                name="grade"
                value={form.grade}
                onChange={handleChange}
                placeholder="고1, 중3 등"
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">반</label>
              <input
                type="text"
                name="class_name"
                value={form.class_name}
                onChange={handleChange}
                placeholder="A반, 1반 등"
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
              />
            </div>
          </div>
        </div>

        {/* 로그인 정보 */}
        <div className="border-t border-gray-100 pt-5">
          <h3 className="font-semibold text-gray-700 mb-1">로그인 정보</h3>
          <p className="text-xs text-gray-400 mb-4">학생이 앱에 로그인할 때 사용하는 아이디와 비밀번호입니다.</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">아이디 *</label>
              <input
                type="text"
                name="username"
                value={form.username}
                onChange={handleChange}
                required
                placeholder="예: hong123"
                autoComplete="off"
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
              />
              <p className="text-xs text-gray-400 mt-1">영문, 숫자, 한글, _ 사용 가능</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">비밀번호 *</label>
              <input
                type="password"
                name="password"
                value={form.password}
                onChange={handleChange}
                required
                minLength={6}
                placeholder="6자 이상"
                autoComplete="new-password"
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
              />
            </div>
          </div>
        </div>

        {/* 학습 설정 */}
        <div className="border-t border-gray-100 pt-5">
          <h3 className="font-semibold text-gray-700 mb-4">학습 설정 (선택)</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">교재</label>
              <select
                name="book_id"
                value={form.book_id}
                onChange={handleChange}
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
              >
                <option value="">교재 선택 (나중에 설정 가능)</option>
                {books.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.book_name} ({b.total_words}단어)
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">시작 단원</label>
              <input
                type="number"
                name="unit_from"
                value={form.unit_from}
                onChange={handleChange}
                min="1"
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">종료 단원</label>
              <input
                type="number"
                name="unit_to"
                value={form.unit_to}
                onChange={handleChange}
                min="1"
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">일일 문제 수</label>
              <input
                type="number"
                name="daily_question_count"
                value={form.daily_question_count}
                onChange={handleChange}
                min="5"
                max="100"
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
              />
            </div>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3">
            <p className="text-red-600 text-sm">❌ {error}</p>
          </div>
        )}

        <div className="flex gap-3 pt-2">
          <Link
            href="/admin/students"
            className="flex-1 text-center py-2.5 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50 transition text-sm"
          >
            취소
          </Link>
          <button
            type="submit"
            disabled={loading}
            className="flex-1 bg-indigo-600 text-white py-2.5 rounded-lg font-medium hover:bg-indigo-700 disabled:opacity-50 transition text-sm"
          >
            {loading ? '등록 중...' : '학생 등록'}
          </button>
        </div>
      </form>
    </div>
  )
}
