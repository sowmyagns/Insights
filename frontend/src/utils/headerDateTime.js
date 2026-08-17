export const DEFAULT_TIMEZONE = "Asia/Kolkata";
export const HEADER_LOCALE = "en-IN";

export function formatHeaderDateTime(date, timeZone = DEFAULT_TIMEZONE) {
  const safeTz = timeZone || DEFAULT_TIMEZONE;

  const format = (tz) => ({
    weekdayLabel: date.toLocaleDateString(HEADER_LOCALE, { weekday: "short", timeZone: tz }),
    dateLabel: date.toLocaleDateString(HEADER_LOCALE, {
      day: "numeric",
      month: "short",
      year: "numeric",
      timeZone: tz,
    }),
    timeLabel: date.toLocaleTimeString(HEADER_LOCALE, {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
      timeZone: tz,
    }),
  });

  try {
    return format(safeTz);
  } catch {
    return format(DEFAULT_TIMEZONE);
  }
}
