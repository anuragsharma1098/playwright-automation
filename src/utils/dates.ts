/** Generates valid future stay dates so tests never depend on hardcoded calendar dates. */

function toISODate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export interface StayDates {
  checkIn: Date;
  checkOut: Date;
  checkInISO: string;
  checkOutISO: string;
}

/**
 * @param leadDays days from today until check-in (default 14, comfortably clear of any
 *   minimum-lead-time booking rule observed on either site).
 * @param nights length of stay (default 4).
 */
/** Formats an ISO date the way the booking page's Reservation Details shows it, e.g.
 * "Saturday, October 17, 2026". Parsed as a local date so the weekday never shifts by timezone. */
export function toLongDate(iso: string): string {
  const [year, month, day] = iso.split('-').map(Number);
  return new Date(year, month - 1, day).toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

/** ISO date `offset` days from today in the *local* timezone - what the site's calendar (rendered
 * by the same browser/machine) treats as today. */
export function isoDaysFromToday(offset: number): string {
  const date = new Date();
  date.setDate(date.getDate() + offset);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/** `?checkIn=...&checkOut=...&adults=...` - the query both /listings and /listings/{id} accept. */
export function stayQuery(stay: Pick<StayDates, 'checkInISO' | 'checkOutISO'>, adults: number) {
  return `?checkIn=${stay.checkInISO}&checkOut=${stay.checkOutISO}&adults=${adults}`;
}

/** Whole nights between two ISO dates. */
export function nightsBetween(checkInISO: string, checkOutISO: string): number {
  return Math.round((Date.parse(checkOutISO) - Date.parse(checkInISO)) / 86_400_000);
}

export function futureStayDates(leadDays = 14, nights = 4): StayDates {
  const checkIn = new Date();
  checkIn.setDate(checkIn.getDate() + leadDays);
  const checkOut = new Date(checkIn);
  checkOut.setDate(checkOut.getDate() + nights);

  return {
    checkIn,
    checkOut,
    checkInISO: toISODate(checkIn),
    checkOutISO: toISODate(checkOut),
  };
}
