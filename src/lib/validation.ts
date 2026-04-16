/**
 * Input validation utilities for forms and API calls.
 */

export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

export function isValidPhone(phone: string): boolean {
  return /^[+]?[\d\s\-().]{7,15}$/.test(phone.trim());
}

export function isNonEmpty(value: string | undefined | null): boolean {
  return typeof value === 'string' && value.trim().length > 0;
}

export function sanitizeString(value: string): string {
  return value.replace(/<[^>]*>/g, '').trim();
}

export function isPositiveNumber(value: number | string): boolean {
  const n = Number(value);
  return !isNaN(n) && n > 0;
}

export function validateRequired(
  fields: Record<string, string | undefined | null>
): string | null {
  for (const [key, value] of Object.entries(fields)) {
    if (!isNonEmpty(value as string)) {
      return `${key} is required.`;
    }
  }
  return null;
}
