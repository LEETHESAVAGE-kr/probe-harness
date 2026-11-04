// feat_helpers.js — 시험 공용: 임시 저장소로 서버 띄우기(PORT=0 → 임의 포트, 내가 띄운 3000과 안 부딪친다)·HTTP 요청
// SPDX-License-Identifier: MIT
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const http = require("node:http");
const { start } = require("../server");

const tmpDb = () => path.join(fs.mkdtempSync(path.join(os.tmpdir(), "app-")), "var", "app.db");

/** 입력: {dbPath} / 출력: Promise<{server, store, port, seeded, dbPath, stop()}> / 깨지는 조건: 없음(포트는 OS가 고른다) */
async function boot(o = {}) {
  const dbPath = o.dbPath || tmpDb(), app = await start({ port: 0, host: "127.0.0.1", dbPath });
  return { ...app, dbPath, stop: () => new Promise(ok => { app.server.close(() => { app.store.close(); ok(); }); }) };
}

/** 입력: 포트·메서드·경로·{body, cookie} / 출력: Promise<{status, headers, body}>(JSON이면 객체) / 깨지는 조건: 연결 실패면 reject */
function call(port, method, p, { body, cookie } = {}) {
  return new Promise((ok, fail) => {
    const data = body === undefined ? null : JSON.stringify(body);
    const headers = { ...(data ? { "Content-Type": "application/json" } : {}), ...(cookie ? { Cookie: cookie } : {}) };
    const req = http.request({ host: "127.0.0.1", port, method, path: p, headers }, res => {
      let s = "";
      res.on("data", c => { s += c; });
      res.on("end", () => { let b = s; try { b = JSON.parse(s); } catch { /* 문자열 그대로 */ } ok({ status: res.statusCode, headers: res.headers, body: b }); });
    });
    req.on("error", fail);
    if (data) req.write(data);
    req.end();
  });
}

/** 입력: 포트·아이디·비밀번호 / 출력: Promise<쿠키 문자열 "sid=…"> / 깨지는 조건: 로그인 실패면 Error */
async function signIn(port, id, password) {
  const r = await call(port, "POST", "/login", { body: { id, password } });
  if (r.status !== 200) throw new Error(`로그인 실패 ${r.status}`);
  return r.headers["set-cookie"][0].split(";")[0];
}

module.exports = { boot, call, signIn, tmpDb };
