import { describe, expect, it } from 'vitest';

import {
  splitFileName,
  stripCopySuffix,
  suggestAvailableName,
  truncateName,
  validateNodeName,
} from './naming';

describe('splitFileName', () => {
  it('separates the extension', () => {
    expect(splitFileName('Report.pdf')).toEqual({ stem: 'Report', extension: '.pdf' });
  });

  it('uses the last dot, so versioned names keep their real extension', () => {
    expect(splitFileName('accounts.v2.final.pdf')).toEqual({
      stem: 'accounts.v2.final',
      extension: '.pdf',
    });
  });

  it('treats a leading dot as part of the name, not an extension', () => {
    expect(splitFileName('.gitignore')).toEqual({ stem: '.gitignore', extension: '' });
  });

  it('ignores a trailing dot', () => {
    expect(splitFileName('weird.')).toEqual({ stem: 'weird.', extension: '' });
  });

  it('handles a name with no extension', () => {
    expect(splitFileName('Financials')).toEqual({ stem: 'Financials', extension: '' });
  });
});

describe('stripCopySuffix', () => {
  it('removes a trailing counter', () => {
    expect(stripCopySuffix('Report (2)')).toBe('Report');
  });

  it('leaves parenthesised text that is not a counter', () => {
    expect(stripCopySuffix('Report (final)')).toBe('Report (final)');
  });

  it('only strips the last counter, so "Q1 (2024) (3)" keeps its year', () => {
    expect(stripCopySuffix('Q1 (2024) (3)')).toBe('Q1 (2024)');
  });
});

describe('suggestAvailableName', () => {
  it('returns the name unchanged when nothing clashes', () => {
    expect(suggestAvailableName('NDA.pdf', ['Other.pdf'])).toBe('NDA.pdf');
  });

  it('suffixes before the extension', () => {
    expect(suggestAvailableName('NDA.pdf', ['NDA.pdf'])).toBe('NDA (2).pdf');
  });

  it('keeps counting past the first free-looking number', () => {
    expect(suggestAvailableName('NDA.pdf', ['NDA.pdf', 'NDA (2).pdf', 'NDA (3).pdf'])).toBe(
      'NDA (4).pdf',
    );
  });

  it('never produces "file (2) (3)"', () => {
    expect(suggestAvailableName('NDA (2).pdf', ['NDA (2).pdf'])).toBe('NDA (3).pdf');
  });

  it('compares case-insensitively, matching the database index', () => {
    expect(suggestAvailableName('nda.pdf', ['NDA.PDF'])).toBe('nda (2).pdf');
  });

  it('works for folders, which have no extension', () => {
    expect(suggestAvailableName('Legal', ['Legal'])).toBe('Legal (2)');
  });

  it('gives up rather than looping forever', () => {
    const taken = ['x.pdf', ...Array.from({ length: 1000 }, (_, i) => `x (${i + 2}).pdf`)];
    expect(() => suggestAvailableName('x.pdf', taken)).toThrow();
  });
});

describe('truncateName', () => {
  it('leaves short names alone', () => {
    expect(truncateName('Report.pdf')).toBe('Report.pdf');
  });

  it('trims the stem but keeps the extension', () => {
    const result = truncateName(`${'a'.repeat(300)}.pdf`);
    expect(result).toHaveLength(255);
    expect(result.endsWith('.pdf')).toBe(true);
  });
});

describe('validateNodeName', () => {
  it('accepts an ordinary document name', () => {
    expect(validateNodeName('Q3 Report (final).pdf')).toBeNull();
  });

  it('accepts non-ASCII names', () => {
    expect(validateNodeName('Отчёт за квартал.pdf')).toBeNull();
  });

  it('rejects an empty or whitespace-only name', () => {
    expect(validateNodeName('   ')).not.toBeNull();
  });

  it.each(['a/b', 'a\\b', 'a:b', 'a*b', 'a?b', 'a"b', 'a<b', 'a>b', 'a|b'])(
    'rejects the path or reserved character in %j',
    (name) => {
      expect(validateNodeName(name)).not.toBeNull();
    },
  );

  it('rejects control characters', () => {
    expect(validateNodeName(`bad${String.fromCharCode(9)}name`)).not.toBeNull();
  });

  it('rejects the directory shorthands', () => {
    expect(validateNodeName('.')).not.toBeNull();
    expect(validateNodeName('..')).not.toBeNull();
  });

  it('rejects a name past the column limit', () => {
    expect(validateNodeName('a'.repeat(256))).not.toBeNull();
  });
});
