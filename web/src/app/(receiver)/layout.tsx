import { ReceiverBottomNav } from "@/components/social/ReceiverBottomNav";

export default function ReceiverLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <div className="min-h-svh bg-background pb-[calc(var(--tabbar-height)+env(safe-area-inset-bottom,0px))] lg:pb-0">
      {children}
      <ReceiverBottomNav />
    </div>
  );
}
