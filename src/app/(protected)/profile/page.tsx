import { createClient } from "@/lib/supabase/server";
import PasswordForm from "./PasswordForm";
import ApiKeySection from "./ApiKeySection";

export const metadata = { title: "Meu Perfil — Spark" };

export default async function ProfilePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: keyRow } = await supabase
    .from("ext_api_keys")
    .select("api_key")
    .eq("user_id", user!.id)
    .maybeSingle();

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      <div>
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Meu Perfil</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{user!.email}</p>
      </div>

      <Section title="Redefinir senha">
        <PasswordForm />
      </Section>

      <Section title="Chave API">
        <ApiKeySection initialKey={keyRow?.api_key ?? null} />
      </Section>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl p-6 space-y-4">
      <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-200 border-b border-gray-100 dark:border-gray-800 pb-3">
        {title}
      </h3>
      {children}
    </div>
  );
}
