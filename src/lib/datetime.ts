export function nowIso() {
  return new Date().toISOString();
}

export function formatDateTime(value?: string | null) {
  if (!value) return "—";

  return new Intl.DateTimeFormat("zh-CN", {
    timeZone: "Asia/Shanghai",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(value));
}

export function toDateTimeLocalValue(value?: string | null) {
  if (!value) return "";
  const date = new Date(value);
  const offset = 8 * 60 * 60 * 1000;
  return new Date(date.getTime() + offset).toISOString().slice(0, 16);
}
