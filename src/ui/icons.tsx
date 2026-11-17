/** Chunky, rounded icon set (original). All decorative: buttons carry aria-labels. */
const S = { fill: "none", stroke: "currentColor", strokeWidth: 3.2, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };

export const IconHome = () => (
  <svg viewBox="0 0 32 32" aria-hidden="true"><path {...S} d="M5 15 L16 5 L27 15 M8 13 V27 H24 V13" /><path {...S} d="M13 27 V19 H19 V27" /></svg>
);
export const IconSound = ({ on }: { on: boolean }) => (
  <svg viewBox="0 0 32 32" aria-hidden="true">
    <path d="M5 12 H10 L17 6 V26 L10 20 H5 Z" fill="currentColor" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
    {on ? (
      <><path {...S} d="M21 11 Q24 16 21 21" /><path {...S} d="M24.5 7.5 Q30 16 24.5 24.5" /></>
    ) : (
      <path {...S} d="M21 11 L29 21 M29 11 L21 21" />
    )}
  </svg>
);
export const IconReplay = () => (
  <svg viewBox="0 0 32 32" aria-hidden="true">
    <path d="M4 12 H8 L13 7.5 V24.5 L8 20 H4 Z" fill="currentColor" />
    <path {...S} d="M17 12 Q20 16 17 20" /><path {...S} d="M20.5 8.5 Q26 16 20.5 23.5" />
  </svg>
);
export const IconPlay = () => (
  <svg viewBox="0 0 32 32" aria-hidden="true"><path d="M10 6 Q10 4 12 5 L26 14.5 Q28 16 26 17.5 L12 27 Q10 28 10 26 Z" fill="currentColor" /></svg>
);
export const IconCheck = () => (
  <svg viewBox="0 0 32 32" aria-hidden="true"><path {...S} strokeWidth={4.5} d="M6 17 L13 24 L26 9" /></svg>
);
export const IconBack = () => (
  <svg viewBox="0 0 32 32" aria-hidden="true"><path {...S} strokeWidth={4} d="M19 6 L9 16 L19 26" /></svg>
);
export const IconAgain = () => (
  <svg viewBox="0 0 32 32" aria-hidden="true"><path {...S} strokeWidth={3.6} d="M25 16 A9 9 0 1 1 22 9.3" /><path d="M19 4 L27 7 L22 13 Z" fill="currentColor" /></svg>
);
export const IconGrid = () => (
  <svg viewBox="0 0 32 32" aria-hidden="true">
    {[[6, 6], [18, 6], [6, 18], [18, 18]].map(([x, y]) => <rect key={`${x}${y}`} x={x} y={y} width="9" height="9" rx="3" fill="currentColor" />)}
  </svg>
);
export const IconStar = ({ filled = true }: { filled?: boolean }) => (
  <svg viewBox="0 0 32 32" aria-hidden="true">
    <path d="M16 3 L20 11.5 L29 12.5 L22.3 18.6 L24.2 27.5 L16 23 L7.8 27.5 L9.7 18.6 L3 12.5 L12 11.5 Z" fill={filled ? "#FFD43B" : "rgba(255,255,255,0.35)"} stroke="#2B2140" strokeWidth="2.4" strokeLinejoin="round" />
  </svg>
);
export const IconLock = () => (
  <svg viewBox="0 0 32 32" aria-hidden="true"><rect x="7" y="14" width="18" height="13" rx="3.5" fill="currentColor" /><path {...S} d="M11 14 V10 A5 5 0 0 1 21 10 V14" /></svg>
);
export const IconHand = () => (
  <svg viewBox="0 0 64 64" aria-hidden="true">
    <path d="M24 30 V12 a5 5 0 0 1 10 0 V28 l2-1 a5 5 0 0 1 9 2 l1 0 a5 5 0 0 1 8 4 V44 c0 10-8 16-16 16 h-4 c-6 0-10-3-13-8 L13 41 a5 5 0 0 1 8-6 Z" fill="#fff" stroke="#2B2140" strokeWidth="3.5" strokeLinejoin="round" />
  </svg>
);
