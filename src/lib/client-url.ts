const basePath = (process.env.NEXT_PUBLIC_CRM_BASE_PATH ?? "").replace(/\/+$/, "");

export function crmUrl(path: string) {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${basePath}${normalizedPath}`;
}
