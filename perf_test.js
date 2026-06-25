const http = require('http');

function request(url) {
  return new Promise((resolve, reject) => {
    const start = Date.now();
    const req = http.get(url, (res) => {
      let size = 0;
      res.on('data', d => size += d.length);
      res.on('end', () => resolve({ status: res.statusCode, ms: Date.now() - start, size }));
    });
    req.on('error', reject);
    req.setTimeout(5000, () => { req.destroy(); reject(new Error('timeout')); });
  });
}

async function latencyTest() {
  console.log('\n==============================');
  console.log('  ⏱  응답 시간 테스트 (10회)');
  console.log('==============================');
  const times = [];
  for (let i = 0; i < 10; i++) {
    try {
      const r = await request('http://127.0.0.1:4000/');
      times.push(r.ms);
      console.log(`  요청 ${String(i+1).padStart(2)}: ${r.ms}ms  [${r.status}]  ${(r.size/1024).toFixed(1)}KB`);
    } catch(e) {
      console.log(`  요청 ${i+1}: ERROR - ${e.message}`);
    }
  }
  if (times.length) {
    const avg = (times.reduce((a,b)=>a+b,0)/times.length).toFixed(1);
    const min = Math.min(...times);
    const max = Math.max(...times);
    console.log(`\n  최소: ${min}ms  최대: ${max}ms  평균: ${avg}ms`);
  }
}

async function loadTest(concurrency, total) {
  console.log(`\n==============================`);
  console.log(`  🔥 부하 테스트 (동시 ${concurrency}개 / 총 ${total}요청)`);
  console.log('==============================');
  const start = Date.now();
  let done = 0, errors = 0;
  const times = [];

  async function worker() {
    while (done + errors < total) {
      try {
        const r = await request('http://127.0.0.1:4000/');
        times.push(r.ms);
      } catch(e) {
        errors++;
      }
      done++;
    }
  }

  const workers = Array.from({ length: concurrency }, () => worker());
  await Promise.all(workers);

  const elapsed = Date.now() - start;
  const rps = (total / (elapsed / 1000)).toFixed(1);
  const avg = times.length ? (times.reduce((a,b)=>a+b,0)/times.length).toFixed(1) : 0;
  const p95 = times.length ? times.sort((a,b)=>a-b)[Math.floor(times.length*0.95)] : 0;
  const p99 = times.length ? times[Math.floor(times.length*0.99)] : 0;

  console.log(`  총 소요:   ${elapsed}ms`);
  console.log(`  RPS:       ${rps} req/s`);
  console.log(`  성공/실패: ${times.length}/${errors}`);
  console.log(`  평균:      ${avg}ms`);
  console.log(`  P95:       ${p95}ms`);
  console.log(`  P99:       ${p99}ms`);
  console.log(`  최소/최대: ${Math.min(...times)}ms / ${Math.max(...times)}ms`);
}

(async () => {
  // 1. 응답 시간 테스트
  await latencyTest();

  // 2. 낮은 부하 (10 동시)
  await loadTest(10, 100);

  // 3. 중간 부하 (50 동시)
  await loadTest(50, 300);

  // 4. 높은 부하 (100 동시)
  await loadTest(100, 500);

  console.log('\n✅ 테스트 완료\n');
})();
