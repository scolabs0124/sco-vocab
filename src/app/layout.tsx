import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "SCO 단어암기장",
  description: "SCO 영어 단어 학습 관리 시스템",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body className="bg-gray-50 min-h-screen">{children}</body>
    </html>
  );
}
