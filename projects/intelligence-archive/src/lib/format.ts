import type { DatePrecision, VerificationStatus } from '../data/types';

export function formatDate(value: string, precision: DatePrecision): string {
  const [year = '', month = '', day = ''] = value.split('-');
  if (precision === 'year' || !month) return year;
  if (precision === 'month' || !day) return `${year}.${month}`;
  return `${year}.${month}.${day}`;
}

export function splitDisplayDate(value: string): { year: string; rest: string } {
  const [year = '', ...rest] = value.split('.');
  return { year, rest: rest.join('.') };
}

export const verificationLabel: Record<VerificationStatus, string> = {
  verified: '已核实',
  'partially-verified': '部分核实',
  unverified: '待核实',
};

export function hostname(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return url;
  }
}

export function pad2(value: number): string {
  return String(value).padStart(2, '0');
}

export function clamp(value: number, min = 0, max = 1): number {
  return Math.min(max, Math.max(min, value));
}

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

export function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

export function randomSeed(seed: number): () => number {
  let value = seed % 2147483647;
  if (value <= 0) value += 2147483646;
  return () => {
    value = (value * 16807) % 2147483647;
    return (value - 1) / 2147483646;
  };
}
