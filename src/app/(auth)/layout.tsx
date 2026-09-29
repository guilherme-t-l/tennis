export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return <div className="mx-auto flex min-h-full max-w-md flex-col justify-center px-4 py-12">{children}</div>;
}
