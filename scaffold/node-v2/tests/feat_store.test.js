// feat_store.test.js — 저장소: 다시 열어도 남는다(SQLite·JSON 둘 다), 폴더가 없으면 만든다
// SPDX-License-Identifier: MIT
const test = require("node:test");
const assert = require("node:assert");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { openStore, hasSqlite } = require("../src/store");
const { tmpDb } = require("./feat_helpers");

test("[D4] 저장 정상: 쓰고 닫고 다시 열면 같은 값(이 Node에 sqlite가 있으면 sqlite)", () => {
  const dbPath = tmpDb(), a = openStore({ dbPath });
  assert.strictEqual(a.kind, hasSqlite ? "sqlite" : "json");
  a.set("k", { n: 1, s: "한글" }); a.close();
  const b = openStore({ dbPath });
  assert.deepStrictEqual(b.get("k"), { n: 1, s: "한글" }); b.close();
});
test("[D4] 저장 경계: sqlite가 없을 때의 JSON 폴백도 다시 열면 남고, 없는 키는 undefined", () => {
  const dbPath = tmpDb(), a = openStore({ dbPath, forceJson: true });
  assert.strictEqual(a.kind, "json"); assert.ok(a.file.endsWith("app.json"));
  a.set("k", [1, 2]); assert.strictEqual(a.get("없음"), undefined);
  assert.deepStrictEqual(openStore({ dbPath, forceJson: true }).get("k"), [1, 2]);
});
test("[D4] 저장 기본값: DB_PATH가 비어도 ./var/app.db로 열린다", () => {
  const d = fs.mkdtempSync(path.join(os.tmpdir(), "st-")), was = process.cwd(), env = process.env.DB_PATH;
  delete process.env.DB_PATH; process.chdir(d);
  try { const s = openStore({ forceJson: true }); s.set("k", 1); assert.ok(fs.existsSync(path.join(d, "var", "app.json"))); }
  finally { process.chdir(was); if (env !== undefined) process.env.DB_PATH = env; }
});
test("[D4] 저장 오류: 폴더 자리에 파일이 있으면 시작할 때 바로 실패한다", () => {
  const d = fs.mkdtempSync(path.join(os.tmpdir(), "st-"));
  fs.writeFileSync(path.join(d, "var"), "파일");
  assert.throws(() => openStore({ dbPath: path.join(d, "var", "app.db"), forceJson: true }));
});
