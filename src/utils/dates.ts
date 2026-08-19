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
