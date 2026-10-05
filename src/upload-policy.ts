export function declaredContentLength(value: string | undefined): number | null {
  if (!value || !/^\d+$/.test(value)) return null;
  const length = Number(value);
  return Number.isSafeInteger(length) && length >= 0 ? length : null;
}
