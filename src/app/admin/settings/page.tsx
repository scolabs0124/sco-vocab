'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

interface Student {
  id: string
  name: string
  grade: string | null
  class_name: string | null
}

interface TestSettings {
  id?: string
  student_id: string
  book_id: string | null
  unit_from: number
  unit_to: number
  daily_question_count: number
  question_direction: string
  question_type: string
  wrong_review_count: number
  ratio_wrong: number
  ratio_review: number
  ratio_new: number
}

interface Book {
  id: string
  book_name: string
  total_words: number
}

const DEFAULT_SETTINGS: Omit<TestSettings, 'student_id'> = {
  book_id: null,
  unit_from: 1,
  unit_to: 999,
  daily_question_count: 30,
  question_direction: 'en_to_ko',
  question_type: 'multiple',
  wrong_review_count: 3,
  ratio_wrong: 40,
  ratio_review: 30,
  ratio_new: 30,
}

export default function SettingsPage() {
  const [students, setStudents] = useState<Student[]>([])
  const [books, setBooks] = useState<Book[]>([])
  const [selectedStudent, setSelectedStudent] = useState<string>('')
  const [settings, setSettings] = useState<TestSettings | null>(null)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    loadInitialData()
  }, [])

  const loadInitialData = async () => {
    const [{ data: studentsData }, { data: booksData }] = await Promise.all([
      supabase.from('students').select('id, name, grade, class_name').order('name'),
      supabase.from('books').select('*').order('book_name'),
    ])
    if (studentsData) setStudents(studentsData)
    if (booksData) setBooks(booksData)
  }

  const loadSettings = async (studentId: string) => {
    setLoading(true)
    const { data } = await supabase
      .from('test_settings')
      .select('*')
      .eq('student_id', studentId)
      .single()

    if (data) {
      setSettings(data)
    } else {
      setSettings({ student_id: studentId, ...DEFAULT_SETTINGS })
    }
    setLoading(false)
  }

  const handleStudentChange = (studentId: string) => {
    setSelectedStudent(studentId)
    setSaved(false)
    if (studentId) loadSettings(studentId)
    else setSettings(null)
  }

  const handleChange = (key: keyof TestSettings, value: any) => {
    setSettings((prev) => prev ? { ...prev, [key]: value } : null)
  }

  const validateRatios = () => {
    if (!settings) return false
    return settings.ratio_wrong + settings.ratio_review + settings.ratio_new === 100
  }

  const handleSave = async () => {
    if (!settings) return
    if (!validateRatios()) {
      alert('오답/복습/신규 비율의 합이 100%가 되어야 합니다.')
      return
    }

    setSaving(true)
    const { id, ...data } = settings

    let error
    if (id) {
      ;({ error } = await supabase.from('test_settings').update(data).eq('id', id))
    } else {
      ;({ error } = await supabase.from('test_settings').insert(data))
    }

    if (!error) {
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
      // 저장 후 다시 로드
      await loadSettings(settings.student_id)
    } else {
      alert(`저장 실패: ${error.message}`)
    }
    setSaving(false)
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">테스트 설정</h1>
        <p className="text-gray-500 text-sm mt-1">학생별 학습 설정을 관리합니다.</p>
      </div>

      {/* 학생 선택 */}
      <div className="bg-white rounded-xl border border-gray-200 p-5 mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">학생 선택</label>
        <select
          value={selectedStudent}
          onChange={(e) => handleStudentChange(e.target.value)}
          className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
        >
          <option value="">학생을 선택하세요</option>
          {students.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name} {s.grade ? `(${s.grade}${s.class_name ? ` / ${s.class_name}` : ''})` : ''}
            </option>
          ))}
        </select>
      </div>

      {loading && (
        <div className="text-center py-8 text-gray-400">불러오는 중...</div>
      )}

      {settings && !loading && (
        <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-5">
          {/* 교재 설정 */}
          <div>
            <h3 className="font-semibold text-gray-700 mb-4">교재 설정</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="md:col-span-3">
                <label className="block text-sm font-medium text-gray-700 mb-1">교재</label>
                <select
                  value={settings.book_id || ''}
                  onChange={(e) => handleChange('book_id', e.target.value || null)}
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                >
                  <option value="">교재 선택</option>
                  {books.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.book_name} ({b.total_words.toLocaleString()}단어)
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">시작 단원</label>
                <input
                  type="number"
                  value={settings.unit_from}
                  onChange={(e) => handleChange('unit_from', parseInt(e.target.value))}
                  min="1"
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">종료 단원</label>
                <input
                  type="number"
                  value={settings.unit_to}
                  onChange={(e) => handleChange('unit_to', parseInt(e.target.value))}
                  min="1"
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">일일 문제 수</label>
                <input
                  type="number"
                  value={settings.daily_question_count}
                  onChange={(e) => handleChange('daily_question_count', parseInt(e.target.value))}
                  min="5"
                  max="100"
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                />
              </div>
            </div>
          </div>

          {/* 문제 유형 */}
          <div className="border-t border-gray-100 pt-5">
            <h3 className="font-semibold text-gray-700 mb-4">문제 유형</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">출제 방향</label>
                <select
                  value={settings.question_direction}
                  onChange={(e) => handleChange('question_direction', e.target.value)}
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                >
                  <option value="en_to_ko">영어 → 한글</option>
                  <option value="ko_to_en">한글 → 영어</option>
                  <option value="mixed">혼합</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">문제 형식</label>
                <select
                  value={settings.question_type}
                  onChange={(e) => handleChange('question_type', e.target.value)}
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                >
                  <option value="multiple">4지선다</option>
                  <option value="short">주관식</option>
                  <option value="mixed">혼합</option>
                </select>
              </div>
            </div>
          </div>

          {/* 오답 순환 설정 */}
          <div className="border-t border-gray-100 pt-5">
            <h3 className="font-semibold text-gray-700 mb-1">오답 순환 설정</h3>
            <p className="text-gray-400 text-xs mb-4">오답 단어를 N번 연속 정답 시 오답 목록에서 제거</p>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">연속 정답 횟수</label>
              <input
                type="number"
                value={settings.wrong_review_count}
                onChange={(e) => handleChange('wrong_review_count', parseInt(e.target.value))}
                min="1"
                max="10"
                className="w-32 px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
              />
            </div>
          </div>

          {/* 출제 비율 */}
          <div className="border-t border-gray-100 pt-5">
            <h3 className="font-semibold text-gray-700 mb-1">출제 비율</h3>
            <p className={`text-xs mb-4 ${validateRatios() ? 'text-green-500' : 'text-red-500'}`}>
              합계: {settings.ratio_wrong + settings.ratio_review + settings.ratio_new}% {validateRatios() ? '✓' : '(100%가 되어야 합니다)'}
            </p>
            <div className="grid grid-cols-3 gap-4">
              {[
                { key: 'ratio_wrong', label: '오답 단어', color: 'text-red-500' },
                { key: 'ratio_review', label: '복습 단어', color: 'text-yellow-500' },
                { key: 'ratio_new', label: '신규 단어', color: 'text-green-500' },
              ].map((item) => (
                <div key={item.key}>
                  <label className={`block text-sm font-medium ${item.color} mb-1`}>{item.label}</label>
                  <div className="flex items-center gap-1">
                    <input
                      type="number"
                      value={settings[item.key as keyof TestSettings] as number}
                      onChange={(e) => handleChange(item.key as keyof TestSettings, parseInt(e.target.value))}
                      min="0"
                      max="100"
                      className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                    />
                    <span className="text-gray-400 text-sm">%</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 저장 버튼 */}
          <div className="pt-2">
            <button
              onClick={handleSave}
              disabled={saving || !validateRatios()}
              className="w-full bg-indigo-600 text-white py-3 rounded-xl font-semibold hover:bg-indigo-700 disabled:opacity-50 transition"
            >
              {saving ? '저장 중...' : saved ? '✅ 저장 완료!' : '설정 저장'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
