import { describe, it, expect } from 'vitest';
import { timeGreeting } from '../greeting.js';

describe('timeGreeting', () => {
  it('is morning before noon', () => {
    expect(timeGreeting(0)).toBe('Good morning');
    expect(timeGreeting(6)).toBe('Good morning');
    expect(timeGreeting(11)).toBe('Good morning');
  });
  it('is afternoon from 12:00 to 17:59', () => {
    expect(timeGreeting(12)).toBe('Good afternoon');
    expect(timeGreeting(17)).toBe('Good afternoon');
  });
  it('is evening from 18:00 on', () => {
    expect(timeGreeting(18)).toBe('Good evening');
    expect(timeGreeting(23)).toBe('Good evening');
  });
});
