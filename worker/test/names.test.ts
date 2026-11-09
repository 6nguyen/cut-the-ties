import { describe, expect, it } from 'vitest';
import { join } from 'node:path';
import { loadRows } from '../src/load';
import { surname } from '../src/names';

describe('surname', () => {
  it('is the last word of a plain name', () => {
    expect(surname('Alex Padilla')).toBe('Padilla');
    expect(surname(' J. Luis  Correa ')).toBe('Correa');
    expect(surname('Cher')).toBe('Cher');
  });
  it('skips generational suffixes and the comma before them', () => {
    expect(surname('Frank Pallone, Jr.')).toBe('Pallone');
    expect(surname('Angus S. King, Jr.')).toBe('King');
    expect(surname('Rudy Yakym III')).toBe('Yakym');
    expect(surname('Earl L. Carter Sr.')).toBe('Carter');
    expect(surname('Jr.')).toBe('Jr.'); // never empties a name
  });
  it('never returns a suffix for any member row in data/', () => {
    const bad = loadRows(join(__dirname, '..', '..', 'data')).members.map((m) => surname(m.name)).filter((s) => /^(jr|sr|ii|iii|iv|v)\.?$/i.test(s) || /[,.]$/.test(s));
    expect(bad).toEqual([]);
  });
});
