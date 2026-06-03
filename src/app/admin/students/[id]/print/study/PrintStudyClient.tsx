'use client'

import '@/app/print.css'

interface Word {
  id: string
  english: string
  korean: string
  unit_id: string
  units?: { unit_name: string } | null
}

interface Student {
  id: string
  name: string
  grade: string | null
  class_name: string | null
}

interface Props {
  student: Student
  words: Word[]
  bookName: string
  today: string
}

export default function PrintStudyClient({ student, words, bookName, today }: Props) {
  const handlePrint = () => window.print()

  // 단원별 그룹핑
  const unitGroups: Record<string, Word[]> = {}
  words.forEach(w => {
    const unitName = w.units?.unit_name || '기타'
    if (!unitGroups[unitName]) unitGroups[unitName] = []
    unitGroups[unitName].push(w)
  })

  return (
    <>
      {/* 화면 전용 버튼 */}
      <div className="screen-only" style={{ padding: '16px', background: '#f3f4f6', borderBottom: '1px solid #e5e7eb' }}>
        <div style={{ maxWidth: '210mm', margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <h2 style={{ margin: 0, fontSize: '16px', fontWeight: 700 }}>📄 학습지 미리보기</h2>
            <p style={{ margin: '4px 0 0', fontSize: '13px', color: '#666' }}>
              {student.name} · {bookName} · {words.length}개 단어
            </p>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={() => window.history.back()}
              style={{ padding: '8px 16px', border: '1px solid #d1d5db', borderRadius: '6px', background: '#fff', cursor: 'pointer', fontSize: '13px' }}
            >
              ← 돌아가기
            </button>
            <button
              onClick={handlePrint}
              style={{ padding: '8px 20px', background: '#4f46e5', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '13px', fontWeight: 600 }}
            >
              🖨️ 인쇄 / PDF 저장
            </button>
          </div>
        </div>
      </div>

      <div className="print-container">
        <div className="print-page">
          {/* 헤더 */}
          <div className="print-header">
            <div className="print-header-top">
              <div>
                <div className="print-title">SCO 영단어 학습지</div>
                <div className="print-subtitle">학습 후 덮고 외워보세요!</div>
              </div>
              <div style={{ textAlign: 'right', fontSize: '9pt', color: '#555' }}>
                <div>SCO 영어학원</div>
              </div>
            </div>
            <div className="print-header-info">
              <span><span className="label">학생:</span> <strong>{student.name}</strong>{student.grade ? ` (${student.grade}${student.class_name ? ` ${student.class_name}반` : ''})` : ''}</span>
              <span><span className="label">교재:</span> {bookName || '—'}</span>
              <span><span className="label">날짜:</span> {today}</span>
              <span><span className="label">단어 수:</span> {words.length}개</span>
            </div>
          </div>

          {words.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '60px 0', color: '#888' }}>
              <p>출력할 단어가 없습니다.</p>
              <p style={{ fontSize: '10pt' }}>관리자 페이지에서 교재 및 단원을 설정해주세요.</p>
            </div>
          ) : (
            <>
              {/* 단원별 단어 테이블 */}
              {Object.entries(unitGroups).map(([unitName, unitWords]) => (
                <div key={unitName} style={{ marginBottom: '16px' }}>
                  <div style={{ fontSize: '9.5pt', fontWeight: 700, color: '#4f46e5', marginBottom: '4px', paddingLeft: '4px' }}>
                    ▸ {unitName}
                  </div>
                  <table className="word-table">
                    <thead>
                      <tr>
                        <th className="num">#</th>
                        <th className="english">영어</th>
                        <th>한글 뜻</th>
                        <th style={{ width: '30%' }}>메모</th>
                      </tr>
                    </thead>
                    <tbody>
                      {unitWords.map((word, idx) => (
                        <tr key={word.id}>
                          <td className="num">{String(idx + 1).padStart(2, '0')}</td>
                          <td className="english">{word.english}</td>
                          <td className="korean">{word.korean}</td>
                          <td></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ))}
            </>
          )}

          {/* 푸터 */}
          <div className="print-footer">
            <span>SCO 영단어 학습지 — {student.name}</span>
            <span>{today}</span>
          </div>
        </div>
      </div>
    </>
  )
}
