// 관리자: 가입자 승인/해제 (app_metadata.approved 변경)
// 필요한 Vercel 환경변수: SUPABASE_SERVICE_ROLE_KEY  (선택) ADMIN_EMAILS
// 서비스 키는 서버에서만 사용되며 클라이언트로 전달되지 않습니다.
const SUPABASE_URL = 'https://wpvlgcyklnknzdtpnyxv.supabase.co';
const DEFAULT_ADMINS = 'djasid11@naver.com';

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') { res.status(204).end(); return; }
  if (req.method !== 'POST') { res.status(405).json({ error: 'POST only' }); return; }

  const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!KEY) { res.status(500).json({ error: 'SUPABASE_SERVICE_ROLE_KEY 환경변수가 설정되지 않았습니다.' }); return; }

  try {
    // 1) 요청자(원장) 토큰 검증
    const authHeader = req.headers['authorization'] || req.headers['Authorization'] || '';
    const token = String(authHeader).replace(/^Bearer\s+/i, '').trim();
    if (!token) { res.status(401).json({ error: '로그인이 필요합니다.' }); return; }

    const meRes = await fetch(SUPABASE_URL + '/auth/v1/user', {
      headers: { apikey: KEY, Authorization: 'Bearer ' + token }
    });
    if (!meRes.ok) { res.status(401).json({ error: '인증 실패. 다시 로그인 해주세요.' }); return; }
    const me = await meRes.json();
    const admins = (process.env.ADMIN_EMAILS || DEFAULT_ADMINS)
      .split(',').map(function (s) { return s.trim().toLowerCase(); }).filter(Boolean);
    if (!me || !me.email || admins.indexOf(String(me.email).toLowerCase()) < 0) {
      res.status(403).json({ error: '관리자(원장)만 승인할 수 있습니다.' }); return;
    }

    // 2) 본문에서 대상 사용자/승인여부 읽기
    let body = req.body;
    if (typeof body === 'string') { try { body = JSON.parse(body); } catch (e) { body = {}; } }
    body = body || {};
    const userId = body.userId;
    const approved = body.approved === true || body.approved === 'true';
    if (!userId) { res.status(400).json({ error: 'userId가 필요합니다.' }); return; }
    if (userId === me.id) { res.status(400).json({ error: '본인 계정은 변경할 수 없습니다.' }); return; }

    // 3) 대상 사용자의 app_metadata.approved 변경 (service_role 권한 필요)
    const upRes = await fetch(SUPABASE_URL + '/auth/v1/admin/users/' + encodeURIComponent(userId), {
      method: 'PUT',
      headers: { apikey: KEY, Authorization: 'Bearer ' + KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({ app_metadata: { approved: approved } })
    });
    const data = await upRes.json();
    if (!upRes.ok) {
      res.status(upRes.status).json({ error: (data && (data.msg || data.message)) || '승인 처리에 실패했습니다.' });
      return;
    }
    res.status(200).json({ ok: true, userId: userId, approved: approved });
  } catch (e) {
    res.status(500).json({ error: String((e && e.message) || e) });
  }
}
