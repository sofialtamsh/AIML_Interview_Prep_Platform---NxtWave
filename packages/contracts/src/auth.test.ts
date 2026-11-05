import { describe, expect, it } from 'vitest';
import { Email, Password, RegisterBody } from './auth';

describe('auth contracts', () => {
  it('normalizes emails', () => {
    expect(Email.parse('  Priya@NxtWave.co.IN ')).toBe('priya@nxtwave.co.in');
    expect(Email.safeParse('priya@').success).toBe(false);
  });

  it('enforces the password policy', () => {
    expect(Password.safeParse('short').success).toBe(false);
    expect(Password.safeParse('Password123').success).toBe(false); // common, case-insensitive
    expect(Password.safeParse('x'.repeat(129)).success).toBe(false);
    expect(Password.safeParse('learning-rag-daily').success).toBe(true);
  });

  it('requires a name on registration', () => {
    const r = RegisterBody.safeParse({
      email: 'a@b.co',
      password: 'learning-rag-daily',
      fullName: '  ',
    });
    expect(r.success).toBe(false);
  });
});
