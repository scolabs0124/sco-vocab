export const dynamic = 'force-dynamic'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'

export default async function AdminDashboard() {
  const supabase = await createClient()
  const today = new Date().toISOString().split('T')[0]

  const [
    { count: studentCount },
    { count: bookCount },
    { count: wordCount },
    { data: todayTests },
    { data: recentTests },
  ] = await Promise.all([
    supabase.from('students').select('*', { count: 'exact', head: true }),
    supabase.from('books').select('*', { count: 'exact', head: true }),
    supabase.from('words').select('*', { count: 'exact', head: true }),
    supabase.from('tests').select('correct_count, total_count').eq('test_date', today).eq('status', 'done'),
    supabase.from('tests').select('*, students(name)').eq('status', 'done').order('created_at', { ascending: false }).limit(5),
  ])

  const todayCompleted = todayTests?.length || 0
  const avgScore = todayCompleted > 0
    ? Math.round((todayTests || []).reduce((sum: number, t: any) => sum + (t.correct_count / t.total_count) * 100, 0) / todayCompleted)
    : 0

  const kpiCards = [
    { label: '등록 학생', value: studentCount ?? 0, icon: '👨\u200d🎓', color: 'bg-blue-50 text-blue-600' },
    { label: '단어장', value: bookCount ?? 0, icon: '📚', color: 'bg-green-50 text-green-600' },
    { label: '전체 단어', value: (wordCount ?? 0).toLocaleString(), icon: '📝', color: 'bg-purple-50 text-purple-600' },
    { label: '오늘 완료', value: todayCompleted, icon: '✅', color: 'bg-orange-50 text-orange-600' },
  ]

  return (
    <div className="max-w-5xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">대시보드</h1>
        <p className="text-gray-500 text-sm mt-1">SCO 단어암기장 학습 관리 현황</p>
      </div>

      {/* KPI 카드 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {kpiCards.map((card) => (
          <div key={card.label} className="bg-white rounded-xl p-5 border border-gray-200">
            <div className={`inline-flex items-center justify-center w-10 h-10 rounded-xl ${card.color} mb-3`}>
              <span className="text-xl">{card.icon}</span>
            </div>
            <p className="text-gray-500 text-sm">{card.label}</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">{card.value}</p>
          </div>
        ))}
      </div>

      {/* 오늘 평균 정답률 */}
      {todayCompleted > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-5 mb-6">
          <h3 className="font-semibold text-gray-700 mb-3">오늘 평균 정답률</h3>
          <div className="flex items-center gap-4">
            <div className="flex-1 bg-gray-100 rounded-full h-4">
              <div className="bg-indigo-600 h-4 rounded-full" style={{ width: `${avgScore}%` }} />
            </div>
            <span className="font-bold text-indigo-600 text-lg">{avgScore}%</span>
          </div>
        </div>
      )}

      {/* 빠른 메뉴 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        {[
          { href: '/admin/books/upload', label: '단어 업로드', desc: 'CSV/XLSX 파일 업로드', icon: '📤' },
          { href: '/admin/students/new', label: '학생 등록', desc: '새 학생 계정 생성', icon: '➕' },
          { href: '/admin/books', label: '단어장 관리', desc: '교재 및 단원 관리', icon: '📚' },
          { href: '/admin/students', label: '학생 목록', desc: '학생 현황 확인', icon: '👥' },
        ].map((item) => (
          <Link key={item.href} href={item.href} className="bg-white rounded-xl p-4 border border-gray-200 hover:border-indigo-300 hover:bg-indigo-50 transition">
            <span className="text-2xl">{item.icon}</span>
            <p className="font-medium text-gray-900 mt-2 text-sm">{item.label}</p>
            <p className="text-gray-400 text-xs mt-0.5">{item.desc}</p>
          </Link>
        ))}
      </div>

      {/* 최근 테스트 */}
      {(recentTests || []).length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100">
            <h3 className="font-semibold text-gray-700">최근 테스트 결과</h3>
          </div>
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-5 py-3 text-left text-xs font-medium text-gray-500">학생</th>
                <th className="px-5 py-3 text-left text-xs font-medium text-gray-500">날짜</th>
                <th className="px-5 py-3 text-left text-xs font-medium text-gray-500">정답률</th>
                <th className="px-5 py-3 text-left text-xs font-medium text-gray-500">결과</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {(recentTests || []).map((test: any) => {
                const score = Math.round((test.correct_count / test.total_count) * 100)
                return (
                  <tr key={test.id} className="hover:bg-gray-50">
                    <td className="px-5 py-3 text-sm font-medium text-gray-900">{test.students?.name || '-'}</td>
                    <td className="px-5 py-3 text-sm text-gray-500">{new Date(test.test_date).toLocaleDateString('ko-KR')}</td>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-16 bg-gray-100 rounded-full h-1.5">
                          <div className={`h-1.5 rounded-full ${score >= 80 ? 'bg-green-500' : score >= 60 ? 'bg-yellow-400' : 'bg-red-400'}`} style={{ width: `${score}%` }} />
                        </div>
                        <span className="text-sm font-medium text-gray-700">{score}%</span>
                      </div>
                    </td>
                    <td className="px-5 py-3 text-sm text-gray-500">{test.correct_count}/{test.total_count}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
