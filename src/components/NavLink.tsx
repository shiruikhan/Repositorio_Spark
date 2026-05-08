"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

interface NavLinkProps {
  href: string;
  children: React.ReactNode;
  variant?: "default" | "admin";
}

export default function NavLink({ href, children, variant = "default" }: NavLinkProps) {
  const pathname = usePathname();
  const active =
    pathname === href ||
    (href !== "/dashboard" && pathname.startsWith(href));

  if (variant === "admin") {
    return (
      <Link
        href={href}
        className={`px-3 py-1.5 text-[13px] text-brand font-semibold hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition ${
          active ? "bg-red-50 dark:bg-red-900/20" : ""
        }`}
      >
        {children}
      </Link>
    );
  }

  return (
    <Link
      href={href}
      className={`px-3 py-1.5 text-[13px] rounded-lg transition ${
        active
          ? "bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100 font-medium"
          : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-800"
      }`}
    >
      {children}
    </Link>
  );
}
