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
    <main className="flex min-h-screen items-center justify-center bg-carbon-fibre px-4">
      <div className="w-full max-w-sm">
        <div className="chamfer-tr-lg border-t-4 border-f1-red bg-white p-8 shadow-2xl">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-f1-red">CTR Sports</p>
          <h1 className="mt-1 text-2xl font-black uppercase tracking-tight">CMS Sign in</h1>
          <LoginForm next={next ?? "/"} />
        </div>
        <p className="mt-4 text-center text-xs text-f1-grey-light">
          Access is limited to authorised editors.
        </p>
      </div>
    </main>
  );
}
