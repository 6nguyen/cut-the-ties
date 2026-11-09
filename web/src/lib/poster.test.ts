import { describe, expect, it } from 'vitest';
import { BAND, H, W, captionFor, drawPoster, intentLinks, targetLine, wrapText, type Ctx, type PosterSpec } from './poster';

interface Glyph { text: string; x: number; y: number; size: number; font: string; width: number }

/** A recording context: glyph width is 0.55 em per character (wide, so wrapping is exercised). */
function stub(): { ctx: Ctx; glyphs: Glyph[]; rects: number[][] } {
  const glyphs: Glyph[] = [];
  const rects: number[][] = [];
  let font = '';
  const size = () => Number(/(\d+)px/.exec(font)?.[1] ?? 0);
  const ctx = {
    get font() { return font; },
    set font(v: string) { font = v; },
    fillStyle: '' as string,
    textBaseline: 'alphabetic' as CanvasTextBaseline,
    fillRect: (...r: number[]) => { rects.push(r); },
    measureText: (t: string) => ({ width: t.length * size() * 0.55 }) as TextMetrics,
    fillText: (text: string, x: number, y: number) => { glyphs.push({ text, x, y, size: size(), font, width: text.length * size() * 0.55 }); },
  };
  return { ctx: ctx as unknown as Ctx, glyphs, rects };
}

const SPEC: PosterSpec = {
  verb: 'I just called',
  target: targetLine('Rep.', 'J. Luis Correa', 'CA'),
  title: 'Stop the Israel section of the 2027 military bill before the final vote',
  what: 'Your representative and senators vote no on the final military bill if the Israel integration section is still in it.',
  date: 'Nov 8, 2026',
};
// What the drawer must never receive or print: the fields a receipt screen knows but the poster omits.
const IDENTITY = ['George', 'Nguyen', 'Luis', 'Santa Ana', 'CA-46', '(714)', '555-', 'Dear Representative'];

describe('drawPoster', () => {
  const { ctx, glyphs, rects } = stub();
  drawPoster(ctx, SPEC);
  const all = glyphs.map((g) => g.text).join('\n');

  it('fills the full 1080×1920 canvas first', () => {
    expect(rects[0]).toEqual([0, 0, W, H]);
  });
  it('keeps every glyph box inside y 285–1635 and x 72–1008', () => {
    expect(glyphs.length).toBeGreaterThan(5);
    for (const g of glyphs) {
      expect(g.x).toBe(BAND.left);
      expect(g.y - g.size).toBeGreaterThanOrEqual(BAND.top);
      expect(g.y).toBeLessThanOrEqual(BAND.bottom);
      expect(g.x + g.width).toBeLessThanOrEqual(BAND.right);
    }
  });
  it('reads top to bottom in the §2.2 order', () => {
    const order = ['CONSTITUENT ACTION · CUT THE TIES', 'I JUST CALLED', "REP. CORREA'S OFFICE", 'STOP THE ISRAEL', 'Your representative', 'NOV 8, 2026', 'cutthetiesmovement.org'];
    let last = -1;
    for (const needle of order) {
      const i = glyphs.findIndex((g) => g.text.startsWith(needle));
      expect(i, needle).toBeGreaterThan(last);
      last = i;
    }
    const ys = glyphs.map((g) => g.y);
    expect([...ys].sort((a, b) => a - b)).toEqual(ys);
  });
  it('meets the minimum sizes: headline ≥72, body ≥44, URL ≥40', () => {
    const by = (p: (g: Glyph) => boolean) => glyphs.filter(p).map((g) => g.size);
    expect(by((g) => /^(I JUST|REP\.|STOP|MILITARY|BEFORE|THE)/.test(g.text) && g.font.includes('Bebas')).every((s) => s >= 72)).toBe(true);
    expect(by((g) => g.font.includes('Inter')).every((s) => s >= 44)).toBe(true);
    expect(glyphs.find((g) => g.text === 'cutthetiesmovement.org')?.size).toBeGreaterThanOrEqual(40);
    expect(glyphs.filter((g) => g.font.includes('Bebas') && g.text.startsWith('STOP')).length).toBeLessThanOrEqual(3);
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
