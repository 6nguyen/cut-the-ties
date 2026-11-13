// no-owner-ties §1.4 build guard: no page `astro build` writes names the owner or links the owner's
// GitHub account. Walks every HTML file in web/dist and names the first offending file. Photo credits
// linking github.com/unitedstates/images pass. Skips locally without a build; in CI (CI_TARGETS runs
// `build` before `test-web`) a missing dist is itself a failure so the guard cannot be skipped there.
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { describe, expect, it } from 'vitest';

const DIST = join(process.cwd(), 'dist');
/** Owner identifiers no built page may carry. Case-insensitive; the surname also catches "Nguyen, George". */
export const OWNER_PATTERNS: RegExp[] = [/nguyen/i, /github\.com\/6nguyen/i];

function walk(dir: string, out: string[] = []): string[] {
  for (const n of readdirSync(dir)) { const p = join(dir, n); if (statSync(p).isDirectory()) walk(p, out); else if (p.endsWith('.html')) out.push(p); }
  return out;
}

/** The files whose HTML matches any owner pattern, as `path: pattern` lines; empty when the build is clean. */
export function ownerLeaks(pages: string[], read: (p: string) => string = (p) => readFileSync(p, 'utf8')): string[] {
  const leaks: string[] = [];
  for (const p of pages) {
    const html = read(p);
    for (const re of OWNER_PATTERNS) if (re.test(html)) leaks.push(`${relative(process.cwd(), p)}: ${re}`);
  }
  return leaks;
}

describe('no owner ties in built pages', () => {
  const built = existsSync(DIST);
  it.skipIf(!built)('no HTML file names the owner or links github.com/6nguyen', () => {
    const pages = walk(DIST);
    expect(pages.length).toBeGreaterThan(0);
    expect(ownerLeaks(pages)).toEqual([]);
  });
  it('a photo credit linking github.com/unitedstates/images passes; a credit naming the owner fails and names the file', () => {
    const files: Record<string, string> = {
      '/dist/about/index.html': '<li>Portrait: unitedstates, <a href="https://github.com/unitedstates/images">unitedstates/images</a> (CC0)</li>',
      '/dist/donate/index.html': '<p>This site is built and paid for by George Nguyen, one person.</p>',
      '/dist/goals/x/index.html': '<a href="https://github.com/6nguyen/cut-the-ties/blob/main/docs/research/x.md">help us find it</a>',
    };
    const leaks = ownerLeaks(Object.keys(files), (p) => files[p]);
    expect(leaks).toHaveLength(3);
    expect(leaks.some((l) => l.includes('about'))).toBe(false);
    expect(leaks.filter((l) => l.includes('donate'))).toHaveLength(1);
    expect(leaks.filter((l) => l.includes('goals/x'))).toHaveLength(2);
  });
  if (!built) it('no web/dist: skipped locally, fails in CI', () => { expect(process.env.CI, 'CI must run `build` before `test-web`').toBeFalsy(); });
});
