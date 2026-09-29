export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return <main className="mx-auto max-w-lg px-4 py-8">{children}</main>;
}
