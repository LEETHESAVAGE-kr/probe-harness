// feat_schema.test.js — 내보내기 키를 스키마 문서에서 읽어 대조(하드코딩 금지)
// SPDX-License-Identifier: MIT
const test = require("node:test");
const assert = require("node:assert");
const { schemaKeys, compare } = require("../src/validate_schema");

const MD = "# 형식\n\n| 키 | 타입 | 뜻 |\n|---|---|---|\n| `item_id` | string | ID |\n| count | number | 개수 |\n";

test("[D5] 스키마 정상: 표의 키 열을 읽고, 키가 같으면 ok", () => {
  assert.deepStrictEqual(schemaKeys(MD), ["item_id", "count"]);
  assert.deepStrictEqual(compare([{ item_id: "a", count: 1 }, { item_id: "b", count: 2 }], schemaKeys(MD)), { ok: true, missing: [], extra: [] });
});
test("[D5] 스키마 경계: 한 글자 다른 키는 빠진 키·남는 키 둘 다로 잡힌다", () => {
  assert.deepStrictEqual(compare({ itemId: "a", count: 1 }, schemaKeys(MD)), { ok: false, missing: ["item_id"], extra: ["itemId"] });
});
test("[D5] 스키마 오류: 키 열이 있는 표가 없거나 값이 객체가 아니면 거부", () => {
  assert.throws(() => schemaKeys("# 표 없음\n- item_id\n"), /키/);
  assert.throws(() => compare([1, 2], ["a"]), /객체/);
});
