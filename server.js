/**
 * ANANAS Messenger Server v4 — "우리만의 아지트"
 * 1,000명 동시접속 대응 / 보안 강화
 * ─────────────────────────────────────────────
 * 보안   : helmet CSP, HTTP/소켓 rate-limit, 전 입력 sanitize, XSS 방지
 * 성능   : compression, 메시지 순환 버퍼, 빈 방 자동 정리
 * 안정   : graceful shutdown, 호스트 승계, 에러 핸들링
 * 기능   : 타이핑 표시, 공감(리액션), 답장, 메시지 삭제(본인),
 *          방명록, 공개 아지트 목록, 파도타기, TODAY/TOTAL 방문 카운터,
 *          AI 어시스턴트 서버 프록시(키 노출 방지)
 */

require('dotenv').config();

const express     = require('express');
const http        = require('http');
const crypto      = require('crypto');
const { Server }  = require('socket.io');
const helmet      = require('helmet');
const rateLimit   = require('express-rate-limit');
const compression = require('compression');
const cors        = require('cors');
const validator   = require('validator');
const path        = require('path');
const db          = require('./db');
const { SocialGraph, WaveEngine, isValidCid } = require('./social');

/* ─── 환경변수 ─────────────────────────────── */
const PORT            = process.env.PORT || 4000;
const NODE_ENV        = process.env.NODE_ENV || 'development';
const CORS_ORIGIN     = process.env.CORS_ORIGIN || `http://localhost:${PORT}`;
const ROOM_MAX_USERS  = parseInt(process.env.ROOM_MAX_USERS)        || 500;   // 방 1개 최대
const SERVER_MAX_CONN = parseInt(process.env.SERVER_MAX_CONNECTIONS)|| 5000;  // 서버 전체 최대
const MAX_MESSAGES    = parseInt(process.env.MAX_MESSAGES_PER_ROOM) || 1000;
const SOCKET_RATE_LIM = parseInt(process.env.SOCKET_RATE_LIMIT)     || 120;   // 분당 이벤트
const EMPTY_ROOM_TTL  = parseInt(process.env.EMPTY_ROOM_TTL_MS)     || 3000;   // 빈 방 자동삭제 유예(ms) — 거의 즉시
const GEMINI_KEY      = process.env.GEMINI_API_KEY || process.env.ANTHROPIC_API_KEY || '';
const ADMIN_KEY       = process.env.ADMIN_KEY || '';   // 관리자 토큰(미설정 시 관리자 기능 비활성)
let   runtimeAiKey    = GEMINI_KEY;                     // 관리자가 런타임에 교체 가능 (Google Gemini)

const app    = express();
const server = http.createServer(app);

app.set('trust proxy', 1); // nginx 등 리버스 프록시 뒤에서 IP 식별

/* ─── 보안 헤더 ────────────────────────────── */
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc:    ["'self'", "'unsafe-inline'"],
      scriptSrcAttr:["'unsafe-inline'"],   // 앱 전반의 onclick/onerror 인라인 핸들러 허용
      styleSrc:   ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com", "https://cdn.jsdelivr.net"],
      fontSrc:    ["'self'", "https://fonts.gstatic.com", "https://cdn.jsdelivr.net"],
      imgSrc:     ["'self'", "data:", "blob:"],
      connectSrc: ["'self'", "ws:", "wss:"],
    },
  },
  crossOriginEmbedderPolicy: false,
}));

app.use(compression({ level: 6 }));
app.use(cors({
  origin: NODE_ENV === 'production' ? CORS_ORIGIN : '*',
  methods: ['GET', 'POST'],
}));
app.use(express.json({ limit: '64kb' }));

/* ─── HTTP Rate Limit ─────────────────────── */
const httpLimiter = rateLimit({
  windowMs: 60 * 1000, max: 600,
  standardHeaders: true, legacyHeaders: false,
  message: { error: '요청이 너무 많습니다. 잠시 후 다시 시도하세요.' },
  skip: (req) => req.path.startsWith('/socket.io'),
});
app.use(httpLimiter);

/* AI 프록시는 더 엄격하게: 분당 20회 */
const aiLimiter = rateLimit({
  windowMs: 60 * 1000, max: 20,
  standardHeaders: true, legacyHeaders: false,
  message: { error: 'AI 요청이 너무 많습니다. 1분 후 다시 시도하세요.' },
});

/* ─── 정적 파일 ────────────────────────────── */
app.use(express.static(path.join(__dirname), {
  maxAge: NODE_ENV === 'production' ? '1d' : 0,
  etag: true,
}));

/* ─── Socket.IO ────────────────────────────── */
const io = new Server(server, {
  cors: {
    origin: NODE_ENV === 'production' ? CORS_ORIGIN : '*',
    methods: ['GET', 'POST'],
  },
  pingTimeout: 60000,
  pingInterval: 25000,
  maxHttpBufferSize: 5 * 1024 * 1024,   // 이미지 포함 5MB
  transports: ['websocket', 'polling'],
});

/* ─── 데이터 저장소 (암호화 SQLite에서 복원) ── */
const rooms = db.loadAll();
log(`💾 DB 복원: 방 ${rooms.size}개`);

/* ─── 소셜 그래프 & 파도타기 엔진 ──────────── */
const social      = new SocialGraph();        // cid 간 친구 관계 (메모리)
const clientAzits = new Map();                // cid -> Set<roomCode> (방문/개설한 공개 아지트)
function addClientAzit(cid, code) {
  if (!cid) return;
  if (!clientAzits.has(cid)) clientAzits.set(cid, new Set());
  clientAzits.get(cid).add(code);
}
const waveEngine = new WaveEngine({ rooms, graph: social, clientAzits, roomMaxUsers: ROOM_MAX_USERS });
/*
  rooms.get(code) = {
    name, desc, category, isPublic, host(socketId), createdAt,
    notice: '' ,
    messages: [{ id,user,avatar,mood,text,time,isImage,replyTo,reactions:{emoji:[nick]} }],
    guestbook: [{ id,user,avatar,text,time }],
    users: Set<socketId>,
  }
*/

/* 방문 카운터 — 싸이월드 TODAY / TOTAL (DB 영속) */
function dayKey() { return new Date().toISOString().slice(0, 10); }
const _savedStats = db.loadStats() || {};
const visitStats = {
  total: _savedStats.total || 0,
  today: _savedStats.date === dayKey() ? (_savedStats.today || 0) : 0,
  date: dayKey(),
};
function bumpVisit() {
  if (visitStats.date !== dayKey()) { visitStats.date = dayKey(); visitStats.today = 0; }
  visitStats.today++; visitStats.total++;
}
/* 통계는 30초마다 묶어서 디스크에 기록 */
setInterval(() => db.saveStats(visitStats), 30000);

/* ─── 입력 검증 헬퍼 ───────────────────────── */
function sanitize(str, maxLen = 100) {
  if (typeof str !== 'string') return '';
  return validator.escape(str.trim().slice(0, maxLen));
}
function isValidCode(code) {
  return typeof code === 'string' && /^[A-Z0-9]{6}$/.test(code);
}
function genCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) code += chars[crypto.randomInt(chars.length)];
  return code;
}
/* 타이밍 공격 방지 문자열 비교 */
function safeEqual(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string') return false;
  const ba = Buffer.from(a), bb = Buffer.from(b);
  if (ba.length !== bb.length) return false;
  return crypto.timingSafeEqual(ba, bb);
}
/* 프로필 사진 검증: 작은 썸네일만 허용(서버 저장 안 함, 메모리/방 전파용) */
const PROFILE_IMG_MAX = 90 * 1024;   // base64 문자열 길이 상한(≈64KB 이미지)
function validProfileImage(s) {
  if (typeof s !== 'string' || !s) return false;
  if (s.length > PROFILE_IMG_MAX) return false;
  return /^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/.test(s);
}
const ALLOWED_MOODS     = ['happy', 'soso', 'sleepy', 'excited', 'blue', 'love'];
const ALLOWED_REACTIONS = ['❤️', '👍', '😂', '😮', '😢', '🍍'];

/* ─── 소켓별 Rate Limiter ──────────────────── */
const socketRateMap = new Map();
function checkSocketRate(socketId, weight = 1) {
  const now = Date.now();
  let entry = socketRateMap.get(socketId);
  if (!entry || now > entry.resetAt) {
    entry = { count: 0, resetAt: now + 60000 };
    socketRateMap.set(socketId, entry);
  }
  entry.count += weight;
  return entry.count <= SOCKET_RATE_LIM;
}

/* ─── 공개 아지트 목록 직렬화 ──────────────── */
function publicRoomList(socketCid, socketId) {
  const list = [];
  for (const [code, r] of rooms) {
    if (!r.isPublic) continue;
    const creatorCid = r.creatorCid || '';
    const isCreator = !!(socketCid && creatorCid && creatorCid === socketCid)
      || (!creatorCid && socketId && r.host === socketId);
    list.push({
      code, name: r.name, desc: r.desc, category: r.category,
      users: r.users.size, createdAt: r.createdAt, creatorCid,
      isCreator,
    });
    if (list.length >= 60) break;
  }
  return list.sort((a, b) => b.users - a.users);
}
let roomListDirty = false;
function markRoomListDirty() { roomListDirty = true; }
setInterval(() => {
  if (!roomListDirty) return;
  roomListDirty = false;
  // 개인별로 isCreator 포함해서 전송
  for (const [, socket] of io.sockets.sockets) {
    socket.emit('roomList', publicRoomList(socket.cid, socket.id));
  }
}, 3000);

/* ─── 소켓 이벤트 ──────────────────────────── */
io.on('connection', (socket) => {

  /* 서버 전체 동시접속 제한 */
  if (io.sockets.sockets.size > SERVER_MAX_CONN) {
    socket.emit('serverFull', `현재 접속 인원이 가득 찼습니다. (최대 ${SERVER_MAX_CONN}명)`);
    return socket.disconnect(true);
  }

  bumpVisit();
  socket.emit('visitStats', { today: visitStats.today, total: visitStats.total });
  socket.emit('roomList', publicRoomList(socket.cid, socket.id));

  /* ── 클라이언트 식별자 등록(친구/파도타기용) ── */
  socket.on('hello', (cid) => {
    if (!isValidCid(cid)) return;
    socket.cid = cid;
    socket.emit('friendList', social.list(cid));
    socket.emit('roomList', publicRoomList(socket.cid, socket.id));
  });

  /* ── 관리자 인증 ── */
  socket.on('adminAuth', (token) => {
    if (!checkSocketRate(socket.id, 2)) return;
    const ok = ADMIN_KEY && safeEqual(token, ADMIN_KEY);
    socket.isAdmin = !!ok;
    socket.emit('adminAuthResult', { ok: !!ok, aiKeySet: !!runtimeAiKey });
  });

  /* ── 관리자: AI 키 런타임 설정 ── */
  socket.on('adminSetAiKey', ({ token, key } = {}) => {
    if (!checkSocketRate(socket.id, 2)) return;
    if (!ADMIN_KEY || !safeEqual(token, ADMIN_KEY)) {
      return socket.emit('adminAiKeyResult', { ok: false, msg: '관리자 권한이 없습니다.' });
    }
    const k = typeof key === 'string' ? key.trim() : '';
    if (k && !/^[A-Za-z0-9_\-\.]{20,200}$/.test(k)) {
      return socket.emit('adminAiKeyResult', { ok: false, msg: '키 형식이 올바르지 않습니다.' });
    }
    runtimeAiKey = k;   // 빈 문자열이면 비활성화
    log(`🔑 관리자가 AI 키를 ${k ? '설정' : '해제'}했습니다.`);
    socket.emit('adminAiKeyResult', { ok: true, aiKeySet: !!runtimeAiKey, msg: k ? 'AI 키가 적용됐어요!' : 'AI 키를 해제했어요.' });
  });

  /* ── 친구 추가(상호) ── */
  socket.on('addFriend', ({ targetCid } = {}) => {
    if (!checkSocketRate(socket.id, 2)) return;
    if (!socket.cid || !isValidCid(targetCid)) return;
    if (!social.addFriend(socket.cid, targetCid)) return;
    socket.emit('friendList', social.list(socket.cid));
    socket.emit('errorMsg', '친구를 추가했어요! 이제 파도타기로 친구의 친구 아지트를 만날 수 있어요 🌊');
    /* 상대도 접속 중이면 친구목록 갱신 */
    for (const [, s] of io.sockets.sockets) {
      if (s.cid === targetCid) s.emit('friendList', social.list(targetCid));
    }
  });

  /* ── 방 만들기 ── */
  socket.on('createRoom', (data) => {
    if (!checkSocketRate(socket.id, 3)) return socket.emit('errorMsg', '요청이 너무 많습니다.');

    const nickname = sanitize(data?.nickname, 10);
    const roomName = sanitize(data?.roomName, 40);
    const roomDesc = sanitize(data?.roomDesc, 80);
    const category = sanitize(data?.category, 20);
    const avatar   = sanitize(data?.avatar, 4);
    const mood     = ALLOWED_MOODS.includes(data?.mood) ? data.mood : 'happy';
    const isPublic = data?.isPublic === true;
    const clientCid = (typeof data?.cid === 'string' && /^[A-Za-z0-9-]{8,64}$/.test(data.cid)) ? data.cid : '';

    if (!nickname || !roomName) return;

    /* 연타 방지: 같은 소켓이 5초 내 방을 이미 만들었으면 차단 */
    const now = Date.now();
    if (socket._lastRoomCreate && now - socket._lastRoomCreate < 5000) {
      return socket.emit('errorMsg', '방을 너무 빠르게 만들고 있어요. 잠시 후 다시 시도하세요.');
    }
    socket._lastRoomCreate = now;

    let code, attempts = 0;
    do { code = genCode(); attempts++; } while (rooms.has(code) && attempts < 20);
    if (rooms.has(code)) return socket.emit('errorMsg', '방 생성에 실패했습니다. 다시 시도하세요.');

    const createdAt = now;
    const creatorCid = socket.cid || clientCid || '';
    rooms.set(code, {
      name: roomName, desc: roomDesc, category: category || 'daily',
      isPublic, host: socket.id, createdAt, creatorCid,
      notice: '', messages: [], guestbook: [], users: new Set(),
      members: new Map(),   // cid → { nickname, avatar, profileImage, lastSeen, online }
      firstEntries: new Set(), // 최초 입장 CID 추적
    });
    db.saveRoom({ code, name: roomName, desc: roomDesc, category: category || 'daily', isPublic, notice: '', createdAt, creatorCid });

    socket.nickname = nickname;
    socket.room     = code;
    socket.avatar   = avatar || 'A';
    socket.mood     = mood;
    socket.profileImage = validProfileImage(data?.profileImage) ? data.profileImage : '';

    socket.join(code);
    const newRoom = rooms.get(code);
    newRoom.users.add(socket.id);
    if (creatorCid) {
      newRoom.firstEntries.add(creatorCid);
      newRoom.members.set(creatorCid, { nickname, avatar: socket.avatar, profileImage: socket.profileImage, lastSeen: Date.now(), online: true });
    }

    addClientAzit(socket.cid, code);

    socket.emit('roomCreated', { code, roomName, isHost: true });
    pushSystem(code, `${nickname}님이 아지트를 열었습니다! 🍍`);
    broadcastOnline(code);
    if (isPublic) markRoomListDirty();
    log(`방 생성: ${code} (${roomName})${isPublic ? ' [공개]' : ''} — ${nickname}`);
  });

  /* ── 방 참여 ── */
  socket.on('joinRoom', (data) => {
    if (!checkSocketRate(socket.id, 2)) return socket.emit('errorMsg', '요청이 너무 많습니다.');

    const nickname = sanitize(data?.nickname, 10);
    const code     = (data?.code || '').toUpperCase().trim();
    const avatar   = sanitize(data?.avatar, 4);
    const mood     = ALLOWED_MOODS.includes(data?.mood) ? data.mood : 'happy';

    if (!nickname || !isValidCode(code)) return socket.emit('joinError', '코드 형식이 올바르지 않습니다.');

    const room = rooms.get(code);
    if (!room) return socket.emit('joinError', '존재하지 않는 아지트 코드입니다.');
    if (room.users.size >= ROOM_MAX_USERS) return socket.emit('joinError', `아지트가 가득 찼습니다. (최대 ${ROOM_MAX_USERS}명)`);
    /* 자동삭제 예약돼 있으면 취소(누군가 다시 들어옴) */
    if (room._cleanupTimer) { clearTimeout(room._cleanupTimer); room._cleanupTimer = null; }

    // 다른 방에 있던 경우 먼저 퇴장
    if (socket.room && socket.room !== code) doLeave(socket, true);

    socket.nickname = nickname;
    socket.room     = code;
    socket.avatar   = avatar || 'A';
    socket.mood     = mood;
    socket.profileImage = validProfileImage(data?.profileImage) ? data.profileImage : '';

    socket.join(code);
    room.users.add(socket.id);

    /* 개설자 CID이면 방장 복원, 없으면 현재 호스트 유지 */
    if (socket.cid && socket.cid === room.creatorCid) {
      room.host = socket.id;
    } else if (!room.host) {
      room.host = socket.id; // fallback: 방장 없을 때만
    }

    if (room.isPublic) addClientAzit(socket.cid, code);

    /* 최초 입장 여부 확인 */
    if (!room.firstEntries) room.firstEntries = new Set();
    const isFirstEntry = !socket.cid || !room.firstEntries.has(socket.cid);
    if (socket.cid) room.firstEntries.add(socket.cid);

    /* 멤버 로스터 갱신 */
    if (!room.members) room.members = new Map();
    if (socket.cid) {
      room.members.set(socket.cid, { nickname, avatar: socket.avatar, profileImage: socket.profileImage, lastSeen: Date.now(), online: true });
    }

    const isHost = room.host === socket.id;
    socket.emit('roomJoined', { code, roomName: room.name, isHost });
    const history = room.messages.slice(-100);
    if (history.length) socket.emit('messageHistory', history);
    if (room.notice)    socket.emit('notice', room.notice);
    socket.emit('guestbook', room.guestbook.slice(-50));

    /* 최초 입장만 시스템 메시지 */
    if (!data?.silent && isFirstEntry) pushSystem(code, `${nickname}님이 입장하였습니다.`);
    broadcastOnline(code);
    if (room.isPublic) markRoomListDirty();
    log(`방 참여: ${code} — ${nickname}`);
  });

  /* ── 메시지 전송 ── */
  socket.on('chatMessage', (payload) => {
    if (!checkSocketRate(socket.id)) return;
    if (!socket.room || !socket.nickname) return;
    const room = rooms.get(socket.room);
    if (!room) return;

    const raw       = (typeof payload === 'string') ? payload : payload?.text;
    const isImage   = typeof raw === 'string' && raw.startsWith('data:image/');
    const isSticker = !isImage && payload?.isSticker === true;
    let text;

    if (isImage) {
      if (raw.length > 5 * 1024 * 1024 * 1.37) return;     // base64 오버헤드 포함 5MB
      if (!/^data:image\/(png|jpeg|webp|gif);base64,/.test(raw)) return;
      text = raw;
    } else {
      text = sanitize(raw, 2000);
      if (!text) return;
    }

    /* 답장 검증: 실제 존재하는 메시지만 */
    let replyTo = null;
    const rid = payload?.replyTo;
    if (rid && typeof rid === 'string') {
      const orig = room.messages.find(m => m.id === rid);
      if (orig) {
        replyTo = {
          id: orig.id, user: orig.user,
          text: orig.isImage ? '(사진)' : orig.isSticker ? '(스티커)' : String(orig.text).slice(0, 60),
        };
      }
    }

    const msgData = {
      id: crypto.randomUUID(),
      user: socket.nickname, avatar: socket.avatar, mood: socket.mood,
      text, time: Date.now(), isImage, isSticker, replyTo, reactions: {},
    };

    room.messages.push(msgData);
    if (room.messages.length > MAX_MESSAGES) room.messages.shift();
    db.saveMessage(socket.room, msgData);

    io.to(socket.room).emit('message', msgData);   // 전원 동일 데이터(id 일치) 수신
  });

  /* ── 타이핑 표시 ── */
  socket.on('typing', () => {
    if (!socket.room || !socket.nickname) return;
    socket.to(socket.room).volatile.emit('typing', { user: socket.nickname });
  });
  socket.on('stopTyping', () => {
    if (!socket.room || !socket.nickname) return;
    socket.to(socket.room).volatile.emit('stopTyping', { user: socket.nickname });
  });

  /* ── 공감(리액션) 토글 ── */
  socket.on('reactMessage', ({ msgId, emoji } = {}) => {
    if (!checkSocketRate(socket.id)) return;
    if (!socket.room || !socket.nickname) return;
    if (!ALLOWED_REACTIONS.includes(emoji)) return;

    const room = rooms.get(socket.room);
    const msg  = room?.messages.find(m => m.id === msgId);
    if (!msg) return;

    if (!msg.reactions[emoji]) msg.reactions[emoji] = [];
    const arr = msg.reactions[emoji];
    const idx = arr.indexOf(socket.nickname);
    if (idx >= 0) arr.splice(idx, 1); else arr.push(socket.nickname);
    if (!arr.length) delete msg.reactions[emoji];
    db.saveReactions(msgId, msg.reactions);

    io.to(socket.room).emit('reactionUpdate', { msgId, reactions: msg.reactions });
  });

  /* ── 메시지 삭제(본인 것만) ── */
  socket.on('deleteMessage', ({ msgId } = {}) => {
    if (!checkSocketRate(socket.id)) return;
    if (!socket.room || !socket.nickname) return;
    const room = rooms.get(socket.room);
    const msg  = room?.messages.find(m => m.id === msgId);
    if (!msg || msg.user !== socket.nickname) return;

    msg.deleted = true;
    msg.text    = '삭제된 메시지입니다';
    msg.isImage = false;
    db.softDeleteMessage(msgId);
    io.to(socket.room).emit('messageDeleted', { msgId });
  });

  /* ── 공지 설정 (방장만) ── */
  socket.on('setNotice', (text) => {
    if (!checkSocketRate(socket.id)) return;
    if (!socket.room) return;
    const room = rooms.get(socket.room);
    if (!room || room.host !== socket.id) return;
    const clean = sanitize(text, 200);
    if (!clean) return;
    room.notice = clean;
    db.saveNotice(socket.room, clean);
    io.to(socket.room).emit('notice', clean);
  });

  /* ── 방명록 ── */
  socket.on('addGuestbook', (text) => {
    if (!checkSocketRate(socket.id, 2)) return;
    if (!socket.room || !socket.nickname) return;
    const room = rooms.get(socket.room);
    if (!room) return;
    const clean = sanitize(text, 120);
    if (!clean) return;

    const entry = {
      id: crypto.randomUUID(),
      user: socket.nickname, avatar: socket.avatar,
      text: clean, time: Date.now(),
    };
    room.guestbook.push(entry);
    if (room.guestbook.length > 50) room.guestbook.shift();
    db.saveGuestbook(socket.room, entry);
    io.to(socket.room).emit('guestbookEntry', entry);
  });

  socket.on('deleteGuestbook', ({ id }) => {
    if (!socket.room || !socket.nickname) return;
    const room = rooms.get(socket.room);
    if (!room) return;
    const idx = room.guestbook.findIndex(e => e.id === id && e.user === socket.nickname);
    if (idx === -1) return;
    room.guestbook.splice(idx, 1);
    io.to(socket.room).emit('guestbookDeleted', { id });
  });

  /* ── 기분(무드) 변경 ── */
  socket.on('setMood', (mood) => {
    if (!checkSocketRate(socket.id)) return;
    if (!ALLOWED_MOODS.includes(mood)) return;
    socket.mood = mood;
    if (socket.room) broadcastOnline(socket.room);
  });

  /* ── 프로필 사진 변경 (메모리에만, 같은 방에만 전파, DB 저장 안 함) ── */
  socket.on('setProfileImage', (img) => {
    if (!checkSocketRate(socket.id, 3)) return;
    if (img === '' || img == null) { socket.profileImage = ''; }
    else if (validProfileImage(img)) { socket.profileImage = img; }
    else return socket.emit('errorMsg', '프로필 사진 형식이 올바르지 않습니다.');
    if (socket.room) broadcastOnline(socket.room);
  });

  /* ── 파도타기: 친구의 친구 아지트 우선, 없으면 무작위 공개 ── */
  socket.on('wave', () => {
    if (!checkSocketRate(socket.id, 2)) return;
    const result = waveEngine.surf(socket.cid, socket.room);
    if (!result) return socket.emit('waveResult', { found: false });
    const room = rooms.get(result.code);
    socket.emit('waveResult', {
      found: true, code: result.code, name: room.name, byFriend: result.byFriend,
    });
  });

  /* ── 방 삭제 (개설자만) ── */
  socket.on('deleteRoom', ({ code } = {}) => {
    if (!checkSocketRate(socket.id, 2)) return;
    if (!isValidCode(code)) return;
    const room = rooms.get(code);
    if (!room) return socket.emit('errorMsg', '이미 삭제된 아지트입니다.');
    const canDelete = (room.creatorCid && room.creatorCid === socket.cid)
      || (!room.creatorCid && room.host === socket.id);
    if (!canDelete) {
      return socket.emit('errorMsg', '내가 만든 아지트만 삭제할 수 있어요.');
    }
    destroyRoom(code, '개설자가 아지트를 삭제했습니다.');
    socket.emit('roomDeleteOk', { code });
  });

  /* ── 내 아지트 목록 정보 (카톡식 목록용 미리보기) ── */
  socket.on('roomsInfo', ({ codes } = {}) => {
    if (!checkSocketRate(socket.id, 2)) return;
    if (!Array.isArray(codes)) return;
    const out = codes.slice(0, 30).filter(isValidCode).map(code => {
      const r = rooms.get(code);
      if (!r) return { code, deleted: true };
      const last = [...r.messages].reverse().find(m => m.user !== 'system');
      return {
        code, name: r.name, users: r.users.size, isPublic: r.isPublic,
        isCreator: !!r.creatorCid && r.creatorCid === socket.cid,
        lastText: last ? (last.isImage ? '(사진)' : String(last.text).slice(0, 40)) : '',
        lastTime: last ? last.time : r.createdAt,
        deleted: false,
      };
    });
    socket.emit('roomsInfo', out);
  });

  /* ── 퇴장 (명시적 나가기: 비면 즉시 삭제) ── */
  socket.on('leaveRoom', () => doLeave(socket, false, true));

  /* 아지트 목록 수동 요청 (페이지 진입 시) */
  socket.on('requestRoomList', () => {
    socket.emit('roomList', publicRoomList(socket.cid, socket.id));
  });
  /* ─── 친구 요청 중계 ─── */
  socket.on('friendRequest', ({ toCid, fromNick, fromCid }) => {
    if (!toCid || !fromCid || fromCid === toCid) return;
    io.sockets.sockets.forEach(s => {
      if (s.data && s.data.cid && (s.data.cid === toCid || s.data.cid.startsWith(toCid))) {
        s.emit('friendRequest', { fromNick: String(fromNick).slice(0,20), fromCid });
      }
    });
  });
  socket.on('friendAccept', ({ toCid, fromNick }) => {
    if (!toCid) return;
    io.sockets.sockets.forEach(s => {
      if (s.data && s.data.cid && (s.data.cid === toCid || s.data.cid.startsWith(toCid))) {
        s.emit('friendAccept', { fromNick: String(fromNick).slice(0,20) });
      }
    });
  });

  /* ── 방 초대 릴레이 ── */
  socket.on('sendRoomInvite', ({ targetCid, roomCode, roomName }) => {
    if (!targetCid || !roomCode) return;
    let sent = false;
    for (const [, s] of io.sockets.sockets) {
      if (s.cid === targetCid) {
        s.emit('roomInvite', {
          fromNickname: socket.nickname || '익명',
          fromCid: socket.cid || '',
          roomCode,
          roomName: roomName || roomCode,
        });
        sent = true;
        break;
      }
    }
    socket.emit('roomInviteSent', { targetCid, sent });
  });

  socket.on('disconnect', () => {
    doLeave(socket);
    socketRateMap.delete(socket.id);
  });
});

/* ─── 헬퍼 ─────────────────────────────────── */
function pushSystem(code, text) {
  const room = rooms.get(code);
  if (!room) return;
  const msgData = {
    id: crypto.randomUUID(),
    user: 'system', text, time: Date.now(), reactions: {},
  };
  room.messages.push(msgData);
  if (room.messages.length > MAX_MESSAGES) room.messages.shift();
  db.saveMessage(code, msgData);
  io.to(code).emit('message', msgData);
}

function doLeave(socket, silent = false, immediate = false) {
  if (!socket.room) return;
  const code = socket.room;
  const room = rooms.get(code);

  if (room) {
    room.users.delete(socket.id);
    socket.leave(code);

    /* 멤버 로스터에서 offline 표시 (삭제 안 함 - 영구 보존) */
    if (room.members && socket.cid) {
      const m = room.members.get(socket.cid);
      if (m) { m.online = false; m.lastSeen = Date.now(); }
    }

    /* 방장 ref 초기화 (creatorCid 보존 - 재입장 시 복원) */
    if (room.host === socket.id) room.host = null;

    /* 방장이 명시적으로 나가면 인원에 관계없이 즉시 삭제 */
    if (immediate && room.creatorCid && socket.cid && socket.cid === room.creatorCid) {
      destroyRoom(code, '방장이 나가 방이 닫혔습니다.');
      socket.room = null;
      return;
    }

    if (room.users.size === 0) {
      scheduleEmptyCleanup(code);
    }

    broadcastOnline(code);
    if (room.isPublic) markRoomListDirty();
  }
  socket.room = null;
}

/* 방 완전 삭제: 멤버 알림 → 메모리/DB 제거 → 목록 갱신 */
function destroyRoom(code, reason) {
  const room = rooms.get(code);
  if (!room) return;
  if (room._cleanupTimer) { clearTimeout(room._cleanupTimer); room._cleanupTimer = null; }
  io.to(code).emit('roomDeleted', { code, reason: reason || '아지트가 삭제되었습니다.' });
  for (const id of room.users) {
    const s = io.sockets.sockets.get(id);
    if (s) { s.leave(code); s.room = null; }
  }
  rooms.delete(code);
  db.removeRoom(code);
  if (room.isPublic) markRoomListDirty();
  log(`방 삭제: ${code} (${reason || ''})`);
}

/* 빈 방 자동 삭제 예약 (유예: EMPTY_ROOM_TTL). 재입장 시 타이머 취소됨 */
function scheduleEmptyCleanup(code) {
  const room = rooms.get(code);
  if (!room) return;
  if (room._cleanupTimer) clearTimeout(room._cleanupTimer);
  room._cleanupTimer = setTimeout(() => {
    const r = rooms.get(code);
    if (r && r.users.size === 0) destroyRoom(code, '아무도 없어 자동 정리되었습니다.');
  }, EMPTY_ROOM_TTL);
}

function broadcastOnline(code) {
  const room = rooms.get(code);
  if (!room) return;

  /* 현재 온라인 유저 */
  const onlineCids = new Set();
  const users = [...room.users].map(id => {
    const s = io.sockets.sockets.get(id);
    if (!s) return null;
    if (s.cid) onlineCids.add(s.cid);
    return { nickname: s.nickname, avatar: s.avatar, mood: s.mood,
      isHost: s.cid === room.creatorCid || room.host === id,
      cid: s.cid || '', profileImage: s.profileImage || '', online: true };
  }).filter(Boolean);
  io.to(code).emit('onlineUsers', users);

  /* 전체 멤버 로스터 (온라인 + 오프라인) */
  const roster = [];
  if (room.members) {
    for (const [cid, m] of room.members) {
      roster.push({ ...m, cid, isHost: cid === room.creatorCid, online: onlineCids.has(cid) });
    }
  }
  if (roster.length) io.to(code).emit('memberRoster', roster);
}

function log(msg) {
  if (NODE_ENV !== 'test') {
    console.log(`[${new Date().toLocaleTimeString('ko-KR')}] ${msg}`);
  }
}

/* ─── AI 어시스턴트 프록시 — Google Gemini (무료) ─── */
const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-2.0-flash';
const AI_SYSTEM = '당신은 아나나스(Ananas) 메신저의 AI 어시스턴트입니다. 파인애플 아지트 세계관의 따뜻한 도우미예요. 한국어로 친절하고 간결하게 답하세요.';
app.post('/api/ai', aiLimiter, async (req, res) => {
  try {
    if (!runtimeAiKey) {
      return res.json({ reply: '아직 AI가 활성화되지 않았어요. 관리자가 Gemini API 키를 설정하면 사용할 수 있습니다.' });
    }
    const messages = Array.isArray(req.body?.messages) ? req.body.messages.slice(-10) : [];
    /* Gemini 형식으로 변환: assistant→model, content→parts[{text}] */
    const contents = messages
      .filter(m => m && (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string')
      .map(m => ({ role: m.role === 'assistant' ? 'model' : 'user', parts: [{ text: m.content.slice(0, 2000) }] }));
    if (!contents.length) return res.status(400).json({ error: '메시지가 비어 있습니다.' });

    const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(GEMINI_MODEL)}:generateContent?key=${encodeURIComponent(runtimeAiKey)}`;
    const r = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: AI_SYSTEM }] },
        contents,
        generationConfig: { maxOutputTokens: 1000, temperature: 0.8 },
      }),
    });
    const data = await r.json();
    if (!r.ok) {
      const msg = data?.error?.message || '';
      console.error('[Gemini]', r.status, msg);
      if (r.status === 400 || r.status === 403) {
        return res.json({ reply: 'AI 키가 올바르지 않거나 권한이 없어요. 관리자에게 Gemini 키 확인을 요청해주세요.' });
      }
      if (r.status === 429) {
        return res.json({ reply: '지금 AI 요청이 많아요. 잠시 후 다시 시도해주세요. (무료 한도)' });
      }
      return res.status(502).json({ error: 'AI 연결이 원활하지 않습니다.' });
    }
    const reply = data?.candidates?.[0]?.content?.parts?.map(p => p.text).join('') || '답변을 가져올 수 없습니다.';
    res.json({ reply });
  } catch (err) {
    console.error('[AI Proxy]', err.message);
    res.status(502).json({ error: 'AI 연결이 원활하지 않습니다.' });
  }
});

/* ─── AI 이미지 번역 프록시 ─── */
app.post('/api/ai-vision', aiLimiter, async (req, res) => {
  try {
    if (!runtimeAiKey) {
      return res.json({ reply: '아직 AI가 활성화되지 않았어요.' });
    }
    const { image, prompt } = req.body || {};
    if (!image || typeof image !== 'string') return res.status(400).json({ error: '이미지가 없습니다.' });
    if (!prompt || typeof prompt !== 'string') return res.status(400).json({ error: '프롬프트가 없습니다.' });
    const match = image.match(/^data:(image\/(?:jpeg|png|webp|gif));base64,(.+)$/);
    if (!match) return res.status(400).json({ error: '지원하지 않는 이미지 형식입니다.' });
    const [, mimeType, b64] = match;
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(GEMINI_MODEL)}:generateContent?key=${encodeURIComponent(runtimeAiKey)}`;
    const r = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [
          { inlineData: { mimeType, data: b64 } },
          { text: prompt.slice(0, 500) },
        ]}],
        generationConfig: { maxOutputTokens: 1000, temperature: 0.4 },
      }),
    });
    const data = await r.json();
    if (!r.ok) {
      const msg = data?.error?.message || '';
      console.error('[Gemini Vision]', r.status, msg);
      if (r.status === 429) return res.json({ reply: '지금 AI 요청이 많아요. 잠시 후 다시 시도해주세요.' });
      return res.status(502).json({ error: 'AI 연결이 원활하지 않습니다.' });
    }
    const reply = data?.candidates?.[0]?.content?.parts?.map(p => p.text).join('') || '번역 결과를 가져올 수 없습니다.';
    res.json({ reply });
  } catch (err) {
    console.error('[AI Vision]', err.message);
    res.status(502).json({ error: 'AI 연결이 원활하지 않습니다.' });
  }
});

/* ─── 통계/헬스체크 ────────────────────────── */
app.get('/api/stats', (req, res) => {
  res.json({ today: visitStats.today, total: visitStats.total, rooms: rooms.size, users: io.sockets.sockets.size });
});
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    rooms: rooms.size,
    users: io.sockets.sockets.size,
    uptime: Math.floor(process.uptime()),
    memory: Math.round(process.memoryUsage().heapUsed / 1024 / 1024) + 'MB',
  });
});

/* ─── SPA 폴백 ─────────────────────────────── */
app.get('*', (req, res) => {
  /* 확장자가 있는(=정적 파일) 경로는 못 찾으면 진짜 404 — 이미지 onerror 폴백이 정상 동작 */
  if (path.extname(req.path)) return res.status(404).send('Not Found');
  res.sendFile(path.join(__dirname, 'index.html'));
});

/* ─── 에러 핸들러 ──────────────────────────── */
app.use((err, req, res, next) => {
  console.error('[Error]', err.message);
  res.status(500).json({ error: '서버 오류가 발생했습니다.' });
});

/* ─── 30일 메시지 자동 정리 (하루 1회) ──────── */
db.pruneOldMessages();
setInterval(() => db.pruneOldMessages(), 24 * 60 * 60 * 1000);

/* ─── 서버 시작 ────────────────────────────── */
server.listen(PORT, () => {
  console.log('═══════════════════════════════════════');
  console.log('🍍  ANANAS Messenger v4');
  console.log(`🔗  http://localhost:${PORT}`);
  console.log(`🌍  환경: ${NODE_ENV}`);
  console.log(`👥  방당 최대: ${ROOM_MAX_USERS}명 / 서버 전체: ${SERVER_MAX_CONN}명`);
  console.log(`🤖  AI 프록시: ${runtimeAiKey ? '활성 (Gemini)' : '키 미설정'}`);
  console.log('═══════════════════════════════════════');
});

/* ─── Graceful Shutdown ────────────────────── */
function gracefulShutdown(signal) {
  console.log(`\n[${signal}] 서버 종료 중...`);
  io.emit('message', { id: 'sys-shutdown', user: 'system', text: '서버가 잠시 점검에 들어갑니다.', time: Date.now(), reactions: {} });
  try { db.saveStats(visitStats); db.close(); } catch (_) {}
  server.close(() => { console.log('✅ 서버 정상 종료'); process.exit(0); });
  setTimeout(() => process.exit(1), 10000);
}
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT',  () => gracefulShutdown('SIGINT'));
process.on('uncaughtException', (err) => console.error('[UncaughtException]', err));
process.on('unhandledRejection', (reason) => console.error('[UnhandledRejection]', reason));

module.exports = { app, server, io };