// feat_auth.test.js — 로그인·역할·쿠키 속성·재시작 뒤 유지
// SPDX-License-Identifier: MIT
const test = require("node:test");
const assert = require("node:assert");
const { boot, call, signIn } = require("./feat_helpers");
const { PARTS } = require("../server");

test("[D6] 로그인 정상: 데모 계정 둘 다 들어가고, 쿠키는 HttpOnly·Path뿐(Secure·SameSite·Domain 없음)", async () => {
  const app = await boot();
  try {
    assert.strictEqual(app.seeded, 2);
    const r = await call(app.port, "POST", "/login", { body: { id: "operator", password: "operator-demo" } });
    assert.strictEqual(r.status, 200);
    const c = r.headers["set-cookie"][0];
    assert.match(c, /HttpOnly/); assert.match(c, /Path=\//); assert.doesNotMatch(c, /Secure|SameSite|Domain/i);
    const me = await call(app.port, "GET", "/api/me", { cookie: c.split(";")[0] });
    assert.deepStrictEqual(me.body, { id: "operator", role: "operator" });
    const m = await signIn(app.port, "member", "member-demo");
    assert.strictEqual((await call(app.port, "GET", "/api/me", { cookie: m })).body.role, "member");
  } finally { await app.stop(); }
});
test("[D6] 역할 경계: 일반 사용자는 운영자 쓰기 경로에서 403, 로그인 없이는 401, 로그아웃 뒤 401", async () => {
  const app = await boot();
  try {
    const m = await signIn(app.port, "member", "member-demo");
    // 운영자 쓰기 경로는 lock 부품이 깔렸을 때만 있다(없으면 404)
    assert.strictEqual((await call(app.port, "POST", "/api/run", { cookie: m })).status, PARTS.lock ? 403 : 404);
    assert.strictEqual((await call(app.port, "POST", "/api/run")).status, PARTS.lock ? 401 : 404);
    assert.strictEqual((await call(app.port, "GET", "/api/me", { cookie: "sid=zz" })).status, 401);
    await call(app.port, "POST", "/logout", { cookie: m });
    assert.strictEqual((await call(app.port, "GET", "/api/me", { cookie: m })).status, 401);
  } finally { await app.stop(); }
});
test("[D6] 로그인 오류: 틀린 비밀번호·없는 아이디는 401, 재시작 뒤 세션은 store 부품이 있으면 남고 없으면(메모리) 사라진다", async () => {
  const a = await boot();
  assert.strictEqual((await call(a.port, "POST", "/login", { body: { id: "operator", password: "x" } })).status, 401);
  assert.strictEqual((await call(a.port, "POST", "/login", { body: { id: "nobody", password: "x" } })).status, 401);
  const c = await signIn(a.port, "operator", "operator-demo");
  await a.stop();
  const b = await boot({ dbPath: a.dbPath });
  try {
    const hasStore = b.store.kind !== "memory";
    assert.strictEqual(b.seeded, hasStore ? 0 : 2, "store가 있으면 계정을 다시 만들지 않는다");
    assert.strictEqual((await call(b.port, "GET", "/api/me", { cookie: c })).status, hasStore ? 200 : 401);
  } finally { await b.stop(); }
});
