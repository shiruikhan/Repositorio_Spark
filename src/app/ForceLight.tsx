"use client";

import { useEffect } from "react";

/**
 * Remove a classe "dark" do <html> enquanto a pagina publica estiver montada.
 * Restaura ao sair (caso o usuario navegue para areas protegidas).
 */
export default function ForceLight({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    const html = document.documentElement;
    const hadDark = html.classList.contains("dark");
    html.classList.remove("dark");
    return () => {
      if (hadDark) html.classList.add("dark");
    };
  }, []);

  return <>{children}</>;
}
