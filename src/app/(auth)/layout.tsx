import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Auth | ReconPro",
  description: "Sign in to your ReconPro account.",
};

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-black px-4 py-12">
      <div className="w-full max-w-md">{children}</div>
    </div>
  );
}
