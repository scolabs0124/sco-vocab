'use client'

import '@/app/print.css'

interface Question {
  id: string
  question_order: number
  question_type: string
  direction: string
  question_text: string
  choices: string[] | null
  correct_answer: string
  student_answer: string | null
  is_correct: boolean | null
  words?: { english: string; korean: string } | null
}

interface Props {
  student: { id: string; name: string; grade: string | null; class_name: string | null }
  questions: Question[]
  bookName: string
  today: string
  testDate: string
  testInfo: {
    totalCount: number
    correctCount: number
    wrongCount: number
    status: string
  }
}

export default function PrintAnswerClient({ student, questions, bookName, today, testDate, testInfo }: Props) {
  const handlePrint = () => window.print()

  const score = testInfo.totalCount > 0
    ? Math.round((testInfo.correctCount / testInfo.totalCount) * 100)
    : 0

  const studentLabel = `${student.name}${student.grade ? ` (${student.grade}${student.class_name ? ` ${student.class_name}반` : ''})` : ''}`

  return (
    <>
      {/* 화면 전용 버튼 */}
      <div className="screen-only" style={{ padding: '16px', background: '#f3f4f6', borderBottom: '1px solid #e5e7eb' }}>
        <div style={{ maxWidth: '210mm', margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <h2 style={{ margin: 0, fontSize: '16px', fontWeight: 700 }}>📋 답안지 미리보기</h2>
            <p style={{ margin: '4px 0 0', fontSize: '13px', color: '#666' }}>
              {student.name} · {bookName} · {testDate} 시험 · {testInfo.totalCount}문제
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
                <div className="print-title">SCO 영단어 답안지</div>
                <div className="print-subtitle">정답이 빨간색으로 표시됩니다</div>
              </div>
              <div style={{ textAlign: 'right', fontSize: '9pt', color: '#555' }}>
                <div>SCO 영어학원</div>
                <div style={{ marginTop: '2px' }}>출력: {today}</div>
              </div>
            </div>
            <div className="print-header-info">
              <span><span className="label">학생:</span> <strong>{studentLabel}</strong></span>
              <span><span className="label">교재:</span> {bookName || '—'}</span>
              <span><span className="label">시험일:</span> {testDate}</span>
              <span><span className="label">결과:</span>
                <strong style={{ color: score >= 80 ? '#16a34a' : score >= 60 ? '#d97706' : '#dc2626' }}>
                  {testInfo.correctCount}/{testInfo.totalCount} ({score}%)
                </strong>
              </span>
            </div>
          </div>

          {/* 성적 요약 박스 */}
          <div style={{
            display: 'flex',
            gap: '12px',
            marginBottom: '12px',
            padding: '8px 12px',
            background: '#f8f9fa',
            borderRadius: '6px',
            border: '1px solid #e5e7eb',
          }}>
            <div style={{ textAlign: 'center', flex: 1 }}>
              <div style={{ fontSize: '18pt', fontWeight: 700, color: '#4f46e5' }}>{score}%</div>
              <div style={{ fontSize: '8.5pt', color: '#666' }}>정답률</div>
            </div>
            <div style={{ textAlign: 'center', flex: 1 }}>
              <div style={{ fontSize: '18pt', fontWeight: 700, color: '#16a34a' }}>{testInfo.correctCount}</div>
              <div style={{ fontSize: '8.5pt', color: '#666' }}>정답</div>
            </div>
            <div style={{ textAlign: 'center', flex: 1 }}>
              <div style={{ fontSize: '18pt', fontWeight: 700, color: '#dc2626' }}>{testInfo.wrongCount}</div>
              <div style={{ fontSize: '8.5pt', color: '#666' }}>오답</div>
            </div>
            <div style={{ textAlign: 'center', flex: 1 }}>
              <div style={{ fontSize: '18pt', fontWeight: 700, color: '#374151' }}>{testInfo.totalCount}</div>
              <div style={{ fontSize: '8.5pt', color: '#666' }}>총 문제</div>
            </div>
          </div>

          {questions.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 0', color: '#888' }}>
              <p>답안 데이터가 없습니다.</p>
            </div>
          ) : (
            <table className="word-table">
              <thead>
                <tr>
                  <th className="num">#</th>
                  <th style={{ width: '35%' }}>문제</th>
                  <th style={{ width: '25%' }}>정답</th>
                  <th style={{ width: '25%' }}>학생 답안</th>
                  <th style={{ width: '8%', textAlign: 'center' }}>결과</th>
                </tr>
              </thead>
              <tbody>
                {questions.map((q, idx) => (
                  <tr key={q.id} style={{ background: q.is_correct === false ? '#fff5f5' : undefined }}>
                    <td className="num">{String(idx + 1).padStart(2, '0')}</td>
                    <td style={{ fontWeight: 600, fontSize: '10pt' }}>{q.question_text}</td>
                    <td className="answer-text">{q.correct_answer}</td>
                    <td style={{
                      color: q.is_correct === false ? '#dc2626' : q.is_correct === true ? '#16a34a' : '#888',
                      fontSize: '10pt',
                    }}>
                      {q.student_answer || <span style={{ color: '#bbb', fontStyle: 'italic' }}>미응답</span>}
                    </td>
                    <td style={{ textAlign: 'center', fontSize: '12pt' }}>
                      {q.is_correct === true ? '✓' : q.is_correct === false ? '✗' : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {/* 오답 단어 별지 */}
          {questions.filter(q => q.is_correct === false).length > 0 && (
            <div style={{ marginTop: '20px', paddingTop: '12px', borderTop: '1px dashed #ccc' }}>
              <div style={{ fontSize: '10pt', fontWeight: 700, marginBottom: '8px', color: '#dc2626' }}>
                ❌ 오답 단어 목록 ({questions.filter(q => q.is_correct === false).length}개)
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '4px' }}>
                {questions
                  .filter(q => q.is_correct === false)
                  .map((q, idx) => (
                    <div key={q.id} style={{ fontSize: '9.5pt', padding: '2px 4px', background: '#fff5f5', borderRadius: '3px' }}>
                      <span style={{ color: '#888', marginRight: '4px' }}>{idx + 1}.</span>
                      <strong>{q.words?.english || q.question_text}</strong>
                      <span style={{ color: '#dc2626', marginLeft: '4px' }}>→ {q.correct_answer}</span>
                    </div>
                  ))}
              </div>
            </div>
          )}

          <div className="print-footer">
            <span>SCO 영단어 답안지 — {studentLabel}</span>
            <span>{testDate} 시험</span>
          </div>
        </div>
      </div>
    </>
  )
}
