// smoke.test.js — 골격 스모크: 서버가 뜨고 /health 200, 없는 경로 404. 실행: node --test
// SPDX-License-Identifier: MIT
const test = require("node:test");
const assert = require("node:assert");
const { server } = require("../server.js");

test("스모크: /health 200, 없는 경로 404", async () => {
  await new Promise(r => server.listen(0, "127.0.0.1", r));
  const base = `http://127.0.0.1:${server.address().port}`;
  try {
    const ok = await fetch(`${base}/health`);
    assert.strictEqual(ok.status, 200);
    assert.deepStrictEqual(await ok.json(), { ok: true });
    assert.strictEqual((await fetch(`${base}/nope`)).status, 404);
  } finally { await new Promise(r => server.close(r)); }
});
