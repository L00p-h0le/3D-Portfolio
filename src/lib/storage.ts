export const storage = {
  get(key: string): string | null { try { return localStorage.getItem(key); } catch { return null; } },
  set(key: string, value: string | number) { try { localStorage.setItem(key, String(value)); } catch {} },
};
