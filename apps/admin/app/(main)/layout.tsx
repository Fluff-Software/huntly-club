import { redirect } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { createServerAuthClient } from "@/lib/supabase-server-auth";
import { createServerSupabaseClient } from "@/lib/supabase-server";

export const dynamic = "force-dynamic";

export default async function MainLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const supabaseAuth = await createServerAuthClient();
  const {
    data: { user },
  } = await supabaseAuth.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const supabaseAdmin = createServerSupabaseClient();
  const { data: adminRow } = await supabaseAdmin
    .from("admins")
    .select("user_id")
    .eq("user_id", user.id)
    .single();

  if (!adminRow) {
    redirect("/login");
  }

  return (
    <AppShell>
      {children}
    </AppShell>
  );
}
