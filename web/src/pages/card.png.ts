// Default share card for pages that are not a goal (landing, results, goals overview).
import type { APIRoute } from 'astro';
import { cardSvg, renderCard } from './goals/[slug]/card.png';
import type { Goal } from '../lib/goals';

// mission-and-topics §1 rows 4 and 7: the H1 and the default description.
const SITE = { category: 'federal_vote', title: 'Call Congress to cut the ties that work against you', what_we_want: "Enter your address to find your House member, senators and state treasurer, then get a 60-second script for this week's calls on US ties with Israel, lobby money, wars and healthcare." } as Goal;

export const GET: APIRoute = async () => {
  const png = await renderCard(cardSvg(SITE).replace('FEDERAL VOTE · ', 'CONSTITUENT ACTION · '), 'capitol-dome-dusk'); // site-imagery §5: the landing's photo
  return new Response(new Uint8Array(png), { headers: { 'content-type': 'image/png', 'cache-control': 'public, max-age=86400' } });
};
