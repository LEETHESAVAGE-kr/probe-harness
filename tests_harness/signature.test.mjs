// signature.test.mjs — v2.2 F4-4: check_evidence "시그니처" 항목. 슬롯 D1~D6마다 다섯 곳(DECISIONS 본문 · 코드 주석 [Dn] · 테스트 이름 [Dn] · 커밋 메시지 Dn · AI_COLLABORATION Dn) 중
// 셋 이상이면 PASS, "해당 없음"이면 SKIP, 둘 이하면 WARN(FAIL 아님 — 제출을 막지 않는다)
// 실행: (하네스 폴더에서) node --test tests_harness/*.test.mjs
// SPDX-License-Identifier: MIT
import test from "node:test";
import assert from "node:assert";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";
import { parseArgs, run as boot } from "../bootstrap.mjs";

const HARNESS = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const FIX = path.join(HARNESS, "tests_harness/fixtures/class_signup");
const write = (d, f, s) => { fs.mkdirSync(path.dirname(path.join(d, f)), { recursive: true }); fs.writeFileSync(path.join(d, f), s); };
const gitc = (d, ...a) => execFileSync("git", ["-c", "user.name=t", "-c", "user.email=t@t", ...a], { cwd: d, encoding: "utf8" });

// 가짜 DECISIONS: bootstrap이 깐 양식(templates/dev/DECISIONS.md)의 슬롯 칸을 채운다 — 양식과 check_evidence가 같은 모양을 보는지까지 시험한다.
// D3은 "해당 없음", D4·D6은 비워 둔다.
const FIELDS = ["결정", "대안", "약점", "검증"];
/** 입력: 양식 본문·{슬롯 번호: [결정, 대안, 약점, 검증]} / 출력: 그 슬롯의 "- 칸:" 줄을 채운 본문 / 깨지는 조건: 슬롯 절·칸이 없으면 Error */
function fillSlots(md, slots) {
  const L = md.replace(/\r\n/g, "\n").split("\n");
  for (const [n, vals] of Object.entries(slots)) {
    const h = L.findIndex(l => new RegExp(`^#{2,4} D${n}(?!\\d)`).test(l));
    if (h < 0) throw new Error(`양식에 D${n} 절이 없다`);
    FIELDS.forEach((f, k) => {
      const i = L.findIndex((l, j) => j > h && l.startsWith(`- ${f}`));
      if (i < 0 || L.slice(h + 1, i).some(l => /^#{1,4} /.test(l))) throw new Error(`D${n} '${f}' 칸이 없다`);
      if (vals[k]) L[i] = L[i].replace(/:\s*$/, `: ${vals[k]}`);
    });
  }
  return L.join("\n");
}
const decisions = (tpl, { d2 = true, d5 = "본문" } = {}) => fillSlots(tpl, {
  1: ["신청 도착 순서대로 정원까지 확정", "단순: 손 대장 / 정교: 대기 우선순위", "같은 초에 두 건이면 도착 순이 갈린다", "tests/feat_signup.test.js"],
  ...(d2 ? { 2: ["재계산은 한 번에 하나, 겹치면 두 번째는 409", "단순: 잠금 없음 / 정교: DB 잠금", "프로세스가 둘이면 잠금이 안 듣는다", "out/concurrency_check.txt"] } : {}),
  3: ["해당 없음 — README 범위 밖"],
  5: d5 === "본문" ? ["SLOT_SCHEMA.md 표에서 키를 읽어 대조한다", "단순: 키 하드코딩 / 정교: JSON Schema", "표 형식이 바뀌면 키를 못 읽는다", "tests/feat_schema.test.js"] : ["해당 없음 — README 범위 밖"],
});
const collab = mention => `# AI 협업 기록\n## Q1. AI에게 무엇을 맡겼나\n${mention}\n## Q2. 무엇을 직접 확인했나\n신청 결과를 원본과 대조했다.\n## Q3. AI 제안을 고친 부분\n기록 없음\n`;

/** 입력: 가짜 기록 옵션 / 출력: check_evidence 표준 출력 전체 — fixture 복사 → bootstrap → node-v2 부품 → 가짜 DECISIONS·커밋·AI_COLLABORATION */
function scenario({ dec, ai, msg }) {
  const d = fs.mkdtempSync(path.join(os.tmpdir(), "v22-sig-")); fs.cpSync(FIX, d, { recursive: true });
  boot(parseArgs(["--target", d]), HARNESS);
  boot(parseArgs(["--target", d, "--scaffold", "node-v2", "--with", "auth,lock,schema,docker"]), HARNESS);
  gitc(d, "add", "-A"); gitc(d, "commit", "-qm", "[S 3/6] 뼈대");
  write(d, "DECISIONS.md", decisions(fs.readFileSync(path.join(d, "DECISIONS.md"), "utf8"), dec)); write(d, "AI_COLLABORATION.md", ai);
  gitc(d, "add", "-A"); gitc(d, "commit", "-qm", msg);
  try { return execFileSync(process.execPath, [path.join(HARNESS, "scripts/check_evidence.mjs")], { cwd: d, encoding: "utf8", stdio: "pipe" }); }
  catch (e) { return String(e.stdout); }
}
const sigLine = out => out.split(/\r?\n/).find(l => /시그니처/.test(l)) || "";

test("F4-4 정상: D2 5/5 PASS · D5 4/5 PASS · D1 2/5 WARN · D3 SKIP(README 범위 밖), 줄 판정은 FAIL이 아니다", () => {
  const out = scenario({
    dec: {},
    ai: collab("D1 단순 규칙 먼저로 신청 순서를 정했고, D2 쓰기 직렬화로 동시 재계산을 막았고, D5 스키마 대조로 내보내기 키를 맞췄다."),
    msg: "[S 4/6] R1 신청 확정 (D2 쓰기 직렬화)",
  });
  const line = sigLine(out);
  assert.ok(line, `시그니처 줄 없음 — check_evidence 출력:\n${out}`);
  assert.match(line, /^(PASS|WARN)\s/, "시그니처는 FAIL을 내지 않는다");
  assert.match(line, /D2 5\/5 PASS/, "D2: DECISIONS·lock.js [D2]·feat_lock [D2]·커밋·AI_COLLABORATION");
  assert.match(line, /D5 4\/5 PASS/, "D5: DECISIONS·validate_schema.js [D5]·feat_schema [D5]·AI_COLLABORATION");
  assert.match(line, /D1 2\/5 WARN/, "D1: DECISIONS·AI_COLLABORATION뿐");
  assert.match(line, /D3 SKIP\(README 범위 밖\)/);
  for (const n of [4, 6]) assert.match(line, new RegExp(`D${n} `), `D${n} 칸`);
});

test("F4-4 결함 재삽입: D2를 DECISIONS·커밋·AI_COLLABORATION에서 빼면 2/5 WARN, D5를 '해당 없음'으로 적으면 코드가 있어도 SKIP", () => {
  const out = scenario({
    dec: { d2: false, d5: "해당 없음" },
    ai: collab("D1 단순 규칙 먼저로 신청 순서를 정했다."),
    msg: "[S 4/6] R1 신청 확정 (D1 단순 규칙)",
  });
  const line = sigLine(out);
  assert.ok(line, `시그니처 줄 없음 — check_evidence 출력:\n${out}`);
  assert.match(line, /D2 2\/5 WARN/, "남은 것은 코드 주석·테스트 이름뿐");
  assert.match(line, /D5 SKIP\(README 범위 밖\)/);
  assert.match(line, /D1 3\/5 PASS/, "커밋에 D1이 들어가 셋");
});

test("F6 [초안] 잔존: AI_COLLABORATION에 [초안]이 남으면 WARN(n곳), 지우면 항목 PASS — 제출은 막지 않는다", () => {
  const out = scenario({ dec: {}, ai: collab("[초안] D2 쓰기 직렬화로 동시 재계산을 막았다.\n[초안] D5 스키마 대조."), msg: "[S 4/6] R1 (D2)" });
  const line = out.split(/\r?\n/).find(l => /AI_COLLABORATION.*\[초안\]/.test(l)) || "";
  assert.match(line, /^WARN\s/, `[초안] 줄 없음 — 출력:\n${out}`);
  assert.match(line, /2곳/);
  const clean = scenario({ dec: {}, ai: collab("D2 쓰기 직렬화로 동시 재계산을 막았다."), msg: "[S 4/6] R1 (D2)" });
  assert.match(clean.split(/\r?\n/).find(l => /AI_COLLABORATION.*\[초안\]/.test(l)) || "", /^PASS\s/);
});
