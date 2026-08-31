import Image from "next/image";
import { redirect } from "next/navigation";
import { getAdminSession } from "@/lib/auth";
import { LoginForm } from "./login-form";

export const metadata = { title: "Sign in" };

/** Confirmations handed over by the recovery flows, which end at /login. */
const LOGIN_NOTICES: Record<string, string> = {
  "password-reset": "Password updated. Sign in with your new password.",
  "email-changed": "Address confirmed. Sign in with your new email.",
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; status?: string }>;
}) {
  const session = await getAdminSession();
  if (session) redirect("/");
  const { next, status } = await searchParams;

  const notice = status ? LOGIN_NOTICES[status] : undefined;

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
          {notice ? (
            <p
              role="status"
              className="mt-4 border border-emerald-500/40 bg-emerald-500/10 px-3 py-2 text-xs font-bold text-emerald-300"
            >
              {notice}
            </p>
          ) : null}
          <LoginForm next={next ?? "/"} />
        </div>
        <p className="mt-4 text-center text-xs text-fg-faint">
          Access is limited to authorised editors.
        </p>
      </div>
    </main>
  );
}
