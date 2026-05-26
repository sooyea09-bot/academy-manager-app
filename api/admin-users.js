// 관리자: 가입자 명단 조회 (읽기 전용)
// 필요한 Vercel 환경변수: SUPABASE_SERVICE_ROLE_KEY
// (선택) ADMIN_EMAILS = 콤마로 구분한 관리자 이메일 목록. 미설정 시 아래 기본값 사용.
// 서비스 키는 서버에서만 사용되며 클라이언트(페이지)로 절대 전달되지 않습니다.
const SUPABASE_URL = 'https://wpvlgcyklnknzdtpnyxv.supabase.co';
const DEFAULT_ADMINS = 'sooyea09@gmail.com';

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') { res.status(204).end(); return; }
  if (req.method !== 'GET' && req.method !== 'POST') { res.status(405).json({ error: 'GET only' }); return; }

  const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!KEY) {
    res.status(500).json({ error: 'SUPABASE_SERVICE_ROLE_KEY 환경변수가 설정되지 않았습니다. Vercel → Settings → Environment Variables 에서 추가해주세요.' });
    return;
  }

  try {
    // 1) 요청자(로그인한 사용자) 토큰 검증
    const authHeader = req.headers['authorization'] || req.headers['Authorization'] || '';
    const token = String(authHeader).replace(/^Bearer\s+/i, '').trim();
    if (!token) { res.status(401).json({ error: '로그인이 필요합니다.' }); return; }

    const meRes = await fetch(SUPABASE_URL + '/auth/v1/user', {
      headers: { apikey: KEY, Authorization: 'Bearer ' + token }
    });
    if (!meRes.ok) { res.status(401).json({ error: '인증에 실패했습니다. 다시 로그인 해주세요.' }); return; }
    const me = await meRes.json();

    const admins = (process.env.ADMIN_EMAILS || DEFAULT_ADMINS)
      .split(',').map(function (s) { return s.trim().toLowerCase(); }).filter(Boolean);
    if (!me || !me.email || admins.indexOf(String(me.email).toLowerCase()) < 0) {
      res.status(403).json({ error: '관리자(원장)만 접근할 수 있습니다.' });
      return;
    }

    // 2) 전체 가입자 목록 조회 (Supabase Admin API)
    const listRes = await fetch(SUPABASE_URL + '/auth/v1/admin/users?per_page=500', {
      headers: { apikey: KEY, Authorization: 'Bearer ' + KEY }
    });
    const data = await listRes.json();
    if (!listRes.ok) {
      res.status(listRes.status).json({ error: (data && (data.msg || data.message)) || '가입자 목록 조회에 실패했습니다.' });
      return;
    }

    const rawUsers = Array.isArray(data) ? data : (data.users || []);
    const users = rawUsers.map(function (u) {
      const m = u.user_metadata || {};
      return {
        email: u.email || '',
        name: m.name || '',
        academy: m.academy_name || '',
        role: m.invite_code ? 'teacher' : 'owner',
        created_at: u.created_at || '',
        last_sign_in_at: u.last_sign_in_at || '',
        confirmed: !!(u.email_confirmed_at || u.confirmed_at)
      };
    });
    users.sort(function (a, b) { return new Date(b.created_at) - new Date(a.created_at); });

    res.status(200).json({ users: users, count: users.length });
  } catch (e) {
    res.status(500).json({ error: String((e && e.message) || e) });
  }
}
