// Simple, high-contrast illustrations for the large visual choices.
const SKIN = '#e9bfa4';
const SKIN_D = '#d29d7f';

const Frame = ({ children, label }) => (
  <svg viewBox="0 0 96 96" role="img" aria-label={label} className="illu">
    {children}
  </svg>
);

const SkinPatch = () => (
  <>
    <rect x="8" y="8" width="80" height="80" rx="20" fill={SKIN} />
    <path d="M20 30c10-4 18 4 30 0s20-4 26 0" stroke={SKIN_D} strokeWidth="2" fill="none" opacity=".5" />
    <path d="M18 66c12 4 22-4 34 0s18 4 26 0" stroke={SKIN_D} strokeWidth="2" fill="none" opacity=".5" />
  </>
);

export const Urine = () => (
  <Frame label="urine">
    <path d="M48 12C38 30 26 44 26 58a22 22 0 0 0 44 0C70 44 58 30 48 12z" fill="#f2c94c" stroke="#c99a12" strokeWidth="3" />
    <ellipse cx="40" cy="58" rx="5" ry="9" fill="#fff" opacity=".55" />
  </Frame>
);

export const Stool = () => (
  <Frame label="stool">
    <path d="M22 74h52c6 0 8-10 0-12h-4c6-2 6-12-2-12h-6c4-3 2-11-6-11h-4c2-6-2-12-8-14 0 6-6 10-12 12-8 2-8 12-2 13h-4c-8 0-8 11-2 12h-2c-8 1-8 12 0 12z" fill="#9a6a3c" stroke="#6b4423" strokeWidth="3" strokeLinejoin="round" />
  </Frame>
);

export const Both = () => (
  <Frame label="both">
    <g transform="translate(-12 4) scale(.7)">
      <path d="M48 12C38 30 26 44 26 58a22 22 0 0 0 44 0C70 44 58 30 48 12z" fill="#f2c94c" stroke="#c99a12" strokeWidth="4" />
    </g>
    <g transform="translate(36 30) scale(.62)">
      <path d="M22 74h52c6 0 8-10 0-12h-4c6-2 6-12-2-12h-6c4-3 2-11-6-11h-4c2-6-2-12-8-14 0 6-6 10-12 12-8 2-8 12-2 13h-4c-8 0-8 11-2 12h-2c-8 1-8 12 0 12z" fill="#9a6a3c" stroke="#6b4423" strokeWidth="4" strokeLinejoin="round" />
    </g>
  </Frame>
);

export const ColorChange = () => (
  <Frame label="color change">
    <defs>
      <radialGradient id="redg">
        <stop offset="0" stopColor="#d6453d" />
        <stop offset=".6" stopColor="#e7766a" stopOpacity=".8" />
        <stop offset="1" stopColor="#e9bfa4" stopOpacity="0" />
      </radialGradient>
    </defs>
    <SkinPatch />
    <ellipse cx="48" cy="48" rx="32" ry="26" fill="url(#redg)" />
  </Frame>
);

export const Wet = () => (
  <Frame label="wet skin">
    <rect x="8" y="8" width="80" height="80" rx="20" fill="#efd2c0" />
    <path d="M30 22c-5 8-8 12-8 16a8 8 0 0 0 16 0c0-4-3-8-8-16z" fill="#5aa9e6" />
    <path d="M62 36c-5 8-8 12-8 16a8 8 0 0 0 16 0c0-4-3-8-8-16z" fill="#5aa9e6" />
    <path d="M38 58c-4 6-6 9-6 12a6 6 0 0 0 12 0c0-3-2-6-6-12z" fill="#5aa9e6" />
    <path d="M18 80c8-3 16 3 24 0s16-3 24 0 10 1 12 0" stroke="#fff" strokeWidth="3" fill="none" opacity=".8" />
  </Frame>
);

export const Broken = () => (
  <Frame label="broken skin">
    <SkinPatch />
    <path d="M24 30l14 10-4 10 14 8-2 10 12 6" stroke="#b33a32" strokeWidth="4" fill="none" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M58 24c8 2 14 8 14 16l-12-4z" fill="#f6dccb" stroke="#b67d62" strokeWidth="2" />
    <ellipse cx="52" cy="54" rx="9" ry="6" fill="#d2564a" opacity=".85" />
  </Frame>
);

export const Rash = () => (
  <Frame label="rash">
    <SkinPatch />
    {[[30, 30], [46, 26], [62, 34], [26, 48], [42, 44], [58, 50], [72, 46], [34, 64], [50, 66], [66, 66], [40, 56], [56, 38]].map(([x, y], i) => (
      <circle key={i} cx={x} cy={y} r={i % 3 === 0 ? 4.5 : 3.4} fill="#d0473f" />
    ))}
  </Frame>
);

export const Pain = () => (
  <Frame label="pain burning itching">
    <SkinPatch />
    <path d="M52 14L32 50h14l-6 32 24-40H50z" fill="#f59e0b" stroke="#b45309" strokeWidth="3" strokeLinejoin="round" />
    <path d="M18 24l8 4M14 42l9 1M76 22l-8 5M80 42l-9 1" stroke="#b33a32" strokeWidth="3" strokeLinecap="round" />
  </Frame>
);

export const Same = () => (
  <Frame label="looks usual">
    <SkinPatch />
    <circle cx="66" cy="66" r="18" fill="#22a565" />
    <path d="M57 66l6 6 12-13" stroke="#fff" strokeWidth="5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
  </Frame>
);

export const Changed = () => (
  <Frame label="changed">
    <ColorChangeInner />
    <circle cx="68" cy="66" r="18" fill="#e5484d" />
    <path d="M68 56v12" stroke="#fff" strokeWidth="5" strokeLinecap="round" />
    <circle cx="68" cy="76" r="3" fill="#fff" />
  </Frame>
);

function ColorChangeInner() {
  return (
    <>
      <SkinPatch />
      <ellipse cx="40" cy="40" rx="22" ry="17" fill="#e07a6f" opacity=".7" />
    </>
  );
}

export const Clean = () => (
  <Frame label="clean gently">
    <rect x="18" y="40" width="60" height="36" rx="10" fill="#7cc4e8" stroke="#3a8fbf" strokeWidth="3" />
    <path d="M24 52h48M24 62h48" stroke="#3a8fbf" strokeWidth="2" opacity=".6" />
    <circle cx="30" cy="26" r="7" fill="#e6f5fc" stroke="#7cc4e8" strokeWidth="2" />
    <circle cx="48" cy="18" r="5" fill="#e6f5fc" stroke="#7cc4e8" strokeWidth="2" />
    <circle cx="64" cy="28" r="8" fill="#e6f5fc" stroke="#7cc4e8" strokeWidth="2" />
  </Frame>
);

export const Dry = () => (
  <Frame label="pat dry, do not rub">
    <rect x="14" y="44" width="68" height="34" rx="8" fill="#f7e7a8" stroke="#c9a227" strokeWidth="3" />
    <path d="M14 56h68M14 66h68" stroke="#c9a227" strokeWidth="2" opacity=".5" />
    <path d="M40 38V16m0 0l-7 7m7-7l7 7M56 16v22m0 0l-7-7m7 7l7-7" stroke="#0f766e" strokeWidth="4" fill="none" strokeLinecap="round" strokeLinejoin="round" />
  </Frame>
);

export const Protect = () => (
  <Frame label="apply skin protectant">
    <path d="M48 10l30 10v22c0 20-14 34-30 42C32 76 18 62 18 42V20z" fill="#d6efe9" stroke="#0f766e" strokeWidth="3" />
    <rect x="32" y="34" width="34" height="18" rx="5" fill="#fff" stroke="#0f766e" strokeWidth="3" transform="rotate(-20 48 43)" />
    <path d="M30 60c6 4 14 6 22 4" stroke="#0f766e" strokeWidth="5" strokeLinecap="round" fill="none" />
  </Frame>
);

export const Eye = () => (
  <svg viewBox="0 0 24 24" className="icon" aria-hidden="true">
    <path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z" fill="none" stroke="currentColor" strokeWidth="2" />
    <circle cx="12" cy="12" r="3" fill="currentColor" />
  </svg>
);

export const Speaker = ({ off }) => (
  <svg viewBox="0 0 24 24" className="icon" aria-hidden="true">
    <path d="M4 9h4l5-4v14l-5-4H4z" fill="currentColor" />
    {off ? (
      <path d="M17 9l5 6m0-6l-5 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    ) : (
      <path d="M16 8.5a5 5 0 0 1 0 7M18.5 6a8.5 8.5 0 0 1 0 12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    )}
  </svg>
);

export const CHANGE_ILLUS = { color: ColorChange, wet: Wet, broken: Broken, rash: Rash, pain: Pain };
export const CONTENT_ILLUS = { urine: Urine, stool: Stool, both: Both };
