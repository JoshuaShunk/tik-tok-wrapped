// app/layout.tsx
import "./globals.css";
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import ClientHeader from "./components/ClientHeader";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "TikTok Wrapped",
  description:
    "Upload your TikTok data to see your personalized wrapped summary.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={inter.className}>
      <body className="bg-white text-gray-900">
        <ClientHeader />
        <main className="pt-16">{children}</main>
      </body>
    </html>
  );
}
