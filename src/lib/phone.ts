export function normalizePhone(phone: string) {
  let normalized = phone.trim().replace(/[\s\-()（）]/g, "");

  if (normalized.startsWith("+86")) {
    normalized = normalized.slice(3);
  } else if (normalized.startsWith("0086")) {
    normalized = normalized.slice(4);
  } else if (normalized.startsWith("86") && normalized.length === 13) {
    normalized = normalized.slice(2);
  }

  return normalized;
}
