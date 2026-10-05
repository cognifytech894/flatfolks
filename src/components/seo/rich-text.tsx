import Link from "next/link";

/** Renders a paragraph where [text](/path) becomes an internal link. */
export function RichText({ text }: { text: string }) {
  const parts = text.split(/(\[[^\]]+\]\([^)]+\))/g);
  return (
    <>
      {parts.map((part, index) => {
        const link = part.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
        return link
          ? <Link key={index} href={link[2]} className="font-medium text-blue-600 hover:underline">{link[1]}</Link>
          : part;
      })}
    </>
  );
}
