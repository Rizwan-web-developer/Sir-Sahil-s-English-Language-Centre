const DATE_TIME_ZONE = "Asia/Karachi";

/** Format a numeric PKR amount without decimals: Rs 12,500. */
export function formatPKR(amount: number | null | undefined): string {
  const value = Number(amount ?? 0);
  return `Rs ${new Intl.NumberFormat("en-PK", {
    maximumFractionDigits: 0,
  }).format(value)}`;
}

export function formatNumber(value: number | null | undefined): string {
  return new Intl.NumberFormat("en-PK").format(Number(value ?? 0));
}

export function formatPercent(value: number | null | undefined): string {
  if (value === null || value === undefined || Number.isNaN(value)) return "—";
  return `${Math.round(Number(value))}%`;
}

/** "14:00:00" -> "2:00 PM" */
export function formatTime(value: string | null | undefined): string {
  if (!value) return "—";
  const [hoursRaw, minutesRaw] = value.split(":");
  const hours = Number(hoursRaw);
  const minutes = Number(minutesRaw ?? 0);
  if (Number.isNaN(hours)) return "—";
  const period = hours >= 12 ? "PM" : "AM";
  const hour12 = hours % 12 === 0 ? 12 : hours % 12;
  return `${hour12}:${String(minutes).padStart(2, "0")} ${period}`;
}

export function formatTimeRange(
  start: string | null | undefined,
  end: string | null | undefined,
): string {
  return `${formatTime(start)} – ${formatTime(end)}`;
}

function toDate(value: string | Date): Date {
  if (value instanceof Date) return value;
  // Date-only strings are interpreted at noon to avoid timezone shifts.
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return new Date(`${value}T12:00:00`);
  return new Date(value);
}

export function formatDate(
  value: string | Date | null | undefined,
  options: Intl.DateTimeFormatOptions = { day: "numeric", month: "short", year: "numeric" },
): string {
  if (!value) return "—";
  const date = toDate(value);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("en-GB", {
    ...options,
    timeZone: DATE_TIME_ZONE,
  }).format(date);
}

export function formatLongDate(value: string | Date | null | undefined): string {
  return formatDate(value, {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export function formatMonth(value: string | Date | null | undefined): string {
  return formatDate(value, { month: "long", year: "numeric" });
}

export function formatDateTime(value: string | Date | null | undefined): string {
  return formatDate(value, {
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
  });
}

/** Current date in Pakistan as YYYY-MM-DD. */
export function todayInKarachi(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: DATE_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

/** Current time in Pakistan as HH:MM (24h). */
export function nowTimeInKarachi(): string {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: DATE_TIME_ZONE,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(new Date());
  const hour = parts.find((p) => p.type === "hour")?.value ?? "00";
  const minute = parts.find((p) => p.type === "minute")?.value ?? "00";
  return `${hour}:${minute}`;
}

/** First day of the current month as YYYY-MM-DD (Karachi). */
export function currentMonthStart(): string {
  return `${todayInKarachi().slice(0, 7)}-01`;
}

/** ISO weekday: Monday = 1 … Sunday = 7. */
export function isoDayOfWeek(date: string | Date = new Date()): number {
  const parsed = toDate(date);
  const day = parsed.getUTCDay(); // 0 = Sunday
  return ((day + 6) % 7) + 1;
}

export function greetingForNow(): string {
  const hour = Number(
    new Intl.DateTimeFormat("en-GB", {
      timeZone: DATE_TIME_ZONE,
      hour: "2-digit",
      hour12: false,
    }).format(new Date()),
  );
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

export function initials(name: string | null | undefined): string {
  if (!name) return "?";
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("");
}
