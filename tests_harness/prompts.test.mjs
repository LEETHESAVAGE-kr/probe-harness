// prompts.test.mjs — v2.8-7: playbook/PROMPTS.md는 refs/BOXES.md에서 scripts/gen_prompts.mjs가 만든다(손으로 쓰지 않는다). 다시 만든 결과 = 커밋된 파일(바이트), 명령마다 블록 1개, RUN의 ‘이름’은 전부 PROMPTS 블록
// 실행: (하네스 폴더에서) node --test tests_harness/*.test.mjs
// SPDX-License-Identifier: MIT
import test from "node:test";
import assert from "node:assert";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { generate, parseBoxes, PROMPT_CMDS } from "../scripts/gen_prompts.mjs";

const HARNESS = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const raw = f => fs.readFileSync(path.join(HARNESS, f));
const rd = f => raw(f).toString("utf8").replace(/\r\n/g, "\n");
const BOXES = rd("refs/BOXES.md"), PROMPTS = rd("playbook/PROMPTS.md");
// 한 줄 지시 모음: 기록만 해라 · 반응 문장 6개 · 세션 교체 · 마감(그 밖의 붙여 넣기 문장도 여기)
const ONE_LINERS = ["기록-요구표", "기록-담당자 답", "기록-합의", "기록-로그인 화면", "기록-out 확인",
  "반응-요구 밖", "반응-내가 검증", "반응-바로잡기", "반응-의도 갱신", "반응-접근 변경", "반응-숫자 없는 완료", "세션 교체-기록", "세션 교체-새 탭", "마감"];
/** 입력: PROMPTS 본문 / 출력: {이름: [{when, body, after}]} */
const byName = s => {
  const o = {};
  for (const m of s.matchAll(/^### (.+)\n언제: (.+)\n```\n([\s\S]*?)\n```\n(.*)$/gm)) (o[m[1]] ??= []).push({ when: m[2], body: m[3], after: m[4] });
  return o;
};

test("v2.8-7 생성: gen_prompts가 BOXES에서 다시 만든 결과 = 커밋된 PROMPTS.md(바이트)", () => {
  assert.ok(Buffer.compare(raw("playbook/PROMPTS.md"), Buffer.from(generate(raw("refs/BOXES.md").toString("utf8")), "utf8")) === 0,
    "PROMPTS.md가 생성 결과와 다르다 — node scripts/gen_prompts.mjs");
});

test("v2.8-7 블록 수: 명령 16개(s0·s1·ask·algo·plan·s3·feat·role-a2·prove·verify·readme·decide·defend·debug·screen·traps)와 한 줄 지시마다 블록 정확히 1개, 위에 '언제:', 아래에 '비울 칸:'", () => {
  assert.deepStrictEqual(PROMPT_CMDS, ["s0", "s1", "ask", "algo", "plan", "s3", "feat", "role-a2", "prove", "verify", "readme", "decide", "defend", "debug", "screen", "traps"]);
  const B = byName(PROMPTS), bad = [];
  for (const n of [...PROMPT_CMDS, ...ONE_LINERS]) {
    const b = B[n] || [];
    if (b.length !== 1) { bad.push(`${n}: 블록 ${b.length}개`); continue; }
    if (!/^(S\d|아무|결과|테스트|담당자|같은|"완료")/.test(b[0].when)) bad.push(`${n}: 언제 줄이 S번호·상황으로 시작하지 않음`);
    if (!/[탭창]/.test(b[0].when)) bad.push(`${n}: 언제 줄에 누구 탭인지 없음`);
    if (!/^비울 칸: \S/.test(b[0].after)) bad.push(`${n}: 비울 칸 줄 없음`);
  }
  assert.deepStrictEqual(bad, []);
  assert.strictEqual(Object.values(B).flat().length, parseBoxes(BOXES).length);
});

test("v2.8-7 명령 블록 모양: 첫 줄 $이름, 둘째 줄 = BOXES 상자 본문 전문(한 줄), 그 아래 목적·범위·내 판단·확인 4줄, 빈칸 ≤3", () => {
  const B = byName(PROMPTS), bad = [];
  for (const n of PROMPT_CMDS) {
    const L = B[n][0].body.split("\n"), box = BOXES.split(/^## /m).find(b => b.startsWith(`${n}\n`));
    const body = box.match(/^```\n([^\n]*)\n```$/m)[1];
    if (L[0] !== `$${n}`) bad.push(`${n}: 첫 줄 ${L[0]}`);
    if (L[1] !== body) bad.push(`${n}: 둘째 줄이 BOXES 상자 본문과 다르다`);
    ["목적:", "범위:", "내 판단:", "확인:"].forEach((k, i) => { if (!L[2 + i]?.startsWith(k)) bad.push(`${n}: ${3 + i}째 줄이 '${k}'로 시작하지 않음`); });
    if (/<[^<>\n]+>/.test(L[1])) bad.push(`${n}: 상자 본문에 사람 빈칸 <…> — Codex가 채울 자리는 {…}`);
    const holes = (B[n][0].body.match(/<[^<>\n]+>/g) || []).length;
    if (holes > 3) bad.push(`${n}: 빈칸 ${holes}개`);
  }
  assert.deepStrictEqual(bad, []);
});

test("v2.8-7 RUN: 코드 블록 대신 ‘이름’ 참조 — 참조는 전부 PROMPTS에 있고, 명령 블록은 전부 RUN 어딘가에서 불린다 · 머리 2행 문구", () => {
  const run = rd("playbook/RUN.md"), B = byName(PROMPTS);
  const refs = [...run.matchAll(/‘([^’]+)’/g)].map(m => m[1]);
  assert.deepStrictEqual([...new Set(refs.filter(r => !B[r] && r !== "이름"))], [], "PROMPTS에 없는 참조");
  assert.deepStrictEqual(PROMPT_CMDS.filter(n => !refs.includes(n)), [], "RUN에서 안 불리는 명령 블록");
  assert.match(run.split("\n")[1], /PROMPTS\.md 블록을 통째로 붙인다 — \$ 인식 여부와 무관/);
  assert.doesNotMatch(run.split("\n")[1], /인식 안 되면/);
  for (const st of run.split(/^## (?=S\d )/m).slice(1)) assert.match(st.split("\n").find(l => l.startsWith("- 치는 것:")), /PROMPTS\.md ‘[^’]+’/, st.slice(0, 12));
});

test("v2.8-7 이관 손실 없음: 옛 RUN 반응 문장의 '커밋 메시지는 요구 변경(<HH:MM>)'이 PROMPTS ‘반응-의도 갱신’에 남아 있다", () => {
  assert.match(byName(PROMPTS)["반응-의도 갱신"][0].body, /커밋 메시지는 요구 변경\(<HH:MM>\)/);
});

test("v2.8-7 생성기 결함: 상자 본문이 두 줄이거나 지시 4줄이 빠지면 Error, BOXES를 고치고 다시 만들지 않으면 바이트 대조가 깨진다", () => {
  assert.throws(() => generate(BOXES.replace(/(^## s1\n```\n[^\n]*)\n```/m, "$1\n둘째 줄\n```")), /한 줄/);
  assert.throws(() => generate(BOXES.replace(/^## debug\n([\s\S]*?)지시:\n/m, "## debug\n$1")), /지시/);
  assert.notStrictEqual(generate(BOXES.replace("구현하지 마라.", "구현은 하지 마라.")), PROMPTS);
});
