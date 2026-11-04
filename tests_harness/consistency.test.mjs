// consistency.test.mjs — v2.2 F2: 한 명령에 한 뜻. SKILL.md · BOXES 상자 · AGENTS.md 명령 표 세 곳이 같은 핵심 어구를 갖고, 금지 어구는 어디에도 없다
// 실행: (하네스 폴더에서) node --test tests_harness/*.test.mjs
// SPDX-License-Identifier: MIT
import test from "node:test";
import assert from "node:assert";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HARNESS = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const rd = f => fs.readFileSync(path.join(HARNESS, f), "utf8");

// 명령마다 핵심 어구와 금지 어구(PRD F2-2). must의 배열 원소는 "그중 하나면 된다".
// 네 곳(SKILL · BOXES · AGENTS 표 · PROMPTS 블록) 모두에 must가 있어야 하고, never는 세 곳 중 한 곳에라도 있으면 실패.
const PHRASES = {
  ask: { must: [["상한 없음", "개수 제한 없음"], "지목", "숫자를 제안"], never: ["10개 이하"] },
  plan: { must: ["모든 행", "빈 행 0"], never: ["3개 이하"] },
  feat: { must: ["4문장", "2개 이상", "[D", "1A 2B"], never: ["내 4문장을 기다린다"] },
  defend: { must: ["[초안A]", "defend_cards"], never: [] },
  decide: { must: ["내 선택", "이유 후보", "번호로"], never: [] }, // v2.8
};

/** 입력: 명령 이름 / 출력: {SKILL, BOXES, AGENTS 표} 본문(없으면 "") */
const places = k => ({
  SKILL: rd(`.agents/skills/${k}/SKILL.md`),
  BOXES: rd("refs/BOXES.md").split(/^## /m).find(b => b.startsWith(`${k}\n`)) || "",
  "AGENTS 표": rd("AGENTS.md").split(/\r?\n/).find(l => l.startsWith(`| \`$${k}\` |`)) || "",
  // v2.8: 시험장에서 붙이는 것은 PROMPTS.md 블록이다 — 같은 어구가 있어야 한다
  PROMPTS: rd("playbook/PROMPTS.md").split(/^### /m).find(b => b.startsWith(`${k}\n`)) || "",
});

for (const [k, { must, never }] of Object.entries(PHRASES)) {
  test(`F2 일관성 $${k}: 세 곳 모두 핵심 어구, 어디에도 금지 어구 없음`, () => {
    const miss = [];
    for (const [where, s] of Object.entries(places(k))) {
      if (!s) { miss.push(`${where}: 자리 없음`); continue; }
      for (const m of must) {
        const alts = Array.isArray(m) ? m : [m];
        if (!alts.some(a => s.includes(a))) miss.push(`${where}: 핵심 "${alts.join('" 또는 "')}" 없음`);
      }
      for (const n of never) if (s.includes(n)) miss.push(`${where}: 금지 "${n}" 있음`);
    }
    assert.deepStrictEqual(miss, []);
  });
}

test("F2 금지 어구 전역(수락 기준 3): AGENTS.md · refs/BOXES.md · .agents/skills · playbook에 \"10개 이하\" 0건", () => {
  const files = ["AGENTS.md", "refs/BOXES.md",
    ...["playbook", ".agents/skills"].flatMap(d => fs.readdirSync(path.join(HARNESS, d), { recursive: true }).map(f => path.join(d, String(f)).split(path.sep).join("/")))
  ].filter(f => f.endsWith(".md"));
  const hits = files.flatMap(f => rd(f).split(/\r?\n/).flatMap((l, i) => l.includes("10개 이하") ? [`${f}:${i + 1}`] : []));
  assert.deepStrictEqual(hits, []);
});
