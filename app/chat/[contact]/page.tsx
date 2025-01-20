/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { fetchDataFromDB } from "@/app/utils/dbHelpers";
import { processTikTokData } from "@/app/utils/dataProcessing";

interface ChatMessage {
  date: string;
  sender: string;
  message: string;
}

export default function ChatDetailPage() {
  const { contact } = useParams<{ contact: string }>();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const myUsername = "joshuashunk".toLowerCase();

  useEffect(() => {
    (async () => {
      const rawData = await fetchDataFromDB(setError);
      if (rawData) {
        const processed = processTikTokData(rawData, myUsername);
        // Use the chatMessages property:
        const dmChats = processed.dmData.chatMessages || {};
        let msgs: ChatMessage[] = [];
        Object.keys(dmChats).forEach((threadContact) => {
          if (threadContact.toLowerCase() === contact?.toLowerCase()) {
            msgs = msgs.concat(dmChats[threadContact]);
          }
        });
        msgs.sort(
          (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
        );
        setMessages(msgs);
      }
    })();
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
                  msg.sender.toLowerCase() === myUsername
                    ? "bg-blue-100 text-right"
                    : "bg-gray-100 text-left"
                }`}
              >
                <p className="text-sm text-gray-600">{msg.date}</p>
                <p className="mt-1 text-lg">{msg.message}</p>
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
