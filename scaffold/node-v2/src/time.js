// time.js — 업무 시각은 업무 시간대(APP_TZ, 기본 Asia/Seoul)로만 읽고 쓴다. 서버·컨테이너의 시스템 시간대(TZ, 흔히 UTC)와 무관하다.
// 시각 문자열 형식은 "YYYY-MM-DD HH:mm" 하나로 고정.
// SPDX-License-Identifier: MIT
const zone = () => process.env.APP_TZ || "Asia/Seoul";

// [D4] 업무 시간대 고정: 시스템 TZ와 무관하게 APP_TZ(기본 Asia/Seoul)로 쓴다
/** 입력: Date(기본 지금)·시간대 / 출력: "YYYY-MM-DD HH:mm"(그 시간대 기준) / 깨지는 조건: 없는 시간대 이름이면 RangeError */
function fmt(d = new Date(), tz = zone()) {
  const p = Object.fromEntries(new Intl.DateTimeFormat("en-CA", { timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23" })
    .formatToParts(d).map(x => [x.type, x.value]));
  return `${p.year}-${p.month}-${p.day} ${p.hour}:${p.minute}`;
}

// [D4] 업무 시간대 고정: 벽시계 시각을 APP_TZ(기본 Asia/Seoul) 기준으로 읽는다
/** 입력: "YYYY-MM-DD HH:mm"(업무 시간대 기준 벽시계 시각)·시간대 / 출력: Date(절대 시각) / 깨지는 조건: 형식이 다르면 Error. 서머타임이 있는 시간대의 겹치는 한 시간은 앞쪽으로 */
function parseLocal(s, tz = zone()) {
  const m = /^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})$/.exec(String(s).trim());
  if (!m) throw new Error(`시각 형식은 YYYY-MM-DD HH:mm 이다: ${s}`);
  const wall = Date.UTC(+m[1], +m[2] - 1, +m[3], +m[4], +m[5]);
  const asWall = d => { const [a, b] = fmt(d, tz).split(" "); return Date.parse(`${a}T${b}:00Z`); };
  let t = wall - (asWall(new Date(wall)) - wall);
  t -= asWall(new Date(t)) - wall; // 오프셋이 바뀌는 경계에서 한 번 더 맞춘다
  return new Date(t);
}

/** 입력: Date·시간대 / 출력: 그 시간대의 자정부터 분(0~1439) / 깨지는 조건: 없음 */
const minuteOfDay = (d = new Date(), tz = zone()) => { const [h, mi] = fmt(d, tz).slice(11).split(":"); return +h * 60 + +mi; };

module.exports = { fmt, parseLocal, minuteOfDay, zone };
