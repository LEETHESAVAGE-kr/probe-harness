#!/usr/bin/env node
// summary10.mjs — 제출 직전 10줄 요약 뼈대. 파일에서 읽을 수 있는 값은 채우고, 나머지는 "(직접)"으로 남긴다.
// 사용: (작업 폴더에서) node /tmp/harness/scripts/summary10.mjs
// SPDX-License-Identifier: MIT
import fs from "node:fs";
import path from "node:path";
import { testCounts, filledRows } from "./check_evidence.mjs";
import { isMain } from "./lib.mjs";

const read = (d, f) => { try { return fs.readFileSync(path.join(d, f), "utf8"); } catch { return ""; } };
const cell = (md, label) => { const m = md.match(new RegExp(`\\|\\s*${label}[^|]*\\|([^|]*)\\|`)); return m && m[1].trim() ? m[1].trim() : ""; };

/** 입력: 작업 폴더 / 출력: 10줄 문자열 배열 / 깨지는 조건: 파일이 없으면 그 줄은 "(직접)" */
export function summary(dir = process.cwd()) {
  const plan = read(dir, "PLAN.md"), log = read(dir, "LOG.md"), run = read(dir, "README_RUN.md");
  const tc = testCounts(read(dir, "out/test_result.txt"));
  const cl = read(dir, "out/changes_log.md").split(/\r?\n/).filter(l => /^\|/.test(l)).slice(2);
  const borrow = filledRows(log, "외부 코드·자료 차용");
  const fixed = filledRows(log, "AI 위임 vs 직접 검증");
  const status = ((log.match(/^- \/status:[ \t]*(.+)$/m) || [])[1] || "").trim();
  const start = (run.match(/시작[^`\n]*`([^`]+)`/) || [])[1] || (run.match(/`([^`]*(?:node|python3?) [^`]*)`/) || [])[1] || "";
  const cut = (v, n = 120) => v.length > n ? v.slice(0, n) + "…" : v;
  const D = "(직접)";
  return [
    `① 기능 목록: ${cut(cell(plan, "만들 것")) || D}`,
    `② 테스트: ${tc ? `통과 ${tc.pass} · 실패 ${tc.fail} (out/test_result.txt)` : D}`,
    `③ 테스트가 못 보는 것: ${D}`,
    `④ AI에 맡긴 것: ${fixed > 0 ? `LOG 고정 절 ${fixed}행 참고` : D}`,
    `⑤ 내가 직접 확인한 것(n건): ${fixed > 0 ? `LOG 고정 절 ${fixed}행 참고` : D}`,
    `⑥ 모델·설정: ${status || D + " — LOG '도구 설정'의 /status"}`,
    `⑦ 외부 차용: ${borrow > 0 ? `LOG 차용 표 ${borrow}행` : "없음 또는 " + D}${/harness \S+/.test(log) ? " · " + log.match(/harness \S+ \S+/)[0] : ""}`,
    `⑧ 남은 한계: ${cut(cell(plan, "한계"), 200) || D}`,
    `⑨ changes_log 전후: ${cl.length ? cl.map(l => { const c = l.split("|").map(s => s.trim()); return `${c[1]} ${cut(c[2], 40)} ${c[3]}→${c[4]}${c[5] && c[5] !== "-" ? ` (합계 ${c[5]}→${c[6]})` : ""}`; }).join(" / ") : "행 없음"}`,
    `⑩ 서버 시작·포트: ${start || D}`,
  ];
}

if (isMain(import.meta.url)) console.log(summary().join("\n"));
