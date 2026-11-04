// v27.test.mjs — v2.7 "다루지 않는 범위" 한 줄 목록: `**다루지 않는 범위**: a, b, c.`(장문 README 배치(가상 도메인))도 항목마다 X 행. 불릿 형식은 그대로
// 실행: (하네스 폴더에서) node --test tests_harness/*.test.mjs
// SPDX-License-Identifier: MIT
import test from "node:test";
import assert from "node:assert";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";
import { extract } from "../scripts/readme_to_requirements.mjs";

const HARNESS = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const tmp = () => fs.mkdtempSync(path.join(os.tmpdir(), "v27-"));

// 장문 README 배치(가상 도메인): 배경 → 과제(굵은 '운영 규칙' + 불릿) → 번호 요구 → 같은 줄 굵은 제목 + 쉼표 목록
const BUS_STYLE = [
  "# 공용 장비 대여 서비스", "", "## 배경", "연구실은 장비 대여를 종이 장부로 받습니다.", "",
  "## 과제", "**운영 규칙**", "- 한 사람은 장비를 2대까지 빌립니다.", "- 반납은 대여 시작 7일 안입니다.", "- 대여 기록은 장부의 값을 그대로 씁니다.", "",
  "1. **대여 신청** — 사용자는 장비를 신청합니다.", "2. **반납 처리** — 운영자는 반납을 확인합니다.", "3. **내보내기** — 결과를 JSON으로 내보냅니다.", "",
  "**다루지 않는 범위**: 실제 결제 연동, SSO·LDAP 등 사내 인증 연동, 지도 API 연계, 모바일 대응, 반납 연장/대리 신청, 운영 비용 산정.", "",
  "## 산출물", "- `HOW_TO_RUN.md`에 실행 방법을 적습니다.", "",
].join("\n");
// 쉼표가 있으면 쉼표가 항목 경계 — 항목 안의 가운뎃점·슬래시("반납 연장/대리 신청")와 '등'이 든 항목은 쪼개지 않는다
const WANT_X = ["실제 결제 연동", "SSO·LDAP 등 사내 인증 연동", "지도 API 연계", "모바일 대응", "반납 연장/대리 신청", "운영 비용 산정"];
const readme = s => { const d = tmp(); fs.writeFileSync(path.join(d, "README.md"), s); return d; };
const counts = ex => [ex.reqs.length, ex.rules.length, ex.files.length, ex.asks.length, ex.outScope.length];

test("v2.7 한 줄 목록: 장문 README 배치(가상 도메인)의 '**다루지 않는 범위**: …' 한 줄이 제외 6 — 쉼표가 경계, 항목 안 가운뎃점·슬래시와 '등' 항목은 그대로", () => {
  const ex = extract(readme(BUS_STYLE));
  assert.deepStrictEqual(ex.outScope.map(o => o.text), WANT_X);
  assert.ok(ex.outScope.every(o => o.src === "README.md:16"), JSON.stringify(ex.outScope.map(o => o.src)));
});

test("v2.7 한 줄 목록: 요구·규칙·산출물·지목 수는 그 줄이 있든 없든 같다(그 줄은 규칙·요구가 되지 않는다)", () => {
  const withList = extract(readme(BUS_STYLE)), without = extract(readme(BUS_STYLE.replace(/^\*\*다루지 않는 범위\*\*:.*$/m, "")));
  assert.deepStrictEqual(counts(withList).slice(0, 4), counts(without).slice(0, 4));
  assert.deepStrictEqual(counts(withList), [3, 3, 1, 0, 6]);
  assert.strictEqual(without.outScope.length, 0);
});

test("v2.7 다른 모양: 제목 줄 '## 다루지 않는 범위: a, b' · 쉼표 없는 '- 다음은 다루지 않습니다: a / b'·'범위 밖: a·b'는 슬래시·가운뎃점으로 나눔 · '제외 범위:'도 목록, 콜론 없는 문장은 목록 아님", () => {
  const ex = extract(readme("# x\n1. 표를 만든다.\n\n## 다루지 않는 범위: 결제, 알림\n\n## 과제\n- 다음은 다루지 않습니다: 지도 / 메신저\n제외 범위: 백업\n범위 밖: 통계·감사 로그\n결제는 다루지 않습니다.\n"));
  assert.deepStrictEqual(ex.outScope.map(o => o.text), ["결제", "알림", "지도", "메신저", "백업", "통계", "감사 로그"]);
  assert.strictEqual(ex.rules.length, 0, "'다루지 않습니다:' 불릿이 규칙 행으로 새면 안 된다");
});

test("v2.7 불릿 형식 그대로: class_signup '## 다루지 않는 범위' 아래 불릿 3개 = 제외 3, 요구 8·규칙 7·산출물 5·지목 1", () => {
  const d = tmp(); fs.cpSync(path.join(HARNESS, "tests_harness/fixtures/class_signup"), d, { recursive: true });
  assert.deepStrictEqual(counts(extract(d)), [8, 7, 5, 1, 3]);
});

test("v2.7 결함 재삽입: 한 줄 목록 판정을 끈 스크립트로는 제외가 0으로 돌아가 위 단정이 깨진다", () => {
  const h = tmp();
  for (const f of ["scripts", "templates"]) fs.cpSync(path.join(HARNESS, f), path.join(h, f), { recursive: true });
  const p = path.join(h, "scripts/readme_to_requirements.mjs"), src = fs.readFileSync(p, "utf8");
  const off = src.replace("const inline = scopeList(", "const inline = [] || scopeList(");
  assert.notStrictEqual(off, src, "한 줄 목록 판정 줄(const inline = scopeList(…))을 찾지 못했다");
  fs.writeFileSync(p, off);
  const run = file => execFileSync(process.execPath, [file], { cwd: readme(BUS_STYLE), encoding: "utf8" }).match(/제외 (\d+)/)[1];
  assert.strictEqual(run(p), "0");
  assert.strictEqual(run(path.join(HARNESS, "scripts/readme_to_requirements.mjs")), "6");
});
