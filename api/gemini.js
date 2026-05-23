// api/gemini.js — Vercel Serverless Function (구글 Gemini 무료 API 프록시)
// 키는 Vercel 환경변수 GEMINI_API_KEY 에만 저장됩니다. (코드/사이트 소스에 노출되지 않음)
// 클라이언트는 기존 Anthropic 형식 body를 보내고 동일 형식 응답을 받습니다 → index.html 수정 최소화.

const MODEL = 'gemini-2.5-flash'; // 무료 티어 모델 (2026 기준). 바꾸려면 이 한 줄만 수정.

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') { res.status(204).end(); return; }
  if (req.method !== 'POST') { res.status(405).json({ error: 'POST only' }); return; }

  const KEY = process.env.GEMINI_API_KEY;
  if (!KEY) {
    res.status(500).json({ error: 'GEMINI_API_KEY 환경변수가 설정되지 않았습니다. Vercel 프로젝트 설정에서 추가해주세요.' });
    return;
  }

  try {
    let body = req.body;
    if (typeof body === 'string') { try { body = JSON.parse(body); } catch (e) { body = {}; } }
    body = body || {};
    const system = body.system || '';
    const messages = Array.isArray(body.messages) ? body.messages : [];
    const maxTokens = Number(body.max_tokens) || 1500;

    const contents = messages.map(function (m) {
      var c = typeof m.content === 'string' ? m.content : (m.content && m.content[0] && m.content[0].text) || '';
      return { role: m.role === 'assistant' ? 'model' : 'user', parts: [{ text: c }] };
    });
    if (!contents.length) { res.status(400).json({ error: '메시지가 비어 있습니다.' }); return; }

    const gReq = { contents: contents, generationConfig: { maxOutputTokens: maxTokens, temperature: 0.7 } };
    if (system) gReq.system_instruction = { parts: [{ text: system }] };

    const url = 'https://generativelanguage.googleapis.com/v1beta/models/' + MODEL + ':generateContent';
    const r = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': KEY },
      body: JSON.stringify(gReq)
    });
    const data = await r.json();
    if (!r.ok) {
      res.status(r.status).json({ error: (data && data.error && data.error.message) || 'Gemini API 오류' });
      return;
    }
    var text = '';
    try { text = data.candidates[0].content.parts.map(function (p) { return p.text || ''; }).join(''); } catch (e) { text = ''; }
    res.status(200).json({ content: [{ type: 'text', text: text }] });
  } catch (e) {
    res.status(500).json({ error: String((e && e.message) || e) });
  }
}
