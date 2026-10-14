import { ReceiverAppShell } from "@/components/receiver/ReceiverShell";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export default async function ReceiverLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  return (
    <ReceiverAppShell locked={!user}>{children}</ReceiverAppShell>
  );
}
