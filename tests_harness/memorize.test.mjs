// memorize.test.mjs — v2.2 F5: DEFEND.md의 카드 블록은 발주자가 외우는 MEMORIZE_v2.2.md(저장소 밖)와 글자 하나까지 같다 · 읽기 순서와 6유형 표
// 실행: (하네스 폴더에서) node --test tests_harness/*.test.mjs
// MEMORIZE 위치: 환경변수 MEMORIZE_V22, 없으면 하네스 옆 "Claude outputs/MEMORIZE_v2.2.md". 둘 다 없으면 비교 시험은 SKIP.
// SPDX-License-Identifier: MIT
import test from "node:test";
import assert from "node:assert";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HARNESS = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const lf = s => s.replace(/\r\n/g, "\n");
const DEFEND = lf(fs.readFileSync(path.join(HARNESS, "playbook/DEFEND.md"), "utf8"));
const MEM = [process.env.MEMORIZE_V22, path.join(HARNESS, "..", "Claude outputs", "MEMORIZE_v2.2.md")].find(f => f && fs.existsSync(f));

/** 입력: MEMORIZE 본문 / 출력: "## 0."부터 "## 5." 앞까지(구분선 제외) — DEFEND로 옮기는 0~4장 블록 / 깨지는 조건: 제목이 없으면 Error */
export function memorizeBlock(s) {
  const t = lf(s), a = t.indexOf("## 0."), b = t.indexOf("\n## 5.");
  if (a < 0 || b < 0) throw new Error("MEMORIZE에 '## 0.' 또는 '## 5.' 제목이 없다");
  return t.slice(a, b).replace(/\n+---\s*$/, "").trimEnd();
}

test("F5-0 카드 블록: MEMORIZE 0~4장 == DEFEND 안의 같은 블록(글자 그대로)", (t) => {
  if (!MEM) return t.skip("MEMORIZE_v2.2.md 없음 — MEMORIZE_V22 환경변수로 위치를 준다");
  const block = memorizeBlock(fs.readFileSync(MEM, "utf8"));
  assert.ok(block.split("\n").length > 50, "블록이 너무 짧다 — 제목 위치 확인");
  if (!DEFEND.includes(block)) {
    const lines = block.split("\n"), miss = lines.find(l => !DEFEND.includes(l));
    assert.fail(`DEFEND.md에 MEMORIZE 0~4장 블록이 그대로 없다. 처음 어긋난 줄: ${miss ?? "(줄은 다 있는데 순서·빈 줄이 다르다)"}`);
  }
});

test("F5-2 읽기 순서: 첫 행이 0~3분 out/defend_cards.md 숫자 열 개 → 카드 6장", () => {
  const rows = DEFEND.split("\n").filter(l => /^\| \d+~\d+ \|/.test(l));
  assert.ok(rows.length >= 5, "읽기 순서 표 없음");
  assert.match(rows[0], /^\| 0~3 \|.*out\/defend_cards\.md.*숫자 열 개.*카드 6장/);
});

test("F5-3 서술형 6유형 표: '읽을 카드' 열이 있고 행마다 D1~D6 중 하나 이상", () => {
  const i = DEFEND.indexOf("## 서술형 6유형"); assert.ok(i >= 0, "6유형 절 없음");
  const L = DEFEND.slice(i).split("\n").filter(l => l.startsWith("|"));
  const head = L[0].split("|").map(c => c.trim()), col = head.indexOf("읽을 카드");
  assert.ok(col > 0, `머리: ${L[0]}`);
  const body = L.slice(2, 8);
  assert.strictEqual(body.length, 6);
  for (const r of body) assert.match(r.split("|").map(c => c.trim())[col], /D[1-6]/, r);
});
