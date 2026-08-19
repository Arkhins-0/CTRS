import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getFanSession } from "@/lib/fan-auth";
import { AuthCard } from "@/components/fanzone/auth-card";
import { LoginForm } from "./login-form";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Sign in",
  description: "Sign in to the CTR Sports fan zone.",
};

export default async function LoginPage() {
  const session = await getFanSession();
  if (session) redirect("/account");

  return (
    <AuthCard
      title="Sign in"
      subtitle="Welcome back — pick up where you left off."
      footer={
        <>
          New to the fan zone?{" "}
          <Link href="/register" className="font-bold uppercase text-f1-red hover:underline">
            Create an account
          </Link>
        </>
      }
    >
      <LoginForm />
    </AuthCard>
  );
}
