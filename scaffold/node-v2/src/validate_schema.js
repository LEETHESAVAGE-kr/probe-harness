// validate_schema.js — 내보내기 JSON의 키를 스키마 문서(md 표)에서 읽어 대조한다. 키 이름을 코드에 박지 않는다.
// 사용: node src/validate_schema.js <스키마.md> <내보낸.json>  → 다르면 종료 코드 1
// SPDX-License-Identifier: MIT
const fs = require("node:fs");

// [D5] 키를 코드에 박지 않고 스키마 md 표에서 읽는다
/** 입력: 스키마 md 문자열 / 출력: 키 이름 배열(머리가 키·key·필드·field·이름·name인 열, 백틱 제거) / 깨지는 조건: 그런 열이 있는 표가 없으면 Error. 중첩 키(a.b)는 그대로 문자열로 */
function schemaKeys(md) {
  const L = String(md).split(/\r?\n/);
  for (let i = 0; i + 1 < L.length; i++) {
    if (!/^\s*\|/.test(L[i]) || !/^\s*\|\s*:?-{3,}/.test(L[i + 1])) continue;
    const cells = l => l.trim().replace(/^\||\|$/g, "").split("|").map(c => c.trim().replace(/`/g, ""));
    const col = cells(L[i]).findIndex(c => /^(키|key|필드|field|이름|name)$/i.test(c));
    if (col < 0) continue;
    const keys = [];
    for (let j = i + 2; j < L.length && /^\s*\|/.test(L[j]); j++) { const k = cells(L[j])[col]; if (k) keys.push(k); }
    if (keys.length) return keys;
  }
  throw new Error("스키마 문서에 '키' 열이 있는 표가 없다");
}

// [D5] 내보낸 값의 키를 스키마 키와 대조해 빠진 키·남는 키를 돌려준다
/** 입력: JSON 값(객체 또는 객체 배열)·키 배열 / 출력: {ok, missing, extra}(배열이면 원소 전부를 합쳐서) / 깨지는 조건: 객체가 아닌 값이면 Error */
function compare(value, keys) {
  const items = Array.isArray(value) ? value : [value];
  if (!items.every(o => o && typeof o === "object" && !Array.isArray(o))) throw new Error("객체 또는 객체 배열이어야 한다");
  const want = new Set(keys), missing = new Set(), extra = new Set();
  for (const o of items) {
    for (const k of want) if (!(k in o)) missing.add(k);
    for (const k of Object.keys(o)) if (!want.has(k)) extra.add(k);
  }
  return { ok: !missing.size && !extra.size, missing: [...missing], extra: [...extra] };
}

if (require.main === module) {
  const [schema, json] = process.argv.slice(2);
  const r = compare(JSON.parse(fs.readFileSync(json, "utf8")), schemaKeys(fs.readFileSync(schema, "utf8")));
  console.log(`${r.ok ? "PASS" : "FAIL"} 빠진 키 ${r.missing.length}: ${r.missing.join(", ") || "-"} · 남는 키 ${r.extra.length}: ${r.extra.join(", ") || "-"}`);
  process.exit(r.ok ? 0 : 1);
}
module.exports = { schemaKeys, compare };
