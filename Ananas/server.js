/**
 * ANANAS Messenger Server v3
 * 100~1000명 대응 / 보안 강화 버전
 * ─────────────────────────────────
 * 보안: helmet, rate-limit, 입력 검증, XSS 방지
 * 성능: compression, 연결 풀, 메모리 관리
 * 안정: graceful shutdown, 에러 핸들링
 */

require('dotenv').config();

const express     = require('express');
const http        = require('http');
const { Server }  = require('socket.io');
const helmet      = require('helmet');
const rateLimit   = require('express-rate-limit');
const compression = require('compression');
const cors        = require('cors');
const validator   = require('validator');
const path        = require('path');

// ─── 환경변수 ────────────────────────────────
const PORT             = process.env.PORT            || 4000;
const NODE_ENV         = process.env.NODE_ENV        || 'development';
const CORS_ORIGIN      = process.env.CORS_ORIGIN     || `http://localhost:${PORT}`;
const ROOM_MAX_USERS   = parseInt(process.env.ROOM_MAX_USERS)   || 100;
const MAX_MESSAGES     = parseInt(process.env.MAX_MESSAGES_PER_ROOM) || 500;
const SOCKET_RATE_LIM  = parseInt(process.env.SOCKET_RATE_LIMIT)    || 60;

const app    = express();
const server = http.createServer(app);

// ─── 미들웨어: 보안 헤더 ──────────────────────
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc:  ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      styleSrc:   ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com", "https://fonts.gstatic.com"],
      fontSrc:    ["'self'", "https://fonts.gstatic.com"],
      imgSrc:     ["'self'", "data:", "blob:"],
      connectSrc: ["'self'", "ws:", "wss:", "https://api.anthropic.com"],
    },
  },
  crossOriginEmbedderPolicy: false,
}));

// ─── 미들웨어: 압축 (트래픽 절감) ────────────
app.use(compression({ level: 6 }));

// ─── 미들웨어: CORS ───────────────────────────
app.use(cors({
  origin: NODE_ENV === 'production' ? CORS_ORIGIN : '*',
  methods: ['GET', 'POST'],
}));

// ─── 미들웨어: HTTP Rate Limit ────────────────
// 분당 200 요청으로 제한 (일반 브라우저 충분)
const httpLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: '요청이 너무 많습니다. 잠시 후 다시 시도하세요.' },
  skip: (req) => req.path.startsWith('/socket.io'), // 소켓은 별도 처리
});
app.use(httpLimiter);

// ─── 미들웨어: 정적 파일 ─────────────────────
app.use(express.static(path.join(__dirname), {
  maxAge: NODE_ENV === 'production' ? '1d' : 0,
  etag: true,
}));

// ─── Socket.IO 설정 ───────────────────────────
const io = new Server(server, {
  cors: {
    origin: NODE_ENV === 'production' ? CORS_ORIGIN : '*',
    methods: ['GET', 'POST'],
  },
  // 연결 안정성 설정
  pingTimeout:  60000,
  pingInterval: 25000,
  // 페이로드 크기 제한 (이미지 포함 5MB)
  maxHttpBufferSize: 5 * 1024 * 1024,
  // transports 우선순위: websocket 먼저 (polling 폴백)
  transports: ['websocket', 'polling'],
});

// ─── 데이터 저장소 ────────────────────────────
const rooms = new Map();
/*
  rooms.get(code) = {
    name, desc, category, host (socketId),
    createdAt, messages: [],
    users: Set<socketId>
  }
*/

// ─── 입력 검증 헬퍼 ──────────────────────────
function sanitize(str, maxLen = 100) {
  if (typeof str !== 'string') return '';
  return validator.escape(str.trim().slice(0, maxLen));
}

function isValidCode(code) {
  return typeof code === 'string' && /^[A-Z0-9]{6}$/.test(code);
}

function genCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // 혼동 문자 제외
  let code = '';
  for (let i = 0; i < 6; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return code;
}

// ─── 소켓별 Rate Limiter ──────────────────────
// Map<socketId, { count, resetAt }>
const socketRateMap = new Map();

function checkSocketRate(socketId) {
  const now = Date.now();
  let entry = socketRateMap.get(socketId);
  if (!entry || now > entry.resetAt) {
    entry = { count: 0, resetAt: now + 60000 };
    socketRateMap.set(socketId, entry);
  }
  entry.count++;
  return entry.count <= SOCKET_RATE_LIM;
}

// ─── 소켓 이벤트 ──────────────────────────────
io.on('connection', (socket) => {
  const clientIp = socket.handshake.headers['x-forwarded-for'] || socket.handshake.address;

  // ── 방 만들기 ──────────────────────────────
  socket.on('createRoom', (data) => {
    if (!checkSocketRate(socket.id)) {
      return socket.emit('error', '요청이 너무 많습니다.');
    }

    const nickname = sanitize(data?.nickname, 20);
    const roomName = sanitize(data?.roomName, 40);
    const roomDesc = sanitize(data?.roomDesc, 80);
    const category = sanitize(data?.category, 20);
    const avatar   = sanitize(data?.avatar,   4);

    if (!nickname || !roomName) return;

    // 고유 코드 생성
    let code;
    let attempts = 0;
    do { code = genCode(); attempts++; } while (rooms.has(code) && attempts < 20);

    rooms.set(code, {
      name:      roomName,
      desc:      roomDesc,
      category:  category || 'chat',
      host:      socket.id,
      createdAt: Date.now(),
      messages:  [],
      users:     new Set(),
    });

    socket.nickname = nickname;
    socket.room     = code;
    socket.avatar   = avatar || 'A';

    socket.join(code);
    rooms.get(code).users.add(socket.id);

    socket.emit('roomCreated', { code, roomName });

    pushMessage(code, { user: 'system', text: `${nickname}님이 아지트를 열었습니다.`, time: Date.now() });
    broadcastOnline(code);
    log(`방 생성: ${code} (${roomName}) — ${nickname}`);
  });

  // ── 방 참여 ───────────────────────────────
  socket.on('joinRoom', (data) => {
    if (!checkSocketRate(socket.id)) return socket.emit('error', '요청이 너무 많습니다.');

    const nickname = sanitize(data?.nickname, 20);
    const code     = (data?.code || '').toUpperCase().trim();
    const avatar   = sanitize(data?.avatar, 4);

    if (!nickname || !isValidCode(code)) return;

    const room = rooms.get(code);
    if (!room) return socket.emit('joinError', '존재하지 않는 방 코드입니다.');
    if (room.users.size >= ROOM_MAX_USERS) return socket.emit('joinError', `방이 가득 찼습니다. (최대 ${ROOM_MAX_USERS}명)`);

    socket.nickname = nickname;
    socket.room     = code;
    socket.avatar   = avatar || 'A';

    socket.join(code);
    room.users.add(socket.id);

    socket.emit('roomJoined', { code, roomName: room.name });
    // 이전 메시지 전송 (최근 100개만)
    const history = room.messages.slice(-100);
    if (history.length) socket.emit('messageHistory', history);

    pushMessage(code, { user: 'system', text: `${nickname}님이 합류했습니다.`, time: Date.now() });
    broadcastOnline(code);
    log(`방 참여: ${code} — ${nickname}`);
  });

  // ── 메시지 전송 ───────────────────────────
  socket.on('chatMessage', (msg) => {
    if (!checkSocketRate(socket.id)) return;
    if (!socket.room || !socket.nickname) return;

    // 이미지(dataURL) 또는 텍스트 판별
    const isImage = typeof msg === 'string' && msg.startsWith('data:image');
    let text;

    if (isImage) {
      // 이미지: 크기 체크 (5MB)
      if (msg.length > 5 * 1024 * 1024 * 1.37) return; // base64 오버헤드
      text = msg;
    } else {
      text = sanitize(msg, 500);
      if (!text) return;
    }

    const msgData = {
      user:    socket.nickname,
      avatar:  socket.avatar,
      text,
      time:    Date.now(),
      isImage,
    };

    const room = rooms.get(socket.room);
    if (!room) return;

    room.messages.push(msgData);
    if (room.messages.length > MAX_MESSAGES) room.messages.shift();

    // 송신자 제외 전송
    socket.to(socket.room).emit('message', msgData);
  });

  // ── 공지 설정 (방장만) ────────────────────
  socket.on('setNotice', (text) => {
    if (!checkSocketRate(socket.id)) return;
    if (!socket.room) return;

    const room = rooms.get(socket.room);
    if (!room || room.host !== socket.id) return; // 방장 확인

    const clean = sanitize(text, 200);
    if (!clean) return;

    room.notice = clean;
    io.to(socket.room).emit('notice', clean);
  });

  // ── 퇴장 ─────────────────────────────────
  socket.on('leaveRoom', () => doLeave(socket));
  socket.on('disconnect', () => {
    doLeave(socket);
    socketRateMap.delete(socket.id);
  });
});

// ─── 헬퍼 함수들 ──────────────────────────────
function pushMessage(code, msgData) {
  const room = rooms.get(code);
  if (!room) return;
  room.messages.push(msgData);
  if (room.messages.length > MAX_MESSAGES) room.messages.shift();
  io.to(code).emit('message', msgData);
}

function doLeave(socket) {
  if (!socket.room) return;
  const room = rooms.get(socket.room);
  if (room) {
    room.users.delete(socket.id);
    if (socket.nickname) {
      pushMessage(socket.room, {
        user: 'system',
        text: `${socket.nickname}님이 아지트를 떠났습니다.`,
        time: Date.now(),
      });
    }
    broadcastOnline(socket.room);

    // 빈 방은 1시간 후 자동 삭제 (메모리 관리)
    if (room.users.size === 0) {
      const code = socket.room;
      setTimeout(() => {
        const r = rooms.get(code);
        if (r && r.users.size === 0) {
          rooms.delete(code);
          log(`빈 방 정리: ${code}`);
        }
      }, 60 * 60 * 1000);
    }
  }
  socket.room     = null;
  socket.nickname = null;
}

function broadcastOnline(code) {
  const room = rooms.get(code);
  if (!room) return;
  const users = [...room.users].map(id => {
    const s = io.sockets.sockets.get(id);
    return s ? { nickname: s.nickname, avatar: s.avatar } : null;
  }).filter(Boolean);
  io.to(code).emit('onlineUsers', users);
}

function log(msg) {
  if (NODE_ENV !== 'test') {
    console.log(`[${new Date().toLocaleTimeString('ko-KR')}] ${msg}`);
  }
}

// ─── 헬스체크 엔드포인트 ─────────────────────
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    rooms:  rooms.size,
    users:  io.sockets.sockets.size,
    uptime: Math.floor(process.uptime()),
    memory: Math.round(process.memoryUsage().heapUsed / 1024 / 1024) + 'MB',
  });
});

// ─── 404 처리 ─────────────────────────────────
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// ─── 에러 핸들러 ──────────────────────────────
app.use((err, req, res, next) => {
  console.error('[Error]', err.message);
  res.status(500).json({ error: '서버 오류가 발생했습니다.' });
});

// ─── 서버 시작 ───────────────────────────────
server.listen(PORT, () => {
  console.log('═══════════════════════════════════════');
  console.log('🍍  ANANAS Messenger v3');
  console.log(`🔗  http://localhost:${PORT}`);
  console.log(`🌍  환경: ${NODE_ENV}`);
  console.log(`👥  최대 인원/방: ${ROOM_MAX_USERS}명`);
  console.log('═══════════════════════════════════════');
});

// ─── Graceful Shutdown ────────────────────────
function gracefulShutdown(signal) {
  console.log(`\n[${signal}] 서버 종료 중...`);
  // 모든 클라이언트에게 종료 알림
  io.emit('message', { user: 'system', text: '서버가 잠시 점검에 들어갑니다.', time: Date.now() });
  server.close(() => {
    console.log('✅ 서버 정상 종료');
    process.exit(0);
  });
  // 10초 후 강제 종료
  setTimeout(() => process.exit(1), 10000);
}
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT',  () => gracefulShutdown('SIGINT'));

// 처리되지 않은 에러 로깅 (크래시 방지)
process.on('uncaughtException', (err) => {
  console.error('[UncaughtException]', err);
});
process.on('unhandledRejection', (reason) => {
  console.error('[UnhandledRejection]', reason);
});

module.exports = { app, server, io };
