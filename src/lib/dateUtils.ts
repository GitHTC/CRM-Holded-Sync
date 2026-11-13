import { format, isBefore } from 'date-fns';
import { es } from 'date-fns/locale';

/**
 * Safely parses any date representation into a valid Date object in local time.
 * Prioritizes Spanish/Holded DD/MM/YYYY and ISO YYYY-MM-DD formats before native Date()
 * to avoid US MM/DD/YYYY misinterpretation and UTC midnight off-by-one day shifts.
 */
export function parseSafeDate(value: any): Date | null {
  if (value === null || value === undefined || value === '') {
    return null;
  }

  // Already a Date object
  if (value instanceof Date) {
    return isNaN(value.getTime()) ? null : value;
  }

  // Number: UNIX timestamp in seconds or milliseconds
  if (typeof value === 'number') {
    if (isNaN(value) || value <= 0) return null;
    // Timestamps in seconds are ~10 digits (< 100,000,000,000)
    // Timestamps in milliseconds are ~13 digits
    const ms = value < 100000000000 ? value * 1000 : value;
    const d = new Date(ms);
    return isNaN(d.getTime()) ? null : d;
  }

  // String
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) return null;

    // 1. Check if numeric string e.g. "1726400000" or "1726400000000"
    if (/^\d{9,14}$/.test(trimmed)) {
      const num = Number(trimmed);
      const ms = num < 100000000000 ? num * 1000 : num;
      const d = new Date(ms);
      if (!isNaN(d.getTime())) return d;
    }

    // 2. Handle YYYY-MM-DD or YYYY/MM/DD (date-only) in local time (noon) to avoid UTC midnight shift
    const ymdMatch = trimmed.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})$/);
    if (ymdMatch) {
      const year = Number(ymdMatch[1]);
      const month = Number(ymdMatch[2]);
      const day = Number(ymdMatch[3]);
      const d = new Date(year, month - 1, day, 12, 0, 0);
      if (!isNaN(d.getTime())) return d;
    }

    // 3. Handle DD/MM/YYYY or DD-MM-YYYY (with optional time HH:mm[:ss]) BEFORE native new Date()
    // Holded API v2 returns dates in "DD/MM/YYYY" format (e.g. "20/10/2026" or "05/10/2026")
    const dmyMatch = trimmed.match(
      /^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})(?:\s+(\d{1,2}):(\d{2})(?::(\d{2}))?)?$/
    );
    if (dmyMatch) {
      let day = Number(dmyMatch[1]);
      let month = Number(dmyMatch[2]);
      const year = Number(dmyMatch[3]);
      const hours = dmyMatch[4] !== undefined ? Number(dmyMatch[4]) : 12;
      const minutes = dmyMatch[5] !== undefined ? Number(dmyMatch[5]) : 0;
      const seconds = dmyMatch[6] !== undefined ? Number(dmyMatch[6]) : 0;

      // Fallback if month > 12 and day <= 12
      if (month > 12 && day <= 12) {
        const temp = day;
        day = month;
        month = temp;
      }

      const d = new Date(year, month - 1, day, hours, minutes, seconds);
      if (!isNaN(d.getTime())) return d;
    }

    // 4. Try standard ISO datetime parsing (e.g. "2026-10-13T10:04:06")
    const standardDate = new Date(trimmed);
    if (!isNaN(standardDate.getTime())) {
      return standardDate;
    }
  }

  return null;
}

/**
 * Safely formats a date value using date-fns without throwing RangeError.
 */
export function formatSafeDate(
  value: any,
  formatStr: string,
  options?: any,
  fallback: string = ''
): string {
  try {
    const date = parseSafeDate(value);
    if (!date) return fallback;
    return format(date, formatStr, { locale: es, ...options });
  } catch (err) {
    console.warn("formatSafeDate error for value:", value, err);
    return fallback;
  }
}

/**
 * Safely compares if a date is before targetDate.
 */
export function isDateBefore(value: any, target: Date): boolean {
  try {
    const date = parseSafeDate(value);
    if (!date) return false;
    return isBefore(date, target);
  } catch {
    return false;
  }
}

/**
 * Converts a date value into YYYY-MM-DD string for HTML <input type="date"> and day comparisons.
 */
export function toDateInputValue(value: any): string {
  const d = parseSafeDate(value);
  if (!d) return '';
  try {
    return format(d, 'yyyy-MM-dd');
  } catch {
    return '';
  }
}
