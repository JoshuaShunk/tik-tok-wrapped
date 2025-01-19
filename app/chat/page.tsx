// app/chat/page.tsx
"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import LZString from "lz-string";

interface ChatSummary {
  contact: string;
  totalMessages: number;
}

export default function ChatPage() {
  const [chatSummaries, setChatSummaries] = useState<ChatSummary[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const dataString = localStorage.getItem("tikTokData");
    if (dataString) {
      try {
        const decompressed = LZString.decompressFromUTF16(dataString);
        if (!decompressed) throw new Error("Decompression failed");
        const data = JSON.parse(decompressed);
        const dmData =
          data["Direct Messages"]?.["Chat History"]?.ChatHistory || {};
        const summaries: ChatSummary[] = [];
        Object.keys(dmData).forEach((threadName: string) => {
          const contact = threadName
            .replace("Chat History with", "")
            .replace(":", "")
            .trim();
          const messages = dmData[threadName];
          if (Array.isArray(messages)) {
            summaries.push({
              contact: contact.toLowerCase(),
              totalMessages: messages.length,
            });
          }
        });
        setChatSummaries(summaries);
      } catch (err) {
        setError("Error reading data from localStorage.");
      }
    } else {
      setError(
        "No TikTok data found. Please upload your JSON file on the home page."
      );
    }
  }, []);

  return (
    <div className="min-h-screen bg-white">
      {/* Fixed Back Button to Dashboard */}
      <div className="fixed top-0 left-0 p-4">
        <Link href="/" className="text-blue-600 hover:underline">
          &larr; Back to Dashboard
        </Link>
      </div>
      <div className="pt-16 px-6">
        <h2 className="text-4xl font-bold mb-6 text-center">Your Chats</h2>
        {error && <p className="text-red-500 text-center">{error}</p>}
        {!error && chatSummaries.length > 0 ? (
          <div className="space-y-4">
            {chatSummaries.map((chat) => (
              <Link
                key={chat.contact}
                href={`/chat/${chat.contact}`}
                className="block p-4 bg-gray-50 rounded shadow hover:bg-gray-100"
              >
                <div className="flex justify-between items-center">
                  <span className="text-2xl font-semibold capitalize">
                    {chat.contact}
                  </span>
                  <span className="text-gray-600 text-lg">
                    {chat.totalMessages} messages
                  </span>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          !error && <p className="text-center text-xl">No chat data found.</p>
        )}
      </div>
    </div>
  );
}
