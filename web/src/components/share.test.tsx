// @vitest-environment happy-dom
// social-sharing §3–4 (one-screen-receipt §3): the receipt share block with the poster pre-rendered by the parent.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { h, render } from 'preact';
import { act } from 'preact/test-utils';
import ShareRow, { receiptSpec, type Poster } from './ShareRow';

const file = new File([new Uint8Array([137, 80, 78, 71])], 'cut-the-ties-ndaa.png', { type: 'image/png' });
const LINE = "I just called Rep. Casar's office about Strip the section. Yours takes two minutes:";
const LINK = 'https://cutthetiesmovement.org/goals/ndaa?via=share';
let root: HTMLElement;
const flush = () => new Promise((r) => setTimeout(r, 0));
const mount = (poster: Poster | null) => act(() => {
  render(h(ShareRow, { type: 'call', role: 'Rep.', name: 'Greg Casar', title: 'Strip the section', slug: 'ndaa', poster }), root);
});
const q = <T extends HTMLElement>(sel: string) => root.querySelector(sel) as T | null;
const buttons = () => [...root.querySelectorAll('[data-share-buttons] > *')].map((e) => e.textContent);
/** §3.1: every share control is bordered and carries one 20 px monochrome inline icon before its text. */
function expectBorderedIconButtons() {
  expect(root.querySelector('.btn-primary')).toBeNull();
  for (const b of root.querySelectorAll('[data-share-poster], [data-share-save], [data-share-copy], [data-share-message]')) {
    expect(b.className).toMatch(/btn-ghost/);
    const svg = b.firstElementChild!;
    expect(svg.tagName.toLowerCase()).toBe('svg');
    expect([svg.getAttribute('width'), svg.getAttribute('height'), svg.getAttribute('stroke'), svg.getAttribute('aria-hidden')]).toEqual(['20', '20', 'currentColor', 'true']);
  }
}

beforeEach(() => {
  root = document.createElement('div'); document.body.append(root);
  Object.assign(URL, { createObjectURL: () => 'blob:poster', revokeObjectURL: () => {} });
  // a phone-width viewport: the intent row appears only from 1024 px or without a share sheet
  window.matchMedia = (() => ({ matches: false, addEventListener() {}, removeEventListener() {} })) as unknown as typeof window.matchMedia;
});
afterEach(() => { render(null, root); root.remove(); vi.useRealTimers(); vi.unstubAllGlobals(); vi.restoreAllMocks(); });

function stubShare(share: ((d: ShareData) => Promise<void>) | undefined, canShare = true) {
  const nav = { ...navigator, clipboard: { writeText: vi.fn(() => Promise.resolve()) } } as Record<string, unknown>;
  if (share) { nav.share = share; nav.canShare = () => canShare; }
  vi.stubGlobal('navigator', nav);
  return nav;
}
const written = (nav: Record<string, unknown>) => (nav.clipboard as { writeText: ReturnType<typeof vi.fn> }).writeText;

describe('ShareRow', () => {
  it('orders thumbnail, Share, Copy link, Message and hands the sheet the file alone', async () => {
    const share = vi.fn(() => Promise.resolve());
    stubShare(share);
    await mount({ file, canShare: true });
    expect(buttons()).toEqual(['Share', 'Copy link', 'Message']);
    expectBorderedIconButtons();
    const thumb = q<HTMLImageElement>('[data-share-thumb]')!;
    expect(thumb.getAttribute('src')).toBe('blob:poster');
    expect(thumb.getAttribute('width')).toBe('96');
    expect(thumb.getAttribute('alt')).toBe("Poster: I called Rep. Casar's office about Strip the section");
    expect(thumb.compareDocumentPosition(q('[data-share-buttons]')!) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(q('[data-share-hint]')!.textContent).toBe('Pick Instagram, then Story, Post, Reel or Message.');
    q('[data-share-poster]')!.click();
    expect(share).toHaveBeenCalledTimes(1);
    expect(share.mock.calls[0][0]).toEqual({ files: [file] });
    expect(q('[data-share-save]')).toBeNull();
    expect(q('[data-share-fallback]')).toBeNull();
    expect(root.textContent).not.toContain('Open Instagram');
    expect(q('[data-share-intents]')).toBeNull(); // narrow viewport with a share sheet: no intents
  });
  it('ignores a dismissed sheet but swaps in "Save poster" when the sheet throws', async () => {
    const abort = Object.assign(new Error('dismissed'), { name: 'AbortError' });
    const share = vi.fn<(d: ShareData) => Promise<void>>().mockRejectedValueOnce(abort).mockRejectedValueOnce(new Error('NotAllowedError'));
    stubShare(share);
    await mount({ file, canShare: true });
    await act(async () => { q('[data-share-poster]')!.click(); await flush(); });
    expect(q('[data-share-poster]')).not.toBeNull();
    await act(async () => { q('[data-share-poster]')!.click(); await flush(); });
    expect(q('[data-share-poster]')).toBeNull();
    expect(q('[data-share-hint]')).toBeNull();
    expect(buttons()).toEqual(['Save poster', 'Copy link', 'Message']);
    expect(q('[data-share-fallback]')).not.toBeNull();
    expectBorderedIconButtons();
  });
  it('without file share: "Save poster" replaces the Instagram button and "Open Instagram ↗" follows the block', async () => {
    const nav = stubShare(vi.fn(() => Promise.resolve()), false);
    await mount({ file, canShare: false });
    expect(buttons()).toEqual(['Save poster', 'Copy link', 'Message']);
    expectBorderedIconButtons();
    const imgs = root.querySelectorAll('img'); // the thumbnail alone: the 270 px inline poster is gone
    expect(imgs.length).toBe(1);
    expect(imgs[0].getAttribute('alt')).toBe("Poster: I called Rep. Casar's office about Strip the section");
    expect(imgs[0].getAttribute('width')).toBe('96');
    const dl = q<HTMLAnchorElement>('[data-share-save]')!;
    expect(dl.tagName).toBe('A');
    expect(dl.getAttribute('download')).toBe('cut-the-ties-ndaa.png');
    expect(dl.getAttribute('href')).toBe('blob:poster');
    expect(root.textContent).toContain('press and hold the image');
    const ig = [...root.querySelectorAll('a')].find((a) => a.textContent?.startsWith('Open Instagram'))!;
    expect(ig.textContent).toBe('Open Instagram ↗');
    expect(ig.getAttribute('href')).toBe('https://www.instagram.com/');
    expect(ig.getAttribute('target')).toBe('_blank');
    expect(ig.getAttribute('rel')).toBe('noopener');
    expect(ig.className).not.toMatch(/btn/);
    expect(q('[data-share-buttons]')!.compareDocumentPosition(ig) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(q('[data-share-buttons]')!.contains(ig)).toBe(false);
    expect(root.textContent).not.toContain('Copy caption');
    expect(q('[data-share-link]')).toBeNull();
    await act(async () => { q('[data-share-copy]')!.click(); await flush(); });
    expect(written(nav)).toHaveBeenCalledWith(`${LINE} ${LINK}`);
    expect(q('[data-share-copy]')!.textContent).toBe('Link copied');
  });
  it('without a share sheet: no "Message", "Copy link" reads "Link copied" for 2 s, and the four intent links open in new tabs', async () => {
    const nav = stubShare(undefined);
    await mount({ file, canShare: false });
    expect(buttons()).toEqual(['Save poster', 'Copy link']);
    expect(q('[data-share-message]')).toBeNull();
    const links = [...root.querySelectorAll('[data-share-intents] a')];
    expect(links.map((a) => a.textContent)).toEqual(['Facebook', 'X', 'Threads', 'Bluesky']);
    for (const a of links) { expect(a.getAttribute('target')).toBe('_blank'); expect(a.getAttribute('rel')).toBe('noopener'); }
    expect(links[1].getAttribute('href')).toContain('x.com/intent/tweet?text=');
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
    await act(async () => { q('[data-share-copy]')!.click(); await Promise.resolve(); await Promise.resolve(); });
    expect(written(nav)).toHaveBeenCalledTimes(1);
    expect(q('[data-share-copy]')!.textContent).toBe('Link copied');
    await act(async () => { vi.advanceTimersByTime(1999); });
    expect(q('[data-share-copy]')!.textContent).toBe('Link copied');
    await act(async () => { vi.advanceTimersByTime(1); });
    expect(q('[data-share-copy]')!.textContent).toBe('Copy link');
  });
  it('offers "Copy link" and "Message" alone while the poster is still rendering or failed to draw, and never prints the first name', async () => {
    stubShare(vi.fn(() => Promise.resolve()));
    await mount(null);
    expect(buttons()).toEqual(['Copy link', 'Message']);
    expect(q('[data-share-thumb]')).toBeNull();
    expect(root.textContent).not.toMatch(/Greg/);
    await mount({ file: null, canShare: false });
    expect(buttons()).toEqual(['Copy link', 'Message']);
    expect(q('[data-share-thumb]')).toBeNull();
    expect(root.textContent).not.toContain('Open Instagram');
    expectBorderedIconButtons();
  });
  it('"Message" hands the sheet text and URL only, and no request leaves the page while sharing', async () => {
    const fetchSpy = vi.fn(); vi.stubGlobal('fetch', fetchSpy);
    const share = vi.fn(() => Promise.resolve());
    stubShare(share);
    await mount({ file, canShare: true });
    q('[data-share-message]')!.click();
    q('[data-share-poster]')!.click();
    expect(share.mock.calls[0][0]).toEqual({ text: LINE, url: LINK });
    expect(share.mock.calls[1][0]).toEqual({ files: [file] });
    expect(fetchSpy).not.toHaveBeenCalled();
  });
  it('from 1024 px the four intent links follow even with a share sheet, carrying the encoded caption and ?via=share link', async () => {
    window.matchMedia = (() => ({ matches: true, addEventListener() {}, removeEventListener() {} })) as unknown as typeof window.matchMedia;
    stubShare(vi.fn(() => Promise.resolve()));
    await mount({ file, canShare: true });
    const t = encodeURIComponent(LINE);
    const u = encodeURIComponent(LINK);
    expect(q('[data-share-poster]')).not.toBeNull();
    expect([...root.querySelectorAll('[data-share-intents] a')].map((a) => a.getAttribute('href'))).toEqual([
      `https://www.facebook.com/sharer/sharer.php?u=${u}`,
      `https://x.com/intent/tweet?text=${t}&url=${u}`,
      `https://www.threads.com/intent/post?text=${t}&url=${u}`,
      `https://bsky.app/intent/compose?text=${t}%20${u}`,
    ]);
  });
  it('receiptSpec picks the stamp act by channel and names the state treasurer without a person', () => {
    const letter = receiptSpec('letter', 'Sen.', 'Alex Padilla', 'CA', 'T', 'W');
    expect(letter).toMatchObject({ act: 'wrote', target: "SEN. PADILLA'S OFFICE", title: 'T', what: 'W' });
    expect(letter).not.toHaveProperty('verb');
    expect(receiptSpec('public_comment', 'Sen.', 'Alex Padilla', 'CA', 'T', 'W').act).toBe('wrote');
    expect(receiptSpec('call', 'Treasurer', 'Fiona Ma', 'CA', 'T', 'W')).toMatchObject({ act: 'called', target: 'THE CA TREASURER' });
  });
});
