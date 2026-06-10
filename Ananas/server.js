const express  = require('express');
const http     = require('http');
const socketIo = require('socket.io');

const app    = express();
const server = http.createServer(app);
const io     = socketIo(server);

app.use(express.static(__dirname));

const roomMessages = {};  // code -> []
const roomInfo     = {};  // code -> { name, host, desc, category, createdAt }
const roomSockets  = {};  // code -> Set of socket ids

function genCode() {
  return Math.random().toString(36).substring(2,8).toUpperCase();
}

function getRoomUsers(code) {
  if (!roomSockets[code]) return [];
  return [...roomSockets[code]].map(id => {
    const s = io.sockets.sockets.get(id);
    return s ? { nickname: s.nickname, avatar: s.avatar } : null;
  }).filter(Boolean);
}

function broadcastOnlineUsers(code) {
  io.to(code).emit('onlineUsers', getRoomUsers(code));
}

io.on('connection', socket => {

  socket.on('createRoom', ({ nickname, roomName, roomDesc, category, avatar }) => {
    if (!nickname?.trim() || !roomName?.trim()) return;
    const code = genCode();
    roomInfo[code]    = { name:roomName.trim(), host:socket.id, desc:roomDesc||'', category:category||'chat', createdAt:Date.now() };
    roomMessages[code]= [];
    roomSockets[code] = new Set();

    socket.nickname = nickname.trim();
    socket.room     = code;
    socket.avatar   = avatar || 'A';

    socket.join(code);
    roomSockets[code].add(socket.id);

    socket.emit('roomCreated', { code, roomName:roomInfo[code].name });

    const sys = { user:'system', text:`${socket.nickname}님이 아지트를 만들었습니다.`, time:Date.now() };
    roomMessages[code].push(sys);
    io.to(code).emit('message', sys);
    broadcastOnlineUsers(code);
  });

  socket.on('joinRoom', ({ nickname, code, avatar }) => {
    if (!nickname?.trim() || !code?.trim()) return;
    const rc = code.trim().toUpperCase();
    if (!roomInfo[rc]) { socket.emit('joinError','존재하지 않는 방 코드입니다.'); return; }

    socket.nickname = nickname.trim();
    socket.room     = rc;
    socket.avatar   = avatar || 'A';

    socket.join(rc);
    if (!roomSockets[rc]) roomSockets[rc] = new Set();
    roomSockets[rc].add(socket.id);

    socket.emit('roomJoined', { code:rc, roomName:roomInfo[rc].name });

    if (roomMessages[rc]) socket.emit('messageHistory', roomMessages[rc]);

    const sys = { user:'system', text:`${socket.nickname}님이 아지트에 합류했습니다.`, time:Date.now() };
    roomMessages[rc].push(sys);
    io.to(rc).emit('message', sys);
    broadcastOnlineUsers(rc);
  });

  socket.on('chatMessage', msg => {
    if (!socket.room || !msg?.trim()) return;
    // image detection (dataURL)
    const isImage = typeof msg === 'string' && msg.startsWith('data:image');
    const data = { user:socket.nickname, avatar:socket.avatar, text:msg.trim(), time:Date.now(), isImage };
    if (roomMessages[socket.room]) {
      roomMessages[socket.room].push(data);
      if (roomMessages[socket.room].length > 500) roomMessages[socket.room].shift();
    }
    socket.to(socket.room).emit('message', data);
  });

  socket.on('setNotice', text => {
    if (!socket.room || !text?.trim()) return;
    // Only host can set notice
    if (roomInfo[socket.room]?.host !== socket.id) return;
    io.to(socket.room).emit('notice', text.trim());
  });

  socket.on('leaveRoom', () => {
    doLeave(socket);
  });

  socket.on('disconnect', () => {
    doLeave(socket);
  });

  function doLeave(s) {
    if (!s.room) return;
    const sys = { user:'system', text:`${s.nickname}님이 아지트를 떠났습니다.`, time:Date.now() };
    if (roomMessages[s.room]) roomMessages[s.room].push(sys);
    s.to(s.room).emit('message', sys);
    if (roomSockets[s.room]) roomSockets[s.room].delete(s.id);
    broadcastOnlineUsers(s.room);
    s.leave(s.room);
    s.room = null; s.nickname = null;
  }
});

const PORT = process.env.PORT || 4000;
server.listen(PORT, () => {
  console.log(`=================================================`);
  console.log(`🍍 아나나스 메신저가 실행 중입니다.`);
  console.log(`🔗 http://localhost:${PORT}`);
  console.log(`=================================================`);
});