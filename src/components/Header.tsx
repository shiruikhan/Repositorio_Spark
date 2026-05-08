import { logout } from "@/app/actions/auth";
import Image from "next/image";
import ThemeToggle from "./ThemeToggle";
import NavLink from "./NavLink";

const LOGO_URL =
  "https://obbymrwivuhjopwnmoxx.supabase.co/storage/v1/object/public/product-assets/brand/spark_logo.png";

interface HeaderProps {
  userEmail: string;
  isAdmin?: boolean;
}

export default function Header({ userEmail, isAdmin }: HeaderProps) {
  return (
    <header className="sticky top-0 z-20 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 h-14 flex items-center px-6 gap-4">
      {/* Logo */}
      <div className="flex items-center gap-2 flex-1">
        <a href="/dashboard">
          <Image
            src={LOGO_URL}
            alt="Spark Eletrônica"
            width={110}
            height={32}
            className="h-8 w-auto object-contain"
            priority
          />
        </a>
      </div>

      {/* Nav links */}
      <nav className="hidden sm:flex items-center gap-1">
        <NavLink href="/dashboard">Dashboard</NavLink>
        <NavLink href="/upload">Upload</NavLink>
        <NavLink href="/gallery">Galeria</NavLink>
        <NavLink href="/docs">API</NavLink>
        {isAdmin && <NavLink href="/admin" variant="admin">Admin</NavLink>}
      </nav>

      {/* Theme toggle + User + logout */}
      <div className="flex items-center gap-3">
        <ThemeToggle />
        <a
          href="/profile"
          className="text-xs text-gray-500 dark:text-gray-400 hover:text-brand dark:hover:text-brand hidden md:block truncate max-w-[180px] transition"
          title="Meu Perfil"
        >
          {userEmail}
        </a>
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
