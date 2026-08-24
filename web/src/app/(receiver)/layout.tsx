export default function ReceiverLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return <div className="min-h-svh bg-background">{children}</div>;
}
