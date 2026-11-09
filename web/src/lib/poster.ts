// social-sharing §2.2: the 1080×1920 poster drawn on the device after a receipt (and after a completed
// captain list, §4). Text and shapes only, the goal card's palette and faces; nothing identifying on it.
// This module is a lazy chunk: ActForm and YourWeek import it only once a share can be offered.
import { surname } from '@worker/names';

/**
 * social-sharing §1.2: the two constants the owner's device matrix sets (docs/prd/social-sharing.md §1).
 * `SHARE_PAYLOAD` — `'files'` hands the OS sheet the poster alone; `'files+title'` adds `title: ''` for
 * sheets that need it. `POSTER_LABEL` — "Share to Instagram" once Story is offered on both platforms.
 * Defaults until the matrix runs: files only, "Share poster".
 */
export const SHARE_PAYLOAD: 'files' | 'files+title' = 'files';
export const POSTER_LABEL = 'Share poster';

export const W = 1080;
export const H = 1920;
/** The central 4:5 band a feed post crops to: every glyph stays inside it (y 285–1635) and the 72 px gutters. */
export const BAND = { top: 285, bottom: 1635, left: 72, right: 1008 } as const;
export const SITE = 'cutthetiesmovement.org';
export const SITE_URL = `https://${SITE}`;

const INK = '#090A0F';
const NEWSPRINT = '#FAF7F0';
const ACID = '#00E876';
const CRIMSON = '#E11148';
const HAZARD = '#FACC15';
const CONDENSED = "'Bebas Neue', Impact, 'Arial Narrow', 'Helvetica Neue', Arial, sans-serif";
const MONO = "'Space Mono', Menlo, monospace";
const SANS = "Inter, 'Helvetica Neue', Arial, sans-serif";

export interface PosterSpec {
  /** "I JUST CALLED" / "I JUST WROTE TO" / "THREE OF US ARE CALLING" */
  verb: string;
  /** "REP. CORREA'S OFFICE" / "THE TX TREASURER" / "REP. CASAR'S OFFICE BEFORE DEC 10" */
  target: string;
  title: string;
  /** The goal's one-line `what_we_want`. */
  what: string;
  /** "Nov 8, 2026" */
  date: string;
  /** Drawn at the foot of the band; defaults to the site host. */
  url?: string;
}

/** The subset of CanvasRenderingContext2D the draw uses, so a test can pass a recording stub. */
export type Ctx = Pick<CanvasRenderingContext2D, 'fillRect' | 'fillText' | 'measureText'> & { fillStyle: string | CanvasGradient | CanvasPattern; font: string; textBaseline: CanvasTextBaseline };

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

const CHIP = 'CONSTITUENT ACTION · CUT THE TIES';
const GUTTER = BAND.right - BAND.left;

/**
 * Pure over the context: background, the acid top rule, then inside the band top to bottom the chip line,
 * the verb line, the target line, the title (≤3 lines, 96 px; 84 px when it needs three), the crimson rule,
 * `what_we_want` (44 px, ≤2 lines), the date and the URL. Baselines are alphabetic; each line's box is
 * `size` tall, so the first baseline sits `size` below the band top and the URL's at the band bottom.
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
  line(CHIP, 40, `700 40px ${MONO}`, HAZARD, 56);
  line(spec.verb.toUpperCase(), 72, `700 72px ${CONDENSED}`, NEWSPRINT, 8);
  for (const l of wrapText(ctx, spec.target.toUpperCase(), GUTTER, 2)) line(l, 72, `700 72px ${CONDENSED}`, ACID, 8);
  y += 40;
  ctx.font = `700 96px ${CONDENSED}`;
  let title = wrapText(ctx, spec.title.toUpperCase(), GUTTER, 3);
  let size = 96;
  if (title.length === 3) { size = 84; ctx.font = `700 84px ${CONDENSED}`; title = wrapText(ctx, spec.title.toUpperCase(), GUTTER, 3); }
  for (const l of title) line(l, size, `700 ${size}px ${CONDENSED}`, NEWSPRINT, 6);
  y += 34;
  ctx.fillStyle = CRIMSON; ctx.fillRect(x, y, GUTTER, 6);
  y += 6 + 34;
  ctx.font = `600 44px ${SANS}`;
  for (const l of wrapText(ctx, spec.what, GUTTER, 2)) line(l, 44, `600 44px ${SANS}`, NEWSPRINT, 14);
  // The date and URL anchor to the band's foot so the body never runs into them.
  const url = spec.url ?? SITE;
  ctx.font = `700 40px ${MONO}`; ctx.fillStyle = HAZARD;
  ctx.fillText(spec.date.toUpperCase(), x, BAND.bottom - 48 - 40);
  ctx.font = `700 48px ${MONO}`; ctx.fillStyle = ACID;
  ctx.fillText(url, x, BAND.bottom);
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

/** social-sharing §2.4 / §3.1: the share-link text and the fallback caption (the line plus the link). */
export function captionFor(type: 'call' | 'letter' | 'public_comment', role: string, surname: string, title: string, slug: string): { text: string; url: string; caption: string } {
  const verb = type === 'call' ? 'called' : 'wrote to';
  const who = /treasurer/i.test(role) ? `the ${role.trim()}` : `${role.trim()} ${surname.trim()}`;
  const text = `I just ${verb} ${who}'s office about ${title}. Yours takes two minutes:`;
  const url = `${SITE_URL}/goals/${slug}?via=share`;
  return { text, url, caption: `${text} ${url}` };
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
