// @vitest-environment happy-dom
// social-sharing §2.3, §3: the receipt share row with the poster pre-rendered by the parent.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { h, render } from 'preact';
import { act } from 'preact/test-utils';
import ShareRow, { receiptSpec, type Poster } from './ShareRow';

const file = new File([new Uint8Array([137, 80, 78, 71])], 'cut-the-ties-ndaa.png', { type: 'image/png' });
let root: HTMLElement;
const flush = () => new Promise((r) => setTimeout(r, 0));
const mount = (poster: Poster | null) => act(() => {
  render(h(ShareRow, { type: 'call', role: 'Rep.', name: 'Greg Casar', title: 'Strip the section', slug: 'ndaa', poster, other: h('a', { href: '/results', 'data-other': true }, 'Your other action') }), root);
});
const buttons = () => [...root.querySelectorAll('[data-share-row] > div:first-child > *')].map((e) => e.textContent);

beforeEach(() => {
  root = document.createElement('div'); document.body.append(root);
  Object.assign(URL, { createObjectURL: () => 'blob:poster', revokeObjectURL: () => {} });
  // a phone-width viewport: the §3.2 intent row appears only from 1024 px or without a share sheet
  window.matchMedia = (() => ({ matches: false, addEventListener() {}, removeEventListener() {} })) as unknown as typeof window.matchMedia;
});
afterEach(() => { render(null, root); root.remove(); vi.unstubAllGlobals(); vi.restoreAllMocks(); });

function stubShare(share: ((d: ShareData) => Promise<void>) | undefined, canShare = true) {
  const nav = { ...navigator, clipboard: { writeText: vi.fn(() => Promise.resolve()) } } as Record<string, unknown>;
  if (share) { nav.share = share; nav.canShare = () => canShare; }
  vi.stubGlobal('navigator', nav);
  return nav;
}

describe('ShareRow', () => {
  it('orders poster, link, other action and hands the sheet the file alone', async () => {
    const share = vi.fn(() => Promise.resolve());
    stubShare(share);
    await mount({ file, canShare: true });
    expect(buttons()).toEqual(['Share poster', 'Share link', 'Your other action']);
    (root.querySelector('[data-share-poster]') as HTMLButtonElement).click();
    expect(share).toHaveBeenCalledTimes(1);
    expect(share.mock.calls[0][0]).toEqual({ files: [file] });
    expect(root.querySelector('[data-share-fallback]')).toBeNull();
    expect(root.querySelector('[data-share-intents]')).toBeNull(); // narrow viewport with a share sheet: no intents
  });
  it('ignores a dismissed sheet but swaps in the fallback row when the sheet throws', async () => {
    const abort = Object.assign(new Error('dismissed'), { name: 'AbortError' });
    const share = vi.fn<(d: ShareData) => Promise<void>>().mockRejectedValueOnce(abort).mockRejectedValueOnce(new Error('NotAllowedError'));
    stubShare(share);
    await mount({ file, canShare: true });
    await act(async () => { (root.querySelector('[data-share-poster]') as HTMLButtonElement).click(); await flush(); });
    expect(root.querySelector('[data-share-poster]')).not.toBeNull();
    await act(async () => { (root.querySelector('[data-share-poster]') as HTMLButtonElement).click(); await flush(); });
    expect(root.querySelector('[data-share-poster]')).toBeNull();
    expect(root.querySelector('[data-share-fallback]')).not.toBeNull();
  });
  it('shows the §3.1 fallback row when canShare is false: inline poster, download, caption, Instagram', async () => {
    const nav = stubShare(vi.fn(() => Promise.resolve()), false);
    await mount({ file, canShare: false });
    expect(buttons()).toEqual(['Share link', 'Your other action']);
    const img = root.querySelector('[data-share-fallback] img') as HTMLImageElement;
    expect(img.getAttribute('alt')).toBe('Poster: Strip the section');
    expect(img.getAttribute('width')).toBe('270');
    const dl = root.querySelector('a[download]') as HTMLAnchorElement;
    expect(dl.getAttribute('download')).toBe('cut-the-ties-ndaa.png');
    const ig = [...root.querySelectorAll('a')].find((a) => a.textContent?.startsWith('Open Instagram'))!;
    expect(ig.getAttribute('href')).toBe('https://www.instagram.com/');
    expect(ig.getAttribute('target')).toBe('_blank');
    expect(ig.getAttribute('rel')).toBe('noopener');
    await act(async () => { ([...root.querySelectorAll('button')].find((b) => b.textContent === 'Copy caption') as HTMLButtonElement).click(); await flush(); });
    const write = (nav.clipboard as { writeText: ReturnType<typeof vi.fn> }).writeText;
    expect(write).toHaveBeenCalledWith("I just called Rep. Casar's office about Strip the section. Yours takes two minutes: https://cutthetiesmovement.org/goals/ndaa?via=share");
    expect(root.textContent).toContain('Caption copied');
  });
  it('without a share sheet, Share link copies the caption and the four intent links open in new tabs', async () => {
    const nav = stubShare(undefined);
    await mount({ file, canShare: false });
    const links = [...root.querySelectorAll('[data-share-intents] a')];
    expect(links.map((a) => a.textContent)).toEqual(['Facebook', 'X', 'Threads', 'Bluesky']);
    for (const a of links) { expect(a.getAttribute('target')).toBe('_blank'); expect(a.getAttribute('rel')).toBe('noopener'); }
    expect(links[1].getAttribute('href')).toContain('x.com/intent/tweet?text=');
    await act(async () => { (root.querySelector('[data-share-link]') as HTMLButtonElement).click(); await flush(); });
    expect((nav.clipboard as { writeText: ReturnType<typeof vi.fn> }).writeText).toHaveBeenCalledTimes(1);
    expect(root.querySelector('[data-share-link]')?.textContent).toBe('Link copied');
  });
  it('offers the link alone while the poster is still rendering, and never prints the first name', async () => {
    stubShare(vi.fn(() => Promise.resolve()));
    await mount(null);
    expect(buttons()).toEqual(['Share link', 'Your other action']);
    expect(root.textContent).not.toMatch(/Greg/);
  });
  it('Share link hands the sheet text and URL only, and no request leaves the page while sharing', async () => {
    const fetchSpy = vi.fn(); vi.stubGlobal('fetch', fetchSpy);
    const share = vi.fn(() => Promise.resolve());
    stubShare(share);
    await mount({ file, canShare: true });
    (root.querySelector('[data-share-link]') as HTMLButtonElement).click();
    (root.querySelector('[data-share-poster]') as HTMLButtonElement).click();
    expect(share.mock.calls[0][0]).toEqual({ text: "I just called Rep. Casar's office about Strip the section. Yours takes two minutes:", url: 'https://cutthetiesmovement.org/goals/ndaa?via=share' });
    expect(share.mock.calls[1][0]).toEqual({ files: [file] });
    expect(fetchSpy).not.toHaveBeenCalled();
  });
  it('from 1024 px the four intent links follow even with a share sheet, carrying the encoded caption and ?via=share link', async () => {
    window.matchMedia = (() => ({ matches: true, addEventListener() {}, removeEventListener() {} })) as unknown as typeof window.matchMedia;
    stubShare(vi.fn(() => Promise.resolve()));
    await mount({ file, canShare: true });
    const t = encodeURIComponent("I just called Rep. Casar's office about Strip the section. Yours takes two minutes:");
    const u = encodeURIComponent('https://cutthetiesmovement.org/goals/ndaa?via=share');
    expect(root.querySelector('[data-share-poster]')).not.toBeNull();
    expect([...root.querySelectorAll('[data-share-intents] a')].map((a) => a.getAttribute('href'))).toEqual([
      `https://www.facebook.com/sharer/sharer.php?u=${u}`,
      `https://x.com/intent/tweet?text=${t}&url=${u}`,
      `https://www.threads.com/intent/post?text=${t}&url=${u}`,
      `https://bsky.app/intent/compose?text=${t}%20${u}`,
    ]);
  });
  it('receiptSpec picks the verb by channel and names the state treasurer without a person', () => {
    expect(receiptSpec('letter', 'Sen.', 'Alex Padilla', 'CA', 'T', 'W')).toMatchObject({ verb: 'I JUST WROTE TO', target: "SEN. PADILLA'S OFFICE" });
    expect(receiptSpec('call', 'Treasurer', 'Fiona Ma', 'CA', 'T', 'W').target).toBe('THE CA TREASURER');
  });
});
