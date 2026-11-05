// script.test.mjs — v2.10: PROMPTS.md는 손으로 쓴 줄글 대본. 붙이는 글은 ▶ 다음 ``` 상자뿐, 상자 안 〔 〕는 과제 말 칸, $명령마다 상자 1개 이상, 창은 셋, 옛 '블록 ‘이름’' 참조 0
// 실행: (하네스 폴더에서) node --test tests_harness/*.test.mjs
// SPDX-License-Identifier: MIT
import test from "node:test";
import assert from "node:assert";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { COMMANDS } from "../bootstrap.mjs";

const HARNESS = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const P = fs.readFileSync(path.join(HARNESS, "playbook/PROMPTS.md"), "utf8").replace(/\r\n/g, "\n");
const boxes = [...P.matchAll(/▶\n```\n([\s\S]*?)^```$/gm)].map(m => m[1]);

test("v2.10 상자: ``` 상자는 전부 ▶ 바로 아래(붙이는 글과 읽는 글이 갈린다), 옛 블록 참조 0", () => {
  const all = [...P.matchAll(/^```\n[\s\S]*?^```$/gm)].length;
  assert.strictEqual(all, boxes.length, "▶ 없이 열린 상자가 있다");
  assert.doesNotMatch(P, /블록 ‘/, "옛 '블록 ‘이름’' 참조");
});

test("v2.10 $명령: 명령마다 첫 줄 $이름 상자가 1개 이상, 그 상자에 과제 말 칸 〔 〕가 2개 이상(일반어로 메우지 못하게)", () => {
  const skip = new Set(["role-a", "role-b", "role-c", "role-d", "role-a2", "traps"]); // 병렬 역할은 PARALLEL4, traps는 s3 상자의 변형
  const bad = [];
  for (const c of COMMANDS.filter(c => !skip.has(c))) {
    const b = boxes.filter(x => x.startsWith(`$${c}\n`));
    if (!b.length) { bad.push(`${c}: 상자 없음`); continue; }
    if ((b[0].match(/〔/g) || []).length < 2) bad.push(`${c}: 〔 〕 칸 2개 미만`);
  }
  assert.deepStrictEqual(bad, []);
});

test("v2.10 창 셋·순서: S0→S1→S2→S3→S4→S5→S6→제출 머리, [창 1]·[창 2]·[창 3]만, 붙여넣기 증상·skill 폴백·out/reports 안내", () => {
  const heads = [...P.matchAll(/^## (S\d|제출|아무 때나)/gm)].map(m => m[1]);
  assert.deepStrictEqual(heads, ["S0", "S1", "S2", "S3", "S4", "S5", "S6", "제출", "아무 때나"]);
  assert.deepStrictEqual([...new Set([...P.matchAll(/\[창 (\d)\]/g)].map(m => m[1]))].sort(), ["1", "2", "3"]);
  for (const k of ["[200~", "SKILL.md 절차대로:", "out/reports/", "/fast", "〔A / B〕"]) assert.ok(P.includes(k), k);
});
