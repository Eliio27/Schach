/* Schlichte Linien-Icons (24×24), eigene Zeichnungen. */
const S = (p: { children: preact.ComponentChildren }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
    {p.children}
  </svg>
);

export const IconClose = () => (
  <S>
    <path d="M6 6l12 12M18 6L6 18" />
  </S>
);
export const IconBack = () => (
  <S>
    <path d="M15 5l-7 7 7 7" />
  </S>
);
export const IconLearn = () => (
  <S>
    <path d="M9 20h6M10 17h4l1-5H9l1 5zM12 12V8M9.5 5.5a2.5 2.5 0 015 0c0 1.5-1.2 2.5-2.5 2.5S9.5 7 9.5 5.5z" />
  </S>
);
export const IconReview = () => (
  <S>
    <path d="M4 12a8 8 0 0113.7-5.6L20 8M20 4v4h-4M20 12a8 8 0 01-13.7 5.6L4 16M4 20v-4h4" />
  </S>
);
export const IconAnalysis = () => (
  <S>
    <path d="M3 17l5-6 4 3 4-6 5 4M3 21h18" />
  </S>
);
export const IconStats = () => (
  <S>
    <path d="M5 20V11M12 20V5M19 20v-6" />
  </S>
);
export const IconGear = () => (
  <S>
    <circle cx="12" cy="12" r="3" />
    <path d="M12 2v3M12 19v3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M2 12h3M19 12h3M4.9 19.1L7 17M17 7l2.1-2.1" />
  </S>
);
export const IconPlus = () => (
  <S>
    <path d="M12 5v14M5 12h14" />
  </S>
);
export const IconTrash = () => (
  <S>
    <path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13" />
  </S>
);
export const IconFlip = () => (
  <S>
    <path d="M7 4v16M7 20l-3-3M7 20l3-3M17 20V4M17 4l-3 3M17 4l3 3" />
  </S>
);
export const IconPrev = () => (
  <S>
    <path d="M15 6l-6 6 6 6" />
  </S>
);
export const IconNext = () => (
  <S>
    <path d="M9 6l6 6-6 6" />
  </S>
);
