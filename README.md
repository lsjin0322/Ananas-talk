
# 🍍 Ananas Talk — 우리만의 아지트

> 채팅은 기본, 방명록과 파도타기까지. 미니홈피 시절의 감성을 지금의 메신저로.

[![Node.js](https://img.shields.io/badge/Node.js-18+-green)](https://nodejs.org)
[![Socket.IO](https://img.shields.io/badge/Socket.IO-4.7-blue)](https://socket.io)
[![License](https://img.shields.io/badge/license-MIT-yellow)](LICENSE)

---
 **이미지 미리보기**
---
 <img width="704" height="903" alt="image" src="https://github.com/user-attachments/assets/3348d4e2-3576-4e55-b2e8-7664cb6d1824" />

---
## 📌 프로젝트 소개

**Ananas Talk**은 실시간 채팅을 기반으로 방명록, 파도타기, AI 어시스턴트까지 갖춘 레트로 감성의 웹 메신저입니다.  
설치 없이 브라우저만으로 접속 가능하며, PWA를 지원해 홈 화면에 앱처럼 추가할 수 있습니다.

🔗 **배포 주소:** https://web-production-4bf0d.up.railway.app

---

## ✨ 주요 기능

### 💬 실시간 채팅
- Socket.IO 기반 실시간 양방향 통신
- 타이핑 표시 (상대방이 입력 중일 때 알림)
- 메시지 검색
- 이미지 전송 (JPG · PNG · WEBP, 최대 5MB)
- 이미지 크롭 편집 후 전송

### 😊 공감 · 답장
- ❤️ 👍 😂 😮 😢 🍍 6가지 공감 리액션
- 특정 메시지에 인용 답장
- 본인 메시지 삭제

### 🏠 아지트 (방) 시스템
- 6자리 초대 코드로 방 생성/입장
- 공개 / 비공개 설정
- 방 공지 고정 (방장 전용)
- 카테고리 분류 (일상·공부·음악·취미·정보·친목·기타)
- 초대 링크 공유

### 📮 방명록
- 방마다 독립적인 방명록
- 최대 50개 항목 유지

### 🌊 파도타기
- 랜덤 공개 방 자동 입장
- 친구의 친구 아지트 우선 추천 (소셜 그래프 기반)

### 👤 프로필
- 메인 / 서브 프로필 전환
- 프로필 사진 업로드
- 기분(무드) 설정 (6가지)
- 고유 CID 기반 친구 추가 / 친구 요청 시스템

### 🤖 AI 어시스턴트
- Google Gemini API 연동
- 질문 · 번역 · 글쓰기 · 아이디어 지원
- 사진 속 글자 번역 (Vision API)
- 번역기 (8개 언어 지원)

### 📊 방문 통계
- 싸이월드 스타일 TODAY / TOTAL 방문자 카운터
- DB에 영속 저장

---

## 🛡️ 보안

| 항목 | 적용 내용 |
|------|-----------|
| **DB 암호화** | SQLCipher(`better-sqlite3-multiple-ciphers`)로 DB 파일 전체 암호화(at-rest) |
| **SQL 인젝션 차단** | 모든 쿼리 Prepared Statement(파라미터 바인딩) 사용 |
| **XSS 방지** | 전 입력값 `validator.escape()` sanitize 처리 |
| **보안 헤더** | `helmet` 미들웨어로 CSP · HSTS 등 보안 헤더 자동 적용 |
| **Rate Limit** | HTTP 분당 600회, AI API 분당 20회, 소켓 이벤트 분당 120회 제한 |
| **관리자 분리** | 관리자 전용 토큰 인증 (`ADMIN_KEY`), 타이밍 공격 방지 비교(`timingSafeEqual`) |
| **키 관리** | 암호화 키·API 키 환경변수로만 주입, 코드/깃에 미포함 |
| **전송 구간** | Railway HTTPS/WSS 자동 적용 |
| **이미지 검증** | base64 형식·MIME 타입·용량 서버측 검증 |
| **프로필 사진** | 서버 미저장 — 메모리 내 전파만 허용 (최대 64KB) |

---

## 🏗️ 서버 아키텍처

```
┌─────────────────────────────────────────┐
│              클라이언트 (브라우저)          │
│         HTML · CSS · Vanilla JS          │
└──────────────┬──────────────────────────┘
               │ HTTPS / WSS
┌──────────────▼──────────────────────────┐
│           Express + Socket.IO            │
│                                          │
│  ├─ HTTP Rate Limit (express-rate-limit) │
│  ├─ 보안 헤더 (helmet)                    │
│  ├─ 압축 (compression)                   │
│  ├─ CORS 정책                            │
│  ├─ /api/ai        — Gemini 프록시        │
│  ├─ /api/translate — 번역 프록시          │
│  ├─ /api/ai-vision — Vision 프록시        │
│  └─ /health        — 헬스체크             │
└──────────────┬──────────────────────────┘
               │
┌──────────────▼──────────────────────────┐
│        better-sqlite3-multiple-ciphers   │
│         (SQLCipher 암호화 SQLite)         │
│                                          │
│  rooms · messages · guestbook · stats   │
└─────────────────────────────────────────┘
```

### 소셜 그래프 & 파도타기 엔진
- `SocialGraph` : 친구 관계 무방향 그래프 (메모리)
- `FriendOfFriendMatcher` : 친구의 친구 아지트 우선 추천
- `RandomPublicMatcher` : 폴백 — 무작위 공개 아지트

---

## 🛠️ 기술 스택

| 구분 | 기술 |
|------|------|
| **Frontend** | HTML5 · CSS3 · Vanilla JavaScript · Canvas API (픽셀아트 엔진) |
| **Backend** | Node.js 18+ · Express 4 · Socket.IO 4 |
| **DB** | SQLite (better-sqlite3-multiple-ciphers / SQLCipher) |
| **보안** | helmet · express-rate-limit · validator · crypto |
| **AI** | Google Gemini API (gemini-2.0-flash) |
| **배포** | Railway (Node.js + 영구 볼륨) |
| **PWA** | Web App Manifest · Service Worker |

---

## 🚀 로컬 실행

```bash
# 1. 저장소 클론
git clone https://github.com/lsjin0322/Ananas-talk.git
cd Ananas-talk

# 2. 패키지 설치
npm install

# 3. 환경변수 설정
cp EXAMPLE.env .env
# .env 파일 열어서 DB_ENCRYPTION_KEY 등 입력

# 4. 서버 실행
npm start
# → http://localhost:4000
```

### 환경변수 (.env)

```env
PORT=4000
NODE_ENV=development
CORS_ORIGIN=http://localhost:4000

# DB 암호화 키 (필수)
DB_ENCRYPTION_KEY=<64자리 랜덤 hex>
DB_PATH=./data/ananas.db

# 관리자 토큰
ADMIN_KEY=<강력한_토큰>

# Google Gemini API (선택)
GEMINI_API_KEY=<AIza...>
GEMINI_MODEL=gemini-2.0-flash
```

암호화 키 생성:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

---

## 📁 프로젝트 구조

```
Ananas-talk/
├── server.js          # 메인 서버 (Express + Socket.IO)
├── db.js              # 암호화 SQLite DB 계층
├── social.js          # 소셜 그래프 & 파도타기 엔진
├── index.html         # 메인 페이지
├── script.js          # 클라이언트 로직
├── style.css          # 스타일
├── manifest.json      # PWA 매니페스트
├── portfolio.html     # 포트폴리오 페이지
├── images/            # 이미지 에셋
├── sounds/            # 배경음악
├── video/             # 인트로 영상
├── railway.json       # Railway 배포 설정
├── render.yaml        # Render 배포 설정
└── EXAMPLE.env        # 환경변수 예시
```

---

## ☁️ 배포 (Railway)

1. [railway.app](https://railway.app) → GitHub 레포 연결
2. **Variables** 탭에서 환경변수 설정
3. **Settings → Volumes** → Mount path `/data` 지정 (DB 영속화)
4. 자동 배포 완료 후 도메인 발급

자세한 내용은 [DEPLOY.md](DEPLOY.md) 참고

---


> Socket.IO 실시간 통신과 픽셀아트 Canvas 엔진을 처음부터 직접 구현한 개인 프로젝트.  
> 레트로 감성과 현대적 보안을 함께 담았습니다.
