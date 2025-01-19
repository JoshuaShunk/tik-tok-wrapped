// app/chat/[contact]/page.tsx
"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import LZString from "lz-string";

interface Message {
  Content: string;
  Date: string;
  From: string;
}

export default function ChatDetailPage() {
  const { contact } = useParams<{ contact: string }>();
  const [messages, setMessages] = useState<Message[]>([]);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    const dataString = localStorage.getItem("tikTokData");
    if (dataString) {
      try {
        const decompressed = LZString.decompressFromUTF16(dataString);
        if (!decompressed) throw new Error("Decompression failed");
        const data = JSON.parse(decompressed);
        const dmData =
          data["Direct Messages"]?.["Chat History"]?.ChatHistory || {};
        let allMessages: Message[] = [];
        Object.keys(dmData).forEach((threadName: string) => {
          const threadContact = threadName
            .replace("Chat History with", "")
            .replace(":", "")
            .trim()
            .toLowerCase();
          if (threadContact === contact?.toLowerCase()) {
            const msgs = dmData[threadName];
            if (Array.isArray(msgs)) {
              allMessages = allMessages.concat(msgs);
            }
          }
        });
        allMessages.sort(
          (a, b) => new Date(a.Date).getTime() - new Date(b.Date).getTime()
        );
        setMessages(allMessages);
      } catch (err) {
        setError("Error reading chat data.");
      }
    } else {
      setError(
        "No TikTok data found. Please upload your JSON file on the home page."
      );
    }
  }, [contact]);

  if (error) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-white">
        <p className="text-red-500 text-xl">{error}</p>
        <button
          onClick={() => router.push("/")}
          className="mt-4 bg-blue-500 text-white px-4 py-2 rounded"
        >
          Go back
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Fixed navigation: Back to Chats and Back to Dashboard */}
      <div className="fixed top-0 left-0 flex gap-4 p-4 bg-white shadow z-10">
        <Link href="/chat" className="text-blue-600 hover:underline">
          &larr; Back to Chats
        </Link>
        <Link href="/" className="text-blue-600 hover:underline">
          Dashboard
        </Link>
      </div>
      <div className="pt-20 px-6">
        <h2 className="text-4xl font-bold mb-6 text-center capitalize">
          Chat with {contact}
        </h2>
        {messages.length > 0 ? (
          <div className="space-y-4">
            {messages.map((msg, index) => (
              <div
                key={index}
                className={`p-4 rounded shadow ${
                  msg.From.toLowerCase() === "joshuashunk"
                    ? "bg-blue-100 text-right"
                    : "bg-gray-100 text-left"
                }`}
              >
                <p className="text-sm text-gray-600">{msg.Date}</p>
                <p className="mt-1 text-lg">{msg.Content}</p>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-center text-xl">No messages found.</p>
        )}
      </div>
    </div>
  );
}
