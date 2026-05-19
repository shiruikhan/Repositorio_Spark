import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import Header from "@/components/Header";
import ThemeProvider from "@/components/ThemeProvider";

export default async function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: cliente } = await supabase
    .from("cliente")
    .select("is_admin")
    .eq("id", user.id)
    .single();

  return (
    <ThemeProvider>
      <div className="min-h-screen flex flex-col bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-gray-100">
        <Header userEmail={user.email ?? ""} isAdmin={cliente?.is_admin ?? false} />
        <main className="flex-1 p-6">{children}</main>
      </div>
    </ThemeProvider>
  );
}
