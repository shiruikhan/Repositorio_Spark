import { logout } from "@/app/actions/auth";

interface HeaderProps {
  userEmail: string;
}

export default function Header({ userEmail }: HeaderProps) {
  return (
    <header className="bg-white border-b border-gray-200 h-14 flex items-center px-6 gap-4">
      {/* Logo */}
      <div className="flex items-center gap-2 flex-1">
        <div className="w-7 h-7 rounded-full bg-brand flex items-center justify-center">
          <svg
            className="w-4 h-4 text-white"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
            />
          </svg>
        </div>
        <span className="font-semibold text-gray-900 text-sm">
          Spark Imagens
        </span>
      </div>

      {/* Nav links */}
      <nav className="hidden sm:flex items-center gap-1">
        <a
          href="/dashboard"
          className="px-3 py-1.5 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition"
        >
          Dashboard
        </a>
        <a
          href="/upload"
          className="px-3 py-1.5 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition"
        >
          Upload
        </a>
        <a
          href="/gallery"
          className="px-3 py-1.5 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition"
        >
          Galeria
        </a>
        <a
          href="/docs"
          className="px-3 py-1.5 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition"
        >
          API
        </a>
      </nav>

      {/* User + logout */}
      <div className="flex items-center gap-3">
        <span className="text-xs text-gray-500 hidden md:block truncate max-w-[180px]">
          {userEmail}
        </span>
        <form action={logout}>
          <button
            type="submit"
            className="text-xs text-gray-500 hover:text-red-600 border border-gray-200 hover:border-red-200 rounded-lg px-3 py-1.5 transition"
          >
            Sair
          </button>
        </form>
      </div>
    </header>
  );
}
