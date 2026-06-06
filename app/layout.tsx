import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "多业务线 CRM",
  description: "多业务线客户关系管理系统",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-CN">
      <body className="min-h-screen bg-gray-50">{children}</body>
    </html>
  );
}
