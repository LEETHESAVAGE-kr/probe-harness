// auth.js — 서비스 안 로그인(SSO 없음), 역할 2개, 빈 저장소에서 시작하면 데모 계정 2개를 만든다.
// 쿠키는 HttpOnly·Path만 붙인다. Secure·SameSite·Domain을 붙이면 미리보기 프록시 도메인에서 세션이 안 붙는다.
// SPDX-License-Identifier: MIT
const crypto = require("node:crypto");

const ROLES = ["operator", "member"];
const demoAccounts = () => [
  { id: "operator", role: "operator", password: process.env.DEMO_OPERATOR_PASSWORD || "operator-demo" },
  { id: "member", role: "member", password: process.env.DEMO_MEMBER_PASSWORD || "member-demo" },
];

function hash(pw, salt = crypto.randomBytes(16).toString("hex")) { return `${salt}:${crypto.scryptSync(String(pw), salt, 32).toString("hex")}`; }
function matches(pw, stored) {
  const [salt, h] = String(stored).split(":"), a = Buffer.from(h || "", "hex"), b = crypto.scryptSync(String(pw ?? ""), salt || "", 32);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

/** 입력: store / 출력: 새로 만든 계정 수(이미 계정이 있으면 0) / 깨지는 조건: store 쓰기 실패면 Error */
function seed(store) {
  const users = store.get("users");
  if (users && Object.keys(users).length) return 0;
  const u = {};
  for (const d of demoAccounts()) u[d.id] = { role: d.role, pw: hash(d.password) };
  store.set("users", u);
  return Object.keys(u).length;
}

/** 입력: store·아이디·비밀번호 / 출력: 세션 ID 또는 null(틀리면) — 세션은 store에 저장돼 재시작 뒤에도 유지 / 깨지는 조건: 세션이 많아지면 매번 전체를 다시 쓴다(수천 개부터 느려짐) */
function login(store, id, password) {
  const u = (store.get("users") || {})[id];
  if (!u || !matches(password, u.pw)) return null;
  const sid = crypto.randomBytes(24).toString("hex"), sessions = store.get("sessions") || {};
  sessions[sid] = { id, role: u.role, at: Date.now() };
  store.set("sessions", sessions);
  return sid;
}

// [D6] 인증 단계: 쿠키에서 누구인지 본다 — 없으면 라우터가 401, 역할이 다르면 403
/** 입력: store·요청의 Cookie 헤더 / 출력: {sid, id, role} 또는 null / 깨지는 조건: 없음(형식이 틀린 쿠키는 null) */
function who(store, cookieHeader) {
  const sid = /(?:^|;\s*)sid=([a-f0-9]{48})(?:;|$)/.exec(cookieHeader || "")?.[1];
  const s = sid && (store.get("sessions") || {})[sid];
  return s ? { sid, id: s.id, role: s.role } : null;
}

/** 입력: store·세션 ID / 출력: 지웠으면 true / 깨지는 조건: 없음 */
function logout(store, sid) {
  const sessions = store.get("sessions") || {};
  if (!sessions[sid]) return false;
  delete sessions[sid]; store.set("sessions", sessions); return true;
}

const setCookie = sid => `sid=${sid}; HttpOnly; Path=/`;
const clearCookie = () => "sid=; HttpOnly; Path=/; Max-Age=0";

module.exports = { ROLES, demoAccounts, seed, login, who, logout, setCookie, clearCookie };
