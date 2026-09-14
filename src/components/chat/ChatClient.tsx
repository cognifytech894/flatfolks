"use client";

import React, { useEffect, useState } from "react";
import ChatWidget from "@/components/chat/ChatWidget";
import { ContactList } from "@/components/chat/ContactList";

const chatRequestsKey = "flatfolks_chat_requests";

function persistRequests(list: string[]) {
  window.localStorage.setItem(chatRequestsKey, JSON.stringify(list));
  window.dispatchEvent(new Event("flatfolks-chat-access"));
}

export default function ChatClient() {
  const [me, setMe] = useState<string>("Guest");
  const [peer, setPeer] = useState<string | undefined>(undefined);
  const [requestedOwners, setRequestedOwners] = useState<string[]>([]);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      const stored = window.localStorage.getItem("flatfolks_user");
      if (stored) {
        const user = JSON.parse(stored) as { name?: string };
        setMe(user.name || "Guest");
      }
      const storedRequests = window.localStorage.getItem(chatRequestsKey);
      // "Aman Sharma" was a hardcoded placeholder every interest request used
      // to add, regardless of the real owner — drop any leftover copy of it.
      const cleaned = (storedRequests ? JSON.parse(storedRequests) as string[] : []).filter((name) => name !== "Aman Sharma");
      setRequestedOwners(cleaned);
      if (storedRequests && JSON.parse(storedRequests).length !== cleaned.length) persistRequests(cleaned);
    });
    return () => window.cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    const syncChatAccess = () => {
      const storedRequests = window.localStorage.getItem(chatRequestsKey);
      setRequestedOwners(storedRequests ? JSON.parse(storedRequests) as string[] : []);
    };
    window.addEventListener("flatfolks-chat-access", syncChatAccess);
    return () => window.removeEventListener("flatfolks-chat-access", syncChatAccess);
  }, []);

  function removeContact(name: string) {
    const next = requestedOwners.filter((owner) => owner !== name);
    setRequestedOwners(next);
    persistRequests(next);
    if (peer === name) setPeer(undefined);
  }

  if (requestedOwners.length === 0) {
    return <main className="min-h-screen bg-slate-50 py-12"><div className="mx-auto max-w-xl px-4 text-center"><div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm"><h1 className="text-2xl font-semibold text-slate-900">Chat is locked</h1><p className="mt-3 text-sm leading-6 text-slate-600">Submit interest for a room or flatmate first. Once you contact an owner, their private chat will appear here.</p></div></div></main>;
  }

  return (
    <main className="min-h-screen bg-slate-50 py-12">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-slate-800">Chat</h1>
            <p className="mt-1 text-sm text-slate-600">One-to-one chat prototype (local only)</p>
          </div>
          <div className="text-sm text-slate-600">
            You are: <span className="font-semibold text-slate-800">{me}</span>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[260px_1fr]">
          <ContactList contacts={requestedOwners} selected={peer} onSelect={(p) => setPeer(p)} onDelete={removeContact} />

          <div>
            {!peer ? (
              <div className="rounded-lg border border-slate-200 bg-white p-6 text-slate-700">Select a contact to start a one-to-one chat.</div>
            ) : (
              <ChatWidget userName={me} peer={peer} />
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
