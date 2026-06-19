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

/* 효과음 (WebAudio 블립) */
let _audioCtx = null, _lastBeep = 0;
function playBeep(freq = 740) {
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
      cancels.push(animateHalftone(cv, shape, size, cv.dataset.color || '#1F1B13', 620, 45 * i, true));
    });
  }, 2400);

  later(() => {
    sc1.classList.add('fade-out');
    sc2.classList.remove('hidden');
    /* 씬2 큰 로고: 같은 도트 언어로 재조립 → 연속성 */
    const big = $('#sc2BigCanvas');
    if (big) cancels.push(animateHalftone(big, 'logo', parseInt(big.dataset.size, 10) || 500, big.dataset.color || '#FFC400', 1500, 150));
    /* 카피 순차 점등 */
    $$('.sc2-line', sc2).forEach((line, i) => later(() => line.classList.add('active'), 350 + i * 430));
  }, 3150);

  /* ── 씬2 → 씬3 ── */
  later(() => {
    const big = $('#sc2BigCanvas');
    if (big) cancels.push(animateHalftone(big, 'logo', parseInt(big.dataset.size, 10) || 500, big.dataset.color || '#FFC400', 600, 0, true));
  }, 6450);

  later(() => {
    sc2.classList.add('fade-out');
    sc3.classList.remove('hidden');
    const cv = $('#sc3Canvas');
    /* 씬3 로고: 짧게 재조립 후 정지 — 마무리 */
    if (cv) cancels.push(animateHalftone(cv, 'logo', parseInt(cv.dataset.size, 10) || 340, cv.dataset.color || '#FFC400', 900, 120));
  }, 7150);

  /* 15초 폴백 */
  later(exitIntro, 15000);
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
socket.on('errorMsg',   msg => showToast(msg, 'error'));

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
  state.publicRooms = Array.isArray(list) ? list : [];
  renderRooms();
});

function renderRooms() {
  const grid = $('#roomsGrid'), empty = $('#roomsEmpty');
  if (!grid) return;
  $$('.room-card', grid).forEach(c => c.remove());
  const rooms = state.publicRooms.filter(r => roomFilter === 'all' || r.category === roomFilter);
  if (empty) empty.style.display = rooms.length ? 'none' : '';
  const sprites = ['pine', 'pineWink', 'pineCool', 'pineHappy'];
  rooms.forEach((r, idx) => {
    const card = document.createElement('div');
    card.className = 'room-card';
    card.innerHTML = `
      <div class="rc-img"><canvas class="px" data-sprite="${sprites[idx % 4]}" data-scale="4"></canvas></div>
      <div class="rc-body">
        <div class="rc-top">
          <span class="rc-tag">${CAT_LABEL[r.category] || '수다'}</span>
          <span class="rc-users">👥 ${r.users}명</span>
        </div>
        <h3>${r.name}</h3>
        <p>${r.desc || '설명이 없는 아지트예요.'}</p>
        <div class="rc-foot">
          <span class="rc-code">${escHtml(r.code)}</span>
          <span class="rc-join">입장하기 →</span>
        </div>
      </div>`;
    card.addEventListener('click', () => quickJoin(r.code));
    grid.appendChild(card);
  });
  renderAllSprites(grid);
}

function filterRooms(cat, btn) {
  roomFilter = cat;
  $$('.rf').forEach(b => b.classList.toggle('active', b === btn));
  renderRooms();
}
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
    showToast('지금은 탈 수 있는 파도가 없어요. 직접 아지트를 열어보세요!', 'error');
    return;
  }
  const tag = res.byFriend ? '🤝 친구의 친구 아지트' : '🌊';
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
  const wrap = $('#recentRoomsWrap'), list = $('#recentRoomsList');
  if (!wrap || !list) return;
  const rec = getRecent();
  wrap.style.display = rec.length ? '' : 'none';
  list.innerHTML = '';
  rec.forEach((r, i) => {
    const row = document.createElement('button');
    row.className = 'recent-item';
    row.innerHTML = `
      <span class="ri-av"><canvas class="px" data-sprite="${RECENT_SPRITES[i % RECENT_SPRITES.length]}" data-scale="2"></canvas></span>
      <span class="ri-info">
        <span class="ri-name">${escHtml(r.name)}</span>
        <span class="ri-code">코드 ${escHtml(r.code)}</span>
      </span>
      <span class="ri-enter">다시 입장 →</span>`;
    row.addEventListener('click', () => quickJoin(r.code));
    list.appendChild(row);
  });
  renderAllSprites(list);
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
    const name = escHtml(decodeEnt(r.name || info.name || '아지트'));
    const code = escHtml(r.code);
    const preview = info.lastText ? info.lastText : (info._pending ? '불러오는 중…' : '아직 대화가 없어요');
    const time = relTime(info.lastTime);
    const online = (info.users > 0) ? `<span class="mc-online">${info.users}명</span>` : '';
    const del = info.isCreator ? `<button class="mc-del" data-code="${code}" title="아지트 삭제">🗑</button>` : '';
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
    if (confirm('이 아지트를 삭제할까요? 대화 기록도 함께 사라집니다.')) {
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
  showToast('아지트를 삭제했어요.', 'success');
  if (!$('#myChatsScreen').classList.contains('hidden')) openMyChats();
});
socket.on('roomDeleted', ({ code, reason }) => {
  removeRecent(code);
  if (state.room === code) {
    showToast(reason || '이 아지트가 삭제되었습니다.', 'error');
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
    <span class="cn-room">🍍 ${escHtml(decodeEnt(state.roomName || '아지트'))}</span>
    <span class="cn-msg"><b>${m.user}</b> ${m.isImage ? '(사진)' : m.text}</span>`;
  el.addEventListener('click', () => {
    if ($('#chatApp').classList.contains('hidden')) {
      $('#siteWrapper').style.display = 'none';
      $('#chatApp').classList.remove('hidden');
      document.body.style.overflow = 'hidden';
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

function openModal() {
  if (!modal) return;
  modal.classList.remove('hidden');
  showStep(1);
  const ni = $('#nicknameInput');
  if (ni) {
    /* 저장된 닉네임이 있으면 유지, 없으면 빈칸 */
    const saved = localStorage.getItem('ananas_nickname') || '';
    ni.value = saved;
    setTimeout(() => ni.focus(), 80);
  }
  /* 프로필 사진은 이미 설정된 경우 유지 */
  if (!state.profileImage) {
    state.avatar = localStorage.getItem('ananas_avatar') || 'A';
  }
  $$('.av-btn').forEach(b => b.classList.toggle('active', b.dataset.emoji === state.avatar));
  applyProfilePreview();
  $$('.mood-grid .mood').forEach(b => b.classList.toggle('active', b.dataset.mood === state.mood));
}
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

/* STEP1 → STEP2 */
$('#toStep2Btn') && $('#toStep2Btn').addEventListener('click', () => {
  const nick = ($('#nicknameInput').value || '').trim();
  if (!nick) { showToast('닉네임을 입력해주세요!', 'error'); $('#nicknameInput').focus(); return; }
  if (nick.length > 10) { showToast('닉네임은 10자까지 입력할 수 있어요!', 'error'); $('#nicknameInput').focus(); return; }
  state.nickname = nick;
  state.nicknameEsc = serverEscape(nick);
  localStorage.setItem('ananas_nickname', nick);
  localStorage.setItem('ananas_avatar', state.avatar);
  localStorage.setItem('ananas_mood',   state.mood);

  if (state.pendingAction === 'join' && state.pendingJoinCode) {
    joinRoom(state.pendingJoinCode);
    return;
  }
  showStep(2);
  switchTab(state.pendingJoinCode ? 'join' : 'create');
  if (state.pendingJoinCode) $('#roomCodeInput').value = state.pendingJoinCode;
});

function goToJoinStep() {
  const nick = ($('#nicknameInput').value || '').trim();
  if (!nick) { showToast('먼저 닉네임을 입력해주세요!', 'error'); return; }
  state.nickname = nick; state.nicknameEsc = serverEscape(nick);
  localStorage.setItem('ananas_nickname', nick);
  showStep(2); switchTab('join');
}
function goBack(from) { showStep(from - 1); }
function switchTab(tab) {
  $('#tabCreate').classList.toggle('active', tab === 'create');
  $('#tabJoin').classList.toggle('active', tab === 'join');
  $('#createPanel').classList.toggle('hidden', tab !== 'create');
  $('#joinPanel').classList.toggle('hidden', tab !== 'join');
}
window.goToJoinStep = goToJoinStep;
window.goBack = goBack;
window.switchTab = switchTab;

/* 방 만들기 */
$('#createRoomBtn') && $('#createRoomBtn').addEventListener('click', () => {
  const roomName = ($('#roomNameInput').value || '').trim();
  if (!roomName) { showToast('아지트 이름을 입력해주세요!', 'error'); return; }
  const roomDesc = ($('#roomDescInput').value || '').trim();
  const catBtn   = $('.cat.active');
  socket.emit('createRoom', {
    nickname: state.nickname, avatar: state.avatar, mood: state.mood,
    profileImage: state.profileImage || '',
    roomName, roomDesc,
    category: catBtn ? catBtn.dataset.cat : 'daily',
    isPublic: !!($('#publicToggle') && $('#publicToggle').checked),
  });
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
$('#nicknameInput') && $('#nicknameInput').addEventListener('keydown', e => {
  if (e.key === 'Enter') $('#toStep2Btn').click();
});

function joinRoom(code) {
  socket.emit('joinRoom', {
    nickname: state.nickname, avatar: state.avatar, mood: state.mood, code,
    profileImage: state.profileImage || '',
  });
}

/* 서버 응답 */
socket.on('roomCreated', ({ code, roomName, isHost }) => {
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
function launchChatApp() {
  $('#siteWrapper').style.display = 'none';
  const app = $('#chatApp');
  app.classList.remove('hidden');
  document.body.style.overflow = 'hidden';

  /* 내 프로필 */
  $('#myNicknameDisplay').textContent = state.nickname;
  const tabName = $('#myTabName'); if (tabName) tabName.textContent = state.nickname || '멤버';
  const avBox = $('#myAvatarDisplay');
  avBox.innerHTML = avatarMarkup(state.avatar, state.profileImage, 3);
  $('#myMoodBtn').textContent = MOOD_LABEL[state.mood] || MOOD_LABEL.happy;

  /* 방 정보 */
  const rn = decodeEnt(state.roomName);
  $('#currentRoomDisplay').textContent = rn;
  $('#currentCodeDisplay').textContent = '코드: ' + state.room;
  $('#chatRoomTitle').textContent = rn;
  $('#chatRoomCode').textContent  = state.room;

  /* 초기화 */
  resetMessagesView();
  $('#gbList').innerHTML = '<p class="gb-empty">아직 방명록이 비어 있어요.<br>첫 흔적을 남겨보세요!</p>';
  switchSbTab('members');
  renderAllSprites(app);
  $('#msgInput').focus();
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
  socket.emit('leaveRoom');
  state.room = null; state.roomName = ''; state.isHost = false;
  $('#chatApp').classList.add('hidden');
  const w = $('#siteWrapper');
  w.style.display = '';
  w.classList.add('visible');
  document.body.style.overflow = '';
  if (toHome) switchPage('home');
  renderRecent();
}
/* 나가지 않고 홈으로(채팅 세션 유지 → 백그라운드 알림 동작) */
function goHomeKeepChat() {
  if (!state.room) return exitChat(true);
  $('#chatApp').classList.add('hidden');
  const w = $('#siteWrapper');
  w.style.display = '';
  w.classList.add('visible');
  document.body.style.overflow = '';
  switchPage('home');
}
function resumeChat() {
  if (!state.room) return;
  $('#siteWrapper').style.display = 'none';
  $('#chatApp').classList.remove('hidden');
  document.body.style.overflow = 'hidden';
  scrollBottom();
}

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
$('#toHomeBtn')     && $('#toHomeBtn').addEventListener('click', goHomeKeepChat);
$('#chatHomeBtn')   && $('#chatHomeBtn').addEventListener('click', goHomeKeepChat);

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
    showToast('오늘의 기분을 바꿨어요 ' + MOOD_EMOJI[state.mood], 'success');
  });
  document.addEventListener('click', () => pop.classList.add('hidden'));
})();

/* 접속자 목록 */
function renderMembers(users) {
  if (!Array.isArray(users)) return;
  const panel = $('#membersPanel');
  if (!panel) return;
  panel.innerHTML = users.map(u => {
    const isMe     = u.cid && u.cid === CLIENT_ID;
    const isFriend = u.cid && state.friends.has(u.cid);
    let action = '';
    if (u.cid && !isMe) {
      action = isFriend
        ? `<span class="member-friend" title="이미 친구예요">🤝 친구</span>`
        : `<button class="member-add" data-cid="${u.cid}" title="친구 추가">+ 친구</button>`;
    }
    return `
    <div class="member-row">
      <span class="member-av">${avatarMarkup(u.avatar, u.profileImage, 2)}</span>
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
  $('#onlineCount').textContent = `${n}명 접속`;
  $('#chatOnlineCount').textContent = `${n}명`;
  $('#memberCnt').textContent = n;
  renderMembers(users);
  /* 혼자 남으면 친구 초대 배너 표시 */
  const banner = $('#aloneInviteBanner');
  if (banner) banner.classList.toggle('hidden', n > 1);
});

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
    ? `<img src="${m.text}" alt="공유한 사진" loading="lazy">`
    : m.text;
  const quote = m.replyTo
    ? `<span class="msg-reply-quote"><b>↩ ${m.replyTo.user}</b>${m.replyTo.text}</span>`
    : '';

  row.innerHTML = `
    <span class="msg-av${grouped ? ' ghost' : ''}">
      ${avatarMarkup(m.avatar, profileImageOf(m.user, m.avatar), 2)}
    </span>
    <div class="msg-col">
      ${!grouped && !mine ? `<span class="msg-user">${m.user} <small>${MOOD_EMOJI[m.mood] || ''}</small></span>` : ''}
      <div class="msg-line">
        <div class="msg-bubble${m.isImage ? ' has-img' : ''}" data-raw="${m.isImage ? '' : encodeURIComponent(m.text)}">${quote}${body}</div>
        <span class="msg-time">${fmtTime(m.time)}</span>
      </div>
      <div class="msg-reacts"></div>
    </div>`;

  msgArea.appendChild(row);
  renderAllSprites(row);

  if (m.reactions && Object.keys(m.reactions).length) {
    updateReactions(m.id, m.reactions);
  }

  /* 버블 클릭 → 컨텍스트 메뉴 */
  const bubble = $('.msg-bubble', row);
  bubble.addEventListener('click', e => {
    if (bubble.classList.contains('deleted')) return;
    e.stopPropagation();
    openMsgMenu(e, m.id, mine, m.user, m.isImage ? '(사진)' : decodeEnt(m.text));
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
  bubble.innerHTML = '삭제된 메시지입니다';
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

/* ─── 이미지 전송 (리사이즈 후) ─── */
$('#imageFileInput') && $('#imageFileInput').addEventListener('change', e => {
  const file = e.target.files && e.target.files[0];
  e.target.value = '';
  if (!file) return;
  if (!/^image\/(jpeg|png|webp)$/.test(file.type)) {
    showToast('JPG / PNG / WEBP 사진만 보낼 수 있어요.', 'error'); return;
  }
  const img = new Image();
  const url = URL.createObjectURL(file);
  img.onload = () => {
    URL.revokeObjectURL(url);
    const MAX = 1280;
    let { width: w, height: h } = img;
    if (w > MAX || h > MAX) {
      const r = Math.min(MAX / w, MAX / h);
      w = Math.round(w * r); h = Math.round(h * r);
    }
    const cv = document.createElement('canvas');
    cv.width = w; cv.height = h;
    cv.getContext('2d').drawImage(img, 0, 0, w, h);
    const dataURL = cv.toDataURL('image/jpeg', 0.85);
    if (dataURL.length > 4.8 * 1024 * 1024) {
      showToast('사진이 너무 커요. 더 작은 사진으로 시도해주세요.', 'error'); return;
    }
    /* 전송 전 미리보기 확인 */
    const preview = document.createElement('div');
    preview.className = 'img-confirm-overlay';
    preview.innerHTML = `
      <div class="img-confirm-box retro-window">
        <div class="rw-titlebar"><span class="rw-title">📷 사진 전송 확인</span><span class="rw-btns"><i class="rw-x"></i></span></div>
        <div class="img-confirm-body">
          <img src="${dataURL}" class="img-confirm-preview" alt="전송할 사진">
          <div class="img-confirm-btns">
            <button class="cf-btn cf-yes" id="imgSendOk">전송</button>
            <button class="cf-btn cf-no" id="imgSendCancel">취소</button>
          </div>
        </div>
      </div>`;
    document.body.appendChild(preview);
    preview.querySelector('#imgSendOk').addEventListener('click', () => {
      preview.remove();
      socket.emit('chatMessage', dataURL);
    });
    preview.querySelector('#imgSendCancel').addEventListener('click', () => preview.remove());
    preview.querySelector('.rw-x').addEventListener('click', () => preview.remove());
  };
  img.onerror = () => { URL.revokeObjectURL(url); showToast('사진을 읽을 수 없어요.', 'error'); };
  img.src = url;
});

/* ─── 이모지 피커 ─── */
const EMOJIS = ['😀','😂','🥹','😊','😎','🤩','😘','🥰','😭','😤','😴','🤔','👍','👏','🙏','💪','❤️','💛','💚','🔥','✨','🌊','🍍','🍕','🍰','☕','🎉','🎵','📷','🌙','⭐','🏠'];
function hideEmojiPop() { $('#emojiPop') && $('#emojiPop').classList.add('hidden'); }
(function initEmoji() {
  const pop = $('#emojiPop'), btn = $('#emojiBtn');
  if (!pop || !btn) return;
  pop.innerHTML = EMOJIS.map(e => `<button>${e}</button>`).join('');
  btn.addEventListener('click', e => {
    e.stopPropagation();
    pop.classList.toggle('hidden');
  });
  pop.addEventListener('click', e => {
    e.stopPropagation();
    const b = e.target.closest('button');
    if (!b) return;
    const inp = $('#msgInput');
    inp.value += b.textContent;
    inp.focus();
  });
  document.addEventListener('click', hideEmojiPop);
})();

/* ─── 메시지 검색 ─── */
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
  el.innerHTML = `
    <span class="gb-user">${e.user}</span>
    <span class="gb-text">${e.text}</span>
    <span class="gb-time">${fmtTime(e.time)}</span>`;
  box.appendChild(el);
  if (isNew) box.scrollTop = box.scrollHeight;
}
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