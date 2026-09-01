import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getFanSession } from "@/lib/fan-auth";
import { AuthCard } from "@/components/fanzone/auth-card";
import { FormSuccess } from "@/components/fanzone/form";
import { LoginForm } from "./login-form";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Sign in",
  description: "Sign in to the CTR fan zone.",
};

const NOTICES: Record<string, string> = {
  "password-reset": "Password updated. Sign in with your new password.",
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const session = await getFanSession();
  if (session) redirect("/account");
  const { status } = await searchParams;
  const notice = status ? NOTICES[status] : undefined;

  return (
    <AuthCard
      title="Sign in"
      subtitle="Welcome back — pick up where you left off."
      footer={
        <>
          New to the fan zone?{" "}
          <Link href="/register" className="font-bold uppercase text-brand hover:underline">
            Create an account
          </Link>
        </>
      }
    >
      {notice ? (
        <div className="mb-4">
          <FormSuccess>{notice}</FormSuccess>
        </div>
      ) : null}
      <LoginForm />
      <p className="body-xs mt-4 text-right">
        <Link href="/forgot-password" className="font-semibold text-text-3 hover:text-text-5 hover:underline">
          Forgot password?
        </Link>
      </p>
    </AuthCard>
  );
}
