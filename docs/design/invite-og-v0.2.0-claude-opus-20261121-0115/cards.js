// 해낼게 초대 미리보기 v0.2.0 · C안(응원 티켓) 변형 3종. 1200x630.
// Satori(next/og) 이식 규칙: 모든 상자 display:flex + box-sizing:border-box, grid·의사요소·float 없음,
// 위치는 flex 와 position:absolute 만, 절취선은 점(div) 줄, 펀치 구멍은 바탕색 원(div).
// 숫자는 전부 실제 값: 응원 수 = goal_public.cheer_count, 번호 = cheer_count + 1(받는 사람이 응원하면 받게 될 실제 순번).
(function (root) {
  const T = { paper: "#fbfaf7", cream: "#fffaf0", ink: "#16140f", muted: "#6f6a60", line: "#e8e4dc", warm: "#f4efe6",
    clover: "#1b8a4f", cloverBright: "#1f9e5a", cloverSoft: "#e7f4ec", cloverField: "#eef6f0", cloverInk: "#14613a",
    cloverDeep: "#0f5a33", white: "#ffffff" };
  const TODAY = "2026-11-21";
  const DATA = {
    normal: { key: "normal", label: "정상", name: "지민", avatar: "assets/jimin.png", title: "토익 900점 넘기기",
      cover: "assets/cover-study.jpg", dday: 23, cheers: 12 },
    empty: { key: "empty", label: "적음 (사진·기한·응원 없음)", name: "도경", avatar: null, title: "매일 아침 30분 달리기",
      cover: "assets/cover-run.jpg", dday: null, cheers: 0 },
    overflow: { key: "overflow", label: "과다 (긴 이름·긴 목표·큰 수)", name: "바다를닮은서연이에요", avatar: null,
      title: "퇴근하고 매일 30분씩 영어 원서 읽어서 올해 안에 다섯 권을 끝까지 다 읽어내기",
      cover: "assets/cover-writing.jpg", dday: 142, cheers: 1284 },
  };
  // ── 서버 글자 맞춤 (route 로 그대로 옮긴다) ──
  function units(s) { let u = 0; for (const ch of s) u += ch === " " ? 0.3 : /[0-9a-zA-Z.,]/.test(ch) ? 0.6 : 0.98; return u; }
  function fitTitle(title, boxWidth, steps, maxLines) {
    for (const size of steps) if (units(title) <= (boxWidth / size) * maxLines * 0.9) return { size, text: title };
    const size = steps[steps.length - 1], budget = (boxWidth / size) * maxLines * 0.86 - 1;
    let out = "", u = 0; for (const ch of title) { const w = units(ch); if (u + w > budget) break; out += ch; u += w; }
    return { size, text: out.trimEnd() + "…" };
  }
  function clipName(n, max) { const a = [...n]; return a.length > max ? a.slice(0, max - 1).join("") + "…" : n; }
  const fmt = (n) => n.toLocaleString("ko-KR");
  function ddayText(d) { return d == null ? null : d === 0 ? "D-DAY" : `D-${d}`; }
  function dueDate(d) { if (d == null) return null; const t = new Date(TODAY + "T00:00:00+09:00"); t.setDate(t.getDate() + d);
    return `${t.getFullYear()}.${String(t.getMonth() + 1).padStart(2, "0")}.${String(t.getDate()).padStart(2, "0")}`; }
  const F = "font-family:Pretendard,sans-serif;", fx = "display:flex;box-sizing:border-box;";
  const clamp = (n) => `box-sizing:border-box;word-break:keep-all;display:-webkit-box;-webkit-line-clamp:${n};-webkit-box-orient:vertical;overflow:hidden;`;
  function avatar(d, size, ring) {
    const r = `width:${size}px;height:${size}px;border-radius:${size / 2}px;flex-shrink:0;${ring ? `border:${ring};` : ""}`;
    if (d.avatar) return `<img data-t src="${d.avatar}" style="${r}object-fit:cover;box-sizing:border-box;" />`;
    return `<div data-t style="${fx}${r}align-items:center;justify-content:center;background:${T.cloverSoft};color:${T.cloverInk};font-size:${Math.round(size * 0.44)}px;font-weight:800;">${[...d.name][0]}</div>`;
  }
  const wordmark = (size, color, dot) => `<div data-t style="${fx}align-items:baseline;font-size:${size}px;font-weight:900;letter-spacing:-0.04em;color:${color};">해낼게<span style="color:${dot};">.</span></div>`;
  // 클로버(쿼트러포일) 마크: 원 4개 + 가운데 원. 브랜드 결정 '쿼트러포일 클로버 마크'를 도형으로 그린다.
  function clover(size, color, opacity) {
    const c = size * 0.5, o = size * 0.25;
    const leaf = (l, t) => `<div style="${fx}position:absolute;left:${l}px;top:${t}px;width:${c}px;height:${c}px;border-radius:${c / 2}px;background:${color};"></div>`;
    return `<div style="${fx}position:relative;width:${size}px;height:${size}px;flex-shrink:0;opacity:${opacity ?? 1};">${leaf(o, 0)}${leaf(o, size - c)}${leaf(0, o)}${leaf(size - c, o)}</div>`;
  }
  // 절취선: 점 줄(세로)
  function perfV(x, top, h, color) {
    let dots = ""; for (let y = 0; y < h; y += 22) dots += `<div style="${fx}width:8px;height:8px;border-radius:4px;background:${color};margin-bottom:14px;"></div>`;
    return `<div style="${fx}flex-direction:column;position:absolute;left:${x - 4}px;top:${top}px;height:${h}px;overflow:hidden;">${dots}</div>`;
  }
  const hole = (x, y, r, color) => `<div style="${fx}position:absolute;left:${x - r}px;top:${y - r}px;width:${2 * r}px;height:${2 * r}px;border-radius:${r}px;background:${color};"></div>`;

  // ── C1 입장권: 초록 바탕 위 크림색 입장권. 왼쪽 떼는 칸에 친구 얼굴, 세로 일련번호 ──
  function c1(d) {
    const dd = ddayText(d.dday), seat = fmt(d.cheers + 1);
    const t = fitTitle(d.title, 600, [76, 66, 56], 2);
    const L = 60, Tp = 70, W = 1080, H = 490, S = 330;
    return `<div class="og" style="${F}${fx}position:relative;width:1200px;height:630px;overflow:hidden;background:${T.clover};">
  <div style="${fx}position:absolute;left:${L}px;top:${Tp}px;width:${W}px;height:${H}px;background:${T.cream};border-radius:26px;box-shadow:0 22px 50px rgba(9,50,28,0.35);"></div>
  ${hole(L + S, Tp, 26, T.clover)}${hole(L + S, Tp + H, 26, T.clover)}
  ${perfV(L + S, Tp + 40, H - 80, "#d9cfbd")}
  <div style="${fx}flex-direction:column;position:absolute;left:${L}px;top:${Tp}px;width:${S}px;height:${H}px;align-items:center;justify-content:center;">
    ${avatar(d, 156, `7px solid ${T.white}`)}
    <div data-t style="${fx}margin-top:18px;font-size:40px;font-weight:800;color:${T.ink};white-space:nowrap;">${clipName(d.name, 6)}님의</div>
    <div data-t style="${fx}margin-top:2px;font-size:32px;font-weight:700;color:${T.cloverInk};">초대 티켓</div>
  </div>
  <div style="${fx}flex-direction:column;position:absolute;left:${L + S + 52}px;top:${Tp + 46}px;width:${W - S - 52 - 150}px;height:${H - 92}px;">
    <div style="${fx}align-items:center;">
      <div data-t style="${fx}font-size:28px;font-weight:800;letter-spacing:0.12em;color:${T.clover};">ADMIT ONE · 응원 입장권</div>
    </div>
    <div data-t style="margin-top:16px;font-size:${t.size}px;font-weight:900;line-height:1.14;letter-spacing:-0.035em;color:${T.ink};${clamp(2)}">${t.text}</div>
    <div style="${fx}flex:1;"></div>
    <div style="${fx}align-items:flex-end;">
      ${dd ? `<div style="${fx}flex-direction:column;margin-right:44px;"><div data-t style="${fx}font-size:26px;font-weight:700;color:${T.muted};">마감</div><div data-t style="${fx}font-size:52px;font-weight:900;color:${T.ink};letter-spacing:-0.02em;">${dd}</div></div>` : ""}
      <div style="${fx}flex-direction:column;"><div data-t style="${fx}font-size:26px;font-weight:700;color:${T.muted};">${d.cheers > 0 ? "함께 응원 중" : "응원"}</div><div data-t style="${fx}font-size:52px;font-weight:900;color:${T.ink};letter-spacing:-0.02em;white-space:nowrap;">${d.cheers > 0 ? fmt(d.cheers) + "명" : "첫 응원 대기"}</div></div>
    </div>
  </div>
  <div style="${fx}flex-direction:column;position:absolute;left:${L + W - 150}px;top:${Tp}px;width:150px;height:${H}px;align-items:center;justify-content:center;background:${T.cloverField};border-radius:0 26px 26px 0;border-left:3px solid #d9cfbd;">
    <div data-t style="${fx}font-size:24px;font-weight:800;color:${T.cloverInk};letter-spacing:0.1em;">No.</div>
    <div data-t style="${fx}font-size:${seat.length > 4 ? 40 : 60}px;font-weight:900;color:${T.cloverInk};letter-spacing:-0.03em;margin-top:2px;">${seat}</div>
    <div data-t style="${fx}font-size:22px;font-weight:700;color:${T.cloverInk};margin-top:6px;">번째 응원</div>
    <div style="${fx}margin-top:26px;">${clover(48, T.clover)}</div>
  </div>
  <div style="${fx}position:absolute;left:${L}px;top:22px;">${wordmark(34, T.white, "#bfe8cf")}</div>
  <div data-t style="${fx}position:absolute;right:${1200 - L - W}px;top:28px;font-size:26px;font-weight:700;color:#d6f0df;">${clipName(d.name, 8)}님이 보낸 초대장</div>
</div>`;
  }

  // ── C2 탑승권: 목표행 탑승권. 보낸 사람·도착일·좌석 필드, 오른쪽 떼는 칸에 얼굴 ──
  function c2(d) {
    const dd = ddayText(d.dday), due = dueDate(d.dday), seat = fmt(d.cheers + 1);
    const t = fitTitle(d.title, 640, [70, 62, 54], 2);
    const L = 56, Tp = 56, W = 1088, H = 518, S = 300, M = W - S;
    const field = (k, v, big) => `<div style="${fx}flex-direction:column;margin-right:52px;"><div data-t style="${fx}font-size:24px;font-weight:700;color:${T.muted};letter-spacing:0.04em;">${k}</div><div data-t style="${fx}font-size:${big || 40}px;font-weight:800;color:${T.ink};margin-top:2px;white-space:nowrap;">${v}</div></div>`;
    return `<div class="og" style="${F}${fx}position:relative;width:1200px;height:630px;overflow:hidden;background:${T.cloverDeep};">
  <div style="${fx}position:absolute;left:${L}px;top:${Tp}px;width:${W}px;height:${H}px;background:${T.white};border-radius:24px;box-shadow:0 20px 44px rgba(0,0,0,0.30);"></div>
  <div style="${fx}position:absolute;left:${L}px;top:${Tp}px;width:${M}px;height:96px;background:${T.clover};border-radius:24px 0 0 0;align-items:center;padding:0 44px;justify-content:space-between;">
    ${wordmark(40, T.white, "#bfe8cf")}
    <div data-t style="${fx}font-size:28px;font-weight:800;color:${T.white};letter-spacing:0.14em;">GOAL PASS · 목표행 탑승권</div>
  </div>
  <div style="${fx}flex-direction:column;position:absolute;left:${L + 44}px;top:${Tp + 124}px;width:${M - 88}px;height:${H - 160}px;">
    <div data-t style="${fx}font-size:24px;font-weight:700;color:${T.muted};letter-spacing:0.04em;">목적지</div>
    <div data-t style="margin-top:4px;font-size:${t.size}px;font-weight:900;line-height:1.14;letter-spacing:-0.035em;color:${T.ink};${clamp(2)}">${t.text}</div>
    <div style="${fx}flex:1;"></div>
    <div style="${fx}align-items:flex-end;">
      ${field("기장", `${clipName(d.name, 6)}님`)}
      ${due ? field("도착 예정", due) : field("도착 예정", "기한 없음")}
      ${field("탑승객", d.cheers > 0 ? fmt(d.cheers) + "명" : "첫 탑승 대기")}
    </div>
  </div>
  ${hole(L + M, Tp, 24, T.cloverDeep)}${hole(L + M, Tp + H, 24, T.cloverDeep)}
  ${perfV(L + M, Tp + 36, H - 72, "#cfd8d2")}
  <div style="${fx}flex-direction:column;position:absolute;left:${L + M}px;top:${Tp}px;width:${S}px;height:${H}px;align-items:center;justify-content:center;background:${T.cloverField};border-radius:0 24px 24px 0;">
    ${avatar(d, 132, `6px solid ${T.white}`)}
    <div data-t style="${fx}margin-top:16px;font-size:24px;font-weight:700;color:${T.muted};">좌석</div>
    <div data-t style="${fx}font-size:${seat.length > 4 ? 52 : 68}px;font-weight:900;color:${T.cloverInk};letter-spacing:-0.03em;">${seat}번</div>
    ${dd ? `<div data-t style="${fx}margin-top:10px;padding:4px 18px;border-radius:10px;background:${T.clover};color:${T.white};font-size:32px;font-weight:800;">${dd}</div>` : `<div data-t style="${fx}margin-top:10px;font-size:28px;font-weight:800;color:${T.cloverInk};">언제든 탑승</div>`}
  </div>
</div>`;
  }

  // ── C3 도장 티켓: 받은 응원 = 찍힌 클로버 도장(실제 수), 다음 빈 칸 = 받는 사람 자리 ──
  function c3(d) {
    const dd = ddayText(d.dday);
    const t = fitTitle(d.title, 700, [74, 64, 56], 2);
    const L = 60, Tp = 64, W = 1080, H = 502;
    const shown = d.cheers > 5 ? 4 : d.cheers, rest = d.cheers - shown;
    let stamps = "";
    for (let i = 0; i < shown; i++) stamps += `<div style="${fx}width:76px;height:76px;border-radius:38px;background:${T.cloverSoft};align-items:center;justify-content:center;margin-right:12px;flex-shrink:0;transform:rotate(${(i % 3) * 8 - 8}deg);">${clover(44, T.clover)}</div>`;
    if (rest > 0) stamps += `<div data-t style="${fx}height:76px;align-items:center;margin-right:14px;font-size:36px;font-weight:900;color:${T.cloverInk};white-space:nowrap;flex-shrink:0;">+${fmt(rest)}</div>`;
    const empty = `<div style="${fx}width:96px;height:96px;border-radius:48px;border:4px dashed ${T.clover};align-items:center;justify-content:center;flex-shrink:0;background:${T.white};"><div data-t style="${fx}font-size:24px;font-weight:800;color:${T.clover};white-space:nowrap;">내 자리</div></div>`;
    return `<div class="og" style="${F}${fx}position:relative;width:1200px;height:630px;overflow:hidden;background:${T.clover};">
  <div style="${fx}position:absolute;left:${L}px;top:${Tp}px;width:${W}px;height:${H}px;background:${T.cream};border-radius:26px;box-shadow:0 22px 50px rgba(9,50,28,0.35);"></div>
  <div style="${fx}position:absolute;left:${L}px;top:${Tp}px;width:${W}px;height:22px;background:${T.cloverSoft};border-radius:26px 26px 0 0;"></div>
  ${hole(L, Tp + 300, 24, T.clover)}${hole(L + W, Tp + 300, 24, T.clover)}
  <div style="${fx}position:absolute;left:${L + 40}px;top:${Tp + 297}px;width:${W - 80}px;height:6px;overflow:hidden;">${"<div style=\"display:flex;width:14px;height:6px;border-radius:3px;background:#d9cfbd;margin-right:12px;flex-shrink:0;\"></div>".repeat(40)}</div>
  <div style="${fx}flex-direction:column;position:absolute;left:${L + 56}px;top:${Tp + 50}px;width:${W - 112}px;">
    <div style="${fx}align-items:center;">
      ${avatar(d, 68, `4px solid ${T.white}`)}
      <div data-t style="${fx}margin-left:16px;font-size:36px;font-weight:700;color:${T.ink};white-space:nowrap;">${clipName(d.name, 8)}<span style="color:${T.muted};font-weight:600;">님의 응원 도장판</span></div>
      <div style="${fx}flex:1;"></div>
      ${dd ? `<div data-t style="${fx}padding:4px 18px;border-radius:12px;border:4px solid ${T.ink};font-size:36px;font-weight:900;color:${T.ink};transform:rotate(-4deg);">${dd}</div>` : ""}
    </div>
    <div data-t style="margin-top:22px;font-size:${t.size}px;font-weight:900;line-height:1.14;letter-spacing:-0.035em;color:${T.ink};${clamp(2)}">${t.text}</div>
  </div>
  <div style="${fx}position:absolute;left:${L + 56}px;top:${Tp + 340}px;width:${W - 112}px;height:120px;align-items:center;">
    ${stamps}${empty}
    <div style="${fx}flex:1;"></div>
    <div style="${fx}flex-direction:column;align-items:flex-end;">
      <div data-t style="${fx}font-size:38px;font-weight:900;color:${T.ink};white-space:nowrap;">${d.cheers > 0 ? fmt(d.cheers) + "개 찍혔어요" : "첫 도장을 기다려요"}</div>
      ${wordmark(32, T.cloverInk, T.cloverBright)}
    </div>
  </div>
</div>`;
  }
  const VARIANTS = [ { id: "C1", name: "입장권", fn: c1 }, { id: "C2", name: "목표행 탑승권", fn: c2 }, { id: "C3", name: "응원 도장판", fn: c3 } ];
  const api = { T, DATA, VARIANTS, fitTitle, ddayText, dueDate };
  if (typeof module !== "undefined" && module.exports) module.exports = api; else root.OG = api;
})(typeof window !== "undefined" ? window : globalThis);
