// v24.test.mjs — v2.4 D-69: 양식 펜스는 바로 위에서 가장 가까이 언급된 파일의 것만 된다(다른 파일 언급 아래 펜스를 가져가지 않는다)
// 실행: (하네스 폴더에서) node --test tests_harness/*.test.mjs
// SPDX-License-Identifier: MIT
import test from "node:test";
import assert from "node:assert";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { run as r2r, MARK } from "../scripts/readme_to_requirements.mjs";

const HARNESS = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const tmp = () => fs.mkdtempSync(path.join(os.tmpdir(), "v24-"));
const rd = (d, f) => fs.readFileSync(path.join(d, f), "utf8");
const AI = "```markdown\n# AI_COLLABORATION\n## Q1. 가장 까다로운 경우는?\n(답변)\n## Q2. 무엇을 검증하나?\n(답변)\n```";
const HOW = "```markdown\n# HOW_TO_RUN\n## 1. 목적과 범위\n(무엇을 만들었는지)\n```";
const make = body => { const d = tmp(); fs.writeFileSync(path.join(d, "README.md"), body); r2r(d); return d; };

test("D-69 배치 A: 요구 8 HOW_TO_RUN 줄 → 산출물 표 → HOW_TO_RUN 양식 절 → AI_COLLABORATION 양식 절. 껍데기마다 제 양식", () => {
  const d = make(["# 과제", "", "**요구사항**", "1. **계산** — 결과를 만듭니다.", "8. **`HOW_TO_RUN.md`** — 실행 방법을 적어 주세요.", "",
    "## 산출물", "| 산출물 | 구분 |", "|---|---|", "| `HOW_TO_RUN.md` | 필수 |", "| `AI_COLLABORATION.md` | 필수 |", "",
    "## HOW_TO_RUN.md 작성 양식", "제공된 `README.md`는 바꾸지 마세요. 작업공간 루트에 `HOW_TO_RUN.md` 파일을 만들고 아래 양식을 옮겨 주세요.", HOW, "",
    "## AI_COLLABORATION.md 작성 양식", "작업공간 루트에 `AI_COLLABORATION.md` 파일이 있습니다. 질문 아래에 답을 적어 주세요.", AI, ""].join("\n"));
  assert.match(rd(d, "HOW_TO_RUN.md"), /^# HOW_TO_RUN\n## 1\. 목적과 범위/);
  assert.doesNotMatch(rd(d, "HOW_TO_RUN.md"), /Q1/);
  assert.match(rd(d, "AI_COLLABORATION.md"), /## Q1\./);
});

test("D-69 재현: 제출물 불릿에서 HOW_TO_RUN을 언급한 바로 다음 줄이 AI_COLLABORATION 불릿 + 양식이면 HOW_TO_RUN은 양식을 가져가지 않는다", () => {
  const d = make(["# 과제", "", "1. **실행 문서** — `HOW_TO_RUN.md`에 실행 방법을 적습니다.", "", "## 제출물",
    "- 위 요구사항의 코드와 테스트", "- 제공 데이터로 만든 결과 JSON(위치는 `HOW_TO_RUN.md`에 적습니다)", "- `AI_COLLABORATION.md` — 아래 양식을 그대로 복사해 답변을 채웁니다.", AI, ""].join("\n"));
  const how = rd(d, "HOW_TO_RUN.md");
  assert.doesNotMatch(how, /Q1|AI_COLLABORATION/, how);
  assert.ok(how.includes(MARK), "양식이 없으면 기본 껍데기");
  assert.match(rd(d, "AI_COLLABORATION.md"), /## Q1\./);
});

test("D-69 같은 줄에 파일 둘: 펜스는 줄에서 나중에 나온 파일의 것", () => {
  const d = make(["# 과제", "", "- `HOW_TO_RUN.md`와 `AI_COLLABORATION.md`를 만듭니다. 아래는 AI_COLLABORATION 양식입니다.", AI, ""].join("\n"));
  assert.doesNotMatch(rd(d, "HOW_TO_RUN.md"), /Q1/);
  assert.match(rd(d, "AI_COLLABORATION.md"), /## Q1\./);
});
