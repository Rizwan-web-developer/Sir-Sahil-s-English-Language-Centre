export function normalizeStudentCode(input: string) {
  const raw = input.trim().toUpperCase();
  if (!raw) return "";
  if (raw.startsWith("SELC-")) return raw;
  const digits = raw.replace(/\D/g, "");
  if (!digits) return raw;
  return `SELC-${digits.padStart(4, "0")}`;
}
