#!/usr/bin/env node
// gen_prompts.mjs — refs/BOXES.md(상자 본문 · 지시 4줄 · 언제 · 비울 칸 · 한 줄 지시)에서 playbook/PROMPTS.md를 만든다. PROMPTS.md는 손으로 고치지 않는다
// 사용: (하네스 폴더에서) node scripts/gen_prompts.mjs [--check]   --check는 다시 만든 결과와 커밋된 파일을 바이트로 대조만. 종료 코드: 0 같음 · 1 다름
// SPDX-License-Identifier: MIT
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { isMain } from "./lib.mjs";

const HARNESS = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
// PROMPTS.md에 블록을 두는 명령(이 순서로). s3·traps는 skill이 없는 상자다
export const PROMPT_CMDS = ["s0", "s1", "ask", "algo", "plan", "s3", "feat", "role-a2", "prove", "verify", "readme", "decide", "defend", "debug", "screen", "traps"];

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

/** 입력: BOXES 본문 / 출력: PROMPTS.md 본문(LF) / 깨지는 조건: parseBoxes와 같다 */
export function generate(text) {
  const B = parseBoxes(text), cmd = new Set(PROMPT_CMDS);
  const block = b => `### ${b.name}\n언제: ${b.when}\n\`\`\`\n${b.body}\n\`\`\`\n비울 칸: ${b.holes || "없음"}\n`;
  return [
    "# PROMPTS — 붙여 넣는 완성 프롬프트 (블록 = 명령 하나)",
    "",
    "> 블록을 통째로 복사해 Codex 입력칸(`›`)에 붙이고 `<…>` 칸만 바꾼다(선택지 `<가/나>`는 하나만 남긴다) — `$` 인식 여부와 무관, 첫 줄 `$이름`은 있어도 그만. `{…}`는 Codex가 채운다.",
    "> 생성 파일 — 손으로 고치지 마라. 원본은 하네스 `refs/BOXES.md`, 다시 만들기: `node scripts/gen_prompts.mjs`. 하네스가 `./.harness`에 있으면 `/tmp/harness`를 `./.harness`로 읽는다.",
    "",
    "## 명령",
    "",
    B.filter(b => cmd.has(b.name)).map(block).join("\n"),
    "## 한 줄 지시",
    "",
    B.filter(b => !cmd.has(b.name)).map(block).join("\n"),
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
