"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { logout } from "@/app/actions/auth";

const LINKS = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/upload", label: "Upload" },
  { href: "/gallery", label: "Galeria" },
  { href: "/docs", label: "API" },
];

export default function MobileMenu({
  userEmail,
  isAdmin,
}: {
  userEmail: string;
  isAdmin?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const close = () => setOpen(false);

  // Fecha com ESC
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <div className="sm:hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={open ? "Fechar menu" : "Abrir menu"}
        aria-expanded={open}
        className="p-2 rounded-lg border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition"
      >
        {open ? (
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        ) : (
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        )}
      </button>

      {open && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 top-14 z-30 bg-black/30"
            onClick={() => setOpen(false)}
            aria-hidden="true"
          />
          {/* Drawer */}
          <nav className="fixed inset-x-0 top-14 z-40 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 shadow-lg p-3 flex flex-col gap-1">
            {LINKS.map(({ href, label }) => {
              const active = pathname === href || (href !== "/dashboard" && pathname.startsWith(href));
              return (
                <Link
                  key={href}
                  href={href}
                  onClick={close}
                  className={`px-3 py-2.5 text-sm rounded-lg transition ${
                    active
                      ? "bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100 font-medium"
                      : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"
                  }`}
                >
                  {label}
                </Link>
              );
            })}
            {isAdmin && (
              <Link
                href="/admin"
                onClick={close}
                className={`px-3 py-2.5 text-sm text-brand font-semibold rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition ${
                  pathname.startsWith("/admin") ? "bg-red-50 dark:bg-red-900/20" : ""
                }`}
              >
                Admin
              </Link>
            )}

            <div className="h-px bg-gray-200 dark:bg-gray-700 my-1" />

            <Link
              href="/profile"
              onClick={close}
              className="px-3 py-2.5 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition truncate"
            >
              Meu perfil <span className="text-xs text-gray-400">({userEmail})</span>
            </Link>
            <form action={logout}>
              <button
                type="submit"
                className="w-full text-left px-3 py-2.5 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition"
              >
                Sair
              </button>
            </form>
          </nav>
        </>
      )}
    </div>
  );
}
