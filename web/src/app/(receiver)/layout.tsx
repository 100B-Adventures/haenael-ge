import { ReceiverBottomNav } from "@/components/social/ReceiverBottomNav";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export default async function ReceiverLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  return (
    <div className="min-h-svh bg-background pb-[calc(var(--tabbar-height)+env(safe-area-inset-bottom,0px))] lg:pb-0">
      {children}
      <ReceiverBottomNav locked={!user} />
    </div>
  );
}
