// v28.test.mjs — v2.8 "손으로 쓰는 것 0": 사람은 고르기만 하고 Codex가 '내 선택: … — 이유: …'로 적는다 · $decide · 4문장 퀴즈 · 초안 A/B 고르기
// 실행: (하네스 폴더에서) node --test tests_harness/*.test.mjs
// SPDX-License-Identifier: MIT
import test from "node:test";
import assert from "node:assert";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parseArgs, run as boot, COMMANDS, SKILLS } from "../bootstrap.mjs";
import { check } from "../scripts/check_evidence.mjs";

const HARNESS = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const rd = f => fs.readFileSync(path.join(HARNESS, f), "utf8").replace(/\r\n/g, "\n");
const box = k => rd("refs/BOXES.md").split(/^## /m).find(b => b.startsWith(`${k}\n`)) || "";
const RUN = () => rd("playbook/RUN.md");
const stage = n => RUN().split(/^## (?=S\d )/m).find(s => s.startsWith(`S${n} `)) || "";
const tmp = () => fs.mkdtempSync(path.join(os.tmpdir(), "v28-"));

test("v2.8-1 $decide: 명령·skill 목록에 있고 bootstrap이 깐다, SKILL 첫 줄은 고치는 파일·끝은 멈춰라", () => {
  assert.ok(COMMANDS.includes("decide") && SKILLS.includes("decide"));
  const L = rd(".agents/skills/decide/SKILL.md").replace(/^---\n[\s\S]*?\n---\n/, "").split("\n").filter(l => l.trim());
  assert.match(L[0], /^고치는 파일: DECISIONS\.md/); assert.match(L.at(-1), /멈춰라\.$/);
  const d = tmp(); boot(parseArgs(["--target", d]), HARNESS);
  assert.ok(fs.existsSync(path.join(d, ".agents/skills/decide/SKILL.md")));
  assert.match(rd("bootstrap.sh"), / decide /);
});

test("v2.8-1 $decide 내용: 슬롯 D1~D6·거부한 것 표, 이유 후보 ①②③(더 단순한 쪽), 해당 없음 후보, 고정 절 자동 편집, 번호로 답하고 멈춤, '내 선택' 형식·커밋", () => {
  // 본문만 본다(description 요약은 순서 검사에서 뺀다)
  const s = rd(".agents/skills/decide/SKILL.md").replace(/^---\n[\s\S]*?\n---\n/, "");
  for (const k of ["D1~D6", "거부한 것", "결정 후보", "A/B", "이유 후보", "①②③", "더 단순한 쪽이 4문장으로 설명되어서", "대안(더 단순 · 더 정교)",
    "약점", "out/", "검증", "해당 없음 — README 범위 밖", "AI 위임 vs 직접 검증", "기록만 해라", "설명 카드", "맡긴 것 | 내가 확인한 것 | 어떻게 | 숫자",
    "번호로 답해라: 예 D1-A②, D2-B①, 거부-A③, 고정 절 '맞다' 또는 '3번 빼라'", "내 선택: A — 이유: ②", "내가 고른 것 n건", "[S 5/6] 결정·검증 기록",
    "git show --stat HEAD", "[기록 없음]"]) assert.ok(s.includes(k), `decide SKILL에 '${k}' 없음`);
  // 순서: 표를 보여 주고 → 번호를 받고 멈춤 → 답을 받은 뒤에만 쓴다
  assert.ok(s.indexOf("번호로 답해라") < s.indexOf("내 선택: A — 이유: ②"), "쓰기 단계가 질문보다 앞에 있다");
  const b = box("decide");
  assert.ok(b, "BOXES decide 상자 없음");
  assert.strictEqual(b.split("```")[1].trim().split("\n").length, 1, "decide 상자 본문은 한 줄");
  for (const k of ["내 선택", "이유 후보", "번호로", "[S 5/6] 결정·검증 기록"]) assert.ok(b.includes(k), `BOXES decide에 '${k}' 없음`);
});

test("v2.8-2 $feat 4문장 퀴즈: 문장 4개 × A/B, 하나는 미묘하게 틀림(순서·경계·포함/제외·숫자), '1A 2B 3A 4B처럼 답해라', 틀린 고름 2개 이상이면 커밋 안 함, 카드에 (퀴즈 정답 n/4)", () => {
  for (const [w, s] of [["SKILL", rd(".agents/skills/feat/SKILL.md")], ["BOXES", box("feat")]]) {
    for (const k of ["4문장 퀴즈", "무엇을", "어떤 순서로", "왜 그렇게", "어디서 틀리나", "순서·경계·포함/제외·숫자", "1A 2B 3A 4B처럼 답해라",
      "틀린 고름", "2개 이상", "단순화", "제외", "(퀴즈 정답 n/4)"]) assert.ok(s.includes(k), `${w} feat에 '${k}' 없음`);
    assert.doesNotMatch(s, /내 4문장을 기다린다/, `${w}: 옛 '내 4문장을 기다린다'가 남음`);
  }
  const s4 = stage(4);
  assert.match(s4, /`1A 2B 3A 4B`처럼 답한다 — 비울 칸: 네 글자/);
  assert.doesNotMatch(s4, /내 4문장: </, "RUN S4에 옛 '내 4문장: <…>' 줄");
});

test("v2.8-3 $defend 초안 고르기: Q1~Q3마다 [초안A](숫자 중심)·[초안B](결정 중심), 유도 문장 포함, 'Q1-A Q2-B Q3-A처럼 답해라'로 멈춤, 답하면 고른 쪽만 남기고 LOG 본표 선택 행", () => {
  for (const [w, s] of [["SKILL", rd(".agents/skills/defend/SKILL.md")], ["BOXES", box("defend")]]) {
    for (const k of ["[초안A]", "[초안B]", "숫자 중심", "결정 중심", "유도 문장", "Q1-A Q2-B Q3-A처럼 답해라", "고른 쪽만 남기고", "LOG 본표"])
      assert.ok(s.includes(k), `${w} defend에 '${k}' 없음`);
  }
  // 유도 문장 셋(Q1 경계·Q2 검증 항목과 이유·Q3 AI 제안을 되돌린 사례)이 SKILL에 있다 — Codex는 저장소 밖 문서를 못 본다
  const s = rd(".agents/skills/defend/SKILL.md");
  for (const k of ["딱 같은", "가장 먼저 검증할 항목", "되돌렸다"]) assert.ok(s.includes(k), `유도 문장 '${k}' 없음`);
});

test("v2.8-3 check_evidence: [초안A]·[초안B]가 남으면 [초안] WARN 그대로, 고르고 지우면 PASS", () => {
  const d = tmp(); boot(parseArgs(["--target", d]), HARNESS);
  const ai = t => { fs.writeFileSync(path.join(d, "AI_COLLABORATION.md"), `# AI_COLLABORATION\n## Q1\n${t}\n`); return check(d, "dev").find(r => r.item === "AI_COLLABORATION.md [초안]"); };
  let r = ai("[초안A] D3 처리 전 12 → 후 10.\n[초안B] D1 경계는 포함으로 정했다.");
  assert.strictEqual(r.verdict, "WARN"); assert.match(r.note, /2곳/);
  r = ai("D1 경계는 포함으로 정했다.");
  assert.strictEqual(r.verdict, "PASS");
});

test("v2.8-4 RUN S5: $decide 블록(4줄 틀·빈칸 ≤3, 내 판단 <이유 후보에서 고른다/직접 한 줄 친다>), 옛 '내가 쓴다' 선언 없음 · S6은 Q1-A Q2-B Q3-A로 고른다", () => {
  const s5 = stage(5), s6 = stage(6);
  assert.match(s5, /\$decide/);
  assert.doesNotMatch(RUN(), /내가 쓴다\. 건드리지 마라/);
  assert.match(s6, /Q1-A Q2-B Q3-A로 고른다/);
  assert.doesNotMatch(s6, /\[초안\]`을 내 말로 고치며/);
  assert.ok(RUN().trimEnd().split("\n").length <= 170);
});

test("v2.8-5 양식: HOW_TO_RUN 설계 기준에 prove 네 숫자 (채운다), 내보내기에 status 자가 점검 (채운다) · role-c '비우지 말고 값 또는 미측정' · DECISIONS D6 '없음 — 그래서 ○○'", () => {
  const h = rd("scaffold/node-v2/HOW_TO_RUN.md");
  const sec = name => h.split(/^## /m).find(b => b.startsWith(name)) || "";
  const design = sec("설계 기준");
  for (const k of ["현행", "기준안", "우리 안", "이론 하한"]) assert.match(design, new RegExp(`^- ${k}: \\(채운다`, "m"), `설계 기준 ${k} 줄`);
  assert.match(design, /out\/prove\.md/);
  assert.match(sec("내보내기"), /^- status 자가 점검: \(채운다/m);
  assert.match(rd(".agents/skills/role-c/SKILL.md"), /비우지 말고 값 또는 '미측정'/);
  const d6 = rd("templates/dev/DECISIONS.md").split("### D6")[1].split("### D7")[0];
  assert.match(d6, /없는 단계는 '없음 — 그래서 ○○'/);
});

test("v2.8-6 AGENTS: 규칙 DECISIONS 줄은 '$decide의 선택지에서 내가 고르고 Codex가 '내 선택 — 이유'로 적는다', 명령 표에 $decide", () => {
  const a = rd("AGENTS.md");
  const rule = a.split("\n").find(l => l.startsWith("DECISIONS:")) || "";
  assert.match(rule, /본문은 \$decide의 선택지에서 내가 고르고 Codex가 '내 선택 — 이유'로 적는다/);
  assert.match(a, /^\| `\$decide` \|/m);
});
