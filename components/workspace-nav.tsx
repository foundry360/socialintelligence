"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BookOpen,
  LayoutDashboard,
  Library,
  Shield,
  type LucideIcon,
} from "lucide-react";

const links: {
  href: string;
  label: string;
  icon: LucideIcon;
  exact?: boolean;
}[] = [
  { href: "/workspace", label: "Projects", icon: LayoutDashboard, exact: true },
  { href: "/workspace/knowledge", label: "Knowledge", icon: BookOpen },
  { href: "/workspace/baseline", label: "Baseline", icon: Shield },
  { href: "/workspace/library", label: "My Library", icon: Library },
];

export function WorkspaceNav() {
  const pathname = usePathname();

  return (
    <nav className="flex items-center justify-end gap-1.5 overflow-x-auto">
      {links.map((link) => {
        const active =
          link.href === "/workspace"
            ? pathname === "/workspace" ||
              pathname.startsWith("/workspace/missions")
            : link.exact
              ? pathname === link.href
              : pathname.startsWith(link.href);
        const Icon = link.icon;
        return (
          <Link
            key={link.href}
            href={link.href}
            className={
              active
                ? "inline-flex shrink-0 items-center gap-1.5 rounded-full border-[0.5px] border-white/40 px-3 py-1.5 text-sm font-medium text-white dark:border-foreground/40 dark:text-foreground"
                : "inline-flex shrink-0 items-center gap-1.5 rounded-full border-[0.5px] border-white/25 px-3 py-1.5 text-sm text-white/70 hover:border-white/40 hover:text-white dark:border-border dark:text-muted dark:hover:border-foreground/40 dark:hover:text-foreground"
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
