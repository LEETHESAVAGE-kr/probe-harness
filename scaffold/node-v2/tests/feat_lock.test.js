// feat_lock.test.js — 쓰기 직렬화: 같은 쓰기 요청 2개가 동시에 오면 하나만 성공(나머지 409)
// SPDX-License-Identifier: MIT
const test = require("node:test");
const assert = require("node:assert");
const { exclusive } = require("../src/lock");
const { createApp, memoryStore } = require("../server");
const { call, signIn } = require("./feat_helpers");
let auth = null;
try { auth = require("../src/auth"); } catch { /* 로그인 부품 없이 잠금만 깐 경우 */ }

const wait = ms => new Promise(ok => setTimeout(ok, ms));

test("[D2] 잠금 정상: 동시에 두 번 → 200 하나·409 하나, 끝난 뒤엔 다시 200", async () => {
  const rs = await Promise.all([exclusive("x", () => wait(50).then(() => 1)), exclusive("x", () => 2)]);
  assert.deepStrictEqual(rs.map(r => r.status).sort(), [200, 409]);
  assert.strictEqual((await exclusive("x", () => 3)).value, 3);
  assert.strictEqual((await exclusive("다른 이름", () => 4)).status, 200);
});
test("[D2] 잠금 오류: 작업이 실패해도 잠금이 풀린다", async () => {
  await assert.rejects(exclusive("y", async () => { throw new Error("깨짐"); }), /깨짐/);
  assert.strictEqual((await exclusive("y", () => 1)).status, 200);
});
test("[D2] HTTP 경계: POST /api/run을 동시에 2번(로그인 부품이 있으면 운영자로) → 200 하나·409 하나, 저장된 결과는 성공한 그 1개", async () => {
  const store = memoryStore(); if (auth) auth.seed(store);
  const server = createApp({ store, workDelayMs: 150 });
  await new Promise(ok => server.listen(0, "127.0.0.1", ok));
  const port = server.address().port;
  try {
    const c = auth ? await signIn(port, "operator", "operator-demo") : undefined;
    const rs = await Promise.all([call(port, "POST", "/api/run", { cookie: c }), call(port, "POST", "/api/run", { cookie: c })]);
    assert.deepStrictEqual(rs.map(r => r.status).sort(), [200, 409]);
    const last = await call(port, "GET", "/api/run/last", { cookie: c });
    assert.deepStrictEqual(last.body, rs.find(r => r.status === 200).body);
  } finally { await new Promise(ok => server.close(ok)); }
});
