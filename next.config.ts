import type { NextConfig } from "next";

function getBasePath() {
  const basePath = process.env.CRM_BASE_PATH?.trim().replace(/\/+$/, "") ?? "";
  if (!basePath) return "";
  if (!basePath.startsWith("/")) {
    throw new Error("CRM_BASE_PATH 必须以 / 开头，例如 /crm。");
  }
  return basePath;
}

const basePath = getBasePath();

const nextConfig: NextConfig = {
  // CRM 可通过 CRM_BASE_PATH 部署在门户站点的子路径下，例如 /crm。
  basePath: basePath || undefined,
  env: {
    // 仅公开路径前缀，不包含任何密钥；供浏览器端 API 请求拼接使用。
    NEXT_PUBLIC_CRM_BASE_PATH: basePath,
  },
};

export default nextConfig;
