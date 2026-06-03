'use client'
export const dynamic = 'force-dynamic'

import { useState, useRef, useCallback } from 'react'
import Link from 'next/link'

interface PreviewRow {
  book_name: string
  unit: string
  english: string
  korean: string
  level?: string
  memo?: string
}

export default function UploadPage() {
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<PreviewRow[]>([])
  const [dragging, setDragging] = useState(false)
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null)
  const [error, setError] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFile = useCallback(async (f: File) => {
    setFile(f)
    setResult(null)
    setError('')

    const fileName = f.name.toLowerCase()
    if (!fileName.endsWith('.csv') && !fileName.endsWith('.xlsx') && !fileName.endsWith('.xls')) {
      setError('CSV 또는 XLSX 파일만 지원합니다.')
      setPreview([])
      return
    }

    // 미리보기: CSV는 직접 파싱, XLSX는 서버에서 처리
    if (fileName.endsWith('.csv')) {
      const text = await f.text()
      const lines = text.split('\n').filter(Boolean)
      if (lines.length < 2) {
        setPreview([])
        return
      }
      const headers = lines[0].split(',').map((h) => h.trim().replace(/"/g, ''))
      const rows: PreviewRow[] = []
      for (let i = 1; i < Math.min(lines.length, 6); i++) {
        const vals = lines[i].match(/(".*?"|[^,]+)/g) || []
        const row: Record<string, string> = {}
        headers.forEach((h, idx) => {
          row[h] = (vals[idx] || '').replace(/^"|"$/g, '').trim()
        })
        if (row.english || row['영어'] || row['단어']) {
          rows.push({
            book_name: row.book_name || row['교재'] || row['책'] || '기본 교재',
            unit: row.unit || row['단원'] || row['day'] || row['DAY'] || 'DAY 1',
            english: row.english || row['영어'] || row['단어'] || '',
            korean: row.korean || row['한글'] || row['뜻'] || row['의미'] || '',
            level: row.level || row['레벨'] || '',
          })
        }
      }
      setPreview(rows)
    } else {
      setPreview([{ book_name: '(XLSX 미리보기는 업로드 후 확인)', unit: '-', english: '-', korean: '-' }])
    }
  }, [])

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      setDragging(false)
      const f = e.dataTransfer.files[0]
      if (f) handleFile(f)
    },
    [handleFile]
  )

  const handleUpload = async () => {
    if (!file) return
    setLoading(true)
    setError('')
    setResult(null)

    const formData = new FormData()
    formData.append('file', file)

    try {
      const res = await fetch('/api/upload-words', {
        method: 'POST',
        body: formData,
      })
      const data = await res.json()

      if (!res.ok) {
        setError(data.error || '업로드 실패')
      } else {
        setResult({ success: true, message: data.message })
        setFile(null)
        setPreview([])
      }
    } catch (e: any) {
      setError('네트워크 오류가 발생했습니다.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-6">
        <Link href="/admin/books" className="text-indigo-600 hover:text-indigo-800 text-sm flex items-center gap-1">
          ← 교재 목록으로
        </Link>
        <h1 className="text-2xl font-bold text-gray-900 mt-2">단어 업로드</h1>
        <p className="text-gray-500 text-sm mt-1">CSV 또는 XLSX 파일을 업로드하여 단어를 등록하세요.</p>
      </div>

      {/* 포맷 안내 */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6">
        <h3 className="font-semibold text-blue-800 mb-2">📋 파일 형식 안내</h3>
        <p className="text-blue-700 text-sm mb-2">필수 컬럼: <code className="bg-blue-100 px-1 rounded">english</code> (또는 영어/단어), <code className="bg-blue-100 px-1 rounded">korean</code> (또는 한글/뜻)</p>
        <p className="text-blue-700 text-sm mb-2">선택 컬럼: <code className="bg-blue-100 px-1 rounded">book_name</code>, <code className="bg-blue-100 px-1 rounded">unit</code>, <code className="bg-blue-100 px-1 rounded">level</code>, <code className="bg-blue-100 px-1 rounded">memo</code></p>
        <div className="bg-white rounded-lg p-3 mt-2 font-mono text-xs text-gray-700 overflow-x-auto">
          <div className="text-gray-400 mb-1"># CSV 예시</div>
          <div>book_name,unit,english,korean</div>
          <div>SCO 중등 영단어,DAY 1,abandon,"버리다, 포기하다"</div>
          <div>SCO 중등 영단어,DAY 1,ability,능력</div>
        </div>
      </div>

      {/* 드래그&드롭 영역 */}
      <div
        onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-colors ${
          dragging ? 'border-indigo-500 bg-indigo-50' : 'border-gray-300 hover:border-indigo-400 hover:bg-gray-50'
        }`}
      >
        <div className="text-4xl mb-3">📁</div>
        <p className="text-gray-700 font-medium">파일을 여기에 드래그하거나 클릭하여 선택</p>
        <p className="text-gray-400 text-sm mt-1">CSV, XLSX, XLS 지원</p>
        {file && (
          <div className="mt-3 inline-flex items-center gap-2 bg-indigo-100 text-indigo-700 px-3 py-1 rounded-full text-sm">
            <span>📄</span>
            <span>{file.name}</span>
            <span className="text-gray-400">({(file.size / 1024).toFixed(1)} KB)</span>
          </div>
        )}
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv,.xlsx,.xls"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0]
            if (f) handleFile(f)
          }}
        />
      </div>

      {/* 에러 */}
      {error && (
        <div className="mt-4 bg-red-50 border border-red-200 rounded-lg p-3">
          <p className="text-red-600 text-sm">❌ {error}</p>
        </div>
      )}

      {/* 성공 결과 */}
      {result && (
        <div className="mt-4 bg-green-50 border border-green-200 rounded-lg p-4">
          <p className="text-green-700 font-semibold">✅ {result.message}</p>
          <Link href="/admin/books" className="text-green-600 text-sm underline mt-1 inline-block">
            교재 목록에서 확인하기 →
          </Link>
        </div>
      )}

      {/* 미리보기 */}
      {preview.length > 0 && (
        <div className="mt-6">
          <h3 className="font-semibold text-gray-700 mb-2">미리보기 (최대 5행)</h3>
          <div className="overflow-x-auto rounded-xl border border-gray-200">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-left text-gray-600 font-medium">교재</th>
                  <th className="px-4 py-2 text-left text-gray-600 font-medium">단원</th>
                  <th className="px-4 py-2 text-left text-gray-600 font-medium">영어</th>
                  <th className="px-4 py-2 text-left text-gray-600 font-medium">한글</th>
                  <th className="px-4 py-2 text-left text-gray-600 font-medium">레벨</th>
                </tr>
              </thead>
              <tbody>
                {preview.map((row, i) => (
                  <tr key={i} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                    <td className="px-4 py-2 text-gray-700">{row.book_name}</td>
                    <td className="px-4 py-2 text-gray-700">{row.unit}</td>
                    <td className="px-4 py-2 font-medium text-gray-900">{row.english}</td>
                    <td className="px-4 py-2 text-gray-700">{row.korean}</td>
                    <td className="px-4 py-2 text-gray-400">{row.level || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 업로드 버튼 */}
      {file && !result && (
        <div className="mt-6">
          <button
            onClick={handleUpload}
            disabled={loading}
            className="w-full bg-indigo-600 text-white py-3 rounded-xl font-semibold hover:bg-indigo-700 disabled:opacity-50 transition text-lg"
          >
            {loading ? '업로드 중...' : '📤 업로드 시작'}
          </button>
        </div>
      )}
    </div>
  )
}
