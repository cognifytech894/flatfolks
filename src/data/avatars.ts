function personAvatar(bg: string, hair: string, style: "short" | "long"): string {
  const hairPath = style === "long"
    ? `<path d="M20 40c0-13 9-23 28-23s28 10 28 23v6H20z" fill="${hair}"/><path d="M18 46c-2 11 0 22 5 30h5c-4-11-4-22-2-31z" fill="${hair}"/><path d="M78 46c2 11 0 22-5 30h-5c4-11 4-22 2-31z" fill="${hair}"/>`
    : `<path d="M20 38c0-12 9-21 28-21s28 9 28 21v4H20z" fill="${hair}"/>`;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 96 96"><circle cx="48" cy="48" r="48" fill="${bg}"/><path d="M18 94c0-17 13-28 30-28s30 11 30 28" fill="#ffffff" fill-opacity=".95"/><circle cx="48" cy="42" r="18" fill="#f4c9a0"/>${hairPath}</svg>`;
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

export const presetAvatars: { id: string; label: string; src: string }[] = [
  { id: "boy-1", label: "Avatar", src: personAvatar("#2563eb", "#1f2937", "short") },
  { id: "boy-2", label: "Avatar", src: personAvatar("#059669", "#3b2a1a", "short") },
  { id: "boy-3", label: "Avatar", src: personAvatar("#d97706", "#1f2937", "short") },
  { id: "girl-1", label: "Avatar", src: personAvatar("#db2777", "#1f2937", "long") },
  { id: "girl-2", label: "Avatar", src: personAvatar("#7c3aed", "#3b2a1a", "long") },
  { id: "girl-3", label: "Avatar", src: personAvatar("#0d9488", "#1f2937", "long") },
];
