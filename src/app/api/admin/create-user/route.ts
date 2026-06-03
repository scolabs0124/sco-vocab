import { createAdminClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  const { email, password, name, role } = await req.json()

  if (!email || !password || !name || !role) {
    return NextResponse.json({ error: '필수 항목을 입력하세요.' }, { status: 400 })
  }

  const supabase = await createAdminClient()

  // Supabase Auth에 사용자 생성
  const { data: authData, error: authError } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  })

  if (authError) {
    return NextResponse.json({ error: authError.message }, { status: 400 })
  }

  const userId = authData.user.id

  // profiles 테이블에 역할 저장
  const { error: profileError } = await supabase
    .from('profiles')
    .insert({ id: userId, role, name })

  if (profileError) {
    // 롤백: auth 사용자 삭제
    await supabase.auth.admin.deleteUser(userId)
    return NextResponse.json({ error: profileError.message }, { status: 400 })
  }

  // 학생인 경우 students 테이블에도 추가
  if (role === 'student') {
    const { error: studentError } = await supabase
      .from('students')
      .insert({ profile_id: userId, name })

    if (studentError) {
      return NextResponse.json({ error: studentError.message }, { status: 400 })
    }
  }

  return NextResponse.json({ success: true, userId })
}
