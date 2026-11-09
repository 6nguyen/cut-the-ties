// social-sharing §3–4 (one-screen-receipt §3): the receipt screen's share block, a poster thumbnail beside
// bordered icon buttons. ActForm imports this module lazily when a receipt exists (so the poster chunk never
// ships with the landing or the act page's own bundle) and calls `preparePoster` at once, so the File and the
// canShare answer are ready when the block shows.
import { useEffect, useState } from 'preact/hooks';
import { surname } from '@worker/names';
import { canShareFile, captionFor, intentLinks, posterAlt, posterDate, posterFile, sharePayload, targetLine, type PosterSpec } from '../lib/poster';

export interface Poster { file: File | null; canShare: boolean }

/** §2.1: draw once, keep the File and whether the sheet accepts it. Never throws. */
export async function preparePoster(spec: PosterSpec, slug: string): Promise<Poster> {
  const file = await posterFile(spec, `cut-the-ties-${slug}.png`);
  return { file, canShare: canShareFile(file) };
}

/** §2.2 spec from the receipt: the stamp's act by channel, the office without a person's first name, nothing else personal. */
export function receiptSpec(type: 'call' | 'letter' | 'public_comment', role: string, name: string, state: string | undefined, title: string, what: string): PosterSpec {
  return { act: type === 'call' ? 'called' : 'wrote', target: targetLine(role, name, state), title, what, date: posterDate() };
}

interface Props {
  type: 'call' | 'letter' | 'public_comment';
  role: string;
  name: string;
  title: string;
  slug: string;
  /** null while the poster is still rendering; the block then offers "Copy link" and "Message" alone. */
  poster: Poster | null;
}

/** §3.1: 20 px monochrome line icons in the button's ink: no brand colour, no icon font, no request. */
const ICONS = {
  instagram: 'M8 3h8a5 5 0 0 1 5 5v8a5 5 0 0 1-5 5H8a5 5 0 0 1-5-5V8a5 5 0 0 1 5-5zM12 8a4 4 0 1 0 0 8a4 4 0 0 0 0-8zM17.4 6.5h.2',
  link: 'M10 13a5 5 0 0 0 7.5.5l3-3a5 5 0 0 0-7-7l-1.7 1.7M14 11a5 5 0 0 0-7.5-.5l-3 3a5 5 0 0 0 7 7l1.7-1.7',
  message: 'M21 15a2 2 0 0 1-2 2H8l-5 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z',
  save: 'M12 3v12M7 10l5 5l5-5M4 21h16',
} as const;
function Icon({ name }: { name: keyof typeof ICONS }) {
  return <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" class="shrink-0"><path d={ICONS[name]} /></svg>;
}
/** Every share control is bordered: the one filled button on the receipt screen is the next office. */
const BTN = 'btn btn-ghost w-full justify-start';

export default function ShareRow({ type, role, name, title, slug, poster }: Props) {
  const [copied, setCopied] = useState(false);
  const [failed, setFailed] = useState(false); // the sheet threw something other than AbortError
  const [wide, setWide] = useState(false);
  const [imgUrl, setImgUrl] = useState<string | null>(null);
  const cap = captionFor(type, role, surname(name), title, slug);
  const nav = navigator as Navigator & { share?: (d: ShareData) => Promise<void> };
  const hasShare = typeof nav.share === 'function';
  const file = poster?.file ?? null;
  const usePoster = !!file && !!poster?.canShare && hasShare && !failed;
  const noFileShare = !!file && !usePoster; // §3.2: canShare false, no share API, or the poster share threw

  useEffect(() => {
    const mq = window.matchMedia?.('(min-width: 1024px)');
    if (!mq) return;
    const on = () => setWide(mq.matches);
    on(); mq.addEventListener?.('change', on);
    return () => mq.removeEventListener?.('change', on);
  }, []);
  useEffect(() => { // the thumbnail and "Save poster" read the same blob URL
    if (!file) return;
    const u = URL.createObjectURL(file);
    setImgUrl(u);
    return () => { URL.revokeObjectURL(u); setImgUrl(null); };
  }, [file]);
  useEffect(() => { // "Link copied" for 2 s
    if (!copied) return;
    const t = setTimeout(() => setCopied(false), 2000);
    return () => clearTimeout(t);
  }, [copied]);

  /** Called synchronously from the tap so the sheet keeps its user-activation. */
  function sharePoster() {
    if (!file) return;
    let p: Promise<void>;
    try { p = nav.share!(sharePayload(file)); } catch (e) { onShareError(e); return; }
    p.catch(onShareError);
  }
  function onShareError(e: unknown) {
    if ((e as { name?: string })?.name === 'AbortError') return;
    setFailed(true);
  }
  function copyLink() { void navigator.clipboard?.writeText(cap.caption).then(() => setCopied(true)); }
  function message() { nav.share!({ text: cap.text, url: cap.url }).catch(() => {}); }

  return (
    <div class="flex flex-col gap-3" data-share-row>
      <div class="flex gap-3 items-start">
        {imgUrl && <img src={imgUrl} width={96} height={171} alt={posterAlt(type, role, surname(name), title)} class="border-2 border-ink shrink-0" data-share-thumb />}
        <div class="flex flex-col gap-2 items-start min-w-0 w-48 max-w-full" data-share-buttons>
          {usePoster && <button type="button" class={BTN} onClick={sharePoster} data-share-poster><Icon name="instagram" />Share</button>}
          {noFileShare && imgUrl && <a href={imgUrl} download={`cut-the-ties-${slug}.png`} class={BTN} data-share-save><Icon name="save" />Save poster</a>}
          <button type="button" class={BTN} onClick={copyLink} data-share-copy><Icon name="link" /><span aria-live="polite">{copied ? 'Link copied' : 'Copy link'}</span></button>
          {hasShare && <button type="button" class={BTN} onClick={message} data-share-message><Icon name="message" />Message</button>}
        </div>
      </div>
      {usePoster && <p class="text-sm text-ink/70" data-share-hint>Pick Instagram, then Story, Post, Reel or Message.</p>}
      {noFileShare && imgUrl && (
        <div class="flex flex-col gap-1 text-sm" data-share-fallback>
          <p class="text-ink/70">On iPhone the poster lands in Files; share it from there, or press and hold the image to save it to Photos.</p>
          <a href="https://www.instagram.com/" target="_blank" rel="noopener" class="underline font-semibold self-start">Open Instagram ↗</a>
        </div>
      )}
      {(wide || !hasShare) && (
        <div class="flex flex-wrap gap-2 items-center text-sm" data-share-intents>
          <span class="label-code">Post it:</span>
          {intentLinks(cap.text, cap.url).map((l) => <a href={l.href} target="_blank" rel="noopener" class="underline font-semibold">{l.name}</a>)}
        </div>
      )}
    </div>
  );
}
