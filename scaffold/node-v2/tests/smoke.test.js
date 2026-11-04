// smoke.test.js — 실제 진입점(node server.js)을 환경변수 없이 띄운다: PORT=0만 주고, DB_PATH는 비워 기본값 ./var/app.db로.
// SPDX-License-Identifier: MIT
const test = require("node:test");
const assert = require("node:assert");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { spawn } = require("node:child_process");
const { call } = require("./feat_helpers");

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
