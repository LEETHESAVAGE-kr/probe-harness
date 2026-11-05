// order.test.mjs — PROMPTS.md 맨 위 순서 절(원본 refs/ORDER.md): RUN S0~S6 번호 줄의 백틱 명령과 ‘블록 이름’이 같은 순서로 다 있다 · '안 되면'의 입력도 있다 · DM 문장은 ASK.md와 글자까지 같다
// 실행: (하네스 폴더에서) node --test tests_harness/*.test.mjs
// SPDX-License-Identifier: MIT
import test from "node:test";
import assert from "node:assert";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { generate, parseBoxes, ORDER_HEAD } from "../scripts/gen_prompts.mjs";
import { parseArgs, run as boot } from "../bootstrap.mjs";

const HARNESS = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const rd = f => fs.readFileSync(path.join(HARNESS, f), "utf8").replace(/\r\n/g, "\n");
const RUN = rd("playbook/RUN.md"), ORDER = rd("refs/ORDER.md"), BOXES = rd("refs/BOXES.md"), PROMPTS = rd("playbook/PROMPTS.md");
const BLOCKS = new Set(parseBoxes(BOXES).map(b => b.name));

// 번호 줄에 있지만 내가 치는 입력이 아닌 것
const NOT_INPUT = new Set(["$", "- 뼈대 부품:"]);
// '안 되면' 줄의 증상 인용(내가 치지 않는다)
const SYMPTOM = new Set(["syntax error near unexpected token", "^[[200~", "EADDRINUSE", "PORT=3001", "$s1", "$s0"]);
// 코드 따옴표 밖이거나 내 눈 줄에 있지만 내가 치는 답
const ANSWERS = ["1A 2B 3A 4B", "Q1-A Q2-B Q3-A", "기준 a 후보 n", "1A 2B", "R25 만들 R26 뺄", "맞다", "D1-A② D2-B① 거부-A③ 고정 절 맞다", "가", "나"];

const tokens = l => [...l.matchAll(/`([^`]+)`|‘([^’]+)’/g)].map(m => m[1] ?? m[2]);
// `$prove`처럼 같은 이름 블록이 있으면 블록 쪽으로 대조한다(블록 첫 줄이 곧 그 명령)
const isInput = t => !NOT_INPUT.has(t) && !(t.startsWith("$") && BLOCKS.has(t.slice(1)));

/** 입력: RUN 본문 / 출력: {S0: {main: [...], tail: [...]}, ...} — main = 번호 줄(1. · - **① · - 제출:)의 입력, tail = '안 되면' 줄의 입력 */
export function runTokens(text) {
  const out = {};
  for (const st of text.split(/^## (?=S\d )/m).slice(1)) {
    const key = st.slice(0, 2), main = [], tail = [];
    for (const l of st.split("\n").slice(1)) {
      if (/^\s*(\d+\.|- \*\*|- 제출:)/.test(l)) main.push(...tokens(l).filter(isInput));
      else if (/^\s*- 안 되면:/.test(l)) tail.push(...tokens(l).filter(isInput));
    }
    out[key] = { main, tail };
  }
  return out;
}

/** 입력: 순서 절 본문 / 출력: {S0: {main: [...], tail: "↳ 줄 전부"}, ...} — S4 두 패스는 S4로, 제출은 S6으로 합친다 */
export function orderTokens(text) {
  const out = {};
  for (const sec of text.slice(text.indexOf(ORDER_HEAD)).split(/^## (?=S\d |제출)/m).slice(1)) {
    const key = sec.startsWith("제출") ? "S6" : sec.slice(0, 2), o = (out[key] ??= { main: [], tail: "" });
    for (const l of sec.split("\n").slice(1)) {
      if (/^\s*↳/.test(l)) o.tail += `${l}\n`;
      else if (/^\d+\. /.test(l)) o.main.push(...tokens(l));
    }
  }
  return out;
}

/** 입력: RUN 본문, 순서 절 본문 / 출력: 어긋남 목록 — RUN 번호 줄 입력이 순서 절에 차례대로 없으면 한 줄씩 */
export function orderGaps(runText, orderText) {
  const R = runTokens(runText), O = orderTokens(orderText), bad = [];
  for (const [st, { main, tail }] of Object.entries(R)) {
    const o = O[st] || { main: [], tail: "" };
    let at = 0;
    for (const t of main) {
      const i = o.main.indexOf(t, at);
      if (i < 0) bad.push(`${st} 번호 줄: ${t} — 없거나 순서가 다르다`); else at = i + 1;
    }
    for (const t of tail) if (!SYMPTOM.has(t) && !o.tail.includes(t)) bad.push(`${st} 안 되면: ${t} 없음`);
  }
  return bad;
}

const line = re => ORDER.split("\n").find(l => re.test(l));

test("순서 대조: RUN S0~S6 번호 줄의 백틱 명령·‘블록 이름’이 순서 절에 같은 순서로 전부, '안 되면'의 입력도 ↳ 줄에 전부", () => {
  assert.ok(Object.keys(runTokens(RUN)).length === 7, "단계 7개");
  assert.ok(Object.values(runTokens(RUN)).flatMap(s => s.main).length > 40, "대조할 입력이 너무 적다 — 추출기 고장");
  assert.deepStrictEqual(orderGaps(RUN, ORDER), []);
  assert.deepStrictEqual(orderGaps(RUN, PROMPTS.slice(0, PROMPTS.indexOf("\n# 블록 "))), [], "PROMPTS.md 순서 절");
});

test("결함 재삽입: 순서 절에서 명령 한 줄을 지우거나 두 줄을 바꾸면 잡는다", () => {
  const swap = (a, b) => ORDER.replace(a, "\0").replace(b, a).replace("\0", b);
  // 지움: 번호 줄 명령 / 번호 줄 블록 / 끝 단계 / '안 되면' 입력
  assert.ok(orderGaps(RUN, ORDER.replace(line(/`ss -ltnp/) + "\n", "")).some(b => b.includes("ss -ltnp")));
  assert.ok(orderGaps(RUN, ORDER.replace(line(/블록 ‘기록-로그인 화면’/) + "\n", "")).some(b => b.includes("기록-로그인 화면")));
  assert.ok(orderGaps(RUN, ORDER.replace(line(/`rm -rf _playbook`/) + "\n", "")).some(b => b.includes("rm -rf _playbook")));
  assert.ok(orderGaps(RUN, ORDER.replace(line(/↳.*diag_web/) + "\n", "")).some(b => b.includes("diag_web")));
  // 바꿈: 인접 두 줄 — 창 8 서버와 창 6 확인 / 창 5 screen과 창 2 기록 / 창 2 마감과 check_evidence
  assert.ok(orderGaps(RUN, swap(line(/^4\. \[창 8\]/), line(/^5\. \[창 6\] `ss/))).length > 0);
  assert.ok(orderGaps(RUN, swap(line(/블록 ‘기록-로그인 화면’/), line(/^8\. \[창 5\] 블록 ‘screen’/))).length > 0);
  assert.ok(orderGaps(RUN, swap(line(/check_evidence/), line(/^6\. \[창 2\] 블록 ‘마감’/))).length > 0);
  // RUN에 새 명령이 생겼는데 순서 절에 없으면 잡는다
  assert.ok(orderGaps(RUN.replace("5. [창 5] ‘screen’.", "5. [창 5] ‘screen’ → [창 6] `새 명령`."), ORDER).some(b => b.includes("새 명령")));
});

test("순서 절 모양: 번호 줄은 [어디] + 입력, ↳ 줄은 안 되면(증상), 머리에 시각 범위, S0→…→제출, 블록은 '블록 ‘이름’'", () => {
  const sec = ORDER.slice(ORDER.indexOf(ORDER_HEAD)), bad = [];
  for (const l of sec.split("\n").slice(1).filter(Boolean)) {
    if (/^## /.test(l)) { if (!/ \(\d+~\d+분\)$/.test(l)) bad.push(`머리 시각: ${l}`); continue; }
    if (/^\s*↳/.test(l)) { if (!/^   ↳ 안 되면\(.+?\): \S/.test(l)) bad.push(`↳ 모양: ${l}`); continue; }
    if (!/^\d+\. \[(창 \d|Browser|DM|에디터|화면)\] \S/.test(l)) bad.push(`번호 줄 모양: ${l}`);
    for (const m of l.matchAll(/(.{0,3})‘/g)) if (!m[1].endsWith("블록 ")) bad.push(`블록 표기: ${l}`);
  }
  assert.deepStrictEqual(bad, []);
  const heads = sec.split("\n").filter(l => /^## /.test(l)).slice(1).map(l => l.split(" ").slice(1, 2)[0]);
  assert.deepStrictEqual(heads, ["S0", "S1", "S2", "S3", "S4", "S4", "S5", "S6", "제출"]);
  assert.deepStrictEqual(ANSWERS.filter(a => !sec.includes(`\`${a}\``) && !sec.includes(`\`${a}\`처럼`)), []);
  // 손으로 하는 일·키 입력
  for (const k of ["Alt+Z", "Ctrl+C", "Esc", "Port `3000`", "Path `/`", "1 판단", "2 A 구현", "3 A2 구현", "4 C 문서", "5 D 측정", "6 터미널", "7 B 리뷰", "8 서버"]) assert.ok(sec.includes(k), k);
});

test("DM 문장: 순서 절 [DM] 백틱은 ASK.md 상자(줄바꿈은 공백)와 글자까지 같다 — 어긋나면 실패", () => {
  const ask = new Set([...rd("playbook/ASK.md").matchAll(/^```\n([\s\S]*?)\n^```$/gm)].map(m => m[1].replace(/\n/g, " ")));
  const dms = ORDER.split("\n").filter(l => /\[DM\]/.test(l)).flatMap(l => [...l.matchAll(/`([^`]+)`/g)].map(m => m[1]));
  assert.ok(dms.length >= 7, `DM 문장 ${dms.length}개`);
  assert.deepStrictEqual(dms.filter(d => !ask.has(d)), []);
});

test("PROMPTS 자리: 제목 바로 다음이 순서 절, 블록 본문은 순서 절 뒤에 한 번씩만", () => {
  const L = PROMPTS.split("\n");
  assert.ok(L[0].startsWith("# PROMPTS"));
  assert.strictEqual(L[2], ORDER_HEAD);
  assert.strictEqual(L[4].slice(0, 6), "## S0 ");
  const end = PROMPTS.indexOf("\n# 블록 ");
  assert.ok(end > 0);
  assert.doesNotMatch(PROMPTS.slice(0, end), /^```|^### /m, "순서 절에 블록 본문·이름 머리가 들어갔다");
  for (const b of parseBoxes(BOXES)) assert.strictEqual(PROMPTS.split(`\n### ${b.name}\n`).length, 2, b.name);
});

test("생성기 결함: ORDER에 없는 블록 이름을 쓰거나 순서 머리가 없으면 Error", () => {
  assert.throws(() => generate(BOXES, RUN, ORDER.replace("블록 ‘screen’", "블록 ‘스크린’")), /스크린/);
  assert.throws(() => generate(BOXES, RUN, ORDER.replace(ORDER_HEAD, "## 순서")), /순서/);
});

test("bootstrap: 빈 폴더에 깐 _playbook/PROMPTS.md 첫 화면이 순서 절", () => {
  const d = fs.mkdtempSync(path.join(os.tmpdir(), "order-")); boot(parseArgs(["--target", d]), HARNESS);
  const head = fs.readFileSync(path.join(d, "_playbook/PROMPTS.md"), "utf8").split("\n").slice(0, 6).join("\n");
  assert.ok(head.includes(ORDER_HEAD) && head.includes("## S0 세팅 (0~8분)") && head.includes("git clone"), head);
});
