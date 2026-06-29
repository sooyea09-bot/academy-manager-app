# academy-manager-app

영어학원 "엑설런스 영어"용 관리자 웹앱. 단일 HTML 파일 SPA + Vercel 서버리스 함수 1개로 구성된 매우 가벼운 구조.

## Tech stack
- **Frontend**: 빌드 도구 없는 vanilla HTML/CSS/JS 단일 파일 (`index.html`, ~2,800줄). Noto Sans KR / DM Mono 웹폰트 사용.
- **Backend**: Vercel Serverless Function 1개 (`api/gemini.js`) — Google Gemini API 프록시.
- **AI 모델**: `gemini-2.5-flash` (무료 티어). `api/gemini.js`의 `MODEL` 상수에서 변경.
- **언어**: UI/주석/문자열 전부 한국어.

## File map
| 경로 | 역할 |
|---|---|
| `index.html` | SPA 본체. CSS 변수, 상태 관리, 렌더링, 이벤트 핸들러 모두 내포. |
| `api/gemini.js` | Anthropic 형식 요청을 Gemini 형식으로 변환하는 프록시. `GEMINI_API_KEY` 환경변수 필요. |

## Conventions
- 새 코드를 추가할 때 빌드 단계 / 외부 라이브러리 도입을 피한다. 의존성 추가는 사용자 승인 후에만.
- `index.html`의 CSS 색상은 `:root` 변수(`--bg`, `--ink`, `--blue` 등)를 통해서만 사용 — 하드코딩 금지.
- API 호출 형식은 Anthropic 호환을 유지 (`{ system, messages, max_tokens }`). 클라이언트가 그 형식을 가정한다.
- 시크릿(`GEMINI_API_KEY` 등)은 절대 코드/커밋에 포함하지 않는다. Vercel 환경변수만 사용.

## Run / deploy
- 로컬: `index.html`을 브라우저로 직접 열거나 `vercel dev` 로 서버리스 함수까지 같이 실행.
- 배포: Vercel에 push → 자동 배포. Vercel 프로젝트 설정에 `GEMINI_API_KEY` 환경변수가 있어야 `/api/gemini` 가 동작.
