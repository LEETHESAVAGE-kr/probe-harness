// smoke.test.js — 실제 진입점(node server.js)을 환경변수 없이 띄운다: PORT=0만 주고, DB_PATH는 비워 기본값 ./var/app.db로.
// SPDX-License-Identifier: MIT
const test = require("node:test");
const assert = require("node:assert");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { spawn } = require("node:child_process");
const http = require("node:http");
const { call } = require("./feat_helpers");
const { readBody, send } = require("../server");

const bareEnv = port => ({ PATH: process.env.PATH, SYSTEMROOT: process.env.SYSTEMROOT, PORT: String(port) });

function runServer(cwd, env) {
  return new Promise((ok, fail) => {
    const p = spawn(process.execPath, [path.join(__dirname, "..", "server.js")], { cwd, env, stdio: ["ignore", "pipe", "pipe"] });
    let out = "", err = "";
    p.stdout.on("data", c => { out += c; const m = /listening on 0\.0\.0\.0:(\d+)/.exec(out); if (m) ok({ p, port: +m[1], out }); });
    p.stderr.on("data", c => { err += c; });
    p.on("exit", code => fail(new Error(`서버가 종료됨 ${code}: ${err}`)));
    setTimeout(() => { p.removeAllListeners("exit"); p.kill(); fail(new Error(`10초 안에 "listening on 0.0.0.0:" 줄이 안 나왔다(127.0.0.1에 묶였나?): ${out}`)); }, 10000).unref();
  });
}
const kill = s => { s.p.removeAllListeners("exit"); s.p.kill(); };

test("스모크 정상: 환경변수 없이 뜨고 /health 200(깔린 부품 표시), 0.0.0.0에 묶이고, 첫 화면이 온다", async () => {
  const cwd = fs.mkdtempSync(path.join(os.tmpdir(), "smoke-")), s = await runServer(cwd, bareEnv(0));
  try {
    const h = await call(s.port, "GET", "/health");
    assert.strictEqual(h.status, 200); assert.strictEqual(h.body.ok, true); assert.strictEqual(h.body.tz, "Asia/Seoul");
    assert.deepStrictEqual(Object.keys(h.body.parts), ["auth", "store", "lock"]);
    assert.match(s.out, /부품 /);
    const page = await call(s.port, "GET", "/");
    assert.strictEqual(page.status, 200); assert.match(page.body, /<form id="login"/);
    assert.match(page.body, /\[hidden\] \{ display: none !important; \}/, "display:grid가 hidden을 덮으면 로그인 뒤에도 폼이 보인다");
  } finally { kill(s); }
});
test("스모크 경계: 정적 폴더 밖 경로(../)는 404", async () => {
  const s = await runServer(fs.mkdtempSync(path.join(os.tmpdir(), "smoke-")), bareEnv(0));
  try {
    assert.strictEqual((await call(s.port, "GET", "/../server.js")).status, 404);
    assert.strictEqual((await call(s.port, "GET", "/%2e%2e/server.js")).status, 404);
    assert.strictEqual((await call(s.port, "POST", "/no-such-path")).status, 404);
  } finally { kill(s); }
});
test("스모크 오류: 포트가 차 있으면 알아볼 수 있는 문구로 종료", async () => {
  const cwd = fs.mkdtempSync(path.join(os.tmpdir(), "smoke-")), first = await runServer(cwd, bareEnv(0));
  try {
    const err = await runServer(cwd, bareEnv(first.port)).then(s => { kill(s); return null; }, e => e);
    assert.ok(err, "두 번째 서버가 떴다"); assert.match(err.message, /사용 중/);
  } finally { kill(first); }
});

/** 입력: 없음 / 출력: Promise<{port, close()}> — readBody만 거는 서버(바닥 부품만 깔아도 돈다) / 깨지는 조건: 없음 */
async function echoBody() {
  const server = http.createServer((req, res) => readBody(req).then(b => send(res, 200, { len: (b.a || "").length }), e => send(res, e.status || 500, { error: e.message })));
  await new Promise(ok => server.listen(0, "127.0.0.1", ok));
  return { port: server.address().port, close: () => new Promise(ok => server.close(ok)) };
}
const post = (port, raw) => new Promise((ok, fail) => {
  const req = http.request({ host: "127.0.0.1", port, method: "POST", path: "/", agent: false, headers: { "Content-Type": "application/json" } }, res => {
    let s = ""; res.on("data", c => { s += c; }); res.on("end", () => ok({ status: res.statusCode, body: s }));
  });
  req.on("error", fail); req.end(raw);
});
/** 입력: 채울 글자·바이트 수 / 출력: 정확히 그 바이트 수인 JSON 문자열 {"a":"…"} / 깨지는 조건: 글자 하나의 바이트 수로 안 나누어떨어지면 Error */
function jsonOfBytes(ch, bytes) {
  const room = bytes - Buffer.byteLength('{"a":""}'), one = Buffer.byteLength(ch);
  if (room % one) throw new Error("바이트 수가 안 맞는다");
  return JSON.stringify({ a: ch.repeat(room / one) });
}

test("본문 정상: 1MB 이하는 정상 처리, 딱 1,000,000바이트와 한글 본문도 깨지지 않고 읽힌다", async () => {
  const s = await echoBody();
  try {
    assert.strictEqual(Buffer.byteLength(jsonOfBytes("x", 1e6)), 1e6);
    const r = await post(s.port, jsonOfBytes("x", 1e6));
    assert.strictEqual(r.status, 200); assert.strictEqual(JSON.parse(r.body).len, 1e6 - 8);
    const k = await post(s.port, jsonOfBytes("가", 8 + 3 * 300000)); // 청크 경계에 걸린 한글도 깨지면 안 된다
    assert.strictEqual(k.status, 200); assert.strictEqual(JSON.parse(k.body).len, 300000);
  } finally { await s.close(); }
});
test("본문 경계: 1MB를 1바이트만 넘어도 영어 본문은 413, 연결을 끊지 않고 응답이 온다", async () => {
  const s = await echoBody();
  try {
    const r = await post(s.port, jsonOfBytes("x", 1e6 + 1));
    assert.strictEqual(r.status, 413); assert.match(JSON.parse(r.body).error, /너무 크다/);
    assert.strictEqual((await post(s.port, "{}")).status, 200, "413 뒤에도 서버가 산다");
  } finally { await s.close(); }
});
test("본문 오류: 글자 수는 1MB 아래여도 바이트가 넘는 한글 본문은 413, 깨진 JSON은 400", async () => {
  const s = await echoBody();
  try {
    const raw = jsonOfBytes("가", 8 + 3 * 400000);
    assert.ok(raw.length < 1e6); assert.ok(Buffer.byteLength(raw) > 1e6);
    assert.strictEqual((await post(s.port, raw)).status, 413);
    assert.strictEqual((await post(s.port, "{깨짐")).status, 400);
  } finally { await s.close(); }
});
