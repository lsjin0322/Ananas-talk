require('dotenv').config();
const db = require('./Ananas/db');

setTimeout(() => {
  const rooms = db.loadAll();
  console.log('삭제 전 방 수:', rooms.size);
  for (const [code, r] of rooms) {
    db.removeRoom(code);
    console.log('삭제:', code, r.name || '(이름없음)');
  }
  console.log('\n✅ 모든 방 삭제 완료');
  process.exit(0);
}, 500);
