/* ═══════════════════════════════════════════════════════════
   ANANAS Messenger — Client v4
   픽셀 스프라이트 엔진 · 할톤 인트로 · 실시간 채팅 · 방명록 · 파도타기
═══════════════════════════════════════════════════════════ */
'use strict';

/* ─── 짧은 헬퍼 ─────────────────────────── */
const $  = (s, p) => (p || document).querySelector(s);
const $$ = (s, p) => [...(p || document).querySelectorAll(s)];

function escHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#x27;');
}
/* 서버(validator.escape)와 동일하게 escape — 닉네임 비교용 */
function serverEscape(str) {
  return String(str)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;').replace(/\\/g, '&#x5C;').replace(/`/g, '&#96;');
}
function fmtTime(ts) {
  const d = new Date(ts);
  const h = d.getHours(), m = String(d.getMinutes()).padStart(2, '0');
  const ap = h < 12 ? '오전' : '오후';
  const hh = h % 12 === 0 ? 12 : h % 12;
  return `${ap} ${hh}:${m}`;
}
function fmtDate(ts) {
  const d = new Date(ts);
  return `${d.getFullYear()}년 ${d.getMonth() + 1}월 ${d.getDate()}일`;
}
function dayKey(ts) {
  const d = new Date(ts);
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

/* 토스트 */
function showToast(msg, type) {
  const box = $('#toastContainer');
  if (!box) return;
  const t = document.createElement('div');
  t.className = 'toast' + (type === 'success' ? ' toast-success' : type === 'error' ? ' toast-error' : '');
  t.textContent = msg;
  box.appendChild(t);
  setTimeout(() => t.remove(), 3300);
}

/* ═══════════════════════════════════════════
   설정 모달 (알림 위치 · 알림음)
═══════════════════════════════════════════ */
const NOTIFY_POSITIONS = {
  left:   { style: 'left:18px;right:auto;align-items:flex-start', dotStyle: 'top:5px;left:5px;right:auto', label: '왼쪽 상단' },
  center: { style: 'left:50%;right:auto;transform:translateX(-50%);align-items:center', dotStyle: 'top:5px;left:50%;transform:translateX(-50%)', label: '가운데 상단' },
  right:  { style: 'right:18px;left:auto;align-items:flex-end', dotStyle: 'top:5px;right:5px;left:auto', label: '오른쪽 상단' },
};

function applyNotifyPos(pos) {
  const stack = document.getElementById('chatNotifyStack');
  if (!stack) return;
  const cfg = NOTIFY_POSITIONS[pos] || NOTIFY_POSITIONS.right;
  stack.setAttribute('style', cfg.style);
  const dot = document.getElementById('nppDot');
  if (dot) dot.setAttribute('style', cfg.dotStyle);
  const lbl = document.getElementById('nppLabel');
  if (lbl) lbl.textContent = cfg.label;
  document.querySelectorAll('.notify-pos-btn').forEach(b => b.classList.toggle('active', b.dataset.pos === pos));
}

function setNotifyPos(pos) {
  localStorage.setItem('ananas_notify_pos', pos);
  applyNotifyPos(pos);
}

function openSettings() {
  const overlay = document.getElementById('settingsOverlay');
  if (!overlay) return;
  overlay.classList.remove('hidden');
  const savedPos = localStorage.getItem('ananas_notify_pos') || 'right';
  applyNotifyPos(savedPos);
  const soundToggle = document.getElementById('soundToggle');
  if (soundToggle) soundToggle.checked = localStorage.getItem('ananas_sound') !== 'off';
}

function closeSettings() {
  const overlay = document.getElementById('settingsOverlay');
  if (overlay) overlay.classList.add('hidden');
}

function setSoundEnabled(enabled) {
  localStorage.setItem('ananas_sound', enabled ? 'on' : 'off');
}

window.openSettings = openSettings;
window.closeSettings = closeSettings;
window.setNotifyPos = setNotifyPos;
window.setSoundEnabled = setSoundEnabled;

/* ══ 계정 모달 ══════════════════════════════ */
let accMoodMain = 'happy';
let accMoodSub = 'happy';

function openAccount() {
  const el = document.getElementById('accountOverlay');
  if (!el) return;
  el.classList.remove('hidden');
  /* 저장된 프로필 불러오기 */
  ['main','sub'].forEach(t => {
    loadAccPhoto(t);
    const raw = localStorage.getItem('ananas_' + t + '_profile');
    if (!raw) return;
    try {
      const p = JSON.parse(raw);
      const nickEl = document.getElementById(t === 'main' ? 'accMainNick' : 'accSubNick');
      if (nickEl && p.nickname) nickEl.value = p.nickname;
      if (t === 'main' && p.mood) { accMoodMain = p.mood; highlightAccMood('main', p.mood); }
      if (t === 'sub' && p.mood) { accMoodSub = p.mood; highlightAccMood('sub', p.mood); }
    } catch(e) {}
  });
}
function closeAccount() {
  const el = document.getElementById('accountOverlay');
  if (el) el.classList.add('hidden');
}
function switchAccTab(type) {
  document.getElementById('accMainSection').style.display = type === 'main' ? '' : 'none';
  document.getElementById('accSubSection').style.display = type === 'sub' ? '' : 'none';
  document.getElementById('accTabMain').classList.toggle('active', type === 'main');
  document.getElementById('accTabSub').classList.toggle('active', type === 'sub');
}
function setAccMood(mood, btn) { accMoodMain = mood; highlightAccMood('main', mood); }
function setAccMood2(mood, btn) { accMoodSub = mood; highlightAccMood('sub', mood); }
function highlightAccMood(type, mood) {
  const section = document.getElementById(type === 'main' ? 'accMainSection' : 'accSubSection');
  if (!section) return;
  section.querySelectorAll('.acc-mood-btn').forEach(b => b.classList.toggle('active', b.dataset.mood === mood));
}
function setAccPhoto(type, input) {
  const file = input.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = e => {
    const dataUrl = e.target.result;
    const imgId = type === 'main' ? 'accMainPhotoImg' : 'accSubPhotoImg';
    const canvasId = type === 'main' ? 'accMainCanvas' : 'accSubCanvas';
    const img = document.getElementById(imgId);
    const cv = document.getElementById(canvasId);
    if (img) { img.src = dataUrl; img.style.display = 'block'; }
    if (cv) cv.style.display = 'none';
    localStorage.setItem('ananas_' + type + '_photo', dataUrl);
  };
  reader.readAsDataURL(file);
}
function loadAccPhoto(type) {
  const dataUrl = localStorage.getItem('ananas_' + type + '_photo');
  const imgId = type === 'main' ? 'accMainPhotoImg' : 'accSubPhotoImg';
  const canvasId = type === 'main' ? 'accMainCanvas' : 'accSubCanvas';
  const img = document.getElementById(imgId);
  const cv = document.getElementById(canvasId);
  if (dataUrl && img) {
    img.src = dataUrl; img.style.display = 'block';
    if (cv) cv.style.display = 'none';
  } else {
    if (img) img.style.display = 'none';
    if (cv) cv.style.display = 'block';
  }
}
function saveAccProfile(type) {
  const nick = (document.getElementById(type === 'main' ? 'accMainNick' : 'accSubNick')?.value || '').trim();
  if (!nick) { showToast('닉네임을 입력해주세요.', 'error'); return; }
  const mood = type === 'main' ? accMoodMain : accMoodSub;
  const photo = localStorage.getItem('ananas_' + type + '_photo') || '';
  const profile = { nickname: nick, avatar: typeof state !== 'undefined' ? (state.avatar || 'A') : 'A', mood, profileImage: photo };
  localStorage.setItem('ananas_' + type + '_profile', JSON.stringify(profile));
  showToast((type === 'main' ? '메인' : '서브') + ' 프로필 저장됨!', 'success');
}
function applyAccProfile(type) {
  saveAccProfile(type);
  const raw = localStorage.getItem('ananas_' + type + '_profile');
  if (!raw) return;
  try {
    const p = JSON.parse(raw);
    if (typeof state !== 'undefined') { state.nickname = p.nickname; state.mood = p.mood; if (p.profileImage) state.profileImage = p.profileImage; }
    localStorage.setItem('ananas_nickname', p.nickname);
    showToast('방 프로필에 적용됐어요!', 'success');
    closeAccount();
  } catch(e) {}
}
function deleteAccProfile(type) {
  localStorage.removeItem('ananas_' + type + '_profile');
  localStorage.removeItem('ananas_' + type + '_photo');
  const nickEl = document.getElementById(type === 'main' ? 'accMainNick' : 'accSubNick');
  if (nickEl) nickEl.value = '';
  showToast('프로필이 삭제됐어요.', 'success');
}

window.openAccount = openAccount;
window.closeAccount = closeAccount;
window.switchAccTab = switchAccTab;
window.setAccMood = setAccMood;
window.setAccMood2 = setAccMood2;
window.setAccPhoto = setAccPhoto;
window.saveAccProfile = saveAccProfile;
window.applyAccProfile = applyAccProfile;
window.deleteAccProfile = deleteAccProfile;

/* ══ 프로필 페이지 ══════════════════════════ */
let prfMoodMain = 'happy', prfMoodSub = 'happy';

function switchPrfTab(type) {
  $('#prfMainSection').style.display = type === 'main' ? '' : 'none';
  $('#prfSubSection').style.display  = type === 'sub'  ? '' : 'none';
  $('#prfTabMain').classList.toggle('active', type === 'main');
  $('#prfTabSub').classList.toggle('active',  type === 'sub');
}

function loadPrfPage() {
  /* 고유 코드 */
  const cid = localStorage.getItem('ananas_cid') || (typeof state !== 'undefined' ? state.cid : '') || '—';
  const cidEl = document.getElementById('prfCidDisplay');
  if (cidEl) cidEl.textContent = cid.slice(0, 8);

  /* 내 프로필 배너 업데이트 */
  const mainRaw = localStorage.getItem('ananas_main_profile');
  if (mainRaw) {
    try {
      const p = JSON.parse(mainRaw);
      const nameEl = document.getElementById('kfMyName');
      if (nameEl) nameEl.textContent = p.nickname || '—';
    } catch(e) {}
  }
  /* 프로필 사진 로드 */
  loadPrfPhoto('main');

  renderFriendList();
  renderFriendReqs();
}

/* 친구코드 추가 팝업 */
function openFriendAddPopup() {
  const popup = document.getElementById('friendAddPopup');
  if (popup) { popup.classList.remove('hidden'); document.getElementById('friendCodeInput')?.focus(); }
}
function closeFriendAddPopup() {
  const popup = document.getElementById('friendAddPopup');
  if (popup) popup.classList.add('hidden');
}

function loadPrfPhoto(type) {
  const data = localStorage.getItem('ananas_' + type + '_photo');
  const imgEl = document.getElementById(type === 'main' ? 'prfMainPhotoImg' : 'prfSubPhotoImg');
  const cvEl  = document.getElementById(type === 'main' ? 'prfMainCanvas'   : 'prfSubCanvas');
  if (data && imgEl) {
    imgEl.src = data; imgEl.style.display = 'block';
    if (cvEl) cvEl.style.display = 'none';
  } else {
    if (imgEl) imgEl.style.display = 'none';
    if (cvEl)  cvEl.style.display  = 'block';
  }
}

let _prfCropTarget = null;
let _cropMode = null;   // 'profile' | 'chat'

function setPrfPhoto(type, input) {
  const file = input.files[0]; if (!file) return;
  input.value = '';
  if (!/^image\/(jpeg|png|webp)$/.test(file.type)) { showToast('JPG/PNG/WEBP만 가능해요.', 'error'); return; }
  _prfCropTarget = type;
  _cropMode = 'profile';
  _openCropForFile(file);
}

function setPrfMood(type, mood, btn) {
  if (type === 'main') prfMoodMain = mood; else prfMoodSub = mood;
  highlightPrfMood(type, mood);
}
function highlightPrfMood(type, mood) {
  const sectionId = type === 'main' ? 'prfMainSection' : 'prfSubSection';
  document.querySelectorAll('#' + sectionId + ' .prf-mood').forEach(b =>
    b.classList.toggle('active', b.dataset.mood === mood));
}

function savePrfProfile(type) {
  const nick = (document.getElementById(type === 'main' ? 'prfMainNick' : 'prfSubNick')?.value || '').trim();
  if (!nick) { showToast('닉네임을 입력해주세요.', 'error'); return; }
  const mood = type === 'main' ? prfMoodMain : prfMoodSub;
  const photo = localStorage.getItem('ananas_' + type + '_photo') || '';
  const profile = { nickname: nick, avatar: typeof state !== 'undefined' ? (state.avatar || 'A') : 'A', mood, profileImage: photo };
  localStorage.setItem('ananas_' + type + '_profile', JSON.stringify(profile));
  showToast((type === 'main' ? '메인' : '서브') + ' 프로필 저장됨!', 'success');
}

function applyPrfProfile(type) {
  savePrfProfile(type);
  const raw = localStorage.getItem('ananas_' + type + '_profile');
  if (!raw) return;
  try {
    const p = JSON.parse(raw);
    if (typeof state !== 'undefined') {
      state.nickname = p.nickname; state.mood = p.mood;
      if (p.profileImage) state.profileImage = p.profileImage;
    }
    localStorage.setItem('ananas_nickname', p.nickname);
    showToast('방 프로필에 적용됐어요!', 'success');
  } catch(e) {}
}

function deletePrfProfile(type) {
  localStorage.removeItem('ananas_' + type + '_profile');
  localStorage.removeItem('ananas_' + type + '_photo');
  document.getElementById(type === 'main' ? 'prfMainNick' : 'prfSubNick').value = '';
  loadPrfPhoto(type);
  showToast('프로필이 삭제됐어요.', 'success');
}

/* ── 친구 시스템 (localStorage) ── */
function getFriends()   { try { return JSON.parse(localStorage.getItem('ananas_friends') || '[]'); } catch(e) { return []; } }
function getFriendReqs(){ try { return JSON.parse(localStorage.getItem('ananas_friend_reqs') || '[]'); } catch(e) { return []; } }
function saveFriends(list)   { localStorage.setItem('ananas_friends', JSON.stringify(list)); }
function saveFriendReqs(list){ localStorage.setItem('ananas_friend_reqs', JSON.stringify(list)); }

/* 기존 테스트 친구 데이터 일회 정리 */
(function() {
  const cleaned = getFriends().filter(f => !String(f.cid||'').startsWith('test-friend-'));
  if (cleaned.length !== getFriends().length) saveFriends(cleaned);
})();

function renderFriendList() {
  const list = getFriends();
  const el = document.getElementById('friendList');
  const emptyEl = document.getElementById('friendEmpty');
  const countEl = document.getElementById('friendCount');
  if (countEl) countEl.textContent = list.length;
  if (!el) return;
  if (list.length === 0) { if (emptyEl) emptyEl.style.display = ''; el.querySelectorAll('.kf-friend-item').forEach(n=>n.remove()); return; }
  if (emptyEl) emptyEl.style.display = 'none';
  el.innerHTML = '<p class="friend-empty" id="friendEmpty" style="display:none"></p>' +
    list.map((f, i) => `
    <div class="kf-friend-item friend-item" data-fi="${i}">
      <div class="kf-fi-avatar">${f.photo ? `<img src="${f.photo}" alt="">` : '<span class="kf-fi-default">🍍</span>'}</div>
      <div class="kf-fi-info">
        <div class="fi-nick-row">
          <span class="kf-fi-name">${escHtml(f.alias || f.nickname)}</span>
          ${f.alias ? `<span class="kf-fi-orig">(${escHtml(f.nickname)})</span>` : ''}
        </div>
        <div class="fi-nick-edit hidden">
          <input class="fi-nick-input" value="${escHtml(f.alias || f.nickname)}" maxlength="20" placeholder="표시 이름">
          <button class="fi-nick-save" onclick="saveFriendNick(${i})">저장</button>
          <button class="fi-nick-cancel" onclick="cancelEditFriendNick(${i})">취소</button>
        </div>
        <div class="kf-fi-sub">${escHtml(f.cid.slice(0,8))}</div>
      </div>
      <div class="kf-fi-acts">
        <button class="kf-fi-edit-btn" onclick="startEditFriendNick(${i})" title="이름 수정">✏️</button>
        <button class="kf-fi-del-btn" onclick="deleteFriend(${i})" title="친구 삭제">✕</button>
      </div>
    </div>`).join('');
}

function renderFriendReqs() {
  const reqs = getFriendReqs();
  const section = document.getElementById('friendReqSection');
  const list = document.getElementById('friendReqList');
  const badge = document.getElementById('reqBadge');
  if (!section) return;
  if (reqs.length === 0) { section.style.display = 'none'; return; }
  section.style.display = '';
  if (badge) badge.textContent = reqs.length;
  if (list) list.innerHTML = reqs.map((r, i) => `
    <div class="friend-req-item">
      <div>
        <div class="frq-nick">${escHtml(r.nickname || '익명')}</div>
        <div class="frq-cid">${escHtml(r.cid)}</div>
      </div>
      <div class="frq-btns">
        <button class="frq-accept" onclick="acceptFriendReq(${i})">수락</button>
        <button class="frq-reject" onclick="rejectFriendReq(${i})">거절</button>
      </div>
    </div>`).join('');
}

function sendFriendReq() {
  const input = document.getElementById('friendCodeInput');
  const code = (input?.value || '').trim();
  if (!code) { showToast('코드를 입력해주세요.', 'error'); return; }
  const friends = getFriends();
  if (friends.some(f => f.cid === code)) { showToast('이미 친구예요!', 'error'); return; }
  const myCid = localStorage.getItem('ananas_cid') || '';
  if (code === myCid.slice(0, 8) || code === myCid) { showToast('자신에게 요청할 수 없어요.', 'error'); return; }
  /* 서버에 요청 emit (서버가 상대 cid 유저에게 전달) */
  if (typeof socket !== 'undefined') {
    const myNick = localStorage.getItem('ananas_nickname') || '익명';
    socket.emit('friendRequest', { toCid: code, fromNick: myNick, fromCid: myCid });
  }
  if (input) input.value = '';
  closeFriendAddPopup();
  showToast('친구 요청을 보냈어요!', 'success');
}

function acceptFriendReq(idx) {
  const reqs = getFriendReqs();
  const req = reqs[idx]; if (!req) return;
  const friends = getFriends();
  if (!friends.some(f => f.cid === req.cid)) {
    friends.push({ nickname: req.nickname || '익명', cid: req.cid, photo: req.photo || '', addedAt: Date.now() });
    saveFriends(friends);
  }
  reqs.splice(idx, 1);
  saveFriendReqs(reqs);
  if (typeof socket !== 'undefined') {
    socket.emit('friendAccept', { toCid: req.cid, fromNick: localStorage.getItem('ananas_nickname') || '익명' });
  }
  renderFriendList();
  renderFriendReqs();
  showToast(req.nickname + '님과 친구가 됐어요!', 'success');
}

function rejectFriendReq(idx) {
  const reqs = getFriendReqs();
  reqs.splice(idx, 1);
  saveFriendReqs(reqs);
  renderFriendList();
  renderFriendReqs();
  showToast('요청을 거절했어요.', 'success');
}

function startEditFriendNick(idx) {
  const item = document.querySelector(`.friend-item[data-fi="${idx}"]`);
  if (!item) return;
  item.querySelector('.fi-nick-row').classList.add('hidden');
  item.querySelector('.fi-nick-edit').classList.remove('hidden');
  item.querySelector('.fi-nick-input').focus();
}
function cancelEditFriendNick(idx) {
  const item = document.querySelector(`.friend-item[data-fi="${idx}"]`);
  if (!item) return;
  item.querySelector('.fi-nick-row').classList.remove('hidden');
  item.querySelector('.fi-nick-edit').classList.add('hidden');
}
function saveFriendNick(idx) {
  const item = document.querySelector(`.friend-item[data-fi="${idx}"]`);
  if (!item) return;
  const val = item.querySelector('.fi-nick-input').value.trim();
  const friends = getFriends();
  if (!friends[idx]) return;
  if (!val) {
    delete friends[idx].alias;
  } else {
    friends[idx].alias = val;
  }
  saveFriends(friends);
  renderFriendList();
  showToast('닉네임이 변경됐어요!', 'success');
}
window.startEditFriendNick  = startEditFriendNick;
window.cancelEditFriendNick = cancelEditFriendNick;
window.saveFriendNick       = saveFriendNick;

function deleteFriend(idx) {
  const friends = getFriends();
  const removed = friends.splice(idx, 1)[0];
  saveFriends(friends);
  renderFriendList();
  showToast((removed?.nickname || '친구') + '님을 삭제했어요.', 'success');
}

function escHtml(s) {
  return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

/* switchPage 훅: 프로필 페이지 진입 시 데이터 로드 */
const _origSwitchPage = window.switchPage;
window.switchPage = function(name) {
  _origSwitchPage(name);
  if (name === 'profile') { loadPrfPage(); renderRecent(); }
};

/* 소켓: 친구 요청 수신 */
document.addEventListener('DOMContentLoaded', () => {
  const waitSocket = setInterval(() => {
    if (typeof socket === 'undefined') return;
    clearInterval(waitSocket);
    socket.on('friendRequest', data => {
      const reqs = getFriendReqs();
      if (!reqs.some(r => r.cid === data.fromCid)) {
        reqs.push({ nickname: data.fromNick, cid: data.fromCid, photo: data.photo || '' });
        saveFriendReqs(reqs);
      }
      renderFriendReqs();
      showToast(data.fromNick + '님이 친구 요청을 보냈어요!', 'success');
    });
    socket.on('friendAccept', data => {
      showToast(data.fromNick + '님이 친구 요청을 수락했어요!', 'success');
    });
  }, 500);
});

window.switchPrfTab    = switchPrfTab;
window.setPrfPhoto     = setPrfPhoto;
window.setPrfMood      = setPrfMood;
window.savePrfProfile  = savePrfProfile;
window.applyPrfProfile = applyPrfProfile;
window.deletePrfProfile= deletePrfProfile;
window.sendFriendReq   = sendFriendReq;
window.acceptFriendReq = acceptFriendReq;
window.rejectFriendReq = rejectFriendReq;
window.deleteFriend    = deleteFriend;

/* ══ 스크롤 모션 (fade-up) ══════════════════ */
document.addEventListener('DOMContentLoaded', () => {
  const io = new IntersectionObserver(entries => {
    entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add('visible'); io.unobserve(e.target); } });
  }, { threshold: 0.12 });
  document.querySelectorAll('.fade-up').forEach(el => io.observe(el));
});


/* 초기 알림 위치 적용 */
document.addEventListener('DOMContentLoaded', () => {
  applyNotifyPos(localStorage.getItem('ananas_notify_pos') || 'right');
});

/* 효과음 (WebAudio 블립) */
let _audioCtx = null, _lastBeep = 0;
function playBeep(freq = 740) {
  if (localStorage.getItem('ananas_sound') === 'off') return;
  try {
    const now = Date.now();
    if (now - _lastBeep < 900) return;
    _lastBeep = now;
    _audioCtx = _audioCtx || new (window.AudioContext || window.webkitAudioContext)();
    const o = _audioCtx.createOscillator(), g = _audioCtx.createGain();
    o.type = 'square'; o.frequency.value = freq;
    g.gain.setValueAtTime(0.035, _audioCtx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.0001, _audioCtx.currentTime + 0.14);
    o.connect(g); g.connect(_audioCtx.destination);
    o.start(); o.stop(_audioCtx.currentTime + 0.15);
  } catch (e) { /* 무음 폴백 */ }
}

/* ═══════════════════════════════════════════
   1. 픽셀 스프라이트 엔진 (High-Res Pixel Art)
   문자 그리드 → canvas 렌더, data-scale 배율
═══════════════════════════════════════════ */
const PX_PALETTE = {
  Y: '#FFC400', y: '#FFE583', O: '#FF9D00',
  G: '#4CAF2E', g: '#2E6B1D',
  K: '#1F1B13', W: '#FFFEF8',
  R: '#F2705C', P: '#FFAD9E',
  B: '#8B5E3C', b: '#5A8DEE',
  S: '#9AD8F2',
  C: '#F5EDD6', /* 커서 배경 (크림) */
  D: '#E8D9B0', /* 커서 배경 테두리 */
};

const PX_SPRITES = {
  /* 파인애플 기본 */
  pine: [
    '......g..g......',
    '.....gG..Gg.....',
    '....gGG..GGg....',
    '.....GGGGGG.....',
    '......GGGG......',
    '....YYYYYYYY....',
    '...YyYYYYYYYY...',
    '..YYyYYYYYYYYY..',
    '..YYKYYYYYYKYY..',
    '..YYKYYYYYYKYY..',
    '.YPYYYYYYYYYYPY.',
    '.YPYYYKYYKYYYPY.',
    '..YYYYYKKYYYYY..',
    '..YYYYYYYYYYYY..',
    '...YYYYYYYYYY...',
    '....YYYYYYYY....',
  ],
  /* 윙크 */
  pineWink: [
    '......g..g......',
    '.....gG..Gg.....',
    '....gGG..GGg....',
    '.....GGGGGG.....',
    '......GGGG......',
    '....YYYYYYYY....',
    '...YyYYYYYYYY...',
    '..YYyYYYYYYYYY..',
    '..YYKYYYYYKKYY..',
    '..YYKYYYYYYYYY..',
    '.YPYYYYYYYYYYPY.',
    '.YPYYYKYYKYYYPY.',
    '..YYYYYKKYYYYY..',
    '..YYYYYYYYYYYY..',
    '...YYYYYYYYYY...',
    '....YYYYYYYY....',
  ],
  /* 선글라스 */
  pineCool: [
    '......g..g......',
    '.....gG..Gg.....',
    '....gGG..GGg....',
    '.....GGGGGG.....',
    '......GGGG......',
    '....YYYYYYYY....',
    '...YyYYYYYYYY...',
    '..KKKKKKKKKKKK..',
    '..YKKKYYYYKKKY..',
    '..YYKKYYYYKKYY..',
    '.YPYYYYYYYYYYPY.',
    '.YPYYYYYYYYYYPY.',
    '..YYYYYKKYYYYY..',
    '..YYYYYYYYYYYY..',
    '...YYYYYYYYYY...',
    '....YYYYYYYY....',
  ],
  /* 함박웃음 */
  pineHappy: [
    '......g..g......',
    '.....gG..Gg.....',
    '....gGG..GGg....',
    '.....GGGGGG.....',
    '......GGGG......',
    '....YYYYYYYY....',
    '...YyYYYYYYYY...',
    '..YYyKYYYYKYYY..',
    '..YYKYKYYKYKYY..',
    '..YYYYYYYYYYYY..',
    '.YPYYKYYYYKYYPY.',
    '.YPYYYKKKKYYYPY.',
    '..YYYYYYYYYYYY..',
    '..YYYYYYYYYYYY..',
    '...YYYYYYYYYY...',
    '....YYYYYYYY....',
  ],
  /* 쿨쿨 */
  pineSleep: [
    '......g..g..ZZZ.',
    '.....gG..Gg...Z.',
    '....gGG..GGg.Z..',
    '.....GGGGGG.ZZZ.',
    '......GGGG......',
    '....YYYYYYYY....',
    '...YyYYYYYYYY...',
    '..YYyYYYYYYYYY..',
    '..YYKKYYYYKKYY..',
    '..YYYYYYYYYYYY..',
    '.YPYYYYYYYYYYPY.',
    '.YPYYYYKKYYYYPY.',
    '..YYYYYYYYYYYY..',
    '..YYYYYYYYYYYY..',
    '...YYYYYYYYYY...',
    '....YYYYYYYY....',
  ],
  heart: [
    '................',
    '................',
    '...RR.....RR....',
    '..RRRR...RRRR...',
    '.RRRRRR.RRRRRR..',
    '.RRWRRRRRRRRRR..',
    '.RRWRRRRRRRRRR..',
    '.RRRRRRRRRRRRR..',
    '..RRRRRRRRRRR...',
    '...RRRRRRRRR....',
    '....RRRRRRR.....',
    '.....RRRRR......',
    '......RRR.......',
    '.......R........',
    '................',
    '................',
  ],
  mail: [
    '................',
    '................',
    '..KKKKKKKKKKKK..',
    '..KWWWWWWWWWWK..',
    '..KWKWWWWWWKWK..',
    '..KWWKWWWWKWWK..',
    '..KWWWKWWKWWWK..',
    '..KWWWWKKWWWWK..',
    '..KWWWWWWWWWWK..',
    '..KWWWWWWWWWWK..',
    '..KWWWWWWWWWWK..',
    '..KKKKKKKKKKKK..',
    '......YYY.......',
    '.....YYYYY......',
    '......YYY.......',
    '................',
  ],
  wave: [
    '................',
    '................',
    '................',
    '....bb..........',
    '...bbbb....bb...',
    '..bbSSbb..bbbb..',
    '.bbSSSSbbbbSSbb.',
    'bbSSWWSSbbSSSSbb',
    'bSSWWWWSSSSWWSSb',
    'bSWWSSWWSSWWWWSb',
    'bbSSbbSSWWSSSSbb',
    '.bbbb..bbSSbbb..',
    '..bb....bbbb....',
    '.........bb.....',
    '................',
    '................',
  ],
  star: [
    '................',
    '.......YY.......',
    '.......YY.......',
    '......YyYY......',
    '......YyYY......',
    '.YYYYYYyYYYYYY..',
    '..YYyyyyyYYYY...',
    '...YYyyyyYYY....',
    '....YyyyyYY.....',
    '....YyyYyyY.....',
    '...YYyY..YyY....',
    '...YyY....YY....',
    '..YYY......YY...',
    '..YY........Y...',
    '................',
    '................',
  ],
  key: [
    '................',
    '....YYYY........',
    '...YYyyYY.......',
    '...Yy..yY.......',
    '...Yy..yY.......',
    '...YYyyYY.......',
    '....YYYY........',
    '......YY........',
    '......YY........',
    '......YYYY......',
    '......YY........',
    '......YYYY......',
    '......YY........',
    '................',
    '................',
    '................',
  ],
  pin: [
    '................',
    '.....RRRRR......',
    '....RRRRRRR.....',
    '...RRRWWRRRR....',
    '...RRWWRRRRR....',
    '...RRRRRRRRR....',
    '...RRRRRRRRR....',
    '....RRRRRRR.....',
    '.....RRRRR......',
    '......RRR.......',
    '......KK........',
    '......KK........',
    '.......K........',
    '.......K........',
    '................',
    '................',
  ],
  camera: [
    '................',
    '................',
    '.....KKKK.......',
    '..KKKKKKKKKKKK..',
    '..KWWWWWWWWWWK..',
    '..KWWKKKKWWWWK..',
    '..KWKSSSSKWWyK..',
    '..KWKSbbSKWWWK..',
    '..KWKSbbSKWWWK..',
    '..KWKSSSSKWWWK..',
    '..KWWKKKKWWWWK..',
    '..KWWWWWWWWWWK..',
    '..KKKKKKKKKKKK..',
    '................',
    '................',
    '................',
  ],
  bolt: [
    '................',
    '........YYYY....',
    '.......YYYY.....',
    '......YYYY......',
    '.....YYYY.......',
    '....YYYYYYYY....',
    '...YYYYYYYY.....',
    '......YYYY......',
    '.....YYYY.......',
    '....YYYY........',
    '...YYYY.........',
    '..YYY...........',
    '..YY............',
    '................',
    '................',
    '................',
  ],
  power: [
    '................',
    '.......KK.......',
    '.......KK.......',
    '...KK..KK..KK...',
    '..KK...KK...KK..',
    '.KK....KK....KK.',
    '.KK....KK....KK.',
    '.KK..........KK.',
    '.KK..........KK.',
    '.KK..........KK.',
    '..KK........KK..',
    '...KKK....KKK...',
    '....KKKKKKKK....',
    '......KKKK......',
    '................',
    '................',
  ],
  chat: [
    '................',
    '..KKKKKKKKKKKK..',
    '.KYYYYYYYYYYYYK.',
    '.KYYYYYYYYYYYYK.',
    '.KYYWWYYWWYWWYK.',
    '.KYYWWYYWWYWWYK.',
    '.KYYYYYYYYYYYYK.',
    '.KYYYYYYYYYYYYK.',
    '..KKKKKKKKKKKK..',
    '......KYYK......',
    '.....KYYK.......',
    '....KYK.........',
    '....KK..........',
    '................',
    '................',
    '................',
  ],
};

function renderSprite(canvas) {
  const name  = canvas.dataset.sprite;
  const scale = parseInt(canvas.dataset.scale, 10) || 4;
  const grid  = PX_SPRITES[name];
  if (!grid) return;
  const h = grid.length;
  const w = Math.max(...grid.map(r => r.length));
  canvas.width  = w * scale;
  canvas.height = h * scale;
  canvas.style.imageRendering = 'pixelated';
  const ctx = canvas.getContext('2d');
  for (let r = 0; r < h; r++) {
    const row = grid[r];
    for (let c = 0; c < row.length; c++) {
      const ch = row[c];
      if (ch === '.' || ch === ' ') continue;
      ctx.fillStyle = PX_PALETTE[ch] || (ch === 'Z' ? '#9AA0A6' : '#1F1B13');
      ctx.fillRect(c * scale, r * scale, scale, scale);
    }
  }
}
function renderAllSprites(root) {
  $$('canvas.px', root).forEach(renderSprite);
}

/* ═══════════════════════════════════════════
   2. 할톤 도트 엔진 (인트로)
═══════════════════════════════════════════ */
function getShapeMask(shape, size) {
  const off = document.createElement('canvas');
  off.width = off.height = size;
  const oc = off.getContext('2d');
  oc.fillStyle = '#000';
  const s = size;

  if (shape === 'pineapple') {
    oc.beginPath(); oc.ellipse(s * .5, s * .64, s * .30, s * .36, 0, 0, Math.PI * 2); oc.fill();
    oc.beginPath(); oc.ellipse(s * .5,  s * .21, s * .06, s * .21, 0,    0, Math.PI * 2); oc.fill();
    oc.beginPath(); oc.ellipse(s * .36, s * .26, s * .05, s * .17, -.55, 0, Math.PI * 2); oc.fill();
    oc.beginPath(); oc.ellipse(s * .64, s * .26, s * .05, s * .17, .55,  0, Math.PI * 2); oc.fill();
  } else if (shape === 'chat') {
    const r = s * .13, x1 = s * .08, y1 = s * .12, x2 = s * .92, y2 = s * .70;
    oc.beginPath();
    oc.moveTo(x1 + r, y1); oc.lineTo(x2 - r, y1);
    oc.quadraticCurveTo(x2, y1, x2, y1 + r);
    oc.lineTo(x2, y2 - r);
    oc.quadraticCurveTo(x2, y2, x2 - r, y2);
    oc.lineTo(s * .52, y2); oc.lineTo(s * .40, s * .87); oc.lineTo(s * .30, y2);
    oc.lineTo(x1 + r, y2);
    oc.quadraticCurveTo(x1, y2, x1, y2 - r);
    oc.lineTo(x1, y1 + r);
    oc.quadraticCurveTo(x1, y1, x1 + r, y1);
    oc.closePath(); oc.fill();
  } else if (shape === 'heart') {
    oc.beginPath();
    oc.moveTo(s * .5, s * .74);
    oc.bezierCurveTo(s * .1, s * .5, s * .1, s * .18, s * .5, s * .34);
    oc.bezierCurveTo(s * .9, s * .18, s * .9, s * .5, s * .5, s * .74);
    oc.fill();
  } else if (shape === 'logo') {
    /* 브랜드 로고: 잎 3장 + 노란 말풍선 + 점 3개 (이미지3 재해석) */
    // 가운데 잎
    oc.beginPath(); oc.ellipse(s * .5,  s * .175, s * .055, s * .145, 0,   0, Math.PI * 2); oc.fill();
    // 좌우 잎
    oc.beginPath(); oc.ellipse(s * .375, s * .21, s * .05, s * .115, -.62, 0, Math.PI * 2); oc.fill();
    oc.beginPath(); oc.ellipse(s * .625, s * .21, s * .05, s * .115, .62,  0, Math.PI * 2); oc.fill();
    // 말풍선 몸통
    const r = s * .16, x1 = s * .17, y1 = s * .30, x2 = s * .83, y2 = s * .78;
    oc.beginPath();
    oc.moveTo(x1 + r, y1); oc.lineTo(x2 - r, y1);
    oc.quadraticCurveTo(x2, y1, x2, y1 + r);
    oc.lineTo(x2, y2 - r);
    oc.quadraticCurveTo(x2, y2, x2 - r, y2);
    oc.lineTo(s * .58, y2);
    // 꼬리 (오른쪽 아래)
    oc.lineTo(s * .63, s * .92); oc.lineTo(s * .46, y2);
    oc.lineTo(x1 + r, y2);
    oc.quadraticCurveTo(x1, y2, x1, y2 - r);
    oc.lineTo(x1, y1 + r);
    oc.quadraticCurveTo(x1, y1, x1 + r, y1);
    oc.closePath(); oc.fill();
    // 점 3개 펀치아웃
    oc.globalCompositeOperation = 'destination-out';
    [.36, .5, .64].forEach(fx => {
      oc.beginPath(); oc.arc(s * fx, s * .54, s * .045, 0, Math.PI * 2); oc.fill();
    });
    oc.globalCompositeOperation = 'source-over';
  }
  return oc.getImageData(0, 0, size, size);
}

function buildDots(shape, size) {
  const mask    = getShapeMask(shape, size);
  const dotSize = Math.max(2.5, size / 36);
  const gap     = dotSize * 1.75;
  const dots    = [];
  for (let row = 0; row * gap < size; row++) {
    for (let col = 0; col * gap < size; col++) {
      const tx = col * gap + gap / 2;
      const ty = row * gap + gap / 2;
      const px = Math.min(Math.floor(tx), size - 1);
      const py = Math.min(Math.floor(ty), size - 1);
      if (mask.data[(py * size + px) * 4 + 3] > 128) {
        const dx = (tx - size / 2) / (size / 2);
        const dy = (ty - size / 2) / (size / 2);
        const dist = Math.sqrt(dx * dx + dy * dy);
        const r = dotSize * (1 - dist * 0.35);
        if (r > 0.6) dots.push({ tx, ty, r });
      }
    }
  }
  return dots;
}

/* 도트 조립(in) / 흩어짐(out) 애니메이션
   reverse=true 면 완성 상태 → 바깥으로 흩어짐 (씬 전환 연속성용) */
function animateHalftone(canvas, shape, size, color, duration, delay, reverse) {
  color = color || '#111'; duration = duration || 1200; delay = delay || 0;
  canvas.width = size; canvas.height = size;
  canvas.style.width = size + 'px'; canvas.style.height = size + 'px';

  const ctx  = canvas.getContext('2d');
  const dots = buildDots(shape, size);
  const scatter = dots.map(() => ({
    x: (Math.random() - 0.5) * size * 3.2,
    y: (Math.random() - 0.5) * size * 3.2,
  }));

  let startTime = null, animId = null, cancelled = false;
  const easeOutExpo = t => (t === 1 ? 1 : 1 - Math.pow(2, -10 * t));
  const easeInExpo  = t => (t === 0 ? 0 : Math.pow(2, 10 * (t - 1)));

  function draw(ts) {
    if (cancelled) return;
    if (!startTime) startTime = ts;
    const t = Math.min((ts - startTime) / duration, 1);
    const e = reverse ? easeInExpo(t) : easeOutExpo(t);
    ctx.clearRect(0, 0, size, size);
    ctx.fillStyle = color;
    dots.forEach((dot, i) => {
      const sp = scatter[i];
      let cx, cy, r;
      if (reverse) {       // 형태 → 흩어짐, 크기 r → 0
        cx = dot.tx + (sp.x - dot.tx) * e;
        cy = dot.ty + (sp.y - dot.ty) * e;
        r  = dot.r * (1 - e);
      } else {             // 흩어짐 → 형태, 크기 0 → r
        cx = sp.x + (dot.tx - sp.x) * e;
        cy = sp.y + (dot.ty - sp.y) * e;
        r  = dot.r * e;
      }
      if (r < 0.3) return;
      ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill();
    });
    if (t < 1) animId = requestAnimationFrame(draw);
  }
  const tid = setTimeout(() => { animId = requestAnimationFrame(draw); }, delay);
  return () => { cancelled = true; clearTimeout(tid); if (animId) cancelAnimationFrame(animId); };
}

function drawHalftoneStatic(canvas, shape, size, color) {
  color = color || '#111';
  canvas.width = size; canvas.height = size;
  canvas.style.width = size + 'px'; canvas.style.height = size + 'px';
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = color;
  buildDots(shape, size).forEach(d => {
    ctx.beginPath(); ctx.arc(d.tx, d.ty, d.r, 0, Math.PI * 2); ctx.fill();
  });
}

/* ═══════════════════════════════════════════
   3. 인트로 — 3씬, 모션 연속성 개선
   씬1 도트 조립 → 도트 흩어지며 퇴장 → 씬2 카피+큰 로고 재조립
   → 씬3 로고 완성. 모든 타이머는 introExited 가드로 정리.
═══════════════════════════════════════════ */
(function initIntro() {
  const intro   = $('#introScreen');
  const wrapper = $('#siteWrapper');
  const sc1 = $('#scene1'), sc2 = $('#scene2'), sc3 = $('#scene3');
  if (!intro || !wrapper) return;

  let introExited = false;
  const timers  = [];
  const cancels = [];
  const later = (fn, ms) => { const id = setTimeout(() => { if (!introExited) fn(); }, ms); timers.push(id); return id; };

  function exitIntro() {
    if (introExited) return;
    introExited = true;
    timers.forEach(clearTimeout);
    cancels.forEach(c => { try { c(); } catch (e) {} });
    intro.style.transition = 'opacity 0.55s ease';
    intro.style.opacity = '0';
    intro.style.pointerEvents = 'none';
    wrapper.classList.add('visible');
    const heroTitle = $('.hero-title');
    if (heroTitle) requestAnimationFrame(() => heroTitle.classList.add('cr'));
    setTimeout(() => intro.remove(), 600);
    document.body.style.overflow = '';
  }
  window.__exitIntro = exitIntro;

  $('#introEnterBtn') && $('#introEnterBtn').addEventListener('click', exitIntro);
  $('#introSkip')     && $('#introSkip').addEventListener('click', exitIntro);

  /* 모션 최소화 환경 → 인트로 생략 */
  if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    exitIntro(); return;
  }

  document.body.style.overflow = 'hidden';

  /* ── 씬1: 아이콘들 도트 조립 (스태거) ── */
  const icons = $$('.ht-icon', sc1);
  icons.forEach((cv, i) => {
    const shape = cv.dataset.shape, size = parseInt(cv.dataset.size, 10) || 120;
    cancels.push(animateHalftone(cv, shape, size, cv.dataset.color || '#1F1B13', 1150, 90 * i));
  });

  /* ── 씬1 → 씬2: 도트가 '흩어지며' 퇴장 (모션 언어 유지) ── */
  later(() => {
    icons.forEach((cv, i) => {
      const shape = cv.dataset.shape, size = parseInt(cv.dataset.size, 10) || 120;
      cancels.push(animateHalftone(cv, shape, size, cv.dataset.color || '#1F1B13', 700, 55 * i, true));
    });
  }, 3200);

  later(() => {
    sc1.classList.add('fade-out');
    sc2.classList.remove('hidden');
    /* 씬2 큰 로고: 같은 도트 언어로 재조립 → 연속성 */
    const big = $('#sc2BigCanvas');
    if (big) cancels.push(animateHalftone(big, 'logo', parseInt(big.dataset.size, 10) || 500, big.dataset.color || '#FFC400', 1800, 180));
    /* 카피 순차 점등 */
    $$('.sc2-line', sc2).forEach((line, i) => later(() => line.classList.add('active'), 400 + i * 560));
  }, 4200);

  /* ── 씬2 → 씬3 ── */
  later(() => {
    const big = $('#sc2BigCanvas');
    if (big) cancels.push(animateHalftone(big, 'logo', parseInt(big.dataset.size, 10) || 500, big.dataset.color || '#FFC400', 700, 0, true));
  }, 8800);

  later(() => {
    sc2.classList.add('fade-out');
    sc3.classList.remove('hidden');
    const cv = $('#sc3Canvas');
    /* 씬3 로고: 짧게 재조립 후 정지 — 마무리 */
    if (cv) cancels.push(animateHalftone(cv, 'logo', parseInt(cv.dataset.size, 10) || 340, cv.dataset.color || '#FFC400', 1000, 140));
  }, 9700);

  /* 20초 폴백 */
  later(exitIntro, 20000);
})();

/* ═══════════════════════════════════════════
   4. 전역 상태 + 소켓
═══════════════════════════════════════════ */
const MOOD_LABEL = {
  happy: '😊 행복', excited: '🤩 신남', soso: '😶 그냥',
  sleepy: '😪 졸림', blue: '🌧 우울', love: '💛 설렘',
};
const MOOD_EMOJI = {
  happy: '😊', excited: '🤩', soso: '😶', sleepy: '😪', blue: '🌧', love: '💛',
};
const AVATAR_SPRITE = { A: 'pine', B: 'pineWink', C: 'pineCool', D: 'pineHappy' };
const REACTIONS = ['❤️', '👍', '😂', '😮', '😢', '🍍'];
const CAT_LABEL = { daily: '일상', study: '공부', music: '음악', hobby: '취미', info: '정보', club: '친목', etc: '기타', chat: '수다' };

const state = {
  nickname: localStorage.getItem('ananas_nickname') || '',
  avatar:   localStorage.getItem('ananas_avatar')   || 'A',
  profileImage: localStorage.getItem('ananas_profile') || '',   // 커스텀 프로필 사진(로컬 보관)
  mood:     localStorage.getItem('ananas_mood')     || 'happy',
  nicknameEsc: '',
  room: null, roomName: '', isHost: false,
  replyTarget: null,          // {id, user, text}
  pendingJoinCode: null,      // 파도타기/URL로 들어온 코드
  pendingAction: null,        // 'create' | 'join'
  lastMsgUser: null, lastMsgTime: 0, lastMsgDay: null,
  menuTargetId: null, menuTargetMine: false,
  searchOpen: false,
  publicRooms: [],
  typingUsers: new Set(),
  friends: new Set(),         // 친구 cid 집합
  onlineUsers: [],            // 현재 방의 접속자(친구추가 버튼용)
};
state.nicknameEsc = serverEscape(state.nickname);

/* ─── 프로필(아바타/사진) 렌더링 헬퍼 ─── */
function avatarMarkup(avatar, profileImage, scale) {
  if (profileImage && /^data:image\//.test(profileImage)) {
    return `<img class="av-photo" src="${profileImage}" alt="프로필" draggable="false">`;
  }
  return `<canvas class="px" data-sprite="${AVATAR_SPRITE[avatar] || 'pine'}" data-scale="${scale || 2}"></canvas>`;
}
/* 메시지 작성자의 현재 프로필 사진을 접속자 목록에서 조회(사진은 DB에 없음 → 라이브만) */
function profileImageOf(nick, fallbackAvatar, ownProfile) {
  if (nick === state.nicknameEsc && (ownProfile || state.profileImage)) return state.profileImage;
  const u = (state.onlineUsers || []).find(x => x.nickname === nick);
  return u && u.profileImage ? u.profileImage : '';
}

/* 내 사진을 96px 정사각으로 축소 + JPEG 재인코딩(EXIF·위치정보 제거) */
function processProfileImage(file) {
  return new Promise((resolve, reject) => {
    if (!file || !/^image\/(png|jpeg|webp)$/.test(file.type)) return reject('PNG·JPG·WEBP 이미지만 가능해요.');
    if (file.size > 12 * 1024 * 1024) return reject('파일이 너무 커요 (12MB 이하).');
    const fr = new FileReader();
    fr.onerror = () => reject('파일을 읽지 못했어요.');
    fr.onload = () => {
      const img = new Image();
      img.onerror = () => reject('이미지를 열 수 없어요.');
      img.onload = () => {
        const MAX = 200;   // 긴 변 기준 축소(크롭 없이 원본 비율 유지)
        const scale = Math.min(MAX / img.width, MAX / img.height, 1);
        const w = Math.max(1, Math.round(img.width * scale));
        const h = Math.max(1, Math.round(img.height * scale));
        const c = document.createElement('canvas');
        c.width = w; c.height = h;
        const ctx = c.getContext('2d');
        ctx.imageSmoothingQuality = 'high';
        ctx.fillStyle = '#FFFFFF';            // 투명 영역은 흰색으로(JPEG)
        ctx.fillRect(0, 0, w, h);
        ctx.drawImage(img, 0, 0, w, h);       // 원본 전체를 비율 그대로
        resolve(c.toDataURL('image/jpeg', 0.82)); // 재인코딩 → 메타데이터(EXIF/위치) 제거
      };
      img.src = fr.result;
    };
    fr.readAsDataURL(file);
  });
}
function applyProfilePreview() {
  const btn = document.getElementById('profileUploadBtn');
  if (!btn) return;
  if (state.profileImage) {
    btn.classList.add('has-img', 'active');
    btn.style.backgroundImage = `url(${state.profileImage})`;
  } else {
    btn.classList.remove('has-img', 'active');
    btn.style.backgroundImage = '';
  }
}

/* 영구 클라이언트 식별자(친구/파도타기용) — 계정 없이도 안정적 식별 */
function getClientId() {
  let cid = localStorage.getItem('ananas_cid');
  if (!cid || !/^[A-Za-z0-9-]{8,64}$/.test(cid)) {
    cid = (crypto.randomUUID ? crypto.randomUUID() : 'cid-' + Date.now() + '-' + Math.random().toString(36).slice(2, 10));
    localStorage.setItem('ananas_cid', cid);
  }
  return cid;
}
const CLIENT_ID = getClientId();

const socket = io({ transports: ['websocket', 'polling'] });

/* 접속 즉시 식별자 등록 */
socket.on('connect', () => socket.emit('hello', CLIENT_ID));
socket.on('friendList', list => { state.friends = new Set(Array.isArray(list) ? list : []); renderMembers(state.onlineUsers); });

/* ─── 관리자 모드 (관리자/사용자 분리) ─── */
function getAdminToken() { return localStorage.getItem('ananas_admin_token') || ''; }
function sendAdminAuth() { const t = getAdminToken(); if (t) socket.emit('adminAuth', t); }
socket.on('connect', sendAdminAuth);
/* URL ?admin=TOKEN 으로 1회 로그인 */
(function () {
  const t = new URLSearchParams(location.search).get('admin');
  if (t) { localStorage.setItem('ananas_admin_token', t); history.replaceState(null, '', location.pathname); }
})();
function adminLogin() {
  const t = prompt('관리자 토큰을 입력하세요');
  if (t == null) return;
  localStorage.setItem('ananas_admin_token', t.trim());
  socket.emit('adminAuth', t.trim());
}
function adminLogout() {
  localStorage.removeItem('ananas_admin_token');
  document.body.classList.remove('is-admin');
  showToast('관리자 모드를 해제했어요.');
}
window.adminLogin = adminLogin;
window.adminLogout = adminLogout;
let _adminTried = false;
socket.on('adminAuthResult', ({ ok, aiKeySet }) => {
  document.body.classList.toggle('is-admin', !!ok);
  if (ok) {
    updateAiKeyState(aiKeySet);
    if (_adminTried) showToast('🔑 관리자 모드 활성화', 'success');
  } else if (_adminTried) {
    showToast('관리자 토큰이 올바르지 않습니다.', 'error');
    localStorage.removeItem('ananas_admin_token');
  }
  _adminTried = false;
});
/* adminLogin이 부른 직후의 결과엔 토스트를 띄우기 위해 플래그 */
const _origAdminLogin = adminLogin;
window.adminLogin = function () { _adminTried = true; _origAdminLogin(); };

function updateAiKeyState(set) {
  const el = document.getElementById('aiKeyState');
  if (!el) return;
  el.textContent = set ? '● AI 활성화됨' : '○ 미설정';
  el.classList.toggle('on', !!set);
}
/* 관리자 AI 키 적용 */
document.getElementById('adminAiKeySave') && document.getElementById('adminAiKeySave').addEventListener('click', () => {
  const key = (document.getElementById('adminAiKeyInput').value || '').trim();
  socket.emit('adminSetAiKey', { token: getAdminToken(), key });
});
socket.on('adminAiKeyResult', ({ ok, aiKeySet, msg }) => {
  showToast(msg || (ok ? '적용됐어요' : '실패'), ok ? 'success' : 'error');
  if (ok) { updateAiKeyState(aiKeySet); const i = document.getElementById('adminAiKeyInput'); if (i) i.value = ''; }
});

socket.on('connect_error', () => { /* 폴링 폴백 자동 */ });

/* 서버 연결 상태 → 아지트 페이지 배너 */
function setConnBadge(connected) {
  const badge = document.getElementById('chatConnState');
  if (!badge) return;
  badge.classList.toggle('hidden', connected);
}
socket.on('connect', () => {
  const st = document.getElementById('roomsStatus');
  const txt = document.getElementById('roomsStatusText');
  if (st) st.classList.add('connected');
  if (txt) txt.textContent = '서버 연결됨 · 실시간 업데이트 중';
  setConnBadge(true);
  /* 채팅 중 끊겼다 복귀하면 현재 방으로 자동 재입장 (입장 메시지 없이) */
  if (state.room && state.nickname) {
    socket.emit('joinRoom', { nickname: state.nickname, code: state.room, avatar: state.avatar, mood: state.mood, profileImage: state.profileImage || '', silent: true });
  }
});
socket.on('disconnect', () => {
  const st = document.getElementById('roomsStatus');
  const txt = document.getElementById('roomsStatusText');
  if (st) st.classList.remove('connected');
  if (txt) txt.textContent = '서버와 연결이 끊겼습니다. 새로고침 해보세요.';
  setConnBadge(false);
});

socket.on('serverFull', msg => showToast(msg || '서버가 가득 찼습니다.', 'error'));
socket.on('errorMsg', msg => {
  showToast(msg, 'error');
  const btn = $('#createRoomBtn');
  if (btn) { btn.disabled = false; btn.textContent = '방 개설하기'; }
});

/* 방문 카운터 */
socket.on('visitStats', ({ today, total }) => {
  const t1 = $('#vcToday'), t2 = $('#vcTotal');
  if (t1) t1.textContent = Number(today).toLocaleString();
  if (t2) t2.textContent = Number(total).toLocaleString();
});

/* ═══════════════════════════════════════════
   5. 페이지 네비게이션 / 헤더 / 리빌
═══════════════════════════════════════════ */
function switchPage(name) {
  const next = $('#page-' + name);
  if (!next) return;
  const allPages = $$('.page');
  const cur = allPages.find(p => !p.classList.contains('hidden'));
  $$('.nav-btn').forEach(b => b.classList.toggle('active', b.dataset.page === name));
  /* 같은 페이지 재클릭 → 애니메이션 없이 맨 위로만 */
  if (cur === next) { window.scrollTo({ top: 0, behavior: 'smooth' }); return; }
  /* 항상 정확히 한 페이지만 표시: 나머지는 즉시 숨김(경합·빈 화면 방지) */
  allPages.forEach(p => {
    if (p !== next) { p.classList.add('hidden'); p.classList.remove('page-enter', 'page-exit'); }
  });
  next.classList.remove('hidden', 'page-exit', 'page-enter');
  void next.offsetWidth;
  next.classList.add('page-enter');
  next.addEventListener('animationend', () => next.classList.remove('page-enter'), { once: true });
  window.scrollTo({ top: 0, behavior: 'smooth' });
  if (name === 'rooms') socket.emit('requestRoomList');
}
window.switchPage = switchPage;

window.addEventListener('scroll', () => {
  const h = $('#siteHeader');
  if (h) h.classList.toggle('scrolled', window.scrollY > 8);
}, { passive: true });

/* 스크롤 리빌 (인라인 스타일 기반 — CSS 의존 없음) */
(function initReveal() {
  const targets = $$('.hg-card, .feat-card, .cg-step, .av-item, .tl-item, .room-card');
  if (!('IntersectionObserver' in window) || !targets.length) return;
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduced) return;
  targets.forEach(el => {
    el.style.opacity = '0';
    el.style.transform = 'translateY(18px)';
    el.style.transition = 'opacity 0.55s ease, transform 0.55s cubic-bezier(.22,1,.36,1)';
  });
  const io = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (e.isIntersecting) {
        e.target.style.opacity = '1';
        e.target.style.transform = 'none';
        io.unobserve(e.target);
      }
    });
  }, { threshold: 0.12 });
  targets.forEach(el => io.observe(el));
})();

/* ═══════════════════════════════════════════
   6. 히어로 라이브 데모 (레트로 메신저 창)
═══════════════════════════════════════════ */
(function initHeroDemo() {
  const body = $('#heroDemoBody');
  if (!body) return;
  const script = [
    { user: '파인', av: 'pine',      text: '얘들아 오늘 아지트 모임 어때? 🍍', mine: false },
    { user: '해피', av: 'pineHappy', text: '콜! 방명록에 글 남겨놨어 ㅎㅎ',   mine: false },
    { user: '쿨파', av: 'pineCool',  text: '파도타다가 옆 아지트 구경하고 옴ㅋㅋ', mine: false },
    { user: '윙크', av: 'pineWink',  text: '여기가 제일 아늑하지 😊',         mine: false, react: '❤️ 3' },
    { user: '해피', av: 'pineHappy', text: '그 시절 감성 그대로다…',          mine: false },
  ];
  let i = 0;
  function pushDemo() {
    if (i >= script.length) {
      setTimeout(() => { body.innerHTML = ''; i = 0; pushDemo(); }, 4200);
      return;
    }
    const m = script[i++];
    const el = document.createElement('div');
    el.className = 'demo-msg' + (m.mine ? ' mine' : '');
    el.innerHTML = `
      <span class="demo-av"><canvas class="px" data-sprite="${m.av}" data-scale="2"></canvas></span>
      <span>
        <span class="demo-name">${escHtml(m.user)}</span>
        <span class="demo-bub">${escHtml(m.text)}${m.react ? `<span class="demo-react">${m.react}</span>` : ''}</span>
      </span>`;
    body.appendChild(el);
    renderAllSprites(el);
    requestAnimationFrame(() => requestAnimationFrame(() => el.classList.add('show')));
    body.scrollTop = body.scrollHeight;
    setTimeout(pushDemo, 1500 + Math.random() * 700);
  }
  setTimeout(pushDemo, 1200);
})();

/* ═══════════════════════════════════════════
   7. 공개 아지트 목록 + 파도타기
═══════════════════════════════════════════ */
let roomFilter = 'all';

socket.on('roomList', list => {
  const myCid = localStorage.getItem('ananas_cid') || '';
  state.publicRooms = (Array.isArray(list) ? list : []).map(r => ({
    ...r,
    isCreator: r.isCreator || !!(myCid && r.creatorCid && r.creatorCid === myCid),
  }));
  renderRooms();
});

function renderRooms() {
  const grid = $('#roomsGrid'), empty = $('#roomsEmpty');
  if (!grid) return;
  $$('.room-list-item', grid).forEach(c => c.remove());
  const rooms = state.publicRooms.filter(r => roomFilter === 'all' || r.category === roomFilter);
  if (empty) empty.style.display = rooms.length ? 'none' : '';
  rooms.forEach(r => {
    const item = document.createElement('div');
    item.className = 'room-list-item' + (state.room === r.code ? ' active' : '');
    item.innerHTML = `
      <span class="rli-name" title="${escHtml(r.name)}">${escHtml(r.name)}</span>
      <span class="rli-users">👥${r.users}</span>
      ${r.isCreator ? `<span class="rli-host-badge">방장</span><button class="rli-del-btn" title="방 삭제">✕</button>` : ''}`;
    if (r.isCreator) {
      const delBtn = item.querySelector('.rli-del-btn');
      delBtn && delBtn.addEventListener('click', e => {
        e.stopPropagation();
        confirmDeleteRoom(r.code, r.name);
      });
    }
    item.addEventListener('click', () => quickJoin(r.code));
    grid.appendChild(item);
  });
}

function filterRooms(cat, btn) {
  roomFilter = cat;
  $$('.rf').forEach(b => b.classList.toggle('active', b === btn));
  renderRooms();
}

function confirmDeleteRoom(code, name) {
  if (!confirm(`"${name}" 방을 삭제할까요?\n삭제하면 모든 채팅 기록이 사라져요.`)) return;
  socket.emit('deleteRoom', { code });
}
socket.on('roomDeleteOk', ({ code }) => {
  state.publicRooms = state.publicRooms.filter(r => r.code !== code);
  renderRooms();
  showToast('방이 삭제됐어요.', 'success');
});
window.filterRooms = filterRooms;

/* 아지트 페이지 코드 직접 입장 */
function directJoin() {
  const inp = document.getElementById('directCodeInput');
  if (!inp) return;
  const code = (inp.value || '').toUpperCase().trim();
  if (code.length !== 6) { showToast('6자리 코드를 입력해주세요!', 'error'); inp.focus(); return; }
  inp.value = '';
  quickJoin(code);
}
window.directJoin = directJoin;

document.addEventListener('keydown', e => {
  const inp = document.getElementById('directCodeInput');
  if (inp && document.activeElement === inp && e.key === 'Enter') directJoin();
});


/* 코드로 빠른 입장: 프로필 있으면 즉시, 없으면 모달 */
function quickJoin(code) {
  state.pendingJoinCode = code;
  if (state.nickname) {
    joinRoom(code);
  } else {
    openModal();
    state.pendingAction = 'join';
  }
}

/* 파도타기 */
function doWave() {
  socket.emit('wave');
  showToast('🌊 파도를 타는 중…');
}
socket.on('waveResult', res => {
  if (!res || !res.found) {
    showToast('지금은 탈 수 있는 파도가 없어요. 직접 방을 열어보세요!', 'error');
    return;
  }
  const tag = res.byFriend ? '🤝 친구의 친구 방' : '🌊';
  showToast(`${tag} 「${decodeEnt(res.name)}」 에 도착!`, 'success');
  quickJoin(res.code);
});
$('#heroWaveBtn')  && $('#heroWaveBtn').addEventListener('click', doWave);
$('#roomsWaveBtn') && $('#roomsWaveBtn').addEventListener('click', doWave);

/* ═══════════════════════════════════════════
   8. 최근 방문 아지트
═══════════════════════════════════════════ */
function getRecent() {
  try { return JSON.parse(localStorage.getItem('ananas_recent') || '[]'); }
  catch (e) { return []; }
}
function saveRecentRoom(code, name) {
  let list = getRecent().filter(r => r.code !== code);
  list.unshift({ code, name, time: Date.now() });
  list = list.slice(0, 5);
  localStorage.setItem('ananas_recent', JSON.stringify(list));
  renderRecent();
}
function removeRecent(code) {
  const list = getRecent().filter(r => r.code !== code);
  localStorage.setItem('ananas_recent', JSON.stringify(list));
  renderRecent();
}
const RECENT_SPRITES = ['pine', 'pineWink', 'pineCool', 'pineHappy'];
function renderRecent() {
  const rec = getRecent();

  /* 프로필 페이지 대화 목록 */
  const histList = $('#chatHistoryList');
  const histEmpty = $('#chatHistoryEmpty');
  if (histList) {
    $$('.ch-room-card', histList).forEach(el => el.remove());
    if (histEmpty) histEmpty.style.display = rec.length ? 'none' : '';
    rec.forEach((r, i) => {
      const card = document.createElement('div');
      card.className = 'ch-room-card';
      card.innerHTML = `
        <span class="ch-av"><canvas class="px" data-sprite="${RECENT_SPRITES[i % RECENT_SPRITES.length]}" data-scale="2"></canvas></span>
        <span class="ch-info">
          <span class="ch-name">${escHtml(r.name)}</span>
          <span class="ch-code">코드 ${escHtml(r.code)}</span>
        </span>
        <span class="ch-btns">
          <button class="ch-del-btn">삭제</button>
          <button class="ch-enter-btn">입장 →</button>
        </span>`;
      card.querySelector('.ch-enter-btn').addEventListener('click', () => quickJoin(r.code));
      card.querySelector('.ch-del-btn').addEventListener('click', () => removeRecent(r.code));
      histList.appendChild(card);
    });
    renderAllSprites(histList);
  }
}
renderRecent();

/* ═══════════════════════════════════════════
   8-b. 내 채팅 목록 (카톡식) — 다시 입장 / 개설자 삭제
═══════════════════════════════════════════ */
function relTime(t) {
  const ts = Number(t);
  if (!t || isNaN(ts) || ts <= 0) return '—';
  const diff = Date.now() - ts;
  const m = Math.floor(diff / 60000);
  if (m < 1) return '방금';
  if (m < 60) return m + '분 전';
  const h = Math.floor(m / 60);
  if (h < 24) return h + '시간 전';
  const d = Math.floor(h / 24);
  if (d < 7) return d + '일 전';
  return new Date(ts).toLocaleDateString('ko-KR', { month: 'numeric', day: 'numeric' });
}
function openMyChats() {
  const screen = $('#myChatsScreen');
  if (!screen) return;
  screen.classList.remove('hidden');
  const rec = getRecent();
  if (!rec.length) { renderMyChats([]); return; }
  socket.emit('roomsInfo', { codes: rec.map(r => r.code) });
  /* 응답 전 임시로 기본 정보라도 표시 */
  renderMyChats(rec.map(r => ({ code: r.code, name: r.name, lastTime: r.time, lastText: '', users: 0, deleted: false, isCreator: false, _pending: true })));
}
function closeMyChats() { const s = $('#myChatsScreen'); if (s) s.classList.add('hidden'); }
window.openMyChats = openMyChats;
window.closeMyChats = closeMyChats;

function renderMyChats(infos) {
  const listEl = $('#myChatsList'), emptyEl = $('#myChatsEmpty');
  if (!listEl) return;
  const byCode = {};
  (infos || []).forEach(i => { byCode[i.code] = i; });

  /* 서버가 '삭제됨'으로 응답한 아지트는 최근목록에서 영구 제거 → 목록에서 완전히 사라짐 */
  const goneCodes = (infos || []).filter(i => i.deleted).map(i => i.code);
  if (goneCodes.length) {
    const pruned = getRecent().filter(r => !goneCodes.includes(r.code));
    localStorage.setItem('ananas_recent', JSON.stringify(pruned));
    renderRecent();
  }

  const rec = getRecent().filter(r => !goneCodes.includes(r.code));
  const rows = rec.map(r => ({ code: r.code, name: r.name, info: byCode[r.code] }));
  if (!rows.length) {
    listEl.innerHTML = '';
    emptyEl && emptyEl.classList.remove('hidden');
    return;
  }
  emptyEl && emptyEl.classList.add('hidden');
  listEl.innerHTML = rows.map(r => {
    const info = r.info || {};
    const name = escHtml(decodeEnt(r.name || info.name || '방'));
    const code = escHtml(r.code);
    const preview = info.lastText ? info.lastText : (info._pending ? '불러오는 중…' : '아직 대화가 없어요');
    const time = relTime(info.lastTime);
    const online = (info.users > 0) ? `<span class="mc-online">${info.users}명</span>` : '';
    const del = info.isCreator ? `<button class="mc-del" data-code="${code}" title="방 삭제">🗑</button>` : '';
    return `<div class="mc-row" data-code="${code}">
      <span class="mc-av"><canvas class="px" data-sprite="pine" data-scale="2"></canvas></span>
      <span class="mc-main">
        <span class="mc-top"><b class="mc-name">${name}</b><span class="mc-right"><span class="mc-time">${time}</span>${del}</span></span>
        <span class="mc-preview">${preview}${online}</span>
        <span class="mc-code">코드 ${code}</span>
      </span>
    </div>`;
  }).join('');
  renderAllSprites(listEl);
}

socket.on('roomsInfo', infos => { if (Array.isArray(infos)) renderMyChats(infos); });

/* 목록 클릭: 삭제 / 재입장 / 사라진 방 정리 */
$('#myChatsList') && $('#myChatsList').addEventListener('click', e => {
  const delBtn = e.target.closest('.mc-del');
  if (delBtn) {
    e.stopPropagation();
    const code = delBtn.dataset.code;
    if (confirm('이 방을 삭제할까요? 대화 기록도 함께 사라집니다.')) {
      socket.emit('deleteRoom', { code });
    }
    return;
  }
  const row = e.target.closest('.mc-row');
  if (!row) return;
  const code = row.dataset.code;
  if (row.dataset.gone === '1') { removeRecent(code); renderMyChats([]); return; }
  closeMyChats();
  quickJoin(code);
});
$('#myChatsClose') && $('#myChatsClose').addEventListener('click', closeMyChats);
$('#myChatsScreen') && $('#myChatsScreen').addEventListener('click', e => {
  if (e.target.id === 'myChatsScreen') closeMyChats();
});

/* 방 삭제 결과 동기화 */
socket.on('roomDeleteOk', ({ code }) => {
  removeRecent(code);
  showToast('방을 삭제했어요.', 'success');
  if (!$('#myChatsScreen').classList.contains('hidden')) openMyChats();
});
socket.on('roomDeleted', ({ code, reason }) => {
  removeRecent(code);
  if (state.room === code) {
    showToast(reason || '이 방이 삭제되었습니다.', 'error');
    exitChat(true);
  }
  if (!$('#myChatsScreen').classList.contains('hidden')) openMyChats();
});

/* ═══════════════════════════════════════════
   8-c. 백그라운드 새 메시지 알림 팝업
═══════════════════════════════════════════ */
function isChatForeground() {
  const app = $('#chatApp');
  return app && !app.classList.contains('hidden') && !document.hidden;
}
function showChatPopup(m) {
  const stack = $('#chatNotifyStack');
  if (!stack) return;
  const el = document.createElement('div');
  el.className = 'chat-notify';
  el.innerHTML = `
    <span class="cn-room">🍍 ${escHtml(decodeEnt(state.roomName || '방'))}</span>
    <span class="cn-msg"><b>${m.user}</b> ${m.isImage ? '(사진)' : m.text}</span>`;
  el.addEventListener('click', () => {
    if ($('#chatApp').classList.contains('hidden')) {
      resumeChat();
    }
    closeMyChats();
    scrollBottom();
    el.remove();
  });
  stack.appendChild(el);
  while (stack.children.length > 4) stack.firstChild.remove();
  setTimeout(() => { el.classList.add('cn-out'); setTimeout(() => el.remove(), 320); }, 4500);
}

/* ═══════════════════════════════════════════
   9. 모달 (프로필 → 만들기/참여 → 완료)
═══════════════════════════════════════════ */
const modal = $('#talkModal');

let _selectedPrfType = null; // 'main' | 'sub'

function renderProfileSelector() {
  const container = document.getElementById('psCards');
  const emptyEl   = document.getElementById('psEmpty');
  const nextBtn   = document.getElementById('toStep2Btn');
  if (!container) return;
  const profiles = [];
  ['main','sub'].forEach(t => {
    const raw = localStorage.getItem('ananas_' + t + '_profile');
    if (!raw) return;
    try { profiles.push({ type: t, ...JSON.parse(raw) }); } catch(e) {}
  });
  if (profiles.length === 0) {
    container.innerHTML = '';
    if (emptyEl) emptyEl.classList.remove('hidden');
    if (nextBtn) nextBtn.style.display = 'none';
    _selectedPrfType = null;
    return;
  }
  if (emptyEl) emptyEl.classList.add('hidden');
  const defaultSel = _selectedPrfType && profiles.find(p => p.type === _selectedPrfType) ? _selectedPrfType : profiles[0].type;
  _selectedPrfType = defaultSel;
  container.innerHTML = profiles.map(p => {
    const photo = localStorage.getItem('ananas_' + p.type + '_photo') || '';
    const avatarHtml = photo
      ? `<img src="${photo}" alt="">`
      : `<canvas class="px" data-sprite="pine" data-scale="3" style="width:100%;height:100%;object-fit:contain"></canvas>`;
    const label = p.type === 'main' ? '메인' : '서브';
    const sel = p.type === defaultSel ? 'selected' : '';
    return `<div class="ps-card ${sel}" data-type="${p.type}" onclick="selectPsCard(this,'${p.type}')">
      <span class="ps-card-badge">${label}</span>
      <div class="ps-avatar">${avatarHtml}</div>
      <div class="ps-nick">${p.nickname || '닉네임 없음'}</div>
      <div class="ps-mood">${MOOD_LABEL[p.mood] || ''}</div>
      <div class="ps-check">✓</div>
    </div>`;
  }).join('');
  if (nextBtn) nextBtn.style.display = '';
  /* 픽셀 스프라이트 재초기화 */
  setTimeout(() => { if (typeof initPixelSprites === 'function') initPixelSprites(); }, 50);
}

function selectPsCard(el, type) {
  document.querySelectorAll('.ps-card').forEach(c => c.classList.remove('selected'));
  el.classList.add('selected');
  _selectedPrfType = type;
}

function openModal() {
  if (!modal) return;
  modal.classList.remove('hidden');
  showStep(1);
  renderProfileSelector();
}

function goToStep2() {
  if (!_selectedPrfType) { showToast('프로필을 선택해주세요!', 'error'); return; }
  const raw = localStorage.getItem('ananas_' + _selectedPrfType + '_profile');
  if (raw) {
    try {
      const p = JSON.parse(raw);
      state.nickname     = p.nickname || '';
      state.nicknameEsc  = typeof serverEscape === 'function' ? serverEscape(state.nickname) : state.nickname;
      state.mood         = p.mood || 'happy';
      state.profileImage = p.profileImage || localStorage.getItem('ananas_' + _selectedPrfType + '_photo') || '';
      state.avatar       = p.avatar || 'A';
      localStorage.setItem('ananas_nickname', state.nickname);
      localStorage.setItem('ananas_mood',     state.mood);
    } catch(e) {}
  }
  if (state.pendingAction === 'join' && state.pendingJoinCode) {
    joinRoom(state.pendingJoinCode); return;
  }
  showStep(2);
  switchTab(state.pendingJoinCode ? 'join' : 'create');
  if (state.pendingJoinCode) { const rc = $('#roomCodeInput'); if (rc) rc.value = state.pendingJoinCode; }
}
window.goToStep2 = goToStep2;
window.selectPsCard = selectPsCard;
function closeModal() {
  modal && modal.classList.add('hidden');
  state.pendingAction = null;
}
function showStep(n) {
  [1, 2, 3].forEach(i => {
    const s = $('#step' + i);
    if (s) s.classList.toggle('hidden', i !== n);
  });
}
window.openModal = openModal;
$('#powerBtn')   && $('#powerBtn').addEventListener('click', openModal);
$('#modalClose') && $('#modalClose').addEventListener('click', closeModal);
modal && modal.addEventListener('click', e => { if (e.target === modal) closeModal(); });
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') { closeModal(); hideMsgMenu(); hideEmojiPop(); }
});

function selectAvatar(btn) {
  $$('.av-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  state.avatar = btn.dataset.emoji || 'A';
  /* 프리셋 선택 시 커스텀 사진 해제 */
  state.profileImage = '';
  localStorage.removeItem('ananas_profile');
  const up = document.getElementById('profileUploadBtn');
  if (up) { up.classList.remove('has-img', 'active'); up.style.backgroundImage = ''; }
}

/* 내 사진 올리기 (갤러리/폴더) */
(function initProfileUpload() {
  const btn = document.getElementById('profileUploadBtn');
  const input = document.getElementById('profileFileInput');
  if (!input) return;
  btn && btn.addEventListener('click', () => input.click());
  /* 채팅방 안에서도 미니프로필 사진을 눌러 변경 */
  const myAv = document.getElementById('myAvatarDisplay');
  myAv && myAv.addEventListener('click', () => input.click());
  input.addEventListener('change', async () => {
    const file = input.files && input.files[0];
    input.value = '';
    if (!file) return;
    try {
      const dataUrl = await processProfileImage(file);
      state.profileImage = dataUrl;
      state.avatar = 'IMG';
      localStorage.setItem('ananas_profile', dataUrl);
      localStorage.setItem('ananas_avatar', 'IMG');
      $$('.av-btn').forEach(b => b.classList.remove('active'));
      applyProfilePreview();
      if (myAv) myAv.innerHTML = avatarMarkup('IMG', dataUrl, 3);   // 채팅 미니프로필 즉시 반영
      if (state.room) socket.emit('setProfileImage', dataUrl);      // 방에 있으면 모두에게 갱신
      showToast('프로필 사진을 적용했어요 🔒', 'success');
    } catch (msg) {
      showToast(typeof msg === 'string' ? msg : '사진 적용 실패', 'error');
    }
  });
})();
function selectMood(btn) {
  $$('.mood-grid .mood').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  state.mood = btn.dataset.mood || 'happy';
}
function selectCat(btn) {
  $$('.cat').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
}
window.selectAvatar = selectAvatar;
window.selectMood   = selectMood;
window.selectCat    = selectCat;

function goToJoinStep() {
  if (!_selectedPrfType) { goToStep2(); return; }
  goToStep2();
  switchTab('join');
}
function goBack(from) { showStep(from - 1); }
function switchTab(tab) {
  $('#tabCreate').classList.toggle('active', tab === 'create');
  $('#tabJoin').classList.toggle('active', tab === 'join');
  $('#createPanel').classList.toggle('hidden', tab !== 'create');
  $('#joinPanel').classList.toggle('hidden', tab !== 'join');
}
function setRoomVis(vis) {
  const tog = document.getElementById('publicToggle');
  if (tog) tog.value = vis;
  document.getElementById('visBtnPublic')?.classList.toggle('active', vis === 'public');
  document.getElementById('visBtnPrivate')?.classList.toggle('active', vis === 'private');
}

window.goToJoinStep = goToJoinStep;
window.goBack = goBack;
window.switchTab = switchTab;
window.setRoomVis = setRoomVis;

/* 방 만들기 */
$('#createRoomBtn') && $('#createRoomBtn').addEventListener('click', () => {
  const btn = $('#createRoomBtn');
  if (btn.disabled) return;
  const roomName = ($('#roomNameInput').value || '').trim();
  if (!roomName) { showToast('방 이름을 입력해주세요!', 'error'); return; }
  const roomDesc = ($('#roomDescInput').value || '').trim();
  const catBtn   = $('.cat.active');
  btn.disabled = true;
  btn.textContent = '개설 중…';
  socket.emit('createRoom', {
    nickname: state.nickname, avatar: state.avatar, mood: state.mood,
    profileImage: state.profileImage || '',
    roomName, roomDesc,
    cid: CLIENT_ID,
    category: catBtn ? catBtn.dataset.cat : 'daily',
    isPublic: ($('#publicToggle') && $('#publicToggle').value) !== 'private',
  });
  setTimeout(() => { btn.disabled = false; btn.textContent = '방 개설하기'; }, 5000);
});

/* 코드 참여 */
$('#joinRoomBtn') && $('#joinRoomBtn').addEventListener('click', () => {
  const code = ($('#roomCodeInput').value || '').toUpperCase().trim();
  if (code.length !== 6) { showToast('6자리 초대 코드를 입력해주세요!', 'error'); return; }
  joinRoom(code);
});
$('#roomCodeInput') && $('#roomCodeInput').addEventListener('keydown', e => {
  if (e.key === 'Enter') $('#joinRoomBtn').click();
});


function joinRoom(code) {
  socket.emit('joinRoom', {
    nickname: state.nickname, avatar: state.avatar, mood: state.mood, code,
    profileImage: state.profileImage || '',
  });
}

/* 서버 응답 */
socket.on('roomCreated', ({ code, roomName, isHost }) => {
  const btn = $('#createRoomBtn');
  if (btn) { btn.disabled = false; btn.textContent = '방 개설하기'; }
  state.room = code; state.roomName = roomName; state.isHost = !!isHost;
  $('#createdRoomNameDisplay').textContent = `「${decodeEnt(roomName)}」`;
  $('#inviteCodeDisplay').textContent = code;
  $('#inviteLinkDisplay').textContent = `${location.origin}/?room=${code}`;
  showStep(3);
  saveRecentRoom(code, decodeEnt(roomName));
});
socket.on('roomJoined', ({ code, roomName, isHost }) => {
  state.room = code; state.roomName = roomName; state.isHost = !!isHost;
  saveRecentRoom(code, decodeEnt(roomName));
  closeModal();
  launchChatApp();
});
socket.on('joinError', msg => showToast(msg, 'error'));
socket.on('hostGranted', () => {
  state.isHost = true;
  showToast('👑 방장이 되었어요!', 'success');
});

function decodeEnt(s) {
  const el = document.createElement('textarea');
  el.innerHTML = String(s);
  return el.value;
}

$('#enterRoomBtn') && $('#enterRoomBtn').addEventListener('click', () => {
  closeModal(); launchChatApp();
});

function copyText(txt, label) {
  (navigator.clipboard ? navigator.clipboard.writeText(txt) : Promise.reject())
    .then(() => showToast(`${label} 복사 완료!`, 'success'))
    .catch(() => {
      const ta = document.createElement('textarea');
      ta.value = txt; document.body.appendChild(ta);
      ta.select(); document.execCommand('copy'); ta.remove();
      showToast(`${label} 복사 완료!`, 'success');
    });
}
window.copyText = copyText;
function copyCode() { copyText($('#inviteCodeDisplay').textContent.trim(), '초대 코드'); }
function copyLink() { copyText($('#inviteLinkDisplay').textContent.trim(), '초대 링크'); }
window.copyCode = copyCode;
window.copyLink = copyLink;

/* ═══════════════════════════════════════════
   10. 채팅앱 진입/퇴장
═══════════════════════════════════════════ */

/* BGM */
const bgmAudio = new Audio('/sounds/bgm.mp3');
bgmAudio.loop = true;
bgmAudio.volume = 0.35;
let bgmOn = true;

function startBgm() {
  bgmOn = true;
  bgmAudio.currentTime = 0;
  bgmAudio.play().catch(() => {});
  const btn = $('#bgmToggleBtn');
  if (btn) { btn.textContent = '🔊'; btn.classList.remove('muted'); btn.title = '음악 끄기'; }
}
function stopBgm() {
  bgmOn = false;
  bgmAudio.pause();
  const btn = $('#bgmToggleBtn');
  if (btn) { btn.textContent = '🔇'; btn.classList.add('muted'); btn.title = '음악 켜기'; }
}
function toggleBgm() {
  bgmOn ? stopBgm() : startBgm();
}
window.toggleBgm = toggleBgm;

function launchChatApp() {
  /* 방목록 페이지로 이동 후 채팅 패널 표시 */
  switchPage('rooms');
  const app = $('#chatApp');
  app.classList.remove('hidden');
  const noRoom = $('#roomsNoRoom');
  if (noRoom) noRoom.style.display = 'none';
  /* 멤버 팝업 닫힌 상태로 시작 */
  const sb = $('#chatSb');
  if (sb) sb.classList.add('hidden');
  startBgm();

  /* 내 프로필 */
  $('#myNicknameDisplay').textContent = state.nickname;
  const tabName = $('#myTabName'); if (tabName) tabName.textContent = state.nickname || '멤버';
  const avBox = $('#myAvatarDisplay');
  avBox.innerHTML = avatarMarkup(state.avatar, state.profileImage, 3);
  $('#myMoodBtn').textContent = MOOD_LABEL[state.mood] || MOOD_LABEL.happy;

  /* 방 정보 */
  const rn = decodeEnt(state.roomName);
  const crd = $('#currentRoomDisplay'); if (crd) crd.textContent = rn;
  const ccd = $('#currentCodeDisplay'); if (ccd) ccd.textContent = '코드: ' + state.room;
  $('#chatRoomTitle').textContent = rn;
  const codeEl = $('#chatRoomCode');
  if (codeEl) {
    codeEl.textContent = state.room;
    codeEl.title = '클릭해서 코드 복사';
    codeEl.onclick = () => copyText(state.room, '방 코드');
  }

  /* 초기화 */
  resetMessagesView();
  $('#gbList').innerHTML = '<p class="gb-empty">아직 방명록이 비어 있어요.<br>첫 흔적을 남겨보세요!</p>';
  switchSbTab('members');
  renderAllSprites(app);
  $('#msgInput').focus();
  if (state.room) applySavedChatBg(state.room);
}

function resetMessagesView() {
  const area = $('#messagesArea');
  $$('.msg-row, .sys-msg, .date-divider', area).forEach(el => el.remove());
  $('#messagesEmpty').style.display = '';
  state.lastMsgUser = null; state.lastMsgTime = 0; state.lastMsgDay = null;
  state.replyTarget = null;
  hideReplyPreview();
  $('#noticeBar').classList.add('hidden');
  $('#typingBar').textContent = '';
  state.typingUsers.clear();
  $('#newMsgJump').classList.add('hidden');
}

/* 완전히 나가기: 서버에서 퇴장(비면 방 삭제) */
function exitChat(toHome) {
  stopBgm();
  socket.emit('leaveRoom');
  state.room = null; state.roomName = ''; state.isHost = false;
  $('#chatApp').classList.add('hidden');
  const noRoom = $('#roomsNoRoom');
  if (noRoom) noRoom.style.display = '';
  const sb = $('#chatSb');
  if (sb) sb.classList.add('hidden');
  if (toHome) switchPage('home');
  renderRecent();
}
/* 나가지 않고 홈으로(채팅 세션 유지 → 백그라운드 알림 동작) */
function goHomeKeepChat() {
  if (!state.room) return exitChat(true);
  stopBgm();
  switchPage('home');
}
function resumeChat() {
  if (!state.room) return;
  switchPage('rooms');
  $('#chatApp').classList.remove('hidden');
  const noRoom = $('#roomsNoRoom');
  if (noRoom) noRoom.style.display = 'none';
  scrollBottom();
}

/* 멤버 팝업 토글 (≡ 햄버거 버튼) */
function toggleChatSb() {
  const sb = $('#chatSb');
  if (!sb) return;
  sb.style.bottom = '0';
  sb.classList.toggle('hidden');
}
window.toggleChatSb = toggleChatSb;

/* 나가기 확인 팝업 */
function showLeaveConfirm() {
  const el = $('#leaveConfirm'); if (!el) return;
  el.classList.remove('hidden');
  renderAllSprites(el);
}
function hideLeaveConfirm() { $('#leaveConfirm') && $('#leaveConfirm').classList.add('hidden'); }
$('#chatLogoutBtn') && $('#chatLogoutBtn').addEventListener('click', showLeaveConfirm);
$('#leaveYes') && $('#leaveYes').addEventListener('click', () => { hideLeaveConfirm(); exitChat(true); });
$('#leaveNo')  && $('#leaveNo').addEventListener('click',  () => { hideLeaveConfirm(); goHomeKeepChat(); });
$('#leaveConfirm') && $('#leaveConfirm').addEventListener('click', e => { if (e.target.id === 'leaveConfirm') hideLeaveConfirm(); });
$('#leaveConfirm') && $('#leaveConfirm').querySelector('.rw-x') && $('#leaveConfirm').querySelector('.rw-x').addEventListener('click', hideLeaveConfirm);
/* 홈으로 버튼 = 채팅 유지하며 홈 이동 */
$('#toHomeBtn') && $('#toHomeBtn').addEventListener('click', goHomeKeepChat);

$('#shareInviteBtn') && $('#shareInviteBtn').addEventListener('click', () => {
  copyText(`${location.origin}/?room=${state.room}`, '초대 링크');
});
$('#showCodeBtn') && $('#showCodeBtn').addEventListener('click', () => {
  copyText(state.room || '', '초대 코드');
});

/* 사이드바 탭 */
function switchSbTab(tab) {
  $('#tabMembers').classList.toggle('active', tab === 'members');
  $('#tabGuestbook').classList.toggle('active', tab === 'guestbook');
  $('#membersPanel').classList.toggle('hidden', tab !== 'members');
  $('#guestbookPanel').classList.toggle('hidden', tab !== 'guestbook');
}
window.switchSbTab = switchSbTab;

/* 기분 변경 팝업 */
(function initMoodPop() {
  const btn = $('#myMoodBtn'), pop = $('#moodPop');
  if (!btn || !pop) return;
  pop.innerHTML = Object.keys(MOOD_LABEL).map(m =>
    `<button class="mood" data-mood="${m}">${MOOD_LABEL[m]}</button>`).join('');
  btn.addEventListener('click', e => {
    e.stopPropagation();
    pop.classList.toggle('hidden');
  });
  pop.addEventListener('click', e => {
    const b = e.target.closest('.mood');
    if (!b) return;
    state.mood = b.dataset.mood;
    localStorage.setItem('ananas_mood', state.mood);
    btn.textContent = MOOD_LABEL[state.mood];
    socket.emit('setMood', state.mood);
    pop.classList.add('hidden');
  });
  document.addEventListener('click', () => pop.classList.add('hidden'));
})();

/* 접속자 목록 */
function memberAvatarHtml(photo, avatar) {
  if (photo && /^data:image\//.test(photo)) {
    return `<img class="av-photo" src="${photo}" alt="프로필" draggable="false">`;
  }
  return `<canvas class="px" data-sprite="${AVATAR_SPRITE[avatar] || 'pine'}" data-scale="2"></canvas>`;
}

function renderMembers(users) {
  if (!Array.isArray(users)) return;
  const panel = $('#membersPanel');
  if (!panel) return;
  panel.innerHTML = users.map(u => {
    const isMe     = u.cid && u.cid === CLIENT_ID;
    const isFriend = u.cid && state.friends.has(u.cid);
    const photo    = isMe ? state.profileImage : u.profileImage;
    let action = '';
    if (u.cid && !isMe) {
      action = isFriend
        ? `<span class="member-friend" title="이미 친구예요">🤝 친구</span>`
        : `<button class="member-add" data-cid="${u.cid}" title="친구 추가">+ 친구</button>`;
    }
    return `
    <div class="member-row">
      <span class="member-av">${memberAvatarHtml(photo, u.avatar)}</span>
      <span class="member-name">${u.nickname}${u.isHost ? ' <span class="host-badge">👑</span>' : ''}${isMe ? ' <span class="member-me">나</span>' : ''}</span>
      <span class="member-mood">${MOOD_EMOJI[u.mood] || '😊'}</span>
      ${action}
    </div>`;
  }).join('');
  renderAllSprites(panel);
}

socket.on('onlineUsers', users => {
  if (!Array.isArray(users)) return;
  state.onlineUsers = users;
  const n = users.length;
  const oc = $('#onlineCount'); if (oc) oc.textContent = `${n}명 접속`;
  const ocb = $('#chatOnlineCount'); if (ocb) ocb.textContent = `${n}`;
  const mc = $('#memberCnt'); if (mc) mc.textContent = n;
  /* 로스터가 없으면 onlineUsers로 렌더 */
  if (!state.memberRoster || state.memberRoster.length === 0) renderRoster(users.map(u => ({ ...u, online: true })));
  const banner = $('#aloneInviteBanner');
  if (banner) banner.classList.toggle('hidden', n > 1);
});

socket.on('memberRoster', roster => {
  if (!Array.isArray(roster)) return;
  state.memberRoster = roster;
  /* 로컬스토리지에 방별 로스터 저장 */
  if (state.room) localStorage.setItem('ananas_roster_' + state.room, JSON.stringify(roster));
  renderRoster(roster);
});

function renderRoster(roster) {
  const panel = $('#membersPanel');
  if (!panel) return;
  const myCid = typeof state !== 'undefined' ? (state.cid || '') : '';
  panel.innerHTML = roster.map(u => {
    const isMe = u.cid && u.cid === myCid;
    const isOnline = u.online !== false;
    const effectivePhoto = isMe ? (state.profileImage || u.profileImage) : u.profileImage;
    const photoHtml = memberAvatarHtml(effectivePhoto, u.avatar);
    return `<div class="roster-item">
      <div class="roster-av">${photoHtml}<span class="roster-dot ${isOnline ? 'online' : 'offline'}"></span></div>
      <div class="roster-info">
        <div class="roster-nick">${escHtml(u.nickname || '—')}${isMe ? ' <span style="font-size:.62rem;color:var(--gray)">(나)</span>' : ''}</div>
        <div class="roster-badges">
          ${u.isHost ? '<span class="roster-host-badge">👑 방장</span>' : ''}
          ${!isOnline ? '<span class="roster-offline-label">오프라인</span>' : ''}
        </div>
      </div>
    </div>`;
  }).join('');
}

/* ── 방 내 설정 패널 ── */
function openChatSettings() {
  const panel = document.getElementById('chatRoomSettings');
  if (!panel) return;
  panel.classList.remove('hidden');
  updateBgmStatus();
}
function closeChatSettings() {
  const panel = document.getElementById('chatRoomSettings');
  if (panel) panel.classList.add('hidden');
}
/* 하위 호환 — 기존 openChatBgPicker 호출부 대응 */
function openChatBgPicker() { openChatSettings(); }

/* ── 채팅 배경 ── */
function _bgEls() {
  return {
    area: document.getElementById('messagesArea'),
    main: document.querySelector('.chat-main'),
  };
}
function setChatBg(color) {
  const { area, main } = _bgEls();
  if (!area) return;
  if (!color) {
    area.style.background = '';
    if (main) main.style.background = '';
    if (state.room) localStorage.removeItem('ananas_chatbg_' + state.room);
    showToast('배경을 초기화했어요.', 'success');
  } else {
    area.style.background = color;
    if (main) main.style.background = color;   // typing-bar 틈까지 같은 색
    if (state.room) localStorage.setItem('ananas_chatbg_' + state.room, JSON.stringify({ type: 'color', value: color }));
    showToast('배경색이 변경됐어요!', 'success');
  }
}
function setChatBgImg(input) {
  const file = input.files[0]; if (!file) return;
  input.value = '';
  const reader = new FileReader();
  reader.onload = e => {
    const { area, main } = _bgEls();
    if (!area) return;
    area.style.background = `url(${e.target.result}) center/cover no-repeat`;
    if (main) main.style.background = '#111';   // 이미지 외 영역 어둡게
    if (state.room) localStorage.setItem('ananas_chatbg_' + state.room, JSON.stringify({ type: 'image', value: e.target.result }));
    showToast('배경 이미지가 설정됐어요!', 'success');
  };
  reader.readAsDataURL(file);
}
function applySavedChatBg(code) {
  const raw = localStorage.getItem('ananas_chatbg_' + code);
  const { area, main } = _bgEls();
  if (!area) return;
  if (!raw) { area.style.background = ''; if (main) main.style.background = ''; return; }
  try {
    const bg = JSON.parse(raw);
    if (bg.type === 'color') {
      area.style.background = bg.value;
      if (main) main.style.background = bg.value;
    } else if (bg.type === 'image') {
      area.style.background = `url(${bg.value}) center/cover no-repeat`;
      if (main) main.style.background = '#111';
    }
  } catch(e) {}
}

/* BGM — 커스텀 음악 파일 */
let _customBgmUrl = null;
function setCustomBgm(input) {
  const file = input.files[0]; if (!file) return;
  input.value = '';
  if (_customBgmUrl) URL.revokeObjectURL(_customBgmUrl);
  _customBgmUrl = URL.createObjectURL(file);
  const wasPlaying = !bgmAudio.paused;
  bgmAudio.src = _customBgmUrl;
  bgmAudio.load();
  if (wasPlaying) bgmAudio.play().catch(() => {});
  localStorage.setItem('ananas_custom_bgm_name', file.name);
  updateBgmStatus();
  showToast(`🎵 "${file.name}" 로 음악이 바뀌었어요!`, 'success');
}
function resetBgm() {
  if (_customBgmUrl) { URL.revokeObjectURL(_customBgmUrl); _customBgmUrl = null; }
  localStorage.removeItem('ananas_custom_bgm_name');
  const wasPlaying = !bgmAudio.paused;
  bgmAudio.src = '/sounds/bgm.mp3';
  bgmAudio.load();
  if (wasPlaying) bgmAudio.play().catch(() => {});
  updateBgmStatus();
  showToast('기본 음악으로 돌아왔어요!', 'success');
}
function updateBgmStatus() {
  const el = document.getElementById('crsBgmStatus');
  if (!el) return;
  const name = localStorage.getItem('ananas_custom_bgm_name');
  el.textContent = name ? `🎵 ${name}` : '기본 음악 사용 중';
}

/* ── 친구 초대 모달 ── */
function openRoomInviteModal() {
  if (!state.room) return;
  let modal = document.getElementById('roomInviteModal');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'roomInviteModal';
    modal.className = 'rim-overlay';
    modal.innerHTML = `
      <div class="rim-box retro-window">
        <div class="rw-titlebar">
          <span class="rw-title">🤝 친구 초대</span>
          <button class="rw-x rw-x-btn" onclick="closeRoomInviteModal()"></button>
        </div>
        <div class="rim-body" id="rimBody"></div>
      </div>`;
    modal.addEventListener('click', e => { if (e.target === modal) closeRoomInviteModal(); });
    document.body.appendChild(modal);
  }
  const friends = getFriends();
  const body = document.getElementById('rimBody');
  if (!friends.length) {
    body.innerHTML = '<p class="rim-empty">아직 친구가 없어요.<br>프로필 페이지에서 친구를 추가해보세요!</p>';
  } else {
    body.innerHTML = friends.map((f, i) => `
      <div class="rim-item">
        <div class="rim-av">${f.photo ? `<img src="${f.photo}" style="width:100%;height:100%;object-fit:cover;border-radius:50%">` : '<span>👤</span>'}</div>
        <span class="rim-nick">${escHtml(f.alias || f.nickname || '친구')}</span>
        <button class="rim-invite-btn" onclick="sendRoomInvite('${escHtml(f.cid)}','${escHtml(f.alias || f.nickname || '친구')}',this)">초대</button>
      </div>`).join('');
  }
  modal.classList.remove('hidden');
}
function closeRoomInviteModal() {
  const m = document.getElementById('roomInviteModal');
  if (m) m.classList.add('hidden');
}
function sendRoomInvite(targetCid, targetNick, btn) {
  if (!state.room) return;
  socket.emit('sendRoomInvite', {
    targetCid,
    roomCode: state.room,
    roomName: state.roomName || state.room,
  });
  if (btn) { btn.textContent = '전송됨'; btn.disabled = true; }
  showToast(`${targetNick}님께 초대를 보냈어요!`, 'success');
}
socket.on('roomInviteSent', ({ sent }) => {
  if (!sent) showToast('친구가 현재 오프라인이에요.', 'error');
});
socket.on('roomInvite', ({ fromNickname, roomCode, roomName }) => {
  showRoomInvitePopup(fromNickname, roomCode, roomName);
});
function showRoomInvitePopup(fromNickname, roomCode, roomName) {
  let pop = document.getElementById('roomInvitePop');
  if (pop) pop.remove();
  pop = document.createElement('div');
  pop.id = 'roomInvitePop';
  pop.className = 'rip-overlay';
  pop.innerHTML = `
    <div class="rip-box retro-window">
      <div class="rw-titlebar"><span class="rw-title">📨 방 초대</span></div>
      <div class="rip-body">
        <div class="rip-icon">🍍</div>
        <p class="rip-msg"><b>${escHtml(fromNickname)}</b>님이<br><b>「${escHtml(roomName)}」</b> 방으로<br>초대했습니다.</p>
        <p class="rip-sub">방에 접속하시겠습니까?</p>
        <div class="rip-btns">
          <button class="rip-accept" onclick="acceptRoomInvite('${escHtml(roomCode)}')">✅ 수락</button>
          <button class="rip-decline" onclick="document.getElementById('roomInvitePop').remove()">❌ 거절</button>
        </div>
      </div>
    </div>`;
  document.body.appendChild(pop);
}
function acceptRoomInvite(roomCode) {
  const pop = document.getElementById('roomInvitePop');
  if (pop) pop.remove();
  /* 이미 방 안에 있으면 먼저 나가기 */
  if (state.room) socket.emit('leaveRoom');
  /* 현재 적용된 프로필로 입장 */
  const nickname = state.nickname || localStorage.getItem('ananas_nickname') || '익명';
  const avatar   = state.avatar   || localStorage.getItem('ananas_avatar')   || 'A';
  const cid      = localStorage.getItem('ananas_cid') || '';
  socket.emit('joinRoom', { code: roomCode, nickname, avatar, cid });
}
window.openRoomInviteModal  = openRoomInviteModal;
window.closeRoomInviteModal = closeRoomInviteModal;
window.sendRoomInvite       = sendRoomInvite;
window.acceptRoomInvite     = acceptRoomInvite;

window.openChatSettings = openChatSettings;
window.closeChatSettings = closeChatSettings;
window.openChatBgPicker = openChatBgPicker;
window.setChatBg = setChatBg;
window.setChatBgImg = setChatBgImg;
window.setCustomBgm = setCustomBgm;
window.resetBgm = resetBgm;

/* 친구 추가 (이벤트 위임) */
$('#membersPanel') && $('#membersPanel').addEventListener('click', e => {
  const btn = e.target.closest('.member-add');
  if (!btn) return;
  const targetCid = btn.dataset.cid;
  if (targetCid) socket.emit('addFriend', { targetCid });
});

/* ═══════════════════════════════════════════
   11. 메시지 렌더링
═══════════════════════════════════════════ */
const msgArea = $('#messagesArea');

function isNearBottom() {
  return msgArea.scrollHeight - msgArea.scrollTop - msgArea.clientHeight < 90;
}
function scrollBottom() {
  msgArea.scrollTop = msgArea.scrollHeight;
}

socket.on('messageHistory', list => {
  if (!Array.isArray(list)) return;
  list.forEach(m => renderMessage(m, true));
  scrollBottom();
});

socket.on('message', m => {
  const nearBottom = isNearBottom();
  const mine = renderMessage(m, false);
  if (mine || nearBottom) scrollBottom();
  else if (m.user !== 'system') $('#newMsgJump').classList.remove('hidden');
  if (!mine && m.user !== 'system') {
    playBeep();
    /* 방을 안 보고 있을 때(다른 탭·홈 화면 등) 작은 알림 팝업 */
    if (!isChatForeground()) showChatPopup(m);
  }
});

$('#newMsgJump') && $('#newMsgJump').addEventListener('click', () => {
  scrollBottom();
  $('#newMsgJump').classList.add('hidden');
});
msgArea && msgArea.addEventListener('scroll', () => {
  if (isNearBottom()) $('#newMsgJump').classList.add('hidden');
}, { passive: true });

/* 메시지 1건 렌더 — 반환값: 내 메시지 여부 */
function renderMessage(m, isHistory) {
  if (!m) return false;
  /* 중복 렌더 방지(재연결·히스토리 재수신 대비) */
  if (m.id && msgArea.querySelector(`[data-msg-id="${m.id}"]`)) return false;
  $('#messagesEmpty').style.display = 'none';

  /* 날짜 구분선 */
  const dk = dayKey(m.time);
  if (dk !== state.lastMsgDay) {
    const dd = document.createElement('div');
    dd.className = 'date-divider';
    dd.textContent = fmtDate(m.time);
    msgArea.appendChild(dd);
    state.lastMsgDay = dk;
    state.lastMsgUser = null;
  }

  /* 시스템 메시지 */
  if (m.user === 'system') {
    const el = document.createElement('div');
    el.className = 'sys-msg';
    el.innerHTML = m.text;            // 서버에서 escape 됨
    msgArea.appendChild(el);
    state.lastMsgUser = null;
    return false;
  }

  const mine = m.user === state.nicknameEsc;
  const grouped = state.lastMsgUser === m.user && (m.time - state.lastMsgTime) < 3 * 60 * 1000;
  state.lastMsgUser = m.user;
  state.lastMsgTime = m.time;

  const row = document.createElement('div');
  row.className = 'msg-row' + (mine ? ' mine' : '') + (grouped ? ' grouped' : '');
  row.dataset.msgId = m.id || '';
  row.dataset.user  = m.user;

  const body = m.isImage
    ? `<img src="${m.text}" alt="공유한 사진" loading="lazy" class="chat-media-img">`
    : m.isSticker
    ? `<span class="chat-sticker">${m.text}</span>`
    : m.text;
  const quote = m.replyTo
    ? `<span class="msg-reply-quote"><b>↩ ${m.replyTo.user}</b>${m.replyTo.text}</span>`
    : '';
  const bubbleCls = m.isImage ? ' has-img' : m.isSticker ? ' has-sticker' : '';

  row.innerHTML = `
    ${!mine ? `<span class="msg-av${grouped ? ' ghost' : ''}">${avatarMarkup(m.avatar, profileImageOf(m.user, m.avatar), 2)}</span>` : ''}
    <div class="msg-col">
      ${!grouped && !mine ? `<span class="msg-user">${m.user} <small>${MOOD_EMOJI[m.mood] || ''}</small></span>` : ''}
      <div class="msg-line">
        <div class="msg-bubble${bubbleCls}" data-raw="${m.isImage || m.isSticker ? '' : encodeURIComponent(m.text)}">${quote}${body}</div>
        <span class="msg-time">${fmtTime(m.time)}</span>
      </div>
      <div class="msg-reacts"></div>
    </div>`;

  msgArea.appendChild(row);
  renderAllSprites(row);

  if (m.reactions && Object.keys(m.reactions).length) {
    updateReactions(m.id, m.reactions);
  }

  /* 버블 클릭 → 이미지/영상은 뷰어, 텍스트는 컨텍스트 메뉴 */
  const bubble = $('.msg-bubble', row);
  if (m.isImage) {
    const img = bubble.querySelector('.chat-media-img');
    if (img) {
      // 클릭 → 항상 뷰어로 열기 (내 사진 포함)
      img.style.cursor = 'zoom-in';
      img.addEventListener('click', e => { e.stopPropagation(); openMediaViewer(m.text, 'image'); });
      // 우클릭·길게 누르기 → 메뉴
      img.addEventListener('contextmenu', e => { e.preventDefault(); e.stopPropagation(); openMsgMenu(e, m.id, mine, m.user, '(사진)'); });
      let pressTimer = null;
      img.addEventListener('touchstart', () => { pressTimer = setTimeout(() => openMsgMenu({ clientX: 0, clientY: 0 }, m.id, mine, m.user, '(사진)'), 600); }, { passive: true });
      img.addEventListener('touchend',   () => clearTimeout(pressTimer));
      img.addEventListener('touchmove',  () => clearTimeout(pressTimer));
    }
  }
  bubble.addEventListener('click', e => {
    if (bubble.classList.contains('deleted')) return;
    if (m.isImage) return;
    e.stopPropagation();
    openMsgMenu(e, m.id, mine, m.user, decodeEnt(m.text));
  });

  /* 검색 열려 있으면 즉시 필터 적용 */
  if (state.searchOpen) applySearch($('#searchInput').value);
  return mine;
}

/* ─── 공감(리액션) ─── */
socket.on('reactionUpdate', ({ msgId, reactions }) => updateReactions(msgId, reactions));

function updateReactions(msgId, reactions) {
  const row = $(`.msg-row[data-msg-id="${msgId}"]`);
  if (!row) return;
  const box = $('.msg-reacts', row);
  box.innerHTML = '';
  Object.entries(reactions || {}).forEach(([emoji, users]) => {
    if (!users || !users.length) return;
    const chip = document.createElement('button');
    chip.className = 'react-chip' + (users.includes(state.nicknameEsc) ? ' on' : '');
    chip.innerHTML = `${emoji} <b>${users.length}</b>`;
    chip.title = users.map(decodeEnt).join(', ');
    chip.addEventListener('click', e => {
      e.stopPropagation();
      socket.emit('reactMessage', { msgId, emoji });
    });
    box.appendChild(chip);
  });
}

/* ─── 삭제 ─── */
socket.on('messageDeleted', ({ msgId }) => {
  const row = $(`.msg-row[data-msg-id="${msgId}"]`);
  if (!row) return;
  const bubble = $('.msg-bubble', row);
  bubble.classList.add('deleted');
  bubble.innerHTML = '';
  $('.msg-reacts', row).innerHTML = '';
});

/* ─── 컨텍스트 메뉴 ─── */
const msgMenu = $('#msgMenu');

function openMsgMenu(e, msgId, mine, user, text) {
  state.menuTargetId = msgId;
  state.menuTargetMine = mine;
  state.menuTarget = { user, text };

  /* 공감 버튼 채우기 */
  $('#mmReactions').innerHTML = REACTIONS.map(r => `<button data-emoji="${r}">${r}</button>`).join('');
  $('#mmDelete').style.display = mine ? '' : 'none';
  $('#mmNotice').style.display = state.isHost ? '' : 'none';

  msgMenu.classList.remove('hidden');
  const mw = msgMenu.offsetWidth, mh = msgMenu.offsetHeight;
  let x = e.clientX, y = e.clientY;
  if (x + mw > innerWidth - 10)  x = innerWidth - mw - 10;
  if (y + mh > innerHeight - 10) y = innerHeight - mh - 10;
  msgMenu.style.left = x + 'px';
  msgMenu.style.top  = y + 'px';
}
function hideMsgMenu() { msgMenu && msgMenu.classList.add('hidden'); }
document.addEventListener('click', hideMsgMenu);
msgMenu && msgMenu.addEventListener('click', e => e.stopPropagation());

$('#mmReactions') && $('#mmReactions').addEventListener('click', e => {
  const b = e.target.closest('button[data-emoji]');
  if (!b || !state.menuTargetId) return;
  socket.emit('reactMessage', { msgId: state.menuTargetId, emoji: b.dataset.emoji });
  hideMsgMenu();
});
$('#mmReply') && $('#mmReply').addEventListener('click', () => {
  if (!state.menuTargetId) return;
  state.replyTarget = { id: state.menuTargetId, ...state.menuTarget };
  $('#rpUser').textContent = decodeEnt(state.menuTarget.user);
  $('#rpText').textContent = state.menuTarget.text.slice(0, 60);
  $('#replyPreview').classList.remove('hidden');
  hideMsgMenu();
  $('#msgInput').focus();
});
$('#mmNotice') && $('#mmNotice').addEventListener('click', () => {
  if (!state.menuTargetId) return;
  socket.emit('setNotice', state.menuTarget.text.slice(0, 200));
  hideMsgMenu();
});
$('#mmDelete') && $('#mmDelete').addEventListener('click', () => {
  if (!state.menuTargetId) return;
  socket.emit('deleteMessage', { msgId: state.menuTargetId });
  hideMsgMenu();
});

function hideReplyPreview() {
  state.replyTarget = null;
  $('#replyPreview') && $('#replyPreview').classList.add('hidden');
}
$('#replyCancel') && $('#replyCancel').addEventListener('click', hideReplyPreview);

/* ─── 공지 ─── */
socket.on('notice', text => {
  $('#noticeText').innerHTML = text;     // 서버 escape 됨
  $('#noticeBar').classList.remove('hidden');
});
$('#noticeClose') && $('#noticeClose').addEventListener('click', () => {
  $('#noticeBar').classList.add('hidden');
});

/* ─── 타이핑 표시 ─── */
let typingTimer = null, lastTypingEmit = 0;
$('#msgInput') && $('#msgInput').addEventListener('input', () => {
  const now = Date.now();
  if (now - lastTypingEmit > 1500) {
    socket.emit('typing');
    lastTypingEmit = now;
  }
  clearTimeout(typingTimer);
  typingTimer = setTimeout(() => socket.emit('stopTyping'), 1300);
});
socket.on('typing', ({ user }) => {
  state.typingUsers.add(user);
  renderTyping();
});
socket.on('stopTyping', ({ user }) => {
  state.typingUsers.delete(user);
  renderTyping();
});
function renderTyping() {
  const arr = [...state.typingUsers].map(decodeEnt);
  $('#typingBar').textContent = arr.length
    ? (arr.length === 1 ? `${arr[0]}님이 입력 중…` : `${arr.length}명이 입력 중…`)
    : '';
}

/* ─── 전송 ─── */
function sendMessage() {
  const input = $('#msgInput');
  const text = input.value.trim();
  if (!text) return;
  const payload = state.replyTarget
    ? { text, replyTo: state.replyTarget.id }
    : text;
  socket.emit('chatMessage', payload);
  socket.emit('stopTyping');
  input.value = '';
  hideReplyPreview();
  input.focus();
}
$('#sendBtn')  && $('#sendBtn').addEventListener('click', sendMessage);
$('#msgInput') && $('#msgInput').addEventListener('keydown', e => {
  if (e.key === 'Enter' && !e.isComposing) sendMessage();
});

/* ─── 이미지 크롭 (카카오톡 스타일) ─── */
let _openCropForFile = null;
(function initImageCrop() {
  const overlay = $('#cropOverlay');
  const canvas  = $('#cropCanvas');
  const sel     = $('#cropSel');
  const dimTxt  = $('#cropDim');
  const aspect  = $('#cropAspect1to1');
  if (!overlay || !canvas || !sel) return;

  const ctx = canvas.getContext('2d');
  let srcImg = null, scale = 1;
  const MIN = 20;
  // crop region in canvas-pixel space
  let cX = 0, cY = 0, cW = 0, cH = 0;
  // drag state
  let dragMode = null; // 'move'|'draw'|'tl'|'tr'|'bl'|'br'
  let dragClient0 = null, dragCrop0 = null;

  function canvasRect() { return canvas.getBoundingClientRect(); }

  function toCanvasPx(cx, cy) {
    const r = canvasRect();
    return {
      x: Math.max(0, Math.min(canvas.width,  (cx - r.left) / r.width  * canvas.width)),
      y: Math.max(0, Math.min(canvas.height, (cy - r.top)  / r.height * canvas.height)),
    };
  }

  function updateSel() {
    const r = canvasRect();
    const sx = r.width  / canvas.width;
    const sy = r.height / canvas.height;
    sel.style.left   = (cX * sx) + 'px';
    sel.style.top    = (cY * sy) + 'px';
    sel.style.width  = (cW * sx) + 'px';
    sel.style.height = (cH * sy) + 'px';
    if (dimTxt) dimTxt.textContent = `${Math.round(cW / scale)} × ${Math.round(cH / scale)} px`;
  }

  function clamp() {
    cW = Math.max(MIN, cW); cH = Math.max(MIN, cH);
    cX = Math.max(0, Math.min(canvas.width  - cW, cX));
    cY = Math.max(0, Math.min(canvas.height - cH, cY));
    cW = Math.min(canvas.width  - cX, cW);
    cH = Math.min(canvas.height - cY, cH);
  }

  function initDefaultCrop() {
    const isSquare = _cropMode === 'profile' || (aspect && aspect.checked);
    if (isSquare) {
      const sz = Math.min(canvas.width, canvas.height);
      cX = Math.round((canvas.width  - sz) / 2);
      cY = Math.round((canvas.height - sz) / 2);
      cW = sz; cH = sz;
      if (aspect) aspect.checked = true;
    } else {
      cX = 0; cY = 0; cW = canvas.width; cH = canvas.height;
    }
    requestAnimationFrame(updateSel);
  }

  function openCrop(file) {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      srcImg = img;
      const MAX = Math.min(window.innerWidth - 32, window.innerHeight - 200, 600);
      scale = Math.min(MAX / img.width, MAX / img.height, 1);
      canvas.width  = Math.round(img.width  * scale);
      canvas.height = Math.round(img.height * scale);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      overlay.classList.remove('hidden');
      requestAnimationFrame(initDefaultCrop);
    };
    img.onerror = () => { URL.revokeObjectURL(url); showToast('사진을 읽을 수 없어요.', 'error'); };
    img.src = url;
  }
  _openCropForFile = openCrop;

  function getClient(e) {
    const t = e.touches ? e.touches[0] : e;
    return { x: t.clientX, y: t.clientY };
  }

  function onDown(e) {
    if (e.button !== undefined && e.button !== 0) return;
    const c = getClient(e);
    dragClient0 = c;
    dragCrop0 = { cX, cY, cW, cH };

    const handle = e.target.dataset?.handle;
    if (handle) { dragMode = handle; e.preventDefault(); return; }

    const pt = toCanvasPx(c.x, c.y);
    if (pt.x >= cX && pt.x <= cX + cW && pt.y >= cY && pt.y <= cY + cH) {
      dragMode = 'move';
    } else {
      dragMode = 'draw';
      cX = pt.x; cY = pt.y; cW = 0; cH = 0;
      updateSel();
    }
    e.preventDefault();
  }

  function onMove(e) {
    if (!dragMode) return;
    const c = getClient(e);
    const r = canvasRect();
    const dxC = (c.x - dragClient0.x) / r.width  * canvas.width;
    const dyC = (c.y - dragClient0.y) / r.height * canvas.height;
    const s = dragCrop0;
    const lock = aspect && aspect.checked;

    if (dragMode === 'move') {
      cX = s.cX + dxC; cY = s.cY + dyC; cW = s.cW; cH = s.cH;
    } else if (dragMode === 'draw') {
      const p0 = toCanvasPx(dragClient0.x, dragClient0.y);
      const p1 = toCanvasPx(c.x, c.y);
      let nx = Math.min(p0.x, p1.x), ny = Math.min(p0.y, p1.y);
      let nw = Math.abs(p1.x - p0.x), nh = Math.abs(p1.y - p0.y);
      if (lock) { const m = Math.min(nw, nh); nw = m; nh = m; }
      cX = nx; cY = ny; cW = nw; cH = nh;
    } else {
      let nx = s.cX, ny = s.cY, nw = s.cW, nh = s.cH;
      if (dragMode === 'tl') { nx = s.cX+dxC; ny = s.cY+dyC; nw = s.cW-dxC; nh = s.cH-dyC; }
      else if (dragMode === 'tr') { ny = s.cY+dyC; nw = s.cW+dxC; nh = s.cH-dyC; }
      else if (dragMode === 'bl') { nx = s.cX+dxC; nw = s.cW-dxC; nh = s.cH+dyC; }
      else if (dragMode === 'br') { nw = s.cW+dxC; nh = s.cH+dyC; }
      if (lock) { const m = Math.min(Math.abs(nw), Math.abs(nh));
        if (dragMode === 'tl') { nx = s.cX+s.cW-m; ny = s.cY+s.cH-m; }
        else if (dragMode === 'tr') { ny = s.cY+s.cH-m; }
        else if (dragMode === 'bl') { nx = s.cX+s.cW-m; }
        nw = m; nh = m;
      }
      cX = nx; cY = ny; cW = nw; cH = nh;
    }
    clamp();
    updateSel();
    e.preventDefault && e.preventDefault();
  }

  function onUp() { dragMode = null; }

  const wrap = canvas.parentElement;
  wrap.addEventListener('mousedown',  onDown);
  wrap.addEventListener('touchstart', onDown, { passive: false });
  sel.addEventListener('mousedown',   onDown);
  sel.addEventListener('touchstart',  onDown, { passive: false });
  document.addEventListener('mousemove', onMove);
  document.addEventListener('touchmove', onMove, { passive: false });
  document.addEventListener('mouseup',   onUp);
  document.addEventListener('touchend',  onUp);

  aspect && aspect.addEventListener('change', () => {
    if (aspect.checked) {
      const m = Math.min(cW, cH); cW = m; cH = m;
      clamp(); updateSel();
    }
  });

  function sendCropped(useCrop) {
    overlay.classList.add('hidden');
    if (!srcImg) return;
    let sx, sy, sw, sh;
    if (useCrop && cW >= MIN && cH >= MIN) {
      sx = Math.round(cX / scale); sy = Math.round(cY / scale);
      sw = Math.round(cW / scale); sh = Math.round(cH / scale);
    } else {
      sx = 0; sy = 0; sw = srcImg.width; sh = srcImg.height;
    }

    if (_cropMode === 'profile') {
      const size = Math.max(500, Math.min(sw, sh));
      const out = document.createElement('canvas');
      out.width = size; out.height = size;
      out.getContext('2d').drawImage(srcImg, sx, sy, sw, sh, 0, 0, size, size);
      const dataURL = out.toDataURL('image/jpeg', 0.92);
      srcImg = null; _cropMode = null;
      if (_prfCropTarget) {
        localStorage.setItem('ananas_' + _prfCropTarget + '_photo', dataURL);
        loadPrfPhoto(_prfCropTarget);
        showToast('프로필 사진이 설정됐어요!', 'success');
        _prfCropTarget = null;
      }
      return;
    }

    const MAX = 1280;
    let dw = sw, dh = sh;
    if (dw > MAX || dh > MAX) { const ratio = Math.min(MAX/dw, MAX/dh); dw = Math.round(dw*ratio); dh = Math.round(dh*ratio); }
    const out = document.createElement('canvas');
    out.width = dw; out.height = dh;
    out.getContext('2d').drawImage(srcImg, sx, sy, sw, sh, 0, 0, dw, dh);
    const dataURL = out.toDataURL('image/jpeg', 0.88);
    srcImg = null; _cropMode = null;
    if (dataURL.length > 4.8 * 1024 * 1024) { showToast('사진이 너무 커요. 작은 사진을 사용해주세요.', 'error'); return; }
    socket.emit('chatMessage', dataURL);
  }

  $('#cropOk')        && $('#cropOk').addEventListener('click',        () => sendCropped(true));
  $('#cropSkip')      && $('#cropSkip').addEventListener('click',       () => sendCropped(false));
  $('#cropCancelBtn') && $('#cropCancelBtn').addEventListener('click',  () => {
    overlay.classList.add('hidden'); srcImg = null; _cropMode = null; _prfCropTarget = null;
  });

  $('#imageFileInput') && $('#imageFileInput').addEventListener('change', e => {
    const file = e.target.files && e.target.files[0];
    e.target.value = '';
    if (!file) return;
    if (!/^image\/(jpeg|png|webp)$/.test(file.type)) {
      showToast('JPG / PNG / WEBP 사진만 보낼 수 있어요.', 'error'); return;
    }
    _cropMode = 'chat';
    openCrop(file);
  });
})();

/* ─── 이모지 피커 ─── */
const EMOJI_CATS = {
  '😊 표정': ['😀','😃','😄','😁','😆','😅','😂','🤣','🥹','😊','😇','🙂','🙃','😉','😌','😍','🥰','😘','😗','😙','😚','😋','😛','😝','😜','🤪','🤨','🧐','🤓','😎','🥸','🤩','🥳','😏','😒','😞','😔','😟','😕','🙁','☹️','😣','😖','😫','😩','🥺','😢','😭','😤','😠','😡','🤬','🤯','😳','🥵','🥶','😱','😨','😰','😥','😓','🤗','🤔','🤭','🤫','🤥','😶','😑','😬','🙄','😯','😦','😧','😮','😲','🥱','😴','🤤','😪','😵','🤐','🥴','🤢','🤧','😷','🤒','🤕'],
  '👋 손·몸': ['👋','🤚','🖐️','✋','🖖','👌','🤌','🤏','✌️','🤞','🫰','🤟','🤘','🤙','👈','👉','👆','🖕','👇','☝️','🫵','👍','👎','✊','👊','🤛','🤜','👏','🙌','🫶','👐','🤲','🙏','✍️','💅','🤳','💪','🦾','🦵','🦶','👂','🦻','👃','🫀','🫁','🧠','🦷','🦴','👀','👁️','👅','👄','🫦'],
  '❤️ 하트': ['❤️','🧡','💛','💚','💙','💜','🖤','🤍','🤎','💔','❤️‍🔥','❤️‍🩹','💕','💞','💓','💗','💖','💘','💝','💟','☮️','✝️','☯️','🕊️','✨','💫','⭐','🌟','💥','🔥','🌈','☀️','🌙'],
  '🐶 동물': ['🐶','🐱','🐭','🐹','🐰','🦊','🐻','🐼','🐨','🐯','🦁','🐮','🐷','🐸','🐵','🙈','🙉','🙊','🐔','🐧','🐦','🐤','🦆','🦅','🦉','🦇','🐺','🐗','🐴','🦄','🐝','🐛','🦋','🐌','🐞','🐜','🦟','🦗','🕷️','🦂','🐢','🐍','🦎','🦖','🐙','🦑','🦐','🦞','🦀','🐡','🐠','🐟','🐬','🐳','🐋','🦈','🐊','🦁','🐘','🦏','🦛','🦒','🦓','🦌','🐃','🐂','🐄','🐎','🐖','🐏','🐑','🦙','🐐','🐕','🐩','🦮','🐈','🐈‍⬛','🐓','🦃','🦤','🦚','🦜','🦢','🕊️'],
  '🌸 자연': ['🌸','🌺','🌻','🌹','🥀','🌷','🌱','🌿','☘️','🍀','🎋','🎍','🍃','🍂','🍁','🍄','🌾','💐','🌵','🎄','🌲','🌳','🌴','🪴','🌏','🌍','🌎','🌕','🌖','🌗','🌘','🌑','🌒','🌓','🌔','🌙','🌛','🌜','🌝','🌞','⭐','🌟','💫','✨','⚡','🌈','☁️','⛅','🌤️','🌦️','🌧️','⛈️','🌩️','🌨️','❄️','☃️','🌬️','💨','🌊','🌀'],
  '🍎 음식': ['🍎','🍊','🍋','🍇','🍓','🫐','🍈','🍉','🍑','🥭','🍍','🥝','🍅','🫒','🥥','🥑','🍆','🥔','🥕','🌽','🌶️','🫑','🥦','🧄','🧅','🍄','🥜','🌰','🍞','🥐','🥖','🫓','🥨','🧀','🥚','🍳','🧈','🥞','🧇','🥓','🥩','🍗','🍖','🦴','🌭','🍔','🍟','🍕','🫔','🌮','🌯','🥙','🧆','🥚','🍜','🍝','🍛','🍲','🍣','🍱','🥟','🦪','🍤','🍙','🍚','🍘','🍥','🥮','🍢','🧁','🍰','🎂','🍮','🍭','🍬','🍫','🍿','🍩','🍪','🌰','🥜','🍯','🧃','🥤','🧋','☕','🍵','🫖','🍺','🍻','🥂','🍷','🥃','🍸','🍹','🍾'],
  '⚽ 활동': ['⚽','🏀','🏈','⚾','🥎','🎾','🏐','🏉','🥏','🎱','🏓','🏸','🏒','🥊','🥋','🏹','🎣','🤿','🎽','🛹','🛼','🛷','🥌','⛷️','🏂','🏋️','🤸','⛹️','🏌️','🧘','🚴','🏊','🤽','🧗','🚵','🤺','🏇','⛸️','🎿','🛼','🎯','🎳','🎮','🕹️','🎲','🎰','🎭','🎨','🖼️','🎪','🤹','🎠','🎡','🎢','🎪','🎬','🎤','🎧','🎼','🎵','🎶','🥁','🪘','🎷','🎺','🎸','🪕','🎻','🪗'],
  '📱 물건': ['📱','💻','🖥️','🖨️','⌨️','🖱️','📷','📸','📹','🎥','📽️','📺','📻','📡','🔋','🔌','💡','🔦','🕯️','🪔','🧯','📦','📫','📬','📭','📮','📝','📋','📁','📂','🗂️','📅','📆','🗒️','🗓️','📇','📌','📍','✂️','🗃️','🗄️','🗑️','🔒','🔓','🔏','🔑','🗝️','🔨','🪓','⛏️','🔧','🔩','⚙️','🗜️','🪤','🧲','🪝','🧰','🪜','🧪','🧫','🧬','🔭','🔬','🩺','💊','💉','🩹','🩼','🩻','🚪','🪑','🛋️','🪞','🛏️','🛁','🚿','🛒','🎁','🎀','🎊','🎉','🎈','🪆','🎎','🎐','🎏','🎑','🧧','🎍','🎋','🎄','🎆','🎇','🧨','✨'],
  '🚗 이동': ['🚗','🚕','🚙','🚌','🚎','🏎️','🚓','🚑','🚒','🚐','🛻','🚚','🚛','🚜','🏍️','🛵','🚲','🛴','🛺','🚁','🛸','🚀','✈️','🛩️','🛫','🛬','🪂','⛵','🚤','🛥️','🛳️','🚢','⛴️','🚂','🚃','🚄','🚅','🚆','🚇','🚊','🚝','🚞','🚋','🚌','🚍','🛞','⛽','🚧','⚓','🗺️','🧭','🏔️','⛰️','🌋','🗻','🏕️','🏖️','🏗️','🏘️','🏙️','🌁','🌃','🌉','🌌'],
};

const STICKERS = [
  '😀','😂','🤣','😊','😍','🥰','😎','🤩','😜','🤪',
  '😭','😢','😤','😡','🥺','😱','😴','🤔','🙄','😏',
  '👍','👎','👏','🙏','💪','🤝','✌️','🫶','💖','🎉',
];

function hideEmojiPop() {
  const p = $('#esPop');
  if (p) p.classList.add('hidden');
}

(function initEmojiPicker() {
  const pop = $('#esPop'), btn = $('#emojiBtn');
  const tabs = $('#epTabs'), grid = $('#epGrid');
  if (!pop || !btn || !tabs || !grid) return;

  const cats = Object.keys(EMOJI_CATS);
  let activeCat = cats[0];

  function renderCat(cat) {
    activeCat = cat;
    grid.innerHTML = EMOJI_CATS[cat].map(e => `<button class="ep-emoji" title="${e}">${e}</button>`).join('');
    tabs.querySelectorAll('.ep-tab').forEach(t => t.classList.toggle('active', t.dataset.cat === cat));
  }

  tabs.innerHTML = cats.map(c => `<button class="ep-tab" data-cat="${c}" title="${c}">${c.split(' ')[0]}</button>`).join('');
  tabs.addEventListener('click', e => {
    e.stopPropagation();
    const t = e.target.closest('.ep-tab');
    if (t) renderCat(t.dataset.cat);
  });
  renderCat(activeCat);

  grid.addEventListener('click', e => {
    e.stopPropagation();
    const b = e.target.closest('.ep-emoji');
    if (!b) return;
    const inp = $('#msgInput');
    inp.value += b.textContent;
    inp.focus();
    pop.classList.add('hidden');
  });

  btn.addEventListener('click', e => {
    e.stopPropagation();
    pop.classList.toggle('hidden');
  });

  document.addEventListener('click', hideEmojiPop);
})();

/* ─── 미디어 뷰어 ─── */
let _mvSrc = '', _mvType = '';
function openMediaViewer(src, type) {
  const viewer = $('#mediaViewer');
  const content = $('#mvContent');
  if (!viewer || !content) return;
  _mvSrc = src; _mvType = type;
  content.innerHTML = '';
  if (type === 'image') {
    const img = document.createElement('img');
    img.src = src;
    img.className = 'mv-img';
    content.appendChild(img);
  } else {
    const vid = document.createElement('video');
    vid.src = src;
    vid.controls = true;
    vid.autoplay = true;
    vid.className = 'mv-vid';
    content.appendChild(vid);
  }
  viewer.classList.remove('hidden');
  document.body.style.overflow = 'hidden';
}
function closeMediaViewer() {
  const viewer = $('#mediaViewer');
  const content = $('#mvContent');
  if (!viewer) return;
  const vid = content && content.querySelector('video');
  if (vid) { vid.pause(); vid.src = ''; }
  content && (content.innerHTML = '');
  viewer.classList.add('hidden');
  document.body.style.overflow = '';
  _mvSrc = ''; _mvType = '';
}
function _dataURItoBlob(dataURI) {
  const [header, b64] = dataURI.split(',');
  const mime = header.match(/:(.*?);/)[1];
  const bytes = atob(b64);
  const arr = new Uint8Array(bytes.length);
  for (let i = 0; i < bytes.length; i++) arr[i] = bytes.charCodeAt(i);
  return new Blob([arr], { type: mime });
}
async function saveMedia() {
  if (!_mvSrc) return;
  const mimeFromUri = _mvSrc.match(/^data:(.*?);/)?.[1] || '';
  const extMap = { 'image/jpeg':'jpg','image/png':'png','image/webp':'webp','image/gif':'gif' };
  const ext = extMap[mimeFromUri] || 'jpg';
  const filename = `ananas_photo_${Date.now()}.${ext}`;
  try {
    const blob = _dataURItoBlob(_mvSrc);
    if (window.showSaveFilePicker) {
      const fh = await window.showSaveFilePicker({
        suggestedName: filename,
        types: [{ description: _mvType === 'video' ? '영상 파일' : '이미지 파일',
                   accept: { [mimeFromUri || 'application/octet-stream']: ['.' + ext] } }],
      });
      const ws = await fh.createWritable();
      await ws.write(blob);
      await ws.close();
      showToast('저장 완료!', 'success');
    } else {
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(a.href), 3000);
      showToast('다운로드 시작!', 'success');
    }
  } catch (err) {
    if (err.name !== 'AbortError') showToast('저장 실패: ' + err.message, 'error');
  }
}
$('#mvClose') && $('#mvClose').addEventListener('click', closeMediaViewer);
$('#mvSaveBtn') && $('#mvSaveBtn').addEventListener('click', saveMedia);
$('#mediaViewer') && $('#mediaViewer').addEventListener('click', e => {
  if (e.target === $('#mediaViewer')) closeMediaViewer();
});
document.addEventListener('keydown', e => { if (e.key === 'Escape') closeMediaViewer(); });



function sendSticker(emoji) {
  if (!state.room) return;
  socket.emit('message', { text: emoji, isSticker: true });
}


/* ─── 픽셀 파인애플 커서 (애니메이션 + 15가지 상태) ─── */
(function initPineappleCursor() {
  /* ── 바운스 애니메이션 프레임 (스트레치 → 스쿼시 사이클) ──
     G=진초록잎 g=연초록잎 Y=노란몸통 y=연노랑
     O=주황테두리 K=검정눈/입 P=분홍볼터치 .=투명 */
  const LEAF0 = '....gGgGg....';
  const LEAF1 = '...gGGGGGg...';
  const LEAF2 = '....GGGGG....';
  const B_TOP = '..OYYYYYYYO..';
  const B_MID = '.OYYYYYYYYY0.';
  const B_EYE = '.OYyKYYYKyYO.';
  const B_SMI = '.OYYyKKKyYYO.';
  const B_CHK = '.OYYPYYYPyYO.';
  const B_BOT = '..OYYYYYYYO..';

  /* jump = 바닥(mouseY) 기준 위로 올라갈 px, ms = 이 프레임 지속시간 */
  const FRAMES = [
    /* 바닥 대기 – 노말 */        { grid:[LEAF0,LEAF1,LEAF2,B_TOP,B_MID,B_EYE,B_MID,B_SMI,B_CHK,B_BOT],                              jump:0,  ms:160 },
    /* 도약 – 세로 늘어남 */      { grid:[LEAF0,LEAF1,LEAF2,B_TOP,B_MID,B_MID,B_EYE,B_MID,B_MID,B_SMI,B_CHK,B_BOT],                  jump:6,  ms:80  },
    /* 상승 – 더 늘어남 */        { grid:[LEAF0,LEAF1,LEAF2,B_TOP,B_MID,B_MID,B_MID,B_EYE,B_MID,B_MID,B_MID,B_SMI,B_CHK,B_BOT],      jump:18, ms:80  },
    /* 정점 – 노말 */             { grid:[LEAF0,LEAF1,LEAF2,B_TOP,B_MID,B_EYE,B_MID,B_SMI,B_CHK,B_BOT],                              jump:28, ms:80  },
    /* 하강 – 살짝 늘어남 */      { grid:[LEAF0,LEAF1,LEAF2,B_TOP,B_MID,B_MID,B_EYE,B_MID,B_MID,B_SMI,B_CHK,B_BOT],                  jump:14, ms:80  },
    /* 착지 – 최대 스쿼시 */      { grid:[LEAF1,LEAF2,B_TOP,B_EYE,B_SMI,B_CHK,B_BOT],                                               jump:0,  ms:60  },
    /* 리바운드 – 약한 스쿼시 */  { grid:[LEAF0,LEAF1,LEAF2,B_TOP,B_EYE,B_MID,B_SMI,B_CHK,B_BOT],                                    jump:0,  ms:80  },
  ];

  const PS = 3; /* 픽셀 1dot = 3px */

  /* 각 프레임을 오프스크린 캔버스로 사전 렌더링 */
  const pineFrames = FRAMES.map(({ grid, jump, ms }) => {
    const rows = grid.length;
    const cols = Math.max(...grid.map(r => r.length));
    const cv   = document.createElement('canvas');
    cv.width   = cols * PS;
    cv.height  = rows * PS;
    const ctx  = cv.getContext('2d');
    grid.forEach((line, r) => {
      [...line].forEach((ch, c) => {
        if (ch === '.' || ch === '0') return;
        ctx.fillStyle = PX_PALETTE[ch] || '#1F1B13';
        ctx.fillRect(c * PS, r * PS, PS, PS);
      });
    });
    return { cv, jump, ms };
  });

  const INK = '#1F1B13', WHT = '#FFFEF8', YLW = '#FFC400', RED = '#E53935';

  /* ── 아이콘 드로잉 함수 15종 ── */

  /* 1. 기본 선택: 화살표 (노란색) */
  function iArrow(c) {
    const p=[[2,1],[2,16],[5,12],[8,18],[11,17],[8,11],[14,11]];
    c.fillStyle=YLW; c.beginPath(); p.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y)); c.closePath(); c.fill();
    c.strokeStyle=WHT; c.lineWidth=1.2; c.lineJoin='round'; c.stroke();
  }

  /* 2. 도움말: ? */
  function iHelp(c) {
    c.fillStyle=YLW; c.font='bold 17px sans-serif'; c.textBaseline='top'; c.fillText('?',5,1);
    c.strokeStyle=WHT; c.lineWidth=0.5; c.strokeText('?',5,1);
  }

  /* 3. 작업 중: 점원 스피너 */
  function iWait(c) {
    for(let i=0;i<8;i++){
      const a=(i/8)*Math.PI*2-Math.PI/2, x=10+Math.cos(a)*7, y=10+Math.sin(a)*7;
      c.beginPath(); c.arc(x,y,1.8,0,Math.PI*2);
      c.fillStyle=i<4?YLW:'#FFE58388'; c.fill();
    }
  }

  /* 4. 백그라운드 작업: 시계 */
  function iProgress(c) {
    c.fillStyle=YLW; c.beginPath(); c.arc(10,10,7,0,Math.PI*2); c.fill();
    c.strokeStyle=WHT; c.lineWidth=1.5;
    c.beginPath(); c.arc(10,10,7,0,Math.PI*2); c.stroke();
    c.strokeStyle=INK; c.lineWidth=1.5;
    c.beginPath(); c.moveTo(10,10); c.lineTo(10,4); c.stroke();
    c.beginPath(); c.moveTo(10,10); c.lineTo(15,13); c.stroke();
  }

  /* 5. 정밀 선택: 점 세 개 */
  function iCross(c) {
    [[5,5],[15,5],[10,15]].forEach(([x,y])=>{
      c.beginPath(); c.arc(x,y,2.5,0,Math.PI*2); c.fillStyle=YLW; c.fill();
      c.strokeStyle=WHT; c.lineWidth=0.8; c.stroke();
    });
  }

  /* 6. 텍스트: I-빔 */
  function iText(c) {
    c.strokeStyle=YLW; c.lineWidth=2;
    c.beginPath(); c.moveTo(5,3); c.lineTo(15,3); c.stroke();
    c.beginPath(); c.moveTo(10,3); c.lineTo(10,17); c.stroke();
    c.beginPath(); c.moveTo(5,17); c.lineTo(15,17); c.stroke();
    c.strokeStyle=WHT; c.lineWidth=0.6;
    c.beginPath(); c.moveTo(5,3); c.lineTo(15,3); c.stroke();
    c.beginPath(); c.moveTo(10,3); c.lineTo(10,17); c.stroke();
    c.beginPath(); c.moveTo(5,17); c.lineTo(15,17); c.stroke();
  }

  /* 7. 수직 크기 조절: ↕ */
  function iNS(c) {
    c.fillStyle=YLW;
    c.beginPath(); c.moveTo(10,1); c.lineTo(6,7); c.lineTo(14,7); c.closePath(); c.fill();
    c.beginPath(); c.moveTo(10,19); c.lineTo(6,13); c.lineTo(14,13); c.closePath(); c.fill();
    c.fillRect(8,6,4,8);
    c.strokeStyle=WHT; c.lineWidth=0.8;
    c.beginPath(); c.moveTo(10,1); c.lineTo(6,7); c.lineTo(14,7); c.closePath(); c.stroke();
    c.beginPath(); c.moveTo(10,19); c.lineTo(6,13); c.lineTo(14,13); c.closePath(); c.stroke();
  }

  /* 8. 수평 크기 조절: ↔ */
  function iEW(c) {
    c.fillStyle=YLW;
    c.beginPath(); c.moveTo(1,10); c.lineTo(7,6); c.lineTo(7,14); c.closePath(); c.fill();
    c.beginPath(); c.moveTo(19,10); c.lineTo(13,6); c.lineTo(13,14); c.closePath(); c.fill();
    c.fillRect(6,8,8,4);
    c.strokeStyle=WHT; c.lineWidth=0.8;
    c.beginPath(); c.moveTo(1,10); c.lineTo(7,6); c.lineTo(7,14); c.closePath(); c.stroke();
    c.beginPath(); c.moveTo(19,10); c.lineTo(13,6); c.lineTo(13,14); c.closePath(); c.stroke();
  }

  /* 9. 대각선 크기 조절1: ↗↙ */
  function iNESW(c) {
    c.fillStyle=YLW;
    c.beginPath(); c.moveTo(13,1); c.lineTo(19,1); c.lineTo(19,7); c.closePath(); c.fill();
    c.beginPath(); c.moveTo(1,19); c.lineTo(1,13); c.lineTo(7,19); c.closePath(); c.fill();
    c.strokeStyle=YLW; c.lineWidth=2.5;
    c.beginPath(); c.moveTo(3,17); c.lineTo(17,3); c.stroke();
    c.strokeStyle=WHT; c.lineWidth=0.8;
    c.beginPath(); c.moveTo(3,17); c.lineTo(17,3); c.stroke();
  }

  /* 10. 대각선 크기 조절2: ↖↘ */
  function iNWSE(c) {
    c.fillStyle=YLW;
    c.beginPath(); c.moveTo(1,1); c.lineTo(7,1); c.lineTo(1,7); c.closePath(); c.fill();
    c.beginPath(); c.moveTo(19,19); c.lineTo(13,19); c.lineTo(19,13); c.closePath(); c.fill();
    c.strokeStyle=YLW; c.lineWidth=2.5;
    c.beginPath(); c.moveTo(3,3); c.lineTo(17,17); c.stroke();
    c.strokeStyle=WHT; c.lineWidth=0.8;
    c.beginPath(); c.moveTo(3,3); c.lineTo(17,17); c.stroke();
  }

  /* 11. 이동: ✛ */
  function iMove(c) {
    c.fillStyle=YLW;
    c.beginPath(); c.moveTo(10,1); c.lineTo(6,7); c.lineTo(14,7); c.closePath(); c.fill();
    c.beginPath(); c.moveTo(10,19); c.lineTo(6,13); c.lineTo(14,13); c.closePath(); c.fill();
    c.beginPath(); c.moveTo(1,10); c.lineTo(7,6); c.lineTo(7,14); c.closePath(); c.fill();
    c.beginPath(); c.moveTo(19,10); c.lineTo(13,6); c.lineTo(13,14); c.closePath(); c.fill();
    c.fillRect(6,6,8,8);
    c.strokeStyle=WHT; c.lineWidth=0.8;
    [[10,1,6,7,14,7],[10,19,6,13,14,13],[1,10,7,6,7,14],[19,10,13,6,13,14]].forEach(([ax,ay,bx,by,cx,cy])=>{
      c.beginPath(); c.moveTo(ax,ay); c.lineTo(bx,by); c.lineTo(cx,cy); c.closePath(); c.stroke();
    });
  }

  /* 12. 링크 선택: 손 포인터 */
  function iPointer(c) {
    c.fillStyle=YLW; c.strokeStyle=WHT; c.lineWidth=1.2;
    [[7,3,3,9],[9,2,3,9],[11,3,3,9],[13,5,3,9]].forEach(([x,y,w,h])=>{
      c.fillRect(x,y,w,h); c.strokeRect(x+0.6,y+0.6,w-1.2,h-1.2);
    });
    c.fillRect(6,10,10,8); c.strokeRect(6.6,10.6,8.8,6.8);
    c.beginPath(); c.moveTo(6,11); c.lineTo(3,9); c.lineTo(3,14); c.lineTo(6,14); c.closePath();
    c.fill(); c.stroke();
  }

  /* 13. 사용 불가: ⊘ */
  function iNo(c) {
    c.fillStyle=YLW; c.beginPath(); c.arc(10,10,7,0,Math.PI*2); c.fill();
    c.strokeStyle=RED; c.lineWidth=2.5;
    c.beginPath(); c.arc(10,10,7,0,Math.PI*2); c.stroke();
    c.beginPath(); c.moveTo(5,5); c.lineTo(15,15); c.stroke();
  }

  /* 14. 대체 선택: 다이아몬드 */
  function iAlias(c) {
    c.fillStyle=YLW; c.strokeStyle=WHT; c.lineWidth=1.5;
    c.beginPath(); c.moveTo(10,2); c.lineTo(18,10); c.lineTo(10,18); c.lineTo(2,10); c.closePath();
    c.fill(); c.stroke();
  }

  /* 15. 손글씨: 연필 */
  function iPen(c) {
    c.save(); c.translate(10,10); c.rotate(-Math.PI/4); c.translate(-10,-10);
    c.fillStyle=YLW; c.fillRect(7,3,6,13);
    c.fillStyle=INK; c.fillRect(7,3,6,2);
    c.fillStyle=WHT; c.fillRect(7,14,6,2);
    c.fillStyle=INK;
    c.beginPath(); c.moveTo(7,16); c.lineTo(10,20); c.lineTo(13,16); c.closePath(); c.fill();
    c.restore();
  }

  /* ── 커서 아이콘만 정적으로 CSS 적용 (파인애플 제외) ── */
  /* 아이콘 전용 커서: 파인애플 없이 아이콘만 20×20 */
  function mkIconOnly(drawFn, hx, hy) {
    const cv = document.createElement('canvas');
    cv.width = 20; cv.height = 20;
    drawFn(cv.getContext('2d'));
    return { url: cv.toDataURL(), hx, hy };
  }
  const ic = {
    def:  mkIconOnly(iArrow,    2,  1),
    help: mkIconOnly(iHelp,     5,  1),
    wait: mkIconOnly(iWait,    10, 10),
    prog: mkIconOnly(iProgress,10, 10),
    crs:  mkIconOnly(iCross,   10, 10),
    txt:  mkIconOnly(iText,    10,  9),
    ns:   mkIconOnly(iNS,      10, 10),
    ew:   mkIconOnly(iEW,      10, 10),
    nesw: mkIconOnly(iNESW,    10, 10),
    nwse: mkIconOnly(iNWSE,    10, 10),
    mv:   mkIconOnly(iMove,    10, 10),
    ptr:  mkIconOnly(iPointer,  8,  2),
    no:   mkIconOnly(iNo,      10, 10),
    ali:  mkIconOnly(iAlias,   10, 10),
    pen:  mkIconOnly(iPen,      2, 18),
  };
  const staticStyle = document.createElement('style');
  staticStyle.textContent = `
* { cursor: url("${ic.def.url}") ${ic.def.hx} ${ic.def.hy}, default !important; }
a, button, [role=button], summary, label[for],
input[type=button], input[type=submit], input[type=reset],
input[type=checkbox], input[type=radio], select,
.ci-send, .ci-img-btn, .ci-emoji-btn, .nav-btn,
.rc-btn, .room-card, .rc-del-btn, [tabindex]:not([tabindex="-1"]) {
  cursor: url("${ic.ptr.url}") ${ic.ptr.hx} ${ic.ptr.hy}, pointer !important; }
input:not([type=button]):not([type=submit]):not([type=reset])
  :not([type=checkbox]):not([type=radio]):not([type=range]):not([type=file]),
textarea, [contenteditable] {
  cursor: url("${ic.txt.url}") ${ic.txt.hx} ${ic.txt.hy}, text !important; }
[disabled], [aria-disabled=true], button[disabled], input[disabled] {
  cursor: url("${ic.no.url}") ${ic.no.hx} ${ic.no.hy}, not-allowed !important; }
[draggable=true] { cursor: url("${ic.mv.url}") ${ic.mv.hx} ${ic.mv.hy}, move !important; }
`;
  document.head.appendChild(staticStyle);

  /* ── 파인애플 팔로워: 마우스를 따라다니는 독립 애니메이션 요소 ── */
  const follower = document.createElement('canvas');
  follower.style.cssText = [
    'position:fixed', 'pointer-events:none', 'z-index:2147483647',
    'left:-999px', 'top:-999px', 'image-rendering:pixelated',
  ].join(';');
  document.body.appendChild(follower);
  const fctx = follower.getContext('2d');

  /* 마우스 따라가기 */
  let mx = -999, my = -999;
  document.addEventListener('mousemove', e => {
    mx = e.clientX; my = e.clientY;
  }, { passive: true });

  /* 프레임 애니메이션 (커서와 독립적으로 항상 실행) */
  let fi = 0;
  function nextFrame() {
    const { cv: pine, jump, ms } = pineFrames[fi];
    follower.width  = pine.width;
    follower.height = pine.height;
    fctx.clearRect(0, 0, pine.width, pine.height);
    fctx.drawImage(pine, 0, 0);
    /* 바닥(my) 고정 기준으로 위로 jump px 올림 */
    follower.style.left = (mx + 20) + 'px';
    follower.style.top  = (my - pine.height - jump) + 'px';
    fi = (fi + 1) % pineFrames.length;
    setTimeout(nextFrame, ms);
  }
  nextFrame();
})();

/* ─── 메시지 검색 ─── */
$('#chatHamburgerBtn') && $('#chatHamburgerBtn').addEventListener('click', toggleChatSb);
$('#searchToggleBtn') && $('#searchToggleBtn').addEventListener('click', () => {
  const bar = $('#searchBar');
  bar.classList.toggle('hidden');
  state.searchOpen = !bar.classList.contains('hidden');
  if (state.searchOpen) $('#searchInput').focus();
  else clearSearch();
});
$('#searchCloseBtn') && $('#searchCloseBtn').addEventListener('click', () => {
  $('#searchBar').classList.add('hidden');
  state.searchOpen = false;
  clearSearch();
});
$('#searchInput') && $('#searchInput').addEventListener('input', e => applySearch(e.target.value));

function applySearch(q) {
  q = (q || '').trim().toLowerCase();
  $$('.msg-row', msgArea).forEach(row => {
    const bubble = $('.msg-bubble', row);
    const raw = decodeURIComponent(bubble.dataset.raw || '');
    const plain = decodeEnt(raw).toLowerCase();
    /* 원본 복원 */
    if (bubble.dataset.marked) {
      bubble.innerHTML = bubble.dataset.marked;
      delete bubble.dataset.marked;
    }
    if (!q) { row.style.display = ''; return; }
    if (bubble.classList.contains('deleted') || !raw) { row.style.display = 'none'; return; }
    if (plain.includes(q)) {
      row.style.display = '';
      /* 하이라이트 (텍스트 노드만, 인용/이미지 보존) */
      bubble.dataset.marked = bubble.innerHTML;
      const re = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
      [...bubble.childNodes].forEach(node => {
        if (node.nodeType === 3 && node.textContent.toLowerCase().includes(q)) {
          const span = document.createElement('span');
          span.innerHTML = escHtml(node.textContent).replace(re, m => `<mark>${m}</mark>`);
          node.replaceWith(span);
        }
      });
    } else {
      row.style.display = 'none';
    }
  });
}
function clearSearch() {
  $('#searchInput').value = '';
  applySearch('');
}

/* ─── 방명록 ─── */
socket.on('guestbook', list => {
  const box = $('#gbList');
  box.innerHTML = '';
  if (!Array.isArray(list) || !list.length) {
    box.innerHTML = '<p class="gb-empty">아직 방명록이 비어 있어요.<br>첫 흔적을 남겨보세요!</p>';
    return;
  }
  list.forEach(e => appendGuestbook(e, false));
  box.scrollTop = box.scrollHeight;
});
socket.on('guestbookEntry', e => {
  appendGuestbook(e, true);
});
function appendGuestbook(e, isNew) {
  const box = $('#gbList');
  const empty = $('.gb-empty', box);
  if (empty) empty.remove();
  const el = document.createElement('div');
  el.className = 'gb-entry';
  el.dataset.gbId = e.id;
  const myNick = state.nicknameEsc || state.nickname || '';
  const canDelete = myNick && e.user === myNick;
  el.innerHTML = `
    <span class="gb-user">${e.user}</span>
    <span class="gb-text">${e.text}</span>
    <span class="gb-time">${fmtTime(e.time)}</span>
    ${canDelete ? `<button class="gb-del-btn" onclick="deleteGuestbook('${e.id}')">✕</button>` : ''}`;
  box.appendChild(el);
  if (isNew) box.scrollTop = box.scrollHeight;
}
function deleteGuestbook(id) {
  socket.emit('deleteGuestbook', { id });
}
window.deleteGuestbook = deleteGuestbook;
socket.on('guestbookDeleted', ({ id }) => {
  const el = $(`[data-gb-id="${id}"]`);
  if (el) el.remove();
  if (!$('#gbList').querySelector('.gb-entry')) {
    $('#gbList').innerHTML = '<p class="gb-empty">아직 방명록이 비어 있어요.<br>첫 흔적을 남겨보세요!</p>';
  }
});
function sendGuestbook() {
  const inp = $('#gbInput');
  const text = inp.value.trim();
  if (!text) return;
  socket.emit('addGuestbook', text);
  inp.value = '';
}
$('#gbSendBtn') && $('#gbSendBtn').addEventListener('click', sendGuestbook);
$('#gbInput')   && $('#gbInput').addEventListener('keydown', e => {
  if (e.key === 'Enter' && !e.isComposing) sendGuestbook();
});

/* ═══════════════════════════════════════════
   12. AI 어시스턴트 (/api/ai 서버 프록시)
═══════════════════════════════════════════ */
const aiHistory = [];
let aiBusy = false;

function appendAiMsg(role, text) {
  const box = $('#aiMessages');
  const wel = $('.ai-welcome', box);
  if (wel) wel.remove();
  const el = document.createElement('div');
  el.className = 'ai-msg' + (role === 'user' ? ' user-msg' : '');
  el.innerHTML = role === 'user'
    ? `<div class="ai-bubble">${escHtml(text)}</div>`
    : `<div class="ai-av"><canvas class="px" data-sprite="pine" data-scale="2"></canvas></div>
       <div class="ai-bubble">${escHtml(text).replace(/\n/g, '<br>')}</div>`;
  box.appendChild(el);
  renderAllSprites(el);
  box.scrollTop = box.scrollHeight;
  return el;
}

async function sendAi(text) {
  if (aiBusy || !text.trim()) return;
  aiBusy = true;
  $('#aiSendBtn').disabled = true;
  appendAiMsg('user', text);
  aiHistory.push({ role: 'user', content: text });

  const box = $('#aiMessages');
  const typing = document.createElement('div');
  typing.className = 'ai-msg';
  typing.innerHTML = `<div class="ai-av"><canvas class="px" data-sprite="pine" data-scale="2"></canvas></div>
    <div class="ai-bubble ai-typing"><span></span><span></span><span></span></div>`;
  box.appendChild(typing);
  renderAllSprites(typing);
  box.scrollTop = box.scrollHeight;

  try {
    const r = await fetch('/api/ai', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages: aiHistory.slice(-10) }),
    });
    const data = await r.json();
    typing.remove();
    const reply = data.reply || data.error || '답변을 가져올 수 없어요.';
    appendAiMsg('ai', reply);
    aiHistory.push({ role: 'assistant', content: reply });
  } catch (err) {
    typing.remove();
    appendAiMsg('ai', 'AI 연결이 원활하지 않아요. 잠시 후 다시 시도해주세요.');
  } finally {
    aiBusy = false;
    $('#aiSendBtn').disabled = false;
  }
}

$('#aiSendBtn') && $('#aiSendBtn').addEventListener('click', () => {
  const inp = $('#aiInput');
  const t = inp.value.trim();
  if (!t) return;
  inp.value = ''; inp.style.height = 'auto';
  sendAi(t);
});
$('#aiInput') && $('#aiInput').addEventListener('keydown', e => {
  if (e.key === 'Enter' && !e.shiftKey && !e.isComposing) {
    e.preventDefault();
    $('#aiSendBtn').click();
  }
});
$('#aiInput') && $('#aiInput').addEventListener('input', e => {
  e.target.style.height = 'auto';
  e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px';
});
function sendAiSuggestion(btn) {
  switchPage('ai');
  sendAi(btn.textContent.trim());
}
window.sendAiSuggestion = sendAiSuggestion;

/* ═══════════════════════════════════════════
   13. 초기화 — URL 초대코드, 스프라이트 렌더
═══════════════════════════════════════════ */
document.addEventListener('DOMContentLoaded', () => {
  renderAllSprites(document);

  /* ?room=XXXXXX 초대 링크 */
  const params = new URLSearchParams(location.search);
  const roomParam = (params.get('room') || '').toUpperCase();
  if (/^[A-Z0-9]{6}$/.test(roomParam)) {
    state.pendingJoinCode = roomParam;
    /* 인트로 종료 후 자동 안내 */
    const waitIntro = setInterval(() => {
      if (!$('#introScreen')) {
        clearInterval(waitIntro);
        showToast(`초대 코드 ${roomParam} — 프로필을 만들고 입장하세요!`);
        openModal();
        state.pendingAction = 'join';
      }
    }, 400);
  }
});

/* 이미 DOMContentLoaded 지났을 경우 대비 */
if (document.readyState !== 'loading') renderAllSprites(document);
/* ═══════════════════════════════════════════
   NAV DROPDOWN SYSTEM
═══════════════════════════════════════════ */

/* 섹션 스크롤 + 하이라이트 */
function scrollToSection(id) {
  setTimeout(() => {
    const el = document.getElementById(id);
    if (!el) return;
    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    /* 하이라이트 플래시 */
    el.classList.add('feat-highlight');
    setTimeout(() => el.classList.remove('feat-highlight'), 1400);
  }, 350);
}
window.scrollToSection = scrollToSection;

/* 드롭다운 — 호버 & 클릭 하이브리드 */
(function initNavDropdowns() {
  const items = document.querySelectorAll('.nav-item');
  let activeItem = null;
  let closeTimer = null;

  function openDrop(item) {
    if (activeItem && activeItem !== item) closeDrop(activeItem);
    clearTimeout(closeTimer);
    activeItem = item;
    item.classList.add('drop-open');
    updateDropRecent();
  }
  function closeDrop(item) {
    if (!item) return;
    item.classList.remove('drop-open');
    if (activeItem === item) activeItem = null;
  }
  function scheduleClose(item) {
    clearTimeout(closeTimer);
    closeTimer = setTimeout(() => closeDrop(item), 180);
  }

  items.forEach(item => {
    item.addEventListener('mouseenter', () => openDrop(item));
    item.addEventListener('mouseleave', () => scheduleClose(item));
    const drop = item.querySelector('.nav-dropdown');
    if (drop) {
      drop.addEventListener('mouseenter', () => { clearTimeout(closeTimer); });
      drop.addEventListener('mouseleave', () => scheduleClose(item));
    }
  });

  /* 외부 클릭 시 닫기 */
  document.addEventListener('click', e => {
    if (!e.target.closest('.nav-item')) {
      if (activeItem) closeDrop(activeItem);
    }
  });

  /* 드롭다운 내 버튼 클릭 시 닫기 */
  document.querySelectorAll('.nd-item').forEach(btn => {
    btn.addEventListener('click', () => {
      if (activeItem) closeDrop(activeItem);
    });
  });
})();

/* 드롭다운 최근 방문 아지트 갱신 — ananas_recent 키 통일 */
function updateDropRecent() {
  const box = $('#dropRecentRooms');
  if (!box) return;
  const recent = getRecent(); /* 기존 getRecent() 재사용 */
  if (!recent.length) { box.innerHTML = ''; return; }
  box.innerHTML = `<div class="nd-recent-label">최근 방문</div>` +
    recent.slice(0, 3).map(r => `
      <button class="nd-recent-item" onclick="quickJoin('${escHtml(r.code)}')">
        <span>🏠</span>
        <span class="nri-name">${escHtml(r.name || r.code)}</span>
        <span class="nri-code">${escHtml(r.code)}</span>
      </button>`).join('');
}

/* 드롭다운에서 바로 방 입장 */
function quickJoinRoom(code) {
  if (!state.nickname) {
    /* 닉네임 없으면 모달 열고 join 로직 */
    state.pendingJoinCode = code;
    state.pendingAction = 'join';
    openModal();
    return;
  }
  /* 이미 프로필 있으면 바로 입장 */
  if ($('#roomCodeInput')) $('#roomCodeInput').value = code;
  joinRoom(code);
}
window.quickJoinRoom = quickJoinRoom;

/* 파도타기 (드롭다운에서도 호출 가능) */
function doWaveSurf() {
  doWave();
}
window.doWaveSurf = doWaveSurf;

/* ─── 코드 직접 입장 미니 모달 ─── */
function openJoinDirect() {
  const m = $('#joinDirectModal');
  if (m) { m.classList.remove('hidden'); $('#joinDirectInput') && $('#joinDirectInput').focus(); }
}
function closeJoinDirect() {
  const m = $('#joinDirectModal');
  if (m) m.classList.add('hidden');
}
window.openJoinDirect = openJoinDirect;
window.closeJoinDirect = closeJoinDirect;

$('#joinDirectClose') && $('#joinDirectClose').addEventListener('click', closeJoinDirect);
$('#joinDirectModal') && $('#joinDirectModal').addEventListener('click', e => {
  if (e.target === $('#joinDirectModal')) closeJoinDirect();
});
$('#joinDirectSubmitBtn') && $('#joinDirectSubmitBtn').addEventListener('click', () => {
  const code = ($('#joinDirectInput').value || '').trim().toUpperCase();
  if (!/^[A-Z0-9]{6}$/.test(code)) { showToast('6자리 코드를 입력해주세요', 'error'); return; }
  closeJoinDirect();
  quickJoinRoom(code);
});
$('#joinDirectInput') && $('#joinDirectInput').addEventListener('keydown', e => {
  if (e.key === 'Enter') $('#joinDirectSubmitBtn').click();
});

/* ═══════════════════════════════════════════
   AI 탭 전환
═══════════════════════════════════════════ */
function switchAiMode(mode) {
  const chatPanel = $('#aiChatPanel');
  const trPanel   = $('#aiTranslatePanel');
  const tabChat   = $('#tabAiChat');
  const tabTr     = $('#tabAiTr');
  if (!chatPanel || !trPanel) return;
  if (mode === 'chat') {
    chatPanel.classList.remove('hidden');
    trPanel.classList.add('hidden');
    if (tabChat) tabChat.classList.add('active');
    if (tabTr)   tabTr.classList.remove('active');
  } else {
    chatPanel.classList.add('hidden');
    trPanel.classList.remove('hidden');
    if (tabChat) tabChat.classList.remove('active');
    if (tabTr)   tabTr.classList.add('active');
  }
}
window.switchAiMode = switchAiMode;

/* ═══════════════════════════════════════════
   번역기
═══════════════════════════════════════════ */
(function initTranslator() {
  const LANG_NAMES = {
    auto: '자동 감지', ko: '한국어', en: '영어', ja: '일본어',
    de: '독일어', zh: '중국어', fr: '프랑스어', es: '스페인어'
  };
  let pendingImage = null;

  const input    = $('#trInput');
  const output   = $('#trOutput');
  const copyBtn  = $('#trCopyBtn');
  const charCnt  = $('#trCharCount');
  const imgInput   = $('#trImgInput');
  const imgPreview = $('#trImgPreview');
  const imgEl      = $('#trImgPreviewEl');
  const imgClear   = $('#trImgClear');
  const srcSel   = $('#trSrcLang');
  const tgtSel   = $('#trTgtLang');
  const swapBtn  = $('#trSwapBtn');
  if (!input) return;

  function clearOutput() {
    if (output) output.innerHTML = '<span class="tr-placeholder">번역</span>';
    if (copyBtn) copyBtn.classList.add('hidden');
  }

  /* 언어 스왑 */
  swapBtn && swapBtn.addEventListener('click', () => {
    const src = srcSel.value;
    const tgt = tgtSel.value;
    if (src === 'auto') return;
    srcSel.value = tgt;
    tgtSel.value = src;
    /* 텍스트도 스왑 */
    const outText = output.textContent.trim();
    const inText  = input.value.trim();
    if (outText && outText !== '번역') {
      input.value = outText;
      if (charCnt) charCnt.textContent = outText.length;
    }
    clearOutput();
  });

  /* 소스 언어 바뀌면 출력 초기화 */
  srcSel && srcSel.addEventListener('change', clearOutput);
  tgtSel && tgtSel.addEventListener('change', clearOutput);

  input.addEventListener('input', () => {
    if (charCnt) charCnt.textContent = input.value.length;
  });

  /* 이미지 업로드 */
  imgInput && imgInput.addEventListener('change', () => {
    const file = imgInput.files[0];
    if (!file) return;
    if (file.size > 4 * 1024 * 1024) { showToast('사진이 너무 커요 (최대 4MB)', 'error'); return; }
    const reader = new FileReader();
    reader.onload = (e) => {
      pendingImage = { dataUrl: e.target.result, mimeType: file.type };
      if (imgEl) imgEl.src = e.target.result;
      if (imgPreview) imgPreview.classList.remove('hidden');
      input.placeholder = '사진 속 글자를 자동으로 인식해요. 추가 설명을 입력해도 돼요.';
    };
    reader.readAsDataURL(file);
    imgInput.value = '';
  });

  imgClear && imgClear.addEventListener('click', () => {
    pendingImage = null;
    if (imgPreview) imgPreview.classList.add('hidden');
    if (imgEl) imgEl.src = '';
    input.placeholder = '입력, 말하기 또는 사진 촬영';
  });

  /* 번역 실행 */
  async function doTranslate() {
    const text = (input.value || '').trim();
    const srcLang = srcSel ? srcSel.value : 'auto';
    const tgtLang = tgtSel ? tgtSel.value : 'ko';
    const srcName = LANG_NAMES[srcLang] || srcLang;
    const tgtName = LANG_NAMES[tgtLang] || tgtLang;

    if (!text && !pendingImage) { showToast('번역할 텍스트를 입력하거나 사진을 올려주세요.', 'error'); return; }

    const btn = $('#trTranslateBtn');
    if (btn) { btn.disabled = true; btn.textContent = '번역 중…'; }
    if (output) output.innerHTML = '<span class="tr-loading">번역 중…</span>';

    try {
      let reply;
      const srcHint = srcLang === 'auto' ? '' : `입력 언어: ${srcName}. `;

      if (pendingImage) {
        const extra = text ? `\n추가 지시: ${text}` : '';
        const prompt = `${srcHint}이 사진 속의 글자를 모두 인식해서 ${tgtName}로만 번역해줘. 번역문만 출력해.${extra}`;
        const res = await fetch('/api/ai-vision', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ image: pendingImage.dataUrl, prompt }),
        });
        const data = await res.json();
        reply = data.reply || data.error || '번역 실패';
      } else {
        const prompt = `${srcHint}다음 텍스트를 ${tgtName}로만 번역해줘. 설명 없이 번역문만 출력해:\n${text}`;
        const res = await fetch('/api/ai', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ messages: [{ role: 'user', content: prompt }] }),
        });
        const data = await res.json();
        reply = data.reply || data.error || '번역 실패';
      }

      if (output) output.textContent = reply;
      if (copyBtn) copyBtn.classList.remove('hidden');
    } catch (e) {
      if (output) output.textContent = '네트워크 오류가 발생했어요.';
      showToast('번역 요청 실패', 'error');
    } finally {
      if (btn) { btn.disabled = false; btn.textContent = '번역하기'; }
    }
  }

  $('#trTranslateBtn') && $('#trTranslateBtn').addEventListener('click', doTranslate);
  input.addEventListener('keydown', e => { if (e.ctrlKey && e.key === 'Enter') doTranslate(); });
  copyBtn && copyBtn.addEventListener('click', () => { copyText(output.textContent, '번역 결과'); });
})();

/* ─── AI 빠른 질문 미니 모달 ─── */
function openAiQuickChat() {
  const m = $('#aiQuickModal');
  if (m) { m.classList.remove('hidden'); setTimeout(()=>$('#aiQuickInput') && $('#aiQuickInput').focus(),100); }
  $('#aiQuickResult') && ($('#aiQuickResult').style.display = 'none');
  $('#aiQuickInput') && ($('#aiQuickInput').value = '');
}
function closeAiQuickChat() {
  const m = $('#aiQuickModal');
  if (m) m.classList.add('hidden');
}
window.openAiQuickChat = openAiQuickChat;
window.closeAiQuickChat = closeAiQuickChat;

$('#aiQuickClose') && $('#aiQuickClose').addEventListener('click', closeAiQuickChat);
$('#aiQuickModal') && $('#aiQuickModal').addEventListener('click', e => {
  if (e.target === $('#aiQuickModal')) closeAiQuickChat();
});

async function sendAiQuick() {
  const inp = $('#aiQuickInput');
  const text = (inp.value || '').trim();
  if (!text) return;
  const btn = $('#aiQuickSendBtn');
  btn.disabled = true;
  btn.textContent = '답변 중…';
  const resultBox = $('#aiQuickResult');
  const resultText = $('#aiQuickResultText');
  resultBox.style.display = 'none';
  try {
    const r = await fetch('/api/ai', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages: [{ role: 'user', content: text }] }),
    });
    const data = await r.json();
    const reply = data.reply || data.error || '답변을 가져올 수 없어요.';
    resultText.textContent = reply;
    resultBox.style.display = 'block';
  } catch (err) {
    resultText.textContent = 'AI 연결이 원활하지 않아요. 잠시 후 다시 시도해주세요.';
    resultBox.style.display = 'block';
  } finally {
    btn.disabled = false;
    btn.textContent = '전송 →';
  }
}
$('#aiQuickSendBtn') && $('#aiQuickSendBtn').addEventListener('click', sendAiQuick);
$('#aiQuickInput') && $('#aiQuickInput').addEventListener('keydown', e => {
  if (e.key === 'Enter' && !e.shiftKey && !e.isComposing) { e.preventDefault(); sendAiQuick(); }
});

/* ═══════════════════════════════════════════════════════════
   커스텀 키보드 (채팅방 전용)
═══════════════════════════════════════════════════════════ */
(function initCustomKeyboard() {
  const wrap = document.getElementById('customKb');
  const inp  = document.getElementById('msgInput');
  if (!wrap || !inp) return;

  /* ── 레이아웃 정의 ── */
  const LAYOUTS = {
    en: [
      ['1','2','3','4','5','6','7','8','9','0'],
      ['q','w','e','r','t','y','u','i','o','p'],
      ['{A}','a','s','d','f','g','h','j','k','l','{A}'],
      ['{SHIFT}','z','x','c','v','b','n','m','{BACK}'],
      ['{SYM}','{KR}',',','{SPACE}','.', '{ENTER}'],
    ],
    en_s: [
      ['1','2','3','4','5','6','7','8','9','0'],
      ['Q','W','E','R','T','Y','U','I','O','P'],
      ['{A}','A','S','D','F','G','H','J','K','L','{A}'],
      ['{SHIFTS}','Z','X','C','V','B','N','M','{BACK}'],
      ['{SYM}','{KR}',',','{SPACE}','.', '{ENTER}'],
    ],
    kr: [
      ['1','2','3','4','5','6','7','8','9','0'],
      ['ㅂ','ㅈ','ㄷ','ㄱ','ㅅ','ㅛ','ㅕ','ㅑ','ㅐ','ㅔ'],
      ['{A}','ㅁ','ㄴ','ㅇ','ㄹ','ㅎ','ㅗ','ㅓ','ㅏ','ㅣ','{A}'],
      ['{SHIFT}','ㅋ','ㅌ','ㅊ','ㅍ','ㅠ','ㅜ','ㅡ','{BACK}'],
      ['{SYM}','{EN}',',','{SPACE}','.', '{ENTER}'],
    ],
    kr_s: [
      ['1','2','3','4','5','6','7','8','9','0'],
      ['ㅃ','ㅉ','ㄸ','ㄲ','ㅆ','ㅛ','ㅕ','ㅑ','ㅒ','ㅖ'],
      ['{A}','ㅁ','ㄴ','ㅇ','ㄹ','ㅎ','ㅗ','ㅓ','ㅏ','ㅣ','{A}'],
      ['{SHIFTS}','ㅋ','ㅌ','ㅊ','ㅍ','ㅠ','ㅜ','ㅡ','{BACK}'],
      ['{SYM}','{EN}',',','{SPACE}','.', '{ENTER}'],
    ],
    sym: [
      ['-','/',':', ';','(',')','\\u20A9','&','@','"'],
      ['.', ',','?','!', "'", '`','~','<','>','\\'],
      ['{A}','[',']','{','}','#','%','^','*','=','{A}'],
      ['{EN2}','_','+','|','$','€','£','{BACK}'],
      ['{KR}',',','{SPACE}','.', '{ENTER}'],
    ],
  };
  // sym 레이아웃 \\u20A9 실제 문자로 교체
  LAYOUTS.sym[0][6] = '₩';

  const SPECIAL = {
    '{SHIFT}' : { label: '⇧',  cls: 'sp sh'    },
    '{SHIFTS}': { label: '⇧',  cls: 'sp sh on' },
    '{BACK}'  : { label: '⌫',  cls: 'sp bk'    },
    '{ENTER}' : { label: '↩',  cls: 'sp en'    },
    '{SPACE}' : { label: ' ',       cls: 'sp sc'    },
    '{SYM}'   : { label: '!#1',     cls: 'sp md'    },
    '{KR}'    : { label: '한/영', cls: 'sp md' },
    '{EN}'    : { label: '영/한', cls: 'sp md' },
    '{EN2}'   : { label: 'ABC',     cls: 'sp md'    },
    '{A}'     : { label: '',        cls: 'pad'      },
  };

  /* ── 한글 IME 상수 ── */
  const CHO  = ['ㄱ','ㄲ','ㄴ','ㄷ','ㄸ','ㄹ','ㅁ','ㅂ','ㅃ','ㅅ','ㅆ','ㅇ','ㅈ','ㅉ','ㅊ','ㅋ','ㅌ','ㅍ','ㅎ'];
  const JUNG = ['ㅏ','ㅐ','ㅑ','ㅒ','ㅓ','ㅔ','ㅕ','ㅖ','ㅗ','ㅘ','ㅙ','ㅚ','ㅛ','ㅜ','ㅝ','ㅞ','ㅟ','ㅠ','ㅡ','ㅢ','ㅣ'];
  const JONG = ['','ㄱ','ㄲ','ㄳ','ㄴ','ㄵ','ㄶ','ㄷ','ㄹ','ㄺ','ㄻ','ㄼ','ㄽ','ㄾ','ㄿ','ㅀ','ㅁ','ㅂ','ㅄ','ㅅ','ㅆ','ㅇ','ㅈ','ㅊ','ㅋ','ㅌ','ㅍ','ㅎ'];

  const CI = {}; CHO.forEach((c,i)=>CI[c]=i);
  const JI = {}; JUNG.forEach((c,i)=>JI[c]=i);
  const KI = {}; JONG.forEach((c,i)=>KI[c]=i);

  const CV = {'ㅗ+ㅏ':'ㅘ','ㅗ+ㅐ':'ㅙ','ㅗ+ㅣ':'ㅚ','ㅜ+ㅓ':'ㅝ','ㅜ+ㅔ':'ㅞ','ㅜ+ㅣ':'ㅟ','ㅡ+ㅣ':'ㅢ'};
  const CC = {'ㄱ+ㅅ':'ㄳ','ㄴ+ㅈ':'ㄵ','ㄴ+ㅎ':'ㄶ','ㄹ+ㄱ':'ㄺ','ㄹ+ㅁ':'ㄻ','ㄹ+ㅂ':'ㄼ','ㄹ+ㅅ':'ㄽ','ㄹ+ㅌ':'ㄾ','ㄹ+ㅍ':'ㄿ','ㄹ+ㅎ':'ㅀ','ㅂ+ㅅ':'ㅄ'};
  const SC = {'ㄳ':['ㄱ','ㅅ'],'ㄵ':['ㄴ','ㅈ'],'ㄶ':['ㄴ','ㅎ'],'ㄺ':['ㄹ','ㄱ'],'ㄻ':['ㄹ','ㅁ'],'ㄼ':['ㄹ','ㅂ'],'ㄽ':['ㄹ','ㅅ'],'ㄾ':['ㄹ','ㅌ'],'ㄿ':['ㄹ','ㅍ'],'ㅀ':['ㄹ','ㅎ'],'ㅄ':['ㅂ','ㅅ']};
  const BV = {'ㅘ':'ㅗ','ㅙ':'ㅗ','ㅚ':'ㅗ','ㅝ':'ㅜ','ㅞ':'ㅜ','ㅟ':'ㅜ','ㅢ':'ㅡ'};

  /* ── 상태 ── */
  let mode = 'kr';
  let shifted = false;
  const IME = { cho: null, jung: null, jong: null };
  let imePos = -1;

  /* ── IME 헬퍼 ── */
  function syl(c, j, k) {
    return String.fromCharCode(0xAC00 + (CI[c] * 21 + JI[j]) * 28 + (k ? (KI[k] || 0) : 0));
  }
  function imeChar() {
    const { cho, jung, jong } = IME;
    if (!cho && !jung) return '';
    if (cho && !jung) return cho;
    return syl(cho, jung, jong || null);
  }
  function imeSync() {
    const c = imeChar();
    if (imePos < 0) imePos = inp.value.length;
    inp.value = inp.value.slice(0, imePos) + c;
  }
  function imeFlush() {
    if (imePos >= 0) {
      const c = imeChar();
      inp.value = inp.value.slice(0, imePos) + c;
    }
    IME.cho = null; IME.jung = null; IME.jong = null; imePos = -1;
  }

  function enInsert(ch) {
    const s = inp.selectionStart != null ? inp.selectionStart : inp.value.length;
    const e = inp.selectionEnd   != null ? inp.selectionEnd   : inp.value.length;
    inp.value = inp.value.slice(0, s) + ch + inp.value.slice(e);
    inp.setSelectionRange(s + ch.length, s + ch.length);
  }

  function krKey(key) {
    const isV = JI[key] !== undefined;
    const isC = CI[key] !== undefined || (KI[key] !== undefined && KI[key] > 0);
    const { cho, jung, jong } = IME;

    if (isV) {
      if (!cho) { imeFlush(); enInsert(key); }
      else if (!jung) { IME.jung = key; imeSync(); }
      else if (!jong) {
        const comp = CV[jung + '+' + key];
        if (comp) { IME.jung = comp; imeSync(); }
        else { imeFlush(); enInsert(key); }
      } else {
        const sp = SC[jong];
        if (sp) {
          IME.jong = sp[0]; inp.value = inp.value.slice(0, imePos) + imeChar();
          IME.cho = sp[1]; IME.jung = key; IME.jong = null; imePos = inp.value.length; imeSync();
        } else {
          const nc = jong; IME.jong = null;
          inp.value = inp.value.slice(0, imePos) + imeChar();
          IME.cho = nc; IME.jung = key; IME.jong = null; imePos = inp.value.length; imeSync();
        }
      }
    } else if (isC) {
      if (!cho && !jung) { imeFlush(); IME.cho = key; imePos = inp.value.length; imeSync(); }
      else if (cho && !jung) {
        inp.value = inp.value.slice(0, imePos) + cho;
        IME.cho = key; IME.jung = null; IME.jong = null; imePos = inp.value.length; imeSync();
      } else if (cho && jung && !jong) {
        if (KI[key] !== undefined && KI[key] > 0) { IME.jong = key; imeSync(); }
        else { imeFlush(); IME.cho = key; imePos = inp.value.length; imeSync(); }
      } else if (cho && jung && jong) {
        const comp = CC[jong + '+' + key];
        if (comp && KI[comp] !== undefined) { IME.jong = comp; imeSync(); }
        else { imeFlush(); IME.cho = key; imePos = inp.value.length; imeSync(); }
      }
    }
  }

  function krBack() {
    const { cho, jung, jong } = IME;
    if (!cho && !jung) { if (inp.value.length > 0) inp.value = inp.value.slice(0, -1); return; }
    if (jong) {
      const sp = SC[jong];
      IME.jong = sp ? sp[0] : null; imeSync();
    } else if (jung) {
      const bv = BV[jung];
      IME.jung = bv || null; imeSync();
    } else {
      inp.value = inp.value.slice(0, imePos);
      IME.cho = null; imePos = -1;
    }
  }

  /* ── 렌더링 ── */
  function curLayout() {
    if (mode === 'kr')  return shifted ? LAYOUTS.kr_s  : LAYOUTS.kr;
    if (mode === 'sym') return LAYOUTS.sym;
    return shifted ? LAYOUTS.en_s : LAYOUTS.en;
  }

  var _modeLabel = { en:'EN', kr:'KR', sym:'!#' };

  function render() {
    var modeTag = '<div class="ck-mode-bar"><span class="ck-mode-badge ck-mode-' + mode + '">'
      + _modeLabel[mode] + '</span></div>';

    var rows = curLayout().map(function(row) {
      var keys = row.map(function(k) {
        var info = SPECIAL[k];
        if (k === '{A}') return '<span class="ck-pad"></span>';
        var label = info ? info.label : k;
        var cls   = info ? 'ck-key ' + info.cls : 'ck-key';
        return '<button class="' + cls + '" data-key="' + k + '">' + label + '</button>';
      }).join('');
      return '<div class="ck-row">' + keys + '</div>';
    }).join('');

    wrap.innerHTML = modeTag + rows;
    // 레이아웃 전환 시 페이드 효과
    wrap.classList.remove('ck-fade');
    void wrap.offsetWidth; // reflow
    wrap.classList.add('ck-fade');
  }

  /* ── 키 처리 ── */
  function onKey(key) {
    inp.focus();
    switch (key) {
      case '{ENTER}':
        imeFlush();
        if (typeof sendMessage === 'function') sendMessage();
        return;
      case '{SPACE}':
        imeFlush();
        enInsert(' ');
        return;
      case '{BACK}':
        if (mode === 'kr') { krBack(); }
        else {
          var s = inp.selectionStart != null ? inp.selectionStart : inp.value.length;
          var e = inp.selectionEnd   != null ? inp.selectionEnd   : inp.value.length;
          if (s > 0) { inp.value = inp.value.slice(0, s - 1) + inp.value.slice(e); inp.setSelectionRange(s - 1, s - 1); }
        }
        return;
      case '{SHIFT}':
        shifted = true; render(); return;
      case '{SHIFTS}':
        shifted = false; render(); return;
      case '{SYM}':
        imeFlush(); mode = 'sym'; shifted = false; render(); return;
      case '{KR}':
        imeFlush(); mode = 'kr'; shifted = false; imePos = -1; render(); return;
      case '{EN}': case '{EN2}':
        imeFlush(); mode = 'en'; shifted = false; render(); return;
    }
    if (mode === 'kr' && /^[가-힣ㄱ-ㅎㅏ-ㅣ]$/.test(key)) {
      krKey(key);
    } else {
      if (mode === 'kr') imeFlush();
      enInsert(key);
      if (shifted && mode === 'en') { shifted = false; render(); }
    }
  }

  /* ── 이벤트 바인딩 ── */
  wrap.addEventListener('mousedown', function(e) {
    if (e.target.closest('[data-key]')) e.preventDefault();
  });
  wrap.addEventListener('touchstart', function(e) {
    if (e.target.closest('[data-key]')) e.preventDefault();
  }, { passive: false });
  wrap.addEventListener('click', function(e) {
    var b = e.target.closest('[data-key]');
    if (b) onKey(b.dataset.key);
  });

  /* 물리 키보드 지원 (데스크탑) */
  inp.removeAttribute('readonly');
  inp.addEventListener('keydown', function(e) {
    if (e.key === 'Enter' && !e.isComposing) { e.preventDefault(); imeFlush(); if (typeof sendMessage === 'function') sendMessage(); }
  });

  /* 채팅창 포커스 시 스크롤 최하단 */
  inp.addEventListener('focus', function() {
    setTimeout(function() {
      var ma = document.getElementById('messagesArea');
      if (ma) ma.scrollTop = ma.scrollHeight;
      wrap.scrollIntoView({ behavior: 'smooth', block: 'end' });
    }, 100);
  });

  render();
})();