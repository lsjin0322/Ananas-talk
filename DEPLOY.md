# 🍍 ANANAS Messenger 배포 가이드 — 누구나 접속 + 대화 영속 + 보안 DB

이 문서는 채팅앱을 **무료 클라우드에 올려 누구나 URL로 접속**하고, 대화가
**서버 재시작 후에도 보존**되며, DB가 **디스크 암호화**되도록 배포하는 절차입니다.

---

## 0. 한눈에 보는 보안 구성

| 항목 | 적용 내용 |
|------|-----------|
| DB 암호화(at-rest) | SQLCipher(`better-sqlite3-multiple-ciphers`)로 DB 파일 전체 암호화. 키 없으면 복호화 불가 |
| SQL 인젝션 | 모든 쿼리 prepared statement(파라미터 바인딩) — 문자열 조합 쿼리 없음 |
| XSS | 전 입력 `validator.escape` sanitize + CSP 헤더(helmet) |
| 남용 방지 | HTTP/소켓 rate-limit, 서버·방 동시접속 상한 |
| 키 관리 | 암호화 키는 환경변수로만 주입(`DB_ENCRYPTION_KEY`), 코드/깃에 미포함 |
| 전송 구간 | 호스팅이 제공하는 HTTPS/WSS 자동 적용 |

---

## 1. 암호화 키 먼저 생성

배포 전, 강력한 DB 암호화 키를 만들어 둡니다 (로컬 터미널에서):

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

출력된 64자리 문자열을 잘 보관하세요. **이 키를 잃어버리면 기존 대화를 복호화할 수 없습니다.**

---

## 2. (권장) Railway — 무료 크레딧 + 영구 볼륨

대화 보존이 가장 쉬운 경로입니다.

1. GitHub에 이 프로젝트를 push (`.env`, `data/`, `node_modules`는 `.gitignore`로 제외됨).
2. https://railway.app → **New Project → Deploy from GitHub repo** 선택.
3. **Variables** 탭에서 환경변수 입력:
   - `NODE_ENV` = `production`
   - `DB_ENCRYPTION_KEY` = (1번에서 생성한 키)
   - `DB_PATH` = `/data/ananas.db`
   - `CORS_ORIGIN` = (4번에서 발급될 도메인, 일단 비워두고 나중에 입력)
   - (선택) `ANTHROPIC_API_KEY` = AI 어시스턴트 쓸 경우
4. **Settings → Volumes → New Volume**: Mount path를 `/data` 로 지정.
   → 이래야 재배포해도 DB(대화)가 유지됩니다.
5. 배포 완료 후 **Settings → Networking → Generate Domain** 으로 공개 URL 발급.
6. 발급된 도메인을 `CORS_ORIGIN` 에 다시 입력하고 재배포.

끝. 이제 누구나 그 URL로 접속해 같은 방에서 대화할 수 있고, 대화는 영구 보존됩니다.

---

## 3. (대안) Render

`render.yaml` 블루프린트 포함. https://render.com → **New → Blueprint** → 레포 연결.
- `CORS_ORIGIN` 만 발급 도메인으로 직접 입력하면 됩니다.
- ⚠️ **무료 플랜은 영구 디스크 미지원** → 재배포 시 DB 초기화됩니다.
  대화 보존이 필요하면 `plan: starter` 이상으로 올리세요 (`render.yaml`에 디스크 설정 포함).

---

## 4. 로컬에서 미리 운영모드로 테스트

```bash
# .env 생성
cp EXAMPLE.env .env
# DB_ENCRYPTION_KEY 채우고, DB_PATH=./data/ananas.db 로 두면 로컬 저장
npm install
npm start
```

브라우저에서 http://localhost:4000 접속.

---

## 5. 운영 점검 체크리스트

- [ ] `DB_ENCRYPTION_KEY` 가 운영 환경변수에 설정됨 (없으면 서버가 부팅 거부)
- [ ] 볼륨/디스크가 `DB_PATH` 경로에 마운트됨
- [ ] `CORS_ORIGIN` 이 실제 도메인과 일치
- [ ] `https://<도메인>/health` 가 `{"status":"ok"}` 반환
- [ ] 암호화 키는 안전한 곳(비밀번호 관리자 등)에 백업
