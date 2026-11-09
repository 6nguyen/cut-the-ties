import { surname } from '@worker/names';

/** one-screen-receipt §2.1: the countdown stamp's under-inked ends (countdown-stamp §1). */
const STAMP_MASK = 'radial-gradient(ellipse at center, #000 45%, rgba(0,0,0,0.78) 72%, rgba(0,0,0,0.38) 100%)';
/** one-screen-receipt §2.1: the stamp's office, worded as on the poster ("Rep. Correa's office" / "the TX Treasurer"); the poster's own module stays in its lazy chunk. */
export function stampOffice(role: string, name: string, state?: string | null): string {
  return /treasurer/i.test(role) ? `the ${state ? `${state} ` : ''}Treasurer` : `${role} ${surname(name)}'s office`;
}
/** "Nov 8": the stamp's date, local. */
export const stampDay = (d: Date = new Date()): string => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

/**
 * one-screen-receipt §2.1 / results-pages §3.2: the "I CALLED" / "I WROTE" stamp, the countdown stamp's markup
 * reading as a finished act; the sentence is the accessible name. `id` keys the SVG grain filter, one per instance.
 */
export default function ReceiptStamp({ wrote, role, name, state, id, class: cls = '' }: { wrote: boolean; role: string; name: string; state?: string | null; id: string; class?: string }) {
  const office = stampOffice(role, name, state);
  const filter = `stamp-grain-${id}`;
  return (
    <div class={`inline-block self-start -rotate-[4deg] my-2 ml-1 ${cls}`} role="status" aria-label={`I ${wrote ? 'wrote to' : 'called'} ${office}, ${stampDay()}`} data-receipt-stamp>
      <svg aria-hidden="true" width="0" height="0" class="absolute">
        <filter id={filter} x="-5%" y="-5%" width="110%" height="110%">
          <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="3" seed="7" result="noise" />
          <feDisplacementMap in="SourceGraphic" in2="noise" scale="3" xChannelSelector="R" yChannelSelector="G" />
        </filter>
      </svg>
      <div aria-hidden="true" class="border-[5px] border-dashed border-crimson bg-paper text-crimson flex flex-col items-center gap-1 px-4 py-2 max-w-[320px]" style={{ filter: `url(#${filter})`, WebkitMaskImage: STAMP_MASK, maskImage: STAMP_MASK }}>
        <span class="font-condensed text-5xl leading-none tracking-[0.06em] whitespace-nowrap flex items-center gap-2">
          {wrote ? 'I WROTE' : 'I CALLED'}
          <svg viewBox="0 0 24 24" width="30" height="30" fill="none" stroke="currentColor" stroke-width="4" stroke-linecap="square"><path d="M4 13l5 5L20 6" /></svg>
        </span>
        <span class="font-mono font-bold text-xs tracking-[0.14em] uppercase text-center flex flex-wrap justify-center gap-x-3">
          <span>{office}</span><span>{stampDay()}</span>
        </span>
      </div>
    </div>
  );
}
