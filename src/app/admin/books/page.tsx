'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

interface Book {
  id: string
  book_name: string
  total_words: number
  created_at: string
}

interface WordUnit {
  id: string
  book_id: string
  unit_name: string
  unit_order: number
  word_count: number
}

export default function BooksPage() {
  const [books, setBooks] = useState<Book[]>([])
  const [units, setUnits] = useState<Record<string, WordUnit[]>>({})
  const [expandedBook, setExpandedBook] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    fetchBooks()
  }, [])

  const fetchBooks = async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('books')
      .select('*')
      .order('created_at', { ascending: false })

    if (!error && data) {
      setBooks(data)
    }
    setLoading(false)
  }

  const fetchUnits = async (bookId: string) => {
    if (units[bookId]) {
      setExpandedBook(expandedBook === bookId ? null : bookId)
      return
    }

    const { data, error } = await supabase
      .from('word_units')
      .select('*')
      .eq('book_id', bookId)
      .order('unit_order', { ascending: true })

    if (!error && data) {
      setUnits((prev) => ({ ...prev, [bookId]: data }))
    }
    setExpandedBook(bookId)
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">교재 관리</h1>
          <p className="text-gray-500 text-sm mt-1">등록된 교재 및 단원 목록</p>
        </div>
        <Link
          href="/admin/books/upload"
          className="bg-indigo-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-indigo-700 transition flex items-center gap-2"
        >
          <span>📤</span>
          단어 업로드
        </Link>
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-400">불러오는 중...</div>
      ) : books.length === 0 ? (
        <div className="text-center py-16 bg-gray-50 rounded-2xl border border-dashed border-gray-300">
          <div className="text-5xl mb-4">📚</div>
          <p className="text-gray-500 font-medium">등록된 교재가 없습니다.</p>
          <p className="text-gray-400 text-sm mt-1">CSV 또는 XLSX 파일을 업로드하여 단어를 등록하세요.</p>
          <Link
            href="/admin/books/upload"
            className="mt-4 inline-block bg-indigo-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-indigo-700 transition"
          >
            단어 업로드하기
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {books.map((book) => (
            <div key={book.id} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <button
                onClick={() => fetchUnits(book.id)}
                className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition"
              >
                <div className="flex items-center gap-3">
                  <span className="text-2xl">📖</span>
                  <div className="text-left">
                    <p className="font-semibold text-gray-900">{book.book_name}</p>
                    <p className="text-sm text-gray-400">
                      전체 {book.total_words.toLocaleString()}단어 · 등록일 {new Date(book.created_at).toLocaleDateString('ko-KR')}
                    </p>
                  </div>
                </div>
                <span className="text-gray-400 text-lg">{expandedBook === book.id ? '▲' : '▼'}</span>
              </button>

              {expandedBook === book.id && units[book.id] && (
                <div className="border-t border-gray-100 bg-gray-50 px-6 py-4">
                  <h4 className="text-sm font-medium text-gray-600 mb-3">단원 목록</h4>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                    {units[book.id].map((unit) => (
                      <div
                        key={unit.id}
                        className="bg-white rounded-lg px-3 py-2 border border-gray-200 flex items-center justify-between"
                      >
                        <span className="text-sm font-medium text-gray-700">{unit.unit_name}</span>
                        <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
                          {unit.word_count}단어
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
