// run_blocks.test.mjs — v2.2 F3 → v2.8: 붙여 넣는 완성 프롬프트는 PROMPTS.md(BOXES에서 생성)로 옮겼다. 블록마다 빈칸 ≤3·바로 아래 "비울 칸:", $명령 블록은 지시 4줄 · RUN은 시간표(≤170줄, 코드 블록 0)
// 실행: (하네스 폴더에서) node --test tests_harness/*.test.mjs
// SPDX-License-Identifier: MIT
import test from "node:test";
import assert from "node:assert";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parseArgs, run as boot } from "../bootstrap.mjs";

const HARNESS = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const rd = (d, f) => fs.readFileSync(path.join(d, f), "utf8");
const RUN = rd(HARNESS, "playbook/RUN.md").replace(/\r\n/g, "\n");
const PROMPTS = rd(HARNESS, "playbook/PROMPTS.md").replace(/\r\n/g, "\n");
const MAX_HOLES = 3, MAX_LINES = 170;
// F3-2 최소 블록: 이 명령으로 시작하는 코드 블록이 PROMPTS에 하나 이상
const REQUIRED_CMDS = ["$s0", "$s1", "$ask", "$plan", "$feat", "$prove", "$verify", "$readme", "$defend", "$decide"]; // v2.6: $prove · v2.8: $decide
// F3-5 굵게 쓸 강제 이동 시각
const BOLD_MINUTES = [100, 120, 150, 163];

/** 입력: 마크다운 / 출력: [{body, line, after}] — after = 블록 뒤 첫 비지 않은 줄 */
const blocks = s => [...s.matchAll(/^```[^\n]*\n([\s\S]*?)^```[^\n]*$/gm)].map(m => ({
  body: m[1], line: s.slice(0, m.index).split("\n").length,
  after: s.slice(m.index + m[0].length).split("\n").find(l => l.trim()) || "",
}));
const holes = b => (b.match(/<[^<>\n]+>/g) || []).length;
const isCmd = b => /^\$[a-z]/.test(b.trimStart());

test("F3-1 빈칸: PROMPTS의 모든 블록은 <…> 칸 3개 이하(선택지 <가/나>는 한 칸), 블록마다 바로 아래 '비울 칸:' 한 줄", () => {
  const B = blocks(PROMPTS), bad = [];
  assert.ok(B.length > 0, "코드 블록 없음");
  for (const b of B) {
    const n = holes(b.body);
    if (n > MAX_HOLES) bad.push(`${b.line}행 블록: 칸 ${n}개`);
    if (!/^비울 칸:/.test(b.after.trim())) bad.push(`${b.line}행 블록: 아래에 '비울 칸:' 없음`);
  }
  assert.deepStrictEqual(bad, []);
});

test("F3-1·F3-3 $명령 블록: 목적·범위·내 판단·확인 4줄이 완성 문장, 내 판단은 <가/나> 선택지형", () => {
  const C = blocks(PROMPTS).filter(b => isCmd(b.body)), bad = [];
  assert.ok(C.length > 0, "$명령으로 시작하는 블록 없음");
  for (const b of C) {
    const L = b.body.split("\n");
    for (const k of ["목적:", "범위:", "내 판단:", "확인:"]) if (!L.some(l => l.startsWith(k))) bad.push(`${b.line}행 ${L[0]}: '${k}' 없음`);
    const j = L.find(l => l.startsWith("내 판단:")) || "";
    if (j && !/<[^<>\n]*\/[^<>\n]*>/.test(j)) bad.push(`${b.line}행 ${L[0]}: 내 판단이 선택지형 아님`);
  }
  assert.deepStrictEqual(bad, []);
});

test("F3-2 최소 블록: 단계 명령이 각각 그 명령으로 시작하는 블록으로 PROMPTS에 있다", () => {
  const starts = new Set(blocks(PROMPTS).filter(b => isCmd(b.body)).map(b => b.body.trimStart().split(/\s/)[0]));
  assert.deepStrictEqual(REQUIRED_CMDS.filter(c => !starts.has(c)), []);
});

test("F3-5 시간 칸: 단계 제목마다 (경과 분)과 '강제 이동' 줄, 100·120·150·163분은 굵게", () => {
  const stages = RUN.split(/^## (?=S\d )/m).slice(1), bad = [];
  assert.ok(stages.length >= 7, `단계 ${stages.length}개`);
  for (const st of stages) {
    const head = st.split("\n")[0];
    if (!/\(\d+~\d+분\)/.test(head)) bad.push(`${head}: 경과 분 없음`);
    if (!/강제 이동/.test(st)) bad.push(`${head}: '강제 이동' 줄 없음`);
  }
  for (const m of BOLD_MINUTES) if (!new RegExp(`\\*\\*[^*\\n]*${m}분[^*\\n]*\\*\\*`).test(RUN)) bad.push(`${m}분이 굵게 아님`);
  assert.deepStrictEqual(bad, []);
});

test("F3-4 길이·사본: RUN.md ≤ 170줄·코드 블록 0, bootstrap이 깐 _playbook/RUN.md·PROMPTS.md는 원본과 같다", () => {
  const n = RUN.trimEnd().split("\n").length;
  assert.ok(n <= MAX_LINES, `RUN.md ${n}줄`);
  assert.strictEqual(blocks(RUN).length, 0, "RUN에 코드 블록이 남았다 — 치는 글은 PROMPTS.md로");
  const d = fs.mkdtempSync(path.join(os.tmpdir(), "v22-")); boot(parseArgs(["--target", d]), HARNESS);
  assert.strictEqual(rd(d, "_playbook/RUN.md").replace(/\r\n/g, "\n"), RUN);
  assert.strictEqual(rd(d, "_playbook/PROMPTS.md").replace(/\r\n/g, "\n"), PROMPTS);
});
