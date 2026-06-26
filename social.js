/**
 * ANANAS — 소셜 그래프 & 파도타기 엔진 (클래스/상속 추상화)
 * ─────────────────────────────────────────────
 * - SocialGraph : 친구 관계(무방향 그래프). 친구추가 = 상호 친구.
 * - WaveMatcher : 추상 베이스. pick(cid, currentRoom) → 방 코드 | null
 *     ├ FriendOfFriendMatcher : "친구의 친구" 공개 아지트 우선
 *     └ RandomPublicMatcher    : 폴백 — 무작위 공개 아지트
 * - WaveEngine  : 매처들을 순서대로 시도(친구의친구 → 폴백).
 *
 * 안전성: 모든 탐색은 유한 집합(친구 Set, 아지트 Set)만 1회 순회 →
 *         무한 루프 불가능. 후보 없으면 null 반환(조용히 폴백).
 */

const crypto = require('crypto');

/* 영숫자/하이픈만 허용하는 클라이언트 식별자 검증 */
function isValidCid(cid) {
  return typeof cid === 'string' && /^[A-Za-z0-9-]{8,64}$/.test(cid);
}

class SocialGraph {
  constructor() {
    this.adj = new Map();        // cid -> Set<cid>
  }
  _ensure(cid) {
    if (!this.adj.has(cid)) this.adj.set(cid, new Set());
    return this.adj.get(cid);
  }
  /** 상호 친구 추가. 성공 시 true */
  addFriend(a, b) {
    if (!isValidCid(a) || !isValidCid(b) || a === b) return false;
    this._ensure(a).add(b);
    this._ensure(b).add(a);
    return true;
  }
  friendsOf(cid) {
    return this.adj.get(cid) || new Set();
  }
  areFriends(a, b) {
    return this.adj.has(a) && this.adj.get(a).has(b);
  }
  /** 직렬화(클라이언트에 내 친구 목록 전달용) */
  list(cid) {
    return [...this.friendsOf(cid)];
  }
}

/* ─── 추상 매처 ─────────────────────────────── */
class WaveMatcher {
  /** @param {object} ctx - { rooms, graph, clientAzits, roomMaxUsers } */
  constructor(ctx) {
    if (new.target === WaveMatcher) throw new Error('WaveMatcher는 추상 클래스입니다.');
    this.ctx = ctx;
  }
  /** 하위 클래스가 반드시 구현 */
  pick(/* cid, currentRoom */) {
    throw new Error('pick()은 하위 클래스에서 구현해야 합니다.');
  }
  /** 입장 가능한 공개 아지트인지 */
  _isOpenPublic(code, currentRoom) {
    const r = this.ctx.rooms.get(code);
    return !!r && r.isPublic && code !== currentRoom && r.users.size < this.ctx.roomMaxUsers;
  }
  _randomFrom(arr) {
    return arr.length ? arr[crypto.randomInt(arr.length)] : null;
  }
}

/* ─── 친구의 친구 매처 ─────────────────────── */
class FriendOfFriendMatcher extends WaveMatcher {
  pick(cid, currentRoom) {
    const g = this.ctx.graph;
    const direct = g.friendsOf(cid);
    if (!direct.size) return null;

    const candidates = new Set();   // Set → 중복 방 자동 제거
    for (const friend of direct) {                 // 유한: 내 친구 수
      for (const fof of g.friendsOf(friend)) {     // 유한: 친구의 친구 수
        if (fof === cid || direct.has(fof)) continue;   // 나/직접친구 제외
        const azits = this.ctx.clientAzits.get(fof);
        if (!azits) continue;
        for (const code of azits) {                // 유한: 그 사람의 아지트 수
          if (this._isOpenPublic(code, currentRoom)) candidates.add(code);
        }
      }
    }
    return this._randomFrom([...candidates]);
  }
}

/* ─── 폴백: 무작위 공개 아지트 ─────────────── */
class RandomPublicMatcher extends WaveMatcher {
  pick(cid, currentRoom) {
    const candidates = [];
    for (const [code] of this.ctx.rooms) {         // 유한: 전체 방 수
      if (this._isOpenPublic(code, currentRoom)) candidates.push(code);
    }
    return this._randomFrom(candidates);
  }
}

/* ─── 엔진: 매처 체인 ──────────────────────── */
class WaveEngine {
  constructor(ctx) {
    this.matchers = [
      new FriendOfFriendMatcher(ctx),
      new RandomPublicMatcher(ctx),
    ];
  }
  /** @returns {{code:string, byFriend:boolean}|null} */
  surf(cid, currentRoom) {
    for (let i = 0; i < this.matchers.length; i++) {
      const code = this.matchers[i].pick(cid, currentRoom);
      if (code) return { code, byFriend: i === 0 };
    }
    return null;
  }
}

module.exports = { SocialGraph, WaveEngine, WaveMatcher, FriendOfFriendMatcher, RandomPublicMatcher, isValidCid };
