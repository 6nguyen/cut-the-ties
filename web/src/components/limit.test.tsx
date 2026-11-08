// @vitest-environment happy-dom
// personalised-documents §Data & contracts: a 429 from /api/generate is JSON {error, message}. The message must
// show where the person is looking (under the submit button, not below the form and the reasons panel), and a
// rejected Regenerate must leave the draft already on screen in place.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { h, render } from 'preact';
import { act } from 'preact/test-utils';
import ActForm from './ActForm';
import type { GenerateDone } from '@worker/generate';

const LIMIT = 'You have used all 3 drafts for this action in the last 24 hours. Try again tomorrow.';
const fields = [
  { name: 'first_name', label: 'First name', max: 40, required: true, multiline: false },
  { name: 'why', label: 'Why', max: 280, required: true, multiline: true },
];
const done: GenerateDone = {
  subject: '', body: 'Line one.\nLine two.', facts_used: [], words: 4, standard: false,
  target: { id: 'C001110', name: 'Lou Correa', role: 'Rep.', phones: ['202-225-2965'], contact_form_url: 'https://correa.house.gov/contact', contact_kind: 'zip_gate', chamber: 'house' },
};
const sse = () => new Response(`event: done\ndata: ${JSON.stringify(done)}\n\n`, { status: 200, headers: { 'content-type': 'text/event-stream' } });
const json = (o: unknown, status = 200) => new Response(JSON.stringify(o), { status });

let root: HTMLElement;
let generate: (() => Response)[];
const flush = () => act(async () => { await new Promise((r) => setTimeout(r, 0)); });
const click = (el: Element) => act(() => { (el as HTMLElement).click(); });
const type = (sel: string, value: string) => act(() => { const el = root.querySelector(sel) as HTMLInputElement; el.value = value; el.dispatchEvent(new Event('input', { bubbles: true })); });

async function submit(responses: (() => Response)[]) {
  generate = [...responses];
  localStorage.setItem('cut-ties:place', JSON.stringify({ state: 'CA', district: 46 }));
  vi.stubGlobal('fetch', vi.fn(async (url: string) => {
    if (url.includes('/targets')) return json({ targets: [{ bioguide_id: 'C001110', role: 'Rep.', name: 'Lou Correa' }] });
    if (url === '/api/generate') return generate.shift()!();
    throw new Error(`unexpected ${url}`);
  }));
  await act(() => { render(h(ActForm, { goal: 'house-caucus', action: 'house-caucus-call', type: 'call', scope: 'house', fields, fmt: { min_words: 1, max_words: 500 } as never }), root); });
  await flush();
  type('#first_name', 'George'); type('#why', 'Because.');
  await click(root.querySelector('button[type=submit]')!);
  await flush(); await flush();
}

beforeEach(() => { localStorage.clear(); root = document.createElement('div'); document.body.appendChild(root); });
afterEach(() => { render(null, root); root.remove(); vi.unstubAllGlobals(); });

describe('a rejected draft request', () => {
  it('shows the Worker message inside the form, right after the submit button, with the fields kept', async () => {
    await submit([() => json({ error: 'limit_action', message: LIMIT }, 429)]);
    const alerts = root.querySelectorAll('[role="alert"]');
    expect(alerts.length).toBe(1);
    expect(alerts[0].textContent).toBe(LIMIT);
    expect(alerts[0].closest('form')).not.toBeNull();
    expect(alerts[0].previousElementSibling).toBe(root.querySelector('button[type=submit]'));
    expect((root.querySelector('#why') as HTMLTextAreaElement).value).toBe('Because.');
  });

  it('on Regenerate keeps the draft on screen and shows the message above it', async () => {
    await submit([sse, () => json({ error: 'limit_action', message: LIMIT }, 429)]);
    expect(root.querySelector('pre')!.textContent).toBe(done.body);
    const regen = [...root.querySelectorAll('button')].find((b) => b.textContent === 'Regenerate')!;
    await click(regen);
    await flush(); await flush();
    expect(root.querySelector('form button[type=submit]')).toBeNull();
    expect(root.querySelector('pre')!.textContent).toBe(done.body);
    expect(root.querySelector('[data-output-side]')).not.toBeNull();
    expect(root.querySelector('[role="alert"]')!.textContent).toBe(LIMIT);
  });
});
