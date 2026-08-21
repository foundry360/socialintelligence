"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BookOpen,
  LayoutDashboard,
  Library,
  MessageSquare,
  type LucideIcon,
} from "lucide-react";

const links: {
  href: string;
  label: string;
  icon: LucideIcon;
  exact?: boolean;
}[] = [
  { href: "/workspace", label: "Overview", icon: LayoutDashboard, exact: true },
  { href: "/workspace/knowledge", label: "Knowledge", icon: BookOpen },
  { href: "/workspace/chat", label: "Chat", icon: MessageSquare },
  { href: "/workspace/library", label: "My Library", icon: Library },
];

export function WorkspaceNav() {
  const pathname = usePathname();

  return (
    <nav className="flex items-center justify-end gap-1.5 overflow-x-auto">
      {links.map((link) => {
        const active = link.exact
          ? pathname === link.href
          : pathname.startsWith(link.href);
        const Icon = link.icon;
        return (
          <Link
            key={link.href}
            href={link.href}
            className={
              active
                ? "inline-flex shrink-0 items-center gap-1.5 rounded-full border border-foreground px-3 py-1.5 text-sm font-medium text-foreground"
                : "inline-flex shrink-0 items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-sm text-muted hover:border-foreground/40 hover:text-foreground"
            }
          >
            <Icon className="h-3.5 w-3.5" aria-hidden />
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}
