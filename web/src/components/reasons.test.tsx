// @vitest-environment happy-dom
// tap-receipts-everywhere §9: the reasons panel's points are checkboxes that drop into the "why" field in panel
// order; unchecking removes only that text; an edited point clears its box; a pick past the field's max is refused;
// `{{leader}}` reads as the goal leader's name.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { h, render } from 'preact';
import { act } from 'preact/test-utils';
import ActForm from './ActForm';

const fields = [
  { name: 'first_name', label: 'First name', max: 40, required: true, multiline: false },
  { name: 'why', label: 'Why this matters to you', max: 280, required: true, multiline: true },
];
const reasons = [
  { angle: 'Values', points: ['I cannot back a caucus led by {{leader}}.', 'My taxes paid for it.'] },
  { angle: 'Record', points: ['The last vote was wrong.'] },
];
let root: HTMLElement;
const flush = () => act(async () => { await new Promise((r) => setTimeout(r, 0)); });
const q = (sel: string) => root.querySelector(sel);
const boxes = () => [...root.querySelectorAll<HTMLInputElement>('input[name=reason]')];
const check = (i: number) => act(() => { boxes()[i].click(); });
const type = (value: string) => act(() => { const el = q('#why') as HTMLTextAreaElement; el.value = value; el.dispatchEvent(new Event('input', { bubbles: true })); });
const why = () => (q('#why') as HTMLTextAreaElement).value;

async function mount(leader: string | null = 'Charles E. Schumer') {
  await act(() => { render(h(ActForm, { goal: 'senate-leader', action: 'senate-leader-call', type: 'call', scope: 'senate', fields, fmt: { min_words: 1, max_words: 500 } as never, title: 'Kick out Schumer', decision: '2026-12-10', reasons, leader }), root); });
  await flush();
}

beforeEach(() => { localStorage.clear(); localStorage.setItem('cut-ties:place', JSON.stringify({ state: 'CA', district: 46 })); vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ targets: [{ bioguide_id: 'S000148', role: 'Sen.', name: 'Charles E. Schumer' }] }), { status: 200 }))); root = document.createElement('div'); document.body.appendChild(root); });
afterEach(() => { render(null, root); root.remove(); vi.unstubAllGlobals(); });

describe('reason picks (§9)', () => {
  it('the points are checkboxes, the leader placeholder is filled and no brace shows', async () => {
    await mount();
    expect(boxes().length).toBe(3);
    expect(boxes().every((b) => b.type === 'checkbox')).toBe(true);
    expect(q('[data-reasons]')?.textContent).toContain('I cannot back a caucus led by Charles E. Schumer.');
    expect(q('[data-reasons]')?.textContent).not.toMatch(/[{}]/);
    expect(q('[data-reasons]')?.textContent).toContain('Pick any that fit. They drop into "Why this matters to you"');
  });
  it('two picks land in panel order after the caller\'s words; unchecking the first removes only its text', async () => {
    await mount();
    type('Because.');
    await check(1);
    expect(why()).toBe('Because. My taxes paid for it.');
    await check(0);
    expect(why()).toBe('Because. My taxes paid for it. I cannot back a caucus led by Charles E. Schumer.');
    expect(boxes().map((b) => b.checked)).toEqual([true, true, false]);
    await check(1);
    expect(why()).toBe('Because. I cannot back a caucus led by Charles E. Schumer.');
    expect(boxes().map((b) => b.checked)).toEqual([true, false, false]);
    expect(document.activeElement).toBe(q('#why'));
  });
  it('editing a dropped point clears its box and keeps the edit', async () => {
    await mount();
    await check(2);
    expect(why()).toBe('The last vote was wrong.');
    type('The last vote was wrong, and I remember it.');
    expect(boxes()[2].checked).toBe(false);
    expect(why()).toBe('The last vote was wrong, and I remember it.');
    await check(2);
    expect(why()).toBe('The last vote was wrong, and I remember it. The last vote was wrong.');
  });
  it('a pick past 280 characters leaves the box off and says so', async () => {
    await mount();
    type('x'.repeat(270));
    await check(1);
    expect(why()).toBe('x'.repeat(270));
    expect(boxes()[1].checked).toBe(false);
    expect(q('[data-pick-error]')?.textContent).toBe('That is more than the field holds. Uncheck one first.');
    type('Short.');
    await check(1);
    expect(why()).toBe('Short. My taxes paid for it.');
    expect(q('[data-pick-error]')).toBeNull();
  });
});
