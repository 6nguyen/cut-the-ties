// @vitest-environment happy-dom
// email-button §1: the email step lives under the call buttons, is promoted when every office is closed, follows
// a no_answer or reported call, assembles the message from the body on screen, and posts one receipt with channel 'email'.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { h, render } from 'preact';
import { act } from 'preact/test-utils';
import ActForm, { allClosed, emailMessage, fieldHint } from './ActForm';
import type { GenerateDone } from '@worker/generate';

const OPEN = Date.parse('2026-11-02T15:00:00Z'); // Monday 10:00 Eastern
const CLOSED = Date.parse('2026-11-03T04:00:00Z'); // Monday 23:00 Eastern, 20:00 Pacific: DC and the CA district office both shut
const fields = [
  { name: 'first_name', label: 'First name', max: 40, required: true, multiline: false },
  { name: 'city', label: 'City', max: 60, required: true, multiline: false },
  { name: 'why', label: 'Why', max: 280, required: true, multiline: true },
];
const done = (over: Partial<GenerateDone['target']> = {}): GenerateDone => ({
  subject: '', body: 'Line one.\nLine two.', facts_used: [], words: 4, standard: false,
  target: { id: 'C001110', name: 'Lou Correa', role: 'Rep.', phones: ['202-225-2965', '714-559-6190'], contact_form_url: 'https://correa.house.gov/contact', contact_kind: 'zip_gate', chamber: 'house', ...over },
});
const sse = (d: GenerateDone) => new Response(`event: done\ndata: ${JSON.stringify(d)}\n\n`, { status: 200, headers: { 'content-type': 'text/event-stream' } });
const json = (o: unknown, status = 200) => new Response(JSON.stringify(o), { status });

let root: HTMLElement;
let calls: { url: string; body: Record<string, unknown> | null }[];
const flush = () => act(async () => { await new Promise((r) => setTimeout(r, 0)); });
const click = (sel: string) => act(() => { (root.querySelector(sel) as HTMLElement).click(); });
const type = (sel: string, value: string) => act(() => { const el = root.querySelector(sel) as HTMLInputElement; el.value = value; el.dispatchEvent(new Event('input', { bubbles: true })); });
const q = (sel: string) => root.querySelector(sel);
const texts = (sel: string) => [...root.querySelectorAll(sel)].map((e) => e.textContent);

async function mount(d: GenerateDone, now: number) {
  vi.useFakeTimers({ now, toFake: ['Date'] });
  localStorage.setItem('cut-ties:place', JSON.stringify({ state: 'CA', district: 46 }));
  calls = [];
  vi.stubGlobal('fetch', vi.fn(async (url: string, init?: RequestInit) => {
    calls.push({ url, body: init?.body ? (JSON.parse(String(init.body)) as Record<string, unknown>) : null });
    if (url.includes('/targets')) return json({ targets: [{ bioguide_id: 'C001110', role: 'Rep.', name: 'Lou Correa' }] });
    if (url === '/api/generate') return sse(d);
    if (url === '/api/receipt') return json({ id: 7 });
    if (url === '/api/report') return json({ ok: true });
    throw new Error(`unexpected ${url}`);
  }));
  Object.defineProperty(navigator, 'clipboard', { value: { writeText: vi.fn(async () => {}) }, configurable: true });
  await act(() => { render(h(ActForm, { goal: 'ndaa-1217', action: 'ndaa-1217-call', type: 'call', scope: 'both', fields, fmt: { min_words: 1, max_words: 500 } as never, title: 'Strip 1217', decision: '2026-12-10', emailSubject: 'Constituent in {city}: get section 1217 out' }), root); });
  await flush();
  type('#first_name', 'Maria'); type('#city', 'Santa Ana'); type('#why', 'Because.');
  await click('button[type=submit]');
  await flush(); await flush();
  expect(q('[data-output-side]')).not.toBeNull();
}

beforeEach(() => { localStorage.clear(); root = document.createElement('div'); document.body.appendChild(root); });
afterEach(() => { render(null, root); root.remove(); vi.unstubAllGlobals(); vi.useRealTimers(); });

describe('email step (email-button §1)', () => {
  it('offices open: tel buttons, then only the "I can\'t call right now" link; nothing email-shaped above or beside them', async () => {
    await mount(done(), OPEN);
    const side = q('[data-output-side]')!;
    const kids = [...side.firstElementChild!.children];
    expect(kids.filter((k) => k.matches('a[href^="tel:"], span')).length).toBe(2);
    expect(q('[data-email-closed]')).toBeNull();
    expect(q('[data-email-step]')).toBeNull();
    const link = q('[data-email-link]')!;
    expect(link.textContent).toBe("I can't call right now");
    expect(link.className).not.toMatch(/btn/);
    // the link sits after both tel buttons
    expect(kids.indexOf(link)).toBeGreaterThan(kids.indexOf(root.querySelectorAll('span')[1]));
  });

  it('23:00 ET: "Both offices are closed. Email instead" is a primary button and the tel buttons stay', async () => {
    await mount(done(), CLOSED);
    expect(root.querySelectorAll('a[href^="tel:"]').length).toBe(2);
    const btn = q('[data-email-closed]')!;
    expect(btn.textContent).toBe('Both offices are closed. Email instead');
    expect(btn.className).toMatch(/btn-primary/);
    expect(q('[data-email-link]')).toBeNull();
  });

  it('one office: "The office is closed. Email instead"', async () => {
    await mount(done({ phones: ['202-224-3553'] }), CLOSED);
    expect(q('[data-email-closed]')!.textContent).toBe('The office is closed. Email instead');
  });

  it('opens the card with the subject, the body verbatim between greeting and signature, the labelled link and the House hint; no new /api/generate', async () => {
    await mount(done(), OPEN);
    const generated = calls.filter((c) => c.url === '/api/generate').length;
    await click('[data-email-link]');
    const step = q('[data-email-step]')!;
    expect(step.textContent).toMatch(/Send it in writing/);
    expect(q('[data-email-subject]')!.textContent).toBe('Constituent in Santa Ana: get section 1217 out');
    expect(q('[data-email-message]')!.textContent).toBe('Dear Rep. Correa,\n\nLine one.\nLine two.\n\nMaria, Santa Ana');
    const a = q('[data-contact-link]') as HTMLAnchorElement;
    expect(a.textContent).toBe('Open the contact form (asks for your ZIP first) ↗');
    expect(a.getAttribute('href')).toBe('https://correa.house.gov/contact');
    expect(a.getAttribute('target')).toBe('_blank');
    expect(q('[data-field-hint]')!.textContent).toMatch(/^The form asks for your name, address and ZIP/);
    expect(root.querySelectorAll('a[href^="tel:"]').length).toBe(0); // in place of the call row
    expect(texts('button')).not.toContain('I did it');
    await click('[data-email-step] button.btn-ghost');
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith('Constituent in Santa Ana: get section 1217 out\n\nDear Rep. Correa,\n\nLine one.\nLine two.\n\nMaria, Santa Ana');
    expect(calls.filter((c) => c.url === '/api/generate').length).toBe(generated);
    // Back to calling: the call row returns with nothing lost
    await act(() => { [...root.querySelectorAll('button')].find((b) => b.textContent === 'Back to calling')!.click(); });
    expect(q('[data-email-step]')).toBeNull();
    expect(root.querySelectorAll('a[href^="tel:"]').length).toBe(2);
    expect(q('[data-output-side]')!.textContent).toMatch(/I did it/);
  });

  it('"I sent it" posts one receipt: the call shape plus channel email, no name or city; the stamp reads "I wrote" and the reminder link asks for a call', async () => {
    await mount(done(), OPEN);
    await click('[data-email-link]');
    await click('[data-sent]');
    await flush();
    const receipts = calls.filter((c) => c.url === '/api/receipt');
    expect(receipts.length).toBe(1);
    expect(receipts[0].body).toEqual({ goal: 'ndaa-1217', action: 'ndaa-1217-call', target: 'C001110', state: 'CA', district: 46, device: expect.any(String), channel: 'email' });
    expect(JSON.stringify(receipts[0].body)).not.toMatch(/Maria|Santa Ana|Line one/);
    expect(q('[data-email-step]')).toBeNull();
    expect(q('[data-receipt-stamp]')!.getAttribute('aria-label')).toBe("I wrote to Rep. Correa's office, Nov 2");
    expect(q('[data-receipt-stamp]')!.textContent).toMatch(/^I WROTE/);
    await vi.waitFor(() => expect(q('[data-remind]')).not.toBeNull());
    expect(q('[data-remind]')!.textContent).toBe('Remind me to call (.ics)');
  });

  it('after an emailed receipt the share caption says "wrote to", matching the poster, not "called"', async () => {
    await mount(done(), OPEN);
    await click('[data-email-link]');
    await click('[data-sent]');
    await flush();
    await vi.waitFor(() => expect(q('[data-share-row]')).not.toBeNull());
    const x = [...root.querySelectorAll('a')].find((a) => a.href.startsWith('https://x.com/intent/'))!;
    expect(decodeURIComponent(x.href)).toMatch(/text=I just wrote to Rep\. Correa's office about Strip 1217\./);
  });

  it('a call receipt is unchanged (no channel key), and no_answer adds a bordered "Email it instead" beside "Try again"', async () => {
    await mount(done(), OPEN);
    await act(() => { [...root.querySelectorAll('button')].find((b) => b.textContent === 'I did it')!.click(); });
    await flush();
    expect(calls.filter((c) => c.url === '/api/receipt')[0].body).not.toHaveProperty('channel');
    expect(q('[data-receipt-stamp]')!.getAttribute('aria-label')).toBe("I called Rep. Correa's office, Nov 2");
    await vi.waitFor(() => expect(q('[data-remind]')?.textContent).toBe('Remind me before the vote (.ics)'));
    await click('[data-chip=no_answer]');
    await flush(); await flush();
    expect(texts('button')).toContain('Try again');
    const btn = q('[data-email-instead]')!;
    expect(btn.textContent).toBe('Email it instead');
    expect(btn.className).toMatch(/btn-ghost/); // one-screen-receipt §2.5: bordered, never a second filled button
    expect(q('[data-put-in-writing]')).toBeNull();
    await click('[data-email-instead]');
    expect(q('[data-email-step]')).not.toBeNull();
    expect(q('[data-email-instead]')).toBeNull();
  });

  it('will_support: only the muted "Put it in writing (2 min)" link, and only after the report posts', async () => {
    await mount(done(), OPEN);
    await act(() => { [...root.querySelectorAll('button')].find((b) => b.textContent === 'I did it')!.click(); });
    await flush();
    expect(q('[data-put-in-writing]')).toBeNull();
    await click('[data-chip=will_support]');
    await flush();
    const link = q('[data-put-in-writing]')!;
    expect(link.textContent).toBe('Put it in writing (2 min)');
    expect(link.className).not.toMatch(/btn/);
    expect(q('[data-email-instead]')).toBeNull();
    await click('[data-put-in-writing]');
    expect(q('[data-email-step]')).not.toBeNull();
  });

  it('no contact_form_url: the "no contact form" line and no "I sent it"', async () => {
    await mount(done({ contact_form_url: null, contact_kind: null }), OPEN);
    await click('[data-email-link]');
    expect(q('[data-no-form]')!.textContent).toBe('This office lists no contact form; the DC number is the only channel.');
    expect(q('[data-sent]')).toBeNull();
    expect(q('[data-contact-link]')).toBeNull();
    expect(q('[data-field-hint]')).toBeNull();
  });

  it('a refused draft has no email step', async () => {
    vi.useFakeTimers({ now: OPEN, toFake: ['Date'] });
    localStorage.setItem('cut-ties:place', JSON.stringify({ state: 'CA', district: 46 }));
    vi.stubGlobal('fetch', vi.fn(async (url: string) => {
      if (url.includes('/targets')) return json({ targets: [{ bioguide_id: 'C001110', role: 'Rep.', name: 'Lou Correa' }] });
      return new Response('event: error\ndata: {"message":"Not this one."}\n\n', { status: 200 });
    }));
    await act(() => { render(h(ActForm, { goal: 'g', action: 'a', type: 'call', scope: 'both', fields, fmt: { min_words: 1, max_words: 500 } as never, emailSubject: 'S' }), root); });
    await flush();
    type('#first_name', 'M'); type('#city', 'C'); type('#why', 'W');
    await click('button[type=submit]');
    await flush(); await flush();
    expect(root.textContent).toMatch(/Not this one\./);
    expect(q('[data-email-step]')).toBeNull();
    expect(q('[data-email-link]')).toBeNull();
  });
});

describe('helpers', () => {
  it('fieldHint by chamber: House, Senate, treasurer comment box', () => {
    expect(fieldHint('house')).toMatch(/ZIP\+4 from usps\.com\.$/);
    expect(fieldHint('senate')).toBe('The form asks for your name, address and email, a topic and a message box: paste the message there.');
    expect(fieldHint(null)).toBe('Paste the message into the comment box.');
  });
  it('emailMessage greets a suffixed member by surname, never by the suffix', () => {
    expect(emailMessage({ role: 'Rep.', name: 'Frank Pallone, Jr.' }, 'Body.', { first_name: 'Jo', city: 'Edison' })).toBe('Dear Rep. Pallone,\n\nBody.\n\nJo, Edison');
  });
  it('emailMessage uses the surname and the two fields on the device, nothing else', () => {
    expect(emailMessage({ role: 'Sen.', name: 'Alex Padilla' }, 'Body.', { first_name: ' Jo ', city: 'Fresno', why: 'secret' })).toBe('Dear Sen. Padilla,\n\nBody.\n\nJo, Fresno');
  });
  it('allClosed: DC hours for the DC number, the state for the district office; no phones is never closed', () => {
    const closed = new Date(CLOSED), open = new Date(OPEN);
    expect(allClosed(['202-225-2965', '714-559-6190'], 'CA', closed)).toBe(true);
    expect(allClosed(['202-225-2965', '714-559-6190'], 'CA', open)).toBe(false);
    expect(allClosed(['202-224-3553'], 'CA', closed)).toBe(true);
    expect(allClosed([], 'CA', closed)).toBe(false);
  });
});

describe('a rejected receipt is said beside the button that was pressed', () => {
  const didIt = () => [...root.querySelectorAll('button')].find((b) => /^(I did it|Counting…)$/.test(b.textContent ?? '')) as HTMLButtonElement | undefined;
  const receipts = () => calls.filter((c) => c.url === '/api/receipt').length;

  it('a 429 shows the Worker\'s message under "I did it", keeps the button, and a later tap can still count', async () => {
    await mount(done(), OPEN);
    vi.mocked(fetch).mockResolvedValueOnce(json({ error: 'limit_repeat', message: 'That one is already counted. Try again in ten minutes.' }, 429));
    await act(() => { didIt()!.click(); }); await flush();
    const alert = q('[data-receipt-error]')!;
    expect(alert.textContent).toBe('That one is already counted. Try again in ten minutes.');
    expect(alert.getAttribute('role')).toBe('alert');
    expect(alert.previousElementSibling).toBe(didIt()); // directly under the button, inside the receipt card
    expect(q('[data-receipt-stamp]')).toBeNull();
    expect(root.querySelectorAll('[role=alert]').length).toBe(1); // not also in the page-level alert above the script
    await act(() => { didIt()!.click(); }); await flush();
    expect(q('[data-receipt-error]')).toBeNull();
    expect(q('[data-receipt-stamp]')).not.toBeNull();
  });

  it('a network failure says so instead of failing silently, and a second tap while one is pending posts nothing', async () => {
    await mount(done(), OPEN);
    let fail!: (e: Error) => void;
    vi.mocked(fetch).mockImplementationOnce(() => new Promise<Response>((_, reject) => { fail = reject; }));
    await act(() => { didIt()!.click(); });
    expect(didIt()!.textContent).toBe('Counting…');
    expect(didIt()!.disabled).toBe(true);
    await act(() => { didIt()!.click(); });
    expect(receipts()).toBe(0); // the pending request never reached the recording stub; no second request was made
    expect(vi.mocked(fetch).mock.calls.filter(([u]) => u === '/api/receipt').length).toBe(1);
    await act(async () => { fail(new TypeError('Failed to fetch')); }); await flush();
    expect(q('[data-receipt-error]')!.textContent).toBe('Could not reach the server. Check your connection and try again.');
    expect(didIt()!.textContent).toBe('I did it');
    expect(didIt()!.disabled).toBe(false);
  });

  it('"I sent it" shows the rejection inside the email step, which is the only card on screen', async () => {
    await mount(done(), OPEN);
    await click('[data-email-link]');
    vi.mocked(fetch).mockResolvedValueOnce(json({ error: 'limit_day', message: 'Ten actions a day is plenty. Come back tomorrow.' }, 429));
    await click('[data-sent]'); await flush();
    expect(q('[data-email-step] [data-receipt-error]')!.textContent).toBe('Ten actions a day is plenty. Come back tomorrow.');
    expect(q('[data-email-step]')).not.toBeNull();
  });
});
