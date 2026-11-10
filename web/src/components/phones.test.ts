// call-the-right-office §1.2–1.3: one number, keyed on the office the action names; only the switchboard is labelled.
import { describe, expect, it } from 'vitest';
import { phoneOrder, closedLine } from './ActForm';
import { SWITCHBOARD } from '@worker/types';

describe('phoneOrder', () => {
  it('a dc action: the DC number, DC hours, no label', () => {
    expect(phoneOrder(['202-225-2965'], 'dc')).toEqual([{ phone: '202-225-2965', district: false, label: null }]);
  });
  it('a district action: the district number on the state\'s hours, no label', () => {
    expect(phoneOrder(['714-559-6190'], 'district')).toEqual([{ phone: '714-559-6190', district: true, label: null }]);
  });
  it('no DC phone on file: the Capitol switchboard, labelled', () => {
    expect(phoneOrder([SWITCHBOARD], 'dc')).toEqual([{ phone: '202-224-3121', district: false, label: 'Capitol switchboard' }]);
  });
  it('a lone number with no office (treasurer, member-elect) is unlabelled on DC hours', () => {
    expect(phoneOrder(['555-0100'], null)).toEqual([{ phone: '555-0100', district: false, label: null }]);
    expect(phoneOrder([])).toEqual([]);
  });
  it('closedLine names the office; none for a treasurer', () => {
    expect(closedLine('dc')).toMatch(/^The DC office is closed\. Leave a voicemail/);
    expect(closedLine('district')).toBe('The district office is closed.');
    expect(closedLine(null)).toBeNull();
  });
});
