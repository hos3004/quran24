import { describe, expect, it } from 'vitest';
import { formatArabicNumber, getQuranMetadataForPage } from './quranMetadata';

describe('quran metadata', () => {
  it('returns Arabic surah and juz details for early pages', () => {
    expect(getQuranMetadataForPage(1)).toMatchObject({
      juz: 1,
      primarySurahId: 1,
      surahNamesArabic: ['الفاتحة']
    });
    expect(getQuranMetadataForPage(21)).toMatchObject({
      juz: 1,
      primarySurahId: 2,
      surahNamesArabic: ['البقرة']
    });
  });

  it('handles pages with multiple short surahs', () => {
    expect(getQuranMetadataForPage(604)).toMatchObject({
      juz: 30,
      surahIds: [112, 113, 114],
      surahNamesArabic: ['الإخلاص', 'الفلق', 'الناس']
    });
  });

  it('formats numbers with Arabic digits', () => {
    expect(formatArabicNumber(604)).toBe('٦٠٤');
  });
});
