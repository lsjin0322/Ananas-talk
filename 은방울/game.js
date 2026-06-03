// ═══════════════════════════════════════════════
//  SERVICE WORKER & RESIZE HANDLER
// ═══════════════════════════════════════════════
if('serviceWorker' in navigator){
  navigator.serviceWorker.register('./service-worker.js')
    .catch(err => console.log('Service Worker registration failed:', err));
}

function resizeScreen() {
  const wrap = document.getElementById('wrap');
  const scale = Math.min(window.innerWidth / 800, window.innerHeight / 600);
  wrap.style.transform = `scale(${scale})`;
}
window.addEventListener('resize', resizeScreen);
resizeScreen(); // 초기 실행

// ═══════════════════════════════════════════════
//  CANVAS SETUP & GLOBAL STATE
// ═══════════════════════════════════════════════
const canvas = document.getElementById('gc');
const ctx = canvas.getContext('2d');
ctx.imageSmoothingEnabled = false;
function r(x, y, w, h, c) { ctx.fillStyle = c; ctx.fillRect(~~x, ~~y, w, h); }

const MAX_LIVES = 5;
let GS = {screen:'title', stage:0, lives:MAX_LIVES, shield:0, seeds:0, bells:0, coins:0, stars:0, level:1, cleared:[false,false,false,false,false,false]};
let qs = {seedC:0, bellC:0, killC:0, bossKill:false};

let plat=[], enems=[], items=[], plants=[], npcs=[], traps=[], projs=[], enemProjs=[], parts=[];
let player = {x:50, y:340, vx:0, vy:0, w:20, h:28, onGround:false, inv:0, atkT:0, frame:0, frameT:0, facing:1, state:'idle', jumps:0, speed:1, speedT:0, frozen:0};
let cam = {x:0};
let clearTriggered = false, puzzlePending = false, puzzleDone = false;
let pzCards = [], pzFlipped = [], pzMatched = [], pzLock = false, puzzleLives = 3;

// ═══════════════════════════════════════════════
//  RENDER FUNCTIONS (캐릭터, 적, 아이템 등)
// ═══════════════════════════════════════════════
const COSTUMES = [
  {name:'기본',cape:'#4a8a4a',dark:'#2a5a2a',light:'#6aaa6a',bow:'#e8c0e0'},
  {name:'보라',cape:'#7a4aaa',dark:'#4a1a7a',light:'#9a6aca',bow:'#e8d0ff'},
  {name:'파랑',cape:'#3a5a9a',dark:'#1a2a6a',light:'#5a7aba',bow:'#c0d8ff'}
];
let costumeIdx = 0;

function drawLily(cx, cy, sc, facing, state, frame) {
  ctx.save();
  try {
    const s = sc; const C = COSTUMES[costumeIdx]; const bob = (state === 'idle') ? Math.sin(Date.now()/300)*0.8 : 0; const by = ~~bob;
    ctx.translate(~~cx, ~~cy); if(facing < 0) ctx.scale(-1, 1);
    r(-6*s,(-1+by)*s,12*s,10*s,C.cape); r(-5*s,(-2+by)*s,10*s,2*s,C.dark); r(-4*s,(0+by)*s,2*s,7*s,C.light);
    r(-2*s,(5+by)*s,4*s,2*s,C.bow); r(-1*s,(6+by)*s,2*s,1*s,'#fff0f8');
    const lo = (state === 'walk') ? (frame%2===0?2:-2) : 0;
    r(-3*s,(9+by+lo)*s,2*s,4*s,'#f0d0e0'); r(1*s,(9+by-lo)*s,2*s,4*s,'#f0d0e0'); r(-4*s,(12+by)*s,3*s,2*s,'#d0b0c0'); r(1*s,(12+by)*s,3*s,2*s,'#d0b0c0');
    r(-7*s,(-13+by)*s,14*s,13*s,'#f8e8f0'); r(-8*s,(-15+by)*s,6*s,4*s,'#f8e8f0'); r(-3*s,(-16+by)*s,7*s,5*s,'#f8e8f0'); r(3*s,(-14+by)*s,5*s,4*s,'#f8e8f0'); r(-6*s,(-1+by)*s,12*s,2*s,'#e0c0d0');
    r(-3*s,(-9+by)*s,2*s,2*s,'#2a2a2a'); r(1*s,(-9+by)*s,2*s,2*s,'#2a2a2a'); r(-2*s,(-9+by)*s,1*s,1*s,'#ffffff'); r(2*s,(-9+by)*s,1*s,1*s,'#ffffff'); r(-4*s,(-7+by)*s,2*s,2*s,'#ffb0c0'); r(2*s,(-7+by)*s,2*s,2*s,'#ffb0c0');
    if(state === 'attack') { r(-2*s,(-6+by)*s,4*s,1*s,'#2a2a2a'); } else { r(-1*s,(-6+by)*s,1*s,1*s,'#2a2a2a'); r(0*s,(-5+by)*s,2*s,1*s,'#2a2a2a'); r(2*s,(-6+by)*s,1*s,1*s,'#2a2a2a'); }
    r(0*s,(-18+by)*s,1*s,3*s,'#5a9a5a'); r(-3*s,(-20+by)*s,3*s,4*s,'#f0e8ff'); r(-4*s,(-19+by)*s,1*s,2*s,'#f0e8ff'); r(-2*s,(-21+by)*s,2*s,1*s,'#ddd0ff'); r(1*s,(-19+by)*s,3*s,4*s,'#f8e8ff'); r(3*s,(-18+by)*s,1*s,2*s,'#f8e8ff'); r(1*s,(-21+by)*s,2*s,1*s,'#eed8ff');
    if(state === 'attack') { r(6*s,(-1+by)*s,9*s,3*s,'#f0d0e0'); r(14*s,(-3+by)*s,5*s,5*s,'#f0d0e0'); r(19*s,(-4+by)*s,4*s,1*s,'#ffff88'); r(20*s,(-5+by)*s,1*s,3*s,'#ffff88'); r(21*s,(-3+by)*s,3*s,2*s,'#ffdd44'); r(22*s,(-5+by)*s,2*s,1*s,'#ffffff'); } 
    else { const ao = frame%2===0?1:-1; r(-8*s,(-1+ao+by)*s,2*s,2*s,'#f0d0e0'); r(6*s,(-1-ao+by)*s,2*s,2*s,'#f0d0e0'); }
    r(7*s,(-1+by)*s,1*s,13*s,'#7a5a3a'); r(6*s,(-2+by)*s,3*s,2*s,'#5a9a5a'); r(5*s,(-4+by)*s,5*s,2*s,'#7acc6a'); r(7*s,(-5+by)*s,1*s,2*s,'#aaffaa');
  } finally { ctx.restore(); }
}

function drawEnemy(cx, cy, type, frame, hp, maxHp, isBoss, atkAnim) {
  ctx.save();
  try {
    const bob = ~~(Math.sin(Date.now()/380)*2); ctx.translate(~~cx, ~~cy);
    if(atkAnim > 0) ctx.globalAlpha = 0.85+Math.sin(atkAnim*0.5)*0.15;
    if(type === 'vine') {
      const pcolor='#7c3fa0', pdark='#4a1a6a', plight='#a060c8';
      r(-6,-9+bob,12,15,pcolor); r(-8,-7+bob,4,9,pdark); r(4,-6+bob,4,7,pdark); r(-5,-13+bob,2,5,plight); r(-1,-14+bob,2,6,plight); r(3,-12+bob,2,4,plight);
      const ec = atkAnim>0?'#ff2222':'#ff5555'; r(-3,-5+bob,3,3,ec); r(1,-5+bob,3,3,ec); r(-2,-4+bob,1,1,'#ffcccc'); r(2,-4+bob,1,1,'#ffcccc');
      if(frame%2===0) { r(-2,-2+bob,5,2,'#2a002a'); r(-1,-1+bob,1,1,'#cc8888'); r(1,-1+bob,1,1,'#cc8888'); } else r(-1,-2+bob,3,1,'#2a002a');
      if(atkAnim>0) { r(6,-3+bob,8,3,'#7c3fa0'); r(13,-5+bob,4,5,'#ff4444'); } if(frame<2) r(-1,6+bob,2,5,'#7c3fa0');
    } else if(type === 'spirit') {
      const sc2='#3a2060', sl='#6a40aa';
      r(-5,-11+bob,10,13,sc2); r(-7,-9+bob,4,9,'#2a1050'); r(3,-8+bob,4,9,'#2a1050');
      for(let i=0;i<5;i++){const w=frame%2===0?(i%2===0?1:0):(i%2===0?0:1);r((-4+i*2),-1+w+bob,2,2,sc2);}
      const ec2 = atkAnim>0?'#ff44ff':'#cc88ff'; r(-3,-8+bob,2,2,ec2); r(1,-8+bob,2,2,ec2); r(-2,-7+bob,1,1,'#ffffff'); r(2,-7+bob,1,1,'#ffffff');
      if(atkAnim>10) { r(-12,-6+bob,5,4,'#cc44ff'); r(-15,-7+bob,3,3,'#ff88ff'); }
    } else if(type === 'golem') {
      const gc='#5a5060', gd='#3a3040', gl='#7a6888';
      r(-9,-13+bob,18,17,gc); r(-11,-9+bob,4,11,gd); r(7,-9+bob,4,11,gd); r(-7,-15+bob,14,4,gl);
      const ec3 = atkAnim>0?'#ff6600':'#ff9944'; r(-4,-9+bob,3,4,ec3); r(2,-9+bob,3,4,ec3); r(-3,-3+bob,6,2,'#2a2028'); r(-9,4+bob,4,7,gc); r(5,4+bob,4,7,gc);
      if(atkAnim>0) { r(-13,8+bob,26,4,'#cc6600'); ctx.globalAlpha=0.4; r(-20,12+bob,40,6,'#ff8800'); ctx.globalAlpha=1; }
    } else if(type === 'boss') {
      const bc = ~~(Math.sin(Date.now()/280)*2);
      r(-14,-18+bc,28,22,'#1a0828'); r(-18,-14+bc,6,16,'#10050f'); r(12,-13+bc,6,16,'#10050f');
      r(-6,-10+bc,12,12,'#5a1068'); r(-5,-9+bc,10,10,'#8a20a0'); r(-4,-8+bc,8,8,'#bb40cc');
      const be = atkAnim>0?'#ff0000':'#ff3030'; r(-8,-14+bc,5,5,be); r(3,-14+bc,5,5,be); r(-7,-13+bc,3,3,'#ff9999'); r(4,-13+bc,3,3,'#ff9999');
      r(-6,-6+bc,12,2,'#1a0828'); for(let t=-5;t<5;t+=2) r(t,-5+bc,1,2,'#cc4444');
      r(13,-16+bc,10,3,'#1a0828'); r(22,-19+bc,3,5,'#1a0828'); r(-23,-15+bc,10,3,'#1a0828'); r(-25,-18+bc,3,5,'#1a0828');
      if(atkAnim>0) { ctx.globalAlpha=0.6; r(-30,-20+bc,60,40,'#440088'); ctx.globalAlpha=1; r(-16,-4+bc,32,3,'#ff44ff'); }
      const p=Math.sin(Date.now()/200); ctx.globalAlpha=0.12+p*0.06; r(-22,-25+bc,44,50,'#8800cc'); ctx.globalAlpha=1;
    }
  } finally { ctx.restore(); }
  
  const bw = isBoss ? 72 : 32; const bx = cx - bw/2; const by2 = cy - (isBoss ? 58 : 34);
  r(bx-1, by2-1, bw+2, 7, '#000'); r(bx, by2, bw, 5, '#330a0a'); r(bx, by2, ~~(bw * Math.max(0, hp/maxHp)), 5, isBoss ? '#cc2288' : '#cc3333');
}

function drawItem(x, y, type) {
  ctx.save();
  try {
    const bob = Math.sin(Date.now()/360 + x*0.01) * 2.5; ctx.translate(~~x, ~~(y+bob));
    if(type === 'seed') { r(-5,-5,11,11,'#66aa22'); r(-4,-4,9,9,'#88cc44'); r(-3,-3,7,7,'#aae060'); r(-1,-1,3,3,'#ccff88'); r(-1,-7,2,4,'#448820'); r(-2,-6,2,2,'#66aa22'); r(1,-6,2,2,'#66aa22'); }
    else if(type === 'bell') { r(-5,-9,10,10,'#c8b8f0'); r(-6,-8,2,8,'#c8b8f0'); r(5,-8,1,7,'#c8b8f0'); r(-4,-11,8,4,'#a898d8'); r(-3,-13,6,3,'#b8a8e8'); r(-2,-14,4,2,'#c8b8f8'); r(-1,-15,2,3,'#5a9a5a'); r(0,2,2,3,'#2a2a2a'); }
    else if(type === 'heal') { r(-5,-5,10,10,'#ff7070'); r(-4,-6,8,2,'#ff7070'); r(-6,-4,2,8,'#ff7070'); r(-4,-4,8,8,'#ff9898'); r(-3,-3,6,6,'#ffbbbb'); r(-1,-1,2,2,'#ffffff'); r(-2,-5,4,1,'#ff4444'); r(-4,-2,1,4,'#ff4444'); r(3,-2,1,4,'#ff4444'); r(-2,3,4,1,'#ff4444'); }
    else if(type === 'star') { r(-1,-7,2,14,'#ffdd44'); r(-7,-1,14,2,'#ffdd44'); r(-4,-4,3,3,'#ffdd44'); r(2,-4,3,3,'#ffdd44'); r(-4,2,3,3,'#ffdd44'); r(2,2,3,3,'#ffdd44'); r(-1,-6,2,2,'#ffffff'); r(-5,-1,2,2,'#fff8aa'); }
    else if(type === 'coin') { r(-5,-5,10,10,'#ddaa00'); r(-4,-6,8,2,'#ddaa00'); r(-6,-4,2,8,'#ddaa00'); r(-4,-4,8,8,'#ffcc22'); r(-3,-3,6,6,'#ffe066'); r(-2,-2,4,4,'#fff088'); r(-2,-5,4,1,'#ffcc22'); r(-5,-2,1,4,'#ffcc22'); r(4,-2,1,4,'#ffcc22'); r(-2,4,4,1,'#ffcc22'); r(-1,-1,1,1,'#ffffff'); }
    else if(type === 'book') { r(-5,-7,11,11,'#8a6030'); r(-4,-6,9,9,'#aa8050'); r(-4,-6,3,9,'#cc9060'); r(-4,-7,9,2,'#cc9060'); r(-1,-4,4,5,'#e8d0a0'); }
    else if(type === 'apple') { r(-4,-6,9,9,'#ee3333'); r(-5,-5,3,7,'#ee3333'); r(3,-5,2,5,'#ee3333'); r(-3,-7,6,3,'#ff5555'); r(-2,-9,3,4,'#5a9a5a'); r(1,-8,2,2,'#5a9a5a'); r(-3,-3,3,3,'#ff7777'); }
    else if(type === 'shield') { r(-5,-6,10,12,'#00bfff'); r(-4,-5,8,10,'#88ddff'); r(-2,-3,4,6,'#ffffff'); }
  } finally { ctx.restore(); }
}

function drawPlant(x, y, grow) {
  const g = Math.min(grow, 1); const h = ~~(g*26);
  r(x-1, y-h, 2, h, '#5a9a3a');
  if(g > .35) { r(x-5, y-h-2, 5, 5, '#88dd55'); }
  if(g > .65) { r(x, y-h-7, 4, 6, '#f0e8ff'); r(x-6, y-h-5, 4, 5, '#f0e8ff'); }
  if(g > .9) { r(x-1, y-h-10, 3, 4, '#ffddff'); }
}

function drawNPC(cx, cy, type) {
  ctx.save();
  try {
    const bob = ~~(Math.sin(Date.now()/350)*1.5); ctx.translate(~~cx, ~~cy);
    if(type === 'rabbit') { r(-5,-8+bob,10,10,'#f0c0d0'); r(-7,-10+bob,3,8,'#e8b0c0'); r(4,-10+bob,3,8,'#e8b0c0'); r(-3,-5+bob,2,2,'#ff6688'); r(1,-5+bob,2,2,'#ff6688'); r(-1,-3+bob,3,1,'#2a2a2a'); r(-4,2+bob,4,4,'#f0c0d0'); r(1,2+bob,4,4,'#f0c0d0'); }
    else if(type === 'frog') { r(-6,-6+bob,12,10,'#4aaa4a'); r(-8,-4+bob,4,6,'#4aaa4a'); r(4,-4+bob,4,6,'#4aaa4a'); r(-7,-8+bob,4,4,'#66cc66'); r(3,-8+bob,4,4,'#66cc66'); r(-2,-5+bob,2,2,'#ffff44'); r(1,-5+bob,2,2,'#ffff44'); r(-1,-4+bob,4,1,'#2a2a2a'); }
  } finally { ctx.restore(); }
}

function drawTrap(trap) {
  ctx.save();
  try {
    ctx.translate(~~trap.x, ~~trap.y);
    if(trap.type === 'bomb') {
      if(trap.state === 'warning') {
        ctx.fillStyle = 'rgba(255, 0, 0, 0.3)'; ctx.beginPath(); ctx.arc(0, 0, 55, 0, Math.PI*2); ctx.fill();
        ctx.strokeStyle = 'red'; ctx.beginPath(); ctx.arc(0, 0, 55, 0, Math.PI*2); ctx.stroke();
        r(-7,-7,14,12,'#222222'); r(-5,-6,10,10,'#ff4444');
      } else if(trap.state === 'exploding') {
        const r2 = ~~(trap.exploding/3)*6; ctx.globalAlpha = trap.exploding/30*0.9;
        ctx.fillStyle = '#ff8800'; ctx.beginPath(); ctx.arc(0,0,Math.max(0.1, r2+8),0,Math.PI*2); ctx.fill();
        ctx.fillStyle = '#ffee00'; ctx.beginPath(); ctx.arc(0,0,Math.max(0.1, r2+2),0,Math.PI*2); ctx.fill();
        ctx.globalAlpha = 1;
      } else {
        const c1 = trap.state === 'cooldown' ? '#555555' : '#333333';
        r(-7,-7,14,12,'#222222'); r(-6,-8,10,3,'#222222'); r(-8,-6,2,8,'#222222'); r(6,-6,2,7,'#222222');
        r(-5,-6,10,10,c1); r(-4,-5,8,8,'#444444'); r(-2,-2,3,3,'#555555');
        r(-2,-10,3,5,'#888844'); r(-3,-8,1,1,'#ffaa00'); r(2,-9,1,2,'#ff8800');
      }
    } else if(trap.type === 'spike') {
      ctx.fillStyle = '#888899'; for(let i=0; i<4; i++){ ctx.beginPath(); ctx.moveTo(-8+i*5,-8); ctx.lineTo(-6+i*5,2); ctx.lineTo(-4+i*5,-8); ctx.closePath(); ctx.fill(); } r(-10,2,20,4,'#666677');
    } else if(trap.type === 'speed_pad') {
      const glow = Math.sin(Date.now()/200)*.3+.7; ctx.fillStyle = `rgba(0,180,255,${glow*.5})`; ctx.fillRect(-18,-4,36,8);
      ctx.fillStyle = `rgba(100,220,255,${glow})`; for(let i=0; i<3; i++) { ctx.fillRect(-12+i*10,-2,6,4); }
      r(-15,-1,4,2,'#ffffff'); r(-8,-1,4,2,'#ffffff'); r(-1,-1,4,2,'#ffffff'); r(6,-1,4,2,'#ffffff');
    } else if(trap.type === 'ice') {
      const gl2 = Math.sin(Date.now()/300)*.2+.8; ctx.fillStyle = `rgba(100,200,255,${gl2*.6})`; ctx.fillRect(-16,-4,32,8);
      r(-14,-3,28,6,'rgba(200,240,255,0.9)'); r(-12,-2,6,4,'rgba(255,255,255,0.7)'); r(-2,-2,6,4,'rgba(255,255,255,0.7)'); r(8,-2,6,4,'rgba(255,255,255,0.7)');
    }
  } finally { ctx.restore(); }
}

function drawProjectile(proj) {
  if(!proj || !Number.isFinite(proj.x) || !Number.isFinite(proj.y)) return;
  ctx.save();
  try {
    ctx.translate(~~proj.x, ~~proj.y);
    const fade = Math.min(1, Math.max(0, proj.life / proj.maxLife)); ctx.globalAlpha = fade;
    r(-5,-2,10,4,'#ffff88'); r(-2,-5,4,10,'#ffff88'); r(-4,-1,8,2,'#ffdd44'); r(-1,-4,2,8,'#ffdd44');
    r(-2,-1,4,2,'#ffffff'); r(-1,-2,2,4,'#ffffff'); r(proj.vx>0?-12:-2,-1,8,2,'rgba(255,220,50,0.5)');
    ctx.globalAlpha = 1;
  } finally { ctx.restore(); }
}

function drawEnemyProj(proj) {
  ctx.save();
  try {
    ctx.translate(~~proj.x, ~~proj.y);
    const fade = proj.life / proj.maxLife; ctx.globalAlpha = fade*.9;
    if(proj.etype === 'spirit') { r(-5,-5,10,10,'#cc44ff'); r(-4,-4,8,8,'#aa22dd'); r(-2,-2,4,4,'#ff88ff'); r(-1,-1,2,2,'#ffffff'); }
    else if(proj.etype === 'boss') {
      r(-7,-7,14,14,'#8800cc'); r(-5,-5,10,10,'#cc00ff'); r(-3,-3,6,6,'#ff44ff'); r(-1,-1,2,2,'#ffffff');
      const p = Math.sin(Date.now()/150)*.5+.5; ctx.fillStyle=`rgba(200,0,255,${p*.4})`; ctx.fillRect(-9,-9,18,18);
    }
    ctx.globalAlpha = 1;
  } finally { ctx.restore(); }
}

function pxTree(x, bY, sc, c1, c2) {
  r(x-4*sc, bY-40*sc, 8*sc, 40*sc, c2); r(x-16*sc, bY-80*sc, 32*sc, 46*sc, c1); r(x-10*sc, bY-96*sc, 20*sc, 20*sc, c1);
  r(x-20*sc, bY-66*sc, 6*sc, 14*sc, c1); r(x+14*sc, bY-66*sc, 6*sc, 14*sc, c1);
}

function bgIndigo(sx) {
  const g = ctx.createLinearGradient(0,0,0,380); g.addColorStop(0,'#0a0820'); g.addColorStop(0.5,'#12103a'); g.addColorStop(1,'#1a1840');
  ctx.fillStyle = g; ctx.fillRect(0,0,800,380);
  [[40,18],[115,42],[195,12],[305,55],[445,22],[575,38],[695,12],[755,50],[340,30],[500,15]].forEach(([x,y])=>{
    const tw = Math.sin(Date.now()/500+x)*0.4+0.6; r(x,y,2,2,`rgba(220,200,255,${tw})`);
  });
  ctx.fillStyle='rgba(200,180,255,0.18)'; ctx.beginPath(); ctx.arc(680,60,40,0,Math.PI*2); ctx.fill();
  ctx.fillStyle='rgba(180,160,240,0.3)'; ctx.beginPath(); ctx.arc(680,60,22,0,Math.PI*2); ctx.fill();
  for(let i=0;i<12;i++){const tx=((i*75-sx*.2)%1000+1000)%1000-60; pxTree(tx,280,.65,'#1a1448','#0e0c30');}
  for(let i=0;i<8;i++){const tx=((i*110+35-sx*.5)%1100+1100)%1100-80; pxTree(tx,315,.95,'#24206a','#181450');}
  r(0,380,800,220,'#0e0c1e'); r(0,380,800,7,'#2a2660');
  for(let i=0;i<35;i++){const gx=((i*24-sx*.8)%900+900)%900; r(gx,384,3,2, i%3===0?'#1e1a40':'#16143a');}
}

function bgTeal(sx) {
  const g = ctx.createLinearGradient(0,0,0,380); g.addColorStop(0,'#041820'); g.addColorStop(0.6,'#062830'); g.addColorStop(1,'#083840');
  ctx.fillStyle = g; ctx.fillRect(0,0,800,380);
  [[60,20],[150,45],[240,15],[355,58],[480,24],[600,40],[720,14],[780,52]].forEach(([x,y])=>{r(x,y,2,2,'rgba(150,255,230,0.7)');});
  for(let i=0;i<10;i++){const hx=((i*130-sx*.4)%1100+1100)%1100-100; ctx.fillStyle=i%2===0?'#062a30':'#042028'; ctx.beginPath(); ctx.ellipse(hx,340,85,52,0,0,Math.PI*2); ctx.fill();}
  for(let i=0;i<16;i++){const wx=((i*55-sx*.6)%1000+1000)%1000; const wc=Math.sin(Date.now()/400+i)>.0?'rgba(0,180,180,0.25)':'rgba(0,140,160,0.2)'; r(wx,350,40,6,wc);}
  r(0,380,800,220,'#041418'); r(0,380,800,6,'#0a4048');
  for(let i=0;i<22;i++){const fx=((i*44-sx*.9)%900+900)%900; r(fx,375,4,5, ['#00ffcc','#00eebb','#66ffdd','#88ffee'][i%4]+'77');}
}

function bgCrimson(sx) {
  const g = ctx.createLinearGradient(0,0,0,400); g.addColorStop(0,'#120008'); g.addColorStop(0.5,'#200010'); g.addColorStop(1,'#2a0018');
  ctx.fillStyle = g; ctx.fillRect(0,0,800,400);
  [[50,20],[130,40],[220,14],[320,56],[460,22],[590,38],[710,16],[770,50]].forEach(([x,y])=>{const tw=Math.sin(Date.now()/500+x)*0.4+0.6; r(x,y,2,2,`rgba(255,160,140,${tw*.5})`);});
  const tx = 400 - sx*.1; r(tx-65,70,130,310,'#180008'); r(tx-75,65,150,16,'#0e0004'); r(tx-55,50,110,22,'#0e0004');
  ctx.fillStyle='#240010'; for(let m=0;m<5;m++) ctx.fillRect(tx-50+m*24,50,11,17);
  for(let row=0;row<5;row++) for(let col=0;col<3;col++){r(tx-42+col*32,115+row*44,13,18, Math.sin(Date.now()/600+row+col)>0?'#cc2244':'#220010');}
  r(0,380,800,220,'#0c0006'); r(0,380,800,6,'#3a0018');
  for(let i=0;i<12;i++){const rx=((i*73-sx*.8)%900+900)%900; r(rx,375,9+(i%3)*4,5,'#180008');}
}

function bgGold(sx) {
  const g = ctx.createLinearGradient(0,0,0,380); g.addColorStop(0,'#1a1200'); g.addColorStop(0.5,'#2a1e00'); g.addColorStop(1,'#3a2800');
  ctx.fillStyle = g; ctx.fillRect(0,0,800,380);
  [[55,18],[140,44],[230,13],[330,57],[470,23],[595,39],[715,13],[772,52]].forEach(([x,y])=>{const tw=Math.sin(Date.now()/480+x)*0.4+0.6; r(x,y,2,2,`rgba(255,220,100,${tw*.7})`);});
  for(let i=0;i<10;i++){const tx=((i*80-sx*.3)%1100+1100)%1100-80; pxTree(tx,300,1.0,'#2a1e00','#1a1200');}
  r(0,380,800,220,'#140e00'); r(0,380,800,6,'#4a3800');
  for(let i=0;i<24;i++){const fx=((i*40-sx*.9)%1000+1000)%1000; r(fx,374,4,6, ['#ffcc44','#ffaa22','#ffee88','#ffdd66'][i%4]+'88');}
}

function bgVoid(sx) {
  const g = ctx.createLinearGradient(0,0,0,400); g.addColorStop(0,'#030006'); g.addColorStop(1,'#070010');
  ctx.fillStyle = g; ctx.fillRect(0,0,800,400);
  const p = Math.sin(Date.now()/400)*.5+.5; r(0,0,800,600,`rgba(80,0,120,${.06+p*.06})`);
  for(let i=0;i<6;i++){const tx=((i*140-sx*.3)%1000+1000)%1000-80; r(tx-4,200,8,180,'#060008'); r(tx-20,220,14,5,'#060008'); r(tx+6,230,16,4,'#060008');}
  r(0,380,800,220,'#030006'); r(0,380,800,5,'#330060');
}

function bgRainbow(sx) {
  const g = ctx.createLinearGradient(0,0,0,380); g.addColorStop(0,'#0a1220'); g.addColorStop(0.5,'#102030'); g.addColorStop(1,'#182838');
  ctx.fillStyle = g; ctx.fillRect(0,0,800,380);
  const rainbowColors=['#ff444488','#ff882288','#ffcc0088','#44cc4488','#2288ff88','#8844cc88'];
  rainbowColors.forEach((c,i)=>{ctx.fillStyle=c; ctx.beginPath(); ctx.arc(400,500,280+i*18,Math.PI,0); ctx.arc(400,500,260+i*18,0,Math.PI,true); ctx.closePath(); ctx.fill();});
  r(0,380,800,220,'#0a1818'); r(0,380,800,6,'#2a5a50');
}

function drawPlatform(x, y, w, theme) {
  const T = {
    indigo: {hi:'#3a3480', top:'#2a2460', mid:'#1e1848', edge:'#4a44aa'}, teal: {hi:'#0a7878', top:'#085858', mid:'#064040', edge:'#0aaa9a'},
    crimson:{hi:'#6a1020', top:'#4a0818', mid:'#360410', edge:'#8a1830'}, gold: {hi:'#7a6000', top:'#5a4400', mid:'#3e3000', edge:'#aa8800'},
    void:   {hi:'#440060', top:'#2a0040', mid:'#180028', edge:'#6600aa'}, rainbow:{hi:'#2a6060', top:'#1a4848', mid:'#103838', edge:'#3a8888'}
  }[theme] || {hi:'#3a3480', top:'#2a2460', mid:'#1e1848', edge:'#4a44aa'};
  r(x, y, w, 4, T.edge); r(x, y+4, w, 6, T.hi); r(x, y+10, w, 6, T.top); r(x, y+16, w, 6, T.mid);
  for(let i=0; i<~~(w/12); i++){ r(x+i*12+3, y+5, 2, 3, T.edge+'88'); }
}

function spawnParts(x, y, col, n=6, spd=2) {
  for(let i=0; i<n; i++) {
    const a = Math.PI*2*i/n + Math.random()*.5; const s = spd*.6 + Math.random()*spd;
    parts.push({x, y, vx:Math.cos(a)*s, vy:Math.sin(a)*s-1, life:45+~~(Math.random()*20), maxLife:65, col, sz:2+Math.random()*2});
  }
}
function updateParts() {
  for(let i=parts.length-1; i>=0; i--) { const p = parts[i]; p.x+=p.vx; p.y+=p.vy; p.vy+=.1; p.life--; if(p.life<=0) parts.splice(i,1); }
}

// ═══════════════════════════════════════════════
//  GAME DATA & MAP BUILDING
// ═══════════════════════════════════════════════
const STAGES = [
  {id:0, name:'새벽의 인디고 숲', theme:'indigo', bg:bgIndigo, enemies:['vine'], boss:false, seedN:3, bellN:2, npc:'rabbit', locked:false, puzzle:true, stars:0},
  {id:1, name:'수정 빛 강가', theme:'teal', bg:bgTeal, enemies:['spirit'], boss:false, seedN:4, bellN:3, npc:'frog', locked:true, puzzle:true, stars:0},
  {id:2, name:'붉은 고대 유적', theme:'crimson', bg:bgCrimson, enemies:['vine','spirit'], boss:false, seedN:5, bellN:4, npc:null, locked:true, puzzle:true, stars:0},
  {id:3, name:'황금 마법의 숲', theme:'gold', bg:bgGold, enemies:['vine','golem'], boss:false, seedN:5, bellN:4, npc:'rabbit', locked:true, puzzle:false, stars:0},
  {id:4, name:'공허의 심장 (보스)', theme:'void', bg:bgVoid, enemies:['vine','spirit'], boss:true, seedN:0, bellN:0, npc:null, locked:true, puzzle:false, stars:0},
  {id:5, name:'무지개 비밀 정원', theme:'rainbow', bg:bgRainbow, enemies:['spirit'], boss:false, seedN:3, bellN:3, npc:'frog', locked:true, puzzle:true, stars:0, secret:true},
];

function buildPlatforms(theme) {
  plat = [];
  const grounds = [[0,388,380], [420,388,180], [630,388,260], [920,388,220], [1180,388,280], [1500,388,220], [1760,388,800]];
  grounds.forEach(p => plat.push({x:p[0], y:p[1], w:p[2], theme}));
  const floats = [
    {x:160,y:318,w:90}, {x:310,y:272,w:80}, {x:480,y:318,w:85}, {x:660,y:298,w:80}, {x:820,y:260,w:85}, {x:985,y:308,w:90},
    {x:1130,y:262,w:80}, {x:1280,y:314,w:85}, {x:1430,y:272,w:80}, {x:1590,y:306,w:90}, {x:1740,y:258,w:82}, {x:1910,y:294,w:80},
    {x:2050,y:322,w:85}, {x:2200,y:280,w:80}, {x:2340,y:314,w:90},
  ];
  floats.forEach(p => plat.push({x:p.x, y:p.y, w:p.w, theme}));
}

function buildEnemies(S) {
  enems = [];
  const placements = [
    {platIdx:0, offset:250}, {platIdx:1, offset:120}, {platIdx:2, offset:180},
    {platIdx:3, offset:100}, {platIdx:4, offset:120}, {platIdx:5, offset:110},
    {platIdx:6, offset:140}, {platIdx:7, offset:100}, {platIdx:8, offset:130},
    {platIdx:9, offset:90}, {platIdx:10, offset:110}, {platIdx:12, offset:80}
  ];
  placements.forEach((pl, i) => {
    if(pl.platIdx >= plat.length) return;
    const p = plat[pl.platIdx]; const tp = S.enemies[i%S.enemies.length];
    const ex = p.x + Math.min(pl.offset + Math.random()*60 - 30, p.w-20);
    enems.push({x:ex, y:p.y-22, vx:(i%2===0?.8:-.8), vy:0, type:tp, hp:3, maxHp:3, frame:0, frameT:0, onGround:false, stunT:0, alive:true, pL:p.x+4, pR:p.x+p.w-20, platRef:p, atkT:0, atkAnim:0, shootCd:0});
  });
  if(S.boss) { const bp = plat[6]; enems.push({x:bp.x+200, y:bp.y-30, vx:.6, vy:0, type:'boss', hp:14, maxHp:14, frame:0, frameT:0, onGround:false, stunT:0, alive:true, pL:bp.x+20, pR:bp.x+bp.w-30, platRef:bp, isBoss:true, atkT:0, atkAnim:0, shootCd:0}); }
}

function buildItems(S) {
  items = [];
  const itemPlatforms = [
    {pi:0, ox:60, type:'seed'}, {pi:1, ox:40, type:'bell'}, {pi:2, ox:50, type:'seed'},
    {pi:3, ox:40, type:'bell'}, {pi:4, ox:55, type:'seed'}, {pi:5, ox:45, type:'bell'},
    {pi:6, ox:50, type:'seed'}, {pi:7, ox:40, type:'bell'}, {pi:8, ox:50, type:'seed'},
    {pi:9, ox:40, type:'bell'}, {pi:10, ox:55, type:'seed'}, {pi:11, ox:40, type:'bell'},
    {pi:12, ox:50, type:'seed'}, {pi:13, ox:40, type:'star'}, {pi:14, ox:50, type:'coin'},
    {pi:0, ox:180, type:'coin'}, {pi:1, ox:70, type:'coin'}, {pi:3, ox:80, type:'coin'},
    {pi:5, ox:60, type:'coin'}, {pi:6, ox:120, type:'coin'}, {pi:8, ox:70, type:'coin'},
    {pi:4, ox:30, type:'heal'}, {pi:9, ox:60, type:'heal'}, {pi:13, ox:20, type:'heal'},
    {pi:2, ox:30, type:'book'}, {pi:11, ox:25, type:'star'}, {pi:14, ox:20, type:'star'},
    {pi:7, ox:65, type:'coin'}, {pi:10, ox:30, type:'coin'}, {pi:12, ox:20, type:'coin'},
    {pi:2, ox:100, type:'shield'}, {pi:7, ox:80, type:'shield'}, {pi:12, ox:70, type:'shield'}
  ];
  if(S.id === 5) itemPlatforms.push({pi:3, ox:20, type:'apple'}, {pi:8, ox:30, type:'apple'});
  itemPlatforms.forEach(ip => {
    if(ip.pi >= plat.length) return;
    const p = plat[ip.pi];
    items.push({type:ip.type, x:p.x+Math.min(ip.ox, p.w-10), y:p.y-12, col:false});
  });
}

function buildTraps(theme) {
  traps = [];
  [{pi:1, ox:90}, {pi:2, ox:120}, {pi:3, ox:100}, {pi:5, ox:80}, {pi:6, ox:200}].forEach(sp => { if(sp.pi < plat.length) traps.push({type:'spike', x:plat[sp.pi].x+Math.min(sp.ox, plat[sp.pi].w-20), y:plat[sp.pi].y+2, active:true}); });
  [{pi:7, ox:30}, {pi:9, ox:35}, {pi:11, ox:25}].forEach(bp => { if(bp.pi < plat.length) traps.push({type:'bomb', x:plat[bp.pi].x+bp.ox, y:plat[bp.pi].y-8, state:'idle', warning:0, exploding:0, cooldown:0, active:true}); });
  [{pi:0, ox:250}, {pi:2, ox:140}, {pi:6, ox:100}].forEach(sp => { if(sp.pi < plat.length) traps.push({type:'speed_pad', x:plat[sp.pi].x+sp.ox, y:plat[sp.pi].y+2, active:true}); });
  [{pi:3, ox:90}, {pi:5, ox:60}].forEach(ip => { if(ip.pi < plat.length) traps.push({type:'ice', x:plat[ip.pi].x+ip.ox, y:plat[ip.pi].y+2, active:true}); });
}

// ═══════════════════════════════════════════════
//  GAME LOOP & LOGIC
// ═══════════════════════════════════════════════
function hideAllUI() {
  document.getElementById('worldMap').style.display = 'none';
  document.getElementById('puzzleScreen').style.display = 'none';
  document.getElementById('stageClear').style.display = 'none';
  document.getElementById('gameOver').style.display = 'none';
  document.getElementById('dlgBox').style.display = 'none';
}

function initStage(idx) {
  const S = STAGES[idx];
  plants = []; npcs = []; projs = []; enemProjs = []; parts = []; traps = []; cam.x = 0; qs = {seedC:0, bellC:0, killC:0, bossKill:false};
  puzzlePending = S.puzzle && !puzzleDone; puzzleDone = false; puzzleLives = 3; pzCards = [];
  
  // 💡 수정됨: 이전 스테이지에서 넘어올 때 키 눌림/공격 쿨타임 초기화 방지
  for(let k in keys) keys[k] = false;
  for(let k in prevK) prevK[k] = false;
  player.x = 50; player.y = 340; player.vx = 0; player.vy = 0; player.state = 'idle'; player.jumps = 0; player.speed = 1; player.speedT = 0; player.frozen = 0; player.onGround = true; player.inv = 0; player.atkT = 0; 
  clearTriggered = false;

  buildPlatforms(S.theme); buildEnemies(S); buildItems(S); buildTraps(S.theme);
  
  if(S.npc) { 
    npcs.push({x:plat[0].x+40, y:plat[0].y-18, type:S.npc, talked:false, dialogue: [
      {s:S.npc==='rabbit'?'코코(토끼)':'개굴이(개구리)', t:S.npc==='rabbit'?'은방울! 이 인디고 숲엔 독기 가득해. 조심해!':'개굴~ 수정 빛 강가야! 정말 아름다워!'},
      {s:S.npc==='rabbit'?'코코':'개굴이', t:S.npc==='rabbit'?'파란 폭탄 조심해! 터지기 전에 붉은 영역이 보여!':'빠른 패드 밟으면 엄청 빨라져! 재밌어!'}
    ]});
  }

  updateHUD(); updateQuestPanel(); showStageTitle(S.name, idx+1);
  const dlgs = [[{s:'시스템',t:'새로운 지역에 진입했습니다.'}]];
  showDlg(dlgs[0]);
}

function updateHUD() {
  const hr = document.getElementById('heartsRow'); hr.innerHTML = '';
  for(let i=0; i<MAX_LIVES; i++) { const d = document.createElement('div'); d.className = 'hrt'; d.style.background = i<GS.lives ? '#ff3355' : '#330011'; d.style.border = '1px solid #660022'; hr.appendChild(d); }
  document.getElementById('hShield').textContent = GS.shield;
  document.getElementById('hSeed').textContent = GS.seeds; document.getElementById('hBell').textContent = GS.bells; document.getElementById('hCoin').textContent = GS.coins; document.getElementById('hStar').textContent = GS.stars; document.getElementById('hLv').textContent = GS.level;
  document.getElementById('iSeed').textContent = qs.seedC; document.getElementById('iBell').textContent = qs.bellC; document.getElementById('iCoin').textContent = GS.coins; document.getElementById('iStar').textContent = GS.stars;
}

function updateQuestPanel() {
  const S = STAGES[GS.stage]; let h = '';
  if(S.boss) { h += `<div class="qi${qs.bossKill?' done':''}">보스 처치</div>`; }
  else { h += `<div class="qi${qs.seedC>=S.seedN?' done':''}">씨앗 ${qs.seedC}/${S.seedN}</div><div class="qi${qs.bellC>=S.bellN?' done':''}">종 ${qs.bellC}/${S.bellN}</div><div class="qi${qs.killC>=3?' done':''}">처치 ${qs.killC}/3</div>`; }
  if(S.puzzle && !puzzleDone) h += '<div class="qi">퍼즐 미완</div>'; else if(S.puzzle) h += '<div class="qi done">퍼즐 완료</div>';
  document.getElementById('questList').innerHTML = h;
}

function checkQC() {
  const S = STAGES[GS.stage];
  if(S.puzzle && !puzzleDone) return false;
  if(S.boss) return qs.bossKill;
  return qs.seedC >= S.seedN && qs.bellC >= S.bellN && qs.killC >= 3;
}

const GRAV = 0.42, JSPD = -8.5, MSPD = 3.2;

function resolveCol(ent, ew, eh) {
  ent.onGround = false;
  for(const p of plat) {
    if(ent.x+ew > p.x+2 && ent.x < p.x+p.w-2 && ent.y+eh > p.y && ent.y+eh <= p.y+18 && ent.vy >= 0) { ent.y = p.y-eh; ent.vy = 0; ent.onGround = true; }
    if(ent.x+ew > p.x+2 && ent.x < p.x+p.w-2 && ent.y > p.y+10 && ent.y < p.y+22 && ent.vy < 0) { ent.y = p.y+22; ent.vy = 0; }
  }
  if(ent.y > 660) { ent.y = 360; ent.vy = 0; if(ent === player) takeDmg(true); }
  if(ent.x < 0) { ent.x = 0; ent.vx = 0; }
}

function takeDmg(ignoreShield = false) {
  if(player.inv > 0) return;
  if(!ignoreShield && GS.shield > 0) {
    GS.shield--; player.inv = 100; spawnParts(player.x+10, player.y+8, '#00bfff', 8); showNotif('🛡️ 보호막이 공격을 막았습니다!');
  } else {
    GS.lives = Math.max(0, GS.lives-1); player.inv = 160; spawnParts(player.x+10, player.y+8, '#ff4444', 8);
  }
  player.vx = player.facing * -2; player.vy = -3; updateHUD();
  if(GS.lives <= 0) trigGO();
}

function doAtk() {
  if(player.atkT > 0) return;
  player.atkT = 22; player.state = 'attack'; const px2 = player.facing === 1 ? player.x+22 : player.x;
  projs.push({x:px2, y:player.y+10, vx:player.facing*8, vy:0, life:28, maxLife:28, w:10, h:10}); spawnParts(px2, player.y+10, '#ffff88', 4, 1.5);
}

function plantSeed() {
  if(GS.seeds < 1) { showNotif('씨앗이 없어요!'); return; }
  GS.seeds--; plants.push({x:player.x+10, y:player.y+28, grow:0}); spawnParts(player.x+10, player.y+28, '#88ff44', 5); showNotif('씨앗을 심었어요!'); updateHUD();
}

// ═══════════════════════════════════════════════
// 💡 수정됨: 키 입력 이벤트 처리 (한/영 키 호환 & e.code 추가)
// ═══════════════════════════════════════════════
const keys = {}, prevK = {};
window.addEventListener('keydown', e => { 
  keys[e.key] = true; 
  if(e.code) keys[e.code] = true; 
  if(e.key === ' ' || e.code === 'Space') { keys[' '] = true; keys['Space'] = true; } 
  if(e.key === 'Enter' && dlgOn) advDlg(); 
  if(['ArrowUp','ArrowDown','ArrowLeft','ArrowRight',' '].includes(e.key)) e.preventDefault(); 
});
window.addEventListener('keyup', e => { 
  keys[e.key] = false; 
  if(e.code) keys[e.code] = false; 
  if(e.key === ' ' || e.code === 'Space') { keys[' '] = false; keys['Space'] = false; } 
});

let stgTitleT = 0, notifT = 0;
function showStageTitle(name, num) { document.getElementById('stgTitle').innerHTML = `STAGE ${num}<br><span style="font-size:18px">${name}</span>`; document.getElementById('stgTitle').style.display = 'block'; stgTitleT = 2600; }
function showNotif(txt) { document.getElementById('notif').textContent = txt; document.getElementById('notif').style.display = 'block'; notifT = 2000; }

let dlgQ = [], dlgIdx = 0, dlgOn = false;
function showDlg(lines) { if(!lines || !lines.length) return; hideAllUI(); dlgQ = lines; dlgIdx = 0; dlgOn = true; _dlgLine(); }
function _dlgLine() { document.getElementById('dlgSpk').textContent = dlgQ[dlgIdx].s||''; document.getElementById('dlgTxt').textContent = dlgQ[dlgIdx].t||''; document.getElementById('dlgBox').style.display='block'; }
function advDlg() { dlgIdx++; if(dlgIdx >= dlgQ.length) { dlgOn = false; document.getElementById('dlgBox').style.display='none'; } else _dlgLine(); }

// --- 퍼즐 로직 ---
const PZ_EMOJIS = ['A','B','C','D','E','F','G','H'];
function openPuzzle() {
  hideAllUI(); document.getElementById('puzzleScreen').style.display = 'flex';
  document.getElementById('puzzleDesc').textContent = '같은 그림 카드 2장을 찾아 짝을 맞추세요!\n기회 내에 모두 맞추면 씨앗 +2 획득!';
  document.getElementById('puzzleResult').textContent = ''; document.getElementById('pLifeCnt').textContent = puzzleLives;
  if(pzCards.length === 0) { pzCards = [...PZ_EMOJIS, ...PZ_EMOJIS].sort(() => Math.random() - .5); pzFlipped = new Array(16).fill(false); pzMatched = new Array(16).fill(false); }
  pzLock = false; renderPuzzleGrid();
}
function renderPuzzleGrid() {
  const grid = document.getElementById('puzzleGrid'); grid.innerHTML = '';
  pzCards.forEach((em, i) => {
    const tile = document.createElement('div'); tile.className = 'ptile';
    if(pzMatched[i] || pzFlipped[i]) { tile.textContent = em; tile.classList.add(pzMatched[i] ? 'matched' : 'revealed'); } else { tile.textContent = '?'; }
    tile.addEventListener('click', () => pzClick(i, tile)); grid.appendChild(tile);
  });
}
function pzClick(i, tile) {
  if(pzLock || pzFlipped[i] || pzMatched[i] || puzzleLives <= 0) return;
  pzFlipped[i] = true; tile.textContent = pzCards[i]; tile.classList.add('revealed');
  const fl = pzFlipped.map((f, j) => f && !pzMatched[j] ? j : -1).filter(j => j >= 0);
  if(fl.length === 2) {
    pzLock = true; const [a, b] = fl;
    setTimeout(() => {
      if(pzCards[a] === pzCards[b]) {
        pzMatched[a] = pzMatched[b] = true; renderPuzzleGrid();
        if(pzMatched.every(m => m)) { document.getElementById('puzzleResult').textContent = '퍼즐 클리어!'; setTimeout(pzSuccess, 1000); }
      } else {
        pzFlipped[a] = pzFlipped[b] = false; puzzleLives--; document.getElementById('pLifeCnt').textContent = puzzleLives; renderPuzzleGrid();
        if(puzzleLives <= 0) { document.getElementById('puzzleResult').textContent = '기회 소진! 퍼즐이 닫힙니다.'; document.getElementById('puzzleResult').style.color = '#ff4444'; setTimeout(() => { document.getElementById('puzzleScreen').style.display = 'none'; puzzleLives = 3; }, 1500); }
      }
      pzLock = false;
    }, 650);
  }
}
function pzSuccess() { document.getElementById('puzzleScreen').style.display = 'none'; puzzleDone = true; puzzlePending = false; GS.seeds += 2; qs.seedC += 2; showNotif('퍼즐 완료! 씨앗+2!'); updateHUD(); updateQuestPanel(); }
function skipPuzzle() { document.getElementById('puzzleScreen').style.display = 'none'; puzzleDone = true; puzzlePending = false; updateQuestPanel(); }

// --- 월드맵 로직 ---
const MAP_NODES = [{x:100,y:250,id:0,name:'인디고 숲'},{x:250,y:150,id:1,name:'수정 강가'},{x:400,y:230,id:2,name:'붉은 유적'},{x:550,y:150,id:3,name:'황금 숲'},{x:700,y:260,id:4,name:'보스'},{x:550,y:330,id:5,name:'비밀 정원',secret:true}];
const MAP_PATHS = [[0, 1], [1, 2], [2, 3], [3, 4], [2, 5]];
function openWorldMap() { hideAllUI(); document.getElementById('worldMap').style.display = 'flex'; drawWorldMap(); }
function closeWorldMap() { document.getElementById('worldMap').style.display = 'none'; if(GS.screen === 'title') document.getElementById('titleScreen').style.display = 'flex'; }
function drawWorldMap() {
  const mc = document.getElementById('mapCanvas'); const mx = mc.getContext('2d'); mx.imageSmoothingEnabled = false;
  const g = mx.createLinearGradient(0, 0, 0, 400); g.addColorStop(0, '#04021a'); g.addColorStop(1, '#0a0828'); mx.fillStyle = g; mx.fillRect(0, 0, 800, 400);
  mx.strokeStyle = '#3a3068'; mx.lineWidth = 4; mx.setLineDash([10, 8]);
  MAP_PATHS.forEach(([a, b]) => { mx.beginPath(); mx.moveTo(MAP_NODES[a].x, MAP_NODES[a].y); mx.lineTo(MAP_NODES[b].x, MAP_NODES[b].y); mx.stroke(); }); mx.setLineDash([]);
  MAP_NODES.forEach(n => {
    const cleared = GS.cleared[n.id]; const lk = STAGES[n.id].locked && !cleared; const col = n.id === 4 ? '#ff4466' : (n.secret ? '#8844cc' : (cleared ? '#44aa66' : '#5a4888'));
    mx.fillStyle = lk ? '#1a1438' : col; mx.beginPath(); mx.arc(n.x, n.y, 30, 0, Math.PI * 2); mx.fill();
    mx.strokeStyle = lk ? '#2a2050' : '#aa88ff'; mx.lineWidth = 3; mx.stroke();
    mx.fillStyle = lk ? '#4a4068' : '#e8e0ff'; mx.font = "14px 'Press Start 2P'"; mx.textAlign = 'center'; mx.textBaseline = 'middle'; mx.fillText(lk ? 'L' : (cleared ? 'C' : `${n.id + 1}`), n.x, n.y);
    mx.fillStyle = '#b8a8d8'; mx.font = "14px 'Noto Sans KR'"; mx.fillText(n.name, n.x, n.y + 45);
  });
  mc.onclick = function (e) {
    const rect = mc.getBoundingClientRect(); const scX = 800 / rect.width, scY = 400 / rect.height; const mx2 = (e.clientX - rect.left) * scX, my2 = (e.clientY - rect.top) * scY;
    MAP_NODES.forEach(nd => {
      if(Math.hypot(mx2 - nd.x, my2 - nd.y) < 35) {
        if(STAGES[nd.id].locked && !GS.cleared[nd.id]) { showNotif('먼저 이전 스테이지를 클리어하세요!'); return; }
        closeWorldMap(); document.getElementById('titleScreen').style.display = 'none'; GS.screen = 'game'; GS.stage = nd.id; initStage(nd.id);
      }
    });
  };
}

function trigClear() {
  if(clearTriggered) return; clearTriggered = true; GS.cleared[GS.stage] = true; GS.level++;
  if(GS.stage + 1 < STAGES.length) STAGES[GS.stage + 1].locked = false; if(GS.stage === 2) STAGES[5].locked = false;
  const stars = GS.lives >= 4 ? 3 : (GS.lives >= 2 ? 2 : 1); STAGES[GS.stage].stars = stars;
  hideAllUI();
  document.getElementById('clearMsg').textContent = ['인디고 숲 클리어!\n새벽빛이 돌아왔어요!', '수정 강가 클리어!\n강물이 다시 빛나요!', '붉은 유적 클리어!\n고대의 봉인이 풀렸어요!', '황금 숲 클리어!\n황금빛 꽃들이 피어나요!', '보스 처치!\n공허의 심장이 정화됐어요!', '비밀 정원 클리어!\n무지개가 세상을 감싸요!'][GS.stage] || '클리어!';
  document.getElementById('clearStars').innerHTML = Array.from({ length: 3 }, (_, i) => `<span style="opacity:${i < stars ? 1 : .2}">${i < stars ? 'S' : 'X'}</span>`).join('');
  document.getElementById('stageClear').style.display = 'flex';
}
function goNextStage() { hideAllUI(); clearTriggered = false; if(GS.stage >= STAGES.length - 1) { showEnding(); return; } GS.stage++; initStage(GS.stage); GS.screen = 'game'; }
function trigGO() { if(GS.screen === 'gameOver') return; hideAllUI(); GS.screen = 'gameOver'; document.getElementById('gameOver').style.display = 'flex'; }
function restartGame() { hideAllUI(); GS = { screen: 'game', stage: GS.stage, lives: MAX_LIVES, shield: 0, seeds: 0, bells: 0, coins: 0, stars: 0, level: 1, cleared: GS.cleared }; clearTriggered = false; puzzleDone = false; initStage(GS.stage); }
function showEnding() { showDlg([{s:'은방울',t:'해냈어! 모든 세계가 치유됐어!'},{s:'코코',t:'은방울, 정말 대단해!'},{s:'개굴이',t:'고마워 은방울!'},{s:'THE END',t:'은방울의 모험 2를 완주하셨습니다!'}]); document.getElementById('dlgBox').onclick = function() { advDlg(); if(!dlgOn) { document.getElementById('gameOver').style.display = 'flex'; document.getElementById('goMsg').textContent = '게임 클리어!'; document.getElementById('goMsg').style.color = '#ffdd44'; } }; }

document.getElementById('dlgBox').addEventListener('click', advDlg);
document.getElementById('closeMapBtn').addEventListener('click', closeWorldMap);
document.getElementById('skipPuzzleBtn').addEventListener('click', skipPuzzle);
document.getElementById('clearMapBtn').addEventListener('click', openWorldMap);
document.getElementById('nextStageBtn').addEventListener('click', goNextStage);
document.getElementById('restartBtn').addEventListener('click', restartGame);
document.getElementById('goMapBtn').addEventListener('click', openWorldMap);
document.getElementById('startBtn').addEventListener('click', () => { hideAllUI(); document.getElementById('titleScreen').style.display = 'none'; GS.screen = 'game'; initStage(0); });
document.getElementById('titleMapBtn').addEventListener('click', () => { openWorldMap(); document.getElementById('titleScreen').style.display = 'none'; });

// ═══════════════════════════════════════════════
//  UPDATE & RENDER LOOP
// ═══════════════════════════════════════════════
let lastT = 0;
function loop(ts) {
  const dt = Math.min(ts - lastT, 50); lastT = ts;
  if(GS.screen === 'game') { update(dt); render(); }
  else if(GS.screen === 'title') renderTitle();
  requestAnimationFrame(loop);
}

function update(dt) {
  if(dlgOn) { Object.assign(prevK, keys); return; }
  if(stgTitleT > 0) { stgTitleT -= dt; if(stgTitleT <= 0) document.getElementById('stgTitle').style.display = 'none'; }
  if(notifT > 0) { notifT -= dt; if(notifT <= 0) document.getElementById('notif').style.display = 'none'; }
  if(player.inv > 0) player.inv--; if(player.atkT > 0) player.atkT--;
  if(player.speedT > 0) { player.speedT -= dt; if(player.speedT <= 0) { player.speed = 1; showNotif('스피드 종료'); } }
  if(player.frozen > 0) player.frozen -= dt;

  const frozen = player.frozen > 0;
  if(!frozen) {
    const spd = MSPD * player.speed;
    // 💡 수정됨: 방향키 입력에 한/영 키 방지 처리
    if(keys['ArrowLeft'] || keys['a'] || keys['A'] || keys['KeyA'] || keys['ㅁ']) { player.vx = -spd; player.facing = -1; if(player.state !== 'attack') player.state = 'walk'; }
    else if(keys['ArrowRight'] || keys['d'] || keys['D'] || keys['KeyD'] || keys['ㅇ']) { player.vx = spd; player.facing = 1; if(player.state !== 'attack') player.state = 'walk'; }
    else { player.vx *= 0.76; if(player.state === 'walk') player.state = 'idle'; }
  } else player.vx *= 0.5;

  // 💡 수정됨: 점프 & 공격 & 씨앗 심기 단축키 인식 강화 (한글 키 씹힘 방지)
  const isUp = keys['ArrowUp'] || keys['w'] || keys['W'] || keys['KeyW'] || keys['ㅈ'];
  const wasUp = prevK['ArrowUp'] || prevK['w'] || prevK['W'] || prevK['KeyW'] || prevK['ㅈ'];
  if(isUp && !wasUp) {
    if(player.onGround) { player.vy = JSPD; player.jumps = 1; player.state = 'jump'; spawnParts(player.x+10, player.y+28, '#9988ff', 3); }
    else if(player.jumps === 1) { player.vy = JSPD*.88; player.jumps = 2; spawnParts(player.x+10, player.y, '#ccaaff', 6, 2); showNotif('더블 점프!'); }
  }
  if(player.onGround) player.jumps = 0;

  const isZ = keys['z'] || keys['Z'] || keys['KeyZ'] || keys['ㅋ'] || keys['Space'] || keys[' '];
  const wasZ = prevK['z'] || prevK['Z'] || prevK['KeyZ'] || prevK['ㅋ'] || prevK['Space'] || prevK[' '];
  if(isZ && !wasZ) doAtk();

  const isX = keys['x'] || keys['X'] || keys['KeyX'] || keys['ㅌ'];
  const wasX = prevK['x'] || prevK['X'] || prevK['KeyX'] || prevK['ㅌ'];
  if(isX && !wasX) plantSeed();

  const isC = keys['c'] || keys['C'] || keys['KeyC'] || keys['ㅊ'];
  const wasC = prevK['c'] || prevK['C'] || prevK['KeyC'] || prevK['ㅊ'];
  if(isC && !wasC) { if(puzzlePending) openPuzzle(); else openWorldMap(); }

  player.vy += GRAV; player.x += player.vx; player.y += player.vy; resolveCol(player, player.w, player.h);
  if(player.x < 0) player.x = 0; if(player.x > 2390 - player.w) player.x = 2390 - player.w;
  if(player.atkT === 0 && player.state === 'attack') player.state = player.onGround ? 'idle' : 'jump';
  player.frameT += dt; if(player.frameT > 105) { player.frameT = 0; player.frame = (player.frame+1)%4; }
  cam.x += (player.x - 290 - cam.x)*.1; cam.x = Math.max(0, Math.min(cam.x, 2400 - 800));

  // 투사체 충돌 체크
  for(let i=projs.length-1; i>=0; i--) {
    const pj = projs[i]; if(!pj) continue; pj.x += pj.vx; pj.life--;
    if(pj.life <= 0) { projs.splice(i,1); continue; }
    let hit = false;
    for(const e of enems) {
      if(!e.alive || !e.x) continue;
      // 💡 골렘 같은 큰 몬스터도 잘 맞도록 피격 범위 조금 더 넉넉하게 변경
      if(Math.hypot(pj.x - e.x, pj.y - e.y) < 26) {
        e.hp--; e.stunT = 16; e.atkAnim = 20; spawnParts(pj.x, pj.y, '#ff8888', 5);
        if(e.hp <= 0) {
          e.alive = false; qs.killC++; if(e.isBoss) qs.bossKill = true; spawnParts(e.x, e.y, '#ffdd44', 12); showNotif(e.isBoss ? '보스 처치!' : '적 처치!');
          items.push({type:'seed', x:e.x, y:e.y-12, col:false}); if(e.type === 'spirit' || e.type === 'golem') items.push({type:'bell', x:e.x+10, y:e.y-16, col:false});
          items.push({type:'coin', x:e.x-8, y:e.y-12, col:false}); if(e.isBoss) { GS.lives = Math.min(MAX_LIVES, GS.lives+2); updateHUD(); }
        }
        updateQuestPanel(); hit = true; break;
      }
    }
    if(hit) projs.splice(i,1);
  }

  // 적 AI 및 충돌 체크
  for(const e of enems) {
    if(!e.alive) continue;
    e.frameT += dt; if(e.frameT > 145) { e.frameT = 0; e.frame = (e.frame+1)%4; }
    if(e.atkAnim > 0) e.atkAnim--; if(e.stunT > 0) { e.stunT--; continue; }
    e.x += e.vx; if(e.x <= e.pL) { e.x = e.pL; e.vx = Math.abs(e.vx); } else if(e.x >= e.pR) { e.x = e.pR; e.vx = -Math.abs(e.vx); }
    e.vy += GRAV; e.y += e.vy; resolveCol(e, 18, 26);
    e.shootCd -= dt; const distX = player.x - e.x, distY = player.y - e.y;
    if(Math.abs(distX) < 280 && Math.abs(distY) < 100 && e.shootCd <= 0) {
      e.shootCd = e.isBoss ? 1200 : 2200; e.atkAnim = 25;
      if(e.type === 'spirit' || e.type === 'boss') enemProjs.push({x:e.x+(distX>0?1:-1)*12, y:e.y, vx:(distX>0?1:-1)*(e.isBoss?4.5:3), vy:-0.5, life:55, maxLife:55, etype:e.type});
      if(e.type === 'vine' && Math.abs(distX) < 120) { e.vx = (distX>0?1:-1)*2.5; setTimeout(() => { if(e.alive) e.vx = (Math.random()>.5?1:-1)*.8; }, 400); }
    }
    if(e.isBoss) { e.atkT += dt; if(e.atkT > 2200) { e.atkT = 0; e.vx = (player.x>e.x?1:-1)*3.5; setTimeout(() => { if(e.alive) e.vx = (Math.random()>.5?1:-1)*.7; }, 700); } }
    if(player.inv <= 0 && Math.abs(player.x+10 - e.x) < 26 && Math.abs(player.y+14 - (e.y+6)) < 28) { takeDmg(); player.vx = (player.x > e.x ? 2 : -2); player.vy = -4; }
  }

  for(let i=enemProjs.length-1; i>=0; i--) {
    const ep = enemProjs[i]; ep.x += ep.vx; ep.y += ep.vy; ep.vy += .05; ep.life--;
    if(ep.life <= 0) { enemProjs.splice(i,1); continue; }
    if(player.inv <= 0 && Math.abs(player.x+10 - ep.x) < 14 && Math.abs(player.y+14 - ep.y) < 14) { takeDmg(); enemProjs.splice(i,1); }
  }

  // 아이템 습득 체크
  for(const it of items) {
    if(it.col) continue;
    if(Math.abs(player.x+10 - it.x) < 22 && Math.abs(player.y+14 - it.y) < 26) {
      it.col = true;
      if(it.type === 'seed') { GS.seeds++; qs.seedC++; spawnParts(it.x, it.y, '#88ff44', 6); showNotif('씨앗 +1'); }
      else if(it.type === 'bell') { GS.bells++; qs.bellC++; spawnParts(it.x, it.y, '#cc88ff', 6); showNotif('종 +1'); }
      else if(it.type === 'coin') { GS.coins++; spawnParts(it.x, it.y, '#ffcc22', 5); showNotif('동전 +1'); }
      else if(it.type === 'star') { GS.stars++; spawnParts(it.x, it.y, '#ffdd44', 8); showNotif('별 +1!'); }
      else if(it.type === 'heal') { if(GS.lives < MAX_LIVES) { GS.lives++; spawnParts(it.x, it.y, '#ff8888', 8); showNotif('체력 회복!'); } }
      else if(it.type === 'apple') { if(GS.lives < MAX_LIVES) { GS.lives = Math.min(MAX_LIVES, GS.lives+2); spawnParts(it.x, it.y, '#ff6644', 10); showNotif('체력+2!'); } }
      else if(it.type === 'book') { spawnParts(it.x, it.y, '#aa8866', 8); showNotif('스토리북 획득!'); }
      else if(it.type === 'shield') { GS.shield++; spawnParts(it.x, it.y, '#00bfff', 8); showNotif('보호막 +1'); }
      updateHUD(); updateQuestPanel();
    }
  }

  // 트랩 상태 업데이트
  for(const trap of traps) {
    if(!trap.active) continue;
    if(trap.type === 'bomb') {
      if(trap.state === 'cooldown') { trap.cooldown -= dt; if(trap.cooldown <= 0) trap.state = 'idle'; }
      else if(trap.state === 'exploding') {
        trap.exploding -= dt;
        if(trap.exploding > 15 && player.inv <= 0 && Math.abs(player.x+10 - trap.x) < 55 && Math.abs(player.y+14 - trap.y) < 55) { takeDmg(); player.vy = -6; player.vx = (player.x > trap.x ? 4 : -4); }
        if(trap.exploding <= 0) { trap.state = 'cooldown'; trap.cooldown = 1500; }
      }
      else if(trap.state === 'warning') {
        trap.warning -= dt; if(trap.warning <= 0) { trap.state = 'exploding'; trap.exploding = 300; spawnParts(trap.x, trap.y, '#ff8800', 14, 3); }
      } else {
        if(Math.abs(player.x+10 - trap.x) < 80) { trap.state = 'warning'; trap.warning = 800; } 
      }
    } else if(trap.type === 'spike') {
      if(player.inv <= 0 && player.x+player.w > trap.x-10 && player.x < trap.x+20 && player.y+player.h > trap.y-8 && player.y < trap.y+8) { takeDmg(); player.vy = -5; }
    } else if(trap.type === 'speed_pad' && player.x+player.w > trap.x-18 && player.x < trap.x+18 && player.y+player.h > trap.y-2 && player.y+player.h < trap.y+10 && player.onGround) {
      if(player.speed === 1) { player.speed = 2.2; player.speedT = 3500; spawnParts(trap.x, trap.y, '#00ccff', 8, 2); showNotif('스피드 업! x2.2'); }
    } else if(trap.type === 'ice' && player.x+player.w > trap.x-16 && player.x < trap.x+16 && player.y+player.h > trap.y-2 && player.y+player.h < trap.y+10 && player.onGround) {
      if(player.frozen <= 0) { player.frozen = 2200; spawnParts(trap.x, trap.y, '#aaddff', 8, 1); showNotif('얼었어요! 잠시 느려져요...'); }
    }
  }

  for(const p of plants) p.grow = Math.min(p.grow + dt/3200, 1);
  for(const n of npcs) { if(!n.talked && Math.abs(player.x+10 - n.x) < 42 && Math.abs(player.y+14 - n.y) < 42) { n.talked = true; showDlg(n.dialogue); } }
  updateParts();
  
  if(checkQC()) trigClear();
  Object.assign(prevK, keys);
}

function render() {
  ctx.clearRect(0,0,800,600);
  const S = STAGES[GS.stage]; ctx.save(); ctx.translate(-~~cam.x, 0);
  ctx.save(); ctx.translate(~~cam.x, 0); S.bg(cam.x); ctx.restore();

  for(const p of plat) drawPlatform(p.x, p.y, p.w, p.theme);
  for(const trap of traps) { if(trap.active) drawTrap(trap); }
  for(const p of plants) drawPlant(p.x, p.y, p.grow);
  for(const it of items) if(!it.col) drawItem(it.x, it.y, it.type);
  for(const n of npcs) drawNPC(n.x, n.y, n.type);

  for(const e of enems) {
    if(!e.alive) continue; drawEnemy(e.x+9, e.y, e.type, e.frame, e.hp, e.maxHp, e.isBoss, e.atkAnim||0);
    if(e.stunT > 0 && ~~(e.stunT/3)%2 === 0) { ctx.fillStyle='rgba(255,255,255,0.3)'; ctx.fillRect(e.x-10, e.y-14, 38, 34); }
  }
  for(const ep of enemProjs) drawEnemyProj(ep);

  if(!(player.inv > 0 && ~~(player.inv/4)%2 === 0)) drawLily(player.x+10, player.y+14, 0.6, player.facing, player.state, player.frame);
  if(player.speed > 1) { ctx.fillStyle='rgba(0,180,255,0.15)'; ctx.fillRect(player.x-5, player.y-5, player.w+10, player.h+10); }
  if(player.frozen > 0) { ctx.fillStyle='rgba(150,220,255,0.3)'; ctx.fillRect(player.x-3, player.y-3, player.w+6, player.h+6); }

  for(const pj of projs) drawProjectile(pj);
  for(const p of parts) { ctx.globalAlpha=Math.max(0, p.life/p.maxLife); ctx.fillStyle=p.col; ctx.fillRect(~~(p.x-p.sz/2), ~~(p.y-p.sz/2), ~~p.sz, ~~p.sz); } ctx.globalAlpha = 1;

  const gx = 2390 - cam.x;
  if(gx > 10 && gx < 800) { ctx.fillStyle = '#ffdd44'; ctx.font = "7px 'Press Start 2P'"; ctx.textAlign = 'left'; ctx.fillText('GOAL', gx-28, 35); ctx.fillStyle = '#aa88ff'; ctx.fillRect(gx+5, 308, 3, 72); ctx.fillStyle = '#ffdd44'; ctx.fillRect(gx+8, 308, 22, 14); }
  ctx.restore();
}

function renderTitle() {
  const g = ctx.createLinearGradient(0,0,0,600); g.addColorStop(0,'#020110'); g.addColorStop(0.3,'#080a30'); g.addColorStop(1,'#0a0620'); ctx.fillStyle = g; ctx.fillRect(0,0,800,600);
  for(let i=0; i<35; i++) { const sx = (Math.sin(i*137 + Date.now()/2500)*420 + 400)%800; const sy = (Math.cos(i*97 + Date.now()/1800)*280 + 280)%600; const bright = Math.sin(Date.now()/400 + i)*0.5 + 0.6; ctx.fillStyle = `rgba(${Math.min(255,150+bright*100)},${Math.min(255,120+bright*80)},255,${bright*0.7})`; ctx.fillRect(sx, sy, 3, 3); }
  ctx.fillStyle = 'rgba(100,60,150,0.1)'; ctx.beginPath(); ctx.arc(400, 280, Math.max(10, 180 + Math.sin(Date.now()/1500)*40), 0, Math.PI*2); ctx.fill();
  ctx.fillStyle = 'rgba(140,80,200,0.08)'; ctx.beginPath(); ctx.arc(400, 280, Math.max(10, 120 + Math.sin(Date.now()/2000)*30), 0, Math.PI*2); ctx.fill();
  ctx.save(); ctx.translate(0, ~~Math.sin(Date.now()/600)*15); drawLily(400, 390, 2.5, 1, 'idle', ~~(Date.now()/130)%4); ctx.restore();
}

requestAnimationFrame(t => { lastT = t; loop(t); });