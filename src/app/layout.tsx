import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "元川 AI · 轻量 CRM",
  description: "客户管理与跟进工作台",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      className="h-full antialiased"
    >
      <body className="min-h-full">{children}</body>
    </html>
  );
}
