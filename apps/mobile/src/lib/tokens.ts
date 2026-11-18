export const colors = {
  paper: "#F7F4EC",
  card: "#FFFFFF",
  ink: "#1F2A24",
  muted: "#69736D",
  border: "#E6E0D5",
  clover: "#1B8A4F",
  cloverDark: "#14613A",
  cloverSoft: "#E5F4EA",
  warning: "#A86213",
  warningSoft: "#FFF2D8",
  danger: "#B42318",
  dangerSoft: "#FDEBE8"
} as const;

export const space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 } as const;

export const radius = { control: 14, button: 16, card: 20, notice: 14 } as const;

export const typeScale = {
  meta: { fontSize: 13, lineHeight: 18 },
  muted: { fontSize: 14, lineHeight: 21 },
  body: { fontSize: 16, lineHeight: 24 },
  heading: { fontSize: 22, lineHeight: 30 },
  title: { fontSize: 30, lineHeight: 39 },
} as const;
