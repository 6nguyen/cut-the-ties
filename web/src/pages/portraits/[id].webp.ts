// site-imagery §4: every committed portrait at a stable URL on the site's own origin, `/portraits/<bioguide_id>.webp`.
// Target cards are drawn in the browser, so they cannot use a hashed asset URL and must not carry a map of 538 of
// them; this endpoint writes the committed bytes into the build as they are (no re-encode).
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { APIRoute } from 'astro';
import { PORTRAIT, portraitIds } from '../../lib/images';

export function getStaticPaths() {
  return portraitIds().map((id) => ({ params: { id } }));
}

export const GET: APIRoute = ({ params }) =>
  new Response(readFileSync(join(PORTRAIT.dir, `${params.id}.webp`)), { headers: { 'Content-Type': 'image/webp' } });
