import { createAdminClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  const { username, password, name, grade, class_name, book_id, unit_from, unit_to, daily_question_count } = await req.json()

  if (!username || !password || !name) {
    return NextResponse.json({ error: '이름, 아이디, 비밀번호는 필수입니다.' }, { status: 400 })
  }

  // 아이디를 가상 이메일로 변환 (Supabase Auth는 이메일 필수)
  // 한글/특수문자를 영문+숫자로 변환하여 유효한 이메일 로컬파트 생성
  const safeUsername = Buffer.from(username.trim(), 'utf8').toString('hex')
  const email = `u${safeUsername}@sco.local`

  const supabase = await createAdminClient()

  // 1. Supabase Auth에 사용자 생성
  const { data: authData, error: authError } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { username },
  })

  if (authError) {
    if (authError.message.includes('already been registered')) {
      return NextResponse.json({ error: `아이디 "${username}"은(는) 이미 사용 중입니다.` }, { status: 400 })
    }
    return NextResponse.json({ error: authError.message }, { status: 400 })
  }

  const userId = authData.user.id

  // 2. profiles 테이블에 역할 저장
  const { error: profileError } = await supabase
    .from('profiles')
    .insert({ id: userId, role: 'student', name })

  if (profileError) {
    await supabase.auth.admin.deleteUser(userId)
    return NextResponse.json({ error: profileError.message }, { status: 400 })
  }

  // 3. students 테이블에 추가
  const { data: studentData, error: studentError } = await supabase
    .from('students')
    .insert({ profile_id: userId, name, grade: grade || null, class_name: class_name || null })
    .select('id')
    .single()

  if (studentError || !studentData) {
    await supabase.auth.admin.deleteUser(userId)
    return NextResponse.json({ error: studentError?.message || '학생 생성 실패' }, { status: 400 })
  }

  // 4. test_settings 기본값 설정 (교재 지정 시)
  if (book_id) {
    const { error: settingsError } = await supabase.from('test_settings').insert({
      student_id: studentData.id,
      book_id,
      unit_from: unit_from || 1,
      unit_to: unit_to || 999,
      daily_question_count: daily_question_count || 30,
      question_direction: 'en_to_ko',
      question_type: 'multiple',
      wrong_review_count: 3,
      ratio_wrong: 40,
      ratio_review: 30,
      ratio_new: 30,
    })

    if (settingsError) {
      console.error('test_settings 저장 실패:', settingsError)
    }
  }

  return NextResponse.json({ success: true, studentId: studentData.id, userId })
}
