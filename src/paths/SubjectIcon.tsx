/**
 * Small original subject pictures for the path cards, so children who can't read yet can tell paths apart
 * (numbers, letters, a plane…). Simple ink-outlined shapes on a white badge; decorative (callers set aria-hidden).
 */
const INK = "#2B2140";
const s = { fill: "none", stroke: INK, strokeWidth: 2.6, strokeLinecap: "round", strokeLinejoin: "round" } as const;

const ICONS: Record<string, React.JSX.Element> = {
  // numbers: 1 + 2
  math: (
    <g>
      <path d="M7 9 L10 7 V17" {...s} />
      <path d="M15 12 H21 M18 9 V15" {...s} stroke="#E8590C" />
    </g>
  ),
  // letters: A b
  english: (
    <g>
      <path d="M4 18 L8 6 L12 18 M5.5 14 H10.5" {...s} />
      <path d="M15 6 V18 M15 13.5 C15 11 21 11 21 14.5 C21 18 15 18 15 15.5" {...s} stroke="#2F9E44" />
    </g>
  ),
  // a little plane
  pilot: <path d="M3 13 L21 8 L18 11 L21 16 L18 16 L14 13 L9 14.5 L10 18 L8 18 L6 14.8 L3 13 Z" {...s} fill="#FFE3E3" />,
  // code blocks < / >
  cs: <path d="M8 7 L3 12 L8 17 M16 7 L21 12 L16 17 M14 5 L10 19" {...s} />,
  // a shield with a tick
  cyber: (
    <g>
      <path d="M12 3 L20 6 V12 C20 16.5 16.5 19.5 12 21 C7.5 19.5 4 16.5 4 12 V6 Z" {...s} fill="#E5DBFF" />
      <path d="M8.5 12 L11 14.5 L15.5 9.5" {...s} />
    </g>
  ),
  // a truss bridge
  engr: <path d="M2 17 H22 M4 17 V12 H20 V17 M4 12 L8 17 L12 12 L16 17 L20 12" {...s} />,
  // a globe
  geo: (
    <g>
      <circle cx="12" cy="12" r="8.5" {...s} fill="#D0EBFF" />
      <path d="M3.5 12 H20.5 M12 3.5 C8 8 8 16 12 20.5 M12 3.5 C16 8 16 16 12 20.5" {...s} />
    </g>
  ),
  // a coin
  money: (
    <g>
      <circle cx="12" cy="12" r="8.5" {...s} fill="#FFEC99" />
      <path d="M14.5 9 C13.5 7.8 9.5 7.8 9.5 10 C9.5 12.2 14.5 11.6 14.5 14 C14.5 16.2 10.5 16.2 9.5 15 M12 6.5 V17.5" {...s} />
    </g>
  ),
  // a leaf
  nature: (
    <g>
      <path d="M5 19 C5 9 11 4 20 4 C20 13 15 19 5 19 Z" {...s} fill="#D3F9D8" />
      <path d="M5 19 L14 10" {...s} />
    </g>
  ),
  // a flask
  sci: (
    <g>
      <path d="M9.5 3.5 H14.5 M10.5 3.5 V9.5 L5 18.5 C4.4 19.5 5 20.5 6.2 20.5 H17.8 C19 20.5 19.6 19.5 19 18.5 L13.5 9.5 V3.5" {...s} />
      <path d="M7.5 15 H16.5 L18.6 18.6 C18.9 19.2 18.6 19.6 18 19.6 H6 C5.4 19.6 5.1 19.2 5.4 18.6 Z" fill="#FFD8A8" />
    </g>
  ),
  // a heart
  sel: <path d="M12 20 C5 15.5 3 12 3 9 C3 6.2 5.2 4.5 7.5 4.5 C9.5 4.5 11 5.8 12 7.5 C13 5.8 14.5 4.5 16.5 4.5 C18.8 4.5 21 6.2 21 9 C21 12 19 15.5 12 20 Z" {...s} fill="#FFDEEB" />,
};

/** A star stands in for a subject without its own picture yet. */
const FALLBACK = <path d="M12 3 L14.6 8.6 L20.6 9.3 L16.1 13.4 L17.4 19.4 L12 16.3 L6.6 19.4 L7.9 13.4 L3.4 9.3 L9.4 8.6 Z" {...s} fill="#FFF3BF" />;

export const hasSubjectIcon = (id: string): boolean => id in ICONS;

export function SubjectIcon({ id }: { id: string }) {
  return (
    <svg className="subject-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false" data-subject={id}>
      {ICONS[id] ?? FALLBACK}
    </svg>
  );
}
