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
  isConfirmed,
  onClearData,
}: {
  children: React.ReactNode;
  isConfirmed: boolean; // Add this prop
  onClearData: () => void; // Add this prop
}) {
  return (
    <html lang="en" className={inter.className}>
      <head>
        <title>TikTok Wrapped</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </head>
      <body className="bg-white text-gray-900">
        {/* Client-side header */}
        <ClientHeader isConfirmed={isConfirmed} onClearData={onClearData} />
        <main className="pt-16">{children}</main>
      </body>
    </html>
  );
}
