// store.js — 영속 저장(재시작 뒤에도 남는다). node:sqlite가 있으면 SQLite, 없으면 같은 경로의 JSON 파일.
// 경로는 DB_PATH, 없으면 ./var/app.db — 환경변수가 비어도 뜬다. 폴더는 시작할 때 만든다.
// SPDX-License-Identifier: MIT
const fs = require("node:fs");
const path = require("node:path");

let sqlite = null;
try { sqlite = require("node:sqlite"); } catch { /* 이 Node에는 없다 → JSON 파일로 */ }

// [D4] 설정 기본값·영속: DB_PATH가 없으면 ./var/app.db, 재시작 뒤에도 남는다
/** 입력: {dbPath, forceJson} / 출력: {kind, file, get(key), set(key, value), close()} — 값은 JSON으로 저장 / 깨지는 조건: 폴더를 만들 수 없거나 쓸 수 없으면 시작할 때 Error */
function openStore({ dbPath = process.env.DB_PATH || "./var/app.db", forceJson = false } = {}) {
  fs.mkdirSync(path.dirname(path.resolve(dbPath)), { recursive: true });
  if (sqlite && !forceJson) {
    const db = new sqlite.DatabaseSync(dbPath);
    db.exec("CREATE TABLE IF NOT EXISTS kv (k TEXT PRIMARY KEY, v TEXT NOT NULL)");
    const get = db.prepare("SELECT v FROM kv WHERE k = ?");
    const put = db.prepare("INSERT INTO kv (k, v) VALUES (?, ?) ON CONFLICT(k) DO UPDATE SET v = excluded.v");
    return {
      kind: "sqlite", file: dbPath,
      get: k => { const r = get.get(k); return r ? JSON.parse(r.v) : undefined; },
      set: (k, v) => { put.run(k, JSON.stringify(v)); },
      close: () => db.close(),
    };
  }
  const file = dbPath.replace(/\.db$/, "") + ".json";
  const data = fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, "utf8")) : {};
  fs.writeFileSync(file + ".tmp", JSON.stringify(data)); fs.renameSync(file + ".tmp", file); // 쓰기 가능한지 지금 확인
  return {
    kind: "json", file,
    get: k => data[k],
    set: (k, v) => { data[k] = v; fs.writeFileSync(file + ".tmp", JSON.stringify(data)); fs.renameSync(file + ".tmp", file); },
    close: () => {},
  };
}

module.exports = { openStore, hasSqlite: !!sqlite };
