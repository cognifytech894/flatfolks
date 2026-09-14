"use client";

import { X } from "lucide-react";

export function ContactList({ contacts, selected, onSelect, onDelete }: { contacts: string[]; selected?: string; onSelect: (name: string) => void; onDelete: (name: string) => void }) {
  return <div className="w-full max-w-xs"><h3 className="mb-1 text-sm font-semibold text-slate-700">Requested owners</h3><p className="mb-3 text-xs text-slate-500">Only owners you contacted are available.</p><div className="flex flex-col gap-2">{contacts.map((contact) => <div key={contact} className={`flex items-center gap-1 rounded-lg pr-1 text-sm ${selected === contact ? "bg-blue-600 text-white" : "border border-slate-200 bg-white text-slate-700"}`}><button onClick={() => onSelect(contact)} className="flex-1 truncate px-3 py-2 text-left">{contact}</button><button onClick={() => onDelete(contact)} aria-label={`Remove ${contact}`} className={`grid h-6 w-6 shrink-0 place-items-center rounded-full ${selected === contact ? "hover:bg-blue-700" : "hover:bg-slate-100"}`}><X className="h-3.5 w-3.5" /></button></div>)}</div></div>;
}
