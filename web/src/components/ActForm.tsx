import { useEffect, useState } from 'preact/hooks';
import type { DocFormat, FormField, GenerateDone, TargetContact } from '@worker/generate';
import type { ContactKind } from '@worker/types';
import { surname } from '@worker/names';
import type { TargetCard } from '../lib/api';
import { deviceId, loadPlace } from '../lib/store';
import { commitmentFor, fmtDue, logReceipt } from '../lib/commitments';
import Funnel from './Funnel';
import OpenChip from './OpenChip';
import { isOpen } from '../lib/hours';
import { useTurnstile } from '../lib/turnstile';
import type { Reason } from '../lib/goals';

interface Props {
  goal: string;
  action: string;
  type: 'call' | 'letter' | 'public_comment';
  scope: 'house' | 'senate' | 'both' | 'state';
  fields: FormField[];
  fmt: DocFormat;
  siteKey?: string;
  /** Goal title and decision date for the commitment step (commitment-funnel §1). */
  title?: string;
  decision?: string | null;
  /** Goal `reasons`: first-person starting points offered as one radio group beside the form, grouped by angle. */
  reasons?: Reason[];
  /** Goal `what_we_want`, the poster's body line (social-sharing §2.2). */
  what?: string;
  /** email-button §1.4: the action's maintainer-authored subject line; absent on letter and comment actions. */
  emailSubject?: string | null;
}

interface Choice { id: string; label: string }
type Phase = { kind: 'form' } | { kind: 'generating'; stage: string } | { kind: 'output'; doc: GenerateDone } | { kind: 'refused'; message: string };
/** generation-cost §4: the one line of why under a standard script. */
const STANDARD_WHY: Record<string, string> = {
  capacity: "Today's personalised drafts are used up, so this one is built from our template with your lines dropped in.",
  budget: "This month's drafting budget is spent, so this one is built from our template with your lines dropped in.",
  unconfigured: 'Drafting is not configured on this server, so this one is built from our template with your lines dropped in.',
  upstream: 'The drafting service is not answering, so this one is built from our template with your lines dropped in.',
  // draft-cap-per-office §1.3: the 3 is LIMITS.device_target_day in worker/src/generate.ts (limit.test.tsx holds them together).
  limit: 'You have had 3 personalised drafts for this office in the last 24 hours, which is the limit, so this one is built from our template with your lines dropped in.',
};
/** email-button §1.4: the contact link's label by `contact_kind`, as on member pages. */
export const CONTACT_LABEL: Record<ContactKind, string> = {
  form: 'Open the contact form ↗',
  zip_gate: 'Open the contact form (asks for your ZIP first) ↗',
  homepage: 'Open the office website, then Contact ↗',
};
/** email-button §1.4: one line on what the office's form asks for; a treasurer (no chamber) has a comment box. */
export function fieldHint(chamber: TargetContact['chamber']): string {
  if (chamber === 'house') return 'The form asks for your name, address and ZIP, then a topic and a message box: paste the message there. If the form refuses your ZIP, use your ZIP+4 from usps.com.';
  if (chamber === 'senate') return 'The form asks for your name, address and email, a topic and a message box: paste the message there.';
  return 'Paste the message into the comment box.';
}
/** email-button §1.4: greeting, the body exactly as shown, then the user's own first name and city; nothing else, no model. */
export function emailMessage(target: Pick<TargetContact, 'role' | 'name'>, body: string, values: Record<string, string>): string {
  const sign = [values.first_name, values.city].map((v) => (v ?? '').trim()).filter(Boolean).join(', ');
  return `Dear ${target.role} ${surname(target.name)},\n\n${body}\n\n${sign}`;
}
/** email-button §1.2: every office on file closed (DC hours for the DC or lone number, the state's for the district office). */
export function allClosed(phones: string[], state: string | undefined, now: Date = new Date()): boolean {
  return phones.length > 0 && phoneOrder(phones, now).every((p) => !isOpen(now, p.district ? { state } : undefined));
}
const OUTCOMES: [string, string][] = [['will_support', 'Will support'], ['undecided', 'Undecided'], ['opposed', 'Opposed'], ['no_answer', 'No answer'], ['other', 'Other']];

/**
 * call-follow-through §2: the Worker lists the DC number first, the district number second; when DC is closed the
 * district office (no sourced hours yet) goes first. With two numbers each button names its office ("DC office" /
 * "District office", the member page's wording); a lone number (member-elect, treasurer) carries no office label.
 */
export function phoneOrder(phones: string[], now: Date = new Date()): { phone: string; district: boolean; label: string | null }[] {
  const two = phones.length > 1;
  const list = phones.map((phone, i) => ({ phone, district: two && i === 1, label: two ? (i === 1 ? 'District office' : 'DC office') : null }));
  return two && !isOpen(now) ? [list[1], list[0]] : list;
}

/** Parses the Worker's SSE body (`event:` + `data:` lines, blank-line separated). */
async function readSse(body: ReadableStream<Uint8Array>, on: (event: string, data: Record<string, unknown>) => void): Promise<void> {
  const reader = body.getReader();
  const dec = new TextDecoder();
  let buf = '';
  for (;;) {
    const { value, done } = await reader.read();
    buf += done ? '' : dec.decode(value, { stream: true });
    let at: number;
    while ((at = buf.indexOf('\n\n')) >= 0) {
      const block = buf.slice(0, at);
      buf = buf.slice(at + 2);
      let event = 'message';
      const data: string[] = [];
      for (const line of block.split('\n')) {
        if (line.startsWith('event:')) event = line.slice(6).trim();
        else if (line.startsWith('data:')) data.push(line.slice(5).trimStart());
      }
      if (data.length) { try { on(event, JSON.parse(data.join('\n')) as Record<string, unknown>); } catch { /* keep-alive */ } }
    }
    if (done) return;
  }
}

/** §4.1–4.6: the form, the streamed document, receipt, share and the office-response report. */
export default function ActForm({ goal, action, type, scope, fields, fmt, siteKey, title, decision, reasons, what, emailSubject }: Props) {
  const [choices, setChoices] = useState<Choice[] | null>(null);
  const [target, setTarget] = useState<string>('');
  const [values, setValues] = useState<Record<string, string>>({});
  const [phase, setPhase] = useState<Phase>({ kind: 'form' });
  const [text, setText] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [receipt, setReceipt] = useState<number | null>(null);
  const [outcome, setOutcome] = useState('');
  const [note, setNote] = useState('');
  const [reported, setReported] = useState(false);
  const [copied, setCopied] = useState(false); // the script's Copy button
  const [funnelDone, setFunnelDone] = useState(false);
  const [promised, setPromised] = useState<string | null>(null);
  const [picked, setPicked] = useState<string | null>(null); // the reasons panel's selected starting point
  const [writing, setWriting] = useState(false); // email-button §1.4: the email step stands in for the call row
  const [channel, setChannel] = useState<'call' | 'email'>('call'); // the channel of the receipt on screen
  const ts = useTurnstile(siteKey);
  const place = loadPlace();
  const [extras, setExtras] = useState<typeof import('./ReceiptExtras') | null>(null); // call-follow-through: loaded once a receipt exists
  const [shareMod, setShareMod] = useState<typeof import('./ShareRow') | null>(null); // social-sharing: the share row and its poster chunk
  const [poster, setPoster] = useState<import('./ShareRow').Poster | null>(null);
  // A rejected receipt (rate limit, network) is said beside the button that was pressed: the page-level alert
  // sits above the script, off-screen from the receipt card, so a rejected tap looked like nothing happened.
  const [receiptError, setReceiptError] = useState<string | null>(null);
  const [counting, setCounting] = useState(false);
  useEffect(() => { setReceiptError(null); }, [phase.kind]);

  useEffect(() => {
    if (receipt === null || extras) return;
    import('./ReceiptExtras').then(setExtras).catch(() => {});
  }, [receipt]);
  // social-sharing §2.1: render the poster on receipt mount, so the File and canShare are cached before the funnel ends.
  useEffect(() => {
    if (receipt === null || phase.kind !== 'output') return;
    const t = phase.doc.target;
    let live = true;
    import('./ShareRow').then(async (m) => {
      if (!live) return;
      setShareMod(m);
      const p = await m.preparePoster(m.receiptSpec(channel === 'email' ? 'letter' : type, t.role, t.name, place?.state, title ?? goal, what ?? ''), goal);
      if (live) setPoster(p);
    }).catch(() => {});
    return () => { live = false; };
  }, [receipt]);

  useEffect(() => {
    setPromised(commitmentFor(goal)?.due ?? null); // commitment-funnel §2.4
    const fromUrl = new URLSearchParams(location.search).get('target');
    if (fromUrl) { setTarget(fromUrl); setChoices([{ id: fromUrl, label: '' }]); }
    if (!place) { if (!fromUrl) setChoices([]); return; }
    fetch(`/api/goals/${encodeURIComponent(goal)}/targets?state=${place.state}&district=${place.district}`)
      .then(async (res) => {
        const body = (await res.json().catch(() => ({}))) as { targets?: TargetCard[] };
        const list = (body.targets ?? []).map((t): Choice => ({ id: scope === 'state' ? place.state : t.bioguide_id ?? '', label: `${t.role} ${t.name}` })).filter((c) => c.id);
        setChoices(list);
        if (fromUrl) { const hit = list.find((c) => c.id === fromUrl); if (hit) return; }
        if (!fromUrl && list[0]) setTarget(list[0].id);
      })
      .catch(() => { if (!fromUrl) setChoices([]); });
  }, [goal, scope]);

  const valid = !!target && fields.every((f) => {
    const v = (values[f.name] ?? '').trim();
    return (!f.required || v.length > 0) && v.length <= f.max;
  });

  async function generate() {
    // A rejected request (rate limit, bot check, network) costs nothing on screen: the draft and its receipt
    // state are cleared only once the Worker starts a new stream, and a draft already shown comes back.
    const prev = phase.kind === 'output' ? { phase, text } : null;
    setError(null); setText('');
    setPhase({ kind: 'generating', stage: 'Drafting…' });
    // leader-call-scripts §2: a fresh seed per request, so "Another version" composes a different standard script.
    const variant = Math.floor(Math.random() * 2 ** 31);
    const fieldValues = Object.fromEntries(fields.map((f) => [f.name, (values[f.name] ?? '').trim()]).filter(([, v]) => v));
    const send = async (turnstile: string | undefined) =>
      fetch('/api/generate', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ action, target, fields: fieldValues, device: deviceId(), turnstile, variant }) });
    try {
      let res = await send(await ts.nextToken());
      if (res.status === 403) {
        // The token can be spent or expired between the widget issuing it and the submit: one retry with a fresh one.
        const err = (await res.clone().json().catch(() => ({}))) as { error?: string };
        if (err.error === 'turnstile') { ts.reset(); res = await send(await ts.nextToken()); }
      }
      if (!res.ok || !res.body) {
        const err = (await res.json().catch(() => ({ message: 'The server sent something we could not read.' }))) as { message?: string };
        throw new Error(err.message ?? `Request failed (${res.status}).`);
      }
      setReceipt(null); setReported(false); setOutcome(''); setNote(''); setFunnelDone(false); setWriting(false); setChannel('call');
      let buf = '';
      let final: GenerateDone | null = null;
      let refused: string | null = null;
      await readSse(res.body, (event, data) => {
        if (event === 'status') setPhase({ kind: 'generating', stage: data.stage === 'redrafting' ? 'Redrafting…' : data.stage === 'standard' ? 'Building the standard script…' : 'Drafting…' });
        else if (event === 'delta') { buf += String(data.text ?? ''); setText(buf); }
        else if (event === 'reset') { buf = ''; setText(''); }
        else if (event === 'done') final = data as unknown as GenerateDone;
        else if (event === 'error') refused = String(data.message ?? 'Could not draft this one.');
      });
      if (final) { setText((final as GenerateDone).body); setPhase({ kind: 'output', doc: final }); }
      else setPhase({ kind: 'refused', message: refused ?? 'The draft ended early. Try again.' });
    } catch (e) {
      setError((e as Error).message);
      if (prev) { setText(prev.text); setPhase(prev.phase); } else setPhase({ kind: 'form' });
    } finally {
      ts.reset(); // the token rode on this request; the widget issues the next one
    }
  }

  /** email-button §1.5: an emailed receipt is the call receipt's shape plus `channel: 'email'`; a call receipt is unchanged. */
  async function didIt(via: 'call' | 'email' = 'call') {
    if (counting) return;
    setReceiptError(null); setCounting(true);
    try { await postReceipt(via); }
    catch { setReceiptError('Could not reach the server. Check your connection and try again.'); }
    finally { setCounting(false); }
  }
  async function postReceipt(via: 'call' | 'email') {
    const res = await fetch('/api/receipt', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ goal, action, target, state: place?.state, district: place?.district, device: deviceId(), ...(via === 'email' ? { channel: via } : {}) }) });
    const data = (await res.json().catch(() => ({}))) as { id?: number; message?: string };
    if (!res.ok || !data.id) { setReceiptError(data.message ?? 'Could not record that. Try again.'); return; }
    logReceipt({ goal, action, target }); // call-follow-through §3
    if (receipt === null) setChannel(via);
    setReceipt(data.id);
    setWriting(false);
  }

  async function report() {
    const res = await fetch('/api/report', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ goal, target, outcome, note: note.trim() || undefined, device: deviceId() }) });
    if (res.ok) setReported(true); else setError('Could not send that.');
  }

  function download(doc: GenerateDone) {
    const blob = new Blob([doc.subject ? `${doc.subject}\n\n${doc.body}` : doc.body], { type: 'text/plain' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `${action}.txt`;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  if (choices === null) return <p class="label-code" aria-busy="true">Loading your target…</p>;
  if (choices.length === 0) return (
    <div class="card p-4">
      <p class="font-semibold">Enter your address so we know who you are writing to.</p>
      <a href="/" class="btn btn-primary mt-4 self-start">Enter your address →</a>
    </div>
  );

  const kind = type === 'call' ? 'call script' : type === 'letter' ? 'letter' : 'comment';
  const generating = phase.kind === 'generating';
  const whyField = fields.find((f) => f.multiline);
  /** Reasons panel: the picked starting point replaces the previous pick in the "why" field (or is appended to the caller's own words), then the cursor lands there so the caller rewrites it. */
  function pickReason(point: string) {
    if (!whyField) return;
    setValues((cur) => {
      const v = cur[whyField.name] ?? '';
      const base = (picked && v.includes(picked) ? v.replace(picked, '') : v).replace(/\s+/g, ' ').trim();
      return { ...cur, [whyField.name]: base ? `${base} ${point}` : point };
    });
    setPicked(point);
    document.getElementById(whyField.name)?.focus();
  }

  const receiptAlert = receiptError && <p role="alert" class="text-sm text-crimson font-semibold" data-receipt-error>{receiptError}</p>;
  // On the form the alert sits under the submit button: below the form and the reasons panel it was off-screen,
  // so a rejected submit looked like the page had reset.
  const alert = error && <p role="alert" class="card border-crimson bg-newsprint text-ink px-4 py-3 text-sm font-semibold max-w-2xl">{error}</p>;

  return (
    <div class="flex flex-col gap-6">
      {phase.kind === 'form' && (
        <div class="lg:grid lg:grid-cols-[minmax(0,42rem)_minmax(16rem,22rem)] lg:gap-8 lg:items-start">
        <div class="flex flex-col gap-6">
        {promised && <p class="label-code" data-promise><span class="chip bg-acid text-ink mr-2">✓</span>You said you'd call by {fmtDue(promised)}.</p>}
        <form class="card p-4 flex flex-col gap-4" onSubmit={(e) => { e.preventDefault(); if (valid) void generate(); }}>
          {choices.length > 1 && (
            <fieldset class="flex flex-col gap-2">
              <legend class="label-code mb-1">Who you are writing to</legend>
              {choices.map((c) => (
                <label class="flex items-center gap-2 text-sm">
                  <input type="radio" name="target" value={c.id} checked={target === c.id} onChange={() => setTarget(c.id)} /> {c.label || c.id}
                </label>
              ))}
            </fieldset>
          )}
          {choices.length === 1 && choices[0].label && <p class="label-code">To {choices[0].label}</p>}
          {fields.map((f) => {
            const v = values[f.name] ?? '';
            const over = v.length > f.max;
            const common = { id: f.name, name: f.name, required: f.required, maxLength: f.max, class: 'input-field w-full text-base', value: v, onInput: (e: Event) => setValues({ ...values, [f.name]: (e.target as HTMLInputElement).value }) };
            return (
              <div>
                <label class="label-code block mb-1" for={f.name}>{f.label}{f.required || /optional/i.test(f.label) ? '' : ' (optional)'}</label>
                {f.multiline ? <textarea rows={3} {...common} /> : <input type="text" {...common} />}
                <p class={`label-ticker mt-1 ${over ? 'text-crimson' : 'text-ink/60'}`}>{f.hint ? `${f.hint} ` : ''}{v.length}/{f.max}</p>
              </div>
            );
          })}
          <button type="submit" class="btn btn-primary self-start" disabled={!valid}>Write my {kind} →</button>
          {alert}
          <p class="text-xs text-ink/70">Your lines are used as material for one {kind}, checked by code, and not stored. {fmt.min_words}–{fmt.max_words} words.</p>
        </form>
        </div>
        {whyField && reasons && reasons.length > 0 && (
          <aside class="card p-4 mt-6 lg:mt-0 text-sm flex flex-col gap-4" aria-labelledby="reasons-heading" data-reasons>
            <div class="relative border-2 border-ink bg-hazard shadow-brutal-sm p-4 pt-5 mt-2" data-reasons-how>
              <span class="label-ticker absolute -top-2.5 left-3 bg-paper border border-ink px-1.5 py-0.5">How it works</span>
              <h2 id="reasons-heading" class="font-condensed uppercase tracking-wide text-2xl leading-none">Not sure what to say?</h2>
              <p class="mt-2 font-semibold leading-snug">Pick one reason. It drops into "{whyField.label}", then change it so it sounds like you.</p>
            </div>
            <fieldset class="flex flex-col gap-4">
              <legend class="sr-only">Reasons people give</legend>
              {reasons.map((r) => (
                <div>
                  <p class="label-code">{r.angle}</p>
                  <ul class="mt-1.5 flex flex-col gap-1">
                    {r.points.map((p) => (
                      <li>
                        <label class={`flex items-start gap-2 cursor-pointer border-2 px-2 py-1.5 ${picked === p ? 'border-ink bg-newsprint' : 'border-transparent hover:border-rule'}`}>
                          <input type="radio" name="reason" value={p} class="mt-0.5 shrink-0 accent-ink" checked={picked === p} onChange={() => pickReason(p)} />
                          <span>{p}</span>
                        </label>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </fieldset>
            <p class="text-xs text-ink/70">Your own words carry more weight than ours.</p>
          </aside>
        )}
        </div>
      )}
      {/* Outside the form so the widget survives into the output phase: Regenerate needs a fresh token too. */}
      <div ref={ts.mount} class="empty:hidden" />
      {phase.kind !== 'form' && alert}

      {/* Output layout: script (and its copy/download/regenerate row) on the left, call buttons and the receipt card beside it from 1024 px. */}
      {(generating || phase.kind === 'output') && (
        <div class={`flex flex-col gap-4 ${phase.kind === 'output' ? 'lg:grid lg:grid-cols-[minmax(0,42rem)_minmax(18rem,26rem)] lg:gap-8 lg:items-start' : 'max-w-2xl'}`} data-output-layout>
        <div class="flex flex-col gap-4">
        <div class="card p-4">
          <p class="label-code" aria-live="polite">{generating ? phase.stage : phase.kind === 'output' && phase.doc.standard ? `Standard script — not personalised today · ${phase.doc.words} words` : `Your ${kind} · ${phase.kind === 'output' ? phase.doc.words : 0} words`}</p>
          {phase.kind === 'output' && phase.doc.standard && <p class="text-xs text-ink/70 mt-1">{STANDARD_WHY[phase.doc.reason ?? 'capacity'] ?? STANDARD_WHY.capacity}</p>}
          {phase.kind === 'output' && phase.doc.subject && <p class="font-condensed uppercase tracking-wide text-xl leading-tight mt-3">{phase.doc.subject}</p>}
          <pre class="whitespace-pre-wrap font-sans text-base leading-relaxed mt-3 min-h-[8rem]">{text}{generating && <span class="animate-pulse">▍</span>}</pre>
        </div>
        {phase.kind === 'output' && (
          <div class="flex flex-wrap gap-2">
            <button type="button" class="btn btn-ghost" onClick={() => { void navigator.clipboard?.writeText(text); setCopied(true); }}>{copied ? 'Copied' : 'Copy'}</button>
            <button type="button" class="btn btn-ghost" onClick={() => download(phase.doc)}>Download .txt</button>
            {!(phase.doc.standard && phase.doc.reason === 'limit' && !phase.doc.variant) && <button type="button" class="btn btn-ghost" onClick={() => void generate()}>{phase.doc.standard && phase.doc.variant ? 'Another version' : 'Regenerate'}</button>}
          </div>
        )}
        </div>

      {phase.kind === 'output' && (
        <div class="flex flex-col gap-4" data-output-side>
          {writing && emailSubject ? (
            <div class="card p-4 flex flex-col gap-3" data-email-step>
              <p class="font-condensed uppercase tracking-wide text-xl leading-tight">Send it in writing</p>
              <p class="label-code">Subject</p>
              <p class="font-semibold" data-email-subject>{emailSubject.replace('{city}', (values.city ?? '').trim() || 'your city')}</p>
              <p class="label-code">Message</p>
              <pre class="whitespace-pre-wrap font-sans text-sm leading-relaxed" data-email-message>{emailMessage(phase.doc.target, text, values)}</pre>
              <div class="flex flex-wrap gap-2 items-center">
                <button type="button" class="btn btn-ghost" onClick={() => { void navigator.clipboard?.writeText(`${emailSubject.replace('{city}', (values.city ?? '').trim() || 'your city')}\n\n${emailMessage(phase.doc.target, text, values)}`); setCopied(true); }}>{copied ? 'Copied' : 'Copy subject and message'}</button>
                {phase.doc.target.contact_form_url ? (
                  <a href={phase.doc.target.contact_form_url} class="btn btn-primary" rel="noopener" target="_blank" data-contact-link>{CONTACT_LABEL[phase.doc.target.contact_kind ?? 'homepage']}</a>
                ) : <p class="text-sm w-full" data-no-form>This office lists no contact form; the DC number is the only channel.</p>}
              </div>
              {phase.doc.target.contact_form_url && <p class="text-sm" data-field-hint>{fieldHint(phase.doc.target.chamber)}</p>}
              <div class="flex flex-wrap gap-2">
                {phase.doc.target.contact_form_url && <button type="button" class="btn btn-primary" onClick={() => void didIt('email')} disabled={counting} aria-busy={counting} data-sent>{counting ? 'Counting…' : 'I sent it'}</button>}
                <button type="button" class="btn btn-ghost" onClick={() => setWriting(false)}>Back to calling</button>
              </div>
              {receiptAlert}
            </div>
          ) : (
          <div class="flex flex-wrap gap-2 items-center">
            {phoneOrder(phase.doc.target.phones).map(({ phone, district, label }) => (
              <span class="flex items-center gap-2">
                <a href={`tel:${phone.replace(/[^\d+]/g, '')}`} class="btn btn-primary" data-office={district ? 'district' : 'dc'}>Call {phase.doc.target.role} {phase.doc.target.name} · {label ? `${label} · ` : ''}{phone}</a>
                <OpenChip state={district ? place?.state : undefined} />
              </span>
            ))}
            {/* email-button §1.2: the one email affordance sits under the call buttons; closed offices promote it to a primary button. */}
            {emailSubject && (allClosed(phase.doc.target.phones, place?.state)
              ? <button type="button" class="btn btn-primary w-full sm:w-auto" onClick={() => setWriting(true)} data-email-closed>{phase.doc.target.phones.length > 1 ? 'Both offices are closed. Email instead' : 'The office is closed. Email instead'}</button>
              : <button type="button" class="text-sm underline w-full text-left" onClick={() => setWriting(true)} data-email-link>I can't call right now</button>)}
            {phoneOrder(phase.doc.target.phones)[0]?.district && <p class="text-sm w-full" data-dc-closed>DC office closed; district office answers in office hours.</p>}
            {phase.doc.target.phones.length > 1 && <p class="text-sm w-full" data-two-offices>Either number works and both log your call. The DC office is where the legislative staff sit; the district office is the local one.</p>}
            {type !== 'call' && phase.doc.target.contact_form_url && (
              <a href={phase.doc.target.contact_form_url} class="btn btn-primary" rel="noopener" target="_blank">Open the contact form ↗</a>
            )}
          </div>
          )}
          {!(writing && receipt === null) && <div class="card p-4 flex flex-col gap-3">
            {receipt === null ? (
              <>
                <button type="button" class="btn btn-primary self-start" onClick={() => void didIt()} disabled={counting} aria-busy={counting}>{counting ? 'Counting…' : 'I did it'}</button>
                {receiptAlert}
              </>
            ) : (
              <>
                <p class="font-semibold"><span class="chip bg-acid text-ink mr-2">✓</span>Counted. No name, no address: just this goal, this office, today.</p>
                <Funnel goal={goal} action={action} target={target} who={surname(phase.doc.target.name)} role={phase.doc.target.role} title={title ?? goal} type={channel === 'email' ? 'letter' : type} decision={decision ?? null} place={place} onFinished={() => setFunnelDone(true)} />
                {funnelDone && (
                  <>
                    {extras && <extras.NextOffice goal={goal} action={action} choices={choices} />}
                    {extras && place && <extras.Counts goal={goal} state={place.state} district={scope === 'state' ? null : place.district} echo />}
                    {shareMod ? (
                      <shareMod.default type={channel === 'email' ? 'letter' : type} role={phase.doc.target.role} name={phase.doc.target.name} title={title ?? goal} slug={goal} poster={poster} other={<a href="/results" class="btn btn-ghost">Your other action</a>} />
                    ) : (
                      <div class="flex flex-wrap gap-2"><a href="/results" class="btn btn-ghost">Your other action</a></div>
                    )}
                  </>
                )}
                {!reported ? (
                  <form class="flex flex-col gap-2 border-t-2 border-ink pt-3" onSubmit={(e) => { e.preventDefault(); if (outcome) void report(); }}>
                    <p class="label-code">What did the office say? (optional)</p>
                    <div class="flex flex-wrap gap-2">
                      {OUTCOMES.map(([v, l]) => (
                        <label class={`chip cursor-pointer ${outcome === v ? 'bg-ink text-paper' : 'bg-newsprint'}`}>
                          <input type="radio" name="outcome" value={v} class="sr-only" checked={outcome === v} onChange={() => setOutcome(v)} />{l}
                        </label>
                      ))}
                    </div>
                    {outcome === 'other' && <input type="text" maxLength={140} class="input-field text-sm" placeholder="In a few words (140 max)" value={note} onInput={(e) => setNote((e.target as HTMLInputElement).value)} />}
                    <button type="submit" class="btn btn-ghost self-start" disabled={!outcome}>Send</button>
                  </form>
                ) : (
                  <>
                    <p class="text-sm">Thanks. Reports go to the maintainer; they never change a listed position on their own.</p>
                    {/* email-button §1.3: the private, related second ask after a reported call; a muted link, never a card. */}
                    {emailSubject && outcome !== 'no_answer' && !writing && <button type="button" class="text-sm underline text-ink/70 self-start" onClick={() => setWriting(true)} data-put-in-writing>Put it in writing (2 min)</button>}
                  </>
                )}
                {outcome === 'no_answer' && extras && (
                  <div class="flex flex-wrap gap-2 items-end">
                    <extras.Retry goal={goal} action={action} target={target} who={`${phase.doc.target.role} ${phase.doc.target.name}`} title={title ?? goal} />
                    {emailSubject && !writing && <button type="button" class="btn btn-primary" onClick={() => setWriting(true)} data-email-instead>Email it instead</button>}
                  </div>
                )}
                <div class="border-t-2 border-ink pt-3">
                  <label class="label-code block mb-1" for="reflection">One line for yourself: how did it feel? (stays on this page)</label>
                  <input id="reflection" type="text" class="input-field w-full text-sm" />
                </div>
                <p class="text-sm">This site is one person's project. <a href="/donate" class="underline font-semibold">Chip in for the hosting and the drafts →</a></p>
              </>
            )}
          </div>}
        </div>
      )}
        </div>
      )}

      {phase.kind === 'refused' && (
        <div class="card p-4 max-w-2xl" role="alert">
          <p class="font-semibold">{phase.message}</p>
          <button type="button" class="btn btn-ghost mt-4" onClick={() => setPhase({ kind: 'form' })}>Edit my lines</button>
        </div>
      )}
    </div>
  );
}
