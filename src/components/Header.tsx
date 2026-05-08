import { logout } from "@/app/actions/auth";
import Image from "next/image";
import ThemeToggle from "./ThemeToggle";

const LOGO_URL =
  "https://obbymrwivuhjopwnmoxx.supabase.co/storage/v1/object/public/product-assets/brand/spark_logo.png";

interface HeaderProps {
  userEmail: string;
  isAdmin?: boolean;
}

export default function Header({ userEmail, isAdmin }: HeaderProps) {
  return (
    <header className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 h-14 flex items-center px-6 gap-4">
      {/* Logo */}
      <div className="flex items-center gap-2 flex-1">
        <Image
          src={LOGO_URL}
          alt="Spark Eletrônica"
          width={110}
          height={32}
          className="h-8 w-auto object-contain"
          priority
        />
      </div>

      {/* Nav links */}
      <nav className="hidden sm:flex items-center gap-1">
        <a
          href="/dashboard"
          className="px-3 py-1.5 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition"
        >
          Dashboard
        </a>
        <a
          href="/upload"
          className="px-3 py-1.5 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition"
        >
          Upload
        </a>
        <a
          href="/gallery"
          className="px-3 py-1.5 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition"
        >
          Galeria
        </a>
        <a
          href="/docs"
          className="px-3 py-1.5 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition"
        >
          API
        </a>
        {isAdmin && (
          <a
            href="/admin"
            className="px-3 py-1.5 text-sm text-brand font-semibold hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition"
          >
            Admin
          </a>
        )}
      </nav>

      {/* Theme toggle + User + logout */}
      <div className="flex items-center gap-3">
        <ThemeToggle />
        <span className="text-xs text-gray-500 dark:text-gray-400 hidden md:block truncate max-w-[180px]">
          {userEmail}
        </span>
        <form action={logout}>
          <button
            type="submit"
            className="text-xs text-gray-500 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400 border border-gray-200 dark:border-gray-700 hover:border-red-200 dark:hover:border-red-700 rounded-lg px-3 py-1.5 transition"
          >
            Sair
          </button>
        </form>
      </div>
    </header>
  );
}
