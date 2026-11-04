#!/usr/bin/env node
// handoff.mjs — B·C·D 탭이 남긴 "커밋 준비됨" 목록(out/ready_*.txt)을 모아 A가 한 번에 git add 할 명령을 낸다. 같은 파일이 두 목록에 있으면 충돌 경고.
// 사용: (A 탭, 작업 폴더에서) node /tmp/harness/scripts/handoff.mjs   종료 코드: 충돌 있으면 1
// SPDX-License-Identifier: MIT
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { isMain } from "./lib.mjs";

/** 입력: 작업 폴더 / 출력: {lists: {역할: [경로]}, conflicts: [{file, roles}], missing: [경로], unclaimed: [경로], add: "git add -- …"} / 깨지는 조건: git이 없으면 unclaimed는 빈 배열 */
export function collect(dir = process.cwd()) {
  const out = path.join(dir, "out"), lists = {};
  for (const f of fs.existsSync(out) ? fs.readdirSync(out).sort() : []) {
    const m = /^ready_(\w+)\.txt$/.exec(f);
    if (!m) continue;
    lists[m[1]] = [...new Set(fs.readFileSync(path.join(out, f), "utf8").split(/\r?\n/)
      .map(l => l.replace(/^[-*]\s+/, "").trim()).filter(l => l && !l.startsWith("#")).map(l => l.replace(/^\.\//, "").replace(/\\/g, "/")))];
  }
  const owner = new Map();
  for (const [role, files] of Object.entries(lists)) for (const f of files) owner.set(f, [...(owner.get(f) || []), role]);
  const conflicts = [...owner].filter(([, r]) => r.length > 1).map(([file, roles]) => ({ file, roles }));
  const all = [...owner.keys()];
  let changed = null;
  try { changed = execFileSync("git", ["status", "--porcelain", "-uall"], { cwd: dir, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).split("\n").filter(Boolean).map(l => l.slice(3).replace(/^"|"$/g, "")); } catch { /* git 없음 */ }
  const missing = all.filter(f => !fs.existsSync(path.join(dir, f)) && !(changed || []).includes(f));
  const unclaimed = (changed || []).filter(f => !owner.has(f) && !/^out\/ready_\w+\.txt$/.test(f));
  const ok = all.filter(f => !missing.includes(f));
  return { lists, conflicts, missing, unclaimed, add: ok.length ? `git add -- ${ok.map(f => (/\s/.test(f) ? `"${f}"` : f)).join(" ")}` : "" };
}

if (isMain(import.meta.url)) {
  const r = collect();
  const roles = Object.keys(r.lists);
  if (!roles.length) { console.log("out/ready_*.txt 없음 — B·C·D가 아직 '커밋 준비됨'을 남기지 않았다"); process.exit(0); }
  for (const k of roles) console.log(`${k}: ${r.lists[k].length}개 — ${r.lists[k].join(", ") || "-"}`);
  for (const c of r.conflicts) console.log(`충돌: ${c.file} ← ${c.roles.join("·")} 둘 다 바꿨다 — 한 탭에서 되돌리게 하고 다시 돌린다`);
  for (const f of r.missing) console.log(`경고: 목록에 있는데 파일이 없다 — ${f}`);
  if (r.unclaimed.length) console.log(`목록 밖 변경 ${r.unclaimed.length}개(A 것인지 확인): ${r.unclaimed.join(", ")}`);
  if (r.conflicts.length) { console.log("판정: 충돌 — git add 하지 마라"); process.exit(1); }
  console.log(r.add ? `다음 명령(A 탭): ${r.add}` : "더할 파일 없음");
}
