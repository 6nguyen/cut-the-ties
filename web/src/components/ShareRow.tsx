// social-sharing §2.3, §3: the receipt screen's share row. ActForm imports this module lazily when a
// receipt exists (so the poster chunk never ships with the landing or the act page's own bundle) and
// calls `preparePoster` at once, so the File and the canShare answer are ready before the funnel ends.
import type { ComponentChildren } from 'preact';
import { useEffect, useState } from 'preact/hooks';
import { surname } from '@worker/names';
import { POSTER_LABEL, canShareFile, captionFor, intentLinks, posterDate, posterFile, sharePayload, targetLine, type PosterSpec } from '../lib/poster';

export interface Poster { file: File | null; canShare: boolean }

/** §2.1: draw once, keep the File and whether the sheet accepts it. Never throws. */
export async function preparePoster(spec: PosterSpec, slug: string): Promise<Poster> {
  const file = await posterFile(spec, `cut-the-ties-${slug}.png`);
  return { file, canShare: canShareFile(file) };
}

/** §2.2 spec from the receipt: verb by channel, target without a person's first name, nothing else personal. */
export function receiptSpec(type: 'call' | 'letter' | 'public_comment', role: string, name: string, state: string | undefined, title: string, what: string): PosterSpec {
  return { verb: type === 'call' ? 'I JUST CALLED' : 'I JUST WROTE TO', target: targetLine(role, name, state), title, what, date: posterDate() };
}

interface Props {
  type: 'call' | 'letter' | 'public_comment';
  role: string;
  name: string;
  title: string;
  slug: string;
  /** null while the poster is still rendering; the row then offers the link share alone. */
  poster: Poster | null;
  /** Rendered after the share buttons, before the fallback row: the receipt's "Your other action" link. */
  other?: ComponentChildren;
}

export default function ShareRow({ type, role, name, title, slug, poster, other }: Props) {
  const [copied, setCopied] = useState<'' | 'link' | 'caption'>('');
  const [failed, setFailed] = useState(false); // §2.3: the sheet threw something other than AbortError
  const [wide, setWide] = useState(false);
  const [imgUrl, setImgUrl] = useState<string | null>(null);
  const cap = captionFor(type, role, surname(name), title, slug);
  const nav = navigator as Navigator & { share?: (d: ShareData) => Promise<void> };
  const hasShare = typeof nav.share === 'function';
  const usePoster = !!poster?.file && poster.canShare && !failed;
  const fallback = !!poster?.file && !usePoster;

  useEffect(() => {
    const mq = window.matchMedia?.('(min-width: 1024px)');
    if (!mq) return;
    const on = () => setWide(mq.matches);
    on(); mq.addEventListener?.('change', on);
    return () => mq.removeEventListener?.('change', on);
  }, []);
  useEffect(() => {
    if (!fallback || !poster?.file) return;
    const u = URL.createObjectURL(poster.file);
    setImgUrl(u);
    return () => { URL.revokeObjectURL(u); setImgUrl(null); };
  }, [fallback, poster?.file]);

  /** Called synchronously from the tap so the sheet keeps its user-activation. */
  function sharePoster() {
    if (!poster?.file) return;
    let p: Promise<void>;
    try { p = nav.share!(sharePayload(poster.file)); } catch (e) { onShareError(e); return; }
    p.catch(onShareError);
  }
  function onShareError(e: unknown) {
    if ((e as { name?: string })?.name === 'AbortError') return;
    setFailed(true);
  }
  function shareLink() {
    if (hasShare) { nav.share!({ text: cap.text, url: cap.url }).catch(() => {}); return; }
    void navigator.clipboard?.writeText(cap.caption).then(() => setCopied('link'));
  }
  function copyCaption() { void navigator.clipboard?.writeText(cap.caption).then(() => setCopied('caption')); }

  return (
    <div class="flex flex-col gap-3" data-share-row>
      <div class="flex flex-wrap gap-2">
        {usePoster && <button type="button" class="btn btn-primary" onClick={sharePoster} data-share-poster>{POSTER_LABEL}</button>}
        <button type="button" class="btn btn-ghost" onClick={shareLink} data-share-link>{copied === 'link' ? 'Link copied' : 'Share link'}</button>
        {other}
      </div>
      {fallback && imgUrl && (
        <div class="flex flex-wrap gap-3 items-start border-t-2 border-ink pt-3" data-share-fallback>
          <img src={imgUrl} width={270} height={480} alt={`Poster: ${title}`} class="border-2 border-ink" />
          <div class="flex flex-col gap-2 text-sm">
            <a href={imgUrl} download={`cut-the-ties-${slug}.png`} class="btn btn-ghost self-start">Download poster</a>
            <p class="text-ink/70">On iPhone the poster lands in Files; share it from there, or press and hold the image to save it to Photos.</p>
            <button type="button" class="btn btn-ghost self-start" onClick={copyCaption}>{copied === 'caption' ? 'Caption copied' : 'Copy caption'}</button>
            <a href="https://www.instagram.com/" target="_blank" rel="noopener" class="btn btn-ghost self-start">Open Instagram ↗</a>
          </div>
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
