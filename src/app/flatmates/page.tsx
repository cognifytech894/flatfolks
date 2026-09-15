import type { Metadata } from "next";
import { FlatmatesView } from "@/components/flatmates/flatmates-view";

export const metadata: Metadata = {
  title: "Find Flatmates | People Looking for a Flat | FlatFolks",
  description: "Browse people looking for a flat across India and offer them a match — filter by preferred gender on FlatFolks.",
};

export default function FlatmatesPage() {
  return <FlatmatesView />;
}
