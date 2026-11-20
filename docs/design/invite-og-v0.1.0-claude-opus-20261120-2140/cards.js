// 해낼게 초대·응원 링크 미리보기 이미지 시안 3안 (1200x630).
// Satori(next/og ImageResponse) 이식 규칙: 모든 상자 display:flex, grid·의사요소·float 없음,
// 위치는 flex 와 position:absolute 만, 글자 넘침은 fitTitle() 이 서버에서 먼저 자르고 CSS lineClamp 는 안전망.
(function (root) {
  const T = {
    paper: "#fbfaf7", ink: "#16140f", muted: "#6f6a60", line: "#e8e4dc", warm: "#f4efe6",
    clover: "#1b8a4f", cloverBright: "#1f9e5a", cloverSoft: "#e7f4ec", cloverField: "#eef6f0", cloverInk: "#14613a",
    white: "#ffffff",
  };
  const DATA = {
    normal: { key: "normal", label: "정상", name: "지민", avatar: "assets/jimin.png", title: "토익 900점 넘기기",
      cover: "assets/cover-study.jpg", dday: 23, cheers: 12 },
    empty: { key: "empty", label: "적음 (사진·기한·응원 없음)", name: "도경", avatar: null, title: "매일 아침 30분 달리기",
      cover: "assets/cover-run.jpg", dday: null, cheers: 0 },
    overflow: { key: "overflow", label: "과다 (긴 이름·긴 목표·큰 수)", name: "바다를닮은서연이에요", avatar: null,
      title: "퇴근하고 매일 30분씩 영어 원서 읽어서 올해 안에 다섯 권을 끝까지 다 읽어내기",
      cover: "assets/cover-writing.jpg", dday: 142, cheers: 1284 },
  };
  function units(s) { let u = 0; for (const ch of s) u += ch === " " ? 0.3 : /[0-9a-zA-Z.,]/.test(ch) ? 0.6 : 0.98; return u; }
  function fitTitle(title, boxWidth, steps, maxLines) {
    for (const size of steps) {
      const perLine = boxWidth / size;
      if (units(title) <= perLine * maxLines * 0.9) return { size, text: title };
    }
    const size = steps[steps.length - 1];
    const budget = (boxWidth / size) * maxLines * 0.86 - 1;
    let out = "", u = 0;
    for (const ch of title) { const w = units(ch); if (u + w > budget) break; out += ch; u += w; }
    return { size, text: out.trimEnd() + "…" };
  }
  function clipName(name, max) { const a = [...name]; return a.length > max ? a.slice(0, max - 1).join("") + "…" : name; }
  function cheerText(n) { return n > 0 ? `${n.toLocaleString("ko-KR")}명이 응원 중` : "첫 응원을 기다려요"; }
  function ddayText(d) { return d == null ? null : d === 0 ? "오늘 마감" : `D-${d}`; }
  const F = "font-family:Pretendard,sans-serif;";
  const flex = "display:flex;box-sizing:border-box;";
  function avatar(d, size, ring) {
    const r = `width:${size}px;height:${size}px;border-radius:${size / 2}px;flex-shrink:0;${ring ? `border:${ring};` : ""}`;
    if (d.avatar) return `<img data-t src="${d.avatar}" style="${r}object-fit:cover;" />`;
    const ch = [...d.name][0];
    return `<div data-t style="${flex}${r}align-items:center;justify-content:center;background:${T.cloverSoft};color:${T.cloverInk};font-size:${Math.round(size * 0.46)}px;font-weight:800;">${ch}</div>`;
  }
  function wordmark(size, color, dot) {
    return `<div data-t style="${flex}align-items:baseline;font-size:${size}px;font-weight:900;letter-spacing:-0.04em;color:${color};">해낼게<span style="color:${dot};">.</span></div>`;
  }
  function clamp(n) { return `box-sizing:border-box;word-break:keep-all;overflow-wrap:anywhere;display:-webkit-box;-webkit-line-clamp:${n};-webkit-box-orient:vertical;overflow:hidden;`; }

  // A안: 사진 전면
  function cardA(d) {
    const t = fitTitle(d.title, 1072, [92, 80, 68], 2);
    const dd = ddayText(d.dday);
    return `<div class="og" style="${F}${flex}position:relative;width:1200px;height:630px;overflow:hidden;background:${T.ink};">
  <img src="${d.cover}" style="position:absolute;left:0;top:0;width:1200px;height:630px;object-fit:cover;" />
  <div style="${flex}position:absolute;left:0;top:0;width:1200px;height:630px;background-image:linear-gradient(180deg,rgba(22,20,15,0.10) 0%,rgba(22,20,15,0.18) 36%,rgba(22,20,15,0.80) 100%);"></div>
  <div style="${flex}position:absolute;left:64px;top:56px;align-items:center;padding:10px 28px 10px 10px;border-radius:44px;background:rgba(255,255,255,0.95);">
    ${avatar(d, 64)}
    <div data-t style="${flex}margin-left:16px;font-size:38px;font-weight:700;color:${T.ink};white-space:nowrap;">${clipName(d.name, 8)}님의 목표</div>
  </div>
  <div style="${flex}position:absolute;right:64px;top:62px;">${wordmark(46, T.white, "#7fd6a3")}</div>
  <div style="${flex}flex-direction:column;position:absolute;left:64px;bottom:56px;width:1072px;">
    <div data-t style="font-size:${t.size}px;font-weight:800;line-height:1.14;letter-spacing:-0.03em;color:${T.white};${clamp(2)}">${t.text}</div>
    <div style="${flex}align-items:center;margin-top:26px;">
      ${dd ? `<div data-t style="${flex}padding:6px 22px;border-radius:12px;background:${T.clover};color:${T.white};font-size:44px;font-weight:800;margin-right:22px;">${dd}</div>` : ""}
      <div data-t style="${flex}font-size:44px;font-weight:700;color:${T.white};">${cheerText(d.cheers)}</div>
    </div>
  </div>
</div>`;
  }

  // B안: 선언문
  function cardB(d) {
    const t = fitTitle(d.title, 660, [84, 72, 60], 3);
    const dd = ddayText(d.dday);
    const stat = (big, small) => `<div style="${flex}flex-direction:column;margin-right:56px;">
        <div data-t style="${flex}font-size:54px;font-weight:800;color:${T.ink};letter-spacing:-0.02em;">${big}</div>
        <div data-t style="${flex}font-size:30px;font-weight:600;color:${T.muted};margin-top:2px;">${small}</div></div>`;
    return `<div class="og" style="${F}${flex}position:relative;width:1200px;height:630px;overflow:hidden;background:${T.paper};">
  <div style="${flex}flex-direction:column;position:absolute;left:72px;top:58px;width:680px;height:514px;">
    <div style="${flex}align-items:center;">
      ${avatar(d, 76, `4px solid ${T.white}`)}
      <div data-t style="${flex}margin-left:18px;font-size:38px;font-weight:700;color:${T.ink};white-space:nowrap;">${clipName(d.name, 8)}<span style="color:${T.muted};font-weight:600;">님이 선언했어요</span></div>
    </div>
    <div data-t style="margin-top:26px;font-size:${t.size}px;font-weight:900;line-height:1.12;letter-spacing:-0.04em;color:${T.ink};${clamp(3)}">“${t.text}”</div>
    <div style="${flex}flex:1;"></div>
    <div style="${flex}align-items:flex-end;">
      ${dd ? stat(dd, "남은 기간") : ""}
      ${d.cheers > 0 ? stat(`${d.cheers.toLocaleString("ko-KR")}명`, "응원한 친구") : stat("첫 응원", "아직 기다리는 중")}
    </div>
  </div>
  <div style="${flex}position:absolute;left:806px;top:70px;width:330px;height:460px;padding:16px 16px 0 16px;background:${T.white};border-radius:18px;box-shadow:0 18px 40px rgba(22,20,15,0.16);transform:rotate(2.5deg);flex-direction:column;">
    <img src="${d.cover}" style="width:298px;height:362px;object-fit:cover;border-radius:10px;" />
    <div style="${flex}flex:1;align-items:center;justify-content:center;">${wordmark(40, T.ink, T.cloverBright)}</div>
  </div>
</div>`;
  }

  // C안: 응원 티켓
  function cardC(d) {
    const dd = ddayText(d.dday);
    const t = fitTitle(d.title, dd ? 470 : 610, [72, 62, 54], 2);
    return `<div class="og" style="${F}${flex}position:relative;width:1200px;height:630px;overflow:hidden;background:${T.clover};">
  <div style="${flex}position:absolute;left:64px;top:40px;">${wordmark(42, T.white, "#bfe8cf")}</div>
  <div data-t style="${flex}position:absolute;right:64px;top:50px;font-size:32px;font-weight:700;color:#d6f0df;">목표 응원 초대장</div>
  <div style="${flex}position:absolute;left:64px;top:124px;width:1072px;height:450px;">
    <div style="${flex}flex-direction:column;width:330px;height:450px;background:${T.cloverField};border-radius:28px 0 0 28px;align-items:center;justify-content:center;border-right:4px dashed #b7d9c4;">
      ${avatar(d, 168, `8px solid ${T.white}`)}
      <div data-t style="${flex}margin-top:20px;font-size:40px;font-weight:800;color:${T.ink};white-space:nowrap;">${clipName(d.name, 6)}님이</div>
      <div data-t style="${flex}margin-top:2px;font-size:30px;font-weight:600;color:${T.muted};">기다리고 있어요</div>
    </div>
    <div style="${flex}flex-direction:column;width:742px;height:450px;background:${T.white};border-radius:0 28px 28px 0;padding:50px 56px 48px 56px;position:relative;">
      <div data-t style="${flex}font-size:32px;font-weight:700;color:${T.clover};">함께 해낼 목표</div>
      <div data-t style="margin-top:14px;font-size:${t.size}px;font-weight:900;line-height:1.14;letter-spacing:-0.03em;color:${T.ink};${clamp(2)}width:${dd ? 470 : 610}px;">${t.text}</div>
      <div style="${flex}flex:1;"></div>
      <div style="${flex}align-items:center;">
        <img src="${d.cover}" style="width:88px;height:88px;border-radius:16px;object-fit:cover;margin-right:22px;" />
        <div data-t style="${flex}font-size:40px;font-weight:800;color:${T.ink};">${cheerText(d.cheers)}</div>
      </div>
      ${dd ? `<div style="${flex}position:absolute;right:44px;top:44px;width:156px;height:156px;border-radius:78px;border:6px solid ${T.clover};align-items:center;justify-content:center;flex-direction:column;transform:rotate(-12deg);">
        <div data-t style="${flex}font-size:${dd.length > 4 ? 40 : 48}px;font-weight:900;color:${T.clover};letter-spacing:-0.02em;">${dd}</div>
        <div data-t style="${flex}font-size:24px;font-weight:700;color:${T.clover};">마감까지</div></div>` : ""}
    </div>
  </div>
</div>`;
  }
  const VARIANTS = [
    { id: "A", name: "사진 전면", fn: cardA },
    { id: "B", name: "선언문", fn: cardB },
    { id: "C", name: "응원 티켓", fn: cardC },
  ];
  const api = { T, DATA, VARIANTS, fitTitle, cheerText, ddayText };
  if (typeof module !== "undefined" && module.exports) module.exports = api; else root.OG = api;
})(typeof window !== "undefined" ? window : globalThis);
