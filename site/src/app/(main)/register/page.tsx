import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getFanSession } from "@/lib/fan-auth";
import { AuthCard } from "@/components/fanzone/auth-card";
import { RegisterForm } from "./register-form";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Create your account",
  description: "Join the CTR fan zone — save stories, pick favourites and vote in polls.",
};

export default async function RegisterPage() {
  const session = await getFanSession();
  if (session) redirect("/account");

  return (
    <AuthCard
      title="Join the fan zone"
      subtitle="Save stories, pick your favourite driver and team, and vote in race week polls."
      footer={
        <>
          Already have an account?{" "}
          <Link href="/login" className="font-bold uppercase text-brand hover:underline">
            Sign in
          </Link>
        </>
      }
    >
      <RegisterForm />
    </AuthCard>
  );
}
