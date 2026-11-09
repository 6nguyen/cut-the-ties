// @vitest-environment happy-dom
// personalised-documents §Data & contracts: a 429 from /api/generate is JSON {error, message}. The message must
// show where the person is looking (under the submit button, not below the form and the reasons panel), and a
// rejected Regenerate must leave the draft already on screen in place.
// draft-cap-per-office §1: past the per-office cap nothing is rejected: the standard script arrives on the stream
// with `reason: limit`, one line of why and no alert; a plain-template action then has no regenerate button.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { h, render } from 'preact';
import { act } from 'preact/test-utils';
import ActForm from './ActForm';
import { LIMITS, type GenerateDone } from '@worker/generate';

const LIMIT = 'You have written 20 drafts in the last 24 hours, and 20 is the limit. You can write another 24 hours after the first.';
const LABEL = 'Standard script — not personalised today';
const WHY = 'You have had 3 personalised drafts for this office in the last 24 hours, which is the limit, so this one is built from our template with your lines dropped in.';
const fields = [
  { name: 'first_name', label: 'First name', max: 40, required: true, multiline: false },
  { name: 'why', label: 'Why', max: 280, required: true, multiline: true },
];
const done: GenerateDone = {
  subject: '', body: 'Line one.\nLine two.', facts_used: [], words: 4, standard: false,
  target: { id: 'C001110', name: 'Lou Correa', role: 'Rep.', phones: ['202-225-2965'], contact_form_url: 'https://correa.house.gov/contact', contact_kind: 'zip_gate', chamber: 'house' },
};
const stream = (d: GenerateDone) => () => new Response(`event: done\ndata: ${JSON.stringify(d)}\n\n`, { status: 200, headers: { 'content-type': 'text/event-stream' } });
const sse = stream(done);
const json = (o: unknown, status = 200) => new Response(JSON.stringify(o), { status });

let root: HTMLElement;
let generate: (() => Response)[];
let sent: { variant?: number }[];
const flush = () => act(async () => { await new Promise((r) => setTimeout(r, 0)); });
const click = (el: Element) => act(() => { (el as HTMLElement).click(); });
const type = (sel: string, value: string) => act(() => { const el = root.querySelector(sel) as HTMLInputElement; el.value = value; el.dispatchEvent(new Event('input', { bubbles: true })); });
const button = (label: string) => [...root.querySelectorAll('button')].find((b) => b.textContent === label);

async function submit(responses: (() => Response)[], action = 'house-caucus-call', goal = 'house-caucus') {
  generate = [...responses];
  sent = [];
  localStorage.setItem('cut-ties:place', JSON.stringify({ state: 'CA', district: 46 }));
  vi.stubGlobal('fetch', vi.fn(async (url: string, init?: RequestInit) => {
    if (url.includes('/targets')) return json({ targets: [{ bioguide_id: 'C001110', role: 'Rep.', name: 'Lou Correa' }] });
    if (url === '/api/generate') { sent.push(JSON.parse(String(init?.body)) as { variant?: number }); return generate.shift()!(); }
    throw new Error(`unexpected ${url}`);
  }));
  await act(() => { render(h(ActForm, { goal, action, type: 'call', scope: 'house', fields, fmt: { min_words: 1, max_words: 500 } as never }), root); });
  await flush();
  type('#first_name', 'George'); type('#why', 'Because.');
  await click(root.querySelector('button[type=submit]')!);
  await flush(); await flush();
}

beforeEach(() => { localStorage.clear(); root = document.createElement('div'); document.body.appendChild(root); });
afterEach(() => { render(null, root); root.remove(); vi.unstubAllGlobals(); vi.restoreAllMocks(); });

describe('a rejected draft request', () => {
  it('shows the Worker message inside the form, right after the submit button, with the fields kept', async () => {
    await submit([() => json({ error: 'limit_day', message: LIMIT }, 429)]);
    const alerts = root.querySelectorAll('[role="alert"]');
    expect(alerts.length).toBe(1);
    expect(alerts[0].textContent).toBe(LIMIT);
    expect(alerts[0].closest('form')).not.toBeNull();
    expect(alerts[0].previousElementSibling).toBe(root.querySelector('button[type=submit]'));
    expect((root.querySelector('#why') as HTMLTextAreaElement).value).toBe('Because.');
  });

  it('on Regenerate keeps the draft on screen and shows the message above it', async () => {
    await submit([sse, () => json({ error: 'limit_ip', message: LIMIT }, 429)]);
    expect(root.querySelector('pre')!.textContent).toBe(done.body);
    const regen = button('Regenerate')!;
    await click(regen);
    await flush(); await flush();
    expect(root.querySelector('form button[type=submit]')).toBeNull();
    expect(root.querySelector('pre')!.textContent).toBe(done.body);
    expect(root.querySelector('[data-output-side]')).not.toBeNull();
    expect(root.querySelector('[role="alert"]')!.textContent).toBe(LIMIT);
  });
});

describe('past the per-office cap (draft-cap-per-office §1)', () => {
  const template: GenerateDone = { ...done, body: 'Template line one.\nTemplate line two.', words: 6, standard: true, reason: 'limit' };

  it('the why line carries the number in LIMITS, not one of its own', () => {
    expect(WHY).toContain(`You have had ${LIMITS.device_target_day} personalised drafts for this office in the last 24 hours`);
  });

  it('a plain-template action shows the script with the standard label and the why line, no alert and no regenerate button; Copy and Download work', async () => {
    const writeText = vi.fn(async (_text: string) => {});
    Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true });
    const blobs: Blob[] = [];
    vi.spyOn(URL, 'createObjectURL').mockImplementation((b) => { blobs.push(b as Blob); return 'blob:script'; });
    vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
    const saved: string[] = [];
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (this: HTMLAnchorElement) { saved.push(this.download); });

    await submit([stream(template)], 'ndaa-1217-call', 'ndaa-1217');
    expect(root.querySelector('pre')!.textContent).toBe(template.body);
    expect(root.querySelector('.label-code')!.textContent).toBe(`${LABEL} · 6 words`);
    expect(root.querySelector('.label-code')!.nextElementSibling!.textContent).toBe(WHY);
    expect(root.querySelector('[role="alert"]')).toBeNull();
    expect(button('Regenerate')).toBeUndefined();
    expect(button('Another version')).toBeUndefined();
    expect(root.querySelector('[data-output-side]')).not.toBeNull(); // the receipt column is still there
    expect(sent).toHaveLength(1);

    await click(button('Copy')!);
    expect(writeText).toHaveBeenCalledWith(template.body);
    expect(button('Copied')).toBeDefined();
    await click(button('Download .txt')!);
    expect(saved).toEqual(['ndaa-1217-call.txt']);
    expect(await blobs[0].text()).toBe(template.body);
  });

  it('a blocks action keeps "Another version": a press sends a new seed and shows the different script it returns', async () => {
    const first: GenerateDone = { ...template, variant: 'op1.ask2.close1' };
    const second: GenerateDone = { ...template, body: 'Another opening.\nAnother close.', variant: 'op2.ask1.close3' };
    await submit([stream(first), stream(second)]);
    expect(root.querySelector('pre')!.textContent).toBe(first.body);
    expect(root.querySelector('.label-code')!.textContent).toContain(LABEL);
    expect(root.querySelector('.label-code')!.nextElementSibling!.textContent).toBe(WHY);
    expect(root.querySelector('[role="alert"]')).toBeNull();
    expect(button('Regenerate')).toBeUndefined();
    await click(button('Another version')!);
    await flush(); await flush();
    expect(root.querySelector('pre')!.textContent).toBe(second.body);
    expect(root.querySelector('[role="alert"]')).toBeNull();
    expect(button('Another version')).toBeDefined();
    expect(sent).toHaveLength(2);
    expect(Number.isInteger(sent[0].variant)).toBe(true);
    expect(Number.isInteger(sent[1].variant)).toBe(true);
    expect(sent[1].variant).not.toBe(sent[0].variant);
  });

  it('a standard script for any other reason keeps its regenerate button', async () => {
    await submit([stream({ ...template, reason: 'capacity' })], 'ndaa-1217-call', 'ndaa-1217');
    expect(root.querySelector('.label-code')!.nextElementSibling!.textContent).toContain("Today's personalised drafts are used up");
    expect(button('Regenerate')).toBeDefined();
  });
});
