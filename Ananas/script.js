/* ═══════════════════════════════════════════
   ANANAS v4 — script.js
═══════════════════════════════════════════ */
const socket = (typeof io !== 'undefined') ? io() : {emit:()=>{},on:()=>{}};

let myNickname='', myAvatar='A', selectedAvatar='A', selectedCat='chat';
let currentRoomCode='', currentRoomName='', isHost=false;
let onlineUsers=[], allMessages=[];

/* ════ HALFTONE RENDERER ════ */
function drawHalftone(canvas, shape, size, color) {
  color = color || '#111111';
  canvas.width  = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, size, size);

  // Draw shape mask to offscreen
  const off = document.createElement('canvas');
  off.width = off.height = size;
  const oc = off.getContext('2d');
  oc.fillStyle = '#000';

  const s = size;
  if (shape === 'pineapple') {
    // Body oval
    oc.beginPath();
    oc.ellipse(s*0.5, s*0.62, s*0.32, s*0.38, 0, 0, Math.PI*2);
    oc.fill();
    // Leaf 1 - center top
    oc.beginPath();
    oc.ellipse(s*0.5, s*0.22, s*0.06, s*0.22, 0, 0, Math.PI*2);
    oc.fill();
    // Leaf 2 - left
    oc.beginPath();
    oc.ellipse(s*0.35, s*0.26, s*0.05, s*0.18, -0.5, 0, Math.PI*2);
    oc.fill();
    // Leaf 3 - right
    oc.beginPath();
    oc.ellipse(s*0.65, s*0.26, s*0.05, s*0.18, 0.5, 0, Math.PI*2);
    oc.fill();
  } else if (shape === 'chat') {
    // Speech bubble
    const r = s * 0.14;
    const x1=s*0.08, y1=s*0.12, x2=s*0.92, y2=s*0.72;
    oc.beginPath();
    oc.moveTo(x1+r, y1);
    oc.lineTo(x2-r, y1);
    oc.quadraticCurveTo(x2, y1, x2, y1+r);
    oc.lineTo(x2, y2-r);
    oc.quadraticCurveTo(x2, y2, x2-r, y2);
    oc.lineTo(s*0.52, y2);
    oc.lineTo(s*0.38, s*0.88);
    oc.lineTo(s*0.32, y2);
    oc.lineTo(x1+r, y2);
    oc.quadraticCurveTo(x1, y2, x1, y2-r);
    oc.lineTo(x1, y1+r);
    oc.quadraticCurveTo(x1, y1, x1+r, y1);
    oc.closePath();
    oc.fill();
  } else if (shape === 'heart') {
    oc.beginPath();
    oc.moveTo(s*0.5, s*0.75);
    oc.bezierCurveTo(s*0.1, s*0.5, s*0.1, s*0.2, s*0.5, s*0.35);
    oc.bezierCurveTo(s*0.9, s*0.2, s*0.9, s*0.5, s*0.5, s*0.75);
    oc.fill();
  }

  // Get mask pixels
  const maskData = oc.getImageData(0, 0, s, s);

  // Draw halftone dots where mask is filled
  const dotSize = Math.max(2, s / 38);
  const gap     = dotSize * 1.7;
  const cols    = Math.ceil(s / gap);
  const rows    = Math.ceil(s / gap);

  ctx.fillStyle = color;
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const cx = col * gap + gap / 2;
      const cy = row * gap + gap / 2;
      const px = Math.min(Math.floor(cx), s - 1);
      const py = Math.min(Math.floor(cy), s - 1);
      const idx = (py * s + px) * 4;
      if (maskData.data[idx + 3] > 128) {
        // Distance from center for size variation
        const dx = (cx - s/2) / (s/2);
        const dy = (cy - s/2) / (s/2);
        const dist = Math.sqrt(dx*dx + dy*dy);
        const r = dotSize * (1 - dist * 0.4);
        if (r > 0.5) {
          ctx.beginPath();
          ctx.arc(cx, cy, r, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }
  }
}

function initAllCanvases() {
  document.querySelectorAll('canvas[data-shape]').forEach(canvas => {
    const shape = canvas.dataset.shape;
    const size  = parseInt(canvas.dataset.size) || 100;
    const color = canvas.dataset.color || '#111111';
    canvas.style.width  = size + 'px';
    canvas.style.height = size + 'px';
    drawHalftone(canvas, shape, size, color);
  });
}

/* ════ INTRO ANIMATION ════ */
(function initIntro() {
  // Draw all halftone canvases first
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initAllCanvases);
  } else {
    initAllCanvases();
  }

  const sc1 = document.getElementById('scene1');
  const sc2 = document.getElementById('scene2');
  const sc3 = document.getElementById('scene3');
  const wrapper = document.getElementById('siteWrapper');

  function exitIntro() {
    if (sc3 && sc3._done) return;
    if (sc3) sc3._done = true;

    // 1. 인트로 페이드아웃
    const introEl = document.getElementById('introScreen');
    introEl.style.transition = 'opacity 0.6s ease';
    introEl.style.opacity = '0';
    introEl.style.pointerEvents = 'none';

    // 2. 인트로 완전히 사라진 후 메인 표시
    setTimeout(() => {
      introEl.style.display = 'none';

      // 메인 표시 + 페이드인
      wrapper.style.display = 'block';
      // 브라우저 리플로우 강제
      wrapper.offsetHeight;
      wrapper.classList.add('fade-in');
      wrapper.classList.add('visible');

      // 커튼 모션 트리거
      setTimeout(() => {
        const t = document.querySelector('.hero-title');
        if (t) t.classList.add('cr');
      }, 200);
    }, 650);
  }

  // Enter / Skip buttons
  const enterBtn = document.getElementById('introEnterBtn');
  const skipBtn  = document.getElementById('introSkip');
  if (enterBtn) enterBtn.addEventListener('click', exitIntro);
  if (skipBtn) skipBtn.addEventListener('click', exitIntro);

  // ── 씬1 → 씬2 전환 (2.8초 후) ──
  setTimeout(() => {
    if (sc1) { sc1.classList.add('exit-white'); }
    setTimeout(() => {
      if (sc1) sc1.style.display = 'none';
      if (sc2) sc2.classList.remove('hidden');
      // Init sc2 big canvas
      const sc2Canvas = document.getElementById('sc2BigCanvas');
      if (sc2Canvas) drawHalftone(sc2Canvas, 'pineapple', 520, '#FFDB00');
      // 카피 라인 순차 활성화
      activateCopyLines();
    }, 700);
  }, 2800);

  function activateCopyLines() {
    const lines = document.querySelectorAll('.sc2-line');
    lines.forEach((line, i) => {
      setTimeout(() => {
        // 이전 active 제거
        lines.forEach(l => l.classList.remove('active'));
        line.classList.add('active');
        // 마지막 줄 활성화 후 씬3으로
        if (i === lines.length - 1) {
          setTimeout(goToScene3, 1200);
        }
      }, i * 900);
    });
  }

  function goToScene3() {
    if (sc2) { sc2.style.animation = 'exitWhite 0.6s ease forwards'; }
    setTimeout(() => {
      if (sc2) sc2.style.display = 'none';
      if (sc3) sc3.classList.remove('hidden');
      const sc3Canvas = document.getElementById('sc3Canvas');
      if (sc3Canvas) drawHalftone(sc3Canvas, 'pineapple', 360, '#FFDB00');
    }, 600);
  }

  // 전체 최대 시간 초과 fallback
  setTimeout(() => { exitIntro(); }, 14000);

  // Restore session
  const savedNick = localStorage.getItem('ananas_nickname');
  const savedAv   = localStorage.getItem('ananas_avatar');
  const savedCode = localStorage.getItem('ananas_room');
  const savedName = localStorage.getItem('ananas_room_name');
  if (savedNick) {
    myNickname = savedNick; myAvatar = savedAv || 'A';
    currentRoomCode = savedCode || ''; currentRoomName = savedName || '';
    const nicknameInput = document.getElementById('nicknameInput');
    if (nicknameInput) nicknameInput.value = savedNick;
    const pb = document.getElementById('powerBtn');
    if (pb) pb.querySelector('.power-label').textContent = '내 아지트';
  }
  renderRecentRooms();

  // URL invite code
  const p = new URLSearchParams(location.search);
  const rc = p.get('room');
  if (rc) {
    setTimeout(() => {
      exitIntro();
      openModal();
      document.getElementById('roomCodeInput').value = rc.toUpperCase();
      if (myNickname) { showStep(2); switchTab('join'); }
    }, 500);
  }
})();

/* ════ PAGE SWITCH ════ */
function switchPage(id){
  const cur=document.querySelector('.page.active');
  document.querySelectorAll('.nav-btn').forEach(b=>b.classList.toggle('active',b.dataset.page===id));
  if(cur && cur.id!==`page-${id}`){
    cur.classList.add('page-exit');
    setTimeout(()=>{
      cur.classList.remove('active','page-exit'); cur.classList.add('hidden');
      const next=document.getElementById(`page-${id}`);
      if(next){next.classList.remove('hidden');next.classList.add('active','page-enter');setTimeout(()=>next.classList.remove('page-enter'),500);}
      window.scrollTo({top:0,behavior:'smooth'});
    },200);
  }
  return false;
}
window.switchPage=switchPage;

/* ════ ROOMS FILTER ════ */
window.filterRooms=function(tag,btn){
  document.querySelectorAll('.rf').forEach(f=>f.classList.remove('active'));
  btn.classList.add('active');
  document.querySelectorAll('.room-card').forEach(c=>{
    const show=tag==='all'||c.dataset.tag===tag||c.classList.contains('rc-new');
    c.style.display=show?'':'none';
    if(show) c.style.animation='pgIn 0.3s ease both';
  });
};

/* ════ MODAL ════ */
function openModal(){
  document.getElementById('talkModal').classList.remove('hidden');
  showStep(1);
  if(myNickname) document.getElementById('nicknameInput').value=myNickname;
}
function closeModal(){
  const o=document.getElementById('talkModal');
  const c=document.getElementById('talkModalCard');
  c.style.cssText='transform:scale(0.88);opacity:0;transition:transform 0.22s ease,opacity 0.22s ease;';
  setTimeout(()=>{o.classList.add('hidden');c.style.cssText='';},220);
}
function showStep(n){[1,2,3].forEach(i=>{const e=document.getElementById(`step${i}`);if(e)e.classList.toggle('hidden',i!==n);});}
window.goBack=from=>showStep(from-1);
window.goToJoinStep=function(){
  const nick=document.getElementById('nicknameInput').value.trim();
  if(!nick){showToast('닉네임을 입력해주세요','error');return false;}
  myNickname=nick;myAvatar=selectedAvatar;showStep(2);switchTab('join');return false;
};
window.switchTab=function(tab){
  const cp=document.getElementById('createPanel'),jp=document.getElementById('joinPanel');
  const tc=document.getElementById('tabCreate'),tj=document.getElementById('tabJoin');
  if(tab==='create'){cp.classList.remove('hidden');jp.classList.add('hidden');tc.classList.add('active');tj.classList.remove('active');}
  else{cp.classList.add('hidden');jp.classList.remove('hidden');tc.classList.remove('active');tj.classList.add('active');document.getElementById('roomCodeInput').focus();}
};
window.selectAvatar=function(btn){document.querySelectorAll('.av-btn').forEach(b=>b.classList.remove('active'));btn.classList.add('active');selectedAvatar=btn.dataset.emoji;};
window.selectCat=function(btn){document.querySelectorAll('.cat').forEach(b=>b.classList.remove('active'));btn.classList.add('active');selectedCat=btn.dataset.cat;};

document.getElementById('powerBtn').addEventListener('click',openModal);
document.getElementById('modalClose').addEventListener('click',closeModal);
document.getElementById('talkModal').addEventListener('click',e=>{if(e.target===document.getElementById('talkModal'))closeModal();});
document.getElementById('toStep2Btn').addEventListener('click',()=>{
  const nick=document.getElementById('nicknameInput').value.trim();
  if(!nick){showToast('닉네임을 입력해주세요','error');return;}
  myNickname=nick;myAvatar=selectedAvatar;showStep(2);document.getElementById('roomNameInput').focus();
});
document.getElementById('createRoomBtn').addEventListener('click',()=>{
  const name=document.getElementById('roomNameInput').value.trim();
  const desc=document.getElementById('roomDescInput').value.trim();
  if(!name){showToast('채팅방 이름을 입력해주세요','error');return;}
  currentRoomName=name;isHost=true;
  socket.emit('createRoom',{nickname:myNickname,roomName:name,roomDesc:desc,category:selectedCat,avatar:myAvatar});
});
document.getElementById('joinRoomBtn').addEventListener('click',()=>{
  const code=document.getElementById('roomCodeInput').value.trim().toUpperCase();
  if(!code||code.length!==6){showToast('6자리 코드를 입력해주세요','error');return;}
  isHost=false;socket.emit('joinRoom',{nickname:myNickname,code,avatar:myAvatar});
});
document.getElementById('roomCodeInput').addEventListener('input',e=>{e.target.value=e.target.value.toUpperCase().replace(/[^A-Z0-9]/g,'').slice(0,6);});
document.getElementById('enterRoomBtn').addEventListener('click',()=>{closeModal();launchChatApp();});

/* ════ SOCKET ════ */
socket.on('roomCreated',({code,roomName})=>{
  currentRoomCode=code;currentRoomName=roomName;
  saveSession();saveRecentRoom(code,roomName);
  document.getElementById('inviteCodeDisplay').textContent=code;
  document.getElementById('createdRoomNameDisplay').textContent=`"${roomName}" 채팅방이 생성되었습니다`;
  document.getElementById('inviteLinkDisplay').textContent=`${location.origin}${location.pathname}?room=${code}`;
  showStep(3);
  navigator.clipboard.writeText(`${location.origin}${location.pathname}?room=${code}`).then(()=>showToast('초대 링크가 자동 복사되었습니다','success')).catch(()=>{});
});
socket.on('roomJoined',({code,roomName})=>{
  currentRoomCode=code;currentRoomName=roomName;
  saveSession();saveRecentRoom(code,roomName);
  closeModal();launchChatApp();
  showToast(`"${roomName}" 아지트에 합류했어요!`,'success');
});
socket.on('joinError',msg=>showToast(msg,'error'));
socket.on('messageHistory',msgs=>msgs.forEach(m=>renderMessage(m.user,m.avatar,m.text,m.time,false,m.isImage)));
socket.on('message',data=>{renderMessage(data.user,data.avatar,data.text,data.time,false,data.isImage);if(data.user!=='system')playBeep();});
socket.on('onlineUsers',users=>{onlineUsers=users;updateOnline();});
socket.on('notice',text=>showNotice(text));

/* ════ LAUNCH CHAT ════ */
function launchChatApp(){
  document.getElementById('chatApp').classList.remove('hidden');
  allMessages=[];
  document.getElementById('myNicknameDisplay').textContent=myNickname;
  document.getElementById('currentRoomDisplay').textContent=currentRoomName;
  document.getElementById('currentCodeDisplay').textContent=`코드: ${currentRoomCode}`;
  document.getElementById('chatRoomTitle').textContent=currentRoomName;
  document.getElementById('chatRoomCode').textContent=`코드: ${currentRoomCode}`;
  updateAvatarDisplays();
  setTimeout(()=>document.getElementById('msgInput').focus(),200);
}
function updateAvatarDisplays(){
  const src=avatarSrc(myAvatar);
  const d=document.getElementById('myAvatarDisplay');
  const m=document.getElementById('myAvatarMini');
  if(d){const img=d.querySelector('img');if(img)img.src=src;}
  if(m){const img=m.querySelector('img');if(img)img.src=src;}
}
function avatarSrc(av){return(av==='A'||av==='B')?'./images/hero.png':'./images/elements.png';}

/* ════ SEND MESSAGE ════ */
function sendMessage(){
  const inp=document.getElementById('msgInput');
  const text=inp.value.trim();
  if(!text)return;
  renderMessage(myNickname,myAvatar,text,Date.now(),true,false);
  socket.emit('chatMessage',text);
  inp.value='';inp.focus();
}
document.getElementById('sendBtn').addEventListener('click',sendMessage);
document.getElementById('msgInput').addEventListener('keydown',e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();sendMessage();}});

/* ════ IMAGE SEND ════ */
document.getElementById('imageFileInput').addEventListener('change',e=>{
  const f=e.target.files[0];if(!f)return;
  if(f.size>5*1024*1024){showToast('5MB 이하 이미지만 전송 가능합니다','error');return;}
  const reader=new FileReader();
  reader.onload=ev=>{
    const d=ev.target.result;
    renderMessage(myNickname,myAvatar,d,Date.now(),true,true);
    socket.emit('chatMessage',d);
  };
  reader.readAsDataURL(f);
  e.target.value='';
});

/* ════ RENDER MESSAGE ════ */
function renderMessage(user,avatar,text,time,isMine,isImage){
  const area=document.getElementById('messagesArea');
  const empty=document.getElementById('messagesEmpty');
  if(empty)empty.style.display='none';
  allMessages.push({user,text,time,isMine,isImage,el:null});

  const item=document.createElement('div');
  item.className='msg-item';

  if(user==='system'){
    item.classList.add('system-msg');
    const b=document.createElement('div');b.className='msg-bubble';b.textContent=text;item.appendChild(b);
  } else if(isMine){
    item.classList.add('mine');
    const body=document.createElement('div');body.className='msg-body';
    if(isImage){const img=document.createElement('img');img.src=text;img.className='msg-img';img.onclick=()=>window.open(text,'_blank');body.appendChild(img);}
    else{const b=document.createElement('div');b.className='msg-bubble';b.textContent=text;body.appendChild(b);}
    const t=document.createElement('div');t.className='msg-time';t.textContent=fmt(time);body.appendChild(t);
    item.appendChild(body);
  } else {
    item.classList.add('theirs');
    const avW=document.createElement('div');avW.className='msg-av';
    const avI=document.createElement('img');avI.src=avatarSrc(avatar);avI.alt=user;avW.appendChild(avI);
    const body=document.createElement('div');body.className='msg-body';
    const sn=document.createElement('div');sn.className='msg-sname';sn.textContent=user;body.appendChild(sn);
    if(isImage){const img=document.createElement('img');img.src=text;img.className='msg-img';img.onclick=()=>window.open(text,'_blank');body.appendChild(img);}
    else{const b=document.createElement('div');b.className='msg-bubble';b.textContent=text;body.appendChild(b);}
    const t=document.createElement('div');t.className='msg-time';t.textContent=fmt(time);body.appendChild(t);
    item.appendChild(avW);item.appendChild(body);
  }
  allMessages[allMessages.length-1].el=item;
  area.appendChild(item);
  area.scrollTop=area.scrollHeight;
}
function fmt(ts){if(!ts)return'';return new Date(ts).toLocaleTimeString('ko-KR',{hour:'2-digit',minute:'2-digit'});}

/* ════ SEARCH ════ */
document.getElementById('searchToggleBtn').addEventListener('click',()=>{
  const bar=document.getElementById('searchBar');
  const isHidden=bar.classList.contains('hidden');
  bar.classList.toggle('hidden');
  if(isHidden) document.getElementById('searchInput').focus();
  else clearSearch();
});
document.getElementById('searchCloseBtn').addEventListener('click',()=>{document.getElementById('searchBar').classList.add('hidden');clearSearch();});
document.getElementById('searchInput').addEventListener('input',e=>doSearch(e.target.value.trim().toLowerCase()));

function doSearch(q){
  document.querySelectorAll('.msg-highlight').forEach(el=>{const p=el.parentNode;p.replaceChild(document.createTextNode(el.textContent),el);p.normalize();});
  if(!q){allMessages.forEach(m=>{if(m.el)m.el.style.opacity='';});return;}
  let firstMatch=null;
  allMessages.forEach(m=>{
    if(!m.el||m.isImage||m.user==='system'){if(m.el)m.el.style.opacity='0.3';return;}
    const match=m.text.toLowerCase().includes(q);
    m.el.style.opacity=match?'1':'0.22';
    if(match){
      if(!firstMatch)firstMatch=m.el;
      const bub=m.el.querySelector('.msg-bubble');
      if(bub)hlText(bub,q);
    }
  });
  if(firstMatch)firstMatch.scrollIntoView({behavior:'smooth',block:'center'});
}
function hlText(el,q){
  const text=el.textContent,idx=text.toLowerCase().indexOf(q);
  if(idx===-1)return;
  const mark=document.createElement('mark');mark.className='msg-highlight';mark.textContent=text.slice(idx,idx+q.length);
  el.textContent='';
  el.appendChild(document.createTextNode(text.slice(0,idx)));
  el.appendChild(mark);
  el.appendChild(document.createTextNode(text.slice(idx+q.length)));
}
function clearSearch(){
  document.getElementById('searchInput').value='';
  document.querySelectorAll('.msg-highlight').forEach(el=>{const p=el.parentNode;p.replaceChild(document.createTextNode(el.textContent),el);p.normalize();});
  allMessages.forEach(m=>{if(m.el)m.el.style.opacity='';});
}

/* ════ NOTICE ════ */
function showNotice(text){
  document.getElementById('noticeText').textContent=text;
  document.getElementById('noticeBar').classList.remove('hidden');
}
document.getElementById('noticeClose').addEventListener('click',()=>document.getElementById('noticeBar').classList.add('hidden'));
document.getElementById('messagesArea').addEventListener('contextmenu',e=>{
  if(!isHost)return;
  const bub=e.target.closest('.msg-bubble');if(!bub)return;
  e.preventDefault();const text=bub.textContent;
  socket.emit('setNotice',text);showNotice(text);showToast('공지로 설정되었습니다','success');
});

/* ════ ONLINE ════ */
function updateOnline(){
  const cnt=onlineUsers.length||1;
  const el1=document.getElementById('onlineCount'),el2=document.getElementById('chatOnlineCount');
  if(el1)el1.textContent=`${cnt}명 접속`;if(el2)el2.textContent=`${cnt}명`;
}

/* ════ CHAT CONTROLS ════ */
document.getElementById('toHomeBtn').addEventListener('click',()=>document.getElementById('chatApp').classList.add('hidden'));
document.getElementById('chatHomeBtn').addEventListener('click',()=>document.getElementById('chatApp').classList.add('hidden'));
document.getElementById('chatLogoutBtn').addEventListener('click',()=>{
  socket.emit('leaveRoom');
  ['ananas_nickname','ananas_avatar','ananas_room','ananas_room_name'].forEach(k=>localStorage.removeItem(k));
  myNickname='';myAvatar='A';currentRoomCode='';currentRoomName='';
  document.getElementById('chatApp').classList.add('hidden');
  document.getElementById('powerBtn').querySelector('.power-label').textContent='톡 시작';
  const area=document.getElementById('messagesArea');
  area.innerHTML='<div class="msg-empty" id="messagesEmpty"><img src="./images/hero.png" class="me-pixel" alt=""><p>아직 대화가 없어요.<br>첫 메시지를 보내보세요!</p></div>';
  allMessages=[];showToast('로그아웃되었습니다');
});
document.getElementById('shareInviteBtn').addEventListener('click',()=>{
  const link=`${location.origin}${location.pathname}?room=${currentRoomCode}`;
  navigator.clipboard.writeText(link).then(()=>showToast('초대 링크가 복사되었습니다','success')).catch(()=>showToast(`코드: ${currentRoomCode}`));
});
document.getElementById('showCodeBtn').addEventListener('click',copyCode);

/* ════ COPY ════ */
window.copyCode=function(){
  const code=document.getElementById('inviteCodeDisplay')?.textContent||currentRoomCode;
  if(!code||code==='------'){showToast('코드가 없습니다','error');return;}
  navigator.clipboard.writeText(code).then(()=>{
    showToast('코드가 복사되었습니다','success');
    const btn=document.getElementById('copyCodeBtn');
    if(btn){btn.textContent='완료!';setTimeout(()=>btn.textContent='복사',2000);}
  });
};
window.copyLink=function(){
  const link=document.getElementById('inviteLinkDisplay')?.textContent;
  if(link)navigator.clipboard.writeText(link).then(()=>showToast('링크가 복사되었습니다','success'));
};

/* ════ QUICK JOIN ════ */
window.quickJoinRoom=function(name,tag,desc){
  if(!myNickname){openModal();setTimeout(()=>{document.getElementById('roomNameInput').value=name;document.getElementById('roomDescInput').value=desc||'';},100);return;}
  openModal();showStep(2);document.getElementById('roomNameInput').value=name;document.getElementById('roomDescInput').value=desc||'';
};

/* ════ RECENT ROOMS ════ */
function saveRecentRoom(code,name){
  let list=JSON.parse(localStorage.getItem('ananas_recent')||'[]');
  list=list.filter(r=>r.code!==code);list.unshift({code,name});list=list.slice(0,5);
  localStorage.setItem('ananas_recent',JSON.stringify(list));renderRecentRooms();
}
function renderRecentRooms(){
  const list=JSON.parse(localStorage.getItem('ananas_recent')||'[]');
  const wrap=document.getElementById('recentRoomsWrap'),cont=document.getElementById('recentRoomsList');
  if(!list.length){wrap.style.display='none';return;}
  wrap.style.display='block';cont.innerHTML='';
  list.forEach(r=>{
    const chip=document.createElement('button');chip.className='recent-chip';chip.textContent=r.name;
    chip.onclick=()=>{
      if(!myNickname){openModal();setTimeout(()=>{document.getElementById('roomCodeInput').value=r.code;switchTab('join');},100);return;}
      openModal();showStep(2);switchTab('join');document.getElementById('roomCodeInput').value=r.code;
    };
    cont.appendChild(chip);
  });
}

/* ════ SESSION ════ */
function saveSession(){
  localStorage.setItem('ananas_nickname',myNickname);localStorage.setItem('ananas_avatar',myAvatar);
  localStorage.setItem('ananas_room',currentRoomCode);localStorage.setItem('ananas_room_name',currentRoomName);
  const pb=document.getElementById('powerBtn');if(pb)pb.querySelector('.power-label').textContent='내 아지트';
}

/* ════ SOUND ════ */
function playBeep(){
  try{const ctx=new AudioContext(),osc=ctx.createOscillator(),gain=ctx.createGain();
  osc.connect(gain);gain.connect(ctx.destination);osc.frequency.value=880;gain.gain.value=0.04;osc.start();
  setTimeout(()=>{gain.gain.exponentialRampToValueAtTime(0.001,ctx.currentTime+0.18);osc.stop(ctx.currentTime+0.18);},10);}catch(e){}
}

/* ════ AI ASSISTANT ════ */
const aiConversation=[];

window.sendAiSuggestion=function(btn){
  document.getElementById('aiInput').value=btn.textContent;
  sendAiMessage();
};

async function sendAiMessage(){
  const input=document.getElementById('aiInput');
  const text=input.value.trim();
  if(!text)return;

  // Append user message to UI
  const area=document.getElementById('aiMessages');
  const welcome=area.querySelector('.ai-welcome');
  if(welcome)welcome.style.display='none';

  appendAiMsg('user',text);
  input.value='';
  input.style.height='auto';

  aiConversation.push({role:'user',content:text});

  // Show typing indicator
  const typingId='ai-typing-'+Date.now();
  const typingEl=document.createElement('div');
  typingEl.className='ai-msg bot-msg';typingEl.id=typingId;
  typingEl.innerHTML=`<div class="ai-av"><img src="./images/hero.png" alt="AI"></div><div class="ai-bubble ai-typing"><span></span><span></span><span></span></div>`;
  area.appendChild(typingEl);area.scrollTop=area.scrollHeight;

  // Disable send
  const sendBtn=document.getElementById('aiSendBtn');sendBtn.disabled=true;sendBtn.textContent='...';

  try{
    const res=await fetch('https://api.anthropic.com/v1/messages',{
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body:JSON.stringify({
        model:'claude-sonnet-4-20250514',
        max_tokens:1000,
        system:`당신은 아나나스(Ananas) 메신저의 AI 어시스턴트입니다. 
아나나스는 파인애플(Ananas) 세계관을 가진 귀여운 픽셀아트 메신저 서비스입니다.
사용자들의 질문에 친절하고 따뜻하게 답변해주세요.
아나나스 메신저 관련 질문: 채팅방 생성은 [톡 시작] 버튼, 6자리 초대코드로 친구 초대, 방장은 공지 고정 가능.
다른 사람과 채팅하려면: 서버 실행 후 같은 IP의 포트 4000으로 접속, 또는 ngrok으로 외부 공유.
한국어로 대답하고, 짧고 핵심적으로 답변하세요. 마크다운 사용 가능.`,
        messages:aiConversation.slice(-10)
      })
    });

    const data=await res.json();
    const reply=data.content?.[0]?.text||'답변을 가져올 수 없습니다.';

    // Remove typing
    const te=document.getElementById(typingId);if(te)te.remove();

    appendAiMsg('bot',reply);
    aiConversation.push({role:'assistant',content:reply});

  }catch(err){
    const te=document.getElementById(typingId);if(te)te.remove();
    appendAiMsg('bot','죄송해요, 잠시 연결이 원활하지 않네요. 다시 시도해주세요.');
    console.error('AI error:',err);
  }finally{
    sendBtn.disabled=false;sendBtn.textContent='전송';
  }
}

function appendAiMsg(role,text){
  const area=document.getElementById('aiMessages');
  const div=document.createElement('div');
  div.className=`ai-msg ${role==='user'?'user-msg':'bot-msg'}`;

  const avSrc=role==='user'?avatarSrc(myAvatar):'./images/hero.png';
  const bubText=text.replace(/</g,'&lt;').replace(/\n/g,'<br>').replace(/\*\*(.*?)\*\*/g,'<strong>$1</strong>').replace(/`(.*?)`/g,'<code style="background:rgba(0,0,0,0.08);padding:1px 5px;border-radius:4px;font-size:0.82em">$1</code>');

  div.innerHTML=`<div class="ai-av"><img src="${avSrc}" alt="${role}"></div><div class="ai-bubble">${bubText}</div>`;
  area.appendChild(div);area.scrollTop=area.scrollHeight;
}

document.getElementById('aiSendBtn').addEventListener('click',sendAiMessage);
document.getElementById('aiInput').addEventListener('keydown',e=>{
  if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();sendAiMessage();}
});
// Auto-resize textarea
document.getElementById('aiInput').addEventListener('input',function(){
  this.style.height='auto';this.style.height=Math.min(this.scrollHeight,120)+'px';
});

/* ════ TOAST ════ */
function showToast(msg,type=''){
  const c=document.getElementById('toastContainer');
  const t=document.createElement('div');t.className=`toast${type?' toast-'+type:''}`;t.textContent=msg;
  c.appendChild(t);setTimeout(()=>t.remove(),3200);
}
window.showToast=showToast;

/* ════ KEYBOARD ════ */
document.addEventListener('keydown',e=>{
  if(e.key==='Escape'){const m=document.getElementById('talkModal');if(!m.classList.contains('hidden'))closeModal();}
});

/* ════ HEADER SCROLL ════ */
window.addEventListener('scroll',()=>{
  const h=document.getElementById('siteHeader');
  if(h)h.style.boxShadow=window.scrollY>8?'0 2px 16px rgba(26,26,46,0.06)':'none';
},{passive:true});

/* ════ REVEAL OBSERVER ════ */
const obs=new IntersectionObserver(entries=>{
  entries.forEach(e=>{if(e.isIntersecting){e.target.style.animation='pgIn 0.5s ease both';obs.unobserve(e.target);}});
},{threshold:0.08});
document.querySelectorAll('.hg-card,.feat-card,.room-card,.tl-item,.cg-step').forEach(el=>obs.observe(el));
