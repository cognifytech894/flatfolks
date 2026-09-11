"use client";

export function ContactList({ contacts, selected, onSelect }: { contacts: string[]; selected?: string; onSelect: (name: string) => void }) {
  return <div className="w-full max-w-xs"><h3 className="mb-1 text-sm font-semibold text-slate-700">Requested owners</h3><p className="mb-3 text-xs text-slate-500">Only owners you contacted are available.</p><div className="flex flex-col gap-2">{contacts.map((contact) => <button key={contact} onClick={() => onSelect(contact)} className={`rounded-lg px-3 py-2 text-left text-sm ${selected === contact ? "bg-blue-600 text-white" : "border border-slate-200 bg-white text-slate-700"}`}>{contact}</button>)}</div></div>;
}
