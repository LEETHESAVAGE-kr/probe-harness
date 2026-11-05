// v29.test.mjs — v2.9: 켜는 방법이 있을 때만 발동하는 변경 — $s1 장문 · inventory 폴백 · $algo · $plan 분할표 · $feat 묶음 · $role-a2 · check_evidence 훅 · $defend 읽기 카드
// 실행: (하네스 폴더에서) node --test tests_harness/*.test.mjs
// SPDX-License-Identifier: MIT
import test from "node:test";
import assert from "node:assert";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { textInventory, textProfile } from "../scripts/inventory.mjs";
import { check } from "../scripts/check_evidence.mjs";
import { parseArgs, run as boot, COMMANDS, SKILLS } from "../bootstrap.mjs";

const HARNESS = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const rd = f => fs.readFileSync(path.join(HARNESS, f), "utf8").replace(/\r\n/g, "\n");
const tmp = () => fs.mkdtempSync(path.join(os.tmpdir(), "v29-"));
const put = (d, f, s) => { fs.mkdirSync(path.dirname(path.join(d, f)), { recursive: true }); fs.writeFileSync(path.join(d, f), s); };
const INV = path.join(HARNESS, "scripts/inventory.mjs");

test("C1 $s1 장문: SKILL·BOXES에 켜는 조건 '장문'·2,000줄, '후보' 절, out/examples.md, 보고 첫 줄 형식 / 조건이 아니면 건너뛴다", () => {
  const s = rd(".agents/skills/s1/SKILL.md");
  for (const k of ["장문", "후보", "examples.md", "2,000줄", "근거 절", "요구 n행(★ k) · 후보 m · 예시 쌍 p"]) { assert.ok(s.includes(k), k); assert.ok(rd("refs/BOXES.md").includes(k), `BOXES ${k}`); }
  assert.match(s, /이 절을 통째로 건너뛴다/);
});

test("C6 폴백: CSV 없는 data/에서 JSON 배열은 객체 수·상위 키, TXT는 행 수, 빈칸·중복·길이 / out/inventory.md 표 머리 고정", () => {
  const d = tmp();
  put(d, "data/records.json", JSON.stringify(Array.from({ length: 300 }, (_, i) => ({ id: i % 299, name: i ? `m${i}` : "" }))));
  put(d, "data/sub/notes.txt", "첫 줄\n\n둘째\n둘째\n");
  put(d, "data/one.json", JSON.stringify({ a: 1, b: "" }));
  const r = spawnSync(process.execPath, [INV, "--out", "out/inventory.md"], { cwd: d, encoding: "utf8" });
  assert.strictEqual(r.status, 0, r.stderr);
  const md = fs.readFileSync(path.join(d, "out/inventory.md"), "utf8");
  assert.match(md, /\| 파일 \| 형식 \| 건수\(행\/객체\) \| 필드\(상위 키 또는 첫 줄\) \| 빈칸 \| 완전 중복 \| 본문 평균 길이 \| 최장 \|/);
  assert.match(md, /data\/records\.json \| json \| 객체 300 \| id, name \| 1 \|/);
  assert.match(md, /data\/one\.json \| json \| 키 2 \| a, b \| 1 \|/);
  assert.match(md, /data\/sub\/notes\.txt \| txt \| 행 3 \| 첫 줄 \| 1 \| 1 \|/);
});

test("C6 불변: CSV가 있으면 폴백을 타지 않는다(인자에 CSV, data/에 CSV) · CSV도 텍스트도 없으면 옛 사용법 오류 · 깨진 JSON은 줄 기준", () => {
  const d = tmp(); put(d, "data/a.csv", "id,v\n1,2\n"); put(d, "data/n.txt", "x\n");
  assert.strictEqual(textInventory(path.join(d, "data")), "");
  const r = spawnSync(process.execPath, [INV, "data/a.csv", "--out", "out/i.md"], { cwd: d, encoding: "utf8" });
  assert.match(fs.readFileSync(path.join(d, "out/i.md"), "utf8"), /^## data\/a\.csv$/m); assert.strictEqual(r.status, 0);
  assert.strictEqual(spawnSync(process.execPath, [INV], { cwd: tmp(), encoding: "utf8" }).status, 2);
  const f = tmp(); put(f, "root.csv", "id,v\n1,2\n"); put(f, "data/n.txt", "x\n"); // 인자에 CSV가 있으면 data/에 텍스트만 있어도 기존 경로
  spawnSync(process.execPath, [INV, "root.csv", "--out", "out/i.md"], { cwd: f, encoding: "utf8" });
  assert.match(fs.readFileSync(path.join(f, "out/i.md"), "utf8"), /^## root\.csv$/m);
  const e = tmp(); put(e, "bad.json","{ 깨짐\n");
  assert.match(textProfile(path.join(e, "bad.json"))[1], /파싱 실패/);
});

test("C2 $algo: 배포 목록·SKILL 첫 줄·끝 줄, 표 머리 7칸, 고르는 규칙, D1 문구, PROMPTS 블록 4줄 · RUN S2 '`$plan` 직전 `$algo R★`' · AGENTS 규칙 12줄 불변", () => {
  const s = rd(".agents/skills/algo/SKILL.md"), b = s.replace(/^---\n[\s\S]*?\n---\n/, "").split("\n").filter(l => l.trim());
  assert.ok(COMMANDS.includes("algo") && SKILLS.includes("algo")); assert.match(rd("bootstrap.sh"), / algo /);
  assert.match(b[0], /^고치는 파일: /); assert.match(b.at(-1), /멈춰라\.$/);
  for (const k of ["| 후보 | 한 줄 원리 | 담당자 기준 충족 | 구현 시간(분) | 네 문장 설명 가능 | 입력 10배 | 약점 |", "기준을 만족하는 가장 단순한 것: 후보 n", "설명 불가 — 서술형 리스크", "[S 2/6] 알고리즘 선택", "규칙 한 문장", "대안(더 단순)", "대안(더 정교)"]) assert.ok(s.includes(k), k);
  // 구현 전에 평가 기준을 고른다: 기준 표·탈락 이유·답 형식이 SKILL과 PROMPTS 둘 다에 있다
  const blkC2 = (rd("playbook/PROMPTS.md").match(/^```\n\$algo\n[\s\S]*?^```/m) || [""])[0] + rd("refs/BOXES.md").split(/^## /m).find(x => x.startsWith("algo\n"));
  for (const k of ["| 기준 | 더 나은 결과란 | 효율 지표 | 편의 기준 | 근거 |", "탈락 후보 k", "기준 a 후보 n이라고 답해라", "평가 기준: 기준 a", "성공 기준"]) { assert.ok(s.includes(k), `SKILL ${k}`); assert.ok(blkC2.includes(k), `PROMPTS ${k}`); }
  const blk = (rd("playbook/PROMPTS.md").match(/^```\n\$algo\n[\s\S]*?^```/m) || [""])[0];
  // v2.10: PROMPTS는 줄글 — 담당자 기준·더 나은 결과·답 형식이 상자에 있다
  for (const k of ["담당자가 〔HH:MM〕에 준 기준", "더 나은 결과란", "기준 〔a〕 후보 〔n〕"]) assert.ok(rd("playbook/PROMPTS.md").includes(k), k); void blk;
  assert.match(rd("playbook/RUN.md").split(/^## (?=S\d )/m).find(x => x.startsWith("S2 ")), /`\$plan` 직전 `\$algo R★`/);
  assert.match(rd("AGENTS.md"), /\$algo/);
});

test("C4 $plan: 양식에 줄기·묶음 열과 소유 파일 분할 절(기존 칸 유지), SKILL은 요구 8행 이하 '—' · 같은 파일을 두 줄기에 넣지 않는다", () => {
  const t = rd("templates/dev/PLAN.md"), s = rd(".agents/skills/plan/SKILL.md");
  assert.match(t, /\| 만들 것\/안 만들 것 \| 줄기 \| 묶음 \|/); assert.match(t, /^## 소유 파일 분할/m);
  for (const k of ["## 데이터 처리 규칙", "## 합의 기록", "| 문제 |"]) assert.ok(t.includes(k), k);
  for (const k of ["8개 이하면 두 열 다 \"—\"", "줄기=확인만", "같은 파일을 두 줄기에 넣지 않는다"]) assert.ok(s.includes(k), k);
});

test("C3 $feat 묶음: '묶음:' 범위 줄이 있을 때만, 같은 모듈·최대 3행·묶음 불가 보고·퀴즈 묶음당 한 번·카드 행마다·커밋 형식·실패 행 되돌림 / 기본 흐름 불변", () => {
  const s = rd(".agents/skills/feat/SKILL.md");
  for (const k of ["묶음: R3 R4 R5", "없으면 이 절을 통째로 건너뛴다", "최대 3행", "묶음 불가: R5는 다른 모듈", "묶음당 한 번", "행마다 1장", "[S 4/6] R3-R5", "12분 상한", "R4 실패 — A2로"]) assert.ok(s.includes(k), k);
  assert.match(s, /상태 칸이 빈 \*\*첫 행 하나\*\*만 고른다/);
  assert.match(rd("refs/BOXES.md").split(/^## /m).find(b => b.startsWith("feat\n")), /묶음 불가/);
});

test("C5 $role-a2: 배포 목록, 공용 파일 읽기만, 'A에게 요청', [A2] 커밋 접두, 커밋 거부 문구, RUN S4 켜는 조건·복구 3단계, 창 3", () => {
  const s = rd(".agents/skills/role-a2/SKILL.md"), run = rd("playbook/RUN.md");
  assert.ok(SKILLS.includes("role-a2")); assert.match(rd("bootstrap.sh"), / role-a2 /);
  const d = tmp(); boot(parseArgs(["--target", d]), HARNESS); assert.ok(fs.existsSync(path.join(d, ".agents/skills/role-a2/SKILL.md")));
  for (const k of ["**읽기만**", "A에게 요청: server.js에 /api/x → src/x.js 연결", "out/ready_a2.txt", "[S 4/6][A2] R7", "충돌 — A 소유 파일 변경됨:", "git add -A` 금지"]) assert.ok(s.includes(k), k);
  // v2.10: 기본 운영은 창 셋 순차 — A2는 refs/PARALLEL4.md에서만 켠다
  assert.match(rd("refs/PARALLEL4.md"), /role-a2|A2/); void run;
});

test("C7 check_evidence: 만들 것인데 상태 빈 행 → WARN 'n행 — R4 R9'(안 만들 것은 세지 않음), 훅 8개 ○/× 한 줄, ×면 '서술형 재료 없음' WARN, 다 있으면 8/8 PASS", () => {
  const d = tmp();
  put(d, "README.md", "# 과제\n"); put(d, "LOG.md", "## 본표\n");
  put(d, "REQUIREMENTS.md", "| # | 종류 | 원문 | 만들 것/안 만들 것 | 파일 | 테스트 | 상태 |\n|---|---|---|---|---|---|---|\n| R4 | 요구 | a | 만들 것 |  |  |  |\n| R5 | 요구 | a | 만들 것 |  |  | 됨 |\n| R9 | 요구 | a | 만들 것 ★ |  |  |  |\n| R10 | 요구 | a | 안 만들 것 — README 제외 |  |  |  |\n");
  let R = check(d, "dev"); const by = k => R.find(r => r.item.startsWith(k));
  assert.deepStrictEqual([by("상태 없는 요구").verdict, by("상태 없는 요구").note], ["WARN", "상태 없는 요구 2행 — R4 R9"]);
  assert.strictEqual(by("훅 0/8").verdict, "WARN");
  assert.match(by("훅 0/8").note, /^scale_check × concurrency_check × docker_build × test_result × browser_check × prove × DECISIONS거부 × 퀴즈정답\(LOG '퀴즈 정답'\) ×$/);
  assert.match(by("서술형 재료").note, /^서술형 재료 없음 — scale_check, .*DECISIONS 거부, LOG 퀴즈 정답$/);
  for (const f of ["out/scale_check.txt", "out/concurrency_check.txt", "out/docker_build.txt", "out/test_result.txt", "out/browser_check.txt", "out/prove.md"]) put(d, f, "x\n");
  put(d, "DECISIONS.md", "## 거부한 것\n| 무엇을 | 왜 | 대신 |\n|---|---|---|\n| a | b | c |\n"); put(d, "LOG.md", "(퀴즈 정답 4/4)\n");
  R = check(d, "dev");
  assert.strictEqual(by("훅 8/8").verdict, "PASS"); assert.strictEqual(by("서술형 재료"), undefined);
  put(d, "out/prove.md", "  \n"); R = check(d, "dev"); assert.ok(by("훅 7/8"), "빈 파일은 ×");
});

test("C7 RUN·ASK: S0 유형 ①~⑤·속도 3줄·12분 상한·모델 이름 없음 / ASK 맨 위 규칙·DM 1·2, 한 메시지에 물음표 2개 이상 0", () => {
  const run = rd("playbook/RUN.md"), ask = rd("playbook/ASK.md");
  for (const k of ["① 장문", "② 짧은 README", "③ 수치+텍스트", "④ 기존 코드", "⑤ 요구 충돌형", "/fast", "xhigh 금지", "토글", "지시 시간 상한 12분", "15분에 DM 1·2 먼저", "163분이 유일한 고정선"]) assert.ok(run.includes(k), k);
  assert.ok(ask.indexOf("한 메시지에 질문 하나") < ask.indexOf("**DM 1") && ask.indexOf("**DM 2") < ask.indexOf("## 질문 운영"));
  assert.deepStrictEqual(ask.split("\n").filter(l => /\?.*\?/.test(l)), []);
  const fence = [...ask.matchAll(/^```\n([\s\S]*?)^```$/gm)].map(m => m[1]).filter(b => (b.match(/\?/g) || []).length > 1);
  assert.deepStrictEqual(fence, []);
});

test("C9 $defend 읽기 카드: SKILL·BOXES에 '## 0. 읽기 카드', 줄 머리 A~F 6줄, 세 덩어리 앞, [기록 없음] · DEFEND.md에는 없다", () => {
  const s = rd(".agents/skills/defend/SKILL.md");
  const heads = ["A 왜 그 방식", "B 늘면", "C AI", "D 구조", "E 배포", "F 확인"];
  const m = s.match(/`## 0\. 읽기 카드` 6줄[\s\S]*?```\n([\s\S]*?)\n\s*```/)[1].split("\n").map(l => l.trim());
  assert.strictEqual(m.length, 6); m.forEach((l, i) => assert.ok(l.startsWith(heads[i]), l));
  assert.ok(s.indexOf("## 0. 읽기 카드") < s.indexOf("읽기 카드 아래에 세 덩어리"));
  assert.ok(s.indexOf("읽기 카드 아래에 세 덩어리") < s.indexOf("맨 위 한 줄 **과제 계산 규칙**"));
  assert.match(rd("refs/BOXES.md"), /## 0\. 읽기 카드/);
  assert.doesNotMatch(rd("playbook/DEFEND.md"), /읽기 카드/);
});

test("C10 --with plan: PLAN '- 뼈대 부품:' 줄을 읽는다 — 목록·없음·빈 줄(오류), 템플릿에 그 줄이 있다", () => {
  const d = fs.mkdtempSync(path.join(os.tmpdir(), "v29p-")); boot(parseArgs(["--target", d]), HARNESS);
  const args = ["--target", d, "--scaffold", "node-v2", "--with", "plan"];
  assert.match(fs.readFileSync(path.join(d, "PLAN.md"), "utf8"), /^- 뼈대 부품: $/m);
  assert.throws(() => parseArgs(args), /뼈대 부품/);
  const put = v => fs.writeFileSync(path.join(d, "PLAN.md"), fs.readFileSync(path.join(d, "PLAN.md"), "utf8").replace(/^- 뼈대 부품:.*$/m, `- 뼈대 부품: ${v}`));
  put("auth, store,lock"); assert.deepStrictEqual(parseArgs(args).with, ["auth", "store", "lock"]);
  put("없음"); assert.deepStrictEqual(parseArgs(args).with, []);
  put("auth,store,모름"); assert.throws(() => parseArgs(args), /--with는/);
  assert.match(rd("playbook/RUN.md"), /`node \/tmp\/harness\/bootstrap\.mjs --scaffold node-v2 --with plan`/);
});
