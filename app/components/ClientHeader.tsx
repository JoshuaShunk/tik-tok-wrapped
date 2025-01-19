"use client";

import React from "react";
import Link from "next/link";

export default function ClientHeader({
  isConfirmed,
  onClearData,
}: {
  isConfirmed: boolean;
  onClearData: () => void;
}) {
  return (
    <header className="w-full bg-white border-b py-4 px-6 fixed top-0 left-0 z-10 flex justify-between items-center">
      <h1 className="text-3xl font-bold">TikTok Wrapped</h1>
      {isConfirmed && (
        <div className="flex space-x-4">
          <button
            onClick={onClearData}
            className="px-6 py-2 bg-gradient-to-r from-pastel-red to-pastel-red-dark text-white font-semibold rounded-full shadow-lg hover:from-pastel-red-light hover:to-pastel-red transition-transform transform hover:scale-105"
          >
            Upload New File
          </button>
          <Link
            href="/chat"
            className="px-6 py-2 bg-gradient-to-r from-pastel-blue to-pastel-blue-dark text-white font-semibold rounded-full shadow-lg hover:from-pastel-blue-light hover:to-pastel-blue transition-transform transform hover:scale-105"
          >
            Go to Chats
          </Link>
        </div>
      )}
    </header>
  );
}
