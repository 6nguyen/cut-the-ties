// social-sharing §2: the 1080×1920 poster drawn on the device after a receipt. Text and shapes only
// (Canvas 2D: fills, strokes, one rotation; no filter, Safari has none), the goal card's palette and
// faces; nothing identifying on it.
// This module is a lazy chunk: ActForm imports it (through ShareRow) only once a receipt exists.
import { surname } from '@worker/names';

/**
 * social-sharing §1.2: the constant the owner's device matrix sets (docs/prd/social-sharing.md §1).
 * `SHARE_PAYLOAD` — `'files'` hands the OS sheet the poster alone; `'files+title'` adds `title: ''` for
 * sheets that need it. Default until the matrix runs: files only. The button's label is fixed
 * (one-screen-receipt §3: the Instagram glyph and "Share").
 */
export const SHARE_PAYLOAD: 'files' | 'files+title' = 'files';

export const W = 1080;
export const H = 1920;
/** The central 4:5 band a feed post crops to: every glyph stays inside it (y 285–1635) and the 72 px gutters. */
export const BAND = { top: 285, bottom: 1635, left: 72, right: 1008 } as const;
export const SITE = 'cutthetiesmovement.org';
export const SITE_URL = `https://${SITE}`;

const INK = '#090A0F';
const NEWSPRINT = '#FAF7F0';
const PAPER = '#FFFFFF';
const ACID = '#00E876';
const CRIMSON = '#E11148';
const HAZARD = '#FACC15';
const CONDENSED = "'Bebas Neue', Impact, 'Arial Narrow', 'Helvetica Neue', Arial, sans-serif";
const MONO = "'Space Mono', Menlo, monospace";
const SANS = "Inter, 'Helvetica Neue', Arial, sans-serif";

export interface PosterSpec {
  /** The stamp's act line: "I CALLED" for a call; "I WROTE" for a letter, a comment or an emailed script. */
  act: 'called' | 'wrote';
  /** "REP. CORREA'S OFFICE" / "THE TX TREASURER": the stamp's office line. */
  target: string;
  title: string;
  /** The goal's one-line `what_we_want`. */
  what: string;
  /** "Nov 8, 2026" */
  date: string;
  /** The address under the call to action; defaults to the site host. */
  url?: string;
}

/** The subset of CanvasRenderingContext2D the draw uses, so a test can pass a recording stub. */
export type Ctx = Pick<CanvasRenderingContext2D, 'fillRect' | 'fillText' | 'measureText' | 'save' | 'restore' | 'translate' | 'rotate' | 'strokeRect' | 'setLineDash' | 'beginPath' | 'moveTo' | 'lineTo' | 'stroke'> & {
  fillStyle: string | CanvasGradient | CanvasPattern; strokeStyle: string | CanvasGradient | CanvasPattern;
  lineWidth: number; lineCap: CanvasLineCap; font: string; textBaseline: CanvasTextBaseline;
};

/** Greedy wrap by `measureText`; past `max` lines the last one is cut at a word and ends with an ellipsis. */
export function wrapText(ctx: Ctx, text: string, width: number, max: number): string[] {
  const out: string[] = [];
  let line = '';
  for (const w of text.trim().split(/\s+/).filter(Boolean)) {
    const next = line ? `${line} ${w}` : w;
    if (line && ctx.measureText(next).width > width) { out.push(line); line = w; } else line = next;
  }
  if (line) out.push(line);
  if (out.length > max) {
    out.length = max;
    let last = out[max - 1];
    while (last.includes(' ') && ctx.measureText(`${last}…`).width > width) last = last.replace(/\s+\S*$/, '');
    out[max - 1] = `${last}…`;
  }
  return out;
}

/**
 * The largest size from `from` down to `to`, `step` at a time, at which `text` is no wider than `width`;
 * `to` when none fits. Swaps the px size in `ctx.font` (set the face first) and leaves it at the answer.
 */
export function fitSize(ctx: Ctx, text: string, width: number, from: number, to: number, step: number): number {
  let s = from;
  const wide = (): boolean => { ctx.font = ctx.font.replace(/[\d.]+px/, `${s}px`); return ctx.measureText(text).width > width; };
  while (wide() && s - step >= to) s -= step;
  return s;
}

const CHIP = 'CONSTITUENT ACTION · CUT THE TIES';
export const CTA = 'YOUR TURN. CALL YOUR REP';
const GUTTER = BAND.right - BAND.left;
/** The stamp's tilt (−4° on the canvas, whose y axis points down). */
const TILT = (4 * Math.PI) / 180;
const SIN = Math.sin(TILT);
const COS = Math.cos(TILT);
/** Stamp padding from the box edge to the text (the 14 px border sits inside it). */
const PAD_X = 44;
const PAD_Y = 34;
/** Bebas Neue is capitals only, 0.7 em tall: the stamp's act line and the block text get a 0.8 em box. */
const CAP = 0.8;
/** The address baseline sits this far above the band's foot, so a descender stays inside the feed crop. */
const FOOT = 16;

/**
 * Pure over the context: background, the acid top rule, then inside the band top to bottom the chip line,
 * the stamp (office, act and tick, date; one box turned −4° about its centre), the title (≤3 lines, 96 px;
 * 84 px when it needs three), the crimson rule, `what_we_want` (44 px, ≤2 lines) and, anchored to the
 * band's foot, the call to action: the acid block, then an arrow and the address. Baselines are alphabetic
 * and a line's box is `size` tall (0.8 em for the capitals-only lines above). The stack clears the block
 * by ≥24 px: when it would not, the act line steps from 200 px to 160 px.
 */
export function drawPoster(ctx: Ctx, spec: PosterSpec): void {
  ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = INK; ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = ACID; ctx.fillRect(0, 0, W, 18);
  const x = BAND.left;
  let y = BAND.top;
  const line = (text: string, size: number, font: string, color: string, gap: number): void => {
    y += size;
    ctx.font = font; ctx.fillStyle = color;
    ctx.fillText(text, x, y);
    y += gap;
  };
  line(CHIP, 40, `700 40px ${MONO}`, HAZARD, 48);

  // Measured before anything below the chip is drawn: what the stack is, and what it has to clear.
  ctx.font = `700 96px ${CONDENSED}`;
  let title = wrapText(ctx, spec.title.toUpperCase(), GUTTER, 3);
  let size = 96;
  if (title.length === 3) { size = 84; ctx.font = `700 84px ${CONDENSED}`; title = wrapText(ctx, spec.title.toUpperCase(), GUTTER, 3); }
  ctx.font = `600 44px ${SANS}`;
  const ask = wrapText(ctx, spec.what, GUTTER, 2);
  const body = title.length * (size + 6) + 74 + ask.length * 58;
  ctx.font = `700 120px ${CONDENSED}`;
  const cta = fitSize(ctx, CTA, GUTTER - 64, 120, 72, 4);
  const block = BAND.bottom - FOOT - 48 - 24 - (cta + 28);

  const date = spec.date.toUpperCase();
  const act = spec.act === 'called' ? 'I CALLED' : 'I WROTE';
  /** The box at act size `s`: `h` tall, `w` wide (its widest line plus padding), `box` tall once turned. */
  const stamp = (s: number) => {
    const h = 2 * PAD_Y + 40 + 14 + CAP * s + 18 + 40;
    const max = Math.floor((GUTTER - h * SIN) / COS) - 2 * PAD_X;
    ctx.font = `700 40px ${MONO}`;
    const dw = ctx.measureText(date).width;
    const os = fitSize(ctx, spec.target.toUpperCase(), max, 40, 32, 2);
    const office = wrapText(ctx, spec.target.toUpperCase(), max, 1)[0] ?? '';
    const ow = Math.min(ctx.measureText(office).width, max);
    ctx.font = `700 ${s}px ${CONDENSED}`;
    const aw = Math.min(ctx.measureText(act).width, max - 0.675 * s);
    const w = Math.min(Math.max(ow, aw + 0.675 * s, dw), max) + 2 * PAD_X;
    return { s, h, w, os, office, ow, aw, dw, box: h * COS + w * SIN };
  };
  let t = stamp(200);
  if (y + t.box + 40 + body + 24 > block) t = stamp(160);
  ctx.save();
  ctx.translate(x + GUTTER / 2, y + t.box / 2);
  ctx.rotate(-TILT);
  ctx.fillStyle = PAPER; ctx.fillRect(-t.w / 2, -t.h / 2, t.w, t.h);
  ctx.strokeStyle = CRIMSON; ctx.lineWidth = 14; ctx.setLineDash([36, 18]);
  ctx.strokeRect(-t.w / 2 + 7, -t.h / 2 + 7, t.w - 14, t.h - 14);
  ctx.setLineDash([]);
  ctx.fillStyle = CRIMSON;
  let ty = -t.h / 2 + PAD_Y + 40;
  ctx.font = `700 ${t.os}px ${MONO}`; ctx.fillText(t.office, -t.ow / 2, ty, t.ow);
  ty += 14 + CAP * t.s;
  const ax = -(t.aw + 0.675 * t.s) / 2;
  ctx.font = `700 ${t.s}px ${CONDENSED}`; ctx.fillText(act, ax, ty, t.aw);
  // The tick: neither face has the glyph.
  const tx = ax + t.aw + 0.12 * t.s;
  ctx.lineWidth = 0.11 * t.s; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(tx, ty - 0.3 * t.s); ctx.lineTo(tx + 0.18 * t.s, ty - 0.08 * t.s); ctx.lineTo(tx + 0.5 * t.s, ty - 0.62 * t.s); ctx.stroke();
  ty += 18 + 40;
  ctx.font = `700 40px ${MONO}`; ctx.fillText(date, -t.dw / 2, ty);
  ctx.restore();
  y += t.box + 40;
  for (const l of title) line(l, size, `700 ${size}px ${CONDENSED}`, NEWSPRINT, 6);
  y += 34;
  ctx.fillStyle = CRIMSON; ctx.fillRect(x, y, GUTTER, 6);
  y += 6 + 34;
  for (const l of ask) line(l, 44, `600 44px ${SANS}`, NEWSPRINT, 14);

  // The call to action anchors to the band's foot: the block, then the arrow and the address under it.
  ctx.fillStyle = ACID; ctx.fillRect(x, block, GUTTER, cta + 28);
  ctx.font = `700 ${cta}px ${CONDENSED}`; ctx.fillStyle = INK;
  const cw = Math.min(ctx.measureText(CTA).width, GUTTER - 64);
  ctx.fillText(CTA, x + (GUTTER - cw) / 2, block + 14 + 0.85 * cta, cw);
  const base = BAND.bottom - FOOT;
  ctx.strokeStyle = ACID; ctx.lineWidth = 8; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(x + 4, base - 17); ctx.lineTo(x + 68, base - 17); ctx.moveTo(x + 50, base - 35); ctx.lineTo(x + 68, base - 17); ctx.lineTo(x + 50, base + 1); ctx.stroke();
  ctx.font = `700 48px ${MONO}`; ctx.fillStyle = ACID;
  ctx.fillText((spec.url ?? SITE).toUpperCase(), x + 92, base, GUTTER - 92);
}

/** "Nov 8, 2026" in the user's locale rules fixed to en-US so the poster reads the same everywhere. */
export function posterDate(d: Date = new Date()): string {
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

/** social-sharing §2.2 target line from the office. */
export function targetLine(role: string, name: string, state?: string | null): string {
  if (/treasurer/i.test(role)) return `THE ${(state ?? '').toUpperCase()} TREASURER`.replace(/\s+/g, ' ');
  return `${role.toUpperCase()} ${surname(name).toUpperCase()}'S OFFICE`;
}

const whose = (role: string, surname: string): string => (/treasurer/i.test(role) ? `the ${role.trim()}` : `${role.trim()} ${surname.trim()}`);

/** social-sharing §2.4 / §3.1: the share-link text and the fallback caption (the line plus the link). */
export function captionFor(type: 'call' | 'letter' | 'public_comment', role: string, surname: string, title: string, slug: string): { text: string; url: string; caption: string } {
  const text = `I just ${type === 'call' ? 'called' : 'wrote to'} ${whose(role, surname)}'s office about ${title}. Yours takes two minutes:`;
  const url = `${SITE_URL}/goals/${slug}?via=share`;
  return { text, url, caption: `${text} ${url}` };
}

/** The poster image's alt text: the act, the office by role and surname, the goal; nothing else. */
export function posterAlt(type: 'call' | 'letter' | 'public_comment', role: string, surname: string, title: string): string {
  return `Poster: I ${type === 'call' ? 'called' : 'wrote to'} ${whose(role, surname)}'s office about ${title}`;
}

/** §3.2 intent links; each opens in a new tab with rel="noopener". */
export function intentLinks(text: string, url: string): { name: string; href: string }[] {
  const t = encodeURIComponent(text);
  const u = encodeURIComponent(url);
  return [
    { name: 'Facebook', href: `https://www.facebook.com/sharer/sharer.php?u=${u}` },
    { name: 'X', href: `https://x.com/intent/tweet?text=${t}&url=${u}` },
    { name: 'Threads', href: `https://www.threads.com/intent/post?text=${t}&url=${u}` },
    { name: 'Bluesky', href: `https://bsky.app/intent/compose?text=${encodeURIComponent(`${text} ${url}`)}` },
  ];
}

/** The file-only payload (§1.2); `files+title` adds the empty title some sheets want. */
export function sharePayload(file: File): ShareData {
  return SHARE_PAYLOAD === 'files+title' ? { files: [file], title: '' } : { files: [file] };
}

/** `navigator.canShare({files})` with the cached file; false without the API. */
export function canShareFile(file: File | null, nav: Navigator = navigator): boolean {
  if (!file) return false;
  const n = nav as Navigator & { canShare?: (d: ShareData) => boolean };
  try { return typeof n.share === 'function' && typeof n.canShare === 'function' && n.canShare(sharePayload(file)); } catch { return false; }
}

/** §2.1: load the faces, draw, encode. `null` on any failure, so the caller falls back to §3 silently. */
export async function posterFile(spec: PosterSpec, name = 'cut-the-ties.png'): Promise<File | null> {
  if (typeof document === 'undefined') return null;
  try {
    const fonts = (document as Document & { fonts?: FontFaceSet }).fonts;
    if (fonts?.load) await Promise.all([fonts.load(`700 96px 'Bebas Neue'`), fonts.load(`700 40px 'Space Mono'`), fonts.load(`600 44px Inter`)]).catch(() => []);
    const c = document.createElement('canvas');
    c.width = W; c.height = H;
    const ctx = c.getContext('2d');
    if (!ctx) return null;
    drawPoster(ctx, spec);
    const blob = await new Promise<Blob | null>((r) => { try { c.toBlob(r, 'image/png'); } catch { r(null); } });
    return blob ? new File([blob], name, { type: 'image/png' }) : null;
  } catch {
    return null;
  }
}
