'use client'

import '@/app/print.css'
import { useRouter, useSearchParams } from 'next/navigation'
import { useState } from 'react'

interface Word {
  id: string
  english: string
  korean: string
  unit_id: string
  units?: { unit_name: string } | null
}

interface Props {
  student: { id: string; name: string; grade: string | null; class_name: string | null }
  words: Word[]
  allWords: { english: string; korean: string }[]
  bookName: string
  today: string
  type: 'A' | 'B' | 'C'
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

function getChoices(word: Word, allWords: { english: string; korean: string }[], type: 'A' | 'B' | 'C') {
  // 정답 포함 4개 보기
  const correct = type === 'A' ? word.korean : word.english
  const pool = allWords
    .filter(w => (type === 'A' ? w.korean : w.english) !== correct)
    .map(w => type === 'A' ? w.korean : w.english)
  const distractors = shuffle(pool).slice(0, 3)
  return shuffle([correct, ...distractors])
}

const TYPE_LABELS = {
  A: '영어 → 한글뜻 (빈칸)',
  B: '한글뜻 → 영어 (빈칸)',
  C: '4지선다',
}

export default function PrintTestClient({ student, words, allWords, bookName, today, type }: Props) {
  const [currentType, setCurrentType] = useState<'A' | 'B' | 'C'>(type)
  const router = useRouter()
  const searchParams = useSearchParams()

  const changeType = (t: 'A' | 'B' | 'C') => {
    setCurrentType(t)
    const params = new URLSearchParams(searchParams.toString())
    params.set('type', t)
    router.replace(`?${params.toString()}`)
  }

  const handlePrint = () => window.print()

  const typeLabel = TYPE_LABELS[currentType]
  const studentLabel = `${student.name}${student.grade ? ` (${student.grade}${student.class_name ? ` ${student.class_name}반` : ''})` : ''}`

  return (
    <>
      {/* 화면 전용 컨트롤 */}
      <div className="screen-only" style={{ padding: '16px', background: '#f3f4f6', borderBottom: '1px solid #e5e7eb' }}>
        <div style={{ maxWidth: '210mm', margin: '0 auto' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
            <div>
              <h2 style={{ margin: 0, fontSize: '16px', fontWeight: 700 }}>📝 테스트지 미리보기</h2>
              <p style={{ margin: '4px 0 0', fontSize: '13px', color: '#666' }}>
                {student.name} · {bookName} · {words.length}문제
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

          {/* 유형 선택 */}
          <div style={{ display: 'flex', gap: '8px' }}>
            {(['A', 'B', 'C'] as const).map(t => (
              <button
                key={t}
                onClick={() => changeType(t)}
                style={{
                  padding: '6px 14px',
                  borderRadius: '6px',
                  border: '1px solid',
                  borderColor: currentType === t ? '#4f46e5' : '#d1d5db',
                  background: currentType === t ? '#4f46e5' : '#fff',
                  color: currentType === t ? '#fff' : '#374151',
                  cursor: 'pointer',
                  fontSize: '12px',
                  fontWeight: currentType === t ? 600 : 400,
                }}
              >
                유형 {t}: {TYPE_LABELS[t]}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="print-container">
        <div className="print-page">
          {/* 헤더 */}
          <div className="print-header">
            <div className="print-header-top">
              <div>
                <div className="print-title">SCO 영단어 테스트 — 유형 {currentType}</div>
                <div className="print-subtitle">{typeLabel}</div>
              </div>
              <div style={{ textAlign: 'right', fontSize: '9pt', color: '#555' }}>
                <div>SCO 영어학원</div>
                <div style={{ marginTop: '2px' }}>{today}</div>
              </div>
            </div>
            <div className="print-header-info">
              <span><span className="label">교재:</span> {bookName || '—'}</span>
              <span><span className="label">문제 수:</span> {words.length}문제</span>
              <span><span className="label">만점:</span> {words.length}점</span>
            </div>
          </div>

          {/* 학생 정보 입력란 */}
          <div className="print-student-fields">
            <div className="print-field">
              <span className="field-label">이름:</span>
              <div className="print-field">
                <div className="field-line wide" style={{ minWidth: '100px' }}></div>
              </div>
            </div>
            <div className="print-field">
              <span className="field-label">반:</span>
              <div className="field-line" style={{ minWidth: '60px' }}></div>
            </div>
            <div className="print-field">
              <span className="field-label">날짜:</span>
              <div className="field-line" style={{ minWidth: '40px' }}></div>
              <span style={{ fontSize: '9pt' }}>/</span>
              <div className="field-line" style={{ minWidth: '30px' }}></div>
              <span style={{ fontSize: '9pt' }}>/</span>
              <div className="field-line" style={{ minWidth: '30px' }}></div>
            </div>
          </div>

          {words.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '60px 0', color: '#888' }}>
              <p>출력할 단어가 없습니다.</p>
            </div>
          ) : currentType === 'C' ? (
            /* 유형 C: 4지선다 */
            <div style={{ columns: '2', columnGap: '20px' }}>
              {words.map((word, idx) => {
                const choices = getChoices(word, allWords, 'C')
                return (
                  <div key={word.id} className="mc-question" style={{ breakInside: 'avoid', marginBottom: '12px' }}>
                    <div className="q-text" style={{ fontSize: '10.5pt' }}>
                      {String(idx + 1).padStart(2, '0')}. <strong>{word.english}</strong>
                    </div>
                    <div className="mc-choices">
                      {choices.map((c, ci) => (
                        <div key={ci} className="choice">
                          <span style={{ color: '#555', fontSize: '9.5pt' }}>{'①②③④'[ci]}</span>
                          <span style={{ fontSize: '10pt' }}>{c}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            /* 유형 A/B: 빈칸 */
            <table className="word-table">
              <thead>
                <tr>
                  <th className="num">#</th>
                  {currentType === 'A' ? (
                    <>
                      <th style={{ width: '40%' }}>영어</th>
                      <th>한글 뜻 (빈칸)</th>
                    </>
                  ) : (
                    <>
                      <th style={{ width: '40%' }}>한글 뜻</th>
                      <th>영어 (빈칸)</th>
                    </>
                  )}
                </tr>
              </thead>
              <tbody>
                {words.map((word, idx) => (
                  <tr key={word.id}>
                    <td className="num">{String(idx + 1).padStart(2, '0')}</td>
                    {currentType === 'A' ? (
                      <>
                        <td className="english">{word.english}</td>
                        <td><span className="answer-line"></span></td>
                      </>
                    ) : (
                      <>
                        <td className="korean">{word.korean}</td>
                        <td><span className="answer-line"></span></td>
                      </>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {/* 채점란 */}
          <div className="score-box">
            <div className="score-field">
              <span>채점:</span>
              <div className="score-line"></div>
              <span>점 / {words.length}점</span>
            </div>
            <div className="score-field">
              <span>정답률:</span>
              <div className="score-line"></div>
              <span>%</span>
            </div>
            <div className="score-field">
              <span>확인:</span>
              <div className="score-line" style={{ minWidth: '80px' }}></div>
            </div>
          </div>

          <div className="print-footer">
            <span>SCO 영단어 테스트 — 유형 {currentType}</span>
            <span>{today}</span>
          </div>
        </div>
      </div>
    </>
  )
}
