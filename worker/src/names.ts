// The one place a display name becomes a surname. data/members.csv carries only `name`, and 17 rows
// end in a generational suffix ("Frank Pallone, Jr.", "Rudy Yakym III"), so "the last word" is wrong
// for them. Pure and dependency-free: the web islands import it too (`@worker/names`).
const SUFFIX = /^(jr|sr|ii|iii|iv|v)\.?$/i;

/** "Frank Pallone, Jr." → "Pallone". Two-word surnames (Wasserman Schultz) still give the last word: the data has no surname column. */
export function surname(name: string): string {
  const words = name.trim().split(/\s+/).map((w) => w.replace(/,+$/, '')).filter(Boolean);
  while (words.length > 1 && SUFFIX.test(words[words.length - 1])) words.pop();
  return words[words.length - 1] ?? name;
}
