// app/chat/page.tsx
"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { fetchDataFromDB } from "@/app/utils/dbHelpers";
import { processTikTokData } from "@/app/utils/dataProcessing";import List from "@mui/material/List";
import ListItem from "@mui/material/ListItem";
import Divider from "@mui/material/Divider";
import ListItemAvatar from "@mui/material/ListItemAvatar";
import Avatar from "@mui/material/Avatar";
import Typography from "@mui/material/Typography";
import Box from "@mui/material/Box";

interface ChatSummary {
  contact: string;
  totalMessages: number;
  lastMessage: {
    sender: string;
    content: string;
  };
}

export default function ChatPage() {
  const [chatSummaries, setChatSummaries] = useState<ChatSummary[]>([]);
  const [error, setError] = useState<string | null>(null);
  const myUsername = "joshuashunk".toLowerCase();

  useEffect(() => {
    (async () => {
      const rawData = await fetchDataFromDB(setError);
      if (rawData) {
        const processed = processTikTokData(rawData, myUsername);
        const dmChatMessages = processed.dmData.chatMessages; // Object where key = contact, value = ChatMessage[]
        const summaries: ChatSummary[] = [];
        Object.keys(dmChatMessages).forEach((contactKey: string) => {
          const messages = dmChatMessages[contactKey];
          if (Array.isArray(messages) && messages.length > 0) {
            const sortedMessages = [...messages].sort(
              (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
            );
            const lastMsg = sortedMessages[sortedMessages.length - 1];
            summaries.push({
              contact: contactKey.toLowerCase(),
              totalMessages: messages.length,
              lastMessage: {
                sender: lastMsg.sender || "Unknown",
                content: lastMsg.message || "No content",
              },
            });
          }
        });
        setChatSummaries(summaries);
      }
    })();
  }, []);

  return (
    <div className="min-h-screen bg-white">
      <div className="flex justify-between items-center pt-4 px-6">
        <Link href="/" className="text-blue-600 hover:underline text-lg">
          &larr; Back to Dashboard
        </Link>
        <h2 className="text-5xl font-bold mx-auto">Your Chats</h2>
        <div className="w-24"></div>
      </div>
      <div className="pt-6 px-6">
        {error && <p className="text-red-500 text-center">{error}</p>}
        {!error && chatSummaries.length > 0 ? (
          <List sx={{ width: "100%", bgcolor: "background.paper" }}>
            {chatSummaries.map((chat, index) => (
              <React.Fragment key={chat.contact}>
                <ListItem
                  alignItems="flex-start"
                  component={Link}
                  href={`/chat/${chat.contact}`}
                  sx={{
                    textDecoration: "none",
                    color: "inherit",
                    display: "flex",
                    alignItems: "center",
                  }}
                >
                  <ListItemAvatar>
                    <Avatar
                      alt={chat.contact}
                      src={`/static/images/avatar/${index + 1}.jpg`}
                      sx={{ width: 56, height: 56 }}
                    />
                  </ListItemAvatar>
                  <Box sx={{ flexGrow: 1, ml: 2 }}>
                    <Typography
                      variant="h6"
                      component="div"
                      sx={{ fontSize: "1.25rem", fontWeight: "bold" }}
                    >
                      {chat.contact}
                    </Typography>
                    <Typography
                      variant="body2"
                      color="text.secondary"
                      sx={{ fontSize: "1rem", fontWeight: "normal" }}
                    >
                      <span style={{ fontWeight: "bold", color: "black" }}>
                        {chat.lastMessage.sender}:
                      </span>{" "}
                      {chat.lastMessage.content}
                    </Typography>
                  </Box>
                  <Typography
                    variant="body1"
                    sx={{
                      fontSize: "1rem",
                      color: "text.primary",
                      fontWeight: "medium",
                      textAlign: "right",
                      flexShrink: 0,
                      minWidth: "80px",
                      paddingLeft: "16px",
                    }}
                  >
                    {chat.totalMessages} messages
                  </Typography>
                </ListItem>
                {index < chatSummaries.length - 1 && (
                  <Divider variant="fullWidth" component="li" />
                )}
              </React.Fragment>
            ))}
          </List>
        ) : (
          !error && <p className="text-center text-xl">No chat data found.</p>
        )}
      </div>
    </div>
  );
}
