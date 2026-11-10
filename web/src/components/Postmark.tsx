/** The under-inked ends of the act page's `ReceiptStamp`, reused so the two read as one ink. */
const MASK = 'radial-gradient(ellipse at center, #000 45%, rgba(0,0,0,0.78) 72%, rgba(0,0,0,0.38) 100%)';

/** "Nov 9" and "2:14 PM" for the postmark, local time; the CSS uppercases the day. */
export const postmarkDay = (d: Date): string => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
export const postmarkTime = (d: Date): string => d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }).toUpperCase();

const SIZE = {
  96: { ring: 'border-4', inner: 'inset-1.5 border-2', word: 'text-[26px]', date: 'text-[9px]' },
  64: { ring: 'border-[3px]', inner: 'inset-1 border-[1.5px]', word: 'text-[16px]', date: 'text-[7px]' },
} as const;

/**
 * results-pages §5 / §7: the circular crimson CALLED / WROTE postmark, day above and time below, double ring, −12°,
 * the stamp's grain. 96 px heads the receipt modal; 64 px sits on a done card's corner. `role="img"` with the
 * sentence as its name; `id` keys the SVG grain filter, one per instance.
 */
export default function Postmark({ wrote, name, at, size = 96, id, class: cls = '' }: { wrote: boolean; name: string; at: string | Date; size?: 96 | 64; id: string; class?: string }) {
  const d = typeof at === 'string' ? new Date(at) : at;
  const s = SIZE[size];
  const filter = `postmark-grain-${id}`;
  return (
    <div class={`shrink-0 relative ${cls}`} style={{ width: `${size}px`, height: `${size}px` }} role="img" aria-label={`${wrote ? 'Wrote to' : 'Called'} ${name}, ${postmarkDay(d)} ${postmarkTime(d)}`} data-postmark={wrote ? 'wrote' : 'called'} data-postmark-size={size}>
      <svg aria-hidden="true" width="0" height="0" class="absolute">
        <filter id={filter} x="-5%" y="-5%" width="110%" height="110%">
          <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="3" seed="7" result="noise" />
          <feDisplacementMap in="SourceGraphic" in2="noise" scale="3" xChannelSelector="R" yChannelSelector="G" />
        </filter>
      </svg>
      <div aria-hidden="true" class={`absolute inset-0 rounded-full ${s.ring} border-crimson bg-paper text-crimson flex flex-col items-center justify-center gap-px -rotate-[12deg]`}
        style={{ filter: `url(#${filter})`, WebkitMaskImage: MASK, maskImage: MASK }}>
        <span class={`absolute rounded-full ${s.inner} border-crimson`} />
        <span class={`font-mono font-bold ${s.date} leading-none tracking-[0.16em] uppercase`}>{postmarkDay(d)}</span>
        <span class={`font-condensed ${s.word} leading-none tracking-[0.06em]`}>{wrote ? 'WROTE' : 'CALLED'}</span>
        <span class={`font-mono font-bold ${s.date} leading-none tracking-[0.16em]`}>{postmarkTime(d)}</span>
      </div>
    </div>
  );
}
