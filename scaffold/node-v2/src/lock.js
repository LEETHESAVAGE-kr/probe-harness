// lock.js — 쓰기 작업(재계산·데이터 적용)을 한 번에 하나로. 진행 중에 같은 이름이 또 오면 기다리지 않고 409.
// 읽기는 잠그지 않는다 — 읽기는 마지막으로 확정된 결과(store에 저장된 것)만 본다.
// SPDX-License-Identifier: MIT
const busy = new Set();

// [D2] 쓰기 직렬화: 같은 쓰기 요청이 겹치면 두 번째는 기다리지 않고 409
/** 입력: 잠금 이름·async 작업 / 출력: {status: 200, value} 또는 진행 중이면 {status: 409, error} — 작업이 throw하면 잠금을 풀고 그대로 throw / 깨지는 조건: 프로세스 하나 안에서만 직렬화(서버를 여러 개 띄우면 DB 잠금이 따로 필요) */
async function exclusive(name, work) {
  if (busy.has(name)) return { status: 409, error: `${name} 작업이 진행 중이다. 끝난 뒤 다시 요청한다.` };
  busy.add(name);
  try { return { status: 200, value: await work() }; }
  finally { busy.delete(name); }
}

/** 입력: 잠금 이름 / 출력: 진행 중이면 true / 깨지는 조건: 없음 */
const isBusy = name => busy.has(name);

module.exports = { exclusive, isBusy };
