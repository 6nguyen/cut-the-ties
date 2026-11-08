// social-sharing §5: only a short slug survives the query → route body / onward link.
import { describe, expect, it } from 'vitest';
import { validVia, viaQuery } from './api';

describe('validVia', () => {
  it('accepts a 1–16 char [a-z0-9-] slug and drops everything else', () => {
    expect(validVia('?via=share')).toBe('share');
    expect(validVia('?x=1&via=qr-flyer')).toBe('qr-flyer');
    expect(validVia('?via=Share')).toBeUndefined();
    expect(validVia(`?via=${'a'.repeat(17)}`)).toBeUndefined();
    expect(validVia('?via=a%20b')).toBeUndefined();
    expect(validVia('?via=')).toBeUndefined();
    expect(validVia('')).toBeUndefined();
    expect(validVia(undefined)).toBeUndefined();
  });
  it('viaQuery carries a valid tag on to the next page and nothing otherwise', () => {
    expect(viaQuery('?via=share')).toBe('?via=share');
    expect(viaQuery('?via=<b>')).toBe('');
  });
});
