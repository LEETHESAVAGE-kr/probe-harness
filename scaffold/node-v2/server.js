// server.js — 의존성 0 서버 바닥: 0.0.0.0·PORT(기본 3000)·/health·정적 public/. 부품(src/auth·store·lock)은 깔려 있을 때만 쓴다.
// 시작: PORT=3000 node server.js · 테스트: node --test · 부품 더하기: node /tmp/harness/bootstrap.mjs --scaffold node-v2 --with auth,store,lock
// 데이터 처리 규칙(PLAN '데이터 처리 규칙'에서 그대로 복사해 둔다 — 세션이 바뀌어도 코드가 규칙을 기억하게):
//   - (예) 빈 값 행은 버리고 버린 건수를 응답에 같이 낸다 — 근거: 담당자 HH:MM
// SPDX-License-Identifier: MIT
const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");
const time = require("./src/time");

/** 입력: 모듈 경로 / 출력: 모듈 또는 null(그 부품을 안 깔았으면) / 깨지는 조건: 부품 안의 오류는 그대로 throw */
function optional(rel) {
  try { return require(rel); } catch (e) { if (e.code === "MODULE_NOT_FOUND" && String(e.message).includes(rel.replace(/^\.\//, ""))) return null; throw e; }
}
const storeMod = optional("./src/store"), auth = optional("./src/auth"), lock = optional("./src/lock");
const PARTS = { auth: !!auth, store: !!storeMod, lock: !!lock };

/** 입력: 없음 / 출력: store와 같은 모양의 메모리 저장소(재시작하면 사라짐) / 깨지는 조건: 없음 */
function memoryStore() {
  const m = new Map();
  return { kind: "memory", file: "(메모리 — 재시작하면 사라진다)", get: k => m.get(k), set: (k, v) => { m.set(k, v); }, close: () => {} };
}

const PUBLIC = path.join(__dirname, "public");
const TYPES = { ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".css": "text/css; charset=utf-8", ".json": "application/json; charset=utf-8", ".svg": "image/svg+xml" };

function send(res, code, body, headers = {}) {
  const isText = typeof body === "string";
  res.writeHead(code, { "Content-Type": isText ? "text/plain; charset=utf-8" : "application/json; charset=utf-8", ...headers });
  res.end(isText ? body : JSON.stringify(body));
}

const MAX_BODY = 1e6; // 바이트 — 글자 수로 세면 한글은 3배까지 통과한다

/** 입력: 요청 / 출력: 본문 객체(JSON 또는 form) / 깨지는 조건: 1MB(바이트) 넘으면 Error(413), JSON이 깨지면 Error(400). 넘겨도 끝까지 받아 버린다 — 도중에 끊으면 413 응답이 못 간다 */
function readBody(req) {
  return new Promise((ok, fail) => {
    let chunks = [], size = 0;
    req.on("data", c => {
      size += c.length;
      if (size <= MAX_BODY) return void chunks.push(c);
      if (chunks) { chunks = null; fail(Object.assign(new Error("본문이 너무 크다"), { status: 413 })); }
    });
    req.on("end", () => {
      if (!chunks) return;
      const s = Buffer.concat(chunks).toString("utf8");
      if (!s) return ok({});
      if (/json/.test(req.headers["content-type"] || "")) { try { ok(JSON.parse(s)); } catch { fail(Object.assign(new Error("JSON 형식 오류"), { status: 400 })); } }
      else ok(Object.fromEntries(new URLSearchParams(s)));
    });
  });
}

// [D6] 구조 한 줄기: 진입점 → 인증(auth.who, 401·403) → 본문 읽기·검증(readBody) → 계산(route.fn) → 저장(store) → 응답(send)
/** 입력: {store, workDelayMs} / 출력: http.Server(아직 listen 안 함) — 라우트는 깔린 부품만큼 / 깨지는 조건: store가 없으면 Error */
function createApp({ store, workDelayMs = Number(process.env.WORK_DELAY_MS || 0) }) {
  if (!store) throw new Error("store가 필요하다(memoryStore()라도)");
  // 라우트 표: "메서드 경로": {role?, fn(req, ctx) → {status, body, headers}} — 과제 기능은 여기에 한 줄씩 더한다
  const routes = { "GET /health": { fn: () => ({ status: 200, body: { ok: true, store: store.kind, parts: PARTS, time: time.fmt(), tz: time.zone() } }) } };
  if (auth) Object.assign(routes, {
    "POST /login": { fn: async req => {
      const b = await readBody(req), sid = auth.login(store, b.id, b.password);
      if (!sid) return { status: 401, body: { error: "아이디 또는 비밀번호가 틀렸다" } };
      return { status: 200, body: { ok: true, id: b.id }, headers: { "Set-Cookie": auth.setCookie(sid) } };
    } },
    "POST /logout": { fn: (req, ctx) => { if (ctx.user) auth.logout(store, ctx.user.sid); return { status: 200, body: { ok: true }, headers: { "Set-Cookie": auth.clearCookie() } }; } },
    "GET /api/me": { role: "any", fn: (req, ctx) => ({ status: 200, body: { id: ctx.user.id, role: ctx.user.role } }) },
  });
  // 쓰기 작업 자리(lock 부품): 과제의 재계산·데이터 적용을 work 안에 넣는다. 동시에 두 번 오면 두 번째는 409.
  if (lock) Object.assign(routes, {
    "POST /api/run": { role: auth ? "operator" : undefined, fn: async () => {
      const r = await lock.exclusive("run", async () => {
        if (workDelayMs) await new Promise(ok => setTimeout(ok, workDelayMs));
        const result = { ranAt: time.fmt() };  // ← 과제 계산 결과로 바꾼다
        store.set("lastRun", result);          // 다 끝난 결과만 저장 → 읽기는 반쯤 된 결과를 못 본다
        return result;
      });
      return r.status === 200 ? { status: 200, body: r.value } : { status: 409, body: { error: r.error } };
    } },
    "GET /api/run/last": { role: auth ? "any" : undefined, fn: () => ({ status: 200, body: store.get("lastRun") || null }) },
  });

  return http.createServer(async (req, res) => {
    const url = new URL(req.url, "http://x"), key = `${req.method} ${url.pathname}`, route = routes[key];
    try {
      if (!route) {
        if (req.method !== "GET") return send(res, 404, { error: `없는 경로: ${key}` });
        const file = path.normalize(path.join(PUBLIC, url.pathname === "/" ? "index.html" : url.pathname));
        if (!file.startsWith(PUBLIC + path.sep) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) return send(res, 404, { error: `없는 경로: ${key}` });
        res.writeHead(200, { "Content-Type": TYPES[path.extname(file)] || "application/octet-stream" });
        return fs.createReadStream(file).pipe(res);
      }
      const ctx = { user: auth ? auth.who(store, req.headers.cookie) : null };
      if (route.role && !ctx.user) return send(res, 401, { error: "로그인이 필요하다" });
      if (route.role && route.role !== "any" && ctx.user.role !== route.role) return send(res, 403, { error: `${route.role} 역할만 할 수 있다` });
      const out = await route.fn(req, ctx);
      send(res, out.status, out.body, out.headers);
    } catch (e) { send(res, e.status || 500, { error: String(e.message || e) }); }
  });
}

// [D4] 설정 기본값: PORT 3000·0.0.0.0·DB 경로 기본값 — 환경변수 없이 뜬다
/** 입력: {port, host, dbPath} / 출력: Promise<{server, store, port, seeded}> — store 부품이 없으면 메모리, auth 부품이 있으면 빈 저장소에 데모 계정 / 깨지는 조건: 포트가 차 있으면 EADDRINUSE로 reject */
function start({ port = Number(process.env.PORT ?? 3000), host = "0.0.0.0", dbPath } = {}) {
  const store = storeMod ? storeMod.openStore(dbPath ? { dbPath } : {}) : memoryStore();
  const seeded = auth ? auth.seed(store) : 0, server = createApp({ store });
  return new Promise((ok, fail) => {
    server.once("error", fail);
    server.listen(port, host, () => ok({ server, store, port: server.address().port, seeded }));
  });
}

if (require.main === module) {
  start().then(({ server, port, store, seeded }) => console.log(`listening on ${server.address().address}:${port} pid ${process.pid} · 저장 ${store.kind} ${store.file} · 부품 ${Object.keys(PARTS).filter(k => PARTS[k]).join("+") || "바닥만"} · 데모 계정 새로 ${seeded}개`))
    .catch(e => { console.error(e.code === "EADDRINUSE" ? `포트 ${process.env.PORT ?? 3000} 사용 중 — PORT를 바꿔 다시 띄운다` : e.message); process.exit(1); });
}
module.exports = { createApp, start, send, readBody, memoryStore, PARTS };
