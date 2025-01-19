// app/layout.tsx
import "./globals.css";
import type { Metadata } from "next";
import { Inter } from "next/font/google";

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
      <head>
        <title>TikTok Wrapped</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </head>
      <body className="bg-white text-gray-900">
        {/* Global Header */}
        <header className="w-full border-b border-gray-200 py-4 px-6 fixed top-0 left-0 bg-white z-10">
          <h1 className="text-3xl font-bold">TikTok Wrapped</h1>
        </header>
        <main className="pt-20">{children}</main>
      </body>
    </html>
  );
}
