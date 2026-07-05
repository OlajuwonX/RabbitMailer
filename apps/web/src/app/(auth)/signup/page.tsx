import { headers } from "next/headers";
import { SignupForm } from "@/components/auth/signup-form";

export default async function SignupPage() {
  const csrfToken = (await headers()).get("x-csrf-token") ?? "";
  return <SignupForm csrfToken={csrfToken} />;
}
