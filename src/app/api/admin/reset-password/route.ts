import { createAdminClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  const { studentId, newPassword } = await req.json()

  if (!studentId || !newPassword || newPassword.length < 8) {
    return NextResponse.json({ error: '잘못된 요청입니다.' }, { status: 400 })
  }

  const supabase = await createAdminClient()

  // 학생의 profile_id 조회
  const { data: student, error: studentError } = await supabase
    .from('students')
    .select('profile_id')
    .eq('id', studentId)
    .single()

  if (studentError || !student) {
    return NextResponse.json({ error: '학생을 찾을 수 없습니다.' }, { status: 404 })
  }

  // 비밀번호 변경
  const { error } = await supabase.auth.admin.updateUserById(student.profile_id, {
    password: newPassword,
  })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }

  return NextResponse.json({ success: true })
}
