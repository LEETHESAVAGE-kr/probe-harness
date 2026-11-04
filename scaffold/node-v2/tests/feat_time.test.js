// feat_time.test.js — 시스템 시간대가 UTC여도 업무 시각은 Asia/Seoul
// SPDX-License-Identifier: MIT
const test = require("node:test");
const assert = require("node:assert");
process.env.TZ = "UTC"; // 컨테이너 기본과 같게 — 그래도 결과는 KST여야 한다
const { fmt, parseLocal, minuteOfDay } = require("../src/time");

test("[D4] 시각 정상: UTC 22:30은 KST 다음 날 07:30, 거꾸로도 같다", () => {
  assert.strictEqual(fmt(new Date("2026-01-04T22:30:00Z")), "2026-01-05 07:30");
  assert.strictEqual(parseLocal("2026-01-05 07:30").toISOString(), "2026-01-04T22:30:00.000Z");
  assert.strictEqual(minuteOfDay(new Date("2026-01-04T22:30:00Z")), 450);
});
test("[D4] 시각 경계: KST 자정 직전·직후, 연말 넘김", () => {
  assert.strictEqual(fmt(new Date("2026-12-31T14:59:00Z")), "2026-12-31 23:59");
  assert.strictEqual(fmt(new Date("2026-12-31T15:00:00Z")), "2027-01-01 00:00");
  assert.strictEqual(parseLocal("2027-01-01 00:00").toISOString(), "2026-12-31T15:00:00.000Z");
  assert.strictEqual(fmt(parseLocal("2026-03-01 09:05")), "2026-03-01 09:05");
});
test("[D4] 시각 오류: 형식이 다르면 거부, 없는 시간대는 RangeError", () => {
  assert.throws(() => parseLocal("2026/01/05 7:30"), /형식/);
  assert.throws(() => parseLocal(""), /형식/);
  assert.throws(() => fmt(new Date(), "Mars/Base"), RangeError);
});
