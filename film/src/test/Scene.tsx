import React from "react";
import { AbsoluteFill, Easing, interpolate, useCurrentFrame } from "remotion";
import { Theme } from "./themes";
import * as TL from "./timeline";

// ---------- small deterministic helpers ----------
const hash = (n: number) => {
  const x = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
};
const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
const fadeInOut = (f: number, from: number, to: number, d = 8) =>
  interpolate(f, [from, from + d, to - d, to], [0, 1, 1, 0], clamp);

/** Paper style: tiny per-element wobble, like hand-moved cut-outs. */
const wobble = (t: Theme, fq: number, id: number, cx: number, cy: number) =>
  t.id === "paper"
    ? `rotate(${((hash(fq * 0.37 + id) - 0.5) * 1.2).toFixed(2)} ${cx} ${cy})`
    : undefined;

/** Fill/stroke for a shape in the given style. Chalk = outlines with a faint fill. */
const paint = (t: Theme, c: string) =>
  t.id === "chalk"
    ? { fill: c, fillOpacity: 0.22, stroke: c, strokeWidth: 8, strokeLinejoin: "round" as const }
    : {
        fill: c,
        stroke: t.outline ?? "none",
        strokeWidth: t.outline ? t.outlineWidth : 0,
        strokeLinejoin: "round" as const,
      };

const hillPath = (off: number, base: number, a1: number, f1: number, a2: number, f2: number) => {
  let d = `M0,${TL.H}`;
  for (let x = 0; x <= TL.W + 24; x += 24) {
    const y = base + a1 * Math.sin((x + off) * f1) + a2 * Math.sin((x + off) * f2 + 1.3);
    d += ` L${x},${y.toFixed(1)}`;
  }
  return `${d} L${TL.W},${TL.H} Z`;
};

// ---------- SVG defs per style ----------
const Defs: React.FC<{ t: Theme; f: number }> = ({ t, f }) => {
  const boil = Math.floor(f / 4) % 12;
  return (
    <defs>
      <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor={t.sky[0]} />
        <stop offset="1" stopColor={t.sky[1]} />
      </linearGradient>
      <radialGradient id="puppetBg" cx="0.5" cy="0.45" r="0.75">
        <stop offset="0" stopColor="#FFE3A3" />
        <stop offset="0.45" stopColor="#F0A04B" />
        <stop offset="0.85" stopColor="#9A3D10" />
        <stop offset="1" stopColor="#3D1404" />
      </radialGradient>
      <radialGradient id="glow">
        <stop offset="0" stopColor={t.moonGlow} stopOpacity="0.55" />
        <stop offset="1" stopColor={t.moonGlow} stopOpacity="0" />
      </radialGradient>
      <radialGradient id="lightGlow">
        <stop offset="0" stopColor={t.light} stopOpacity="0.8" />
        <stop offset="1" stopColor={t.light} stopOpacity="0" />
      </radialGradient>
      <radialGradient id="vignette" cx="0.5" cy="0.5" r="0.72">
        <stop offset="0.55" stopColor="#000" stopOpacity="0" />
        <stop offset="1" stopColor="#1A0702" stopOpacity="0.85" />
      </radialGradient>
      <linearGradient id="fadeDown" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#fff" />
        <stop offset="0.5" stopColor="#000" />
      </linearGradient>
      <mask id="skyMask">
        <rect width={TL.W} height={TL.H} fill="url(#fadeDown)" />
      </mask>
      <pattern id="skyHatch" width="20" height="16" patternUnits="userSpaceOnUse">
        <line x1="0" y1="8" x2="20" y2="8" stroke="#1A1714" strokeWidth="3" />
      </pattern>
      <pattern id="woodHatch" width="22" height="22" patternUnits="userSpaceOnUse" patternTransform="rotate(-35)">
        <rect width="22" height="22" fill="#1A1714" />
        <line x1="0" y1="11" x2="22" y2="11" stroke="#EFE5CF" strokeWidth="3" />
      </pattern>
      <pattern id="woodHatchLight" width="18" height="18" patternUnits="userSpaceOnUse" patternTransform="rotate(-35)">
        <rect width="18" height="18" fill="#EFE5CF" />
        <line x1="0" y1="9" x2="18" y2="9" stroke="#1A1714" strokeWidth="3" />
      </pattern>
      <pattern id="woodHatchDense" width="12" height="12" patternUnits="userSpaceOnUse" patternTransform="rotate(30)">
        <rect width="12" height="12" fill="#1A1714" />
        <line x1="0" y1="6" x2="12" y2="6" stroke="#EFE5CF" strokeWidth="2" />
      </pattern>

      <filter id="paperLayer" x="-5%" y="-20%" width="110%" height="140%">
        <feTurbulence type="fractalNoise" baseFrequency="0.06" numOctaves="2" seed="3" result="n" />
        <feDisplacementMap in="SourceGraphic" in2="n" scale="4" xChannelSelector="R" yChannelSelector="G" result="d" />
        <feDropShadow in="d" dx="0" dy="8" stdDeviation="7" floodColor="#000" floodOpacity="0.38" />
      </filter>
      <filter id="grain" x="0" y="0" width="100%" height="100%">
        <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="3" seed="7" />
        <feColorMatrix type="saturate" values="0" />
      </filter>
      <filter id="rough" x="-5%" y="-5%" width="110%" height="110%">
        <feTurbulence type="fractalNoise" baseFrequency="0.035" numOctaves="2" seed="11" result="n" />
        <feDisplacementMap in="SourceGraphic" in2="n" scale="6" xChannelSelector="R" yChannelSelector="G" />
      </filter>
      <filter id="chalk" x="-5%" y="-5%" width="110%" height="110%">
        <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed={boil} result="grit" />
        <feColorMatrix in="grit" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 -2.2 1.45" result="mask" />
        <feComposite in="SourceGraphic" in2="mask" operator="in" result="eroded" />
        <feTurbulence type="fractalNoise" baseFrequency="0.04" numOctaves="1" seed={boil + 20} result="wob" />
        <feDisplacementMap in="eroded" in2="wob" scale="5" xChannelSelector="R" yChannelSelector="G" />
      </filter>
      <filter id="smudge" x="0" y="0" width="100%" height="100%">
        <feTurbulence type="fractalNoise" baseFrequency="0.006 0.012" numOctaves="3" seed="5" />
        <feColorMatrix type="matrix" values="0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0 0 0 0.10 -0.02" />
      </filter>
      <filter id="soft" x="-5%" y="-5%" width="110%" height="110%">
        <feGaussianBlur stdDeviation="1.8" />
      </filter>
      {/* Pixelate: sample one colour per 12x12 block and spread it. */}
      <filter id="pix" x="0" y="0" width={TL.W} height={TL.H} filterUnits="userSpaceOnUse" primitiveUnits="userSpaceOnUse">
        <feFlood x="5" y="5" width="2" height="2" />
        <feComposite width="12" height="12" />
        <feTile result="grid" />
        <feComposite in="SourceGraphic" in2="grid" operator="in" />
        <feMorphology operator="dilate" radius="5" />
      </filter>
    </defs>
  );
};

// ---------- scene pieces ----------
const Sky: React.FC<{ t: Theme }> = ({ t }) => {
  if (t.id === "puppet") return <rect width={TL.W} height={TL.H} fill="url(#puppetBg)" />;
  if (t.id === "woodcut")
    return (
      <>
        <rect width={TL.W} height={TL.H} fill={t.sky[0]} />
        <rect width={TL.W} height={TL.H} fill="url(#skyHatch)" mask="url(#skyMask)" />
      </>
    );
  return <rect width={TL.W} height={TL.H} fill="url(#sky)" />;
};

const Moon: React.FC<{ t: Theme; scroll: number }> = ({ t, scroll }) => {
  const cx = 1520 - scroll * 0.03;
  const cy = 210;
  if (t.id === "woodcut") {
    const stars = [
      [260, 300], [520, 180], [880, 260], [1150, 140], [1760, 330], [1320, 380], [700, 420],
    ];
    return (
      <g>
        {stars.map(([x, y], i) => (
          <path key={i} d={`M ${x - scroll * 0.03} ${y - 16} L ${x - scroll * 0.03} ${y + 16} M ${x - scroll * 0.03 - 16} ${y} L ${x - scroll * 0.03 + 16} ${y}`} stroke={t.accent} strokeWidth={5} strokeLinecap="round" />
        ))}
        <circle cx={cx} cy={cy} r={84} fill="#EFE5CF" />
        <circle cx={cx} cy={cy} r={74} fill="#1A1714" />
        <circle cx={cx + 30} cy={cy - 16} r={66} fill="#EFE5CF" />
      </g>
    );
  }
  return (
    <g>
      <circle cx={cx} cy={cy} r={190} fill="url(#glow)" />
      <circle cx={cx} cy={cy} r={72} {...paint(t, t.moon)} stroke={t.id === "chalk" ? t.moon : t.outline ?? "none"} />
    </g>
  );
};

const Hills: React.FC<{ t: Theme; scroll: number; fq: number }> = ({ t, scroll, fq }) => {
  const far = hillPath(scroll * 0.22, 640, 46, 0.0036, 22, 0.009);
  const near = hillPath(scroll * 0.5 + 900, 740, 34, 0.0052, 16, 0.013);
  const farFill = t.id === "woodcut" ? "url(#woodHatchDense)" : t.farHill;
  const nearFill = t.id === "woodcut" ? "url(#woodHatchLight)" : t.nearHill;
  const layer = t.id === "paper" ? "url(#paperLayer)" : undefined;
  return (
    <>
      <path d={far} {...paint(t, t.farHill)} fill={farFill} filter={layer} transform={wobble(t, fq, 1, 960, 700)} />
      <path d={near} {...paint(t, t.nearHill)} fill={nearFill} filter={layer} transform={wobble(t, fq, 2, 960, 800)} />
    </>
  );
};

const Trees: React.FC<{ t: Theme; scroll: number; fq: number }> = ({ t, scroll, fq }) => {
  const trees: React.ReactNode[] = [];
  for (let i = 0; i < 12; i++) {
    const wx = 150 + i * 430 + hash(i) * 120;
    if (Math.abs(wx - TL.HOUSE_WORLD_X - 160) < 420) continue; // keep the house clear
    const x = wx - scroll * 0.85;
    if (x < -200 || x > TL.W + 200) continue;
    const h = 170 + hash(i + 9) * 110;
    const y = TL.GROUND_Y - 6;
    const tri = (k: number) => {
      const w = 70 - k * 14;
      const top = y - h + k * 52;
      return `M ${x - w} ${top + 90} L ${x} ${top} L ${x + w} ${top + 90} Z`;
    };
    trees.push(
      <g key={i} filter={t.id === "paper" ? "url(#paperLayer)" : undefined} transform={wobble(t, fq, 10 + i, x, y)}>
        <rect x={x - 8} y={y - 40} width={16} height={46} {...paint(t, t.tree)} />
        {[0, 1, 2].map((k) => (
          <path key={k} d={tri(k)} {...paint(t, t.tree)} fill={t.tree} />
        ))}
      </g>,
    );
  }
  return <>{trees}</>;
};

const Ground: React.FC<{ t: Theme; scroll: number }> = ({ t, scroll }) => {
  const tufts: React.ReactNode[] = [];
  const step = 150;
  const start = Math.floor(scroll / step) * step;
  for (let wx = start; wx < start + TL.W + step * 2; wx += step) {
    const x = wx - scroll + (hash(wx) - 0.5) * 60;
    const y = TL.GROUND_Y + 40 + hash(wx + 3) * 120;
    tufts.push(
      <path key={wx} d={`M ${x - 14} ${y} l 8 -14 l 6 10 l 6 -12 l 8 16`} fill="none" stroke={t.groundLine} strokeWidth={t.id === "pixel" ? 6 : 4} strokeLinecap="round" strokeLinejoin="round" opacity={t.id === "puppet" ? 0 : 0.8} />,
    );
  }
  return (
    <g filter={t.id === "paper" ? "url(#paperLayer)" : undefined}>
      <rect x={-20} y={TL.GROUND_Y} width={TL.W + 40} height={TL.H - TL.GROUND_Y + 20} fill={t.ground} fillOpacity={t.id === "chalk" ? 0 : 1} />
      <line x1={0} y1={TL.GROUND_Y} x2={TL.W} y2={TL.GROUND_Y} stroke={t.groundLine} strokeWidth={t.id === "woodcut" ? 8 : 5} />
      {tufts}
    </g>
  );
};

const Snow: React.FC<{ t: Theme; fq: number; scroll: number }> = ({ t, fq, scroll }) => {
  const o = interpolate(fq, [TL.SNOW_FROM, TL.SNOW_FROM + 20, TL.SNOW_TO - 20, TL.SNOW_TO], [0, 1, 1, 0], clamp);
  if (o <= 0) return null;
  return (
    <g opacity={o}>
      {Array.from({ length: 110 }).map((_, i) => {
        const sp = 2.5 + hash(i) * 4;
        const y = ((hash(i + 50) * 1100 + fq * sp) % 1100) - 20;
        const x = (((hash(i + 99) * 2100 - scroll * 0.7 + Math.sin(fq * 0.05 + i) * 30) % 2100) + 2100) % 2100 - 90;
        const r = 3 + hash(i + 7) * 5;
        return t.id === "pixel" ? (
          <rect key={i} x={x} y={y} width={r * 2} height={r * 2} fill={t.snow} />
        ) : (
          <circle key={i} cx={x} cy={y} r={r} fill={t.snow} opacity={t.id === "chalk" ? 0.85 : 0.95} />
        );
      })}
    </g>
  );
};

const House: React.FC<{ t: Theme; scroll: number; fq: number }> = ({ t, scroll, fq }) => {
  const x = TL.HOUSE_WORLD_X - scroll;
  if (x > TL.W + 450) return null;
  const y = TL.GROUND_Y;
  const open = interpolate(fq, [TL.DOOR_OPEN, TL.DOOR_OPEN + TL.DOOR_OPEN_FRAMES], [0, 1], { ...clamp, easing: Easing.out(Easing.cubic) });
  const glowPulse = 0.85 + Math.sin(fq * 0.3) * 0.08;
  const wall = t.id === "woodcut" ? "#1A1714" : t.house;
  return (
    <g transform={wobble(t, fq, 40, x + 165, y - 120)}>
      {/* light spill on the ground */}
      <polygon points={`${x + 50},${y} ${x + 140},${y} ${x + 60},${y + 150} ${x - 360},${y + 150}`} fill={t.light} opacity={open * (t.id === "puppet" ? 0.75 : 0.45)} />
      <circle cx={x + 245} cy={y - 140} r={150} fill="url(#lightGlow)" opacity={t.id === "puppet" ? 0 : glowPulse} />
      <g filter={t.id === "paper" ? "url(#paperLayer)" : undefined}>
        <rect x={x + 250} y={y - 345} width={42} height={90} {...paint(t, t.roof)} />
        <rect x={x} y={y - 230} width={330} height={230} {...paint(t, wall)} />
        {t.id === "woodcut" &&
          [0, 1, 2, 3, 4, 5].map((k) => (
            <line key={k} x1={x + 14} y1={y - 200 + k * 34} x2={x + 316} y2={y - 200 + k * 34} stroke="#EFE5CF" strokeWidth={3} />
          ))}
        <polygon points={`${x - 34},${y - 228} ${x + 165},${y - 380} ${x + 364},${y - 228}`} {...paint(t, t.roof)} fill={t.id === "woodcut" ? "url(#woodHatchDense)" : t.roof} />
        {/* window */}
        <rect x={x + 200} y={y - 185} width={92} height={82} {...paint(t, t.light)} stroke={t.outline ?? (t.id === "puppet" ? "none" : t.roof)} strokeWidth={t.outline ? t.outlineWidth : 6} />
        <line x1={x + 246} y1={y - 185} x2={x + 246} y2={y - 103} stroke={t.id === "chalk" ? t.light : t.roof} strokeWidth={6} />
        <line x1={x + 200} y1={y - 144} x2={x + 292} y2={y - 144} stroke={t.id === "chalk" ? t.light : t.roof} strokeWidth={6} />
        {/* door: lit interior + swinging panel */}
        <rect x={x + 50} y={y - 165} width={92} height={165} {...paint(t, t.light)} />
        <rect x={x + 50} y={y - 165} width={92 * (1 - 0.85 * open)} height={165} {...paint(t, t.door)} fill={t.id === "woodcut" ? "url(#woodHatch)" : t.door} />
        {t.id === "puppet" && (
          <>
            {/* perforations let the lamp light through, like a real leather puppet */}
            {[0, 1, 2, 3].map((k) => (
              <circle key={k} cx={x + 40 + k * 26} cy={y - 260 + (k % 2) * 8} r={6} fill={t.light} opacity={0.9} />
            ))}
          </>
        )}
      </g>
    </g>
  );
};

const Dog: React.FC<{ t: Theme; fq: number }> = ({ t, fq }) => {
  const moving = fq < TL.STOP_FRAME;
  const phase = TL.walkPhase(fq);
  const speed = interpolate(fq, [0, 6, TL.DECEL_START, TL.STOP_FRAME], [0, 1, 1, 0], clamp);
  const jt = (fq - TL.JUMP_FROM) / TL.JUMP_FRAMES;
  const inJump = jt >= 0 && jt <= 1;
  const jumpY = inJump ? Math.sin(jt * Math.PI) * 95 : 0;
  // squash before take-off and on landing, stretch in the air
  const squash = interpolate(fq, [TL.JUMP_FROM - 6, TL.JUMP_FROM - 1, TL.JUMP_FROM + 3, TL.JUMP_FROM + TL.JUMP_FRAMES - 2, TL.JUMP_FROM + TL.JUMP_FRAMES + 1, TL.JUMP_FROM + TL.JUMP_FRAMES + 6], [0, -0.16, 0.12, 0.08, -0.14, 0], clamp);
  const sx = 1 - squash * 0.6;
  const sy = 1 + squash;
  const happy = interpolate(fq, [TL.DOOR_OPEN, TL.DOOR_OPEN + 8], [0, 1], clamp);
  const wag = moving ? Math.sin(fq * 0.25) * 8 : Math.sin(fq * 1.1) * (10 + 22 * happy);
  const bob = -Math.abs(Math.cos(phase)) * 6 * speed;
  const A = 0.5 * speed;
  const s = Math.sin(phase);
  const chalk = t.id === "chalk";
  const legW = chalk ? 8 : 15;
  const sw = t.outline && !chalk ? t.outlineWidth : 0;

  const leg = (hx: number, ang: number, color: string, key: string) => {
    const L = 60;
    const x2 = hx + Math.sin(ang) * L;
    const y2 = -62 + Math.cos(ang) * L;
    return (
      <g key={key}>
        {sw > 0 && <line x1={hx} y1={-62 + bob} x2={x2} y2={y2} stroke={t.outline!} strokeWidth={legW + sw * 2} strokeLinecap="round" />}
        <line x1={hx} y1={-62 + bob} x2={x2} y2={y2} stroke={color} strokeWidth={legW} strokeLinecap="round" />
      </g>
    );
  };
  const S = 1.35;
  return (
    <g filter={t.id === "paper" ? "url(#paperLayer)" : undefined}>
      {t.id === "puppet" && (
        <>
          <line x1={TL.DOG_X - 10} y1={TL.GROUND_Y - 105 - jumpY} x2={TL.DOG_X - 70} y2={TL.H + 20} stroke="#140903" strokeWidth={4} />
          <line x1={TL.DOG_X + 90} y1={TL.GROUND_Y - 150 - jumpY} x2={TL.DOG_X + 170} y2={TL.H + 20} stroke="#140903" strokeWidth={4} />
        </>
      )}
      <g transform={`translate(${TL.DOG_X}, ${TL.GROUND_Y - jumpY}) scale(${S * sx}, ${S * sy})`}>
        {leg(-30, -A * s, t.dogFar, "fb")}
        {leg(46, A * s, t.dogFar, "ff")}
        <g transform={`rotate(${wag} -58 ${-88 + bob})`}>
          {sw > 0 && <path d={`M -58 ${-88 + bob} Q -94 ${-104 + bob} -92 ${-142 + bob}`} stroke={t.outline!} strokeWidth={13 + sw * 2} fill="none" strokeLinecap="round" />}
          <path d={`M -58 ${-88 + bob} Q -94 ${-104 + bob} -92 ${-142 + bob}`} stroke={t.dog} strokeWidth={chalk ? 8 : 13} fill="none" strokeLinecap="round" />
        </g>
        <ellipse cx={0} cy={-80 + bob} rx={64} ry={32} {...paint(t, t.dog)} />
        {(t.id === "paper" || t.id === "pixel") && <ellipse cx={8} cy={-66 + bob} rx={38} ry={12} fill={t.dogDetail} />}
        {t.id === "woodcut" && (
          <path d={`M -34 ${-92 + bob} q 10 -7 20 0 M -6 ${-98 + bob} q 10 -7 20 0 M 22 ${-92 + bob} q 10 -7 20 0 M -20 ${-70 + bob} q 12 -6 24 0`} stroke={t.dogDetail} strokeWidth={4} fill="none" strokeLinecap="round" />
        )}
        {chalk && [0, 1, 2, 3, 4, 5].map((k) => <line key={k} x1={-44 + k * 16} y1={-60 + bob} x2={-30 + k * 16} y2={-96 + bob} stroke={t.dog} strokeWidth={4} opacity={0.6} />)}
        {t.id === "puppet" && [0, 1, 2].map((k) => <circle key={k} cx={-26 + k * 22} cy={-82 + bob} r={5} fill={t.light} opacity={0.85} />)}
        {leg(-42, A * s, t.dog, "nb")}
        {leg(36, -A * s, t.dog, "nf")}
        <g transform={`translate(64, ${-112 + bob}) rotate(${moving ? Math.sin(phase * 2) * 2 : -6 * happy})`}>
          <circle cx={0} cy={0} r={30} {...paint(t, t.dog)} />
          <ellipse cx={26} cy={10} rx={20} ry={13} {...paint(t, t.dog)} />
          <circle cx={45} cy={5} r={6} fill={t.id === "puppet" ? t.dog : t.eye} />
          <circle cx={10} cy={-6} r={4.5} fill={t.eye} />
          {t.id !== "puppet" && (
            <>
              <line x1={1} y1={-15 - 3 * happy} x2={18} y2={-20 + 4 * (1 - happy) - 3 * happy} stroke={t.eye} strokeWidth={3.5} strokeLinecap="round" />
              <path d={`M 26 22 Q 34 ${24 + 6 * happy} 42 20`} stroke={t.eye} strokeWidth={3} fill="none" strokeLinecap="round" />
            </>
          )}
          <path d="M -18 -22 Q -36 -2 -24 26 Q -10 8 -4 -20 Z" {...paint(t, t.dogFar)} transform={`rotate(${Math.sin(phase) * 6 * speed + (inJump ? -18 : 0)} -10 -20)`} />
        </g>
      </g>
    </g>
  );
};

// ---------- text overlays ----------
const captionBox = (t: Theme): React.CSSProperties => {
  switch (t.id) {
    case "paper":
      return { background: "#F6EBD2", padding: "14px 34px", rotate: "-1deg", boxShadow: "0 8px 18px rgba(0,0,0,0.35)" };
    case "woodcut":
      return { background: "#EFE5CF", padding: "10px 32px", border: "5px solid #1A1714" };
    case "pixel":
      return { background: "#0F0E1F", padding: "22px 30px", border: "6px solid #FFFFFF", boxShadow: "0 0 0 6px #0F0E1F" };
    default:
      return {};
  }
};

const chalkFilter = (t: Theme): React.CSSProperties => (t.id === "chalk" ? { filter: "url(#chalk)" } : {});

const Caption: React.FC<{ t: Theme; f: number }> = ({ t, f }) => (
  <>
    {TL.LINES.map((l) => {
      const o = fadeInOut(f, l.from, l.to);
      if (o <= 0) return null;
      return (
        <div key={l.from} style={{ position: "absolute", top: 70, width: "100%", display: "flex", justifyContent: "center", opacity: o }}>
          <div style={{ fontFamily: t.font, fontSize: t.textSize, color: t.text, lineHeight: 1.3, ...captionBox(t), ...chalkFilter(t) }}>{l.text}</div>
        </div>
      );
    })}
  </>
);

const Counter: React.FC<{ t: Theme; f: number }> = ({ t, f }) => {
  const o = interpolate(f, [4, 12, TL.TITLE_FROM - 6, TL.TITLE_FROM], [0, 1, 1, 0], clamp);
  const miles = TL.milesLeft(f);
  const pop = miles === 0 ? interpolate(f, [TL.STOP_FRAME, TL.STOP_FRAME + 4, TL.STOP_FRAME + 10], [1, 1.25, 1], clamp) : 1;
  const color = t.id === "paper" || t.id === "woodcut" ? t.text : t.id === "puppet" ? "#2B1205" : t.text;
  return (
    <div style={{ position: "absolute", left: 64, top: 200, opacity: o, fontFamily: t.font, color, ...chalkFilter(t) }}>
      <div style={{ ...captionBox(t), padding: t.id === "pixel" ? "16px 20px" : captionBox(t).padding, rotate: t.id === "paper" ? "1.5deg" : undefined }}>
        <div style={{ fontSize: t.id === "pixel" ? 18 : 30, letterSpacing: 2, opacity: 0.8, marginBottom: t.id === "pixel" ? 14 : 2 }}>MILES TO HOME</div>
        <div style={{ fontSize: t.id === "pixel" ? 44 : 72, lineHeight: 1.1, scale: String(pop), transformOrigin: "left center", color: miles === 0 ? (t.id === "paper" ? "#B5473A" : t.id === "puppet" ? "#140903" : t.accent) : undefined }}>
          {miles.toLocaleString("en-US")}
        </div>
      </div>
    </div>
  );
};

const TitleCard: React.FC<{ t: Theme; f: number }> = ({ t, f }) => {
  const o = interpolate(f, [TL.TITLE_FROM, TL.TITLE_FROM + 5], [0, 1], clamp);
  if (o <= 0) return null;
  const letters = TL.TITLE_WORD.split("");
  const starts = TL.titleLetterFrames();
  const lineStart = starts[starts.length - 1] + 4;
  const draw = interpolate(f, [lineStart, lineStart + 14], [0, 1], { ...clamp, easing: Easing.out(Easing.cubic) });
  const sub = interpolate(f, [lineStart + 4, lineStart + 12], [0, 1], clamp);
  let wave = "M 0 20";
  for (let x = 0; x <= 700; x += 10) wave += ` L ${x} ${(20 + Math.sin(x * 0.035 + f * 0.25) * 9).toFixed(1)}`;
  return (
    <AbsoluteFill style={{ opacity: o, background: t.id === "puppet" ? "radial-gradient(circle at 50% 45%, #FFE3A3 0%, #F0A04B 45%, #9A3D10 85%, #3D1404 100%)" : t.titleBg, alignItems: "center", justifyContent: "center" }}>
      {t.id === "paper" && <AbsoluteFill style={{ background: "repeating-linear-gradient(0deg, rgba(255,255,255,0.025) 0 2px, transparent 2px 6px)" }} />}
      <div style={{ display: "flex", fontFamily: t.titleFont, fontSize: t.titleSize, color: t.titleColor, letterSpacing: t.id === "pixel" ? 12 : 4, ...chalkFilter(t), textShadow: t.id === "paper" ? "0 10px 0 rgba(0,0,0,0.35)" : undefined }}>
        {letters.map((ch, i) => {
          const p = interpolate(f, [starts[i], starts[i] + 4], [0, 1], { ...clamp, easing: Easing.out(Easing.back(2)) });
          return (
            <span key={i} style={{ opacity: p > 0 ? 1 : 0, display: "inline-block", scale: String(0.6 + 0.4 * p), rotate: t.id === "paper" ? `${(hash(i) - 0.5) * 8}deg` : undefined }}>
              {ch}
            </span>
          );
        })}
        {t.id === "pixel" && Math.floor(f / 8) % 2 === 0 && <span>_</span>}
      </div>
      <svg width={700} height={40} style={{ marginTop: 10, ...chalkFilter(t) }}>
        <path d={wave} stroke={t.id === "puppet" ? "#140903" : t.id === "paper" ? "#F4D06F" : t.accent} strokeWidth={t.id === "pixel" ? 10 : 8} fill="none" strokeLinecap={t.id === "pixel" ? "square" : "round"} pathLength={1} strokeDasharray={1} strokeDashoffset={1 - draw} />
      </svg>
      <div style={{ marginTop: 26, opacity: sub, fontFamily: t.font, fontSize: t.id === "pixel" ? 28 : 54, color: t.titleColor, ...chalkFilter(t) }}>A true story.</div>
    </AbsoluteFill>
  );
};

// ---------- full test film ----------
export const StyleScene: React.FC<{ t: Theme }> = ({ t }) => {
  const frame = useCurrentFrame();
  const fq = Math.floor(frame / t.steps) * t.steps;
  const scroll = TL.scrollAt(fq);
  const push = interpolate(fq, [TL.PUSH_IN_FROM, TL.TITLE_FROM], [1, 1.1], { ...clamp, easing: Easing.inOut(Easing.sin) });
  const sceneFilter = t.id === "pixel" ? "url(#pix)" : t.id === "chalk" ? "url(#chalk)" : t.id === "woodcut" ? "url(#rough)" : t.id === "puppet" ? "url(#soft)" : undefined;
  const flicker = 0.05 + hash(Math.floor(frame / 2)) * 0.06;
  const end = interpolate(frame, [TL.FADE_OUT_FROM, TL.DURATION - 1], [0, 1], clamp);

  return (
    <AbsoluteFill style={{ background: "#000" }}>
      <AbsoluteFill style={{ transform: `scale(${push})`, transformOrigin: "1010px 760px" }}>
        <svg width={TL.W} height={TL.H} viewBox={`0 0 ${TL.W} ${TL.H}`}>
          <Defs t={t} f={frame} />
          {t.id === "chalk" && <Sky t={t} />}
          <g filter={sceneFilter}>
            {t.id !== "chalk" && <Sky t={t} />}
            <Moon t={t} scroll={scroll} />
            <Hills t={t} scroll={scroll} fq={fq} />
            <Trees t={t} scroll={scroll} fq={fq} />
            <Ground t={t} scroll={scroll} />
            <House t={t} scroll={scroll} fq={fq} />
            <Dog t={t} fq={fq} />
            <Snow t={t} fq={fq} scroll={scroll} />
          </g>
          {t.id === "paper" && <rect width={TL.W} height={TL.H} filter="url(#grain)" opacity={0.16} style={{ mixBlendMode: "multiply" }} />}
          {t.id === "woodcut" && <rect width={TL.W} height={TL.H} filter="url(#grain)" opacity={0.12} style={{ mixBlendMode: "multiply" }} />}
          {t.id === "chalk" && <rect width={TL.W} height={TL.H} filter="url(#smudge)" />}
          {t.id === "puppet" && (
            <>
              <rect width={TL.W} height={TL.H} fill="url(#vignette)" />
              <rect width={TL.W} height={TL.H} fill="#000" opacity={flicker} />
            </>
          )}
        </svg>
      </AbsoluteFill>
      <Counter t={t} f={fq} />
      <Caption t={t} f={frame} />
      <TitleCard t={t} f={frame} />
      <AbsoluteFill style={{ background: "#000", opacity: end }} />
    </AbsoluteFill>
  );
};
