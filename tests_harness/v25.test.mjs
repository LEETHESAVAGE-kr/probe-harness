// v25.test.mjs — v2.5 껍데기 교체: readme_to_requirements가 만든 빈 껍데기는 --scaffold 때 뼈대 파일로 바뀐다(사람이 쓴 파일·README 양식 껍데기·과제 README·데이터는 그대로)
// 재현 순서 = 시험장 S1→S3: fixture 복사 → bootstrap → readme_to_requirements → bootstrap --scaffold node-v2 --with auth,schema,docker
// 실행: (하네스 폴더에서) node --test tests_harness/*.test.mjs
// SPDX-License-Identifier: MIT
import test from "node:test";
import assert from "node:assert";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";

const HARNESS = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const FIX = path.join(HARNESS, "tests_harness/fixtures/class_signup");
const SC = path.join(HARNESS, "scaffold/node-v2");
const tmp = () => fs.mkdtempSync(path.join(os.tmpdir(), "v25-"));
const rd = (d, f) => fs.readFileSync(path.join(d, f), "utf8");
const node = (h, cwd, ...a) => execFileSync(process.execPath, [path.join(h, ...a.slice(0, 1)), ...a.slice(1)], { cwd, encoding: "utf8" });

/** 입력: 하네스 폴더·(선택) 첫 bootstrap 뒤 손댈 함수 / 출력: {d, out} — S1→S3 순서를 CLI로 그대로 돌린다 */
function s1ToS3(h = HARNESS, touch) {
  const d = tmp(); fs.cpSync(FIX, d, { recursive: true });
  const readme = rd(d, "README.md"), data = rd(d, "data/classes.csv");
  node(h, d, "bootstrap.mjs");
  node(h, d, "scripts/readme_to_requirements.mjs");
  if (touch) touch(d);
  const out = node(h, d, "bootstrap.mjs", "--scaffold", "node-v2", "--with", "auth,schema,docker");
  assert.strictEqual(rd(d, "README.md"), readme, "과제 README는 어떤 경우에도 그대로");
  assert.strictEqual(rd(d, "data/classes.csv"), data, "제공 데이터는 어떤 경우에도 그대로");
  return { d, out };
}

test("v2.5 정상: 껍데기 3개(Dockerfile·.env.example·HOW_TO_RUN.md)가 뼈대 파일로 바뀌고 출력에 '껍데기 교체 3개'", () => {
  const { d, out } = s1ToS3();
  assert.match(out, /^껍데기 교체 3개: /m, out);
  for (const f of ["Dockerfile", ".env.example", "HOW_TO_RUN.md"]) assert.match(out.split("\n").find(l => l.startsWith("껍데기 교체")), new RegExp(f.replace(".", "\\.")));
  assert.match(rd(d, "Dockerfile").split("\n")[0], /^FROM /);
  assert.strictEqual(rd(d, ".env.example"), rd(SC, ".env.example"));
  assert.strictEqual(rd(d, "HOW_TO_RUN.md"), rd(SC, "HOW_TO_RUN.md"));
  // README 양식이 복사된 껍데기(MARK 없음)는 그대로 — 뼈대에 같은 이름도 없다
  assert.match(rd(d, "AI_COLLABORATION.md"), /\(답변\)/);
  // LOG 차용 표의 뼈대 행에 바뀐 파일도 들어간다
  assert.match(rd(d, "LOG.md"), /\| 서버 뼈대\(scaffold\/node-v2[^\n]*Dockerfile/);
});

test("v2.5 경계: 사람이 한 줄이라도 쓴 껍데기는 그대로 두고 '기존 유지', 교체 줄에도 없다 — 다시 돌려도 교체 0", () => {
  const { d, out } = s1ToS3(HARNESS, d => fs.appendFileSync(path.join(d, "Dockerfile"), "FROM python:3.12-slim\n"));
  assert.match(rd(d, "Dockerfile"), /아직 비어 있음[\s\S]*FROM python:3\.12-slim\n$/);
  assert.match(out, /^껍데기 교체 2개: /m);
  assert.doesNotMatch(out.split("\n").find(l => l.startsWith("껍데기 교체")), /Dockerfile/);
  assert.match(out, /^ {2}= Dockerfile$/m);
  const again = node(HARNESS, d, "bootstrap.mjs", "--scaffold", "node-v2", "--with", "auth,schema,docker");
  assert.doesNotMatch(again, /^껍데기 교체 [1-9]/m, "뼈대 HOW_TO_RUN 양식은 껍데기가 아니다(다시 바꾸지 않는다)");
});

test("v2.5 결함 재삽입: 교체 판정을 끈 bootstrap으로는 Dockerfile이 껍데기로 남아 이 시험의 단정이 실패한다", () => {
  const h = tmp();
  for (const f of ["bootstrap.mjs", "AGENTS.md", "scaffold", "templates", "playbook", "scripts", ".agents"]) fs.cpSync(path.join(HARNESS, f), path.join(h, f), { recursive: true });
  const src = rd(h, "bootstrap.mjs"), off = src.replace("const swap = isShell(", "const swap = false && isShell(");
  assert.notStrictEqual(off, src, "교체 판정 줄(const swap = isShell(…))을 찾지 못했다");
  fs.writeFileSync(path.join(h, "bootstrap.mjs"), off);
  const { d, out } = s1ToS3(h);
  assert.doesNotMatch(out, /^껍데기 교체 [1-9]/m);
  assert.throws(() => assert.match(rd(d, "Dockerfile").split("\n")[0], /^FROM /), "결함을 넣으면 정상 시험의 FROM 단정이 깨져야 한다");
  assert.match(rd(d, "Dockerfile"), /아직 비어 있음/);
});
