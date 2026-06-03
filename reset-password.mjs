import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://chjyhqpithoqjzcvndms.supabase.co';
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNoanlocXBpdGhvcWp6Y3ZuZG1zIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MDQyMjM4MywiZXhwIjoyMDk1OTk4MzgzfQ.0KijhifRe7TFqA0jWwS0PHYjZ46nKCLKDM7SYYxBxpM';

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false }
});

// 사용자 ID: a68b08d4-f8bd-48f1-b967-3402f2e6c73e
const userId = 'a68b08d4-f8bd-48f1-b967-3402f2e6c73e';
const newPassword = 'sco12345!';

const { data, error } = await supabase.auth.admin.updateUserById(userId, {
  password: newPassword
});

if (error) {
  console.error('Error:', error);
} else {
  console.log('비밀번호 재설정 완료!');
  console.log('이메일: s_co0101@naver.com');
  console.log('새 비밀번호: ' + newPassword);
}
