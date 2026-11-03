export function safeURL(value: string): string {
  try { const url = new URL(value, location.href); return ['https:','http:'].includes(url.protocol) ? url.href : ''; } catch { return ''; }
}

export const validEmail = (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) ? value : '';
