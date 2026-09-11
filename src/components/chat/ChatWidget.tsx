"use client";

import React, { useEffect, useRef, useState } from "react";

type Message = {
  id: string;
  user: string;
  text: string;
  ts: number;
};

export default function ChatWidget({ userName = "Guest", peer }: { userName?: string; peer?: string }) {
  const [messages, setMessages] = useState<Message[]>(() => {
    try {
      const raw = localStorage.getItem("flatfolks_chat_messages");
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  });
  const [text, setText] = useState("");
  const channelRef = useRef<BroadcastChannel | null>(null);

  useEffect(() => {
    // Use a pair-specific channel name when `peer` is provided so messages are one-to-one
    const channelName = peer ? `flatfolks-chat:${[userName, peer].sort().join(":")}` : "flatfolks-chat";
    channelRef.current = new BroadcastChannel(channelName);
    channelRef.current.onmessage = (ev) => {
      const msg = ev.data as Message;
      setMessages((prev) => {
        const next = [...prev, msg];
        try {
          // store per-conversation messages
          const key = peer ? `flatfolks_chat_messages:${[userName, peer].sort().join(":")}` : "flatfolks_chat_messages";
          localStorage.setItem(key, JSON.stringify(next));
        } catch {}
        return next;
      });

      // Show a browser notification for messages not from this user
      if (typeof window !== "undefined" && Notification.permission === "granted") {
        if (msg.user !== userName) {
          try {
            new Notification(`${msg.user} sent a message`, {
              body: msg.text,
            });
          } catch {}
        }
      }
    };

    return () => {
      channelRef.current?.close();
    };
  }, [userName, peer]);

  useEffect(() => {
    if (typeof window !== "undefined" && "Notification" in window && Notification.permission !== "granted") {
      try {
        Notification.requestPermission();
      } catch {}
    }
  }, []);

  const sendMessage = () => {
    if (!text.trim()) return;
    const msg: Message = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
      user: userName || "Guest",
      text: text.trim(),
      ts: Date.now(),
    };

    // Post to the BroadcastChannel for other tabs/windows
    try {
      channelRef.current?.postMessage(msg);
    } catch {}

    // Also append locally into conversation-specific storage
    setMessages((prev) => {
      const next = [...prev, msg];
      try {
        const key = peer ? `flatfolks_chat_messages:${[userName, peer].sort().join(":")}` : "flatfolks_chat_messages";
        localStorage.setItem(key, JSON.stringify(next));
      } catch {}
      return next;
    });

    setText("");
  };

  return (
    <div className="mx-auto w-full max-w-2xl rounded-xl border border-slate-200 bg-white/80 p-4 shadow-sm">
      <h2 className="mb-3 text-lg font-semibold text-slate-800">Live Chat</h2>
      <div className="flex h-80 flex-col gap-3 overflow-hidden">
        <div className="flex-1 overflow-auto rounded-md border border-slate-100 bg-slate-50 p-3">
          {messages.length === 0 ? (
            <p className="text-sm text-slate-500">No messages yet — say hi!</p>
          ) : (
            <ul className="flex flex-col gap-2">
              {messages.map((m) => (
                <li key={m.id} className={`flex flex-col ${m.user === userName ? "items-end" : "items-start"}`}>
                  <div className="max-w-[85%] rounded-lg px-3 py-2 text-sm shadow-sm" style={{ background: m.user === userName ? "#dcfce7" : "white" }}>
                    <div className="text-xs font-medium text-slate-600">{m.user}</div>
                    <div className="whitespace-pre-wrap text-slate-800">{m.text}</div>
                    <div className="mt-1 text-right text-[10px] text-slate-400">{new Date(m.ts).toLocaleTimeString()}</div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="mt-2 flex items-center gap-2">
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") sendMessage();
            }}
            placeholder="Type a message..."
            className="flex-1 rounded-md border border-slate-200 px-3 py-2 text-sm shadow-sm"
            aria-label="Type a message"
          />
          <button
            onClick={sendMessage}
            className="rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
}
