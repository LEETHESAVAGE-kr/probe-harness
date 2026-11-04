// agents_size.test.mjs — v2.2 F1: 작업 폴더 AGENTS.md는 규칙 블록·도구 표·명령 표 세 부분만, ≤ 6KB, 규칙 12줄의 글자 수 상한, 옛 규칙 문구 0
// 실행: (하네스 폴더에서) node --test tests_harness/*.test.mjs
// SPDX-License-Identifier: MIT
import test from "node:test";
import assert from "node:assert";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parseArgs, run as boot, plan } from "../bootstrap.mjs";

const HARNESS = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const tmp = () => fs.mkdtempSync(path.join(os.tmpdir(), "v22-"));
const rd = (d, f) => fs.readFileSync(path.join(d, f), "utf8");
const MAX_BYTES = 6 * 1024, MAX_LINE = 220, MAX_TOTAL = 2200;

/** 입력: AGENTS.md 본문 / 출력: "## 규칙" 아래 첫 코드 펜스의 비지 않은 줄 배열 / 깨지는 조건: 펜스가 없으면 [] */
const ruleLines = s => {
  const i = s.indexOf("## 규칙"); if (i < 0) return [];
  const m = s.slice(i).match(/```[^\n]*\n([\s\S]*?)```/);
  return m ? m[1].split(/\r?\n/).filter(l => l.trim()) : [];
};
const lineOf = (L, key) => L.find(l => l.startsWith(key)) || "";

test("F1 크기: bootstrap이 작업 폴더에 까는 AGENTS.md가 6KB 이하", () => {
  const d = tmp(); boot(parseArgs(["--target", d]), HARNESS);
  const bytes = Buffer.byteLength(rd(d, "AGENTS.md"), "utf8");
  assert.ok(bytes <= MAX_BYTES, `AGENTS.md ${bytes}B > ${MAX_BYTES}B`);
});

test("F1-3 규칙 블록: 12줄, 줄마다 220자 이하, 전체 2,200자 이하", () => {
  const L = ruleLines(rd(HARNESS, "AGENTS.md"));
  assert.strictEqual(L.length, 12, `규칙 ${L.length}줄`);
  const over = L.map((l, i) => [i + 1, [...l].length]).filter(([, n]) => n > MAX_LINE).map(([i, n]) => `${i}줄 ${n}자`);
  assert.deepStrictEqual(over, []);
  const total = L.reduce((a, l) => a + [...l].length, 0);
  assert.ok(total <= MAX_TOTAL, `전체 ${total}자`);
});

test("F1-1 세 부분만: 풀어 쓴 설명은 refs/AGENTS_NOTES.md로, bootstrap은 NOTES를 복사하지 않는다", () => {
  const s = rd(HARNESS, "AGENTS.md");
  const heads = s.split(/\r?\n/).filter(l => /^## /.test(l));
  assert.strictEqual(heads.length, 3, `절 ${heads.length}개: ${heads.join(" / ")}`);
  assert.doesNotMatch(s, /풀어 쓴 설명/);
  assert.ok(fs.existsSync(path.join(HARNESS, "refs/AGENTS_NOTES.md")), "refs/AGENTS_NOTES.md 없음");
  assert.ok(!plan("dev", "").some(([src]) => src && src.includes("AGENTS_NOTES")), "bootstrap이 NOTES를 깐다");
});

test("F1-2 규칙 줄: 옛 문구(3개 이하·12종 순서·'규칙 블록이 이긴다') 0, 새 줄은 $s1·$ask·★·D1~D6", () => {
  const s = rd(HARNESS, "AGENTS.md"), L = ruleLines(s), miss = [];
  // 수락 기준 3: grep -c "3개 이하" AGENTS.md = 0
  if (s.includes("3개 이하")) miss.push("AGENTS.md에 '3개 이하'");
  if (/규칙 블록이 이긴다/.test(s)) miss.push("'규칙 블록이 이긴다' 문장");
  const plan6 = lineOf(L, "PLAN:");
  for (const k of ["모든 행", "★"]) if (!plan6.includes(k)) miss.push(`PLAN 줄에 '${k}' 없음`);
  const s1 = L.find(l => l.includes("$s1")) || "";
  if (!s1) miss.push("규칙 블록에 $s1 줄 없음");
  for (const k of ["REQUIREMENTS", "껍데기", "data/README", "inventory"]) if (s1 && !s1.includes(k)) miss.push(`$s1 줄에 '${k}' 없음`);
  const s2 = lineOf(L, "S2 질문");
  for (const k of ["$ask", "상한 없음", "지목"]) if (!s2.includes(k)) miss.push(`S2 질문 줄에 '${k}' 없음`);
  if (/지도\(무엇을/.test(s2)) miss.push("S2 질문 줄에 12종 순서가 남음");
  if (!/지도/.test(rd(HARNESS, "refs/QUESTION_BANK.md"))) miss.push("12종 순서가 QUESTION_BANK에 없음");
  if (!lineOf(L, "증거:").includes("D1~D6")) miss.push("증거 줄에 'D1~D6' 슬롯 구절 없음");
  assert.deepStrictEqual(miss, []);
});
