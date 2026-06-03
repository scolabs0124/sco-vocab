import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://chjyhqpithoqjzcvndms.supabase.co';
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNoanlocXBpdGhvcWp6Y3ZuZG1zIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MDQyMjM4MywiZXhwIjoyMDk1OTk4MzgzfQ.0KijhifRe7TFqA0jWwS0PHYjZ46nKCLKDM7SYYxBxpM';

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false }
});

const { data, error } = await supabase.auth.admin.listUsers();
if (error) {
  console.error('Auth Error:', error);
} else {
  console.log('Auth Users:', JSON.stringify(data.users.map(u => ({
    id: u.id, 
    email: u.email, 
    created_at: u.created_at
  })), null, 2));
}

const { data: profiles, error: profileError } = await supabase.from('profiles').select('*');
if (profileError) {
  console.error('Profile Error:', profileError);
} else {
  console.log('Profiles:', JSON.stringify(profiles, null, 2));
}
