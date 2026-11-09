import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { loadRows } from '@worker/load';
import { BAND, CTA, H, W, captionFor, drawPoster, fitSize, intentLinks, posterAlt, targetLine, wrapText, type Ctx, type PosterSpec } from './poster';

type Pt = [number, number];
/** `box` is the text box on the canvas (its four corners after the transform); `local` is the same box before it. */
interface Glyph { text: string; size: number; font: string; fill: string; width: number; local: number[]; box: Pt[]; turned: boolean }
interface Rect { fill: string; corners: Pt[]; r: number[]; turned: boolean }
interface Stroke { style: string; width: number; cap: string; dash: number[]; pts: Pt[] }

const ACID = '#00E876';
const CRIMSON = '#E11148';
const PAPER = '#FFFFFF';
const xs = (p: Pt[]) => p.map((q) => q[0]);
const ys = (p: Pt[]) => p.map((q) => q[1]);
const aabb = (p: Pt[]) => [Math.min(...xs(p)), Math.min(...ys(p)), Math.max(...xs(p)), Math.max(...ys(p))];
const overlap = (a: number[], b: number[]) => a[0] < b[2] && b[0] < a[2] && a[1] < b[3] && b[1] < a[3];

/**
 * A recording context that tracks translate/rotate. Glyph width: Space Mono's real 0.612 em per character;
 * `em` per character for the other faces (0.42 is close to Bebas Neue, 0.55 to the fallback faces, wide
 * enough that wrapping, the fit steps and `maxWidth` are all exercised). A capitals-only Bebas line has a
 * 0.8 em box, every other line a 1 em box.
 */
function stub(em = 0.55): { ctx: Ctx; glyphs: Glyph[]; rects: Rect[]; strokes: Stroke[] } {
  const glyphs: Glyph[] = [];
  const rects: Rect[] = [];
  const strokes: Stroke[] = [];
  let font = '';
  let m = [1, 0, 0, 1, 0, 0];
  const saved: number[][] = [];
  let dash: number[] = [];
  let path: Pt[] = [];
  const size = () => Number(/([\d.]+)px/.exec(font)?.[1] ?? 0);
  const widthOf = (t: string) => t.length * size() * (font.includes('Mono') ? 0.612 : em);
  const pt = (x: number, y: number): Pt => [m[0] * x + m[2] * y + m[4], m[1] * x + m[3] * y + m[5]];
  const quad = (x0: number, y0: number, x1: number, y1: number): Pt[] => [pt(x0, y0), pt(x1, y0), pt(x1, y1), pt(x0, y1)];
  const turned = () => m[1] !== 0;
  const ctx = {
    get font() { return font; },
    set font(v: string) { font = v; },
    fillStyle: '' as string,
    strokeStyle: '' as string,
    lineWidth: 1,
    lineCap: 'butt' as CanvasLineCap,
    textBaseline: 'alphabetic' as CanvasTextBaseline,
    save: () => { saved.push(m); },
    restore: () => { m = saved.pop() ?? m; },
    translate: (x: number, y: number) => { m = [m[0], m[1], m[2], m[3], ...pt(x, y)]; },
    rotate: (a: number) => { const c = Math.cos(a), n = Math.sin(a); m = [m[0] * c + m[2] * n, m[1] * c + m[3] * n, m[2] * c - m[0] * n, m[3] * c - m[1] * n, m[4], m[5]]; },
    setLineDash: (d: number[]) => { dash = d; },
    fillRect: (x: number, y: number, w: number, h: number) => { rects.push({ fill: ctx.fillStyle, corners: quad(x, y, x + w, y + h), r: [x, y, w, h], turned: turned() }); },
    strokeRect: (x: number, y: number, w: number, h: number) => { const o = ctx.lineWidth / 2; strokes.push({ style: ctx.strokeStyle, width: ctx.lineWidth, cap: ctx.lineCap, dash, pts: quad(x - o, y - o, x + w + o, y + h + o) }); },
    beginPath: () => { path = []; },
    moveTo: (x: number, y: number) => { path.push(pt(x, y)); },
    lineTo: (x: number, y: number) => { path.push(pt(x, y)); },
    stroke: () => { strokes.push({ style: ctx.strokeStyle, width: ctx.lineWidth, cap: ctx.lineCap, dash, pts: path }); },
    measureText: (t: string) => ({ width: widthOf(t) }) as TextMetrics,
    fillText: (text: string, x: number, y: number, max?: number) => {
      const width = Math.min(widthOf(text), max ?? Infinity);
      const top = y - size() * (font.includes('Bebas') && (turned() || text === CTA) ? 0.8 : 1);
      glyphs.push({ text, size: size(), font, fill: ctx.fillStyle, width, local: [x, top, x + width, y], box: quad(x, top, x + width, y), turned: turned() });
    },
  };
  return { ctx: ctx as unknown as Ctx, glyphs, rects, strokes };
}

const SPEC: PosterSpec = {
  act: 'called',
  target: targetLine('Rep.', 'J. Luis Correa', 'CA'),
  title: 'Stop the Israel section of the 2027 military bill before the final vote',
  what: 'Your representative and senators vote no on the final military bill if the Israel integration section is still in it.',
  date: 'Nov 8, 2026',
};
// What the drawer must never receive or print: the fields a receipt screen knows but the poster omits.
const IDENTITY = ['George', 'Nguyen', 'Luis', 'Santa Ana', 'CA-46', '(714)', '555-', 'Dear Representative'];
const draw = (spec: PosterSpec, em?: number) => { const s = stub(em); drawPoster(s.ctx, spec); return s; };
/** Everything drawn after the background and the top rule must lie inside the band: text boxes, fills, stroke points with half the line width. */
function expectInBand({ glyphs, rects, strokes }: ReturnType<typeof stub>): void {
  const pts: Pt[] = [...glyphs.flatMap((g) => g.box), ...rects.slice(2).flatMap((r) => r.corners)];
  for (const s of strokes) for (const [x, y] of s.pts) { const o = s.dash.length ? 0 : s.width / 2; pts.push([x - o, y - o], [x + o, y + o]); }
  expect(Math.min(...xs(pts))).toBeGreaterThanOrEqual(BAND.left);
  expect(Math.max(...xs(pts))).toBeLessThanOrEqual(BAND.right);
  expect(Math.min(...ys(pts))).toBeGreaterThanOrEqual(BAND.top);
  expect(Math.max(...ys(pts))).toBeLessThanOrEqual(BAND.bottom);
}
/** No two text boxes overlap: stamp lines against each other in the stamp's own frame, everything else on the canvas with the stamp as one box. */
function expectNoOverlap({ glyphs, rects }: ReturnType<typeof stub>): void {
  const inStamp = glyphs.filter((g) => g.turned);
  for (const [i, a] of inStamp.entries()) for (const b of inStamp.slice(i + 1)) expect(overlap(a.local, b.local), `${a.text} / ${b.text}`).toBe(false);
  const boxes = glyphs.filter((g) => !g.turned).map((g) => ({ name: g.text, b: aabb(g.box) }));
  const paper = rects.find((r) => r.fill === PAPER);
  if (paper) boxes.push({ name: 'stamp', b: aabb(paper.corners) });
  for (const [i, a] of boxes.entries()) for (const b of boxes.slice(i + 1)) expect(overlap(a.b, b.b), `${a.name} / ${b.name}`).toBe(false);
}
const blockOf = (rects: Rect[]) => rects.slice(2).find((r) => r.fill === ACID)!;
/** The gap between the last line of the stack (its baseline) and the call-to-action block. */
function clearance({ glyphs, rects }: ReturnType<typeof stub>): number {
  const top = blockOf(rects).r[1];
  return top - Math.max(...glyphs.filter((g) => g.text !== CTA && aabb(g.box)[1] < top).map((g) => aabb(g.box)[3]));
}

describe('drawPoster', () => {
  const { glyphs, rects, strokes } = draw(SPEC);
  const all = glyphs.map((g) => g.text).join('\n');

  it('fills the full 1080×1920 canvas first', () => {
    expect(rects[0].r).toEqual([0, 0, W, H]);
  });
  it('keeps every glyph box, the stamp corners, the tick, the block and the arrow inside y 285–1635 and x 72–1008', () => {
    expect(glyphs.length).toBeGreaterThan(7);
    for (const em of [0.3, 0.42, 0.55]) for (const spec of [SPEC, { ...SPEC, act: 'wrote' as const }]) expectInBand(draw(spec, em));
    expectInBand(draw(SPEC, 0.7)); // wider than any fallback face: the stamp and the block still hold their lines
  });
  it('reads top to bottom: chip, stamp (office, act, date), title, ask, call to action, address', () => {
    const order = ['CONSTITUENT ACTION · CUT THE TIES', "REP. CORREA'S OFFICE", 'I CALLED', 'NOV 8, 2026', 'STOP THE ISRAEL', 'Your representative', CTA, 'CUTTHETIESMOVEMENT.ORG'];
    let last = -1;
    for (const needle of order) {
      const i = glyphs.findIndex((g) => g.text.startsWith(needle));
      expect(i, needle).toBeGreaterThan(last);
      last = i;
    }
    const mid = glyphs.map((g) => (aabb(g.box)[1] + aabb(g.box)[3]) / 2);
    expect([...mid].sort((a, b) => a - b)).toEqual(mid);
  });
  it('draws the stamp as one paper box turned −4° about its centre, centred in the band, with a 14 px dashed crimson border', () => {
    const paper = rects.filter((r) => r.fill === PAPER);
    expect(paper).toHaveLength(1);
    const [tl, tr] = paper[0].corners;
    expect((Math.atan2(tr[1] - tl[1], tr[0] - tl[0]) * 180) / Math.PI).toBeCloseTo(-4, 6);
    expect(xs(paper[0].corners).reduce((a, b) => a + b, 0) / 4).toBeCloseTo((BAND.left + BAND.right) / 2, 6);
    const border = strokes.find((s) => s.dash.length > 0)!;
    expect(border).toMatchObject({ style: CRIMSON, width: 14 });
    // the border's outer edge is the box edge, so the four corners checked above are the stamp's outermost points
    for (const [i, c] of border.pts.entries()) { expect(c[0]).toBeCloseTo(paper[0].corners[i][0], 6); expect(c[1]).toBeCloseTo(paper[0].corners[i][1], 6); }
    expect(strokes.filter((s) => s.dash.length > 0)).toHaveLength(1);
  });
  it('sets three centred crimson lines in the stamp: office 40 px mono, act 200 px Bebas Neue with a stroked tick, date 40 px mono', () => {
    const lines = glyphs.filter((g) => g.turned);
    expect(lines.map((g) => [g.text, g.size, g.fill])).toEqual([["REP. CORREA'S OFFICE", 40, CRIMSON], ['I CALLED', 200, CRIMSON], ['NOV 8, 2026', 40, CRIMSON]]);
    expect(lines[0].font).toContain('Space Mono'); expect(lines[1].font).toContain('Bebas Neue'); expect(lines[2].font).toContain('Space Mono');
    expect((lines[0].local[0] + lines[0].local[2]) / 2).toBeCloseTo(0, 6);
    expect((lines[2].local[0] + lines[2].local[2]) / 2).toBeCloseTo(0, 6);
    const tick = strokes.find((s) => s.style === CRIMSON && s.dash.length === 0)!;
    expect(tick.pts).toHaveLength(3);
    // the act and its tick are centred as one group, the tick to the right of the word and above its baseline
    const { glyphs: g2, strokes: s2 } = draw({ ...SPEC, title: 'T', what: 'W' }, 0.42);
    const a = g2.find((g) => g.text === 'I CALLED')!;
    const paperless = s2.find((s) => s.style === CRIMSON && s.dash.length === 0)!;
    expect(Math.min(...xs(paperless.pts))).toBeGreaterThan(aabb(a.box)[0]);
    expect(a.size).toBe(200);
  });
  it('stamps "I WROTE" for a letter, a comment or an emailed script, and never "I JUST"', () => {
    const wrote = draw({ ...SPEC, act: 'wrote' }).glyphs.map((g) => g.text);
    expect(wrote).toContain('I WROTE');
    expect(wrote).not.toContain('I CALLED');
    expect(`${all}\n${wrote.join('\n')}`).not.toMatch(/I JUST/);
  });
  it('steps a long office line down to 32 px, then ends it in an ellipsis, still on one line inside the stamp', () => {
    const fit = draw({ ...SPEC, target: "REP. WASSERMAN SCHULTZ'S OFFICE" }).glyphs.find((g) => g.turned)!;
    expect(fit.text).toBe("REP. WASSERMAN SCHULTZ'S OFFICE");
    expect(fit.size).toBe(40);
    const s = draw({ ...SPEC, target: 'THE COMMONWEALTH OF THE NORTHERN MARIANA ISLANDS TREASURER' });
    const long = s.glyphs.filter((g) => g.turned);
    expect(long).toHaveLength(3);
    expect(long[0].size).toBe(32);
    expect(long[0].text.endsWith('…')).toBe(true);
    expectInBand(s); expectNoOverlap(s);
  });
  it('puts "YOUR TURN. CALL YOUR REP" on one line inside its full-width acid block at the size fitSize returns, never clipped', () => {
    for (const [em, want] of [[0.3, 120], [0.42, 84], [0.55, 72], [0.7, 72]] as const) {
      const s = draw(SPEC, em);
      const block = blockOf(s.rects);
      const text = s.glyphs.filter((g) => g.text === CTA);
      expect(text).toHaveLength(1);
      expect(text[0].size).toBe(want);
      expect(text[0].font).toContain('Bebas Neue');
      expect([block.r[0], block.r[2]]).toEqual([BAND.left, BAND.right - BAND.left]);
      const [x0, y0, x1, y1] = aabb(text[0].box);
      expect(x0).toBeGreaterThanOrEqual(block.r[0] + 32);
      expect(x1).toBeLessThanOrEqual(block.r[0] + block.r[2] - 32);
      expect(y0).toBeGreaterThanOrEqual(block.r[1]);
      expect(y1).toBeLessThanOrEqual(block.r[1] + block.r[3]);
    }
  });
  it('draws an acid arrow and the address under the block, the baseline above the band foot', () => {
    const block = blockOf(rects);
    const addr = glyphs.at(-1)!;
    expect(addr).toMatchObject({ text: 'CUTTHETIESMOVEMENT.ORG', size: 48, fill: ACID });
    expect(addr.font).toContain('Space Mono');
    expect(addr.local[3]).toBeLessThanOrEqual(BAND.bottom - 12); // room for a descender inside the feed crop
    expect(addr.local[1]).toBeGreaterThanOrEqual(block.r[1] + block.r[3]);
    const arrow = strokes.find((s) => s.style === ACID)!;
    expect(arrow.pts.length).toBeGreaterThanOrEqual(4);
    expect(Math.max(...xs(arrow.pts))).toBeLessThan(addr.local[0]);
    expect(Math.min(...ys(arrow.pts))).toBeGreaterThanOrEqual(block.r[1] + block.r[3]);
  });
  it('for every goal in data/goals no two text boxes overlap and the stack clears the call to action by ≥24 px', () => {
    const goals = loadRows(join(process.cwd(), '..', 'data')).goals;
    expect(goals.length).toBeGreaterThanOrEqual(5);
    const targets = [targetLine('Sen.', 'Andy Kim'), targetLine('Rep.', 'Debbie Wasserman Schultz'), targetLine('Treasurer', 'Fiona Ma', 'CA')];
    for (const g of goals) for (const act of ['called', 'wrote'] as const) for (const target of targets) for (const em of [0.42, 0.55]) {
      const s = draw({ act, target, title: g.title, what: g.what_we_want, date: 'Nov 8, 2026' }, em);
      expectInBand(s); expectNoOverlap(s);
      expect(clearance(s), g.slug).toBeGreaterThanOrEqual(24);
    }
    // the worst case: a three-line title and a two-line ask in the widest face
    const worst = draw(SPEC, 0.7);
    expect(worst.glyphs.filter((g) => g.text.startsWith('STOP') || g.size === 84).length).toBe(3);
    expect(worst.glyphs.filter((g) => g.font.includes('Inter'))).toHaveLength(2);
    expectNoOverlap(worst);
    expect(clearance(worst)).toBeGreaterThanOrEqual(24);
    expect([200, 160]).toContain(worst.glyphs.find((g) => g.text === 'I CALLED')!.size);
  });
  it('one-screen-receipt §4.3: no poster carries the captain-list lines; a spec with a stale `verb` draws the stamp like any other', () => {
    const s = draw({ ...SPEC, verb: 'THREE OF US ARE CALLING' } as PosterSpec);
    const texts = s.glyphs.map((g) => g.text);
    expect(texts).toEqual(draw(SPEC).glyphs.map((g) => g.text));
    expect(texts).toContain('I CALLED');
    expect(texts.join(' ')).not.toMatch(/THREE OF US|BEFORE/);
    expect(s.rects.some((r) => r.fill === PAPER)).toBe(true);
  });
  it('meets the minimum sizes: title ≥72, body ≥44, call to action ≥72, address ≥40', () => {
    const by = (p: (g: Glyph) => boolean) => glyphs.filter(p).map((g) => g.size);
    const title = by((g) => g.font.includes('Bebas') && !g.turned && g.text !== CTA);
    expect(title.length).toBeGreaterThan(0);
    expect(title.length).toBeLessThanOrEqual(3);
    expect(title.every((s) => s >= 72)).toBe(true);
    expect(by((g) => g.font.includes('Inter')).every((s) => s >= 44)).toBe(true);
    expect(by((g) => g.text === CTA)[0]).toBeGreaterThanOrEqual(72);
    expect(glyphs.at(-1)!.size).toBeGreaterThanOrEqual(40);
  });
  it('prints no identity string', () => {
    for (const s of IDENTITY) expect(all).not.toContain(s);
    expect(all).not.toMatch(/\d{3}[-.)]\s?\d{3}/);
  });
  it('uses the goal card palette and faces', () => {
    expect(glyphs.some((g) => g.font.includes('Space Mono'))).toBe(true);
    expect(glyphs.some((g) => g.font.includes('Bebas Neue'))).toBe(true);
    expect(glyphs.some((g) => g.font.includes('Inter'))).toBe(true);
  });
});

describe('fitSize', () => {
  it('returns the largest size in the steps that fits, the floor when none does, and leaves the font there', () => {
    const { ctx } = stub(0.5);
    ctx.font = "700 120px 'Bebas Neue', Impact";
    expect(fitSize(ctx, 'x'.repeat(10), 600, 120, 72, 4)).toBe(120); // 600 wide at 120
    expect(fitSize(ctx, 'x'.repeat(10), 599, 120, 72, 4)).toBe(116);
    expect(ctx.font).toBe("700 116px 'Bebas Neue', Impact");
    expect(fitSize(ctx, 'x'.repeat(10), 401, 120, 72, 4)).toBe(80);
    expect(fitSize(ctx, 'x'.repeat(10), 100, 120, 72, 4)).toBe(72);
    expect(ctx.font).toBe("700 72px 'Bebas Neue', Impact");
    expect(fitSize(ctx, 'x'.repeat(10), 170, 40, 32, 2)).toBe(34);
    expect(fitSize(ctx, 'x'.repeat(10), 170, 40, 33, 2)).toBe(34);
    expect(fitSize(ctx, 'x'.repeat(10), 100, 40, 33, 2)).toBe(34); // never below `to`
  });
});

describe('wrapText', () => {
  it('wraps greedily and ellipsises past the line cap', () => {
    const { ctx } = stub();
    ctx.font = '700 96px x';
    const lines = wrapText(ctx, 'one two three four five six seven eight nine ten eleven twelve thirteen fourteen', BAND.right - BAND.left, 2);
    expect(lines).toHaveLength(2);
    expect(lines[1].endsWith('…')).toBe(true);
    for (const l of lines) expect(ctx.measureText(l).width).toBeLessThanOrEqual(BAND.right - BAND.left);
  });
});

describe('targetLine', () => {
  it('keeps the surname only, and names the state treasurer without a person', () => {
    expect(targetLine('Sen.', 'Alex Padilla')).toBe("SEN. PADILLA'S OFFICE");
    expect(targetLine('Treasurer', 'Fiona Ma', 'ca')).toBe('THE CA TREASURER');
  });
  it('drops a generational suffix instead of naming the office after it', () => {
    expect(targetLine('Rep.', 'Frank Pallone, Jr.')).toBe("REP. PALLONE'S OFFICE");
    expect(targetLine('Rep.', 'Rudy Yakym III')).toBe("REP. YAKYM'S OFFICE");
  });
});

describe('posterAlt', () => {
  it('names the act, the office by role and surname, and the goal', () => {
    expect(posterAlt('call', 'Rep.', 'Correa', 'Stop the Israel section')).toBe("Poster: I called Rep. Correa's office about Stop the Israel section");
    expect(posterAlt('letter', 'Sen.', 'Padilla', 'T')).toBe("Poster: I wrote to Sen. Padilla's office about T");
    expect(posterAlt('public_comment', 'Treasurer', 'Ma', 'T')).toBe("Poster: I wrote to the Treasurer's office about T");
  });
});

describe('captionFor', () => {
  it('builds the §2.4 line with the ?via=share deep link', () => {
    const c = captionFor('call', 'Rep.', 'Correa', 'Stop the Israel section', 'ndaa-report-vote');
    expect(c.text).toBe("I just called Rep. Correa's office about Stop the Israel section. Yours takes two minutes:");
    expect(c.url).toBe('https://cutthetiesmovement.org/goals/ndaa-report-vote?via=share');
    expect(captionFor('letter', 'Sen.', 'Padilla', 'T', 's').text.startsWith('I just wrote to')).toBe(true);
    expect(c.caption).toBe(`${c.text} ${c.url}`);
  });
  it('links the four intents with the text and url encoded', () => {
    const links = intentLinks('Hi & bye', 'https://cutthetiesmovement.org/goals/x?via=share');
    expect(links.map((l) => l.name)).toEqual(['Facebook', 'X', 'Threads', 'Bluesky']);
    expect(links[0].href).toBe('https://www.facebook.com/sharer/sharer.php?u=https%3A%2F%2Fcutthetiesmovement.org%2Fgoals%2Fx%3Fvia%3Dshare');
    expect(links[1].href).toContain('x.com/intent/tweet?text=Hi%20%26%20bye&url=');
    expect(links[3].href).toContain('bsky.app/intent/compose?text=Hi%20%26%20bye%20https%3A');
  });
});
