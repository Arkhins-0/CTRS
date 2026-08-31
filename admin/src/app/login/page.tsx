import Image from "next/image";
import { redirect } from "next/navigation";
import { getAdminSession } from "@/lib/auth";
import { LoginForm } from "./login-form";

export const metadata = { title: "Sign in" };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const session = await getAdminSession();
  if (session) redirect("/");
  const { next } = await searchParams;

  return (
    <main className="safe-t safe-b flex min-h-dvh items-center justify-center bg-carbon-fibre px-4 py-8">
      <div className="w-full max-w-sm">
        <div className="chamfer-tr-lg border-t-4 border-accent bg-surface p-6 sm:p-8">
          <Image
            src="/ctr-logo.webp"
            alt="CTR Sports"
            width={132}
            height={74}
            priority
            className="mb-5 h-auto w-28"
          />
          <h1 className="text-2xl font-black uppercase tracking-tight text-fg">Admin sign in</h1>
          <LoginForm next={next ?? "/"} />
        </div>
        <p className="mt-4 text-center text-xs text-fg-faint">
          Access is limited to authorised editors.
        </p>
      </div>
    </main>
  );
}
