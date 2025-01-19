/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { fetchDataFromDB } from "@/app/utils/dbHelpers";
import List from "@mui/material/List";
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

  useEffect(() => {
    (async () => {
      const data = await fetchDataFromDB(setError);
      if (data) {
        const dmData =
          data["Direct Messages"]?.["Chat History"]?.ChatHistory || {};
        const summaries: ChatSummary[] = [];

        Object.keys(dmData).forEach((threadName: string) => {
          const contact = threadName
            .replace("Chat History with", "")
            .replace(":", "")
            .trim();
          const messages = dmData[threadName];
          if (Array.isArray(messages) && messages.length > 0) {
            const sortedMessages = [...messages].sort(
              (a, b) => new Date(a.Date).getTime() - new Date(b.Date).getTime()
            );
            const lastMessage = sortedMessages[sortedMessages.length - 1];
            summaries.push({
              contact: contact.toLowerCase(),
              totalMessages: messages.length,
              lastMessage: {
                sender: lastMessage.From || "Unknown", // Get the sender's name
                content: lastMessage.Content || "No content", // Get the message content
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
        <div className="w-24"></div> {/* Spacer to balance the layout */}
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
                      src={`/static/images/avatar/${index + 1}.jpg`} // Replace with actual avatar URLs
                      sx={{ width: 56, height: 56 }} // Larger avatar size
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
                      textAlign: "right", // Aligns the total messages count to the right
                      flexShrink: 0, // Prevents it from shrinking when space is tight
                      minWidth: "80px", // Optional: Consistent spacing
                      paddingLeft: "16px", // Adds more left padding
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
