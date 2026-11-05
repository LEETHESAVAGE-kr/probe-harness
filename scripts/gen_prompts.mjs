#!/usr/bin/env node
// gen_prompts.mjs — refs/ORDER.md(맨 위 순서 절)와 refs/BOXES.md(상자 본문 · 지시 4줄 · 언제 · 비울 칸 · 한 줄 지시)에서 playbook/PROMPTS.md를 만든다. PROMPTS.md는 손으로 고치지 않는다
// 사용: (하네스 폴더에서) node scripts/gen_prompts.mjs [--check]   --check는 다시 만든 결과와 커밋된 파일을 바이트로 대조만. 종료 코드: 0 같음 · 1 다름
// SPDX-License-Identifier: MIT
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { isMain } from "./lib.mjs";

const HARNESS = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
// PROMPTS.md에 블록을 두는 명령(이 순서로). s3·traps는 skill이 없는 상자다
export const PROMPT_CMDS = ["s0", "s1", "ask", "algo", "plan", "s3", "feat", "role-a2", "prove", "verify", "readme", "decide", "defend", "debug", "screen", "traps"];
export const ORDER_HEAD = "## 순서 — 위에서 아래로 친다";

const fences = s => [...s.matchAll(/^```[^\n]*\n([\s\S]*?)^```$/gm)].map(m => m[1].replace(/\n$/, ""));
const field = (s, k) => (s.match(new RegExp(`^${k}: (.*)$`, "m")) || [])[1] || "";

/** 입력: BOXES 본문 / 출력: [{name, when, body, holes}] — 명령 블록 뒤에 한 줄 지시 블록 / 깨지는 조건: 상자·지시·언제가 빠진 명령이 있으면 Error */
export function parseBoxes(text) {
  const s = text.replace(/\r\n/g, "\n"), secs = s.split(/^## /m);
  const sec = n => secs.find(b => b.startsWith(`${n}\n`));
  const out = [];
  for (const n of PROMPT_CMDS) {
    const b = sec(n); if (!b) throw new Error(`BOXES에 ${n} 상자 없음`);
    const [body] = fences(b), lines = b.includes("\n지시:\n") ? fences(b.split("\n지시:\n")[1])[0] : "";
    if (!body || body.includes("\n")) throw new Error(`${n}: 상자 본문은 한 줄`);
    if (!lines || !field(b, "언제")) throw new Error(`${n}: '지시:' 4줄 또는 '언제:' 없음`);
    out.push({ name: n, when: field(b, "언제"), body: `$${n}\n${body}\n${lines}`, holes: field(b, "비울 칸") });
  }
  const reactions = (fences(sec("prompt") || "")[1] || "").split("\n").filter(Boolean);
  for (const e of (sec("한 줄 지시") || "").split(/^### /m).slice(1)) {
    const name = e.split("\n")[0].trim(), ref = field(e, "본문");
    const body = ref ? reactions[Number(ref.replace(/\D/g, "")) - 1] : fences(e)[0];
    if (!body) throw new Error(`한 줄 지시 ${name}: 본문 없음`);
    out.push({ name, when: field(e, "언제"), body, holes: field(e, "비울 칸") });
  }
  return out;
}

/** 입력: RUN 본문 / 출력: [{head, names, again}] — 블록마다 자리 하나: 번호 단계 본문(1. · - **①)에서 처음 부른 곳 → 없으면 그 밑 줄(내 눈·안 되면) → 없으면 강제 이동·치는 것 줄. 앞 단계에 자리가 있는 이름은 again / 깨지는 조건: 없음 */
export function runOrder(runText) {
  const stages = runText.replace(/\r\n/g, "\n").split(/^## (?=S\d )/m).slice(1), hits = [];
  stages.forEach((st, si) => {
    let step = 0;
    st.split("\n").slice(1).forEach((l, li) => {
      const main = /^\s*(\d+\.|- \*\*)/.test(l); if (main) step++;
      const rank = main ? 0 : /^- (강제 이동|치는 것):/.test(l) ? 2 : 1;
      for (const m of l.matchAll(/‘([^’]+)’/g)) hits.push({ n: m[1], si, step: rank === 2 ? 1e6 : step, rank, li, pos: m.index });
    });
  });
  const home = new Map();
  for (const r of [0, 1, 2]) for (const h of hits) if (h.rank === r && !home.has(h.n)) home.set(h.n, h);
  const key = h => [h.si, h.step, h.rank, h.li, h.pos];
  const cmp = (a, b) => { const x = key(a), y = key(b); for (let k = 0; k < x.length; k++) if (x[k] !== y[k]) return x[k] - y[k]; return 0; };
  const placed = [...home.values()].sort(cmp);
  return stages.map((st, si) => ({
    head: st.split("\n")[0].trim(),
    names: placed.filter(h => h.si === si).map(h => h.n),
    again: [...new Set(hits.filter(h => h.si === si && h.rank < 2 && home.get(h.n).si < si).map(h => h.n))],
  }));
}

/** 입력: ORDER 본문, 블록 이름 Set / 출력: "## 순서" 줄부터 끝까지(LF) / 깨지는 조건: 그 줄이 없거나 없는 블록 이름을 부르면 Error */
export function orderSection(orderText, names) {
  const s = orderText.replace(/\r\n/g, "\n"), at = s.indexOf(`${ORDER_HEAD}\n`);
  if (at < 0) throw new Error(`ORDER에 '${ORDER_HEAD}' 줄 없음`);
  const body = s.slice(at).trimEnd();
  const miss = [...new Set([...body.matchAll(/‘([^’]+)’/g)].map(m => m[1]))].filter(n => !names.has(n));
  if (miss.length) throw new Error(`ORDER가 부른 블록이 BOXES에 없다: ${miss.join(", ")}`);
  return body;
}

/** 입력: BOXES 본문, RUN 본문(기본: playbook/RUN.md), ORDER 본문(기본: refs/ORDER.md) / 출력: PROMPTS.md 본문(LF) — 맨 위 순서 절, 그 아래 RUN 시간 순서대로 단계별 블록, RUN 단계에서 안 불리는 블록은 끝 '아무 때나' / 깨지는 조건: parseBoxes·orderSection과 같다 */
export function generate(text, runText = fs.readFileSync(path.join(HARNESS, "playbook/RUN.md"), "utf8"), orderText = fs.readFileSync(path.join(HARNESS, "refs/ORDER.md"), "utf8")) {
  const B = parseBoxes(text), by = new Map(B.map(b => [b.name, b])), used = new Set();
  const block = b => `### ${b.name}\n언제: ${b.when}\n\`\`\`\n${b.body}\n\`\`\`\n비울 칸: ${b.holes || "없음"}\n`;
  const parts = [];
  for (const st of runOrder(runText)) {
    const own = st.names.filter(n => by.has(n) && !used.has(n));
    own.forEach(n => used.add(n));
    const again = st.again.filter(n => by.has(n));
    parts.push(`## ${st.head}`, "", ...(again.length ? [`> 이 단계에서 다시 쓰는 블록(앞 단계에 있음): ${again.map(n => `‘${n}’`).join(" · ")}`, ""] : []), own.map(n => block(by.get(n))).join("\n"));
  }
  const rest = B.filter(b => !used.has(b.name));
  return [
    "# PROMPTS — 붙여 넣는 완성 프롬프트 (블록 = 명령 하나)",
    "",
    orderSection(orderText, new Set(by.keys())),
    "",
    "# 블록 — 위 순서에서 이름으로 부른다",
    "",
    "> 블록을 통째로 복사해 Codex 입력칸(`›`)에 붙이고 `<…>` 칸만 바꾼다(선택지 `<가/나>`는 하나만 남긴다) — `$` 인식 여부와 무관, 첫 줄 `$이름`은 있어도 그만. `{…}`는 Codex가 채운다.",
    "> 생성 파일 — 손으로 고치지 마라. 원본은 하네스 `refs/BOXES.md`·`refs/ORDER.md`, 다시 만들기: `node scripts/gen_prompts.mjs`. 하네스가 `./.harness`에 있으면 `/tmp/harness`를 `./.harness`로 읽는다.",
    "> 순서는 `RUN.md`와 같다 — 단계(S0~S6)마다 RUN의 번호 단계에서 처음 부르는 순서대로 놓았다. 위에서 아래로 내려가며 붙이면 된다.",
    "",
    ...parts,
    "## 아무 때나 — 반응·예비 (RUN 단계 번호에 없는 블록)",
    "",
    rest.map(block).join("\n"),
  ].join("\n");
}

if (isMain(import.meta.url)) {
  const dst = path.join(HARNESS, "playbook/PROMPTS.md");
  const out = generate(fs.readFileSync(path.join(HARNESS, "refs/BOXES.md"), "utf8"));
  if (process.argv.includes("--check")) {
    const same = fs.existsSync(dst) && Buffer.compare(fs.readFileSync(dst), Buffer.from(out, "utf8")) === 0;
    console.log(same ? "PROMPTS.md = BOXES 생성 결과" : "PROMPTS.md가 BOXES 생성 결과와 다르다 — node scripts/gen_prompts.mjs");
    process.exit(same ? 0 : 1);
  }
  fs.writeFileSync(dst, out);
  console.log(`playbook/PROMPTS.md ${out.split("\n").length}줄 · 블록 ${parseBoxes(fs.readFileSync(path.join(HARNESS, "refs/BOXES.md"), "utf8")).length}개`);
}
