/* ═══════════════════════════════════════════
   ANANAS MESSENGER v3 — script.js
═══════════════════════════════════════════ */

const socket = (typeof io !== 'undefined') ? io() : { emit:()=>{}, on:()=>{} };

// State
let myNickname   = '';
let myAvatar     = 'A';
let currentRoomCode = '';
let currentRoomName = '';
let selectedAvatar  = 'A';
let selectedCat     = 'chat';
let isHost          = false;
let onlineUsers     = [];
let allMessages     = []; // for search
let searchActive    = false;

/* ══════ SPLASH ══════ */
function exitSplash() {
  const splash = document.getElementById('splashScreen');
  const wrapper = document.getElementById('siteWrapper');
  if (!splash || splash.dataset.done) return;
  splash.dataset.done = '1';
  splash.classList.add('exit');
  wrapper.classList.add('visible');
  // Trigger curtain motion after wrapper visible
  setTimeout(() => {
    const title = document.querySelector('.hero-title');
    if (title) title.classList.add('curtain-ready');
  }, 200);
  setTimeout(() => { splash.style.display = 'none'; }, 700);
}

window.addEventListener('DOMContentLoaded', () => {
  const wrapper = document.getElementById('siteWrapper');
  const progressBar = document.getElementById('splashProgressBar');

  // Pre-position wrapper behind splash
  wrapper.classList.add('behind-splash');

  // Progress bar
  let progress = 0;
  const iv = setInterval(() => {
    progress += Math.random() * 9 + 2;
    if (progress >= 100) { progress = 100; clearInterval(iv); }
    progressBar.style.width = progress + '%';
  }, 60);

  // Merge letters
  setTimeout(() => {
    document.querySelector('.splash-logo-wrap')?.classList.add('merge');
  }, 950);

  // Exit
  setTimeout(() => {
    wrapper.classList.remove('behind-splash');
    exitSplash();
  }, 2100);

  // Hard fallback
  setTimeout(() => {
    wrapper.classList.remove('behind-splash');
    exitSplash();
    wrapper.style.opacity = '1';
    wrapper.style.transform = 'none';
  }, 3500);

  // Restore session
  const savedNick  = localStorage.getItem('ananas_nickname');
  const savedAv    = localStorage.getItem('ananas_avatar');
  const savedCode  = localStorage.getItem('ananas_room');
  const savedName  = localStorage.getItem('ananas_room_name');
  if (savedNick) {
    myNickname  = savedNick;
    myAvatar    = savedAv || 'A';
    currentRoomCode = savedCode || '';
    currentRoomName = savedName || '';
    document.getElementById('nicknameInput').value = savedNick;
    const pb = document.getElementById('powerBtn');
    if (pb) pb.querySelector('.power-label').textContent = '내 아지트';
  }

  // Recent rooms
  renderRecentRooms();

  // URL invite
  const p = new URLSearchParams(window.location.search);
  const rc = p.get('room');
  if (rc) {
    setTimeout(() => {
      openModal();
      document.getElementById('roomCodeInput').value = rc.toUpperCase();
      if (myNickname) { showStep(2); switchTab('join'); }
    }, 2400);
  }
});

// CSS behind-splash helper
const styleEl = document.createElement('style');
styleEl.textContent = `.behind-splash { opacity:0 !important; }`;
document.head.appendChild(styleEl);

/* ══════ PAGE SWITCH ══════ */
function switchPage(id) {
  const cur = document.querySelector('.page.active');
  const nav = document.querySelectorAll('.nav-btn');
  nav.forEach(b => b.classList.toggle('active', b.dataset.page === id));
  if (cur && cur.id !== `page-${id}`) {
    cur.classList.add('page-exit');
    setTimeout(() => {
      cur.classList.remove('active','page-exit'); cur.classList.add('hidden');
      const next = document.getElementById(`page-${id}`);
      if (next) { next.classList.remove('hidden'); next.classList.add('active','page-enter'); setTimeout(()=>next.classList.remove('page-enter'),500); }
      window.scrollTo({top:0,behavior:'smooth'});
    }, 200);
  }
  return false;
}
window.switchPage = switchPage;

/* ══════ ROOMS FILTER ══════ */
window.filterRooms = function(tag, btn) {
  document.querySelectorAll('.room-filter').forEach(f=>f.classList.remove('active'));
  btn.classList.add('active');
  document.querySelectorAll('.room-card').forEach(c => {
    const show = tag==='all' || c.dataset.tag===tag || c.classList.contains('card-new');
    c.style.display = show ? '' : 'none';
    if (show) c.style.animation = 'pageIn 0.3s ease both';
  });
};

/* ══════ MODAL ══════ */
function openModal() {
  document.getElementById('talkModal').classList.remove('hidden');
  showStep(1);
  if (myNickname) document.getElementById('nicknameInput').value = myNickname;
}
function closeModal() {
  const overlay = document.getElementById('talkModal');
  const card    = document.getElementById('talkModalCard');
  card.style.cssText = 'transform:scale(0.88);opacity:0;transition:transform 0.22s ease,opacity 0.22s ease;';
  setTimeout(() => { overlay.classList.add('hidden'); card.style.cssText=''; }, 220);
}
function showStep(n) {
  [1,2,3].forEach(i => {
    const el = document.getElementById(`step${i}`);
    if (el) el.classList.toggle('hidden', i!==n);
  });
}
window.goBack = (from) => showStep(from-1);
window.goToJoinStep = function() {
  const nick = document.getElementById('nicknameInput').value.trim();
  if (!nick) { showToast('닉네임을 먼저 입력해주세요!','error'); return false; }
  myNickname = nick; myAvatar = selectedAvatar; showStep(2); switchTab('join'); return false;
};
window.switchTab = function(tab) {
  const cp = document.getElementById('createPanel');
  const jp = document.getElementById('joinPanel');
  const tc = document.getElementById('tabCreate');
  const tj = document.getElementById('tabJoin');
  if (tab==='create') { cp.classList.remove('hidden'); jp.classList.add('hidden'); tc.classList.add('active'); tj.classList.remove('active'); }
  else                { cp.classList.add('hidden'); jp.classList.remove('hidden'); tc.classList.remove('active'); tj.classList.add('active'); document.getElementById('roomCodeInput').focus(); }
};
window.selectAvatar = function(btn) {
  document.querySelectorAll('.avatar-btn').forEach(b=>b.classList.remove('active'));
  btn.classList.add('active');
  selectedAvatar = btn.dataset.emoji;
};
window.selectCat = function(btn) {
  document.querySelectorAll('.cat-btn').forEach(b=>b.classList.remove('active'));
  btn.classList.add('active');
  selectedCat = btn.dataset.cat;
};

document.getElementById('powerBtn').addEventListener('click', openModal);
document.getElementById('modalClose').addEventListener('click', closeModal);
document.getElementById('talkModal').addEventListener('click', e => { if (e.target===document.getElementById('talkModal')) closeModal(); });

document.getElementById('toStep2Btn').addEventListener('click', () => {
  const nick = document.getElementById('nicknameInput').value.trim();
  if (!nick) { showToast('닉네임을 입력해주세요!','error'); return; }
  myNickname = nick; myAvatar = selectedAvatar; showStep(2);
  document.getElementById('roomNameInput').focus();
});

document.getElementById('createRoomBtn').addEventListener('click', () => {
  const name = document.getElementById('roomNameInput').value.trim();
  const desc = document.getElementById('roomDescInput').value.trim();
  if (!name) { showToast('채팅방 이름을 입력해주세요!','error'); return; }
  currentRoomName = name;
  isHost = true;
  socket.emit('createRoom', { nickname:myNickname, roomName:name, roomDesc:desc, category:selectedCat, avatar:myAvatar });
});

document.getElementById('joinRoomBtn').addEventListener('click', () => {
  const code = document.getElementById('roomCodeInput').value.trim().toUpperCase();
  if (!code || code.length!==6) { showToast('6자리 코드를 입력해주세요!','error'); return; }
  isHost = false;
  socket.emit('joinRoom', { nickname:myNickname, code, avatar:myAvatar });
});

document.getElementById('roomCodeInput').addEventListener('input', e => {
  e.target.value = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g,'').slice(0,6);
});

document.getElementById('enterRoomBtn').addEventListener('click', () => { closeModal(); launchChatApp(); });

/* ══════ SOCKET EVENTS ══════ */
socket.on('roomCreated', ({ code, roomName }) => {
  currentRoomCode = code; currentRoomName = roomName;
  saveSession(); saveRecentRoom(code, roomName);
  document.getElementById('inviteCodeDisplay').textContent = code;
  document.getElementById('createdRoomNameDisplay').textContent = `"${roomName}" 채팅방이 생성되었습니다`;
  document.getElementById('inviteLinkDisplay').textContent = `${location.origin}${location.pathname}?room=${code}`;
  showStep(3);
  // Auto copy invite link
  navigator.clipboard.writeText(`${location.origin}${location.pathname}?room=${code}`).then(()=>showToast('초대 링크가 자동 복사되었습니다!','success')).catch(()=>{});
});

socket.on('roomJoined', ({ code, roomName }) => {
  currentRoomCode = code; currentRoomName = roomName;
  saveSession(); saveRecentRoom(code, roomName);
  closeModal(); launchChatApp();
  showToast(`"${roomName}" 아지트에 합류했어요!`,'success');
});

socket.on('joinError', msg => showToast(msg,'error'));

socket.on('messageHistory', messages => {
  messages.forEach(m => renderMessage(m.user, m.avatar, m.text, m.time, false, m.isImage));
});

socket.on('message', data => {
  renderMessage(data.user, data.avatar, data.text, data.time, false, data.isImage);
  if (data.user !== 'system') playBeep();
});

socket.on('onlineUsers', users => {
  onlineUsers = users;
  updateOnlineCount();
});

socket.on('notice', text => {
  showNotice(text);
});

/* ══════ LAUNCH CHAT ══════ */
function launchChatApp() {
  const app = document.getElementById('chatApp');
  app.classList.remove('hidden');
  allMessages = [];
  document.getElementById('myNicknameDisplay').textContent = myNickname;
  document.getElementById('currentRoomDisplay').textContent = currentRoomName;
  document.getElementById('currentCodeDisplay').textContent = `코드: ${currentRoomCode}`;
  document.getElementById('chatRoomTitle').textContent = currentRoomName;
  document.getElementById('chatRoomCode').textContent = `코드: ${currentRoomCode}`;
  setTimeout(() => document.getElementById('msgInput').focus(), 200);
}

/* ══════ SEND MESSAGE ══════ */
function sendMessage() {
  const input = document.getElementById('msgInput');
  const text  = input.value.trim();
  if (!text) return;
  renderMessage(myNickname, myAvatar, text, Date.now(), true, false);
  socket.emit('chatMessage', text);
  input.value = ''; input.focus();
}
document.getElementById('sendBtn').addEventListener('click', sendMessage);
document.getElementById('msgInput').addEventListener('keydown', e => {
  if (e.key==='Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
});

/* ══════ IMAGE SEND ══════ */
document.getElementById('imageFileInput').addEventListener('change', e => {
  const file = e.target.files[0];
  if (!file) return;
  if (file.size > 5*1024*1024) { showToast('5MB 이하 이미지만 전송 가능합니다','error'); return; }
  const reader = new FileReader();
  reader.onload = ev => {
    const dataUrl = ev.target.result;
    renderMessage(myNickname, myAvatar, dataUrl, Date.now(), true, true);
    socket.emit('chatMessage', dataUrl, true);
    socket.emit('imageMessage', dataUrl);
  };
  reader.readAsDataURL(file);
  e.target.value = '';
});

/* ══════ RENDER MESSAGE ══════ */
function renderMessage(user, avatar, text, time, isMine, isImage) {
  const area  = document.getElementById('messagesArea');
  const empty = document.getElementById('messagesEmpty');
  if (empty) empty.style.display = 'none';

  // Store for search
  allMessages.push({ user, text, time, isMine, isImage, el:null });

  const item = document.createElement('div');
  item.className = 'msg-item';

  if (user === 'system') {
    item.classList.add('system-msg');
    const bub = document.createElement('div');
    bub.className = 'msg-bubble';
    bub.textContent = text;
    item.appendChild(bub);
  } else if (isMine) {
    item.classList.add('mine');
    const body = document.createElement('div');
    body.className = 'msg-body';
    if (isImage) {
      const img = document.createElement('img');
      img.src = text; img.className = 'msg-img';
      img.onclick = () => window.open(text,'_blank');
      body.appendChild(img);
    } else {
      const bub = document.createElement('div');
      bub.className = 'msg-bubble';
      bub.textContent = text;
      body.appendChild(bub);
    }
    const t = document.createElement('div');
    t.className = 'msg-time'; t.textContent = fmt(time);
    body.appendChild(t);
    item.appendChild(body);
  } else {
    item.classList.add('theirs');
    const avWrap = document.createElement('div');
    avWrap.className = 'msg-avatar-wrap';
    const av = document.createElement('div');
    av.className = 'msg-avatar';
    const avImg = document.createElement('img');
    avImg.src = avatarSrc(avatar); avImg.alt = user;
    av.appendChild(avImg); avWrap.appendChild(av);

    const body = document.createElement('div');
    body.className = 'msg-body';
    const sn = document.createElement('div');
    sn.className = 'msg-sender-name'; sn.textContent = user;
    body.appendChild(sn);

    if (isImage) {
      const img = document.createElement('img');
      img.src = text; img.className = 'msg-img';
      img.onclick = () => window.open(text,'_blank');
      body.appendChild(img);
    } else {
      const bub = document.createElement('div');
      bub.className = 'msg-bubble'; bub.textContent = text;
      body.appendChild(bub);
    }
    const t = document.createElement('div');
    t.className = 'msg-time'; t.textContent = fmt(time);
    body.appendChild(t);

    item.appendChild(avWrap); item.appendChild(body);
  }

  allMessages[allMessages.length-1].el = item;
  area.appendChild(item);
  area.scrollTop = area.scrollHeight;
}

function avatarSrc(av) {
  if (av === 'A' || av === 'B') return './images/hero.png';
  return './images/elements.png';
}

function fmt(ts) {
  if (!ts) return '';
  return new Date(ts).toLocaleTimeString('ko-KR',{hour:'2-digit',minute:'2-digit'});
}

/* ══════ SEARCH ══════ */
document.getElementById('searchToggleBtn').addEventListener('click', () => {
  const bar = document.getElementById('searchBar');
  bar.classList.toggle('hidden');
  if (!bar.classList.contains('hidden')) {
    searchActive = true;
    document.getElementById('searchInput').focus();
  } else {
    clearSearch();
  }
});
document.getElementById('searchCloseBtn').addEventListener('click', () => {
  document.getElementById('searchBar').classList.add('hidden');
  clearSearch();
});
document.getElementById('searchInput').addEventListener('input', e => {
  const q = e.target.value.trim().toLowerCase();
  doSearch(q);
});

function doSearch(q) {
  // Remove all highlights first
  document.querySelectorAll('.msg-highlight').forEach(el => {
    const parent = el.parentNode;
    parent.replaceChild(document.createTextNode(el.textContent), el);
    parent.normalize();
  });
  if (!q) {
    allMessages.forEach(m => { if (m.el) m.el.style.opacity = ''; });
    return;
  }
  allMessages.forEach(m => {
    if (!m.el || m.isImage || m.user==='system') { if (m.el) m.el.style.opacity='0.3'; return; }
    const match = m.text.toLowerCase().includes(q);
    m.el.style.opacity = match ? '1' : '0.25';
    if (match) {
      const bub = m.el.querySelector('.msg-bubble');
      if (bub) highlightText(bub, q);
    }
  });
  // Scroll to first match
  const first = allMessages.find(m => m.el && m.el.style.opacity==='1' && !m.isImage && m.user!=='system');
  if (first?.el) first.el.scrollIntoView({ behavior:'smooth', block:'center' });
}

function highlightText(el, q) {
  const text = el.textContent;
  const idx  = text.toLowerCase().indexOf(q);
  if (idx === -1) return;
  const before = document.createTextNode(text.slice(0, idx));
  const mark   = document.createElement('mark');
  mark.className = 'msg-highlight';
  mark.textContent = text.slice(idx, idx + q.length);
  const after = document.createTextNode(text.slice(idx + q.length));
  el.textContent = '';
  el.appendChild(before); el.appendChild(mark); el.appendChild(after);
}

function clearSearch() {
  searchActive = false;
  document.getElementById('searchInput').value = '';
  document.querySelectorAll('.msg-highlight').forEach(el => {
    const parent = el.parentNode;
    parent.replaceChild(document.createTextNode(el.textContent), el);
    parent.normalize();
  });
  allMessages.forEach(m => { if (m.el) m.el.style.opacity = ''; });
}

/* ══════ NOTICE (공지 고정) ══════ */
function showNotice(text) {
  const bar  = document.getElementById('noticeBar');
  const noticeText = document.getElementById('noticeText');
  noticeText.textContent = text;
  bar.classList.remove('hidden');
}
document.getElementById('noticeClose').addEventListener('click', () => {
  document.getElementById('noticeBar').classList.add('hidden');
});

// 방장이 메시지 우클릭 → 공지 설정 (context menu)
document.getElementById('messagesArea').addEventListener('contextmenu', e => {
  if (!isHost) return;
  const bub = e.target.closest('.msg-bubble');
  if (!bub) return;
  e.preventDefault();
  const text = bub.textContent;
  socket.emit('setNotice', text);
  showNotice(text);
  showToast('공지로 설정되었습니다','success');
});

/* ══════ ONLINE COUNT ══════ */
function updateOnlineCount() {
  const cnt = onlineUsers.length || 1;
  const text = `${cnt}명 접속 중`;
  const el1 = document.getElementById('onlineCount');
  const el2 = document.getElementById('chatOnlineCount');
  if (el1) el1.textContent = text;
  if (el2) el2.textContent = `${cnt}명`;
  // Update member list
  const list = document.getElementById('onlineMembersList');
  if (list) {
    list.innerHTML = '';
    onlineUsers.forEach(u => {
      const div = document.createElement('div');
      div.className = 'online-member-item';
      div.innerHTML = `<div class="om-avatar"><img src="${avatarSrc(u.avatar)}" alt="${u.nickname}"></div><div class="om-name">${u.nickname}</div>`;
      list.appendChild(div);
    });
  }
}

/* ══════ CHAT CONTROLS ══════ */
document.getElementById('toHomeBtn').addEventListener('click', () => document.getElementById('chatApp').classList.add('hidden'));
document.getElementById('chatHomeBtn').addEventListener('click', () => document.getElementById('chatApp').classList.add('hidden'));

document.getElementById('chatLogoutBtn').addEventListener('click', () => {
  socket.emit('leaveRoom');
  localStorage.removeItem('ananas_nickname'); localStorage.removeItem('ananas_avatar');
  localStorage.removeItem('ananas_room'); localStorage.removeItem('ananas_room_name');
  myNickname=''; myAvatar='A'; currentRoomCode=''; currentRoomName='';
  document.getElementById('chatApp').classList.add('hidden');
  document.getElementById('powerBtn').querySelector('.power-label').textContent = '톡 시작';
  const area = document.getElementById('messagesArea');
  area.innerHTML = '<div class="messages-empty-state" id="messagesEmpty"><img src="./images/hero.png" class="empty-pixel-img" alt=""><p>아직 대화가 없어요.<br>첫 메시지를 보내보세요!</p></div>';
  allMessages = [];
  showToast('로그아웃되었습니다');
});

document.getElementById('shareInviteBtn').addEventListener('click', () => {
  const link = `${location.origin}${location.pathname}?room=${currentRoomCode}`;
  navigator.clipboard.writeText(link).then(()=>showToast('초대 링크가 복사되었습니다!','success')).catch(()=>showToast(`코드: ${currentRoomCode}`));
});

document.getElementById('showCodeBtn').addEventListener('click', copyCode);

/* ══════ COPY ══════ */
window.copyCode = function() {
  const code = document.getElementById('inviteCodeDisplay')?.textContent || currentRoomCode;
  if (!code || code==='------') { showToast('코드가 없습니다','error'); return; }
  navigator.clipboard.writeText(code).then(() => {
    showToast('코드가 복사되었습니다!','success');
    const btn = document.getElementById('copyCodeBtn');
    if (btn) { btn.textContent='완료!'; setTimeout(()=>btn.textContent='복사',2000); }
  });
};
window.copyLink = function() {
  const link = document.getElementById('inviteLinkDisplay')?.textContent;
  if (link) navigator.clipboard.writeText(link).then(()=>showToast('링크가 복사되었습니다!','success'));
};

/* ══════ QUICK JOIN ══════ */
window.quickJoinRoom = function(name, tag, desc) {
  if (!myNickname) {
    openModal();
    setTimeout(()=>{ document.getElementById('roomNameInput').value=name; document.getElementById('roomDescInput').value=desc||''; }, 100);
    return;
  }
  openModal(); showStep(2);
  document.getElementById('roomNameInput').value = name;
  document.getElementById('roomDescInput').value = desc||'';
};

/* ══════ RECENT ROOMS ══════ */
function saveRecentRoom(code, name) {
  let list = JSON.parse(localStorage.getItem('ananas_recent')||'[]');
  list = list.filter(r=>r.code!==code);
  list.unshift({ code, name });
  list = list.slice(0,5);
  localStorage.setItem('ananas_recent', JSON.stringify(list));
  renderRecentRooms();
}
function renderRecentRooms() {
  const list = JSON.parse(localStorage.getItem('ananas_recent')||'[]');
  const wrap = document.getElementById('recentRoomsWrap');
  const cont = document.getElementById('recentRoomsList');
  if (!list.length) { wrap.style.display='none'; return; }
  wrap.style.display='block';
  cont.innerHTML = '';
  list.forEach(r => {
    const chip = document.createElement('button');
    chip.className = 'recent-chip';
    chip.textContent = r.name;
    chip.onclick = () => {
      if (!myNickname) { openModal(); setTimeout(()=>{ document.getElementById('roomCodeInput').value=r.code; switchTab('join'); },100); return; }
      openModal(); showStep(2); switchTab('join');
      document.getElementById('roomCodeInput').value = r.code;
    };
    cont.appendChild(chip);
  });
}

/* ══════ SESSION ══════ */
function saveSession() {
  localStorage.setItem('ananas_nickname', myNickname);
  localStorage.setItem('ananas_avatar',   myAvatar);
  localStorage.setItem('ananas_room',     currentRoomCode);
  localStorage.setItem('ananas_room_name',currentRoomName);
  const pb = document.getElementById('powerBtn');
  if (pb) pb.querySelector('.power-label').textContent = '내 아지트';
}

/* ══════ SOUND ══════ */
function playBeep() {
  try {
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain); gain.connect(ctx.destination);
    osc.frequency.value = 880; gain.gain.value = 0.04;
    osc.start();
    setTimeout(()=>{ gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime+0.18); osc.stop(ctx.currentTime+0.18); }, 10);
  } catch(e) {}
}

/* ══════ TOAST ══════ */
function showToast(msg, type='') {
  const c = document.getElementById('toastContainer');
  const t = document.createElement('div');
  t.className = `toast${type?' toast-'+type:''}`;
  t.textContent = msg;
  c.appendChild(t);
  setTimeout(()=>t.remove(), 3200);
}
window.showToast = showToast;

/* ══════ KEYBOARD ══════ */
document.addEventListener('keydown', e => {
  if (e.key==='Escape') {
    const modal = document.getElementById('talkModal');
    if (!modal.classList.contains('hidden')) closeModal();
  }
});

/* ══════ HEADER SCROLL ══════ */
window.addEventListener('scroll', () => {
  const h = document.getElementById('siteHeader');
  if (h) h.style.boxShadow = window.scrollY > 8 ? '0 2px 18px rgba(0,0,0,0.05)' : 'none';
}, { passive:true });

/* ══════ INTERSECTION REVEAL ══════ */
const obs = new IntersectionObserver(entries => {
  entries.forEach(e => {
    if (e.isIntersecting) { e.target.style.animation='pageIn 0.5s ease both'; obs.unobserve(e.target); }
  });
}, { threshold:0.08 });
document.querySelectorAll('.hcard,.feature-card,.room-card,.tl-item').forEach(el=>obs.observe(el));