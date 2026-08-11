import type { CSSProperties } from 'vue';

export function classes(...values: unknown[]): string[] {
  return values.flatMap((value) => {
    if (!value) return [];
    if (typeof value === 'string') return [value];
    if (Array.isArray(value)) return classes(...value);
    if (typeof value === 'object') {
      return Object.entries(value as Record<string, unknown>)
        .filter(([, enabled]) => Boolean(enabled))
        .map(([name]) => name);
    }
    return [];
  });
}

export function sizeToCss(value?: string | number): string | undefined {
  if (value === undefined || value === null || value === '') return undefined;
  if (typeof value === 'number') return `${value}px`;
  const normalized = value.trim();
  return /^-?\d+(?:\.\d+)?$/.test(normalized) ? `${normalized}px` : normalized;
}

export function isEmptyValue(value: unknown): boolean {
  return (
    value === undefined ||
    value === null ||
    value === '' ||
    (Array.isArray(value) && value.length === 0)
  );
}

export function mergeStyles(...styles: Array<CSSProperties | string | undefined>): Array<CSSProperties | string> {
  return styles.filter(Boolean) as Array<CSSProperties | string>;
}

export function displayValue(value: unknown): string {
  if (value === undefined || value === null) return '';
  if (Array.isArray(value)) return value.join('、');
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}

