import { describe, it, expect } from 'vitest';
import { catalog } from '../_catalog-index.js';

describe('catalog index', () => {
  it('has workflows and skills arrays of compact items', () => {
    expect(Array.isArray(catalog.workflows)).toBe(true);
    expect(Array.isArray(catalog.skills)).toBe(true);
    expect(catalog.workflows.length).toBeGreaterThan(0);
    expect(catalog.skills.length).toBeGreaterThan(0);
    const item = catalog.workflows[0];
    expect(Object.keys(item).sort()).toEqual(
      ['category', 'description', 'id', 'name', 'status'].sort(),
    );
  });
});
