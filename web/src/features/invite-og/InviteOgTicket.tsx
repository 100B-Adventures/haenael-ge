import type { CSSProperties } from "react";
import {
  clipInviteName,
  fitInviteTitle,
  type InviteOgModel,
} from "./model";

// design-token-lint-allow: 승인 C1 시안과 globals.css 브랜드 토큰을 ImageResponse 전용 상수로 옮긴 값이다.
const COLORS = { clover: "#1b8a4f", cream: "#fffaf0", ink: "#16140f", muted: "#6f6a60", cloverInk: "#14613a", cloverField: "#eef6f0", white: "#ffffff", perforation: "#d9cfbd", paleGreen: "#d6f0df", dot: "#bfe8cf", avatar: "#e7f4ec", shadow: "rgba(9,50,28,0.35)" } as const;

const flex: CSSProperties = { display: "flex", boxSizing: "border-box" };
// ImageResponse/Satori는 CSS 파일이나 className 대신 직렬화 가능한 style 객체가 필요하다.
const ogStyle = (style: CSSProperties): CSSProperties => style;
const styles = {
  root: {
    ...flex,
    position: "relative",
    width: 1200,
    height: 630,
    overflow: "hidden",
    background: COLORS.clover,
    fontFamily: "Pretendard",
  },
  card: {
    ...flex,
    position: "absolute",
    left: 60,
    top: 70,
    width: 1080,
    height: 490,
    background: COLORS.cream,
    borderRadius: 26,
    boxShadow: `0 22px 50px ${COLORS.shadow}`,
  },
  left: {
    ...flex,
    flexDirection: "column",
    position: "absolute",
    left: 60,
    top: 70,
    width: 330,
    height: 490,
    alignItems: "center",
    justifyContent: "center",
  },
  main: {
    ...flex,
    flexDirection: "column",
    position: "absolute",
    left: 442,
    top: 116,
    width: 548,
    height: 398,
  },
  serial: {
    ...flex,
    flexDirection: "column",
    position: "absolute",
    left: 990,
    top: 70,
    width: 150,
    height: 490,
    alignItems: "center",
    justifyContent: "center",
    background: COLORS.cloverField,
    borderRadius: "0 26px 26px 0",
    borderLeft: `3px solid ${COLORS.perforation}`,
  },
} satisfies Record<string, CSSProperties>;

function Clover({ size = 48 }: { size?: number }) {
  const leaf: CSSProperties = {
    ...flex,
    position: "absolute",
    width: size / 2,
    height: size / 2,
    borderRadius: size / 4,
    background: COLORS.clover,
  };
  return (
    <div style={ogStyle({ ...flex, position: "relative", width: size, height: size })}>
      <div style={ogStyle({ ...leaf, left: size / 4, top: 0 })} />
      <div style={ogStyle({ ...leaf, left: size / 4, top: size / 2 })} />
      <div style={ogStyle({ ...leaf, left: 0, top: size / 4 })} />
      <div style={ogStyle({ ...leaf, left: size / 2, top: size / 4 })} />
    </div>
  );
}

function Wordmark() {
  return (
    <div style={ogStyle({ ...flex, alignItems: "baseline", fontSize: 34, fontWeight: 900, letterSpacing: "-0.04em", color: COLORS.white })}>
      해낼게<span style={ogStyle({ color: COLORS.dot })}>.</span>
    </div>
  );
}

function Avatar({ model }: { model: InviteOgModel }) {
  const avatarStyle: CSSProperties = {
    ...flex,
    width: 156,
    height: 156,
    borderRadius: 78,
    border: `7px solid ${COLORS.white}`,
    flexShrink: 0,
  };
  if (model.profileImage) {
    return (
      <img
        alt=""
        height="156"
        src={model.profileImage}
        style={ogStyle({ ...avatarStyle, objectFit: "cover" })}
        width="156"
      />
    );
  }
  return (
    <div style={ogStyle({ ...avatarStyle, alignItems: "center", justifyContent: "center", background: COLORS.avatar, color: COLORS.cloverInk, fontSize: 68, fontWeight: 800 })}>
      {[...model.name][0] ?? "친"}
    </div>
  );
}

function Perforation() {
  return (
    <div style={ogStyle({ ...flex, flexDirection: "column", position: "absolute", left: 386, top: 110, height: 410, overflow: "hidden" })}>
      {Array.from({ length: 19 }, (_, index) => (
        <div key={index} style={ogStyle({ ...flex, width: 8, height: 8, borderRadius: 4, background: COLORS.perforation, marginBottom: 14, flexShrink: 0 })} />
      ))}
    </div>
  );
}

export function InviteOgTicket({ model }: { model: InviteOgModel }) {
  const title = fitInviteTitle(model.title);
  const clippedName = clipInviteName(model.name);
  return (
    <div style={styles.root}>
      <div style={styles.card} />
      <div style={ogStyle({ ...flex, position: "absolute", left: 364, top: 44, width: 52, height: 52, borderRadius: 26, background: COLORS.clover })} />
      <div style={ogStyle({ ...flex, position: "absolute", left: 364, top: 534, width: 52, height: 52, borderRadius: 26, background: COLORS.clover })} />
      <Perforation />

      <div style={styles.left}>
        <Avatar model={model} />
        <div style={ogStyle({ ...flex, marginTop: 18, fontSize: 40, fontWeight: 800, color: COLORS.ink, whiteSpace: "nowrap" })}>
          {clippedName}님의
        </div>
        <div style={ogStyle({ ...flex, marginTop: 2, fontSize: 32, fontWeight: 700, color: COLORS.cloverInk })}>
          초대 티켓
        </div>
      </div>

      <div style={styles.main}>
        <div style={ogStyle({ ...flex, fontSize: 28, fontWeight: 800, letterSpacing: "0.12em", color: COLORS.clover })}>
          ADMIT ONE · 응원 입장권
        </div>
        <div style={ogStyle({ ...flex, marginTop: 16, fontSize: title.fontSize, fontWeight: 900, lineHeight: 1.14, letterSpacing: "-0.035em", color: COLORS.ink, wordBreak: "keep-all", overflow: "hidden" })}>
          {title.text}
        </div>
        <div style={ogStyle({ ...flex, flex: 1 })} />
        <div style={ogStyle({ ...flex, flexDirection: "column" })}>
          <div style={ogStyle({ ...flex, fontSize: 26, fontWeight: 700, color: COLORS.muted })}>초대</div>
          <div style={ogStyle({ ...flex, fontSize: 52, fontWeight: 900, color: COLORS.ink, letterSpacing: "-0.02em" })}>
            같이 해낼 차례
          </div>
        </div>
      </div>

      <div style={styles.serial}>
        <div style={ogStyle({ ...flex, fontSize: 24, fontWeight: 800, color: COLORS.cloverInk, letterSpacing: "0.1em" })}>No.</div>
        <div style={ogStyle({ ...flex, marginTop: 4, fontSize: 38, fontWeight: 900, color: COLORS.cloverInk })}>{model.personalized ? "내 자리" : "초대"}</div>
        <div style={ogStyle({ ...flex, marginTop: 8, fontSize: 22, fontWeight: 700, color: COLORS.cloverInk })}>응원 입장권</div>
        <div style={ogStyle({ ...flex, marginTop: 26 })}><Clover /></div>
      </div>

      <div style={ogStyle({ ...flex, position: "absolute", left: 60, top: 22 })}><Wordmark /></div>
      <div style={ogStyle({ ...flex, position: "absolute", right: 60, top: 28, fontSize: 26, fontWeight: 700, color: COLORS.paleGreen })}>
        {clipInviteName(model.name, 8)}님이 보낸 초대장
      </div>
    </div>
  );
}
