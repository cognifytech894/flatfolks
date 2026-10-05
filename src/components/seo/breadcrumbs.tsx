import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { baseUrl } from "@/lib/seo/listings";

export type Crumb = { name: string; href: string };

/** schema.org BreadcrumbList for the same trail the <Breadcrumbs> nav renders. */
export function breadcrumbJsonLd(crumbs: Crumb[]) {
  return {
    "@type": "BreadcrumbList",
    itemListElement: crumbs.map((crumb, index) => ({ "@type": "ListItem", position: index + 1, name: crumb.name, item: crumb.href === "/" ? baseUrl : `${baseUrl}${crumb.href}` })),
  };
}

export function Breadcrumbs({ crumbs }: { crumbs: Crumb[] }) {
  return (
    <nav aria-label="Breadcrumb" className="mb-4 flex flex-wrap items-center gap-1.5 text-sm text-slate-500">
      {crumbs.map((crumb, index) => (
        <span key={crumb.href} className="flex min-w-0 items-center gap-1.5">
          {index > 0 && <ChevronRight className="h-3.5 w-3.5 shrink-0" />}
          {index === crumbs.length - 1
            ? <span aria-current="page" className="truncate text-slate-700">{crumb.name}</span>
            : <Link href={crumb.href} className="hover:text-blue-600 hover:underline">{crumb.name}</Link>}
        </span>
      ))}
    </nav>
  );
}
