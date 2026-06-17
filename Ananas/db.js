/**
 * ANANAS Messenger — 암호화 영속 DB 계층
 * ─────────────────────────────────────────────
 * 엔진 : better-sqlite3-multiple-ciphers (SQLCipher) — 디스크 전체 암호화(at-rest)
 * 보안 : 모든 쿼리 prepared statement(파라미터 바인딩) → SQL 인젝션 차단
 *        WAL 모드, 외래키 ON, 파일 권한 최소화
 * 역할 : 방/메시지/방명록/방문통계 영속화. 서버 재시작 후에도 대화 유지.
 */

const Database = require('better-sqlite3-multiple-ciphers');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

const DB_PATH = process.env.DB_PATH || path.join(__dirname, 'data', 'ananas.db');
const MAX_MESSAGES = parseInt(process.env.MAX_MESSAGES_PER_ROOM) || 500;

/* ─── 암호화 키 ─────────────────────────────────
 * 운영에서는 반드시 DB_ENCRYPTION_KEY 환경변수를 설정하세요.
 * 키가 바뀌면 기존 데이터를 더 이상 복호화할 수 없습니다. */
let ENC_KEY = process.env.DB_ENCRYPTION_KEY;
if (!ENC_KEY) {
  if (process.env.NODE_ENV === 'production') {
    console.error('🛑 [DB] DB_ENCRYPTION_KEY가 없습니다. 운영 환경에서는 필수입니다.');
    process.exit(1);
  }
  ENC_KEY = 'ananas-dev-insecure-key-change-me';
  console.warn('⚠️  [DB] DB_ENCRYPTION_KEY 미설정 — 개발용 기본 키 사용 중. 운영 배포 전 반드시 설정하세요.');
}

/* data 디렉터리 보장 */
const dir = path.dirname(DB_PATH);
if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

/* ─── 연결 & 암호화 적용 ───────────────────── */
const db = new Database(DB_PATH);
db.pragma(`cipher='sqlcipher'`);
db.pragma(`key='${ENC_KEY.replace(/'/g, "''")}'`);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');
db.pragma('synchronous = NORMAL');

/* 무결성/복호화 확인 (잘못된 키면 여기서 실패) */
try {
  db.prepare('SELECT count(*) FROM sqlite_master').get();
} catch (e) {
  console.error('🛑 [DB] 복호화 실패 — 암호화 키가 일치하지 않습니다.', e.message);
  process.exit(1);
}

/* ─── 스키마 ───────────────────────────────── */
db.exec(`
  CREATE TABLE IF NOT EXISTS rooms (
    code       TEXT PRIMARY KEY,
    name       TEXT NOT NULL,
    descr      TEXT DEFAULT '',
    category   TEXT DEFAULT 'daily',
    is_public  INTEGER DEFAULT 0,
    notice     TEXT DEFAULT '',
    created_at INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS messages (
    id         TEXT PRIMARY KEY,
    room_code  TEXT NOT NULL,
    usr        TEXT NOT NULL,
    avatar     TEXT DEFAULT 'A',
    mood       TEXT DEFAULT 'happy',
    text       TEXT,
    time       INTEGER NOT NULL,
    is_image   INTEGER DEFAULT 0,
    reply_to   TEXT,
    reactions  TEXT DEFAULT '{}',
    deleted    INTEGER DEFAULT 0,
    FOREIGN KEY (room_code) REFERENCES rooms(code) ON DELETE CASCADE
  );
  CREATE INDEX IF NOT EXISTS idx_messages_room_time ON messages(room_code, time);

  CREATE TABLE IF NOT EXISTS guestbook (
    id         TEXT PRIMARY KEY,
    room_code  TEXT NOT NULL,
    usr        TEXT NOT NULL,
    avatar     TEXT DEFAULT 'A',
    text       TEXT,
    time       INTEGER NOT NULL,
    FOREIGN KEY (room_code) REFERENCES rooms(code) ON DELETE CASCADE
  );
  CREATE INDEX IF NOT EXISTS idx_guestbook_room ON guestbook(room_code, time);

  CREATE TABLE IF NOT EXISTS visit_stats (
    id    INTEGER PRIMARY KEY CHECK (id = 1),
    total INTEGER DEFAULT 0,
    today INTEGER DEFAULT 0,
    date  TEXT
  );
  INSERT OR IGNORE INTO visit_stats (id, total, today, date) VALUES (1, 0, 0, '');
`);

/* ─── Prepared statements (인젝션 차단) ─────── */
const stmt = {
  upsertRoom: db.prepare(`
    INSERT INTO rooms (code, name, descr, category, is_public, notice, created_at)
    VALUES (@code, @name, @descr, @category, @is_public, @notice, @created_at)
    ON CONFLICT(code) DO UPDATE SET
      name=@name, descr=@descr, category=@category,
      is_public=@is_public, notice=@notice
  `),
  setNotice:   db.prepare(`UPDATE rooms SET notice=? WHERE code=?`),
  deleteRoom:  db.prepare(`DELETE FROM rooms WHERE code=?`),
  allRooms:    db.prepare(`SELECT * FROM rooms`),

  insertMsg: db.prepare(`
    INSERT INTO messages (id, room_code, usr, avatar, mood, text, time, is_image, reply_to, reactions, deleted)
    VALUES (@id, @room_code, @usr, @avatar, @mood, @text, @time, @is_image, @reply_to, @reactions, @deleted)
  `),
  updateReactions: db.prepare(`UPDATE messages SET reactions=? WHERE id=?`),
  softDeleteMsg:   db.prepare(`UPDATE messages SET deleted=1, text='삭제된 메시지입니다', is_image=0 WHERE id=?`),
  roomMessages:    db.prepare(`SELECT * FROM messages WHERE room_code=? ORDER BY time ASC`),
  pruneRoomMsgs:   db.prepare(`
    DELETE FROM messages WHERE room_code=@code AND id NOT IN (
      SELECT id FROM messages WHERE room_code=@code ORDER BY time DESC LIMIT @keep
    )
  `),

  insertGuest:  db.prepare(`
    INSERT INTO guestbook (id, room_code, usr, avatar, text, time)
    VALUES (@id, @room_code, @usr, @avatar, @text, @time)
  `),
  roomGuestbook: db.prepare(`SELECT * FROM guestbook WHERE room_code=? ORDER BY time ASC`),
  pruneGuest:    db.prepare(`
    DELETE FROM guestbook WHERE room_code=@code AND id NOT IN (
      SELECT id FROM guestbook WHERE room_code=@code ORDER BY time DESC LIMIT @keep
    )
  `),

  getStats:  db.prepare(`SELECT total, today, date FROM visit_stats WHERE id=1`),
  setStats:  db.prepare(`UPDATE visit_stats SET total=@total, today=@today, date=@date WHERE id=1`),
};

/* ─── 공개 API ─────────────────────────────── */
module.exports = {
  raw: db,

  /* 방 */
  saveRoom(r) {
    stmt.upsertRoom.run({
      code: r.code, name: r.name, descr: r.desc || '',
      category: r.category || 'daily', is_public: r.isPublic ? 1 : 0,
      notice: r.notice || '', created_at: r.createdAt,
    });
  },
  saveNotice(code, notice) { stmt.setNotice.run(notice, code); },
  removeRoom(code) { stmt.deleteRoom.run(code); },

  /* 메시지 */
  saveMessage(code, m) {
    stmt.insertMsg.run({
      id: m.id, room_code: code, usr: m.user, avatar: m.avatar || 'A',
      mood: m.mood || 'happy', text: m.text, time: m.time,
      is_image: m.isImage ? 1 : 0,
      reply_to: m.replyTo ? JSON.stringify(m.replyTo) : null,
      reactions: JSON.stringify(m.reactions || {}),
      deleted: m.deleted ? 1 : 0,
    });
    stmt.pruneRoomMsgs.run({ code, keep: MAX_MESSAGES });
  },
  saveReactions(msgId, reactions) {
    stmt.updateReactions.run(JSON.stringify(reactions || {}), msgId);
  },
  softDeleteMessage(msgId) { stmt.softDeleteMsg.run(msgId); },

  /* 방명록 */
  saveGuestbook(code, g) {
    stmt.insertGuest.run({
      id: g.id, room_code: code, usr: g.user,
      avatar: g.avatar || 'A', text: g.text, time: g.time,
    });
    stmt.pruneGuest.run({ code, keep: 50 });
  },

  /* 통계 */
  loadStats() { return stmt.getStats.get(); },
  saveStats(s) { stmt.setStats.run({ total: s.total, today: s.today, date: s.date }); },

  /* 서버 시작 시 전체 복원 */
  loadAll() {
    const result = new Map();
    for (const row of stmt.allRooms.all()) {
      const msgs = stmt.roomMessages.all(row.code).map(m => ({
        id: m.id, user: m.usr, avatar: m.avatar, mood: m.mood,
        text: m.text, time: m.time, isImage: !!m.is_image,
        replyTo: m.reply_to ? JSON.parse(m.reply_to) : null,
        reactions: JSON.parse(m.reactions || '{}'),
        deleted: !!m.deleted,
      }));
      const gb = stmt.roomGuestbook.all(row.code).map(g => ({
        id: g.id, user: g.usr, avatar: g.avatar, text: g.text, time: g.time,
      }));
      result.set(row.code, {
        name: row.name, desc: row.descr, category: row.category,
        isPublic: !!row.is_public, notice: row.notice || '',
        createdAt: row.created_at,
        messages: msgs, guestbook: gb,
        host: null, users: new Set(),
      });
    }
    return result;
  },

  close() { try { db.close(); } catch (_) {} },
};
